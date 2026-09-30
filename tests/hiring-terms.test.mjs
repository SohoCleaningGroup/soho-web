import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), process, console, URL, Date });
  return module.exports;
}

test('private hiring link records one exact signed Spanish snapshot and sends a receipt', async () => {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = { id: 'worker-1', fullName: 'Ana María', email: 'ana@example.com', status: 'APPROVED', hiringTermsSignedAt: null, hiringTermsTokenHash: tokenHash, hiringTermsTokenExpiresAt: new Date(Date.now() + 60_000) };
  const sent = [];
  const terms = load('lib/cleaner-hiring-terms.ts');
  const prisma = { professionalProfile: {
    findFirst: async ({ where }) => record.hiringTermsTokenHash === where.hiringTermsTokenHash && record.status === 'APPROVED' && record.hiringTermsTokenExpiresAt > new Date() ? record : null,
    updateMany: async ({ where, data }) => {
      if (record.hiringTermsSignedAt || record.hiringTermsTokenHash !== where.hiringTermsTokenHash) return { count: 0 };
      Object.assign(record, data); return { count: 1 };
    },
    findUniqueOrThrow: async () => record,
  } };
  const signatures = load('lib/cleaner-hiring-signature.ts', {
    'server-only': {}, '@/lib/prisma': { prisma }, '@/lib/sendgrid': { sendEmail: async message => { sent.push(message); return true; } }, '@/lib/cleaner-hiring-terms': terms,
  });
  await assert.rejects(() => signatures.signHiringTerms(token, 'Someone Else', 'es', 'Safari', '127.0.0.1'), /full name/);
  assert.equal(record.hiringTermsSignedAt, null);
  const result = await signatures.signHiringTerms(token, 'Ana María', 'es', 'Safari', '127.0.0.1');
  assert.equal(result.emailSent, true);
  assert.equal(record.hiringTermsSnapshot, terms.CLEANER_HIRING_TERMS_ES);
  assert.equal(record.hiringTermsHash, terms.hiringTerms('es').hash);
  assert.equal(record.hiringTermsVersion, `${terms.CLEANER_HIRING_TERMS_VERSION}-es`);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Ana María/);
  await assert.rejects(() => signatures.signHiringTerms(token, 'Ana María', 'es', 'Safari', '127.0.0.1'), /already been signed/);
  assert.equal(sent.length, 1);
});
