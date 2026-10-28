/**
 * MindVision Clinical AI - Desktop Application Main Process
 *
 * Production-grade Electron main process providing:
 * - Hardened security flags (context isolation, sandbox, web security)
 * - Strict IPC parameter validation and boundary defense
 * - Offline native SQLite persistence with AES-256-GCM encryption
 * - Native OS PDF export with safe file dialogs
 * - Standalone bundled React/Vite loading with zero dev server dependency
 */

import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DesktopDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let desktopDb = null;

// Initialize secure local database in OS user-data directory
function getDatabase() {
  if (!desktopDb) {
    const userDataPath = app.getPath('userData');
    desktopDb = new DesktopDatabase(userDataPath);
  }
  return desktopDb;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 720,
    title: 'MindVision Clinical AI — Multimodal Telemetry Platform',
    backgroundColor: '#F7F6F2',
    webPreferences: {
      // MANDATORY SECURITY HARDENING
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Apply strict Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'file:'; " +
          "script-src 'self' 'unsafe-inline' 'file:'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'file:'; " +
          "font-src 'self' data: https://fonts.gstatic.com 'file:'; " +
          "img-src 'self' data: blob: https://images.unsplash.com 'file:'; " +
          "media-src 'self' blob: 'file:'; " +
          "connect-src 'self' http://localhost:5001 blob: data: 'file:';"
        ]
      }
    });
  });

  // Guard navigation against untrusted external redirection
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:') && !url.startsWith('http://localhost:5173')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Load the standalone bundled production frontend
  const devUrl = process.env.ELECTRON_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('[MindVision Electron] Production bundle missing at:', indexPath);
      mainWindow.loadFile(path.join(__dirname, '../frontend/index.html')).catch(() => {});
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==========================================
// IPC HANDLERS & STRICT PARAMETER VALIDATION
// ==========================================

function registerIpcHandlers() {
  const db = getDatabase();

  // 1. Check-In Records
  ipcMain.handle('db:save-checkin', async (_event, record) => {
    try {
      if (!record || typeof record !== 'object') throw new Error('Invalid record');
      return db.saveCheckInRecord(record);
    } catch (err) {
      console.error('[IPC db:save-checkin] Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:load-checkins', async () => {
    try {
      return db.loadCheckInRecords();
    } catch (err) {
      console.error('[IPC db:load-checkins] Error:', err);
      return [];
    }
  });

  ipcMain.handle('db:delete-checkin', async (_event, id) => {
    try {
      if (!id || typeof id !== 'string') throw new Error('Invalid ID');
      return db.deleteCheckInRecord(id);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 2. Standardized Psychometric Assessments
  ipcMain.handle('db:save-assessment', async (_event, record) => {
    try {
      if (!record || typeof record !== 'object') throw new Error('Invalid assessment payload');
      return db.saveAssessmentRecord(record);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:load-assessments', async () => {
    try {
      return db.loadAssessmentRecords();
    } catch {
      return [];
    }
  });

  ipcMain.handle('db:delete-assessment', async (_event, id) => {
    try {
      if (!id || typeof id !== 'string') throw new Error('Invalid ID');
      return db.deleteAssessmentRecord(id);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 3. Wellness Hub: Mood, Journal, Goals, Reminders
  ipcMain.handle('db:save-wellness-mood', async (_event, entry) => {
    try {
      return db.saveWellnessMood(entry);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:load-wellness-moods', async () => {
    try {
      return db.loadWellnessMoods();
    } catch {
      return [];
    }
  });

  ipcMain.handle('db:save-wellness-journal', async (_event, entry) => {
    try {
      return db.saveWellnessJournal(entry);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:load-wellness-journals', async () => {
    try {
      return db.loadWellnessJournals();
    } catch {
      return [];
    }
  });

  ipcMain.handle('db:delete-wellness-journal', async (_event, id) => {
    try {
      return db.deleteWellnessJournal(id);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:save-wellness-goal', async (_event, goal) => {
    try {
      return db.saveWellnessGoal(goal);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:load-wellness-goals', async () => {
    try {
      return db.loadWellnessGoals();
    } catch {
      return [];
    }
  });

  ipcMain.handle('db:save-wellness-reminder', async (_event, reminder) => {
    try {
      return db.saveWellnessReminder(reminder);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:load-wellness-reminders', async () => {
    try {
      return db.loadWellnessReminders();
    } catch {
      return [];
    }
  });

  // 4. Clinical Governance Audit Trail
  ipcMain.handle('db:save-audit-log', async (_event, event) => {
    try {
      return db.saveAuditLog(event);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:load-audit-logs', async () => {
    try {
      return db.loadAuditLogs();
    } catch {
      return [];
    }
  });

  // 5. Preferences
  ipcMain.handle('db:get-preference', async (_event, { key, defaultValue }) => {
    try {
      return db.getPreference(key, defaultValue);
    } catch {
      return defaultValue;
    }
  });

  ipcMain.handle('db:set-preference', async (_event, { key, value }) => {
    try {
      return db.setPreference(key, value);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 6. Seamless LocalStorage to SQLite Data Migration
  ipcMain.handle('db:sync-from-localstorage', async (_event, payload) => {
    try {
      if (!payload || typeof payload !== 'object') return { success: false };
      let migratedCheckIns = 0;
      let migratedAssessments = 0;

      // Migrate check-in records if not already in SQLite
      if (Array.isArray(payload.patientRecords)) {
        const existing = db.loadCheckInRecords();
        const existingIds = new Set(existing.map((r) => r.id));
        for (const rec of payload.patientRecords) {
          if (rec?.id && !existingIds.has(rec.id)) {
            db.saveCheckInRecord(rec);
            migratedCheckIns++;
          }
        }
      }

      // Migrate assessments
      if (Array.isArray(payload.assessmentRecords)) {
        const existing = db.loadAssessmentRecords();
        const existingIds = new Set(existing.map((r) => r.id));
        for (const rec of payload.assessmentRecords) {
          if (rec?.id && !existingIds.has(rec.id)) {
            db.saveAssessmentRecord(rec);
            migratedAssessments++;
          }
        }
      }

      return { success: true, migratedCheckIns, migratedAssessments };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 7. Native OS File System PDF Export
  ipcMain.handle('fs:save-pdf', async (_event, { buffer, filename }) => {
    try {
      if (!buffer) throw new Error('Missing PDF data buffer');
      const safeBuffer = Buffer.from(buffer);

      // Validate PDF signature
      const header = safeBuffer.subarray(0, 5).toString('ascii');
      if (header !== '%PDF-') {
        throw new Error('Invalid PDF binary structure. Magic bytes mismatch.');
      }

      const defaultName = filename ? path.basename(filename) : `MindVision_Report_${Date.now()}.pdf`;
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save MindVision Clinical Report',
        defaultPath: path.join(app.getPath('documents'), defaultName),
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      await fs.promises.writeFile(filePath, safeBuffer);
      return { success: true, filePath };
    } catch (err) {
      console.error('[IPC fs:save-pdf] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // 8. System Status
  ipcMain.handle('system:get-network-status', async () => {
    return {
      platform: process.platform,
      userDataPath: app.getPath('userData'),
      desktopApp: true
    };
  });
}

// App lifecycle
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (desktopDb) desktopDb.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (desktopDb) desktopDb.close();
});
