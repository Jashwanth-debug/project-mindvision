import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateTelemetryMetrics,
  sanitizeTranscript,
  generateClinicalNarrative,
  clampUnitInterval
} from '../../frontend/src/utils/telemetryMath.js';

import {
  evaluateSignalQuality
} from '../../frontend/src/utils/signalQualityEngine.js';

import {
  calculateLexicalStressExtended,
  BENCHMARK_EVALUATION_COHORT,
  PSYCHOMETRIC_SCORING_CROSSWALK
} from '../src/data/datasets.js';

import {
  TelemetryTimelineService
} from '../src/services/telemetryTimelineService.js';

import {
  verifyToken,
  generateToken
} from '../src/middleware/auth.js';

import {
  DoctorController
} from '../src/controllers/doctorController.js';

test('Audit Suite 1: Composite Risk Calculation & Boundary Invariants', async (t) => {
  await t.test('classifies risk levels at exact clinical thresholds', () => {
    // Thresholds: Minimal < 3.5, Elevated 3.5 to 6.9, Severe >= 7.0
    // Test Minimal boundary
    const low = calculateTelemetryMetrics(0.1, 0.1, 0.1, 0.1, { hasFacial: true, hasAudio: true, isTextValid: true });
    assert.strictEqual(low.riskLevel, 'MINIMAL');
    assert.ok(low.compositeRisk < 3.5, `Expected < 3.5, got ${low.compositeRisk}`);

    // Test Elevated boundary
    const mid = calculateTelemetryMetrics(0.4, 0.4, 0.4, 0.4, { hasFacial: true, hasAudio: true, isTextValid: true });
    assert.strictEqual(mid.riskLevel, 'ELEVATED');
    assert.ok(mid.compositeRisk >= 3.5 && mid.compositeRisk < 7.0, `Expected 3.5 <= risk < 7.0, got ${mid.compositeRisk}`);

    // Test Severe boundary
    const high = calculateTelemetryMetrics(0.85, 0.85, 0.80, 0.75, { hasFacial: true, hasAudio: true, isTextValid: true });
    assert.strictEqual(high.riskLevel, 'SEVERE');
    assert.ok(high.compositeRisk >= 7.0, `Expected >= 7.0, got ${high.compositeRisk}`);
  });

  await t.test('clamps out-of-range numeric inputs safely to [0, 1] range', () => {
    // Negative numbers and values > 1
    const clamped = calculateTelemetryMetrics(-0.5, 1.8, -0.2, 2.5, { hasFacial: true, hasAudio: true, isTextValid: true });
    assert.strictEqual(clamped.au4, 0);
    assert.strictEqual(clamped.au15, 1);
    assert.strictEqual(clamped.acousticJitter, 0);
    assert.strictEqual(clamped.textSentiment, 1);
    assert.ok(clamped.compositeRisk >= 0 && clamped.compositeRisk <= 10.0);
  });

  await t.test('handles NaN and undefined modality values gracefully without throwing', () => {
    const safe = calculateTelemetryMetrics(NaN, undefined, null, NaN);
    assert.ok(typeof safe.compositeRisk === 'number');
    assert.ok(!isNaN(safe.compositeRisk));
    assert.ok(safe.compositeRisk >= 0 && safe.compositeRisk <= 10);
    assert.ok(Array.isArray(safe.warnings));
    assert.ok(safe.warnings.length > 0, 'Should include warnings when channels are missing');
  });

  await t.test('dynamically re-weights verbal channel to 100% when hardware telemetry is absent', () => {
    // No facial camera, no audio mic, only verbal text responses
    const verbalOnly = calculateTelemetryMetrics(null, null, null, 0.60, {
      hasFacial: false,
      hasAudio: false,
      isTextValid: true
    });

    assert.strictEqual(verbalOnly.hasFacial, false);
    assert.strictEqual(verbalOnly.hasAudio, false);
    // Composite risk should reflect verbal sentiment (0.60 * 10 = 6.0, Elevated)
    assert.strictEqual(verbalOnly.compositeRisk, 6.0);
    assert.strictEqual(verbalOnly.riskLevel, 'ELEVATED');
    assert.ok(verbalOnly.warnings.some((w) => w.includes('Facial telemetry inactive')));
    assert.ok(verbalOnly.warnings.some((w) => w.includes('Audio prosody inactive')));
  });

  await t.test('detects Affect Masking (Smiling Depression) and elevates risk accordingly', () => {
    // Patient says words of minimal distress (sentiment = 0.20) but displays severe physical tension (AU4=0.85, AU15=0.80, Jitter=0.75)
    const masked = calculateTelemetryMetrics(0.85, 0.80, 0.75, 0.20, {
      hasFacial: true,
      hasAudio: true,
      isTextValid: true
    });

    // Incongruence should be elevated (|0.80 - 0.20| = 0.60)
    assert.ok(masked.incongruenceIndex >= 0.50, `Expected incongruence >= 0.50, got ${masked.incongruenceIndex}`);
    // Affect masking safety check should prevent suppressing composite risk
    assert.ok(masked.compositeRisk >= 6.0, `Expected elevated composite risk for masked depression, got ${masked.compositeRisk}`);
  });

  await t.test('preserves high verbal distress and prevents resting face from suppressing score', () => {
    // Patient reports severe distress verbally (sentiment = 0.80) while face is flat/resting (AU4=0.1, AU15=0.1)
    const severeVerbal = calculateTelemetryMetrics(0.10, 0.10, 0.10, 0.80, {
      hasFacial: true,
      hasAudio: true,
      isTextValid: true
    });

    assert.strictEqual(severeVerbal.riskLevel, 'ELEVATED');
    assert.ok(severeVerbal.compositeRisk >= 5.6, `Expected >= 5.6 for severe verbal report, got ${severeVerbal.compositeRisk}`);
  });

  await t.test('guarantees SHAP attribution weights sum to approximately 100%', () => {
    const res = calculateTelemetryMetrics(0.65, 0.45, 0.50, 0.40, { hasFacial: true, hasAudio: true, isTextValid: true });
    const totalShap = res.shapAttributions.reduce((sum, item) => sum + item.weight, 0);
    assert.ok(Math.abs(totalShap - 100) <= 2, `Expected SHAP sum ~100%, got ${totalShap}%`);
  });
});

