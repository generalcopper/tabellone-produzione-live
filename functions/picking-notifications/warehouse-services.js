'use strict';
const { millis } = require('./core');
const STATES = new Set(['UNPAIRED','PAIRING','READY','DISCONNECTED','RESOURCE_PAUSED','ERROR']);
// No recipients, message contents, phone numbers or delivery documents are read.
function whatsappStatus(config, now = Date.now()) {
  const observed = millis(config?.heartbeatAt);
  const known = config && typeof config.enabled === 'boolean' && STATES.has(config.state);
  const fresh = known && observed > 0 && observed <= now + 30000 && now - observed < 420000;
  return {
    id:'picking-whatsapp', state:!fresh?'unknown':config.state === 'READY' && config.enabled?'ok':'warn',
    observedAt:observed > 0 && observed <= now + 30000?new Date(observed).toISOString():null,
    expiresAt:observed > 0 && observed <= now + 30000?new Date(observed + 420000).toISOString():null,
    connected:fresh && config.state === 'READY', enabled:known?config.enabled:null,
    reason:!known?'missing':!fresh?'stale':config.state !== 'READY'?config.state:!config.enabled?'paused':'ready'
  };
}
module.exports = { whatsappStatus };
