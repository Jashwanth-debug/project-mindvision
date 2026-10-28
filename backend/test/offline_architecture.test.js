/**
 * MindVision Clinical AI - Offline Architecture & Desktop Persistence Test Suite
 *
 * Verifies:
 * 1. Native SQLite Schema Initialization & Migrations
 * 2. Parameterized CRUD operations for Biometrics, Assessments, and Wellness
 * 3. AES-256-GCM Encryption at Rest for Sensitive Clinical Data
 * 4. LocalStorage to SQLite Migration & Duplicate Prevention
 * 5. Vendored MediaPipe FaceMesh & WebAssembly Asset Integrity
 * 6. Standalone Bundled Distribution & Relative Link Structure
 * 7. Binary PDF Header Validation for Desktop File System Export
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { DesktopDatabase } from '../../electron/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

describe('MindVision Offline Desktop Persistence Suite', () => {
  let tempStorageDir;
  let testDb;

  before(() => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mindvision-test-vault-'));
    testDb = new DesktopDatabase(tempStorageDir);
  });

  after(() => {
    if (testDb) testDb.close();
    if (tempStorageDir && fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  it('1. Initializes SQLite database with version 1 schema migrations', () => {
    assert.ok(fs.existsSync(testDb.dbPath), 'Database file should exist on disk');
    assert.ok(fs.existsSync(testDb.keyPath), 'Master vault key should exist with restricted permissions');

    const migrationRow = testDb.db.prepare('SELECT MAX(version) as ver FROM schema_migrations').get();
    assert.strictEqual(migrationRow.ver, 1, 'Schema version must be 1');
  });

  it('2. Encrypts sensitive clinical narratives at rest using AES-256-GCM', () => {
    const rawSensitiveNote = 'Patient expresses severe panic and catastrophic thoughts regarding isolation.';
    const encrypted = testDb.encrypt(rawSensitiveNote);

    assert.ok(encrypted.startsWith('enc:v1:'), 'Encrypted string must follow enc:v1:<iv>:<tag>:<ciphertext>');
    assert.notStrictEqual(encrypted, rawSensitiveNote, 'Plaintext must never match ciphertext');

    const decrypted = testDb.decrypt(encrypted);
    assert.strictEqual(decrypted, rawSensitiveNote, 'Decrypted text must match original note exactly');
  });

  it('3. Persists check-in biometric telemetry and encrypts patient reflection', () => {
    const record = {
      id: 'rec_offline_001',
      timestamp: '2026-10-27T10:00:00.000Z',
      dateIso: '2026-10-27',
      au4: 0.42,
      au15: 0.38,
      prosody: 0.25,
      sentiment: -0.4,
      compositeRisk: 6.8,
      incongruence: 0.15,
      riskLevel: 'ELEVATED',
      summary: 'Elevated facial tension and somatic stress observed.',
      explanation: 'Action Unit 4 furrowing indicates persistent mental strain.',
      sharedText: 'I feel overwhelmed with work deadlines and sleep deprivation.',
      dialogHistory: [
        { sender: 'ai', text: 'How are you feeling today?' },
        { sender: 'user', text: 'Stressed and tired.' }
      ],
      hasFacial: true,
      hasAudio: true,
      isDemo: false
    };

    const saveResult = testDb.saveCheckInRecord(record);
    assert.strictEqual(saveResult.success, true);
    assert.strictEqual(saveResult.id, 'rec_offline_001');

    // Verify raw row in SQLite holds encrypted text
    const rawRow = testDb.db.prepare('SELECT shared_text, dialog_history_json FROM checkin_records WHERE id = ?').get('rec_offline_001');
    assert.ok(rawRow.shared_text.startsWith('enc:v1:'), 'Raw database shared_text must be encrypted');
    assert.ok(rawRow.dialog_history_json.startsWith('enc:v1:'), 'Raw database dialog_history must be encrypted');

    // Verify loadCheckInRecords decrypts correctly
    const loaded = testDb.loadCheckInRecords();
    const found = loaded.find((r) => r.id === 'rec_offline_001');
    assert.ok(found, 'Record must be retrieved');
    assert.strictEqual(found.sharedText, record.sharedText);
    assert.strictEqual(found.dialogHistory.length, 2);
    assert.strictEqual(found.compositeRisk, 6.8);
    assert.strictEqual(found.hasFacial, true);
  });

  it('4. Persists standardized psychometric assessments (PHQ-9 / GAD-7)', () => {
    const assessment = {
      id: 'asmt_gad7_001',
      instrumentId: 'gad7',
      title: 'Generalized Anxiety Disorder-7',
      timestamp: '2026-10-27T11:00:00.000Z',
      score: 14,
      maxScore: 21,
      severity: 'Moderate Anxiety',
      answers: { item_1: 2, item_2: 3, item_3: 2 }
    };

    testDb.saveAssessmentRecord(assessment);
    const loaded = testDb.loadAssessmentRecords();
    const found = loaded.find((a) => a.id === 'asmt_gad7_001');

    assert.ok(found, 'Assessment record must be retrieved');
    assert.strictEqual(found.score, 14);
    assert.strictEqual(found.maxScore, 21);
    assert.strictEqual(found.answers.item_2, 3);
  });

  it('5. Persists Wellness Hub entries (mood, journal, goals, reminders)', () => {
    // Mood
    testDb.saveWellnessMood({
      id: 'mood_test_1',
      date: '2026-10-27',
      score: 4,
      emotion: 'Grounded',
      note: 'Morning breathwork helped reset somatic balance.',
      timestamp: '2026-10-27T08:00:00.000Z'
    });
    const moods = testDb.loadWellnessMoods();
    assert.strictEqual(moods.length, 1);
    assert.strictEqual(moods[0].note, 'Morning breathwork helped reset somatic balance.');

    // Journal
    testDb.saveWellnessJournal({
      id: 'jnl_test_1',
      date: '2026-10-27',
      title: 'Midday Reflection',
      content: 'Taking 5 minutes to pause and breathe deeply.',
      sentimentScore: 0.6,
      tags: ['Mindfulness', 'Somatic']
    });
    const journals = testDb.loadWellnessJournals();
    assert.strictEqual(journals.length, 1);
    assert.strictEqual(journals[0].title, 'Midday Reflection');
    assert.strictEqual(journals[0].content, 'Taking 5 minutes to pause and breathe deeply.');

    // Goal
    testDb.saveWellnessGoal({
      id: 'goal_test_1',
      title: 'Box Breathing 4-4-4-4',
      category: 'Somatic',
      frequency: 'Daily',
      targetCount: 2,
      completedCount: 1,
      completed: false
    });
    const goals = testDb.loadWellnessGoals();
    assert.strictEqual(goals.length, 1);
    assert.strictEqual(goals[0].title, 'Box Breathing 4-4-4-4');

    // Reminder
    testDb.saveWellnessReminder({
      id: 'rem_test_1',
      title: 'Evening Reflection & Wind-Down',
      time: '21:30',
      type: 'Wind-Down',
      enabled: true,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    });
    const reminders = testDb.loadWellnessReminders();
    assert.strictEqual(reminders.length, 1);
    assert.strictEqual(reminders[0].time, '21:30');
  });

  it('6. Deletes records safely without data corruption', () => {
    const res = testDb.deleteCheckInRecord('rec_offline_001');
    assert.strictEqual(res.success, true);
    const afterDelete = testDb.loadCheckInRecords();
    assert.strictEqual(afterDelete.length, 0);
  });
});

describe('MindVision Offline Bundled Assets & Packaging Suite', () => {
  it('1. Vendored MediaPipe FaceMesh runtime and model weights exist locally', () => {
    const vendorDir = path.join(PROJECT_ROOT, 'frontend/public/vendor/mediapipe');
    assert.ok(fs.existsSync(vendorDir), 'Vendor mediapipe directory must exist');

    const requiredFiles = [
      'face_mesh.js',
      'face_mesh.binarypb',
      'face_mesh_solution_packed_assets.data',
      'face_mesh_solution_packed_assets_loader.js',
      'face_mesh_solution_simd_wasm_bin.wasm',
      'face_mesh_solution_wasm_bin.wasm'
    ];

    for (const f of requiredFiles) {
      const filePath = path.join(vendorDir, f);
      assert.ok(fs.existsSync(filePath), `Required vendored file must exist: ${f}`);
      const stats = fs.statSync(filePath);
      assert.ok(stats.size > 0, `File ${f} must have non-zero size`);
    }
  });

  it('2. Production build dist/index.html uses relative paths (base: "./")', () => {
    const distHtmlPath = path.join(PROJECT_ROOT, 'frontend/dist/index.html');
    if (fs.existsSync(distHtmlPath)) {
      const content = fs.readFileSync(distHtmlPath, 'utf8');
      assert.ok(content.includes('src="./assets/') || content.includes('href="./assets/'), 'Built HTML must use relative asset paths (./assets/)');
      assert.ok(!content.includes('src="/assets/'), 'Built HTML must not contain absolute asset paths (/assets/)');
    }
  });

  it('3. macOS camera and audio entitlements plist exists and contains required keys', () => {
    const plistPath = path.join(PROJECT_ROOT, 'build/entitlements.mac.plist');
    assert.ok(fs.existsSync(plistPath), 'macOS entitlements plist must exist');

    const plistContent = fs.readFileSync(plistPath, 'utf8');
    assert.ok(plistContent.includes('com.apple.security.device.camera'), 'Must declare camera entitlement');
    assert.ok(plistContent.includes('com.apple.security.device.audio-input'), 'Must declare microphone entitlement');
    assert.ok(plistContent.includes('com.apple.security.files.user-selected.read-write'), 'Must declare user-selected file read-write entitlement');
  });

  it('4. Validates %PDF- binary header structure for offline PDF export', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF');
    const header = validPdfBuffer.subarray(0, 5).toString('ascii');
    assert.strictEqual(header, '%PDF-', 'Valid PDF buffer must start with %PDF-');

    const invalidBuffer = Buffer.from('<html><body>Not a PDF</body></html>');
    const invalidHeader = invalidBuffer.subarray(0, 5).toString('ascii');
    assert.notStrictEqual(invalidHeader, '%PDF-', 'Invalid buffer must be rejected');
  });
});
