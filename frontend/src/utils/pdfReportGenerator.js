import { jsPDF } from 'jspdf';

/**
 * Sanitizes input text for standard PDF Type-1 fonts (Helvetica, Times, Courier).
 * Standard PDF fonts only support ASCII/WinAnsi characters; unmapped Unicode characters
 * (like smart quotes, em-dashes, and bullets) cause corruption in strict PDF viewers
 * such as Adobe Acrobat Reader and macOS Preview.
 */
export function sanitizePdfText(str = '') {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/\u2022/g, '-')         // Bullet point
    .replace(/\u2014/g, '--')        // Em dash
    .replace(/\u2013/g, '-')         // En dash
    .replace(/\u2026/g, '...')       // Ellipsis
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Strip non-ASCII
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a clean, standardized filename for the check-in PDF report:
 * Format: MindVision_CheckIn_YYYY-MM-DD.pdf
 */
export function getPdfFilename(record) {
  let dateStr = '';
  if (record?.dateIso && typeof record.dateIso === 'string') {
    dateStr = record.dateIso.split('T')[0];
  } else if (record?.timestamp) {
    const parsed = new Date(record.timestamp);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
    }
  }

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }

  return `MindVision_CheckIn_${dateStr}.pdf`;
}

/**
 * Initiates a reliable, standards-compliant browser download of a PDF Blob.
 *
 * Creates a dedicated Blob object URL and programmatic anchor element, ensuring:
 * 1. Strict 'application/pdf' MIME type
 * 2. Non-blocking asynchronous click invocation
 * 3. Safe lifecycle cleanup to prevent premature URL revocation or memory leaks
 */
export function downloadPdfBlob(blob, filename = 'MindVision_Report.pdf') {
  if (typeof window === 'undefined' || !blob) {
    return false;
  }

  // If running inside Electron desktop shell, trigger native OS Save Dialog
  if (window.desktopAPI?.fs?.savePdfToDisk && blob instanceof Blob) {
    blob.arrayBuffer().then((buffer) => {
      window.desktopAPI.fs.savePdfToDisk(buffer, filename).catch(() => {});
    }).catch(() => {});
    return true;
  }

  try {
    const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);

    const anchor = document.createElement('a');
    anchor.style.position = 'fixed';
    anchor.style.left = '-9999px';
    anchor.style.top = '-9999px';
    anchor.style.opacity = '0';
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.rel = 'noopener noreferrer';

    document.body.appendChild(anchor);
    anchor.click();

    // Revoke object URL after delay ensuring browser download manager has acquired the stream
    setTimeout(() => {
      try {
        if (document.body.contains(anchor)) {
          document.body.removeChild(anchor);
        }
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Safe disposal fallback
      }
    }, 4000);

    return true;
  } catch (err) {
    console.error('[MindVision PDF Downloader] Browser download error:', err);
    throw err;
  }
}

/**
 * Asynchronously generates a PDF document and produces an inspected, valid Blob URL
 * for in-app preview modals.
 *
 * @param {Object|Array} record - Patient check-in or assessment record
 * @param {'checkin'|'assessment'|'history'} type - Report category
 * @returns {Promise<{ objectUrl: string, blob: Blob, filename: string, size: number }>}
 */
export async function createPdfPreviewUrl(record, type = 'checkin') {
  if (!record) {
    throw new Error('A valid check-in or assessment record is required for PDF preview.');
  }

  let result;
  if (type === 'assessment') {
    result = await generateStandardizedAssessmentPdf(record, { save: false });
  } else if (type === 'history') {
    const records = Array.isArray(record) ? record : [record];
    result = await generatePatientHistoryPdf(records, { save: false });
  } else {
    result = await generateCheckInPdf(record, { save: false });
  }

  if (!result?.blob || !(result.blob instanceof Blob)) {
    throw new Error('PDF generator failed to return a valid document Blob.');
  }

  const objectUrl = URL.createObjectURL(result.blob);
  return {
    objectUrl,
    blob: result.blob,
    filename: result.filename,
    size: result.size
  };
}

