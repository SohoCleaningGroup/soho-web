import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), process: { env: { NODE_ENV: "test" } }, console });
  return module.exports;
}
const questions = load('lib/cleaner-application-questions.ts');
const screening = load('lib/cleaner-application.ts', { './cleaner-application-questions': questions });
const input = () => ({ screeningAnswers: Object.fromEntries(questions.CLEANER_APPLICATION_QUESTIONS.map(q => [q.id, false])), kitchenScenarioAnswer: 'I would wash a few dishes and ask about anything excessive.' });

test('explicit No answers are valid and survive storage', () => {
  const data = screening.cleanerScreeningSchema.parse(input());
  const saved = JSON.parse(JSON.stringify(screening.buildCleanerScreeningSnapshot(data)));
  const read = screening.readCleanerScreeningSnapshot(saved);
  assert.equal(read.responses.length, 10);
  assert.equal(read.responses.every(r => r.answer === false), true);
  assert.equal(read.scenario.answer, data.kitchenScenarioAnswer);
});
test('missing answers are rejected rather than saved as No', () => {
  const data = input(); delete data.screeningAnswers.paidHomeCleaning;
  assert.equal(screening.cleanerScreeningSchema.safeParse(data).success, false);
  assert.equal(screening.cleanerScreeningSchema.safeParse({ ...input(), screeningAnswers: {} }).success, false);
});
test('strings, unknown question IDs and empty scenarios cannot bypass validation', () => {
  const data = input(); data.screeningAnswers.privacy = 'yes';
  assert.equal(screening.cleanerScreeningSchema.safeParse(data).success, false);
  assert.equal(screening.cleanerScreeningSchema.safeParse({ ...input(), screeningAnswers: { ...input().screeningAnswers, invented: true } }).success, false);
  assert.equal(screening.cleanerScreeningSchema.safeParse({ ...input(), kitchenScenarioAnswer: '   ' }).success, false);
  assert.equal(screening.cleanerScreeningSchema.safeParse({ ...input(), kitchenScenarioAnswer: 'x'.repeat(1501) }).success, false);
});
test('saved questions retain their wording and legacy applications need no fabricated answers', () => {
  const saved = screening.buildCleanerScreeningSnapshot(screening.cleanerScreeningSchema.parse(input()));
  saved.responses[0].question = 'Historical wording';
  assert.equal(screening.readCleanerScreeningSnapshot(JSON.parse(JSON.stringify(saved))).responses[0].question, 'Historical wording');
  assert.equal(screening.readCleanerScreeningSnapshot(null), null);
  assert.equal(screening.readCleanerScreeningSnapshot({}), null);
});

function applicationRoute() {
  const stored = [];
  const route = load('app/api/onboarding/professional/route.ts', {
    '@/lib/cleaner-application': screening,
    '@/lib/prisma': { prisma: { professionalProfile: {
      findUnique: async () => null,
      create: async ({ data }) => { stored.push(data); return { id: 'applicant-test', ...data }; },
    } } },
    '@/lib/customer-notifications': { notifyProfessionalApplicationReceived: async () => ({ smsSent: false, emailSent: false }) },
    '@/lib/security/phone-verification': { PHONE_VERIFICATION_COOKIE: 'verification', isPhoneVerified: async () => true, normalizePhone: p => p, phoneStorageKey: () => 'owner' },
    '@/lib/security/request': { getClientIp: () => 'test', rateLimit: () => null, rejectCrossOrigin: () => null, rejectOversizedRequest: () => null },
  });
  const payload = { ...input(), fullName: 'Test Applicant', email: 'applicant@example.com', phone: '+12125550123', servicesOffered: [], serviceAreas: [], availability: ['MONDAY'], hasOwnSupplies: false, hasTransport: true, idDocumentType: 'NATIONAL_ID', idDocumentFrontUrl: 'applications/owner/id-front-1', idDocumentBackUrl: 'applications/owner/id-back-1' };
  return { route, stored, payload };
}
test('application API persists all screening answers and the scenario in the applicant profile', async () => {
  const h = applicationRoute();
  const response = await h.route.POST({ json: async () => h.payload });
  assert.equal(response.status, 200);
  assert.equal(h.stored.length, 1);
  const saved = screening.readCleanerScreeningSnapshot(h.stored[0].screeningResponses);
  assert.equal(saved.responses.length, 10);
  assert.equal(saved.responses.every(r => r.answer === false), true);
  assert.equal(saved.scenario.answer, h.payload.kitchenScenarioAnswer);
});
test('application API rejects an incomplete questionnaire without creating a profile', async () => {
  const h = applicationRoute(); delete h.payload.screeningAnswers.feedback;
  const response = await h.route.POST({ json: async () => h.payload });
  assert.equal(response.status, 400);
  assert.equal(h.stored.length, 0);
});
