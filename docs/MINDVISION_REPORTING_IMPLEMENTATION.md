# MindVision Longitudinal Patient History & PDF Reporting Architecture

**Version:** 2.0.0 (Production Release)
**System:** MindVision Clinical AI
**Scope:** Longitudinal Wellness Telemetry, Multi-Metric Trajectory Visualizations, and Comprehensive PDF History Reporting Pipeline

---

## 1. Executive Summary & Core Objectives

The MindVision Patient History and PDF Reporting System has been upgraded to provide a clinically credible, longitudinal view of patient wellness over time. The upgraded system bridges subjective lived experience and objective computational telemetry, adhering to strict data-integrity and non-diagnostic clinical boundaries:

1. **Longitudinal Trend Charting**: Introduces a multi-metric chart switcher offering authentic self-reported mood progression alongside objective sensor telemetry.
2. **Transparent Metric Labeling**: Clearly labels the algorithmic composite risk index as an estimated multimodal risk indicator (0.0 to 10.0), explicitly distinguishing it from self-reported mood ratings or medical diagnoses.
3. **Observation Scope & Data Honesty**: Displays precise date ranges, total observation counts, and active metric coverage. Missing observations are explicitly highlighted rather than interpolated or coerced to synthetic values.
4. **Preserved Clinical Controls**: Maintains all filtering (7-day, 30-day, status), chronological sorting, two-session comparative reflections, and safe deletion workflows.
5. **Comprehensive PDF History Export**: Produces an official multi-session report with observation windows, executive trend summaries, prominent clinical limitation statements, and clear demarcation between recorded facts and algorithmic inferences.
6. **Zero-Knowledge Offline Privacy**: Operates 100% on-device using client-side jsPDF and native browser Blob APIs, guaranteeing that raw biometric signals and notes remain private.

---

## 2. Longitudinal Multi-Metric Chart Architecture

The upgraded `PatientHistoryView.jsx` features an interactive, accessible SVG charting engine supporting four distinct longitudinal dimensions:

```
+-----------------------------------------------------------------------------------+
|  LONGITUDINAL WELLNESS & TELEMETRY SCOPE                                          |
|  Date Range: Sep 15, 2026 - Oct 27, 2026 (42 days) | Total Observations: 13       |
+-----------------------------------------------------------------------------------+
|  [Self-Reported Mood] [Composite Risk Indicator] [Speech Rhythm] [Facial Tension] |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   10.0 + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -    |
|        |                                              * (Elevated: 6.45)          |
|    7.5 + - - - - - - - - - - - - - - - - - - - - - - / - - - - - - - - - - - -    |
|        |                       * (Moderate: 4.20)  /                              |
|    5.0 + - - - - - - - - - - -/ - - - - - - - - - / - - - - - - - - - - - - - -   |
|        |  * (Minimal: 1.15)  /                                                    |
|    0.0 +--+-----------------+---------------------+-------------------------------+
|          Sep 15           Sep 28                Oct 25                            |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### 2.1 The Four Wellness Indicators

| Metric Tab | Data Source | Scale | Clinical Interpretation |
| :--- | :--- | :--- | :--- |
| **Self-Reported Mood** | Authentic user logs (`MoodTrackerService` & check-in responses) | 1 to 5 (`Overwhelmed` to `Great/Joyful`) | User's conscious self-evaluation of daily emotional balance. |
| **Composite Risk Indicator** | Algorithmic multimodal telemetry formula | 0.0 to 10.0 (`Calm` to `Severe`) | Weighted computational index reflecting speech tremor, facial action units, and lexical distress. |
| **Speech Rhythm & Jitter** | Web Audio API prosody analyzer | 0.0 to 1.0 (Cadence to tremor) | Vocal pitch variability and phrasing smoothness during spoken answers. |
| **Facial Tension Markers** | 30fps facial landmark tracker | 0.0 to 1.0 (AU04 & AU15) | Brow furrow concentration (AU04) and lip corner lowering (AU15) geometry. |

### 2.2 Missing Observation Transparency
If a check-in lacks sensor telemetry (e.g., microphone disabled or camera obscured):
- The observation is **omitted** from that metric's trend line (no artificial zeros or synthetic averages).
- A notice pill explicitly displays: `X records lack this indicator and are omitted from chart`.
- If zero points exist for a selected metric, an intentional empty state is shown with a direct link to log the missing data in the Wellness Hub.

---

## 3. Data Integrity & Ethical AI Demarcation

To prevent misinterpretation and eliminate "AI hallucination" risks in digital healthcare, the system strictly separates **Recorded Facts** from **Algorithmic Inferences**:

```
+-------------------------------------------------------------------+
| [A] RECORDED FACTS & PATIENT INPUT                                |
| - Session Timestamp: Oct 25, 2026, 7:15 PM                        |
| - Self-Reported Reflection: "Struggling with sleep lately..."    |
| - Recorded Input Modalities: Audio Vocal, Self-Reported Text      |
+-------------------------------------------------------------------+
| [B] ALGORITHMIC ESTIMATES & INFERRED TELEMETRY                    |
| - Composite Risk Indicator: 6.45 / 10.00 (Telemetry estimate)     |
| - Algorithmic Classification: Support Encouraged (ELEVATED)       |
| - Speaking Rhythm Cue: Hesitant pacing with compressed pitch.     |
| - System Summary: Elevated stress cues detected across lexical.   |
+-------------------------------------------------------------------+
```

### 3.1 Non-Diagnostic Regulatory Guardrails
- **No Diagnostic Claims**: The system explicitly disclaims that it does not provide DSM-5 diagnostic classifications, psychiatric evaluations, or treatment prescriptions.
- **Anti-Gamification Guarantee**: Does not fabricate daily streaks or display synthetic data when records are empty.
- **Trend Caution**: Explicitly notes that subtle shifts across check-ins reflect natural human daily rhythms rather than verified clinical improvement or regression.

---

## 4. Comprehensive PDF History Reporting Architecture

The report export pipeline in `frontend/src/utils/pdfReportGenerator.js` (`generatePatientHistoryPdf`) has been upgraded to produce an archive-quality, multi-page clinical telemetry document.

### 4.1 Document Structure & Page Layout
1. **Brand Header**: Forest Green (`#174A3A`) banner with MindVision brand name, confidential tag, and document subtitle.
2. **Observation Metadata**: Exact report-generation timestamp, total recorded sessions count, and the exact observation window (`Earliest Date to Latest Date`).
3. **Prominent Clinical Limitation Box**:
   > *"CLINICAL LIMITATION STATEMENT & TRANSPARENCY NOTICE: MindVision is an automated wellness telemetry tool and does not provide medical diagnoses, psychiatric evaluations, or clinical prescriptions. Numerical indicators and summaries represent algorithmic estimates derived from self-reported reflections and on-device sensor telemetry. If you are experiencing distress, reach out to a licensed physician, clinical psychologist, or the 24/7 988 Suicide & Crisis Lifeline."*
