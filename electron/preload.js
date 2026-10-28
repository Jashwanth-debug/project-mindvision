/**
 * MindVision Clinical AI - Electron Secure Preload Script
 *
 * Strict context bridge exposing ONLY validated IPC channels to renderer.
 * Context isolation is ENFORCED. Direct Node.js access is DISABLED.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,

  // Check-In & Biometrics
  checkIn: {
    saveRecord: (record) => ipcRenderer.invoke('db:save-checkin', record),
    loadRecords: () => ipcRenderer.invoke('db:load-checkins'),
    deleteRecord: (id) => ipcRenderer.invoke('db:delete-checkin', id)
  },

  // Standardized Psychometric Assessments
  assessments: {
    saveRecord: (record) => ipcRenderer.invoke('db:save-assessment', record),
    loadRecords: () => ipcRenderer.invoke('db:load-assessments'),
    deleteRecord: (id) => ipcRenderer.invoke('db:delete-assessment', id)
  },

  // Wellness Hub
  wellness: {
    saveMood: (entry) => ipcRenderer.invoke('db:save-wellness-mood', entry),
    loadMoods: () => ipcRenderer.invoke('db:load-wellness-moods'),
    saveJournal: (entry) => ipcRenderer.invoke('db:save-wellness-journal', entry),
    loadJournals: () => ipcRenderer.invoke('db:load-wellness-journals'),
    deleteJournal: (id) => ipcRenderer.invoke('db:delete-wellness-journal', id),
    saveGoal: (goal) => ipcRenderer.invoke('db:save-wellness-goal', goal),
    loadGoals: () => ipcRenderer.invoke('db:load-wellness-goals'),
    saveReminder: (reminder) => ipcRenderer.invoke('db:save-wellness-reminder', reminder),
    loadReminders: () => ipcRenderer.invoke('db:load-wellness-reminders')
  },

  // Governance Audit Trail
  audit: {
    saveLog: (event) => ipcRenderer.invoke('db:save-audit-log', event),
    loadLogs: () => ipcRenderer.invoke('db:load-audit-logs')
  },

  // Preferences
  preferences: {
    get: (key, defaultValue) => ipcRenderer.invoke('db:get-preference', { key, defaultValue }),
    set: (key, value) => ipcRenderer.invoke('db:set-preference', { key, value })
  },

  // Bidirectional LocalStorage to SQLite Migration
  migration: {
    syncFromLocalStorage: (payload) => ipcRenderer.invoke('db:sync-from-localstorage', payload)
  },

  // Native File System Operations (Strictly Validated)
  fs: {
    savePdfToDisk: (pdfBuffer, defaultFilename) =>
      ipcRenderer.invoke('fs:save-pdf', { buffer: pdfBuffer, filename: defaultFilename })
  },

  // System & Environment
  system: {
    getNetworkStatus: () => ipcRenderer.invoke('system:get-network-status')
  }
});
