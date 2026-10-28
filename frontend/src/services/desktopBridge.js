/**
 * MindVision Clinical AI - Desktop Integration & Storage Bridge
 *
 * Provides unified, seamless data access across both:
 * 1. Electron Desktop Workstation (Secure Encrypted SQLite + Native Dialogs)
 * 2. Standalone Browser Environment (LocalStorage + Web Blob URLs)
 */

export const isDesktopEnvironment = () => {
  return typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop);
};

export const DesktopBridge = {
  isDesktop: isDesktopEnvironment,

  /**
   * Initializes desktop storage and synchronizes existing localStorage data into SQLite.
   */
  async initializeDesktopPersistence() {
    if (!isDesktopEnvironment()) return false;
    try {
      const rawPatient = localStorage.getItem('mindvision_patient_records');
      const rawAssessments = localStorage.getItem('mindvision_assessment_records');
      const payload = {
        patientRecords: rawPatient ? JSON.parse(rawPatient) : [],
        assessmentRecords: rawAssessments ? JSON.parse(rawAssessments) : []
      };

      if (window.desktopAPI?.migration?.syncFromLocalStorage) {
        await window.desktopAPI.migration.syncFromLocalStorage(payload);
      }
      return true;
    } catch (err) {
      console.warn('[DesktopBridge] Migration init warning:', err);
      return false;
    }
  },

  // ==========================================
  // Check-In Records (Biometrics & History)
  // ==========================================

  async saveCheckInRecord(record) {
    if (isDesktopEnvironment() && window.desktopAPI?.checkIn?.saveRecord) {
      try {
        await window.desktopAPI.checkIn.saveRecord(record);
      } catch (err) {
        console.warn('[DesktopBridge] Desktop check-in save failed, using web storage:', err);
      }
    }
    // Maintain local storage synchronization
    try {
      const STORAGE_KEY = 'mindvision_patient_records';
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [record, ...existing.filter((r) => r.id !== record.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    return { success: true };
  },

  async loadCheckInRecords(defaultSeed = []) {
    if (isDesktopEnvironment() && window.desktopAPI?.checkIn?.loadRecords) {
      try {
        const desktopRecords = await window.desktopAPI.checkIn.loadRecords();
        if (Array.isArray(desktopRecords) && desktopRecords.length > 0) {
          return desktopRecords;
        }
      } catch (err) {
        console.warn('[DesktopBridge] Desktop check-in load failed:', err);
      }
    }
    // Web storage fallback
    try {
      const raw = localStorage.getItem('mindvision_patient_records');
      if (raw) return JSON.parse(raw);
    } catch {}
    return defaultSeed;
  },

  async deleteCheckInRecord(id) {
    if (isDesktopEnvironment() && window.desktopAPI?.checkIn?.deleteRecord) {
      try {
        await window.desktopAPI.checkIn.deleteRecord(id);
      } catch (err) {
        console.warn('[DesktopBridge] Desktop delete failed:', err);
      }
    }
    try {
      const STORAGE_KEY = 'mindvision_patient_records';
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const existing = JSON.parse(raw);
        const filtered = existing.filter((r) => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {}
    return { success: true, id };
  },

  // ==========================================
  // Native PDF Export
  // ==========================================

  async exportPdfFile(pdfBlob, filename) {
    if (isDesktopEnvironment() && window.desktopAPI?.fs?.savePdfToDisk && pdfBlob instanceof Blob) {
      try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const result = await window.desktopAPI.fs.savePdfToDisk(arrayBuffer, filename);
        if (result?.success) {
          return { success: true, filePath: result.filePath };
        }
        if (result?.canceled) {
          return { success: false, canceled: true };
        }
      } catch (err) {
        console.warn('[DesktopBridge] Native PDF save dialog failed, falling back to browser download:', err);
      }
    }

    // Standard Browser Download Fallback
    try {
      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename || 'MindVision_Report.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }, 4000);
      return { success: true, isWebDownload: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};
