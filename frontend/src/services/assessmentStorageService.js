/**
 * MindVision Clinical AI - Assessment Storage Service
 *
 * Manages local persistence, historical retrieval, and cross-sync
 * for standardized clinical assessments (PHQ-9, GAD-7, DASS-21, ISI).
 */

const STORAGE_KEY_ASSESSMENTS = 'mindvision_standardized_assessments_v1';
const STORAGE_KEY_PATIENT_RECORDS = 'mindvision_patient_records';

// Initial pre-populated clinical assessment records for realistic trend tracking
const SEED_ASSESSMENT_RECORDS = [
  {
    id: 'asmt_phq9_01',
    instrumentId: 'phq-9',
    instrumentTitle: 'Patient Health Questionnaire (PHQ-9)',
    shortTitle: 'Depression Screener (PHQ-9)',
    category: 'Mood & Depression',
    clinicalStandard: 'DSM-5 Validated Instrument',
    totalScore: 11,
    maxScore: 27,
    percentage: 41,
    tier: 'MODERATE',
    severityLabel: 'Moderate Depression Symptoms',
    description: 'Noticeable depressive symptoms reported affecting energy and concentration.',
    clinicalAction: 'Clinical consultation recommended within 1 to 2 weeks.',
    badgeColor: 'elevated',
    isCrisisFlagged: false,
    dateIso: '2026-09-15T18:30:00.000Z',
    timestamp: '9/15/2026, 6:30:00 PM',
    itemBreakdown: [
      { questionId: 'phq9_q1', index: 1, prompt: 'Little interest or pleasure in doing things you usually enjoy', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'phq9_q2', index: 2, prompt: 'Feeling down, depressed, or hopeless', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'phq9_q3', index: 3, prompt: 'Trouble falling or staying asleep, or sleeping too much', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'phq9_q4', index: 4, prompt: 'Feeling tired or having little to no energy', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'phq9_q5', index: 5, prompt: 'Poor appetite or overeating', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q6', index: 6, prompt: 'Feeling bad about yourself or that you are a failure', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q7', index: 7, prompt: 'Trouble concentrating on things', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q8', index: 8, prompt: 'Moving or speaking noticeably slower or restlessness', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q9', index: 9, prompt: 'Thoughts of being better off dead or hurting yourself', scoreValue: 0, selectedLabel: 'Not at all' }
    ]
  },
  {
    id: 'asmt_phq9_02',
    instrumentId: 'phq-9',
    instrumentTitle: 'Patient Health Questionnaire (PHQ-9)',
    shortTitle: 'Depression Screener (PHQ-9)',
    category: 'Mood & Depression',
    clinicalStandard: 'DSM-5 Validated Instrument',
    totalScore: 7,
    maxScore: 27,
    percentage: 26,
    tier: 'MILD',
    severityLabel: 'Mild Depression Symptoms',
    description: 'Subtle improvement observed across sleep and energy reserves.',
    clinicalAction: 'Continue supportive lifestyle practices and scheduled check-ins.',
    badgeColor: 'mild',
    isCrisisFlagged: false,
    dateIso: '2026-10-02T14:15:00.000Z',
    timestamp: '10/2/2026, 2:15:00 PM',
    itemBreakdown: [
      { questionId: 'phq9_q1', index: 1, prompt: 'Little interest or pleasure in doing things you usually enjoy', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q2', index: 2, prompt: 'Feeling down, depressed, or hopeless', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q3', index: 3, prompt: 'Trouble falling or staying asleep, or sleeping too much', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'phq9_q4', index: 4, prompt: 'Feeling tired or having little to no energy', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q5', index: 5, prompt: 'Poor appetite or overeating', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q6', index: 6, prompt: 'Feeling bad about yourself or that you are a failure', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q7', index: 7, prompt: 'Trouble concentrating on things', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q8', index: 8, prompt: 'Moving or speaking noticeably slower or restlessness', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q9', index: 9, prompt: 'Thoughts of being better off dead or hurting yourself', scoreValue: 0, selectedLabel: 'Not at all' }
    ]
  },
  {
    id: 'asmt_phq9_03',
    instrumentId: 'phq-9',
    instrumentTitle: 'Patient Health Questionnaire (PHQ-9)',
    shortTitle: 'Depression Screener (PHQ-9)',
    category: 'Mood & Depression',
    clinicalStandard: 'DSM-5 Validated Instrument',
    totalScore: 3,
    maxScore: 27,
    percentage: 11,
    tier: 'MINIMAL',
    severityLabel: 'None to Minimal Depression Symptoms',
    description: 'Responses indicate emotional balance and stable recovery.',
    clinicalAction: 'Routine outpatient surveillance. Continue daily self-care.',
    badgeColor: 'minimal',
    isCrisisFlagged: false,
    dateIso: '2026-10-21T09:40:00.000Z',
    timestamp: '10/21/2026, 9:40:00 AM',
    itemBreakdown: [
      { questionId: 'phq9_q1', index: 1, prompt: 'Little interest or pleasure in doing things you usually enjoy', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q2', index: 2, prompt: 'Feeling down, depressed, or hopeless', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q3', index: 3, prompt: 'Trouble falling or staying asleep, or sleeping too much', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q4', index: 4, prompt: 'Feeling tired or having little to no energy', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q5', index: 5, prompt: 'Poor appetite or overeating', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q6', index: 6, prompt: 'Feeling bad about yourself or that you are a failure', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q7', index: 7, prompt: 'Trouble concentrating on things', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'phq9_q8', index: 8, prompt: 'Moving or speaking noticeably slower or restlessness', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'phq9_q9', index: 9, prompt: 'Thoughts of being better off dead or hurting yourself', scoreValue: 0, selectedLabel: 'Not at all' }
    ]
  },
  {
    id: 'asmt_gad7_01',
    instrumentId: 'gad-7',
    instrumentTitle: 'Generalized Anxiety Disorder Screener (GAD-7)',
    shortTitle: 'Anxiety Screener (GAD-7)',
    category: 'Anxiety & Stress',
    clinicalStandard: 'APA & DSM-5 Validated Instrument',
    totalScore: 9,
    maxScore: 21,
    percentage: 43,
    tier: 'MILD',
    severityLabel: 'Mild Anxiety Symptoms',
    description: 'Elevated somatic tension and situational nervousness noted.',
    clinicalAction: 'Paced breathing and structured stress management.',
    badgeColor: 'mild',
    isCrisisFlagged: false,
    dateIso: '2026-09-28T16:00:00.000Z',
    timestamp: '9/28/2026, 4:00:00 PM',
    itemBreakdown: [
      { questionId: 'gad7_q1', index: 1, prompt: 'Feeling nervous, anxious, or on edge', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'gad7_q2', index: 2, prompt: 'Not being able to stop or control worrying', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q3', index: 3, prompt: 'Worrying too much about different things', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'gad7_q4', index: 4, prompt: 'Trouble relaxing or settling your mind', scoreValue: 2, selectedLabel: 'More than half the days' },
      { questionId: 'gad7_q5', index: 5, prompt: 'Being so restless that it is hard to sit still', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'gad7_q6', index: 6, prompt: 'Becoming easily annoyed or irritable', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q7', index: 7, prompt: 'Feeling afraid as if something awful might happen', scoreValue: 1, selectedLabel: 'Several days' }
    ]
  },
  {
    id: 'asmt_gad7_02',
    instrumentId: 'gad-7',
    instrumentTitle: 'Generalized Anxiety Disorder Screener (GAD-7)',
    shortTitle: 'Anxiety Screener (GAD-7)',
    category: 'Anxiety & Stress',
    clinicalStandard: 'APA & DSM-5 Validated Instrument',
    totalScore: 4,
    maxScore: 21,
    percentage: 19,
    tier: 'MINIMAL',
    severityLabel: 'Minimal Anxiety',
    description: 'Worry and nervousness have stabilized within normal bounds.',
    clinicalAction: 'Routine lifestyle balance.',
    badgeColor: 'minimal',
    isCrisisFlagged: false,
    dateIso: '2026-10-18T11:20:00.000Z',
    timestamp: '10/18/2026, 11:20:00 AM',
    itemBreakdown: [
      { questionId: 'gad7_q1', index: 1, prompt: 'Feeling nervous, anxious, or on edge', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q2', index: 2, prompt: 'Not being able to stop or control worrying', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q3', index: 3, prompt: 'Worrying too much about different things', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q4', index: 4, prompt: 'Trouble relaxing or settling your mind', scoreValue: 1, selectedLabel: 'Several days' },
      { questionId: 'gad7_q5', index: 5, prompt: 'Being so restless that it is hard to sit still', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'gad7_q6', index: 6, prompt: 'Becoming easily annoyed or irritable', scoreValue: 0, selectedLabel: 'Not at all' },
      { questionId: 'gad7_q7', index: 7, prompt: 'Feeling afraid as if something awful might happen', scoreValue: 0, selectedLabel: 'Not at all' }
    ]
  }
];

export const AssessmentStorageService = {
  /**
   * Retrieves all completed standardized assessment records
   */
  getAssessmentRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ASSESSMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[MindVision] Failed to read assessment records from localStorage:', err);
    }
    // Return seed records and initialize localStorage
    try {
      localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(SEED_ASSESSMENT_RECORDS));
    } catch {
      // ignore
    }
    return SEED_ASSESSMENT_RECORDS;
  },

  /**
   * Retrieves assessment records filtered by instrument ID
   */
  getRecordsByInstrument(instrumentId) {
    const all = this.getAssessmentRecords();
    return all.filter((r) => r.instrumentId === instrumentId);
  },

  /**
   * Saves a newly completed assessment result and synchronizes with patient history
   */
  saveAssessmentResult(result) {
    const records = this.getAssessmentRecords();
    const newRecord = {
      id: `asmt_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      dateIso: new Date().toISOString(),
      ...result
    };

    const updated = [newRecord, ...records];
    try {
      localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(updated));
    } catch (err) {
      console.warn('[MindVision] Failed to persist assessment record:', err);
    }

    if (typeof window !== 'undefined' && window.desktopAPI?.assessments?.saveRecord) {
      window.desktopAPI.assessments.saveRecord(newRecord).catch(() => {});
    }

    // Sync with general patient history so clinician or user sees it in check-ins
    try {
      const rawPatient = localStorage.getItem(STORAGE_KEY_PATIENT_RECORDS);
      const existingPatient = rawPatient ? JSON.parse(rawPatient) : [];
      if (Array.isArray(existingPatient)) {
        const synchedPatientRecord = {
          id: newRecord.id,
          timestamp: newRecord.timestamp,
          dateIso: newRecord.dateIso,
          riskLevel: newRecord.tier === 'MINIMAL' ? 'MINIMAL' : (newRecord.tier === 'SEVERE' ? 'SEVERE' : 'ELEVATED'),
          compositeRisk: parseFloat(((newRecord.totalScore / newRecord.maxScore) * 10).toFixed(1)),
          summary: `${newRecord.shortTitle}: ${newRecord.severityLabel} (${newRecord.totalScore}/${newRecord.maxScore})`,
          explanation: newRecord.description,
          text: `Patient completed standardized ${newRecord.instrumentTitle}. Result: ${newRecord.totalScore}/${newRecord.maxScore} (${newRecord.severityLabel}). Action: ${newRecord.clinicalAction}`,
          assessmentType: newRecord.instrumentId,
          isStandardizedAssessment: true,
          cues: {
            words: `Self-reported responses across ${newRecord.itemBreakdown?.length || 0} clinical inventory items.`,
            speakingRhythm: 'Structured self-report inventory.',
            gentleExpressions: 'Standardized psychometric questionnaire response.'
          }
        };
        const updatedPatient = [synchedPatientRecord, ...existingPatient];
        localStorage.setItem(STORAGE_KEY_PATIENT_RECORDS, JSON.stringify(updatedPatient));
      }
    } catch (syncErr) {
      console.warn('[MindVision] Failed to cross-sync assessment with patient records:', syncErr);
    }

    return newRecord;
  },

  /**
   * Deletes an assessment record by ID
   */
  deleteAssessmentRecord(id) {
    const records = this.getAssessmentRecords();
    const filtered = records.filter((r) => r.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(filtered));
    } catch (err) {
      console.warn('[MindVision] Failed to delete assessment record:', err);
    }
    if (typeof window !== 'undefined' && window.desktopAPI?.assessments?.deleteRecord) {
      window.desktopAPI.assessments.deleteRecord(id).catch(() => {});
    }
    return filtered;
  }
};
