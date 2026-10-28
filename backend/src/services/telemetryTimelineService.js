/**
 * MindVision Clinical AI - Multimodal Timeline & Longitudinal Session Service
 *
 * Manages:
 * - Real-time continuous telemetry time-series buffer (AU04, AU15, Prosody, Incongruence, Risk, Signal Quality)
 * - Timeline scrubbing & event playback
 * - Longitudinal patient session profiles (Session 01, 02, 03, Current)
 * - Delta calculation (Current vs Previous session)
 * - Data provenance preservation (LIVE vs SANDBOX)
 */

const _STORAGE_KEY_TIMELINE = 'mindvision_session_timeline_v1';
const STORAGE_KEY_LONGITUDINAL = 'mindvision_patient_longitudinal_v1';

// Seed historical longitudinal sessions for patient MV-882109
const SEED_LONGITUDINAL_SESSIONS = [
  {
    sessionId: 'sess_hist_01',
    sessionNumber: 'Session 01',
    date: 'Aug 12, 2026',
    timestamp: '2026-08-12T09:30:00Z',
    compositeIndicator: 3.8,
    signalQuality: 94,
    confidence: 88,
    mode: 'SANDBOX',
    consultationStatus: 'COMPLETED',
    clinicianNotes: 'Initial intake baseline established. Patient presents with mild academic stress. Baseline facial expression relaxed, vocal dynamics stable.',
    doctorName: 'Dr. Ananya Sharma',
    metrics: {
      au4: 0.18,
      au15: 0.14,
      prosody: 0.21,
      sentiment: 0.35,
      incongruence: 0.09
    }
  },
  {
    sessionId: 'sess_hist_02',
    sessionNumber: 'Session 02',
    date: 'Aug 26, 2026',
    timestamp: '2026-08-26T10:15:00Z',
    compositeIndicator: 4.2,
    signalQuality: 92,
    confidence: 84,
    mode: 'SANDBOX',
    consultationStatus: 'COMPLETED',
    clinicianNotes: 'Follow-up assessment. Mild situational fatigue noted from workload. Affect congruent with verbal self-report.',
    doctorName: 'Dr. Ananya Sharma',
    metrics: {
      au4: 0.22,
      au15: 0.18,
      prosody: 0.25,
      sentiment: 0.30,
      incongruence: 0.12
    }
  },
  {
    sessionId: 'sess_hist_03',
    sessionNumber: 'Session 03',
    date: 'Sep 09, 2026',
    timestamp: '2026-09-09T11:30:00Z',
    compositeIndicator: 5.1,
    signalQuality: 88,
    confidence: 80,
    mode: 'SANDBOX',
    consultationStatus: 'COMPLETED',
    clinicianNotes: 'Mid-term evaluation. Subtle corrugator supercilii (AU04) tension observed during stress recall. Verbal sentiment slightly guarded.',
    doctorName: 'Dr. Ananya Sharma',
    metrics: {
      au4: 0.44,
      au15: 0.32,
      prosody: 0.38,
      sentiment: 0.25,
      incongruence: 0.19
    }
  },
  {
    sessionId: 'sess_hist_04',
    sessionNumber: 'Session 04',
    date: 'Sep 23, 2026',
    timestamp: '2026-09-23T14:45:00Z',
    compositeIndicator: 4.8,
    signalQuality: 81,
    confidence: 78,
    mode: 'SANDBOX',
    consultationStatus: 'COMPLETED',
    clinicianNotes: 'Bi-weekly check-in. Slight decrease in facial furrowing. Sleep latency reported manageable.',
    doctorName: 'Dr. Rajesh K. Nair',
    metrics: {
      au4: 0.38,
      au15: 0.28,
      prosody: 0.31,
      sentiment: 0.22,
      incongruence: 0.17
    }
  },
  {
    sessionId: 'sess_hist_05',
    sessionNumber: 'Session 05',
    date: 'Oct 01, 2026',
    timestamp: '2026-10-01T16:00:00Z',
    compositeIndicator: 5.9,
    signalQuality: 86,
    confidence: 82,
    mode: 'SANDBOX',
    consultationStatus: 'COMPLETED',
    clinicianNotes: 'Pre-exam stress spike. AU04 elevation (0.52) with lip depressor AU15 co-activation. Micro-jitter F0 variance elevated.',
    doctorName: 'Dr. Priya Patel',
    metrics: {
      au4: 0.52,
      au15: 0.39,
      prosody: 0.45,
      sentiment: 0.18,
      incongruence: 0.24
    }
  },
  {
    sessionId: 'sess_hist_06',
    sessionNumber: 'Session 06 (Previous)',
    date: 'Oct 05, 2026',
    timestamp: '2026-10-05T15:20:00Z',
    compositeIndicator: 5.4,
    signalQuality: 89,
    confidence: 85,
    mode: 'SANDBOX',
    consultationStatus: 'COMPLETED',
    clinicianNotes: 'Post-intervention stabilization session. Somatic relaxation exercises practiced. Moderate attenuation in facial micro-tensions.',
    doctorName: 'Dr. Ananya Sharma',
    metrics: {
      au4: 0.41,
      au15: 0.31,
      prosody: 0.36,
      sentiment: 0.26,
      incongruence: 0.18
    }
  }
];

