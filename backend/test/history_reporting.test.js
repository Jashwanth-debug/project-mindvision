import { describe, it } from 'node:test';
import assert from 'node:assert';
import zlib from 'node:zlib';
import {
  generatePatientHistoryPdf,
  createPdfPreviewUrl
} from '../../frontend/src/utils/pdfReportGenerator.js';

function extractTextFromPdfBuffer(buffer) {
  const rawStr = Buffer.from(buffer).toString('latin1');
  let extracted = rawStr;
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match;
  while ((match = streamRegex.exec(rawStr)) !== null) {
    try {
      const streamBuf = Buffer.from(match[1], 'latin1');
      const decompressed = zlib.inflateSync(streamBuf).toString('latin1');
      extracted += ' ' + decompressed;
    } catch {
      // Safe fallback if stream is not compressed or raw
    }
  }
  return extracted;
}

describe('Longitudinal Patient History & PDF Reporting Architecture', () => {
  const sampleCohort = [
    {
      id: 'scr_baseline_01',
      timestamp: '2026-09-15T09:00:00.000Z',
      dateIso: '2026-09-15T09:00:00.000Z',
      riskLevel: 'MINIMAL',
      compositeRisk: 1.15,
      summary: 'Steady & calm pattern reported',
      explanation: 'Responses and telemetry reflect steady focus and regular sleeping schedule.',
      text: 'Routine morning check-in. Feeling calm, well-rested, and ready for work.',
      hasFacialTelemetry: true,
      hasAudioTelemetry: true,
      prosody: 0.12,
      au4: 0.08,
      au15: 0.05,
      cues: {
        words: 'Routine morning check-in. Feeling calm, well-rested, and ready for work.',
        speakingRhythm: 'Even, calm pacing with natural breathing pauses.',
        gentleExpressions: 'Relaxed facial tone and comfortable eye focus.'
      }
    },
    {
      id: 'scr_midpoint_02',
      timestamp: '2026-09-28T14:30:00.000Z',
      dateIso: '2026-09-28T14:30:00.000Z',
      riskLevel: 'MODERATE',
      compositeRisk: 4.20,
      summary: 'Mild situational stress detected',
      explanation: 'Noticed subtle indicators of fatigue and tension surrounding deadlines.',
      text: 'Busy week at work. Multiple deadlines have piled up, feeling slight fatigue.',
      hasFacialTelemetry: true,
      hasAudioTelemetry: false,
      au4: 0.42,
      au15: 0.35,
      cues: {
        words: 'Busy week at work. Multiple deadlines have piled up.',
        speakingRhythm: 'Slightly quickened response formulation.',
        gentleExpressions: 'Mild brow furrowing noted during questions.'
      }
    },
    {
      id: 'scr_latest_03',
      timestamp: '2026-10-25T19:15:00.000Z',
      dateIso: '2026-10-25T19:15:00.000Z',
      riskLevel: 'ELEVATED',
      compositeRisk: 6.45,
      summary: 'Support encouraged',
      explanation: 'Elevated stress cues detected across lexical reflections and vocal tone.',
      text: 'Struggling with sleep lately. Feeling overwhelmed by day-to-day pressures.',
      hasFacialTelemetry: false,
      hasAudioTelemetry: true,
      prosody: 0.58,
      cues: {
        words: 'Struggling with sleep lately. Feeling overwhelmed.',
        speakingRhythm: 'Hesitant pacing with compressed pitch variations.',
        gentleExpressions: 'Self-guided reflection with relaxed focus.'
      }
    }
  ];

  it('generates a valid longitudinal history PDF with %PDF- binary header and application/pdf MIME', async () => {
    const result = await generatePatientHistoryPdf(sampleCohort, { save: false });

    assert.ok(result);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.blob.type, 'application/pdf');
    assert.ok(result.size > 2000, `Expected history PDF size > 2KB, got ${result.size}`);
    assert.ok(/^MindVision_Patient_History_\d{4}-\d{2}-\d{2}\.pdf$/.test(result.filename));

    // Binary %PDF- header inspection
    const buffer = await result.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('includes observation window, total observation counts, and executive trend summary', async () => {
    const result = await generatePatientHistoryPdf(sampleCohort, { save: false });
    assert.ok(result);

    const buffer = await result.blob.arrayBuffer();
    const fullText = extractTextFromPdfBuffer(buffer);

    // Verify key titles and sections are encoded in PDF stream
    assert.ok(fullText.includes('MINDVISION'), 'Must include MINDVISION brand header');
    assert.ok(fullText.includes('Longitudinal Wellness Report'), 'Must include report title');
    assert.ok(fullText.includes('CLINICAL LIMITATION STATEMENT'), 'Must include prominent limitation notice');
    assert.ok(fullText.includes('Longitudinal Trend Summary'), 'Must include trend summary section');
    assert.ok(fullText.includes('Pattern Breakdown:'), 'Must include pattern distribution');
    assert.ok(fullText.includes('Composite Risk Indicator'), 'Must include composite risk label');
  });

  it('clearly distinguishes recorded facts from algorithmic inferences', async () => {
    const result = await generatePatientHistoryPdf(sampleCohort, { save: false });
    const buffer = await result.blob.arrayBuffer();
    const fullText = extractTextFromPdfBuffer(buffer);

    // Verify separate subheadings for facts and AI estimates
    assert.ok(fullText.includes('[A] RECORDED FACTS & PATIENT INPUT'), 'Must contain facts section header');
    assert.ok(fullText.includes('[B] ALGORITHMIC ESTIMATES & INFERRED TELEMETRY'), 'Must contain algorithmic estimates section header');
    assert.ok(fullText.includes('Self-Reported Words:'), 'Must label patient reflection as self-reported');
    assert.ok(fullText.includes('Recorded Input Modalities:'), 'Must specify active sensors');
  });

  it('includes clinical limitation notice explaining report is not a medical diagnosis', async () => {
    const result = await generatePatientHistoryPdf(sampleCohort, { save: false });
    const buffer = await result.blob.arrayBuffer();
    const fullText = extractTextFromPdfBuffer(buffer);

    assert.ok(
      fullText.includes('Not a medical diagnosis') || fullText.includes('not a medical diagnosis'),
      'Must contain explicit non-diagnostic disclaimer in footers'
    );
    assert.ok(
      fullText.includes('does not provide medical diagnoses'),
      'Must contain medical limitation statement in header box'
    );
  });

  it('handles multi-page pagination safely for long reflections and multiple records', async () => {
    const longNarrative = 'Reflecting deeply on emotional resilience, work-life balance, and physical stamina. '.repeat(60);
    const multiRecordCohort = [
      ...sampleCohort,
      {
        id: 'scr_extended_04',
        timestamp: '2026-10-26T22:00:00.000Z',
        dateIso: '2026-10-26T22:00:00.000Z',
        riskLevel: 'MINIMAL',
        compositeRisk: 1.80,
        summary: 'Extended wellness reflection completed with extensive commentary.',
        text: longNarrative
      }
    ];

    const result = await generatePatientHistoryPdf(multiRecordCohort, { save: false });
    assert.ok(result);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.blob.type, 'application/pdf');
    assert.ok(result.size > 3000, `Expected larger PDF for multi-page export, got ${result.size}`);

    const buffer = await result.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('gracefully handles missing fields and malformed records without throwing', async () => {
    const malformedRecords = [
      {
        id: 'malformed_1',
        timestamp: null,
        dateIso: null,
        riskLevel: null,
        compositeRisk: NaN,
        summary: null,
        text: null,
        cues: null
      },
      {
        id: 'malformed_2',
        timestamp: 'invalid-date',
        compositeRisk: 'not-a-number',
        au4: undefined,
        prosody: null
      }
    ];

    const result = await generatePatientHistoryPdf(malformedRecords, { save: false });
    assert.ok(result);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.blob.type, 'application/pdf');

    const buffer = await result.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('throws a descriptive error when records array is empty or non-array', async () => {
    await assert.rejects(
      async () => {
        await generatePatientHistoryPdf([], { save: false });
      },
      /There are no check-in records to export/
    );

    await assert.rejects(
      async () => {
        await generatePatientHistoryPdf(null, { save: false });
      },
      /There are no check-in records to export/
    );

    await assert.rejects(
      async () => {
        await generatePatientHistoryPdf('not-an-array', { save: false });
      },
      /There are no check-in records to export/
    );
  });

  it('creates an in-app preview URL object for history export', async () => {
    const previewObj = await createPdfPreviewUrl(sampleCohort, 'history');
    assert.ok(previewObj);
    assert.ok(previewObj.blob instanceof Blob);
    assert.strictEqual(previewObj.blob.type, 'application/pdf');
    assert.ok(previewObj.size > 1000);
    assert.ok(/^MindVision_Patient_History_\d{4}-\d{2}-\d{2}\.pdf$/.test(previewObj.filename));
  });
});
