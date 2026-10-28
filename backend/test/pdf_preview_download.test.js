import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createPdfPreviewUrl,
  downloadPdfBlob
} from '../../frontend/src/utils/pdfReportGenerator.js';

describe('PDF Preview & Download Architecture Suite', () => {
  const sampleCheckInRecord = {
    id: 'rec_preview_001',
    timestamp: '2026-10-25T14:30:00.000Z',
    dateIso: '2026-10-25T14:30:00.000Z',
    summary: 'Steady and grounded state reported',
    explanation: 'Self-reported answers and estimated telemetry reflect a calm, steady pattern today.',
    compositeRisk: 2.3,
    riskLevel: 'MINIMAL',
    cues: {
      words: 'Felt well rested and focused on daily activities.',
      speakingRhythm: 'Regular, steady cadence with natural pauses.',
      gentleExpressions: 'Relaxed facial muscle tone observed.'
    }
  };

  const sampleAssessmentRecord = {
    id: 'asmt_gad7_preview',
    instrumentId: 'gad-7',
    instrumentTitle: 'Generalized Anxiety Disorder Screener (GAD-7)',
    shortTitle: 'Anxiety Screener (GAD-7)',
    category: 'Anxiety & Worry',
    clinicalStandard: 'APA Validated Instrument',
    totalScore: 5,
    maxScore: 21,
    percentage: 24,
    tier: 'MILD',
    severityLabel: 'Mild Anxiety Symptoms',
    description: 'Mild symptoms of nervous tension and occasional worry reported.',
    clinicalAction: 'Routine lifestyle self-care and scheduled check-ins recommended.',
    badgeColor: 'mild',
    isCrisisFlagged: false,
    timestamp: '10/26/2026, 3:00:00 PM',
    dateIso: '2026-10-26T15:00:00.000Z',
    itemBreakdown: [
      { questionId: 'gad7_q1', index: 1, prompt: 'Feeling nervous, anxious, or on edge', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q2', index: 2, prompt: 'Not being able to stop or control worrying', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q3', index: 3, prompt: 'Worrying too much about different things', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q4', index: 4, prompt: 'Trouble relaxing', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q5', index: 5, prompt: 'Being so restless that it is hard to sit still', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'gad7_q6', index: 6, prompt: 'Becoming easily annoyed or irritable', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q7', index: 7, prompt: 'Feeling afraid as if something awful might happen', scoreValue: 0, selectedLabel: 'Not at all' }
    ]
  };

  it('rejects preview URL generation for null or undefined records', async () => {
    await assert.rejects(
      async () => {
        await createPdfPreviewUrl(null);
      },
      /valid check-in or assessment record is required/
    );
  });

  it('creates an inspected PDF preview object with valid Blob and %PDF- binary header for check-in', async () => {
    // Mock URL.createObjectURL in Node environment if absent
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = (blob) => `blob:mock-uuid-${blob.size}`;
      URL.revokeObjectURL = () => {};
    }

    const preview = await createPdfPreviewUrl(sampleCheckInRecord, 'checkin');

    assert.ok(preview, 'Preview object should be returned');
    assert.ok(typeof preview.objectUrl === 'string', 'Should return objectUrl string');
    assert.ok(preview.blob instanceof Blob, 'Should return Blob instance');
    assert.strictEqual(preview.blob.type, 'application/pdf', 'MIME type must be application/pdf');
    assert.ok(preview.size > 2000, `PDF size must be > 2KB, got ${preview.size}`);
    assert.strictEqual(preview.filename, 'MindVision_CheckIn_2026-10-25.pdf');

    // Verify binary header
    const arrayBuffer = await preview.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('creates an inspected PDF preview for standardized psychometric assessments (GAD-7)', async () => {
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = (blob) => `blob:mock-uuid-${blob.size}`;
      URL.revokeObjectURL = () => {};
    }

    const preview = await createPdfPreviewUrl(sampleAssessmentRecord, 'assessment');

    assert.ok(preview);
    assert.strictEqual(preview.blob.type, 'application/pdf');
    assert.ok(preview.size > 2000, 'Assessment PDF should have valid content');
    assert.ok(preview.filename.includes('Anxiety_Screener__GAD_7_'));

    const arrayBuffer = await preview.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('creates an inspected PDF preview for multi-record patient history', async () => {
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = (blob) => `blob:mock-uuid-${blob.size}`;
      URL.revokeObjectURL = () => {};
    }

    const preview = await createPdfPreviewUrl([sampleCheckInRecord], 'history');

    assert.ok(preview);
    assert.strictEqual(preview.blob.type, 'application/pdf');
    assert.ok(preview.size > 2000);
    assert.ok(preview.filename.startsWith('MindVision_Patient_History_'));

    const arrayBuffer = await preview.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('downloadPdfBlob returns false gracefully in non-browser Node environments', () => {
    // In Node (no window object), downloadPdfBlob safely returns false without crashing
    const res = downloadPdfBlob(new Blob(['test'], { type: 'application/pdf' }));
    assert.strictEqual(res, false);
  });
});