test('Audit Suite 2: Hardware Signal Quality & Provenance Verification', async (t) => {
  await t.test('detects underexposed lighting when luminance is below threshold', () => {
    const report = evaluateSignalQuality({
      isLiveMode: true,
      isCameraActive: true,
      luminance: 30, // Underexposed (< 60)
      micVolumeDb: -25,
      stabilityScore: 90
    });
    assert.strictEqual(report.channels.camera.rating, 'UNDEREXPOSED');
    assert.ok(report.warnings.some((w) => w.includes('lighting')));
  });

  await t.test('detects specular glare when luminance exceeds upper threshold', () => {
    const report = evaluateSignalQuality({
      isLiveMode: true,
      isCameraActive: true,
      luminance: 235, // Glare (> 210)
      micVolumeDb: -25,
      stabilityScore: 90
    });
    assert.strictEqual(report.channels.camera.rating, 'GLARE');
    assert.ok(report.warnings.some((w) => w.includes('glare')));
  });

  await t.test('detects acoustic clipping when microphone dBFS exceeds -8 dBFS', () => {
    const report = evaluateSignalQuality({
      isLiveMode: true,
      isAudioActive: true,
      luminance: 120,
      micVolumeDb: -3.5, // Clipping (> -8)
      stabilityScore: 90
    });
    assert.strictEqual(report.channels.microphone.rating, 'CLIPPING');
    assert.ok(report.warnings.some((w) => w.includes('clipping')));
  });

  await t.test('detects low microphone signal when level is near noise floor', () => {
    const report = evaluateSignalQuality({
      isLiveMode: true,
      isAudioActive: true,
      luminance: 120,
      micVolumeDb: -55, // Low signal (< -48)
      stabilityScore: 90
    });
    assert.strictEqual(report.channels.microphone.rating, 'LOW_SIGNAL');
  });

  await t.test('penalizes composite quality score when hardware stream is dropped in live mode', () => {
    const droppedStream = evaluateSignalQuality({
      isLiveMode: true,
      isCameraActive: false, // Camera dropped
      isAudioActive: false,
      luminance: 120,
      micVolumeDb: -25,
      stabilityScore: 90
    });
    assert.ok(droppedStream.overallScore <= 42, `Expected overallScore <= 42, got ${droppedStream.overallScore}`);
    assert.strictEqual(droppedStream.rating, 'DEGRADED');
  });

  await t.test('marks mode as SANDBOX when live hardware telemetry is inactive', () => {
    const sandboxReport = evaluateSignalQuality({ isLiveMode: false });
    assert.strictEqual(sandboxReport.mode, 'SANDBOX');
  });
});

