import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSESSMENT_INSTRUMENTS,
  calculateAssessmentScore
} from '../../frontend/src/data/assessmentInstruments.js';

import {
  generateStandardizedAssessmentPdf
} from '../../frontend/src/utils/pdfReportGenerator.js';

test('Assessment Suite 1: Instrument Catalog & Integrity Invariants', async (t) => {
  await t.test('provides all 5 core clinical instruments with complete metadata', () => {
    assert.strictEqual(ASSESSMENT_INSTRUMENTS.length, 5);

    const ids = ASSESSMENT_INSTRUMENTS.map((i) => i.id);
    assert.ok(ids.includes('phq-9'));
    assert.ok(ids.includes('gad-7'));
    assert.ok(ids.includes('dass-stress'));
    assert.ok(ids.includes('isi-sleep'));
    assert.ok(ids.includes('multimodal-ai'));
  });

  await t.test('verifies each instrument defines valid questions and scoring bands', () => {
    const psychometric = ASSESSMENT_INSTRUMENTS.filter((i) => !i.isMultimodalLive);
    for (const inst of psychometric) {
      assert.ok(inst.questions.length > 0, `${inst.id} should have questions`);
      assert.ok(inst.options.length > 0, `${inst.id} should have options`);
      assert.ok(inst.scoringBands.length > 0, `${inst.id} should have scoring bands`);
      assert.ok(inst.maxScore > 0, `${inst.id} should have a valid maxScore`);

      // Verify questions are numbered sequentially
      inst.questions.forEach((q, idx) => {
        assert.strictEqual(q.index, idx + 1);
        assert.ok(q.prompt && q.prompt.length > 5);
        assert.ok(q.domain && q.domain.length > 3);
      });
    }
  });
});

test('Assessment Suite 2: PHQ-9 Depression Screener Scoring & Crisis Trigger', async (t) => {
  await t.test('calculates exact minimal depression score (all 0s)', () => {
    const answers = {
      phq9_q1: 0, phq9_q2: 0, phq9_q3: 0, phq9_q4: 0,
      phq9_q5: 0, phq9_q6: 0, phq9_q7: 0, phq9_q8: 0, phq9_q9: 0
    };
    const res = calculateAssessmentScore('phq-9', answers);
    assert.strictEqual(res.totalScore, 0);
    assert.strictEqual(res.maxScore, 27);
    assert.strictEqual(res.tier, 'MINIMAL');
    assert.strictEqual(res.isCrisisFlagged, false);
  });

  await t.test('calculates moderate depression score correctly (score = 11)', () => {
    const answers = {
      phq9_q1: 2, phq9_q2: 2, phq9_q3: 2, phq9_q4: 2,
      phq9_q5: 1, phq9_q6: 1, phq9_q7: 1, phq9_q8: 0, phq9_q9: 0
    };
    const res = calculateAssessmentScore('phq-9', answers);
    assert.strictEqual(res.totalScore, 11);
    assert.strictEqual(res.tier, 'MODERATE');
    assert.strictEqual(res.isCrisisFlagged, false);
  });

  await t.test('calculates severe depression score correctly (all 3s, score = 27)', () => {
    const answers = {
      phq9_q1: 3, phq9_q2: 3, phq9_q3: 3, phq9_q4: 3,
      phq9_q5: 3, phq9_q6: 3, phq9_q7: 3, phq9_q8: 3, phq9_q9: 3
    };
    const res = calculateAssessmentScore('phq-9', answers);
    assert.strictEqual(res.totalScore, 27);
    assert.strictEqual(res.tier, 'SEVERE');
    assert.strictEqual(res.isCrisisFlagged, true);
  });

  await t.test('triggers isCrisisFlagged whenever Question 9 > 0 regardless of total score', () => {
    // Only Question 9 answered with 1, all others 0 (total score = 1, normally Minimal)
    const answers = {
      phq9_q1: 0, phq9_q2: 0, phq9_q3: 0, phq9_q4: 0,
      phq9_q5: 0, phq9_q6: 0, phq9_q7: 0, phq9_q8: 0, phq9_q9: 1
    };
    const res = calculateAssessmentScore('phq-9', answers);
    assert.strictEqual(res.totalScore, 1);
    assert.strictEqual(res.isCrisisFlagged, true, 'Question 9 > 0 must flag crisis safety escalation');
  });
});