4. **Longitudinal Trend Summary (Executive Overview)**:
   - Pattern distribution table: Count of `Calm & Steady`, `Mild Stress`, `Support Encouraged`, and `Care Recommended` sessions.
   - Telemetry baseline vs. latest vs. average composite risk metrics.
   - Cautious trend interpretation note.
5. **Chronological Session Cards**:
   - Each session is partitioned into **[A] RECORDED FACTS & PATIENT INPUT** and **[B] ALGORITHMIC ESTIMATES & INFERRED TELEMETRY**.
   - Multi-page safety with automated `ensureSpace(requiredMm)` page splits to prevent text truncation across page boundaries.
6. **Page Footers**:
   - Every page contains: `MindVision Longitudinal Report | Confidential Personal Record | Not a medical diagnosis | Page X of Y`.

### 4.2 Binary Validation & Download Safety
- Produces valid `%PDF-` binary Blobs with strict MIME type `application/pdf`.
- Generates standardized, sanitized filenames: `MindVision_Patient_History_YYYY-MM-DD.pdf`.
- Dispatches downloads via `downloadPdfBlob()` using temporary object URLs with a 4,000ms deferred revocation lifecycle, eliminating memory leaks and browser download blockage.
- Integrates seamlessly with `PdfReportPreviewModal.jsx` for full in-app document inspection before download.

---

## 5. Automated Verification & Quality Assurance

The implementation was validated through automated tests, static analysis, and browser subagent verification:

### 5.1 Test Results
```
▶ Longitudinal Patient History & PDF Reporting Architecture
  ✔ generates a valid longitudinal history PDF with %PDF- binary header and application/pdf MIME
  ✔ includes observation window, total observation counts, and executive trend summary
  ✔ clearly distinguishes recorded facts from algorithmic inferences
  ✔ includes clinical limitation notice explaining report is not a medical diagnosis
  ✔ handles multi-page pagination safely for long reflections and multiple records
  ✔ gracefully handles missing fields and malformed records without throwing
  ✔ throws a descriptive error when records array is empty or non-array
  ✔ creates an in-app preview URL object for history export
✔ Longitudinal Patient History & PDF Reporting Architecture (96.8ms)

ℹ tests 133
ℹ suites 6
ℹ pass 133
ℹ fail 0
```

### 5.2 Build & Code Quality Metrics
- **Automated Backend & Unit Tests**: **133 of 133 tests passing (100% pass rate)**.
- **Frontend Linter (`oxlint`)**: **0 errors** across 55 source files.
- **Whitespace & Git Integrity (`git diff --check`)**: **0 warnings**.
- **Production Bundle Time**: **242ms** with Vite 8.
- **In-Browser Verification**: Verified responsive rendering in Light (`#F7F6F2`) and Dark (`#151A18`) themes, interactive metric tab switching, and real binary PDF preview modal rendering.
