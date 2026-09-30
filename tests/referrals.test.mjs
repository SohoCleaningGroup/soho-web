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
 vm.runInNewContext(code, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), Date, process: { env: { NEXT_PUBLIC_APP_URL: 'https://test.example' } }, console });
 return module.exports;
}
const rules = load('lib/referrals/rules.ts');
const identity = { email: 'friend@example.com', phone: '+12125550123', address: '20 Main St', apartment: '2', zipCode: '10012' };
const paid = { status: 'COMPLETED', payments: [{ status: 'PAID', capturedAmount: 180, isAdditionalAuthorization: false }] };
function harness({ previous = 0, occupied = false, booking = paid } = {}) {
 const account = { id: 'account', code: 'SOHO-ABCDEF123456', rewardCode: 'REWARD-SECRET', userProfile: { email: 'owner@example.com', phone: '+12125550124', address: '30 Main St', apartment: '1', zipCode: '10012' } };
 const use = { id: 'use', kind: 'FRIEND', status: 'BOOKED', booking, accountId: account.id };
 const events = [], updates = [];
 const tx = { $queryRaw: async () => events.push('lock'), referralAccount: { findFirst: async () => account }, booking: { count: async () => previous }, referralUse: {
   findUnique: async ({ where }) => where.customerKey ? (occupied ? use : null) : use,
   findMany: async () => [{ id: 'source', booking, status: 'EARNED' }],
   create: async ({ data }) => { events.push('create'); return { id: 'claim', ...data }; },
   update: async ({ data }) => { updates.push(data); Object.assign(use, data); return use; },
   updateMany: async ({ where, data }) => { updates.push({ where, data }); return { count: 1 }; },
 } };
 const prisma = { ...tx, $transaction: async fn => fn(tx) };
 const service = load('lib/referrals/service.ts', { 'server-only': {}, '@prisma/client': {}, '@/lib/prisma': { prisma }, './rules': rules });
 return { service, account, use, events, updates };
}
test('10% service discount is rounded to cents and capped at $30', () => {
 assert.equal(rules.discountCents(199.95), 2000); assert.equal(rules.discountCents(500), 3000); assert.throws(() => rules.discountCents(NaN));
});
test('completion and original captured payment are both required; unsettled/refunded payments prevent earning', () => {
 assert.equal(rules.canEarnReward(paid), true);
 for (const booking of [{ ...paid, status: 'ASSIGNED' }, { ...paid, payments: [] }, { ...paid, payments: [{ status: 'PAID', capturedAmount: 10, isAdditionalAuthorization: true }] }, { ...paid, payments: [...paid.payments, { status: 'AUTHORIZED', capturedAmount: null, isAdditionalAuthorization: true }] }, { ...paid, payments: [{ status: 'REFUNDED', capturedAmount: 180, isAdditionalAuthorization: false }] }]) assert.equal(rules.canEarnReward(booking), false);
});
test('friend checkout reserves one discount under a lock without including add-ons', async () => {
 const h = harness(); const claim = await h.service.reserveReferral(' soho-abcdef123456 ', identity, 200, new Date());
 assert.equal(claim.discountCents, 2000); assert.equal(claim.kind, 'FRIEND'); assert.equal(claim.rewardSourceId, null); assert.deepEqual(h.events, ['lock', 'create']);
});
test('self-referral is rejected by email, phone or household', async () => {
 for (const change of [{ email: 'OWNER@example.com' }, { phone: '+12125550124' }, { address: '30 Main St', apartment: '1' }]) await assert.rejects(harness().service.reserveReferral('SOHO-ABCDEF123456', { ...identity, ...change }, 200, new Date()));
});
test('returning customers and previously reserved first-clean claims are rejected', async () => {
 for (const options of [{ previous: 1 }, { occupied: true }]) await assert.rejects(harness(options).service.reserveReferral('SOHO-ABCDEF123456', identity, 200, new Date()));
});
test('private reward requires matching owner email and phone and an earned paid source', async () => {
 const h = harness(); const owner = { ...identity, email: h.account.userProfile.email, phone: h.account.userProfile.phone };
 await assert.rejects(h.service.reserveReferral('REWARD-SECRET', identity, 200, new Date()));
 const claim = await h.service.reserveReferral('REWARD-SECRET', owner, 200, new Date()); assert.equal(claim.rewardSourceId, 'source');
 await assert.rejects(harness({ booking: { ...paid, status: 'CANCELLED' } }).service.reserveReferral('REWARD-SECRET', owner, 200, new Date()));
});
test('reward earning is idempotent across completion and capture notifications', async () => {
 const h = harness(); await h.service.reconcileReferral('booking'); await h.service.reconcileReferral('booking'); assert.equal(h.updates.length, 1); assert.equal(h.use.status, 'EARNED');
});
test('reward redemption settles only after completed paid service', async () => {
 const h = harness(); h.use.kind = 'REWARD'; await h.service.reconcileReferral('booking'); assert.equal(h.use.status, 'REDEEMED');
 const pending = harness({ booking: { ...paid, status: 'ASSIGNED' } }); await pending.service.reconcileReferral('booking'); assert.equal(pending.updates.length, 0);
});
test('expired/cancelled claims release the unique identity and reward locks, preserving earned claims', async () => {
 const h = harness(); await h.service.releaseReferral({ checkoutSessionId: 'cs_test' });
 assert.deepEqual(JSON.parse(JSON.stringify(h.updates[0].data)), { status: 'RELEASED', customerKey: null, rewardSourceId: null });
 assert.deepEqual(JSON.parse(JSON.stringify(h.updates[0].where.status.in)), ['RESERVED', 'BOOKED']);
});
test('completed email invites an honest Google review and does not offer a review discount', () => {
 const emails = load('lib/customer-email-templates.ts', { '@/lib/site': { GOOGLE_REVIEW_URL: 'https://g.page/r/CcebMKcdVpKsEBM/review' } });
 const draft = emails.getBookingStatusEmail({ customerName: 'Andy <script>', status: 'COMPLETED', referralPortal: 'https://test.example/referrals/private' });
 assert.equal(draft.subject, 'Thank you for welcoming SoHo into your home'); assert.match(draft.text, /honest Google review/); assert.match(draft.html, /https:\/\/g.page\/r\/CcebMKcdVpKsEBM\/review/); assert.doesNotMatch(draft.text, /10%|positive|five.star|liked|loved/); assert.match(draft.text, /Keep this personal rewards link private/); assert.doesNotMatch(draft.html, /<script>/);
});
