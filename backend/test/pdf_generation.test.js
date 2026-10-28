import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateCheckInPdf,
  generatePatientHistoryPdf,
  sanitizePdfText
} from '../../frontend/src/utils/pdfReportGenerator.js';

describe('PDF Generation Pipeline & Integrity', () => {
  it('sanitizes Unicode characters to safe ASCII/Type-1 font equivalents', () => {
    const raw = "“Hello world” — here’s a bullet: • and an ellipsis… \u00A9 \u200B";
    const cleaned = sanitizePdfText(raw);

    assert.ok(!cleaned.includes('“'), 'Should not contain left double smart quote');
    assert.ok(!cleaned.includes('”'), 'Should not contain right double smart quote');
    assert.ok(!cleaned.includes('’'), 'Should not contain right single smart quote');
    assert.ok(!cleaned.includes('•'), 'Should not contain bullet character');
    assert.ok(!cleaned.includes('—'), 'Should not contain em dash');
    assert.strictEqual(cleaned, '"Hello world" -- here\'s a bullet: - and an ellipsis...');
  });

  it('generates a valid, non-corrupted PDF with %PDF- header and application/pdf blob', async () => {
    const mockRecord = {
      id: 'scr_test_123',
      timestamp: '2026-10-21T10:30:00.000Z',
      dateIso: '2026-10-21T10:30:00.000Z',
      riskLevel: 'MINIMAL',
      compositeRisk: 2.1,
      summary: 'Steady & calm pattern reported',
      explanation: 'Your self-reported answers and estimated signals reflect a calm, steady pattern today.',
      text: 'I felt well-rested and had a pleasant day with family.',
      cues: {
        words: 'I felt well-rested and had a pleasant day with family.',
        speakingRhythm: 'Steady, calm pacing with natural breathing intervals.',
        gentleExpressions: 'Relaxed facial muscle tone and comfortable focus observed.'
      }
    };

    const result = await generateCheckInPdf(mockRecord, { save: false });

    assert.ok(result);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.filename, 'MindVision_CheckIn_2026-10-21.pdf');
    assert.ok(result.blob instanceof Blob);
    assert.strictEqual(result.blob.type, 'application/pdf');
    assert.ok(result.size > 1000, `PDF size should be > 1KB, got ${result.size}`);

    // Verify raw bytes begin with %PDF-
    const arrayBuffer = await result.blob.arrayBuffer();
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
    const headerStr = String.fromCharCode(...headerBytes);
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('generates valid PDF for elevated risk check-ins with warning styles', async () => {
    const elevatedRecord = {
      id: 'scr_elevated_456',
      timestamp: '2026-10-21T11:00:00.000Z',
      riskLevel: 'ELEVATED',
      compositeRisk: 6.8,
      summary: 'It might help to talk with someone',
      explanation: 'We noticed subtle signs of stress in your responses today.',
      text: 'Work has been overwhelming with non-stop deadlines and sleepless nights.'
    };

    const result = await generateCheckInPdf(elevatedRecord, { save: false });
    assert.ok(result);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.blob.type, 'application/pdf');
    assert.ok(result.size > 1000);

    const arrayBuffer = await result.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  it('gracefully handles empty record without throwing or corrupting PDF structure', async () => {
    const result = await generateCheckInPdf({}, { save: false });
    assert.ok(result);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.blob.type, 'application/pdf');
    assert.ok(result.size > 1000);

    const arrayBuffer = await result.blob.arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
    assert.strictEqual(headerStr, '%PDF-');
  });

  describe('generatePatientHistoryPdf', () => {
    const sampleRecords = [
      {
        id: 'rec_1',
        timestamp: '2026-09-20T10:00:00.000Z',
        dateIso: '2026-09-20T10:00:00.000Z',
        riskLevel: 'MINIMAL',
        compositeRisk: 1.5,
        summary: 'Steady & calm pattern reported',
        text: 'Routine check-in, feeling refreshed.'
      },
      {
        id: 'rec_2',
        timestamp: '2026-09-22T14:30:00.000Z',
        dateIso: '2026-09-22T14:30:00.000Z',
        riskLevel: 'ELEVATED',
        compositeRisk: 5.8,
        summary: 'Subtle signs of tension',
        text: 'Experiencing deadline stress at work.'
      }
    ];

    it('generates valid history PDF for multiple records with correct metadata and headers', async () => {
      const result = await generatePatientHistoryPdf(sampleRecords, { save: false });

      assert.ok(result);
      assert.strictEqual(result.success, true);
      assert.ok(/^MindVision_Patient_History_\d{4}-\d{2}-\d{2}\.pdf$/.test(result.filename));
      assert.ok(result.blob instanceof Blob);
      assert.strictEqual(result.blob.type, 'application/pdf');
      assert.ok(result.size > 1500, `Expected history PDF size > 1.5KB, got ${result.size}`);

      const arrayBuffer = await result.blob.arrayBuffer();
      const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
      assert.strictEqual(headerStr, '%PDF-');
    });

    it('handles single record correctly without errors', async () => {
      const result = await generatePatientHistoryPdf([sampleRecords[0]], { save: false });
      assert.ok(result);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.blob.type, 'application/pdf');

      const arrayBuffer = await result.blob.arrayBuffer();
      const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
      assert.strictEqual(headerStr, '%PDF-');
    });

    it('handles missing composite risk and empty optional fields safely', async () => {
      const incompleteRecords = [
        {
          id: 'rec_no_risk',
          timestamp: '2026-09-25T08:00:00.000Z',
          riskLevel: null,
          compositeRisk: null,
          summary: null,
          text: null
        }
      ];

      const result = await generatePatientHistoryPdf(incompleteRecords, { save: false });
      assert.ok(result);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.blob.type, 'application/pdf');

      const arrayBuffer = await result.blob.arrayBuffer();
      const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
      assert.strictEqual(headerStr, '%PDF-');
    });

    it('handles long multiline reflections across page breaks without corruption', async () => {
      const longText = 'This is a detailed reflection on emotional resilience and day-to-day balance. '.repeat(40);
      const longRecord = [
        {
          id: 'rec_long',
          timestamp: '2026-09-26T12:00:00.000Z',
          dateIso: '2026-09-26T12:00:00.000Z',
          riskLevel: 'MODERATE',
          compositeRisk: 3.8,
          summary: 'Extended session with substantial patient commentary.',
          text: longText
        }
      ];

      const result = await generatePatientHistoryPdf(longRecord, { save: false });
      assert.ok(result);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.blob.type, 'application/pdf');
      assert.ok(result.size > 2000);

      const arrayBuffer = await result.blob.arrayBuffer();
      const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
      assert.strictEqual(headerStr, '%PDF-');
    });

    it('gracefully throws an error when records array is empty or invalid', async () => {
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
    });
  });
});
