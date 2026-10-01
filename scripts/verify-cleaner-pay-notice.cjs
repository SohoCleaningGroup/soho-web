const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), process, console, Date, URL }, { filename: file });
  return module.exports;
}
const content = load('lib/cleaner-pay-notice.ts');
const input = { professionalId: 'test-cleaner', primaryLanguage: 'en', reason: 'hiring', effectiveDate: '2026-10-02', trainingRate: 25, regularRate: 30, leadRate: null, preparerName: 'Andy Vargas', preparerTitle: 'Owner' };
function service(db, email = async () => false) {
  return load('lib/cleaner-pay-notice-service.ts', { 'server-only': {}, '@/lib/prisma': { prisma: db }, '@/lib/sendgrid': { sendEmail: email }, '@/lib/cleaner-pay-notice': content });
}
test('Spanish notices include English, Spanish, all rates, and no allowances', () => {
  const text = content.payNoticeSnapshot({ ...input, primaryLanguage: 'es', leadRate: 35 }, 'Test Cleaner');
  for (const value of ['EMPLOYER', 'EMPLEADOR', '$25.00', '$30.00', '$35.00', 'None.', 'Ninguno.', 'Friday', 'viernes', '245 Elizabeth St']) assert.ok(text.includes(value), value);
});
test('rejects malformed dates, missing language, non-cent rates, and below-minimum rates', () => {
  for (const invalid of [{ effectiveDate: '2026-02-30' }, { primaryLanguage: '' }, { regularRate: 30.001 }, { regularRate: 1 }]) assert.equal(content.payNoticeInputSchema.safeParse({ ...input, ...invalid }).success, false);
  assert.equal(content.payNoticeInputSchema.safeParse(input).success, true);
});
test('a single-rate notice does not promise a training period', () => {
  const text = content.payNoticeSnapshot({ ...input, trainingRate: null }, 'Test Cleaner');
  assert.ok(text.includes('$30.00 per hour: regular cleaning.'));
  assert.ok(!text.includes('$25.00'));
});
test('cannot issue for an unapproved cleaner', async () => {
  const s = service({ professionalProfile: { findUnique: async () => ({ status: 'UNDER_REVIEW' }) } });
  await assert.rejects(s.preparePayNotice(input), /Approve the cleaner/);
});
test('changed preview cannot be sent or persisted', async () => {
  const s = service({ professionalProfile: { findUnique: async () => ({ id: 'test-cleaner', fullName: 'Test Cleaner', status: 'APPROVED' }) } });
  await assert.rejects(s.issuePayNotice(input, '0'.repeat(64), 'id'), /Details changed/);
});
test('expired or malformed link cannot sign', async () => {
  const s = service({ cleanerPayNotice: { findFirst: async () => null } });
  assert.equal(await s.getPayNotice('invalid'), null);
  await assert.rejects(s.signPayNotice('a'.repeat(43), 'Test Cleaner', 'en', '0'.repeat(64), '', ''), /link has expired/);
});
test('wrong name, language, or snapshot cannot sign', async () => {
  const row = { id: 'notice', employeeName: 'Test Cleaner', primaryLanguage: 'en', snapshot: 'Exact notice', signedAt: null };
  const s = service({ cleanerPayNotice: { findFirst: async () => ({ ...row, snapshotHash: s.noticeHash(row.snapshot) }) } });
  const hash = s.noticeHash(row.snapshot);
  await assert.rejects(s.signPayNotice('a'.repeat(43), 'Other Name', 'en', hash, '', ''), /name saved/);
  await assert.rejects(s.signPayNotice('a'.repeat(43), 'Test Cleaner', 'es', hash, '', ''), /primary language/);
  await assert.rejects(s.signPayNotice('a'.repeat(43), 'Test Cleaner', 'en', '0'.repeat(64), '', ''), /Reload/);
});
test('only one concurrent signer succeeds; failed receipt preserves signature', async () => {
  let signed = false;
  let emails = 0;
  let audit;
  const row = { id: 'notice', employeeName: 'Test Cleaner', primaryLanguage: 'en', snapshot: 'Exact notice', signedAt: null, professional: { email: 'test@example.invalid' } };
  const s = service({ cleanerPayNotice: {
    findFirst: async () => ({ ...row, snapshotHash: s.noticeHash(row.snapshot) }),
    updateMany: async query => { if (signed) return { count: 0 }; signed = true; audit = query.data; return { count: 1 }; },
  } }, async () => { emails++; return false; });
  const args = ['a'.repeat(43), 'Test Cleaner', 'en', s.noticeHash(row.snapshot), '127.0.0.1', 'test-browser'];
  const results = await Promise.allSettled([s.signPayNotice(...args), s.signPayNotice(...args)]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(emails, 1);
  assert.equal(audit.signedName, 'Test Cleaner');
  assert.equal(audit.signedIp, '127.0.0.1');
  assert.ok(audit.signedAt instanceof Date);
  assert.equal(results.find(x => x.status === 'fulfilled').value.emailSent, false);
});
test('issuance saves an immutable notice; repeat request cannot email twice', async () => {
  const previous = { env: process.env.VERCEL_ENV, host: process.env.VERCEL_BRANCH_URL };
  process.env.VERCEL_ENV = 'preview'; process.env.VERCEL_BRANCH_URL = 'staging.example.invalid';
  let saved = null;
  let sent = 0;
  const s = service({ professionalProfile: { findUnique: async () => ({ id: input.professionalId, fullName: 'Test Cleaner', email: 'test@example.invalid', status: 'APPROVED' }) }, cleanerPayNotice: {
    findUnique: async () => saved,
    create: async ({ data }) => { saved = { ...data }; return saved; },
  } }, async () => { sent++; return false; });
  try {
    const preview = await s.preparePayNotice(input);
    const result = await s.issuePayNotice(input, preview.hash, 'notice-id');
    assert.equal(result.emailSent, false);
    assert.ok(result.signingUrl.startsWith('https://staging.example.invalid/professional/pay-notice/'));
    assert.equal(saved.snapshot, preview.snapshot);
    assert.equal(saved.snapshotHash, preview.hash);
    assert.equal(saved.employeeName, 'Test Cleaner');
    assert.ok(!saved.tokenHash.includes('/'));
    assert.ok(!Object.hasOwn(saved, 'token'));
    await assert.rejects(s.issuePayNotice(input, preview.hash, 'notice-id'), /already prepared/);
    assert.equal(sent, 1);
  } finally {
    if (previous.env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = previous.env;
    if (previous.host === undefined) delete process.env.VERCEL_BRANCH_URL; else process.env.VERCEL_BRANCH_URL = previous.host;
  }
});
