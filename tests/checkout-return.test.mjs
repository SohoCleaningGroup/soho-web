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
  vm.runInNewContext(source, { module, exports: module.exports, require: (id) => id in mocks ? mocks[id] : require(id), Buffer, process, console, Date });
  return module.exports;
}

const draft = load("lib/booking/checkout-draft.ts");
const initial = { fullName: "", email: "", preferredDate: null, selectedAddOns: [], acceptedPolicies: false };
test("checkout return preserves corrected details, dates and add-ons", () => {
  const data = { ...initial, email: "customer@example.com", preferredDate: new Date("2026-10-02T04:00:00Z"), selectedAddOns: ["INSIDE_FRIDGE"] };
  const restored = draft.parseCheckoutDraft(draft.serializeCheckoutDraft(data, "+1", 1000), initial, 2000);
  assert.equal(restored.data.email, data.email);
  assert.equal(restored.data.preferredDate.toISOString(), data.preferredDate.toISOString());
  assert.equal(restored.data.selectedAddOns[0], "INSIDE_FRIDGE");
});
test("expired, malformed and future-dated drafts are rejected", () => {
  assert.equal(draft.parseCheckoutDraft("bad JSON", initial), null);
  assert.equal(draft.parseCheckoutDraft(draft.serializeCheckoutDraft(initial, "+1", 0), initial, 3600001), null);
  assert.equal(draft.parseCheckoutDraft(draft.serializeCheckoutDraft(initial, "+1", 3000), initial, 2000), null);
});
test("wrong field types and invalid dates cannot corrupt the form", () => {
  const restored = draft.parseCheckoutDraft(JSON.stringify({ savedAt: 1000, data: { email: {}, preferredDate: "bad", selectedAddOns: [123] } }), initial, 2000);
  assert.equal(restored.data.email, "");
  assert.equal(restored.data.preferredDate, null);
  assert.equal(restored.data.selectedAddOns.length, 0);
});

function route({ status = "open", token = true, concurrent = false, rejected = false } = {}) {
  const calls = [];
  const handler = load("app/api/stripe/return-from-checkout/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "signed" }) }) },
    "next/server": { NextResponse: { json: (body, options) => ({ body, options, cookies: { set: (...args) => calls.push(["cookie", ...args]) } }) } },
    "@/lib/referrals/service": { releaseReferral: async () => {} },
    "@/lib/prisma": { prisma: { bookingSlotHold: { deleteMany: async () => calls.push(["delete"]) } } },
    "@/lib/stripe": { stripe: { checkout: { sessions: {
      retrieve: async () => ({ id: "cs_test_owned", status }),
      expire: async () => { calls.push(["expire"]); if (concurrent) { status = "complete"; throw new Error("Already completed"); } status = "expired"; return { id: "cs_test_owned", status }; },
    } } } },
    "@/lib/security/checkout-return": { CHECKOUT_RETURN_COOKIE: "return", checkoutReturnCookieOptions: {}, readCheckoutReturnToken: () => token ? { sessionId: "cs_test_owned" } : null },
    "@/lib/security/request": { getClientIp: () => "test", rateLimit: () => null, rejectCrossOrigin: () => rejected ? { body: { success: false }, options: { status: 403 } } : null },
  });
  return { handler, calls };
}
test("unfinished checkout expires before its slot hold is released", async () => {
  const { handler, calls } = route();
  const result = await handler.POST({});
  assert.equal(result.body.status, "expired");
  assert.equal(calls[0][0], "expire");
  assert.equal(calls[1][0], "delete");
});
test("completed checkout never releases its reservation", async () => {
  const { handler, calls } = route({ status: "complete" });
  assert.equal((await handler.POST({})).body.status, "complete");
  assert.ok(!calls.some(([name]) => name === "delete" || name === "expire"));
});
test("concurrent payment completion is protected", async () => {
  const { handler, calls } = route({ concurrent: true });
  assert.equal((await handler.POST({})).body.status, "complete");
  assert.ok(!calls.some(([name]) => name === "delete"));
});
test("expired checkout cleanup is idempotent", async () => {
  const { handler, calls } = route({ status: "expired" });
  assert.equal((await handler.POST({})).body.status, "expired");
  assert.ok(calls.some(([name]) => name === "delete"));
  assert.ok(!calls.some(([name]) => name === "expire"));
});
test("missing authorization and cross-origin requests cannot change a checkout", async () => {
  for (const options of [{ token: false }, { rejected: true }]) {
    const { handler, calls } = route(options);
    await handler.POST({});
    assert.equal(calls.length, 0);
  }
});

test("checkout return token rejects tampering and token purpose confusion", () => {
  process.env.PHONE_VERIFICATION_SECRET = "test-secret-only-".repeat(3);
  const signed = load("lib/security/signed-token.ts", { "server-only": {} });
  const tokens = load("lib/security/checkout-return.ts", { "server-only": {}, "@/lib/security/signed-token": signed });
  const token = tokens.createCheckoutReturnToken("cs_test_owned");
  assert.equal(tokens.readCheckoutReturnToken(token).sessionId, "cs_test_owned");
  assert.equal(tokens.readCheckoutReturnToken(`${token}tampered`), null);
  assert.equal(tokens.readCheckoutReturnToken(signed.createSignedToken({ sessionId: "cs_test_owned" }, `phone-verification:${process.env.PHONE_VERIFICATION_SECRET}`, 3600)), null);
});