test('Assessment Suite 3: GAD-7 Anxiety Screener Scoring', async (t) => {
  await t.test('calculates mild anxiety score (score = 7)', () => {
    const answers = {
      gad7_q1: 1, gad7_q2: 1, gad7_q3: 1, gad7_q4: 1,
      gad7_q5: 1, gad7_q6: 1, gad7_q7: 1
    };
    const res = calculateAssessmentScore('gad-7', answers);
    assert.strictEqual(res.totalScore, 7);
    assert.strictEqual(res.maxScore, 21);
    assert.strictEqual(res.tier, 'MILD');
  });

  await t.test('calculates severe anxiety score (all 3s, score = 21)', () => {
    const answers = {
      gad7_q1: 3, gad7_q2: 3, gad7_q3: 3, gad7_q4: 3,
      gad7_q5: 3, gad7_q6: 3, gad7_q7: 3
    };
    const res = calculateAssessmentScore('gad-7', answers);
    assert.strictEqual(res.totalScore, 21);
    assert.strictEqual(res.tier, 'SEVERE');
  });
});

test('Assessment Suite 4: DASS-21 Stress & Burnout Scoring', async (t) => {
  await t.test('calculates moderate stress burnout score (score = 11)', () => {
    const answers = {
      dass_q1: 2, dass_q2: 2, dass_q3: 2, dass_q4: 2,
      dass_q5: 1, dass_q6: 1, dass_q7: 1
    };
    const res = calculateAssessmentScore('dass-stress', answers);
    assert.strictEqual(res.totalScore, 11);
    assert.strictEqual(res.maxScore, 21);
    assert.strictEqual(res.tier, 'MODERATE');
  });
});

test('Assessment Suite 5: ISI Insomnia Severity Index Scoring', async (t) => {
  await t.test('calculates clinical insomnia score (score = 16)', () => {
    const answers = {
      isi_q1: 3, isi_q2: 3, isi_q3: 2, isi_q4: 2,
      isi_q5: 2, isi_q6: 2, isi_q7: 2
    };
    const res = calculateAssessmentScore('isi-sleep', answers);
    assert.strictEqual(res.totalScore, 16);
    assert.strictEqual(res.maxScore, 28);
    assert.strictEqual(res.tier, 'MODERATE');
  });
});

test('Assessment Suite 6: Standardized Assessment PDF Report Generation', async (t) => {
  await t.test('generates a valid, non-corrupted PDF report with %PDF- header', async () => {
    const mockAssessment = {
      id: 'test_asmt_123',
      instrumentTitle: 'Patient Health Questionnaire (PHQ-9)',
      shortTitle: 'Depression Screener (PHQ-9)',
      clinicalStandard: 'DSM-5 Validated Instrument',
      category: 'Mood & Depression',
      totalScore: 11,
      maxScore: 27,
      tier: 'MODERATE',
      severityLabel: 'Moderate Depression Symptoms',
      description: 'Patient reports persistent low mood and sleep disturbance.',
      clinicalAction: 'Clinical consultation recommended within 1 to 2 weeks.',
      timestamp: '10/26/2026, 11:30:00 PM',
      itemBreakdown: [
        { index: 1, prompt: 'Little interest or pleasure in doing things', scoreValue: 2, selectedLabel: 'More than half the days' },
        { index: 2, prompt: 'Feeling down, depressed, or hopeless', scoreValue: 2, selectedLabel: 'More than half the days' }
      ]
    };

    const res = await generateStandardizedAssessmentPdf(mockAssessment, { save: false });
    assert.strictEqual(res.success, true);
    assert.ok(res.size > 1000, `Expected PDF size > 1000 bytes, got ${res.size}`);
    assert.strictEqual(res.blob.type, 'application/pdf');

    const buffer = await res.blob.arrayBuffer();
    const header = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    assert.strictEqual(header, '%PDF-');
  });
});
