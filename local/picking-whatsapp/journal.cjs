'use strict';
const { DatabaseSync } = require('node:sqlite');
class Journal {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS sends (id TEXT PRIMARY KEY, token TEXT NOT NULL, stage TEXT NOT NULL, outcome TEXT, message_id TEXT, updated INTEGER NOT NULL)');
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
  prune() { this.db.prepare("DELETE FROM sends WHERE stage='DONE' AND updated < ?").run(Date.now() - 90 * 86400000); }
  close() { this.db.close(); }
}
module.exports = { Journal };
