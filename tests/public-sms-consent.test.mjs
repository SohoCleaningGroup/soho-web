import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), Date, URL, TextEncoder, process, crypto: { randomUUID }, console: { error() {} } });
  return module.exports;
}
const disclosures = load("lib/messaging/sms-disclosures.ts");
const schema = load("lib/messaging/public-sms-consent.ts", { "./sms-disclosures": disclosures });
const input = { fullName: "Consent Test", email: "QA@example.com", phone: "(212) 555-0123", accepted: true };
function harness({ fails = false, secretFails = false } = {}) {
  const saved = [];
  const route = load("app/api/sms/consent/route.ts", {
    "@/lib/prisma": { prisma: { smsConsentRecord: { create: async ({data}) => { if (fails) throw new Error("offline"); saved.push(data); } } } },
    "@/lib/messaging/public-sms-consent": schema,
    "@/lib/security/sms-consent-session": { SMS_CONSENT_COOKIE: "soho_sms_consent", SMS_CONSENT_SESSION_SECONDS: 1800, consentSessionToken: id => { if (secretFails) throw new Error("secret missing"); return id; } },
    "@/lib/security/request": load("lib/security/request.ts"),
  });
  return { saved, run: body => route.POST(new Request("https://soho.example/api/sms/consent", {method:"POST", headers:{origin:"https://soho.example", "x-forwarded-for": crypto.randomUUID()}, body: typeof body === "string" ? body : JSON.stringify(body)})), route };
}
test("public consent saves affirmative choice and exact disclosure without OTP, payment, or messaging", async () => {
  const h = harness(); const response = await h.run(input);
  assert.equal(response.status, 201); assert.equal(h.saved.length, 1);
  assert.equal(h.saved[0].phone, "+12125550123"); assert.equal(h.saved[0].email, "qa@example.com");
  assert.equal(h.saved[0].accepted, true); assert.equal(h.saved[0].disclosure, disclosures.PUBLIC_SMS_DISCLOSURE);
  assert.equal(h.saved[0].source, "/sms-consent"); assert.match(response.headers.get("set-cookie"), /HttpOnly/);
});
test("unchecked choice saves a decline and never grants consent", async () => {
  const h = harness(); const response = await h.run({...input, accepted:false});
  assert.equal(response.status,201); assert.equal(h.saved[0].accepted,false);
});
test("absent checkbox, string true, invalid phone/email and malformed payload are rejected", async () => {
  for (const body of [{...input,accepted:undefined},{...input,accepted:"true"},{...input,phone:"123"},{...input,email:"bad"},"{"]) {
    const h = harness(); const response = await h.run(body); assert.equal(response.status,400); assert.equal(h.saved.length,0);
  }
});
test("cross-origin and oversized requests cannot write consent", async () => {
  const h = harness(); const response=await h.route.POST(new Request("https://soho.example/api/sms/consent",{method:"POST",headers:{origin:"https://other.example"},body:JSON.stringify(input)}));
  assert.equal(response.status,403); assert.equal(h.saved.length,0);
  assert.equal((await h.run(" ".repeat(5000))).status,413);
});
test("database failure does not report success or set a cookie", async () => {
  const h=harness({fails:true}); const response=await h.run(input); assert.equal(response.status,503); assert.equal(response.headers.get("set-cookie"),null);
});
test("missing signing secret fails before a partial consent record is written", async () => {
  const h=harness({secretFails:true}); const response=await h.run(input); assert.equal(response.status,503); assert.equal(h.saved.length,0);
});
