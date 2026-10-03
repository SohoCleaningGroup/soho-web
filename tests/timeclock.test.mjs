import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, mocks = {}, env = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), Date, process: { env }, console });
  return module.exports;
}
const rules = load("lib/timeclock/rules.ts");
test("location snapshots reject stale, future and invalid coordinates", () => {
  const now = Date.now(), good = { status: "captured", latitude: 40.72, longitude: -73.99, accuracy: 20, capturedAt: new Date(now).toISOString() };
  assert.equal(rules.locationSnapshot(good, now).latitude, 40.72);
  for (const change of [{latitude: 91}, {longitude: NaN}, {accuracy: -1}, {capturedAt: new Date(now - 121000).toISOString()}, {capturedAt: new Date(now + 31000).toISOString()}]) assert.throws(() => rules.locationSnapshot({...good, ...change}, now));
  assert.equal(rules.locationSnapshot({status: "denied", latitude: 91}, now).status, "denied");
});
test("location uncertainty is flagged without pretending to prove attendance", () => {
  const site = {siteLatitude: 40.72, siteLongitude: -73.99, siteRadiusMeters: 150};
  assert.match(rules.locationAssessment({status:"denied"}, site), /unavailable/);
  assert.match(rules.locationAssessment({status:"captured", latitude:40.72, longitude:-73.99, accuracy:300}, site), /accuracy/);
  assert.match(rules.locationAssessment({status:"captured", latitude:40.72, longitude:-73.99, accuracy:10}, site), /phone reported/);
  assert.match(rules.locationAssessment({status:"captured", latitude:40.74, longitude:-73.99, accuracy:10}, site), /Outside/);
  assert.match(rules.locationAssessment({status:"captured", latitude:40.72, longitude:-73.99, accuracy:10}, {...site, siteLatitude:null}), /Compare/);
});
function harness({ enabled = true, status = "ACCEPTED", bookingStatus = "ASSIGNED", rotated = false, approved = true } = {}) {
  const jobRules = load("lib/jobs/rules.ts");
  const token = jobRules.newJobToken(), cards = [], events = [], locks = [];
  const job = {id:"job", professionalId:"worker", bookingId:"booking", tokenHash:jobRules.tokenHash(token), expiresAt:new Date(Date.now()+60000),
    status, booking:{status:bookingStatus}, professional:{status:approved?"APPROVED":"REJECTED", hiringTermsSignedAt:new Date()}};
  const matches = (card, where) => (!where.id || (typeof where.id === "string" ? card.id === where.id : card.id !== where.id.not)) &&
    (!where.assignmentId || card.assignmentId === where.assignmentId) && (!where.professionalId || card.professionalId === where.professionalId) &&
    (!where.startedAt || card.startedAt < where.startedAt.lt) &&
    (!where.OR || where.OR.some(part => part.endedAt === null ? card.endedAt === null : card.endedAt !== null && card.endedAt > part.endedAt.gt));
  const cardModel = { findFirst:async ({where}) => cards.find(card=>matches(card,where)) || null,
    findUnique:async ({where}) => cards.find(card=>card.id===where.id) || null,
    findUniqueOrThrow:async ({where}) => {const card=cards.find(card=>card.id===where.id);if(!card)throw Error("missing");return {...card};},
    findMany:async ({where}) => cards.filter(card=>matches(card,where)),
    create:async ({data}) => {const card={id:"card"+cards.length, endedAt:null, status:"OPEN",revision:1,...data};cards.push(card);return {...card};},
    update:async ({where,data}) => {const card=cards.find(card=>card.id===where.id);for(const [key,value] of Object.entries(data))card[key]=key==="revision"?card.revision+value.increment:value;return {...card};} };
  const tx = {$queryRaw:async()=>locks.push(true), cleanerTimecard:cardModel, cleanerClockEvent:{create:async ({data})=>events.push(data)},
    jobAssignment:{findUnique:async()=>({...job,tokenHash:rotated?"rotated":job.tokenHash})}};
  let tail = Promise.resolve();
  const prisma={cleanerTimecard:cardModel,$transaction:fn=>{const result=tail.then(()=>fn(tx));tail=result.catch(()=>{});return result;}};
  const service=load("lib/timeclock/service.ts",{"server-only":{},"@prisma/client":{},"@/lib/prisma":{prisma},"@/lib/jobs/service":{getJob:async()=>job},"@/lib/jobs/rules":jobRules,"./rules":rules},{CLEANER_TIMECLOCK_ENABLED:enabled?"true":"false"});
  return {service,token,cards,events,locks,job};
}
test("disabled feature, unaccepted jobs and rotated private links cannot clock in", async () => {
  for(const options of [{enabled:false},{status:"PENDING"},{rotated:true},{approved:false},{bookingStatus:"CANCELLED"}]) {
    const h=harness(options);await assert.rejects(h.service.clockWorker(h.token,"in",{status:"denied"}));assert.equal(h.cards.length,0);
  }
});
test("concurrent clock-ins produce one open timecard and preserve denied-location evidence",async()=>{
  const h=harness();const results=await Promise.allSettled([h.service.clockWorker(h.token,"in",{status:"denied"}),h.service.clockWorker(h.token,"in",{status:"denied"})]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(h.cards.length,1);assert.equal(h.events.length,1);assert.equal(h.events[0].detail.location.status,"denied");
});
test("a cleaner can clock out after job cancellation; repeated clock-out leaves later shifts untouched",async()=>{
  const h=harness();await h.service.clockWorker(h.token,"in",{status:"unavailable"});h.cards[0].startedAt=new Date(Date.now()-60000);h.job.booking.status="CANCELLED";
  await h.service.clockWorker(h.token,"out",{status:"timeout"},"card0");assert.equal(h.cards[0].status,"PENDING");
  h.job.booking.status="ASSIGNED";await h.service.clockWorker(h.token,"in",{status:"denied"});
  await h.service.clockWorker(h.token,"out",{status:"denied"},"card0");assert.equal(h.cards[1].endedAt,null);assert.equal(h.events.length,3);
});
test("clock-out cannot target another job or omit the active card",async()=>{
  const h=harness();await h.service.clockWorker(h.token,"in",{status:"denied"});
  await assert.rejects(h.service.clockWorker(h.token,"out",{status:"denied"}));await assert.rejects(h.service.clockWorker(h.token,"out",{status:"denied"},"other"));assert.equal(h.cards[0].endedAt,null);
});
test("approval requires closed hours and stale reviews cannot overwrite corrections",async()=>{
  const h=harness();await h.service.clockWorker(h.token,"in",{status:"denied"});
  await assert.rejects(h.service.reviewTimecard("card0",1,"approve","Reviewed"));h.cards[0].startedAt=new Date(Date.now()-60000);
  await h.service.clockWorker(h.token,"out",{status:"denied"},"card0");await h.service.reviewTimecard("card0",2,"approve","Reviewed locations");
  assert.equal(h.cards[0].status,"APPROVED");await assert.rejects(h.service.reviewTimecard("card0",2,"correct","Missed punch",new Date(Date.now()-120000).toISOString(),new Date(Date.now()-1000).toISOString()),/changed/);
  await h.service.reviewTimecard("card0",3,"correct","Corrected start",new Date(Date.now()-120000).toISOString(),new Date(Date.now()-1000).toISOString());
  assert.equal(h.cards[0].status,"PENDING");assert.equal(h.cards[0].approvedAt,null);assert.equal(h.events[0].kind,"CLOCK_IN");assert.equal(h.events.at(-1).kind,"CORRECTED");
});