/**
 * Generates a structured, branded PDF report for a patient check-in.
 *
 * Includes:
 * - MindVision logo/header and "Wellness Check-in Report" title
 * - Date/time of check-in
 * - Plain-language summary matching on-screen tone
 * - Structured reflection cues (Your words, Your speaking rhythm, Gentle expressions)
 * - Footer disclaimer: "This is a wellness check-in, not a medical diagnosis."
 * - Strict binary validation: %PDF- header check, valid MIME type, and clean Blob download
 */
export async function generateCheckInPdf(record = {}, options = { save: true }) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const isElevated =
      record.riskLevel === 'ELEVATED' ||
      record.riskLevel === 'SEVERE' ||
      (typeof record.compositeRisk === 'number' && record.compositeRisk >= 5.0);

    const headline = sanitizePdfText(
      record.summary ||
      (isElevated
        ? 'It might help to talk with someone'
        : 'Steady & calm pattern reported')
    );

    const explanation = sanitizePdfText(
      record.explanation ||
      (isElevated
        ? 'We noticed subtle signs of stress in your responses today. Remember that carrying a lot is hard, and gentle support is always available.'
        : 'Your self-reported answers and estimated signals reflect a calm, steady pattern today. Nice job taking time out of your day to pause and check in with yourself.')
    );

    const filename = getPdfFilename(record);

    // -------------------------------------------------------------
    // 1. TOP BRAND HEADER (Teal Banner)
    // -------------------------------------------------------------
    doc.setFillColor(37, 124, 111); // Brand Sage Teal #257C6F
    doc.rect(0, 0, 210, 26, 'F');

    // Brand Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MINDVISION', 18, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Your Wellness Check-in Companion', 18, 19.5);

    // Confidential Tag
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL | FOR SELF-REFLECTION', 192, 16, { align: 'right' });

    // -------------------------------------------------------------
    // 2. REPORT TITLE & METADATA
    // -------------------------------------------------------------
    let yPos = 38;

    doc.setTextColor(31, 41, 55); // Charcoal #1F2937
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Wellness Check-in Report', 18, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128); // Slate-500 #6B7280

    const displayDate = sanitizePdfText(record.timestamp || new Date().toLocaleString());
    const recordId = sanitizePdfText(record.id || 'MV-REC-TODAY');
    doc.text(`Completed: ${displayDate}   |   Reference ID: ${recordId}`, 18, yPos);

    // -------------------------------------------------------------
    // 3. PLAIN-LANGUAGE SUMMARY CARD
    // -------------------------------------------------------------
    yPos += 10;

    // Card background
    if (isElevated) {
      doc.setFillColor(254, 243, 199); // Warm amber subtle #FEF3C7
      doc.setDrawColor(251, 191, 36);  // Amber border
    } else {
      doc.setFillColor(239, 246, 245); // Teal soft #EFF6F5
      doc.setDrawColor(167, 214, 207); // Soft teal border
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const explanationLines = doc.splitTextToSize(explanation, 162);
    const summaryCardHeight = Math.max(30, 16 + explanationLines.length * 4.5);

    doc.roundedRect(18, yPos, 174, summaryCardHeight, 3, 3, 'FD');

    // Status Badge & Headline
    doc.setTextColor(isElevated ? 180 : 27, isElevated ? 83 : 115, isElevated ? 9 : 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text(headline, 24, yPos + 10);

    // Explanation Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81); // Slate-700
    doc.text(explanationLines, 24, yPos + 17);

    // -------------------------------------------------------------
    // 4. STRUCTURED REFLECTION CUES SECTION
    // -------------------------------------------------------------
    yPos += summaryCardHeight + 8;

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Reflection Cues', 18, yPos);

    yPos += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Everyday signals and thoughts observed during your pause:', 18, yPos);

    // Cue Box 1: Your Words
    yPos += 7;
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.setDrawColor(229, 231, 235); // Gray-200

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const wordsRaw = sanitizePdfText(
      record.cues?.words ||
      (record.text ? record.text.replace(/\(High somatic.*?\)/g, '') : '') ||
      'Shared reflections on daily routine, energy, and sleep patterns.'
    );
    const wordsText = doc.splitTextToSize(`"${wordsRaw}"`, 162);
    const wordsBoxHeight = Math.max(24, 13 + wordsText.length * 4.2);
    doc.roundedRect(18, yPos, 174, wordsBoxHeight, 2, 2, 'FD');

    doc.setTextColor(37, 124, 111);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('1. Your Words', 24, yPos + 7);

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(wordsText, 24, yPos + 13.5);

    // Cue Box 2: Your Speaking Rhythm
    yPos += wordsBoxHeight + 5;
    doc.setFillColor(249, 250, 251);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const rhythmRaw = sanitizePdfText(
      record.cues?.speakingRhythm ||
      (record.hasAudioTelemetry
        ? 'Steady, calm pacing with natural breathing intervals and warm tone.'
        : 'Even conversational pacing observed in reflections.')
    );
    const rhythmText = doc.splitTextToSize(rhythmRaw, 162);
    const rhythmBoxHeight = Math.max(22, 12 + rhythmText.length * 4.2);
    doc.roundedRect(18, yPos, 174, rhythmBoxHeight, 2, 2, 'FD');

    doc.setTextColor(37, 124, 111);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('2. Your Speaking Rhythm', 24, yPos + 7);

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(rhythmText, 24, yPos + 13.5);

    // Cue Box 3: Gentle Expressions
    yPos += rhythmBoxHeight + 5;
    doc.setFillColor(249, 250, 251);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const expressionsRaw = sanitizePdfText(
      record.cues?.gentleExpressions ||
      (record.hasFacialTelemetry
        ? 'Relaxed facial muscle tone and comfortable focus observed during responses.'
        : 'Self-guided reflection completed with relaxed focus.')
    );
    const expressionsText = doc.splitTextToSize(expressionsRaw, 162);
    const expressionsBoxHeight = Math.max(22, 12 + expressionsText.length * 4.2);
    doc.roundedRect(18, yPos, 174, expressionsBoxHeight, 2, 2, 'FD');

    doc.setTextColor(37, 124, 111);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('3. Gentle Expressions', 24, yPos + 7);

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(expressionsText, 24, yPos + 13.5);

    // -------------------------------------------------------------
    // 5. HELPFUL SUPPORT & CRISIS RESOURCES
    // -------------------------------------------------------------
    yPos += expressionsBoxHeight + 6;

    doc.setFillColor(254, 242, 242); // Warm red/rose tint #FEF2F2
    doc.setDrawColor(254, 202, 202); // #FECACA

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const crisisInfo = sanitizePdfText(
      'Free, confidential support is available 24/7 across the US and Canada. ' +
      'Call or text 988 to connect with the Suicide & Crisis Lifeline, or text HOME to 741741.'
    );
    const crisisLines = doc.splitTextToSize(crisisInfo, 162);
    const crisisBoxHeight = Math.max(22, 11 + crisisLines.length * 4.2);
    doc.roundedRect(18, yPos, 174, crisisBoxHeight, 2, 2, 'FD');

    doc.setTextColor(153, 27, 27); // Deep red
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Need Support or Someone to Talk To?', 24, yPos + 7);

    doc.setTextColor(80, 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(crisisLines, 24, yPos + 13.5);

    // -------------------------------------------------------------
    // 6. FOOTER & DISCLAIMER (Pin to bottom)
    // -------------------------------------------------------------
    doc.setDrawColor(229, 231, 235);
    doc.line(18, 272, 192, 272);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99); // Slate-600
    doc.text('This is a wellness check-in, not a medical diagnosis.', 105, 278, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175); // Slate-400
    doc.text(
      'MindVision AI | Generated locally on your device | Confidential personal reflection record',
      105,
      283,
      { align: 'center' }
    );

    // -------------------------------------------------------------
    // 7. VERIFICATION STEP IN CODE (Dev-mode verification)
    // -------------------------------------------------------------
    const blob = doc.output('blob');

    // Dev-mode console log of blob.size and blob.type
    console.log('[MindVision PDF Pipeline] Generated Blob Verification:', {
      size: blob?.size,
      type: blob?.type,
      filename: filename
    });

    if (!blob || !(blob instanceof Blob) || blob.size <= 0) {
      throw new Error(`PDF generation produced empty or invalid Blob (size: ${blob?.size || 0} bytes).`);
    }

    if (blob.type !== 'application/pdf') {
      throw new Error(`PDF generation produced incorrect MIME type: ${blob.type || 'undefined'}, expected application/pdf.`);
    }

    // Inspect arrayBuffer to confirm %PDF- binary header
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Header = new Uint8Array(arrayBuffer.slice(0, 5));
    const headerStr = String.fromCharCode(...uint8Header);
    if (!headerStr.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF binary header: expected %PDF-, got ${headerStr}`);
    }

    // -------------------------------------------------------------
    // 8. RELIABLE BROWSER DOWNLOAD VIA downloadPdfBlob
    // -------------------------------------------------------------
    if (options.save !== false && typeof window !== 'undefined') {
      downloadPdfBlob(blob, filename);
    }

    return {
      success: true,
      filename,
      blob,
      size: blob.size
    };
  } catch (error) {
    console.error('[MindVision PDF Generator] Failed to generate or download valid PDF:', error);
    throw error;
  }
}

/**
 * Generates a structured PDF containing a patient's complete recorded check-in history.
 * Only uses data already present in the supplied records (preserves privacy; no external calls).
 *
 * Features:
 * - Branded MindVision header and report title
 * - Generation date and total check-ins count
 * - Chronological oldest-first ordering
 * - Safe handling of missing/invalid fields labeled as "Not recorded"
 * - Multi-page text flow without footer collision
 * - Numbered page footers with required medical disclaimer
 * - Strict binary validation (%PDF- and MIME check)
 */
export async function generatePatientHistoryPdf(records = [], options = { save: true }) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('There are no check-in records to export.');
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const margin = 18;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - margin * 2;
    let y = 34;

    const safeText = (value) =>
      sanitizePdfText(value == null ? '' : String(value)) || 'Not recorded';

    const getRecordDate = (record) => {
      const rawDate = record?.dateIso || record?.timestamp;
      if (!rawDate) return 'Date not recorded';
      const parsed = new Date(rawDate);
      return Number.isNaN(parsed.getTime())
        ? safeText(rawDate)
        : parsed.toLocaleString();
    };

    const getReadableStatus = (level) => {
      if (!level) return 'Not recorded';
      switch (String(level).toUpperCase()) {
        case 'MINIMAL':
          return 'Calm & Steady (MINIMAL)';
        case 'MODERATE':
          return 'Mild Stress (MODERATE)';
        case 'ELEVATED':
          return 'Support Encouraged (ELEVATED)';
        case 'SEVERE':
          return 'Care Recommended (SEVERE)';
        default:
          return safeText(level);
      }
    };

    // Safe page advancement helper
    const ensureSpace = (requiredMm = 15) => {
      if (y + requiredMm > pageHeight - 20) {
        doc.addPage();
        y = 22;
        return true;
      }
      return false;
    };

    // Helper to print a labelled field with multi-page safety
    const printField = (label, rawValue, isSubHeader = false) => {
      const textVal = safeText(rawValue);
      const isMultiline = label === 'Summary' || label === 'Reflection' || label === 'System Explanation' || textVal.length > 70;

      ensureSpace(isMultiline ? 16 : 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isSubHeader ? 9.5 : 8.5);
      doc.setTextColor(31, 41, 55);

      const labelPrefix = `${label}: `;
      const labelW = doc.getTextWidth(labelPrefix);

      if (!isMultiline) {
        doc.text(labelPrefix, margin + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(textVal, margin + 4 + labelW, y);
        y += 5.2;
      } else {
        doc.text(labelPrefix, margin + 4, y);
        y += 4.2;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(textVal, contentWidth - 8);
        for (let i = 0; i < lines.length; i++) {
          ensureSpace(6);
          doc.text(lines[i], margin + 6, y);
          y += 4.2;
        }
        y += 1.5;
      }
    };

    // -------------------------------------------------------------
    // 1. BRAND HEADER (Sage Teal Banner)
    // -------------------------------------------------------------
    doc.setFillColor(23, 74, 58); // MindVision Forest Green #174A3A
    doc.rect(0, 0, pageWidth, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MINDVISION', margin, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Longitudinal Wellness & Telemetry Report', margin, 19.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL | PERSONAL WELLNESS HISTORY', pageWidth - margin, 16, { align: 'right' });

    // -------------------------------------------------------------
    // 2. REPORT TITLE & OBSERVATION METADATA
    // -------------------------------------------------------------
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Longitudinal Wellness Report', margin, y);

    y += 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);

    const chronologicalRecords = [...records].sort((a, b) => {
      const dateA = new Date(a?.dateIso || a?.timestamp).getTime();
      const dateB = new Date(b?.dateIso || b?.timestamp).getTime();
      return (Number.isFinite(dateA) ? dateA : 0) -
        (Number.isFinite(dateB) ? dateB : 0);
    });

    const earliestDate = getRecordDate(chronologicalRecords[0]);
    const latestDate = getRecordDate(chronologicalRecords[chronologicalRecords.length - 1]);
    const genDate = new Date().toLocaleString();

    doc.text(`Report generated: ${genDate}`, margin, y);
    doc.text(`Total recorded observations: ${records.length}`, pageWidth - margin, y, { align: 'right' });

    y += 5;
    doc.text(`Observation window: ${earliestDate}  to  ${latestDate}`, margin, y);

    y += 5;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    // -------------------------------------------------------------
    // 3. CLINICAL LIMITATION & TRANSPARENCY NOTICE (PROMINENT CALLOUT)
    // -------------------------------------------------------------
    doc.setFillColor(247, 246, 242); // Warm light #F7F6F2
    doc.setDrawColor(197, 139, 101); // Copper accent #C58B65
    doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

    doc.setTextColor(150, 75, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CLINICAL LIMITATION STATEMENT & TRANSPARENCY NOTICE', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 64, 67);
    const disclaimerText =
      'MindVision is an automated wellness telemetry tool and does not provide medical diagnoses, psychiatric evaluations, or clinical prescriptions. Numerical indicators and summaries represent algorithmic estimates derived from self-reported reflections and on-device sensor telemetry. If you are experiencing distress, reach out to a licensed physician, clinical psychologist, or the 24/7 988 Suicide & Crisis Lifeline.';
    const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth - 8);
    doc.text(disclaimerLines, margin + 4, y + 10.5);

    y += 28;

    // -------------------------------------------------------------
    // 4. LONGITUDINAL TREND SUMMARY (EXECUTIVE OVERVIEW)
    // -------------------------------------------------------------
    ensureSpace(42);

    doc.setFillColor(242, 248, 246); // Sage subtle #F2F8F6
    doc.setDrawColor(168, 189, 168); // Sage border #A8BDA8
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    doc.setTextColor(23, 74, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Longitudinal Trend Summary', margin + 4, y + 6);

    // Compute distribution counts
    let minimalCount = 0;
    let moderateCount = 0;
    let elevatedCount = 0;
    let severeCount = 0;
    const numericRisks = [];

    chronologicalRecords.forEach((r) => {
      const lvl = (r.riskLevel || '').toUpperCase();
      if (lvl === 'MINIMAL') minimalCount++;
      else if (lvl === 'MODERATE') moderateCount++;
      else if (lvl === 'ELEVATED') elevatedCount++;
      else if (lvl === 'SEVERE') severeCount++;

      if (typeof r.compositeRisk === 'number' && Number.isFinite(r.compositeRisk)) {
        numericRisks.push(r.compositeRisk);
      }
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);

    const summaryLine1 = `Pattern Breakdown: ${minimalCount} Calm & Steady  |  ${moderateCount} Mild Stress  |  ${elevatedCount} Support Encouraged  |  ${severeCount} Care Recommended`;
    doc.text(summaryLine1, margin + 4, y + 12);

    if (numericRisks.length > 0) {
      const baselineRisk = numericRisks[0].toFixed(2);
      const latestRisk = numericRisks[numericRisks.length - 1].toFixed(2);
      const avgRisk = (numericRisks.reduce((a, b) => a + b, 0) / numericRisks.length).toFixed(2);
      const summaryLine2 = `Composite Risk Indicator (0-10): Baseline: ${baselineRisk}  |  Latest: ${latestRisk}  |  Average: ${avgRisk} (${numericRisks.length} of ${records.length} observed)`;
      doc.text(summaryLine2, margin + 4, y + 17.5);
    } else {
      doc.text('Composite Risk Indicator: No numeric risk telemetry points recorded in this scope.', margin + 4, y + 17.5);
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    const trendCaution =
      'Trend Interpretation Note: Natural fluctuations across check-ins reflect normal variations in daily routine and energy. Changes in indicators reflect self-reported statements and algorithmic estimates, not verified clinical improvement or diagnosis.';
    const cautionLines = doc.splitTextToSize(trendCaution, contentWidth - 8);
    doc.text(cautionLines, margin + 4, y + 24.5);

    y += 44;

    // -------------------------------------------------------------
    // 5. CHRONOLOGICAL DETAILED SESSIONS (FACTS VS INTERPRETATIONS)
    // -------------------------------------------------------------
    chronologicalRecords.forEach((record, index) => {
      ensureSpace(36);

      // Session Header Pill
      doc.setDrawColor(168, 189, 168);
      doc.setFillColor(23, 74, 58);
      doc.roundedRect(margin, y - 4, contentWidth, 8, 2, 2, 'FD');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`Check-in #${index + 1} of ${chronologicalRecords.length}  --  ${getRecordDate(record)}`, margin + 4, y + 1.6);

      const recStatus = record?.riskLevel;
      if (recStatus) {
        doc.setFontSize(8);
        doc.text(
          recStatus === 'MINIMAL' ? 'Calm' : recStatus === 'MODERATE' ? 'Mild Stress' : 'Elevated',
          pageWidth - margin - 4,
          y + 1.6,
          { align: 'right' }
        );
      }

      y += 9;

      // --- SECTION A: RECORDED FACTS & PATIENT INPUT ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(23, 74, 58);
      doc.text('[A] RECORDED FACTS & PATIENT INPUT', margin + 2, y);
      y += 4.5;

      printField('Session Timestamp', getRecordDate(record));

      const reflection = record?.text
        ? record.text.replace(/\(High somatic.*?\)/g, '').trim()
        : (record?.cues?.words || null);
      if (reflection) {
        printField('Self-Reported Words', `"${reflection}"`);
      }

      const activeSensors = [];
      if (record?.hasFacialTelemetry || record?.au4 != null) activeSensors.push('Facial Video');
      if (record?.hasAudioTelemetry || record?.prosody != null) activeSensors.push('Audio Vocal');
      activeSensors.push('Self-Reported Text');
      printField('Recorded Input Modalities', activeSensors.join(', '));

      y += 2;

      // --- SECTION B: ALGORITHMIC ESTIMATES & INFERRED MARKERS ---
      ensureSpace(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(197, 139, 101); // Copper
      doc.text('[B] ALGORITHMIC ESTIMATES & INFERRED TELEMETRY', margin + 2, y);
      y += 4.5;

      const risk = record?.compositeRisk;
      printField(
        'Composite Risk Indicator',
        typeof risk === 'number' && Number.isFinite(risk)
          ? `${risk.toFixed(2)} / 10.00  (Multimodal telemetry estimate, not a diagnostic mood score)`
          : 'Not recorded'
      );

      printField('Algorithmic Classification', getReadableStatus(record?.riskLevel));

      if (record?.summary || record?.explanation) {
        printField('System Summary', record?.summary || record?.explanation);
      }

      if (record?.cues?.speakingRhythm) {
        printField('Speaking Rhythm Cue', record.cues.speakingRhythm);
      }
      if (record?.cues?.gentleExpressions) {
        printField('Facial Expression Cue', record.cues.gentleExpressions);
      }

      y += 2.5;
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5.5;
    });

    // -------------------------------------------------------------
    // 6. PAGE FOOTERS & DISCLAIMER ON EVERY PAGE
    // -------------------------------------------------------------
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(
        'MindVision Longitudinal Report | Confidential Personal Record | Not a medical diagnosis',
        margin,
        pageHeight - 9
      );
      doc.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 9,
        { align: 'right' }
      );
    }

    // -------------------------------------------------------------
    // 7. BLOB & BINARY VALIDATION
    // -------------------------------------------------------------
    const blob = doc.output('blob');
    if (!blob || !(blob instanceof Blob) || blob.size <= 0) {
      throw new Error(`History PDF generation produced empty or invalid Blob (size: ${blob?.size || 0} bytes).`);
    }

    if (blob.type !== 'application/pdf') {
      throw new Error(`History PDF generation produced incorrect MIME type: ${blob.type || 'undefined'}, expected application/pdf.`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Header = new Uint8Array(arrayBuffer.slice(0, 5));
    const headerStr = String.fromCharCode(...uint8Header);
    if (!headerStr.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF binary header in history export: expected %PDF-, got ${headerStr}`);
    }

    // -------------------------------------------------------------
    // 8. FILENAME & DOWNLOAD TRIGGER
    // -------------------------------------------------------------
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');
    const filename = `MindVision_Patient_History_${date}.pdf`;

    if (options.save !== false && typeof window !== 'undefined') {
      downloadPdfBlob(blob, filename);
    }

    return {
      success: true,
      filename,
      blob,
      size: blob.size
    };
  } catch (error) {
    console.error('[MindVision PDF Generator] Failed to generate patient history PDF:', error);
    throw error;
  }
}

/**
 * Generates an official clinical PDF report for a standardized psychometric assessment
 * (PHQ-9, GAD-7, DASS-21, ISI) using MindVision's primary clinical palette.
 */
export async function generateStandardizedAssessmentPdf(assessment, options = {}) {
  try {
    if (!assessment) {
      throw new Error('generateStandardizedAssessmentPdf requires a valid assessment object.');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 22;

    // Primary Colors (MindVision Forest / Sage / Terracotta)
    const colorPrimary = [23, 74, 58];     // #174A3A
    const _colorSecondary = [168, 189, 168]; // #A8BDA8
    const colorAccent = [197, 139, 101];   // #C58B65
    const colorText = [36, 42, 39];         // #242A27
    const colorMuted = [108, 122, 116];     // #6C7A74
    const colorBgSubtle = [247, 246, 242];  // #F7F6F2

    // -------------------------------------------------------------
    // 1. HEADER & BRANDING
    // -------------------------------------------------------------
    doc.setFillColor(...colorPrimary);
    doc.rect(margin, y, contentWidth, 2, 'F');
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colorPrimary);
    doc.text('MINDVISION ASSESSMENT CENTRE', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colorMuted);
    const dateFormatted = sanitizePdfText(assessment.timestamp || new Date().toLocaleString());
    doc.text(`Completed: ${dateFormatted}`, pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...colorMuted);
    doc.text('Standardized Psychometric Screening & Decision Support Report', margin, y);
    doc.text(`Record ID: ${sanitizePdfText(assessment.id || 'N/A')}`, pageWidth - margin, y, { align: 'right' });
    y += 9;

    // -------------------------------------------------------------
    // 2. INSTRUMENT SPECIFICATION CARD
    // -------------------------------------------------------------
    doc.setFillColor(...colorBgSubtle);
    doc.setDrawColor(226, 230, 226);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colorPrimary);
    doc.text(sanitizePdfText(assessment.instrumentTitle || 'Clinical Screener'), margin + 5, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colorText);
    doc.text(`Clinical Standard: ${sanitizePdfText(assessment.clinicalStandard || 'APA Standard')}`, margin + 5, y + 13);
    doc.text(`Category: ${sanitizePdfText(assessment.category || 'Clinical Battery')}`, margin + 5, y + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...colorAccent);
    doc.text(`Score: ${assessment.totalScore || 0} / ${assessment.maxScore || 0}`, pageWidth - margin - 5, y + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colorMuted);
    doc.text(`Severity: ${sanitizePdfText(assessment.tier || 'MINIMAL')}`, pageWidth - margin - 5, y + 16, { align: 'right' });
    y += 28;

    // -------------------------------------------------------------
    // 3. CLINICAL INTERPRETATION & ACTION
    // -------------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorPrimary);
    doc.text('Clinical Interpretation', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...colorText);
    const interpText = sanitizePdfText(assessment.description || 'Assessment completed successfully.');
    const interpLines = doc.splitTextToSize(interpText, contentWidth);
    doc.text(interpLines, margin, y);
    y += (interpLines.length * 4.5) + 4;

    if (assessment.clinicalAction) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...colorPrimary);
      doc.text('Recommended Next Steps: ', margin, y);
      const actionWidth = doc.getTextWidth('Recommended Next Steps: ');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colorText);
      const actionLines = doc.splitTextToSize(sanitizePdfText(assessment.clinicalAction), contentWidth - actionWidth);
      doc.text(actionLines, margin + actionWidth, y);
      y += (actionLines.length * 4.5) + 6;
    }

    // -------------------------------------------------------------
    // 4. ITEMIZED QUESTION BREAKDOWN TABLE
    // -------------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorPrimary);
    doc.text('Itemized Response Breakdown', margin, y);
    y += 5;

    // Table Header
    doc.setFillColor(...colorPrimary);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('#', margin + 3, y + 5);
    doc.text('Question & Domain', margin + 12, y + 5);
    doc.text('Patient Response', pageWidth - margin - 35, y + 5);
    doc.text('Pts', pageWidth - margin - 8, y + 5);
    y += 7;

    const items = assessment.itemBreakdown || [];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    items.forEach((item, idx) => {
      // Check page overflow
      if (y > 265) {
        doc.addPage();
        y = 22;
      }

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(250, 250, 249);
        doc.rect(margin, y, contentWidth, 7.5, 'F');
      }

      doc.setTextColor(...colorText);
      doc.text(String(item.index || idx + 1), margin + 3, y + 5);

      const promptSnippet = sanitizePdfText(item.prompt || '').substring(0, 58);
      doc.text(promptSnippet, margin + 12, y + 5);

      doc.setTextColor(...colorMuted);
      doc.text(sanitizePdfText(item.selectedLabel || ''), pageWidth - margin - 35, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colorPrimary);
      doc.text(String(item.scoreValue || 0), pageWidth - margin - 6, y + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 7.5;
    });

    y += 6;

    // -------------------------------------------------------------
    // 5. REGULATORY DISCLAIMER & SAFETY NOTICE
    // -------------------------------------------------------------
    if (y > 250) {
      doc.addPage();
      y = 22;
    }

    doc.setFillColor(...colorBgSubtle);
    doc.setDrawColor(...colorAccent);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colorAccent);
    doc.text('NON-DIAGNOSTIC NOTICE & 24/7 SUPPORT', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorText);
    const disclaimer = 'MindVision is an evidence-based self-awareness and decision support instrument, NOT a medical or psychiatric diagnostic tool. If you or someone you know is in crisis, call or text 988 (USA/Canada) or contact your local emergency department.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 8);
    doc.text(disclaimerLines, margin + 4, y + 10);

    y += 24;

    // -------------------------------------------------------------
    // 6. OUTPUT VALIDATION & DOWNLOAD
    // -------------------------------------------------------------
    const blob = doc.output('blob');
    if (!blob || !(blob instanceof Blob) || blob.size <= 0) {
      throw new Error(`Standardized assessment PDF generation produced invalid Blob.`);
    }

    const safeTitle = (assessment.shortTitle || 'Assessment').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `MindVision_${safeTitle}_${dateFormatted.split(',')[0].replace(/\//g, '-')}.pdf`;

    if (options.save !== false && typeof window !== 'undefined') {
      downloadPdfBlob(blob, filename);
    }

    return {
      success: true,
      filename,
      blob,
      size: blob.size
    };
  } catch (err) {
    console.error('[MindVision PDF Generator] Failed to generate assessment PDF:', err);
    throw err;
  }
}
