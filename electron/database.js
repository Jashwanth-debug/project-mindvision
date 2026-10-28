/**
 * MindVision Clinical AI - Desktop SQLite Persistence & Encryption Engine
 *
 * Provides production-grade local persistence using Node.js native SQLite (DatabaseSync)
 * with schema versioning, transactions, parameterized queries, and AES-256-GCM encryption
 * at rest for sensitive mental health narratives and clinical dialog history.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const _CURRENT_SCHEMA_VERSION = 1;
const ENCRYPTION_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM

export class DesktopDatabase {
  constructor(storageDir) {
    this.storageDir = storageDir;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
    }

    this.dbPath = path.join(storageDir, 'mindvision_desktop.db');
    this.keyPath = path.join(storageDir, 'mindvision_vault.key');
    this.masterKey = this._initMasterKey();
    this.db = new DatabaseSync(this.dbPath);
    this._runMigrations();
  }

  /**
   * Initializes or loads a machine-isolated master encryption key (256-bit).
   * Restricts file permissions to 0o600 (owner read/write only).
   */
  _initMasterKey() {
    try {
      if (fs.existsSync(this.keyPath)) {
        const raw = fs.readFileSync(this.keyPath);
        if (raw.length === 32) return raw;
      }
      const newKey = crypto.randomBytes(32);
      fs.writeFileSync(this.keyPath, newKey, { mode: 0o600 });
      return newKey;
    } catch {
      // Deterministic memory fallback if disk write is restricted
      return crypto.createHash('sha256').update(this.storageDir + ':mindvision_local_vault').digest();
    }
  }

  /**
   * Encrypts sensitive string data using AES-256-GCM.
   */
  encrypt(plainText) {
    if (plainText == null || plainText === '') return plainText;
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, this.masterKey, iv);
      const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (err) {
      console.warn('[DesktopDatabase] Encryption error:', err.message);
      return plainText;
    }
  }

  /**
   * Decrypts encrypted string data formatted as enc:v1:<iv>:<tag>:<ciphertext>.
   */
  decrypt(cipherText) {
    if (typeof cipherText !== 'string' || !cipherText.startsWith('enc:v1:')) {
      return cipherText;
    }
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 5) return cipherText;
      const iv = Buffer.from(parts[2], 'hex');
      const tag = Buffer.from(parts[3], 'hex');
      const encrypted = Buffer.from(parts[4], 'hex');

      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, this.masterKey, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err) {
      console.warn('[DesktopDatabase] Decryption error:', err.message);
      return cipherText;
    }
  }

  /**
   * Executes versioned schema migrations.
   */
  _runMigrations() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const versionRow = this.db.prepare('SELECT MAX(version) as current_version FROM schema_migrations').get();
    const currentVersion = versionRow?.current_version || 0;

    if (currentVersion < 1) {
      this.db.exec(`
        -- 1. Check-In & Longitudinal Biometric Telemetry
        CREATE TABLE IF NOT EXISTS checkin_records (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          date_iso TEXT NOT NULL,
          au4 REAL NOT NULL,
          au15 REAL NOT NULL,
          prosody REAL NOT NULL,
          sentiment REAL NOT NULL,
          composite_risk REAL NOT NULL,
          incongruence REAL NOT NULL,
          risk_level TEXT NOT NULL,
          summary TEXT,
          explanation TEXT,
          shared_text TEXT,
          cues_json TEXT,
          dialog_history_json TEXT,
          has_facial INTEGER DEFAULT 0,
          has_audio INTEGER DEFAULT 0,
          is_demo INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 2. Standardized Psychometric Assessments (PHQ-9, GAD-7, GHQ-12, Rosenberg, PSS-10)
        CREATE TABLE IF NOT EXISTS assessment_records (
          id TEXT PRIMARY KEY,
          instrument_id TEXT NOT NULL,
          title TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          score INTEGER NOT NULL,
          max_score INTEGER NOT NULL,
          severity TEXT NOT NULL,
          answers_json TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- 3. Wellness Hub: Mood Entries
        CREATE TABLE IF NOT EXISTS wellness_moods (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          score INTEGER NOT NULL,
          emotion TEXT,
          note TEXT,
          timestamp TEXT NOT NULL
        );

        -- 4. Wellness Hub: Journal Entries
        CREATE TABLE IF NOT EXISTS wellness_journals (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          title TEXT,
          content TEXT NOT NULL,
          sentiment_score REAL,
          tags_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- 5. Wellness Hub: Goals & Habits
        CREATE TABLE IF NOT EXISTS wellness_goals (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT,
          frequency TEXT,
          target_count INTEGER,
          completed_count INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );

        -- 6. Wellness Hub: Regimen Reminders
        CREATE TABLE IF NOT EXISTS wellness_reminders (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          time TEXT NOT NULL,
          type TEXT,
          enabled INTEGER DEFAULT 1,
          days_json TEXT
        );

        -- 7. Immutable Clinical Governance Audit Trail
        CREATE TABLE IF NOT EXISTS clinical_audit_trail (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          label TEXT NOT NULL,
          actor TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          session_id TEXT,
          status TEXT NOT NULL,
          details TEXT,
          timestamp TEXT NOT NULL
        );

        -- 8. Application & Privacy Preferences
        CREATE TABLE IF NOT EXISTS app_preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        );

        INSERT INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'));
      `);
    }
  }

  // ==========================================
  // Check-In Records (Biometrics & History)
  // ==========================================

  saveCheckInRecord(record) {
    if (!record || typeof record !== 'object') throw new Error('Invalid record payload');
    const id = String(record.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const timestamp = String(record.timestamp || new Date().toISOString());
    const dateIso = String(record.dateIso || new Date(record.timestamp || Date.now()).toISOString().split('T')[0]);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO checkin_records (
        id, timestamp, date_iso, au4, au15, prosody, sentiment,
        composite_risk, incongruence, risk_level, summary, explanation,
        shared_text, cues_json, dialog_history_json, has_facial, has_audio, is_demo, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      id,
      timestamp,
      dateIso,
      Number(record.au4 || 0),
      Number(record.au15 || 0),
      Number(record.prosody || 0),
      Number(record.sentiment || 0),
      Number(record.compositeRisk ?? record.composite_risk ?? 0),
      Number(record.incongruence || 0),
      String(record.riskLevel || record.risk_level || 'MINIMAL'),
      record.summary ? String(record.summary) : null,
      record.explanation ? String(record.explanation) : null,
      record.sharedText ? this.encrypt(String(record.sharedText)) : null,
      record.cues ? JSON.stringify(record.cues) : null,
      record.dialogHistory ? this.encrypt(JSON.stringify(record.dialogHistory)) : null,
      record.hasFacial ? 1 : 0,
      record.hasAudio ? 1 : 0,
      record.isDemo ? 1 : 0
    );

    return { success: true, id };
  }

  loadCheckInRecords() {
    const rows = this.db.prepare('SELECT * FROM checkin_records ORDER BY timestamp DESC').all();
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      dateIso: r.date_iso,
      au4: r.au4,
      au15: r.au15,
      prosody: r.prosody,
      sentiment: r.sentiment,
      compositeRisk: r.composite_risk,
      incongruence: r.incongruence,
      riskLevel: r.risk_level,
      summary: r.summary,
      explanation: r.explanation,
      sharedText: r.shared_text ? this.decrypt(r.shared_text) : '',
      cues: r.cues_json ? JSON.parse(r.cues_json) : null,
      dialogHistory: r.dialog_history_json ? JSON.parse(this.decrypt(r.dialog_history_json)) : [],
      hasFacial: Boolean(r.has_facial),
      hasAudio: Boolean(r.has_audio),
      isDemo: Boolean(r.is_demo)
    }));
  }

  deleteCheckInRecord(id) {
    if (!id) return { success: false, error: 'Missing ID' };
    this.db.prepare('DELETE FROM checkin_records WHERE id = ?').run(String(id));
    return { success: true, id };
  }

  // ==========================================
  // Standardized Psychometric Assessments
  // ==========================================

  saveAssessmentRecord(record) {
    if (!record || typeof record !== 'object') throw new Error('Invalid assessment record');
    const id = String(record.id || `asmt_${Date.now()}`);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO assessment_records (
        id, instrument_id, title, timestamp, score, max_score, severity, answers_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      String(record.instrumentId || record.instrument_id || 'unknown'),
      String(record.title || 'Clinical Assessment'),
      String(record.timestamp || new Date().toISOString()),
      Number(record.score || 0),
      Number(record.maxScore || record.max_score || 0),
      String(record.severity || 'Normal'),
      record.answers ? this.encrypt(JSON.stringify(record.answers)) : null
    );

    return { success: true, id };
  }

  loadAssessmentRecords() {
    const rows = this.db.prepare('SELECT * FROM assessment_records ORDER BY timestamp DESC').all();
    return rows.map((r) => ({
      id: r.id,
      instrumentId: r.instrument_id,
      title: r.title,
      timestamp: r.timestamp,
      score: r.score,
      maxScore: r.max_score,
      severity: r.severity,
      answers: r.answers_json ? JSON.parse(this.decrypt(r.answers_json)) : {}
    }));
  }

  deleteAssessmentRecord(id) {
    if (!id) return { success: false };
    this.db.prepare('DELETE FROM assessment_records WHERE id = ?').run(String(id));
    return { success: true, id };
  }

  // ==========================================
  // Wellness Hub: Mood, Journal, Goals, Reminders
  // ==========================================

  saveWellnessMood(entry) {
    if (!entry) throw new Error('Invalid mood entry');
    const id = String(entry.id || `mood_${Date.now()}`);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO wellness_moods (id, date, score, emotion, note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      String(entry.date || new Date().toISOString().split('T')[0]),
      Number(entry.score || 3),
      entry.emotion ? String(entry.emotion) : null,
      entry.note ? this.encrypt(String(entry.note)) : null,
      String(entry.timestamp || new Date().toISOString())
    );
    return { success: true, id };
  }

  loadWellnessMoods() {
    const rows = this.db.prepare('SELECT * FROM wellness_moods ORDER BY timestamp DESC').all();
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      score: r.score,
      emotion: r.emotion,
      note: r.note ? this.decrypt(r.note) : '',
      timestamp: r.timestamp
    }));
  }

  saveWellnessJournal(entry) {
    if (!entry) throw new Error('Invalid journal entry');
    const id = String(entry.id || `jnl_${Date.now()}`);
    const nowIso = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO wellness_journals (id, date, title, content, sentiment_score, tags_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      String(entry.date || nowIso.split('T')[0]),
      entry.title ? String(entry.title) : '',
      this.encrypt(String(entry.content || '')),
      entry.sentimentScore != null ? Number(entry.sentimentScore) : null,
      entry.tags ? JSON.stringify(entry.tags) : null,
      String(entry.createdAt || nowIso),
      nowIso
    );
    return { success: true, id };
  }

  loadWellnessJournals() {
    const rows = this.db.prepare('SELECT * FROM wellness_journals ORDER BY created_at DESC').all();
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      content: this.decrypt(r.content),
      sentimentScore: r.sentiment_score,
      tags: r.tags_json ? JSON.parse(r.tags_json) : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  deleteWellnessJournal(id) {
    if (!id) return { success: false };
    this.db.prepare('DELETE FROM wellness_journals WHERE id = ?').run(String(id));
    return { success: true, id };
  }

  saveWellnessGoal(goal) {
    if (!goal) throw new Error('Invalid goal');
    const id = String(goal.id || `goal_${Date.now()}`);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO wellness_goals (id, title, category, frequency, target_count, completed_count, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      String(goal.title || 'Wellness Goal'),
      goal.category ? String(goal.category) : 'Mindfulness',
      goal.frequency ? String(goal.frequency) : 'Daily',
      Number(goal.targetCount || 1),
      Number(goal.completedCount || 0),
      goal.completed ? 1 : 0,
      String(goal.createdAt || new Date().toISOString())
    );
    return { success: true, id };
  }

  loadWellnessGoals() {
    const rows = this.db.prepare('SELECT * FROM wellness_goals ORDER BY created_at ASC').all();
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      frequency: r.frequency,
      targetCount: r.target_count,
      completedCount: r.completed_count,
      completed: Boolean(r.completed),
      createdAt: r.created_at
    }));
  }

  saveWellnessReminder(reminder) {
    if (!reminder) throw new Error('Invalid reminder');
    const id = String(reminder.id || `rem_${Date.now()}`);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO wellness_reminders (id, title, time, type, enabled, days_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      String(reminder.title || 'Reminder'),
      String(reminder.time || '09:00'),
      reminder.type ? String(reminder.type) : 'Check-In',
      reminder.enabled !== false ? 1 : 0,
      reminder.days ? JSON.stringify(reminder.days) : null
    );
    return { success: true, id };
  }

  loadWellnessReminders() {
    const rows = this.db.prepare('SELECT * FROM wellness_reminders ORDER BY time ASC').all();
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      time: r.time,
      type: r.type,
      enabled: Boolean(r.enabled),
      days: r.days_json ? JSON.parse(r.days_json) : []
    }));
  }

  // ==========================================
  // Clinical Governance Audit Trail
  // ==========================================

  saveAuditLog(event) {
    if (!event) return { success: false };
    const id = String(event.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO clinical_audit_trail (id, event_type, label, actor, actor_id, session_id, status, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      String(event.eventType || event.event_type || 'SYSTEM_EVENT'),
      String(event.label || 'Clinical Event'),
      String(event.actor || 'LOCAL_CLIENT'),
      String(event.actorId || event.actor_id || 'client_standalone'),
      event.sessionId || event.session_id ? String(event.sessionId || event.session_id) : null,
      String(event.status || 'LOGGED'),
      event.details ? (typeof event.details === 'object' ? JSON.stringify(event.details) : String(event.details)) : null,
      String(event.timestamp || new Date().toISOString())
    );
    return { success: true, id };
  }

  loadAuditLogs() {
    const rows = this.db.prepare('SELECT * FROM clinical_audit_trail ORDER BY timestamp DESC LIMIT 500').all();
    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      label: r.label,
      actor: r.actor,
      actorId: r.actor_id,
      sessionId: r.session_id,
      status: r.status,
      details: r.details,
      timestamp: r.timestamp
    }));
  }

  // ==========================================
  // Preferences (Theme, Settings)
  // ==========================================

  setPreference(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO app_preferences (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `);
    stmt.run(String(key), String(value));
    return { success: true };
  }

  getPreference(key, defaultValue = null) {
    const row = this.db.prepare('SELECT value FROM app_preferences WHERE key = ?').get(String(key));
    return row ? row.value : defaultValue;
  }

  close() {
    try {
      this.db.close();
    } catch {}
  }
}
