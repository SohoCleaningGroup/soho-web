import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks={}) {
 const module={exports:{}}; const code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>id in mocks?mocks[id]:require(id),Date,process:{env:{NEXT_PUBLIC_APP_URL:'https://test.example',ADMIN_NOTIFICATION_EMAILS:'owner@example.com'}},console}); return module.exports;
}
const rules=load('lib/jobs/rules.ts');
function harness({status='PENDING',closed=false,email=true,stale=false,review='NONE',photos=1}={}) {
 const token=rules.newJobToken(), reviewToken=rules.newJobToken(); const sent=[],locks=[];
 const job={id:'job',bookingId:'booking',professionalId:'worker',status,tokenHash:rules.tokenHash(token),expiresAt:new Date(Date.now()+60000),reviewTokenHash:rules.tokenHash(reviewToken),reviewExpiresAt:new Date(Date.now()+60000),reviewStatus:review,reviewedAt:null,photos:Array.from({length:photos},()=>({path:'photo'})),professional:{fullName:'Cleaner',email:'cleaner@example.com',status:'APPROVED'},booking:{status:closed?'CANCELLED':'CONFIRMED',userProfile:{email:'customer@example.com',fullName:'Customer'}}};
 const tx={ $queryRaw:async()=>locks.push('locked'),jobAssignment:{findUnique:async()=>stale?{...job,tokenHash:rules.tokenHash(rules.newJobToken())}:job,update:async({data})=>Object.assign(job,data),updateMany:async({data})=>Object.assign(job,data)},booking:{update:async({data})=>Object.assign(job.booking,data)}};
 const prisma={jobAssignment:{findFirst:async()=>job,updateMany:tx.jobAssignment.updateMany},$transaction:async fn=>fn(tx)};
 const service=load('lib/jobs/service.ts',{'server-only':{},'@prisma/client':{},'@/lib/prisma':{prisma},'@/lib/sendgrid':{sendEmail:async data=>{sent.push(data);return email;}},'./rules':rules});
 return {service,token,reviewToken,job,sent,locks};
}
test('invalid bearer link rejected before database use',async()=>{ const h=harness();assert.equal(await h.service.getJob('bad'),null);});
test('acceptance saves worker response, assigns booking and alerts owner once',async()=>{const h=harness();await h.service.respondWorker(h.token,'accept');assert.equal(h.job.status,'ACCEPTED');assert.equal(h.job.booking.status,'ASSIGNED');assert.equal(h.locks.length,1);await h.service.respondWorker(h.token,'accept');assert.equal(h.sent.length,1);});
test('declined assignment cannot be changed through the old link',async()=>{const h=harness();await h.service.respondWorker(h.token,'decline');await assert.rejects(h.service.respondWorker(h.token,'accept'));assert.equal(h.job.booking.status,'CONFIRMED');});
test('cancelled booking cannot accept or send review',async()=>{const h=harness({closed:true,status:'ACCEPTED'});await assert.rejects(h.service.respondWorker(h.token,'accept'));await assert.rejects(h.service.requestCustomerReview(h.token));assert.equal(h.sent.length,0);});
test('rotated worker token rejected after row lock',async()=>{const h=harness({stale:true});await assert.rejects(h.service.respondWorker(h.token,'accept'));assert.equal(h.job.status,'PENDING');});
test('review requires accepted worker and at least one photo',async()=>{for(const options of [{status:'PENDING'},{status:'ACCEPTED',photos:0}]){const h=harness(options);await assert.rejects(h.service.requestCustomerReview(h.token));assert.equal(h.sent.length,0);}});
test('email failure reopens review action and revokes the undelivered link',async()=>{const h=harness({status:'ACCEPTED',email:false});const result=await h.service.requestCustomerReview(h.token);assert.equal(result.emailSent,false);assert.equal(h.job.reviewStatus,'NONE');assert.equal(h.job.reviewTokenHash,null);});
test('customer approval records response and alerts owner without capturing payment',async()=>{const h=harness({status:'ACCEPTED',review:'AWAITING'});await h.service.respondCustomer(h.reviewToken,'approve','Looks great');assert.equal(h.job.reviewStatus,'APPROVED');assert.equal(h.job.reviewNote,'Looks great');assert.equal(h.sent.length,1);await assert.rejects(h.service.respondCustomer(h.reviewToken,'attention','Changed my mind'));});
test('attention response requires feedback and blocks capture eligibility',async()=>{const h=harness({status:'ACCEPTED',review:'AWAITING'});await assert.rejects(h.service.respondCustomer(h.reviewToken,'attention',''));await h.service.respondCustomer(h.reviewToken,'attention','Oven needs attention');assert.equal(h.job.reviewStatus,'ATTENTION');assert.throws(()=>rules.requireReviewApproval(h.job));});
test('only approved managed jobs can complete; legacy bookings retain existing capture path',()=>{for(const reviewStatus of ['NONE','AWAITING','ATTENTION'])assert.throws(()=>rules.requireReviewApproval({reviewStatus}));rules.requireReviewApproval({reviewStatus:'APPROVED'});rules.requireReviewApproval(null);assert.equal(rules.canUpload('ACCEPTED','AWAITING'),false);assert.equal(rules.canUpload('ACCEPTED','ATTENTION'),true);});
