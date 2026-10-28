# MindVision Clinical AI — Offline Desktop Architecture & Readiness Specification

**Document Version:** 1.0.0
**Effective Date:** October 26, 2026
**Auditor Roles:** Senior Software Architect, Desktop Application Architect, Application Security Reviewer, AI/ML Validation Engineer
**Companion Documents:**
- [`docs/MINDVISION_AUDIT_REPORT.md`](file:///Users/kjaswanth/Desktop/performance%20delta/docs/MINDVISION_AUDIT_REPORT.md)
- [`docs/MINDVISION_IMPROVEMENT_ROADMAP.md`](file:///Users/kjaswanth/Desktop/performance%20delta/docs/MINDVISION_IMPROVEMENT_ROADMAP.md)
- [`docs/MINDVISION_AI_VALIDATION_REPORT.md`](file:///Users/kjaswanth/Desktop/performance%20delta/docs/MINDVISION_AI_VALIDATION_REPORT.md)

---

## 1. Executive Summary & Architectural Scope

The objective of this specification is to audit the current web-based MindVision application for **offline desktop readiness**, identify every hard network dependency, and define the architectural blueprint for packaging MindVision as an air-gapped, zero-cloud-leakage, cross-platform desktop application (targeting **Electron** on macOS, Windows, and Linux).

### Current State
MindVision operates primarily on the client side inside the browser. However, several critical features currently rely on **external network fetches**, **cloud APIs**, **CDN-delivered machine learning models**, and **browser-bound ephemeral storage (`localStorage`)**. In an air-gapped or network-disconnected desktop environment, these dependencies cause silent failures, broken user interface elements, or stalled assessment pipelines.

### Target Desktop Architecture
```
┌────────────────────────────────────────────────────────────────────────┐
│                   MINDVISION DESKTOP APPLICATION                       │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ELECTRON MAIN PROCESS                         │  │
│  │  - Window Management & Lifecycle                                │  │
│  │  - Hardware Camera/Mic Permissions (macOS Info.plist / Windows)  │  │
│  │  - Local Encrypted SQLite Database (SQLCipher / better-sqlite3)  │  │
│  │  - Direct Native File System Access (PDF Saves, Local Backups)  │  │
│  │  - Secure IPC Message Router & Validation                        │  │
│  └──────────────────┬─────────────────────────────▲─────────────────┘  │
│                     │ Secure Preload IPC Bridge   │                     │
│                     │ (contextIsolation: true)    │                     │
│  ┌──────────────────▼─────────────────────────────┴─────────────────┐  │
│  │                  RENDERER PROCESS (React 19 / Vite)              │  │
│  │  - UI Views & Modals (100% Bundled Local Assets & Fonts)         │  │
│  │  - Client-Side Decision Support & Telemetry Math (Offline)       │  │
│  │  - Local Bundled MediaPipe FaceMesh WASM & TFLite Models         │  │
│  │  - On-Device Web Audio FFT Prosody Analysis                      │  │
│  │  - On-Device Speech Recognition (Local Whisper WASM / ONNX)      │  │
│  │  - Client-Side jsPDF Engine (Offline PDF Generation)             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Inventory of Online Dependencies

The following table provides an exhaustive audit of all external network requests, remote script loaders, and remote assets currently present in the codebase:

| # | Dependency / Resource | Location in Code | Network Destination | Impact in Offline / Air-Gapped Mode | Offline Remediation Strategy |
|---|-----------------------|------------------|---------------------|-------------------------------------|-------------------------------|
| **1** | **MediaPipe FaceMesh Scripts & Model Weights** | [`ScreeningAssessment.jsx:432, 512`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/components/ScreeningAssessment.jsx#L432), [`LiveSensorModal.jsx:251, 276`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/components/LiveSensorModal.jsx#L251) | `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/` (`face_mesh.js`, WASM binaries, and `.tflite` model data) | **CRITICAL FAILURE:** Facial telemetry cannot initialize; camera processing loop fails or hangs indefinitely. | Download and bundle `@mediapipe/face_mesh` assets into `frontend/public/vendor/mediapipe/` and point `locateFile` to `file://` or local Vite asset URLs. |
| **2** | **Google Web Fonts** | [`frontend/index.html:8-10`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/index.html#L8-L10) | `https://fonts.googleapis.com` & `https://fonts.gstatic.com` (`Fraunces`, `Inter`, `JetBrains Mono`, `Plus Jakarta Sans`) | **DEGRADED UI:** Fonts fail to load; browser falls back to default system serif/sans-serif, causing layout shifts. | Self-host fonts by bundling WOFF2 files into `frontend/src/assets/fonts/` and defining local `@font-face` rules in `index.css`. |
| **3** | **Clinician Avatar Images** | [`clinicians.js:28-585`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/data/clinicians.js#L28), [`App.jsx:287`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/App.jsx#L287) | 16 individual photo URLs on `https://images.unsplash.com/...` | **BROKEN VISUALS:** Clinician cards in Doctor Marketplace and Directory display broken image placeholders. | Replace Unsplash URLs with locally bundled WebP/SVG avatar assets in `frontend/src/assets/avatars/`. |
| **4** | **Speech-to-Text Transcription** | [`ScreeningAssessment.jsx:590`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/components/ScreeningAssessment.jsx#L590) | Chromium `webkitSpeechRecognition` delegates to Google Cloud Speech API | **WORKFLOW BLOCKED:** In Chromium/Chrome without internet, `SpeechRecognition` throws a `network` error. Users are forced to manually type responses. | Integrate an on-device local transcription engine: either a quantized WebAssembly Whisper model (`@xenova/transformers`) or native OS speech APIs. |
| **5** | **Neural Text-to-Speech Proxy** | [`ttsService.js:276, 461`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/services/ttsService.js#L276) | `http://localhost:5001/api/tts/synthesize` (backed by external cloud TTS provider) | **DEGRADED AUDIO:** External neural synthesis unavailable; falls back to browser's built-in `window.speechSynthesis`. | Bundle offline synthetic speech or rely strictly on local OS voices via `window.speechSynthesis` without attempting network calls. |
| **6** | **Teletherapy Video Calling** | [`clinicians.js:623`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/data/clinicians.js#L623) | `https://mindvision.daily.co/teletherapy-...` | **NON-FUNCTIONAL:** Remote video call rooms cannot be reached without an internet connection. | Clearly flag teletherapy as an online-only consultation capability; provide offline simulated consultation sandbox or local recording mode. |
| **7** | **Documentation External Links** | [`datasets.js:24-360`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/data/datasets.js#L24), `DocumentationView.jsx` | Academic citations and download links on `huggingface.co`, `zenodo.org`, `nih.gov` | Non-fatal informational links; cannot be opened offline. | Convert links into offline-safe modal views or local markdown summaries. |

---

## 3. AI & Signal-Processing Offline Architecture

MindVision's core signal processing is uniquely suited for offline desktop execution because the majority of calculations are deterministic algorithms running directly in JavaScript.

```
┌────────────────────────────────────────────────────────────────────────┐
│               OFFLINE AI & TELEMETRY SUBSYSTEMS AUDIT                  │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ Telemetry Subsystem      │ Current Implementation   │ Offline Status   │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Facial Action Units      │ MediaPipe FaceMesh (CDN) │ NEEDS VENDORING  │
│                          │ + Local Euclidean Math   │ (CDN dependency) │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Acoustic Prosody & Jitter│ Web Audio AnalyserNode   │ 100% OFFLINE     │
│                          │ 256-bin FFT Peak Scope   │ (Native Browser) │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Linguistic Sentiment     │ EXPANDED_CLINICAL_LEXICON│ 100% OFFLINE     │
│                          │ Regex Negation Windows   │ (Local JS File)  │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Composite Risk Fusion    │ calculateTelemetryMetrics│ 100% OFFLINE     │
│                          │ Linear Combination Rules │ (Local JS File)  │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ Psychometric Cross-Walk  │ Linear Ratio Estimation  │ 100% OFFLINE     │
│                          │ PHQ-9 & GAD-7 Crosswalk  │ (Local JS File)  │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ SOAP Note Synthesis      │ synthesizeSoapNote       │ 100% OFFLINE     │
│                          │ Template Narrative Rules │ (Local JS File)  │
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

### 3.1 Localizing MediaPipe FaceMesh (Step-by-Step)
Currently, `ScreeningAssessment.jsx` and `LiveSensorModal.jsx` inject a `<script>` tag pointing to jsDelivr:
```javascript
// CURRENT: Online CDN injection
script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
```
**Offline Implementation:**
1. Install `@mediapipe/face_mesh` locally as an npm package or copy the required bundle files:
   - `face_mesh.js`
   - `face_mesh_solution_packed_assets_loader.js`
   - `face_mesh_solution_simd_wasm_bin.js`
   - `face_mesh_solution_simd_wasm_bin.wasm`
   - `face_mesh.binarypb`
2. Place these files in `frontend/public/vendor/mediapipe/`.
3. Configure `locateFile` to serve relative assets:
   ```javascript
   const fm = new window.FaceMesh({
     locateFile: (file) => `/vendor/mediapipe/${file}`
   });
   ```
4. This ensures landmark extraction operates with 100% offline autonomy.

### 3.2 Speech-to-Text Offline Strategy
Browser `SpeechRecognition` fails offline in Chromium because it delegates audio buffers to Google servers. For an offline desktop application:
* **Option A (Lightweight WebAssembly — Recommended):** Use `@xenova/transformers` with a quantized `whisper-tiny.en` ONNX model (~39 MB). Transcribes speech directly in a Web Worker using WebAssembly with zero network connectivity.
* **Option B (Native OS Integration):** In Electron, invoke native OS speech recognition APIs via Node.js addons:
  - macOS: `SFSpeechRecognizer`
  - Windows: `Windows.Media.SpeechRecognition`
* **Option C (Robust Fallback):** The current text typing fallback (`TURN_STATE.TYPING`) is already 100% offline functional.

---

## 4. Data Persistence & Desktop Storage Architecture

### 4.1 Shortcomings of Browser `localStorage` for Desktop Use
MindVision currently stores patient records, wellness journals, and audit trails in browser `localStorage`. While convenient for web prototypes, `localStorage` has severe limitations for a medical desktop application:
1. **5–10 MB Quota Limit:** Storing multi-session Action Unit vectors, historical time-series buffers, and multi-page check-in notes will quickly exceed the browser origin storage ceiling.
2. **Data Loss Vulnerability:** Browser cache clears, origin mismatches, or browser updates can wipe `localStorage` unrecoverably.
3. **Synchronous Blocking I/O:** `localStorage.getItem()` and `setItem()` block the main JavaScript execution thread, causing UI stutters when serializing large JSON arrays.
4. **Lack of Encryption at Rest:** Sensitive mental health records, self-harm keywords, and personal journal entries are stored in plaintext on disk (`/Users/<user>/Library/Application Support/.../Local Storage/leveldb/`).

### 4.2 Target Desktop Persistence Architecture: Encrypted SQLite
For the Electron desktop version, persistence should migrate to an embedded **SQLite database with SQLCipher encryption** managed exclusively by the Electron Main Process:

```sql
-- Schema Migration 001: Initial Desktop Schema

CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date_of_birth TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkin_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
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
    cues_json TEXT, -- JSON blob of words, speakingRhythm, gentleExpressions
    dialog_history_json TEXT, -- JSON blob of full Q&A turns
    has_facial INTEGER DEFAULT 0,
    has_audio INTEGER DEFAULT 0,
    is_demo INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wellness_journal (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    date_str TEXT NOT NULL,
    title TEXT,
    content_encrypted TEXT NOT NULL,
    sentiment_score REAL,
    tags_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinical_audit_trail (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    label TEXT NOT NULL,
    actor TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    session_id TEXT,
    status TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 Direct Local File System PDF Export
In the web version, `generateCheckInPdf` triggers a browser file download dialog. In the Electron desktop app:
1. The Renderer process sends the generated PDF array buffer to the Main process via IPC (`export-pdf-file`).
2. The Main process displays the native OS Save Dialog (`dialog.showSaveDialogSync`).
3. The file is written directly to the user's chosen folder (`Documents/MindVision/`) using Node.js `fs.promises.writeFile`.

---

## 5. Desktop Packaging & IPC Security Architecture

When wrapping MindVision with Electron, security must follow the **Principle of Least Privilege**:

### 5.1 Electron Process Separation & Security Flags
```javascript
// electron/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'MindVision Clinical AI Workstation',
    webPreferences: {
      // MANDATORY SECURITY FLAGS
      contextIsolation: true,       // Isolates renderer context from Node.js
      nodeIntegration: false,        // Prevents renderer from calling require('fs')
      sandbox: true,                // Enables Chromium OS-level sandboxing
      webSecurity: true,             // Enforces SOP and blocks cross-origin fetches
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the built Vite bundle locally
  mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
}
```

### 5.2 Secure Preload IPC Bridge
```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose strictly validated APIs to the window object
contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,

  // Database Operations
  saveCheckInRecord: (record) => ipcRenderer.invoke('db:save-record', record),
  loadCheckInRecords: () => ipcRenderer.invoke('db:load-records'),
  deleteCheckInRecord: (id) => ipcRenderer.invoke('db:delete-record', id),

  // PDF Export
  savePdfToDisk: (pdfBuffer, defaultFilename) =>
    ipcRenderer.invoke('fs:save-pdf', { buffer: pdfBuffer, filename: defaultFilename }),

  // Audio & Hardware Status
  getHardwarePermissionStatus: () => ipcRenderer.invoke('system:check-permissions')
});
```

### 5.3 OS Hardware Entitlements (Camera & Microphone)
To capture video and audio on macOS, the packaged desktop application must declare usage descriptions in `entitlements.mac.plist` and `Info.plist`:
```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.device.camera</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```
```xml
<!-- Info.plist strings -->
<key>NSCameraUsageDescription</key>
<string>MindVision requires camera access for on-device real-time facial action unit telemetry during wellness check-ins.</string>
<key>NSMicrophoneUsageDescription</key>
<string>MindVision requires microphone access for on-device acoustic prosody analysis and conversational response input.</string>
```

---

## 6. Prioritized Offline Desktop Migration Checklist

| Priority | Track | Action Item | Affected Source Files | Target Verification |
|---|---|---|---|---|
| **P0** | **Assets** | Download Google Fonts (`Fraunces`, `Inter`, `JetBrains Mono`, `Plus Jakarta Sans`) into `frontend/src/assets/fonts/` and add local `@font-face` rules. Remove remote Google Fonts preconnect tags. | [`frontend/index.html`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/index.html), [`frontend/src/index.css`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/index.css) | Verify UI typography renders identically with network adapter disabled (`ping 8.8.8.8` fails). |
| **P0** | **Assets** | Replace 16 remote Unsplash image URLs in clinician profiles with locally bundled WebP/SVG avatars. | [`frontend/src/data/clinicians.js`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/data/clinicians.js), [`App.jsx`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/App.jsx) | Doctor cards render crisp avatars in offline browser mode. |
| **P0** | **AI / Vision** | Vendor MediaPipe FaceMesh runtime and model weights into `frontend/public/vendor/mediapipe/`. Update `locateFile` in `ScreeningAssessment.jsx` and `LiveSensorModal.jsx`. | [`ScreeningAssessment.jsx`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/components/ScreeningAssessment.jsx), [`LiveSensorModal.jsx`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/components/LiveSensorModal.jsx) | Face tracking starts and extracts AU04/AU15 frames while offline with zero network requests. |
| **P1** | **Speech** | Integrate offline Whisper WASM speech transcription or enforce seamless fallback to typed responses when offline. | [`ScreeningAssessment.jsx`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/components/ScreeningAssessment.jsx), [`conversationEngine.js`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/utils/conversationEngine.js) | Assessment turn switches smoothly without network error popups. |
| **P1** | **Persistence** | Create desktop database abstraction: if `window.desktopAPI` is present, read/write via SQLite IPC; otherwise fall back to browser `localStorage`. | [`wellnessStorageService.js`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/services/wellnessStorageService.js), [`App.jsx`](file:///Users/kjaswanth/Desktop/performance%20delta/frontend/src/App.jsx) | Data persists across app restarts even after clearing browser storage. |
| **P1** | **Packaging** | Create minimal Electron wrapper (`electron/main.js`, `electron/preload.js`, `package.json` build scripts). | `package.json`, `electron/` | `npm run electron:dev` launches native desktop window running the built Vite app. |
| **P2** | **OS Integration** | Configure macOS camera/mic entitlements and native Save As dialog for PDF reports. | `electron/main.js`, `entitlements.mac.plist` | macOS prompts for native camera/microphone permission; PDF saves directly to disk. |
| **P2** | **Build Pipeline** | Configure `electron-builder` to generate signed and notarized installers (DMG for macOS, NSIS for Windows). | `package.json`, `electron-builder.yml` | Installer builds cleanly and runs on air-gapped test machine. |