test('Audit Suite 3: Transcript Sanitization & Noise Rejection', async (t) => {
  await t.test('filters out placeholder skip phrases and empty tokens', () => {
    assert.strictEqual(sanitizeTranscript('patient skipped question'), '');
    assert.strictEqual(sanitizeTranscript('Opted to proceed to next question'), '');
    assert.strictEqual(sanitizeTranscript('skip this question'), '');
    assert.strictEqual(sanitizeTranscript('none'), '');
    assert.strictEqual(sanitizeTranscript('null'), '');
    assert.strictEqual(sanitizeTranscript('undefined'), '');
    assert.strictEqual(sanitizeTranscript('n/a'), '');
    assert.strictEqual(sanitizeTranscript('   '), '');
    assert.strictEqual(sanitizeTranscript(''), '');
    assert.strictEqual(sanitizeTranscript(null), '');
    assert.strictEqual(sanitizeTranscript(undefined), '');
  });

  await t.test('filters out repetitive single-token acoustic echo noise', () => {
    assert.strictEqual(sanitizeTranscript('face face'), '');
    assert.strictEqual(sanitizeTranscript('Face, face!'), '');
    assert.strictEqual(sanitizeTranscript('yeah yeah yeah'), '');
    assert.strictEqual(sanitizeTranscript('test test test test'), '');
  });

  await t.test('preserves genuine natural clinical responses', () => {
    const valid1 = 'Work deadlines have been accumulating and I feel a bit overwhelmed.';
    assert.strictEqual(sanitizeTranscript(valid1), valid1);

    const valid2 = 'I am sleeping soundly and feeling grounded today.';
    assert.strictEqual(sanitizeTranscript(valid2), valid2);
  });
});

test('Audit Suite 4: Lexical Sentiment Rules & Negation Handling', async (t) => {
  await t.test('returns baseline score of 0.25 when text is empty or whitespace', () => {
    assert.strictEqual(calculateLexicalStressExtended(''), 0.25);
    assert.strictEqual(calculateLexicalStressExtended('   '), 0.25);
    assert.strictEqual(calculateLexicalStressExtended(null), 0.25);
  });

  await t.test('detects acute crisis keywords and produces elevated score', () => {
    const crisisText = 'I feel like I want to die and end it all.';
    const score = calculateLexicalStressExtended(crisisText);
    assert.ok(score >= 0.55, `Expected crisis score >= 0.55, got ${score}`);
  });

  await t.test('applies negation windows: denies false positives', () => {
    const positive = 'I have panic and insomnia.';
    const negated = 'I do not have panic and do not have insomnia.';
    const scorePos = calculateLexicalStressExtended(positive);
    const scoreNeg = calculateLexicalStressExtended(negated);
    assert.ok(scoreNeg < scorePos, `Expected negated (${scoreNeg}) < positive (${scorePos})`);
  });

  await t.test('detects adversative conjunction conflict ("I am fine, but...")', () => {
    const simple = 'Everything is fine today.';
    const conflicted = 'Everything is fine today, but work has been overwhelming.';
    const scoreSimple = calculateLexicalStressExtended(simple);
    const scoreConflicted = calculateLexicalStressExtended(conflicted);
    assert.ok(scoreConflicted > scoreSimple);
  });
});

test('Audit Suite 5: Patient History Sorting and Filtering Invariants', async (t) => {
  const records = [
    { id: 'rec_1', dateIso: '2026-10-26T12:00:00Z', riskLevel: 'MINIMAL', compositeRisk: 1.2 },
    { id: 'rec_2', dateIso: '2026-10-20T12:00:00Z', riskLevel: 'ELEVATED', compositeRisk: 5.4 },
    { id: 'rec_3', dateIso: '2026-09-15T12:00:00Z', riskLevel: 'SEVERE', compositeRisk: 8.1 }
  ];

  await t.test('correctly filters records by status', () => {
    const minimalOnly = records.filter((r) => r.riskLevel === 'MINIMAL');
    assert.strictEqual(minimalOnly.length, 1);
    assert.strictEqual(minimalOnly[0].id, 'rec_1');

    const elevatedOnly = records.filter((r) => r.riskLevel === 'ELEVATED');
    assert.strictEqual(elevatedOnly.length, 1);
    assert.strictEqual(elevatedOnly[0].id, 'rec_2');
  });

  await t.test('correctly sorts records newest-first vs oldest-first', () => {
    const newestFirst = [...records].sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
    assert.strictEqual(newestFirst[0].id, 'rec_1');
    assert.strictEqual(newestFirst[2].id, 'rec_3');

    const oldestFirst = [...records].sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
    assert.strictEqual(oldestFirst[0].id, 'rec_3');
    assert.strictEqual(oldestFirst[2].id, 'rec_1');
  });
});