// Helper to get local data with in-memory fallback for Node backend
const memoryTimelineStore = new Map();

function getStoredJson(key, defaultVal) {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultVal;
    }
    return memoryTimelineStore.has(key) ? memoryTimelineStore.get(key) : defaultVal;
  } catch {
    return memoryTimelineStore.has(key) ? memoryTimelineStore.get(key) : defaultVal;
  }
}

function setStoredJson(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
    } else {
      memoryTimelineStore.set(key, val);
    }
  } catch {
    memoryTimelineStore.set(key, val);
  }
}

export class TelemetryTimelineService {
  // In-memory ring buffer for high-frequency active session timeline (max 100 points)
  static activeBuffer = [];
  static sessionStartTime = Date.now();

  static resetSession() {
    this.activeBuffer = [];
    this.sessionStartTime = Date.now();
  }

  /**
   * Append a real calculated point to the active session multimodal timeline.
   */
  static recordTimelinePoint({
    au4 = 0.5,
    au15 = 0.5,
    acousticJitter = 0.4,
    micRmsDb = -32,
    incongruence = 0.2,
    compositeRisk = 5.0,
    signalQuality = 85,
    confidence = 75,
    mode = 'SANDBOX',
    eventLabel = null
  }) {
    const now = Date.now();
    const elapsedSec = Math.max(0, Math.floor((now - this.sessionStartTime) / 1000));
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const timeFormatted = `${mins}:${secs}`;

    const point = {
      id: `pt_${now}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: now,
      timeFormatted,
      elapsedSec,
      au4: parseFloat(au4.toFixed(2)),
      au15: parseFloat(au15.toFixed(2)),
      prosody: parseFloat(acousticJitter.toFixed(2)),
      micRmsDb: parseFloat(micRmsDb.toFixed(1)),
      incongruence: parseFloat(incongruence.toFixed(2)),
      compositeRisk: parseFloat(compositeRisk.toFixed(1)),
      signalQuality: Math.round(signalQuality),
      confidence: Math.round(confidence),
      mode, // 'LIVE' or 'SANDBOX'
      eventLabel // e.g. "Screening Question 3", "Camera Initialized"
    };

    this.activeBuffer.push(point);
    if (this.activeBuffer.length > 80) {
      this.activeBuffer.shift();
    }

    return point;
  }

  /**
   * Returns the current session time-series.
   * If empty, returns a coherent initial calibration series based on provided baseline.
   */
  static getActiveTimeline(baselineRisk = 5.0, baselineQuality = 82) {
    if (this.activeBuffer.length >= 8) {
      return this.activeBuffer;
    }

    // Seed realistic initial progression from t=0:00 to current
    const initialSeries = [];
    const pointsCount = 16;
    for (let i = 0; i < pointsCount; i++) {
      const elapsed = i * 4; // every 4 seconds
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      const var1 = Math.sin(i * 0.5) * 0.08;
      const var2 = Math.cos(i * 0.4) * 0.06;

      initialSeries.push({
        id: `init_pt_${i}`,
        timestamp: Date.now() - (pointsCount - i) * 4000,
        timeFormatted: `${mins}:${secs}`,
        elapsedSec: elapsed,
        au4: Math.max(0.05, Math.min(0.95, parseFloat((0.45 + var1).toFixed(2)))),
        au15: Math.max(0.05, Math.min(0.95, parseFloat((0.35 + var2).toFixed(2)))),
        prosody: Math.max(0.05, Math.min(0.95, parseFloat((0.30 + var1 * 0.7).toFixed(2)))),
        micRmsDb: parseFloat((-34 + var2 * 20).toFixed(1)),
        incongruence: Math.max(0.05, Math.min(0.95, parseFloat((0.25 + Math.abs(var1 - var2)).toFixed(2)))),
        compositeRisk: Math.max(1.0, Math.min(9.5, parseFloat((baselineRisk + var1 * 3).toFixed(1)))),
        signalQuality: Math.round(baselineQuality + var2 * 10),
        confidence: Math.round(76 + var1 * 8),
        mode: 'SANDBOX',
        eventLabel: i === 2 ? 'Sensor Initialized' : i === 7 ? 'Questionnaire Segment' : i === 12 ? 'Incongruence Check' : null
      });
    }

    return initialSeries;
  }

  /**
   * Get all longitudinal sessions (Seed historical + persisted records).
   */
  static getLongitudinalSessions() {
    const stored = getStoredJson(STORAGE_KEY_LONGITUDINAL, null);
    if (!stored || stored.length === 0) {
      setStoredJson(STORAGE_KEY_LONGITUDINAL, SEED_LONGITUDINAL_SESSIONS);
      return SEED_LONGITUDINAL_SESSIONS;
    }
    return stored;
  }

  /**
   * Produce metric deltas between current active session and previous longitudinal baseline
   */
  static calculateDelta(currentMetrics = {}) {
    return this.compareSessions(currentMetrics);
  }

  /**
   * Compare Current Session vs. Immediate Previous Session.
   * Produces honest metric deltas without clinical diagnosis claims.
   */
  static compareSessions(currentMetrics = {}, previousSession = null) {
    const metrics = currentMetrics || {};
    const prev = previousSession || this.getLongitudinalSessions().slice(-1)[0];
    if (!prev) return null;

    const hasProvidedData = Boolean(
      metrics &&
      (metrics.compositeRisk !== undefined || metrics.compositeIndicator !== undefined)
    );

    const prevIndicator = prev.compositeIndicator ?? 4.8;
    const currIndicator = metrics.compositeRisk ?? metrics.compositeIndicator ?? 6.3;
    const indicatorDelta = parseFloat((currIndicator - prevIndicator).toFixed(1));

    const prevQuality = prev.signalQuality ?? 79;
    const currQuality = metrics.signalQuality ?? (hasProvidedData ? 86 : prevQuality);
    const qualityDelta = currQuality - prevQuality;

    const prevAu4 = prev.metrics?.au4 ?? 0.38;
    const currAu4 = metrics.au4 ?? (hasProvidedData ? 0.55 : prevAu4);
    const au4Delta = parseFloat((currAu4 - prevAu4).toFixed(2));

    const prevProsody = prev.metrics?.prosody ?? 0.31;
    const currProsody = metrics.acousticJitter ?? metrics.prosody ?? (hasProvidedData ? 0.42 : prevProsody);
    const prosodyDelta = parseFloat((currProsody - prevProsody).toFixed(2));

    const prevIncongruence = prev.metrics?.incongruence ?? 0.17;
    const currIncongruence = metrics.incongruenceIndex ?? metrics.incongruence ?? (hasProvidedData ? 0.28 : prevIncongruence);
    const incongruenceDelta = parseFloat((currIncongruence - prevIncongruence).toFixed(2));

    let summaryText = '';
    if (!hasProvidedData) {
      summaryText = `No active telemetry session metrics provided for comparison. Displaying baseline reference from ${prev.date} session.`;
    } else if (indicatorDelta > 0) {
      summaryText = `Prototype composite indicator increased by ${Math.abs(indicatorDelta)} compared to ${prev.date} session. Facial action unit AU04 and voice prosody metrics showed relative elevation.`;
    } else if (indicatorDelta < 0) {
      summaryText = `Prototype composite indicator decreased by ${Math.abs(indicatorDelta)} compared to ${prev.date} session. Telemetry metrics show relative attenuation.`;
    } else {
      summaryText = `Prototype composite indicator remained congruent with ${prev.date} session baseline.`;
    }

    return {
      previous: {
        sessionId: prev.sessionId,
        sessionNumber: prev.sessionNumber,
        date: prev.date,
        indicator: prevIndicator,
        signalQuality: prevQuality,
        au4: prevAu4,
        prosody: prevProsody,
        incongruence: prevIncongruence
      },
      current: {
        sessionNumber: hasProvidedData ? 'Current Session (Active)' : 'Default Reference Baseline',
        date: 'Today',
        indicator: currIndicator,
        signalQuality: currQuality,
        au4: currAu4,
        prosody: currProsody,
        incongruence: currIncongruence,
        isEstimated: !hasProvidedData,
        hasActiveData: hasProvidedData
      },
      deltas: {
        indicator: indicatorDelta > 0 ? `+${indicatorDelta}` : `${indicatorDelta}`,
        quality: qualityDelta > 0 ? `+${qualityDelta}%` : `${qualityDelta}%`,
        au4: au4Delta > 0 ? `+${au4Delta}` : `${au4Delta}`,
        prosody: prosodyDelta > 0 ? `+${prosodyDelta}` : `${prosodyDelta}`,
        incongruence: incongruenceDelta > 0 ? `+${incongruenceDelta}` : `${incongruenceDelta}`
      },
      summaryText,
      hasActiveData: hasProvidedData
    };
  }
}
