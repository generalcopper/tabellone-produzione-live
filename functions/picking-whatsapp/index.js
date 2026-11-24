'use strict';
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { createService } = require('./service');
const p = require('./policy');
initializeApp({ projectId: p.PROJECT });
const key = defineSecret('PICKING_WHATSAPP_WORKER_KEY');
const service = createService({ db: getFirestore(), auth: getAuth() });
exports.pickingWhatsAppApi = onRequest({
  region: p.REGION, memory: '256MiB', minInstances: 0, maxInstances: 2,
  timeoutSeconds: 60, invoker: 'public', secrets: [key],
  serviceAccount: '537555699968-compute@developer.gserviceaccount.com',
  cors: ['https://' + p.PROJECT + '.web.app', 'https://' + p.PROJECT + '.firebaseapp.com'],
}, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });
  if (!req.rawBody || req.rawBody.length > 8192) return res.status(413).json({ error: 'Richiesta non valida.' });
  try {
    let result;
    if (req.headers['x-picking-worker']) {
      if (!p.authorized(key.value(), req.headers['x-picking-time'], req.headers['x-picking-signature'], req.rawBody)) {
        return res.status(401).json({ error: 'Autenticazione richiesta.' });
      }
      result = await service.worker(req.body);
    } else result = await service.admin(req.headers.authorization, req.body);
    return res.json(result);
  } catch (error) {
    if (!error.status) console.error('picking_whatsapp_failed', { code: String(error.code || 'internal') });
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Servizio momentaneamente non disponibile.' });
  }
});