test('Audit Suite 6: Missing-Data, Inconclusive Signals & Clinical Narrative', async (t) => {
  await t.test('marks assessment as isInsufficientData when all channels are inactive', () => {
    const emptyMetrics = calculateTelemetryMetrics(null, null, null, null, {
      hasFacial: false,
      hasAudio: false,
      isTextValid: false
    });

    assert.strictEqual(emptyMetrics.isInsufficientData, true);
    assert.ok(emptyMetrics.warnings.some((w) => w.includes('inactive or empty')));
  });

  await t.test('generates honest inconclusive narrative instead of false homeostasis', () => {
    const emptyMetrics = calculateTelemetryMetrics(null, null, null, null, {
      hasFacial: false,
      hasAudio: false,
      isTextValid: false
    });

    const narrative = generateClinicalNarrative(emptyMetrics);
    assert.ok(narrative.includes('Assessment Inconclusive'), `Narrative should be inconclusive, got: ${narrative}`);
    assert.ok(!narrative.includes('Normal psychophysiological homeostasis'), 'Should NOT claim normal homeostasis when no data collected');
  });
});

test('Audit Suite 7: Timeline Delta & Empty Metric Guards', async (t) => {
  await t.test('does not fabricate distress escalation when passed empty metrics', () => {
    const previous = {
      compositeIndicator: 2.0,
      date: '2026-10-20',
      metrics: { au4: 0.10, prosody: 0.10 }
    };

    const deltaReport = TelemetryTimelineService.compareSessions({}, previous);
    assert.strictEqual(deltaReport.hasActiveData, false);
    assert.strictEqual(deltaReport.current.isEstimated, true);
    assert.ok(deltaReport.summaryText.includes('No active telemetry'));
    assert.ok(!deltaReport.summaryText.includes('increased'));
  });

  await t.test('accurately calculates delta when active telemetry is supplied', () => {
    const previous = {
      compositeIndicator: 2.0,
      date: '2026-10-20',
      metrics: { au4: 0.10, prosody: 0.10 }
    };
    const current = {
      compositeRisk: 5.5,
      au4: 0.45,
      acousticJitter: 0.40
    };

    const deltaReport = TelemetryTimelineService.compareSessions(current, previous);
    assert.strictEqual(deltaReport.hasActiveData, true);
    assert.strictEqual(deltaReport.current.isEstimated, false);
    assert.strictEqual(deltaReport.deltas.indicator, '+3.5');
  });
});

