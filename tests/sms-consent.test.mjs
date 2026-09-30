import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), Date, console: { log() {}, error() {} } });
  return module.exports;
}
const consent = load("lib/messaging/sms-consent.ts");
const phone = "+12125550123";
const metadata = { phone, acceptedSmsConsent: "true", smsConsentAt: "2026-09-30T03:00:00Z", smsConsentVersion: "booking-updates-v1" };

test("checkout records explicit consent, timestamp, phone and disclosure version", () => {
  const saved = consent.consentFromCheckoutMetadata(metadata);
  assert.equal(saved.acceptedSmsConsent, true);
  assert.equal(saved.smsConsentAt.toISOString(), new Date(metadata.smsConsentAt).toISOString());
  assert.equal(consent.hasBookingSmsConsent(saved, phone), true);
});
test("missing, declined, malformed or unknown-version consent cannot enable texts", () => {
  for (const value of [{}, { ...metadata, acceptedSmsConsent: "false" }, { ...metadata, smsConsentAt: "invalid" }, { ...metadata, smsConsentVersion: "unknown" }]) {
    const saved = consent.consentFromCheckoutMetadata(value);
    assert.equal(saved.acceptedSmsConsent, false);
    assert.equal(saved.smsConsentAt, null);
    assert.equal(saved.smsConsentPhone, null);
  }
});
test("consent cannot follow a changed phone number", () => {
  assert.equal(consent.hasBookingSmsConsent(consent.consentFromCheckoutMetadata(metadata), "+12125550999"), false);
});

function notificationHarness(saved, { databaseFails = false, smsFails = false } = {}) {
  const sent = [];
  const template = () => ({ subject: "booking", text: "booking", html: "booking" });
  const api = load("lib/customer-notifications.ts", {
    "@/lib/prisma": { prisma: { booking: { findUnique: async ({ where }) => {
      assert.equal(where.id, "booking-1");
      if (databaseFails) throw new Error("database unavailable");
      return saved;
    } } } },
    "@/lib/messaging/sms-consent": consent,
    "@/lib/twilio": new Proxy({}, { get: (_, name) => name === "sendSms" ? async ({ body }) => { assert.match(body, /Reply STOP to opt out or HELP for help\.$/); if (smsFails) throw new Error("Twilio unavailable"); sent.push("sms"); return true; } : () => "text" }),
    "@/lib/sendgrid": { sendEmail: async () => { sent.push("email"); return true; } },
    "@/lib/customer-email-templates": new Proxy({}, { get: () => template }),
  });
  const run = () => api.notifyBookingStatusChanged({ bookingId: "booking-1", phone, email: "test@example.com", customerName: "Test", status: "CONFIRMED" });
  return { sent, run };
}
test("declining texts still sends booking email and skips Twilio", async () => {
  const h = notificationHarness(consent.consentFromCheckoutMetadata({}));
  const result = await h.run();
  assert.deepEqual(h.sent, ["email"]);
  assert.equal(result.smsSkipped, true);
  assert.equal(result.emailSent, true);
});
test("opted-in booking receives both email and text", async () => {
  const h = notificationHarness(consent.consentFromCheckoutMetadata(metadata));
  const result = await h.run();
  assert.deepEqual(h.sent.sort(), ["email", "sms"]);
  assert.equal(result.smsSent, true);
  assert.equal(result.smsSkipped, false);
});
test("missing booking or changed recipient does not receive texts", async () => {
  for (const saved of [null, { ...consent.consentFromCheckoutMetadata(metadata), smsConsentPhone: "+12125550999" }]) {
    const h = notificationHarness(saved);
    await h.run();
    assert.deepEqual(h.sent, ["email"]);
  }
});
test("consent lookup failure blocks SMS and preserves email delivery", async () => {
  const h = notificationHarness(null, { databaseFails: true });
  const result = await h.run();
  assert.deepEqual(h.sent, ["email"]);
  assert.equal(result.emailSent, true);
  assert.equal(result.smsSent, false);
});
test("Twilio failure does not prevent email for opted-in customers", async () => {
  const h = notificationHarness(consent.consentFromCheckoutMetadata(metadata), { smsFails: true });
  const result = await h.run();
  assert.equal(result.emailSent, true);
  assert.equal(result.smsSent, false);
});
