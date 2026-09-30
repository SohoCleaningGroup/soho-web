import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks = {}, env = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), process: { env }, console, URL });
  return module.exports;
}
function harness({ status = 'PENDING', emailSucceeds = true, unauthorized = false } = {}) {
  const professional = { id: 'applicant', fullName: 'Test Cleaner', email: 'cleaner@example.com', status };
  const sent = [];
  const route = load('app/api/admin/professionals/status/route.ts', {
    '@/lib/prisma': { prisma: { professionalProfile: {
      updateMany: async ({ where, data }) => {
        if (professional.status === where.status.not) return { count: 0 };
        professional.status = data.status; return { count: 1 };
      },
      findUnique: async () => professional,
    } } },
    '@/lib/security/admin-auth': { rejectUnauthorizedAdminRequest: async () => unauthorized ? new Response('', { status: 401 }) : null },
    '@/lib/professional-approval': { sendCleanerApprovalEmail: async p => { sent.push(p.email); return emailSucceeds; } },
  });
  const patch = data => route.PATCH({ json: async () => ({ professionalId: professional.id, ...data }) });
  return { professional, sent, patch };
}
test('approval sends once; repeating the same status does not duplicate the email', async () => {
  const h = harness();
  assert.equal((await h.patch({ status: 'APPROVED' })).status, 200);
  await h.patch({ status: 'APPROVED' });
  assert.equal(h.professional.status, 'APPROVED'); assert.equal(h.sent.length, 1);
});
test('other statuses and unauthorized requests send no approval email', async () => {
  const h = harness(); await h.patch({ status: 'UNDER_REVIEW' }); await h.patch({ status: 'REJECTED' });
  assert.equal(h.sent.length, 0);
  const blocked = harness({ unauthorized: true });
  assert.equal((await blocked.patch({ status: 'APPROVED' })).status, 401);
  assert.equal(blocked.professional.status, 'PENDING'); assert.equal(blocked.sent.length, 0);
});
test('email failure preserves approval and exposes a recoverable result', async () => {
  const h = harness({ emailSucceeds: false });
  const response = await h.patch({ status: 'APPROVED' }); const result = await response.json();
  assert.equal(result.success, true); assert.equal(result.emailSent, false);
  assert.match(result.message, /Resend approval email/); assert.equal(h.professional.status, 'APPROVED');
});
test('resending is explicit and restricted to approved applicants', async () => {
  const pending = harness(); assert.equal((await pending.patch({ resendApprovalEmail: true })).status, 409); assert.equal(pending.sent.length, 0);
  const approved = harness({ status: 'APPROVED' }); assert.equal((await approved.patch({ resendApprovalEmail: true })).status, 200); assert.equal(approved.sent.length, 1);
  assert.equal((await approved.patch({ status: 'REJECTED', resendApprovalEmail: true })).status, 400);
});
const templates = load('lib/customer-email-templates.ts', { '@/lib/site': { GOOGLE_REVIEW_URL: 'https://g.page/r/CcebMKcdVpKsEBM/review' } });
test('welcome email includes the handbook in HTML and plain text and escapes applicant names', () => {
  const template = templates.getProfessionalApprovedEmail({ professionalName: '<script>unsafe</script>', handbookUrl: 'https://staging.example/professional/handbook', spanishHandbookUrl: 'https://staging.example/professional/handbook/es' });
  assert.match(template.subject, /approved/); assert.match(template.text, /https:\/\/staging.example\/professional\/handbook/);
  assert.match(template.html, /href="https:\/\/staging.example\/professional\/handbook"/);
  assert.match(template.text, /https:\/\/staging.example\/professional\/handbook\/es/); assert.match(template.html, /Cleaner Handbook — Spanish/);
  assert.doesNotMatch(template.text, /En español|¡Buenas noticias!/);
  assert.doesNotMatch(template.html, /lang="es"|¡Buenas noticias!/);
  assert.doesNotMatch(template.html, /<script>/); assert.match(template.html, /&lt;script&gt;/);
});
test('preview approval links use the staging branch, while production uses its configured URL', () => {
  const mocks = { 'server-only': {}, '@/lib/sendgrid': {}, '@/lib/customer-email-templates': templates };
  mocks['@/lib/cleaner-hiring-signature'] = { issueHiringTermsLink: async () => null };
  const preview = load('lib/professional-approval.ts', mocks, { VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'staging.example', NEXT_PUBLIC_APP_URL: 'https://live.example' });
  assert.equal(preview.cleanerHandbookUrl(), 'https://staging.example/professional/handbook');
  assert.equal(preview.cleanerHandbookUrl('es'), 'https://staging.example/professional/handbook/es');
  assert.equal(preview.cleanerHandbookUrl('en', 'Ana María'), 'https://staging.example/professional/handbook?name=Ana+Mar%C3%ADa');
  assert.equal(preview.cleanerHandbookUrl('es', 'Ana María'), 'https://staging.example/professional/handbook/es?name=Ana+Mar%C3%ADa');
  const production = load('lib/professional-approval.ts', mocks, { VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://live.example' });
  assert.equal(production.cleanerHandbookUrl(), 'https://live.example/professional/handbook');
});

test('approval email sends personalized English and Spanish handbook links', async () => {
  const sent = [];
  const approval = load('lib/professional-approval.ts', {
    'server-only': {},
    '@/lib/sendgrid': { sendEmail: async message => { sent.push(message); return true; } },
    '@/lib/customer-email-templates': templates,
    '@/lib/cleaner-hiring-signature': { issueHiringTermsLink: async () => 'https://staging.example/professional/hiring/private-token' },
  }, { VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'staging.example' });
  assert.equal(await approval.sendCleanerApprovalEmail({ id: 'worker-id', fullName: 'Ana María', email: 'ana@example.com', hiringTermsSignedAt: null }), true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /handbook\?name=Ana\+Mar%C3%ADa/);
  assert.match(sent[0].text, /handbook\/es\?name=Ana\+Mar%C3%ADa/);
  assert.match(sent[0].text, /professional\/hiring\/private-token/);
});

test('both languages cover the same handbook sections and operational steps', () => {
  const en = load('lib/cleaner-handbook.ts').CLEANER_HANDBOOK_SECTIONS;
  const es = load('lib/cleaner-handbook-es.ts').CLEANER_HANDBOOK_SECTIONS_ES;
  assert.deepEqual(Array.from(en, s => s.id), Array.from(es, s => s.id));
  for (let i = 0; i < en.length; i++) assert.equal(en[i].points.length, es[i].points.length);
});