test('Audit Suite 8: Authentication Security & Production Token Invariants', async (t) => {
  await t.test('generates and verifies signed HMAC-SHA256 tokens', () => {
    const payload = { id: 'doc_123', role: 'DOCTOR', name: 'Dr. Test' };
    const token = generateToken(payload);
    assert.ok(typeof token === 'string');

    const decoded = verifyToken(token);
    assert.ok(decoded);
    assert.strictEqual(decoded.id, 'doc_123');
    assert.strictEqual(decoded.role, 'DOCTOR');
  });

  await t.test('rejects tampered tokens', () => {
    const token = generateToken({ id: 'doc_123', role: 'DOCTOR' });
    const tampered = token.slice(0, -5) + 'xxxxx';
    assert.strictEqual(verifyToken(tampered), null);
  });

  await t.test('rejects dev bypass tokens when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.strictEqual(verifyToken('test-admin-token'), null);
      assert.strictEqual(verifyToken('test-doctor-token'), null);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

test('Audit Suite 9: Doctor Controller Credential Validation', async (t) => {
  const createMockRes = () => {
    let statusCode = 200;
    let jsonBody = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return body;
      },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody
    };
  };

  await t.test('rejects unauthenticated admin login without valid password', () => {
    const res = createMockRes();
    DoctorController.login({ body: { role: 'ADMIN' } }, res);
    assert.strictEqual(res.getStatusCode(), 401);
    assert.strictEqual(res.getBody().success, false);
  });

  await t.test('authenticates admin login with correct password', () => {
    const res = createMockRes();
    const adminPass = process.env.ADMIN_PASSWORD || 'mindvision_admin_2026';
    DoctorController.login({ body: { role: 'ADMIN', password: adminPass } }, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.strictEqual(res.getBody().success, true);
    assert.strictEqual(res.getBody().user.role, 'ADMIN');
    assert.ok(res.getBody().token);
  });

  await t.test('rejects doctor login with empty body or missing account', () => {
    const res = createMockRes();
    DoctorController.login({ body: {} }, res);
    assert.strictEqual(res.getStatusCode(), 401);
    assert.strictEqual(res.getBody().success, false);
  });
});

test('Audit Suite 10: Non-Finite Inputs, Clamping & Numeric Edge Cases', async (t) => {
  await t.test('clampUnitInterval properly handles Infinity and -Infinity', () => {
    assert.strictEqual(clampUnitInterval(Infinity), 0.0);
    assert.strictEqual(clampUnitInterval(-Infinity), 0.0);
    assert.strictEqual(clampUnitInterval(Infinity, 0.5), 0.5);
    assert.strictEqual(clampUnitInterval(-Infinity, 0.5), 0.5);
  });

  await t.test('clampUnitInterval properly handles NaN, undefined, and non-numeric strings', () => {
    assert.strictEqual(clampUnitInterval(NaN), 0.0);
    assert.strictEqual(clampUnitInterval(undefined), 0.0);
    assert.strictEqual(clampUnitInterval(null), 0.0);
    assert.strictEqual(clampUnitInterval('invalid_token'), 0.0);
    assert.strictEqual(clampUnitInterval({}, 0.2), 0.2);
  });

  await t.test('clampUnitInterval properly clamps numeric values outside [0, 1]', () => {
    assert.strictEqual(clampUnitInterval(1.5), 1.0);
    assert.strictEqual(clampUnitInterval(-0.5), 0.0);
    assert.strictEqual(clampUnitInterval('0.75'), 0.75);
    assert.strictEqual(clampUnitInterval(0.42), 0.42);
  });

  await t.test('calculateTelemetryMetrics handles extreme non-finite inputs without producing NaN compositeRisk', () => {
    const res = calculateTelemetryMetrics(Infinity, -Infinity, NaN, 'corrupted_string');
    assert.ok(typeof res.compositeRisk === 'number');
    assert.ok(Number.isFinite(res.compositeRisk));
    assert.ok(res.compositeRisk >= 0.0 && res.compositeRisk <= 10.0);
    assert.ok(res.isInsufficientData === true || res.warnings.length > 0);
  });
});

test('Audit Suite 11: Epistemological Provenance Layers & Metadata Structure', async (t) => {
  await t.test('attaches inputMetadata with all 5 distinct epistemological categories', () => {
    const res = calculateTelemetryMetrics(0.35, 0.25, 0.30, 0.20, {
      hasFacial: true,
      hasAudio: true,
      isTextValid: true
    });

    assert.ok(res.inputMetadata, 'Should attach inputMetadata');
    const { provenance } = res.inputMetadata;
    assert.ok(provenance, 'Should have provenance breakdown');

    // 1. User-reported information
    assert.strictEqual(provenance.userReported.category, 'USER_REPORTED_INFORMATION');
    assert.strictEqual(provenance.userReported.textAvailable, true);

    // 2. Measured signal features
    assert.strictEqual(provenance.measuredSignals.category, 'MEASURED_SIGNAL_FEATURE');
    assert.strictEqual(provenance.measuredSignals.facialTracking.available, true);
    assert.strictEqual(provenance.measuredSignals.audioProsody.available, true);

    // 3. Model predictions
    assert.strictEqual(provenance.modelPredictions.category, 'MODEL_PREDICTION');
    assert.strictEqual(provenance.modelPredictions.customTrainedModelsInRepo, false);

    // 4. Rule-based calculations
    assert.strictEqual(provenance.ruleBasedCalculations.category, 'RULE_BASED_CALCULATION');
    assert.ok(typeof provenance.ruleBasedCalculations.formula === 'string');

    // 5. AI-generated interpretations
    assert.strictEqual(provenance.aiInterpretations.category, 'AI_GENERATED_INTERPRETATION');
    assert.strictEqual(provenance.aiInterpretations.diagnosticClaim, false);
    assert.ok(provenance.aiInterpretations.nonDiagnosticDisclaimer.includes('non-diagnostic'));
  });
});

test('Audit Suite 12: Feature Attribution Honesty & Linear Point Math', async (t) => {
  await t.test('correctly zeros out points and percentage weight for inactive modalities', () => {
    // Only facial active, audio and text missing
    const res = calculateTelemetryMetrics(0.50, 0.40, null, null, {
      hasFacial: true,
      hasAudio: false,
      isTextValid: false
    });

    const audioItem = res.shapAttributions.find((item) => item.channel.includes('Vocal'));
    const textItem = res.shapAttributions.find((item) => item.channel.includes('Lexicon'));
    const faceItem1 = res.shapAttributions.find((item) => item.channel.includes('Corrugator'));

    assert.strictEqual(audioItem.isAvailable, false);
    assert.strictEqual(audioItem.points, 0);
    assert.strictEqual(audioItem.weight, 0);

    assert.strictEqual(textItem.isAvailable, false);
    assert.strictEqual(textItem.points, 0);
    assert.strictEqual(textItem.weight, 0);

    assert.strictEqual(faceItem1.isAvailable, true);
    assert.ok(faceItem1.points > 0);
    assert.ok(faceItem1.weight > 0);
  });

  await t.test('linear points accurately match implemented weights', () => {
    // When all active, base weights are au4: 2.2, au15: 1.8, jitter: 2.0, text: 4.0 (sum = 10.0)
    const res = calculateTelemetryMetrics(0.50, 0.40, 0.60, 0.30, {
      hasFacial: true,
      hasAudio: true,
      isTextValid: true
    });

    const au4Attr = res.shapAttributions.find((a) => a.name.includes('AU04'));
    const au15Attr = res.shapAttributions.find((a) => a.name.includes('AU15'));
    const jitterAttr = res.shapAttributions.find((a) => a.name.includes('Pitch'));
    const textAttr = res.shapAttributions.find((a) => a.name.includes('Linguistic'));

    // 0.50 * 2.2 = 1.10
    assert.strictEqual(au4Attr.points, 1.1);
    // 0.40 * 1.8 = 0.72
    assert.strictEqual(au15Attr.points, 0.72);
    // 0.60 * 2.0 = 1.20
    assert.strictEqual(jitterAttr.points, 1.2);
    // 0.30 * 4.0 = 1.20
    assert.strictEqual(textAttr.points, 1.2);

    const totalPoints = parseFloat((au4Attr.points + au15Attr.points + jitterAttr.points + textAttr.points).toFixed(1));
    assert.strictEqual(totalPoints, 4.2);
    assert.strictEqual(res.compositeRisk, 4.2);
  });
});

test('Audit Suite 13: Ground-Truth Dataset Transparency & Threshold Consistency', async (t) => {
  await t.test('confirms evaluation cohort contains synthetic demonstration archetypes', () => {
    assert.ok(Array.isArray(BENCHMARK_EVALUATION_COHORT));
    assert.strictEqual(BENCHMARK_EVALUATION_COHORT.length, 6);

    BENCHMARK_EVALUATION_COHORT.forEach((archetype) => {
      assert.ok(archetype.cohortId);
      assert.ok(archetype.archetype);
      assert.ok(archetype.biometrics);
      assert.ok(archetype.psychometrics);
      assert.ok(['MINIMAL', 'ELEVATED', 'SEVERE'].includes(archetype.biometrics.riskLevel));
    });
  });

  await t.test('validates psychometric crosswalk consistency across all bands', () => {
    assert.strictEqual(PSYCHOMETRIC_SCORING_CROSSWALK.length, 3);
    const [minimal, elevated, severe] = PSYCHOMETRIC_SCORING_CROSSWALK;

    assert.deepStrictEqual(minimal.compositeRiskRange, [0.0, 3.4]);
    assert.deepStrictEqual(elevated.compositeRiskRange, [3.5, 6.9]);
    assert.deepStrictEqual(severe.compositeRiskRange, [7.0, 10.0]);
  });
});
