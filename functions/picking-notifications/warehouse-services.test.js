'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {whatsappStatus}=require('./warehouse-services');
const now=Date.parse('2026-11-25T16:00:00Z');
test('only fresh enabled READY status verifies WhatsApp; no delivery or contact data escapes',()=>{
  const value={state:'READY',enabled:true,heartbeatAt:{toMillis:()=>now-1000},phone:'private',secret:'private'};
  const live=whatsappStatus(value,now);assert.equal(live.state,'ok');assert.equal(live.reason,'ready');
  assert.equal(live.expiresAt,new Date(now-1000+420000).toISOString());
  assert.doesNotMatch(JSON.stringify(live),/private|phone|secret/);
  assert.equal(whatsappStatus({...value,enabled:false},now).reason,'paused');
  for(const state of ['UNPAIRED','PAIRING','DISCONNECTED','RESOURCE_PAUSED','ERROR'])
    assert.equal(whatsappStatus({...value,state},now).state,'warn');
  for(const input of [null,{}, {...value,state:'unexpected'},{...value,heartbeatAt:now-420000},{...value,heartbeatAt:now+30001}])
    assert.equal(whatsappStatus(input,now).state,'unknown');
});
