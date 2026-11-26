'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Journal } = require('./journal.cjs');
const { reconcile } = require('./receipts.cjs');
function setup() {
 const journal = new Journal(':memory:'); journal.reserve('known','token'); journal.outcome('known','SENT','mid'); journal.acknowledged('known');
 return journal;
}
test('a missing read event is recovered from actual message info with provider timestamps', async () => {
 const journal=setup(), at=Date.now(), sent=Math.floor((at-10000)/1000), delivered=sent+2, read=sent+4;
 journal.receipt('mid',2,at-2000); journal.receiptAcknowledged('mid',2);
 const provider={getMessageById:async()=>({fromMe:true,id:{_serialized:'mid'},ack:2,timestamp:sent,getInfo:async()=>({delivery:[{t:delivered}],read:[{t:read}]})})};
 assert.equal(await reconcile({journal,provider}),1);
 const report=journal.receiptReports()[0]; assert.equal(report.ack,3); assert.equal(report.delivered_at,delivered*1000); assert.equal(report.read_at,read*1000);
 assert.equal(journal.receiptCandidates().length,0); journal.close();
});
test('delivery alone, malformed timestamps or a different message never imply reading', async () => {
 for(const mode of ['delivered','future','wrong-message']){
  const journal=setup(), sent=Math.floor(Date.now()/1000)-20;
  const provider={getMessageById:async()=>({fromMe:true,id:{_serialized:mode==='wrong-message'?'other':'mid'},ack:2,timestamp:sent,getInfo:async()=>({delivery:[{t:sent+2}],read:mode==='future'?[{t:sent+9999}]:[]})})};
  assert.equal(await reconcile({journal,provider}),0); assert.ok(journal.receiptReports().every(r=>r.ack===2)); journal.close();
 }
});
test('only stored sent messages are queried, and a receipt timeout is bounded', async () => {
 const journal=setup(); let timeouts=0, calls=0;
 const provider={getMessageById:async id=>{assert.equal(id,'mid'); calls++;return new Promise(()=>{});}};
 assert.equal(await reconcile({journal,provider,timeoutMs:5,onTimeout:async()=>{timeouts++;}}),0);
 assert.equal(calls,1); assert.equal(timeouts,1); assert.equal(journal.receiptReports().length,0); journal.close();
});
test('receipt checks back off locally and never scan already read messages', () => {
 const journal=setup(), at=Date.now(); journal.receiptChecked('mid',at);
 assert.equal(journal.receiptCandidates(at+59000).length,0);
 assert.equal(journal.receiptCandidates(at+60001).length,1);
 journal.db.prepare('UPDATE sends SET updated=?').run(at-2*3600000);
 assert.equal(journal.receiptCandidates(at+10*60000).length,0);
 assert.equal(journal.receiptCandidates(at+31*60000).length,1);
 journal.receipt('mid',3,at); assert.equal(journal.receiptCandidates(at+86400000).length,0); journal.close();
});
