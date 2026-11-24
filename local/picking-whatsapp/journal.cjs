'use strict';
const { DatabaseSync } = require('node:sqlite');
class Journal {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS sends (id TEXT PRIMARY KEY, token TEXT NOT NULL, stage TEXT NOT NULL, outcome TEXT, message_id TEXT, updated INTEGER NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS receipts (message_id TEXT PRIMARY KEY, ack INTEGER NOT NULL, delivered_at INTEGER NOT NULL, read_at INTEGER, reported_ack INTEGER NOT NULL DEFAULT 0)');
    this.db.exec('CREATE TABLE IF NOT EXISTS receipt_checks (message_id TEXT PRIMARY KEY, checked_at INTEGER NOT NULL)');
  }
  reserve(id, token) {
    // An id already reserved is never transmitted again, including after a crash.
    return this.db.prepare("INSERT OR IGNORE INTO sends VALUES (?,?,'RESERVED',NULL,NULL,?)").run(id, token, Date.now()).changes === 1;
  }
  sending(id) { this.db.prepare("UPDATE sends SET stage='SENDING', updated=? WHERE id=?").run(Date.now(), id); }
  outcome(id, outcome, messageId = '') {
    this.db.prepare("UPDATE sends SET stage='REPORT',outcome=?,message_id=?,updated=? WHERE id=?").run(outcome, messageId, Date.now(), id);
  }
  acknowledged(id) { this.db.prepare("UPDATE sends SET stage='DONE',updated=? WHERE id=?").run(Date.now(), id); }
  recover() {
    this.db.prepare("UPDATE sends SET stage='REPORT',outcome='UNKNOWN' WHERE stage IN ('RESERVED','SENDING')").run();
  }
  reports() { return this.db.prepare("SELECT * FROM sends WHERE stage='REPORT' ORDER BY updated LIMIT 50").all(); }
  receipt(messageId, ack, at = Date.now(), deliveredAt = at) {
    if (![2, 3].includes(ack) || !this.db.prepare("SELECT 1 FROM sends WHERE message_id=? AND outcome='SENT'").get(messageId)) return false;
    this.db.prepare(`INSERT INTO receipts (message_id,ack,delivered_at,read_at) VALUES (?,?,?,?)
      ON CONFLICT(message_id) DO UPDATE SET ack=MAX(ack,excluded.ack),
      delivered_at=MIN(delivered_at,excluded.delivered_at),
      read_at=COALESCE(read_at,excluded.read_at)`).run(messageId, ack, deliveredAt, ack === 3 ? at : null);
    return true;
  }
  receiptReports() {
    return this.db.prepare(`SELECT s.id,s.token,r.* FROM receipts r JOIN sends s ON s.message_id=r.message_id
      WHERE r.reported_ack < r.ack AND s.stage='DONE' ORDER BY r.delivered_at LIMIT 50`).all();
  }
  receiptAcknowledged(messageId, ack) {
    this.db.prepare('UPDATE receipts SET reported_ack=MAX(reported_ack,?) WHERE message_id=?').run(ack, messageId);
  }
  receiptCandidates(at = Date.now()) {
    return this.db.prepare(`SELECT s.message_id FROM sends s LEFT JOIN receipts r ON r.message_id=s.message_id
      LEFT JOIN receipt_checks c ON c.message_id=s.message_id
      WHERE s.stage='DONE' AND s.outcome='SENT' AND COALESCE(r.ack,0)<3 AND s.updated>?
      AND (c.checked_at IS NULL OR c.checked_at <= ? - CASE
        WHEN ?-s.updated < 300000 THEN 60000
        WHEN ?-s.updated < 3600000 THEN 300000
        WHEN ?-s.updated < 86400000 THEN 1800000
        WHEN ?-s.updated < 604800000 THEN 21600000 ELSE 86400000 END)
      ORDER BY COALESCE(c.checked_at,0),s.updated DESC LIMIT 2`).all(at - 30 * 86400000, at, at, at, at, at);
  }
  receiptChecked(messageId, at = Date.now()) {
    this.db.prepare('INSERT INTO receipt_checks VALUES (?,?) ON CONFLICT(message_id) DO UPDATE SET checked_at=excluded.checked_at').run(messageId, at);
  }
  prune() { this.db.prepare("DELETE FROM sends WHERE stage='DONE' AND updated < ?").run(Date.now() - 90 * 86400000); this.db.exec('DELETE FROM receipts WHERE NOT EXISTS (SELECT 1 FROM sends WHERE sends.message_id=receipts.message_id); DELETE FROM receipt_checks WHERE NOT EXISTS (SELECT 1 FROM sends WHERE sends.message_id=receipt_checks.message_id)'); }
  close() { this.db.close(); }
}
module.exports = { Journal };
