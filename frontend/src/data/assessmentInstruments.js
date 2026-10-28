/**
 * MindVision Clinical AI - Standardized Psychometric Assessment Instruments
 *
 * Defines gold-standard clinical psychometric inventories:
 * - PHQ-9 (Patient Health Questionnaire - 9, Depression)
 * - GAD-7 (Generalized Anxiety Disorder - 7, Anxiety)
 * - DASS-21 (Depression, Anxiety & Stress Scale - Stress & Burnout Subscale)
 * - ISI (Insomnia Severity Index - Sleep Quality & Fatigue)
 * - MULTIMODAL_CHECKIN (MindVision Real-Time Multimodal Telemetry AI)
 *
 * All clinical thresholds adhere to APA and DSM-5 standardized cut-offs.
 * MindVision instruments provide decision support and self-awareness only;
 * they are NOT diagnostic tools.
 */

export const LIKERT_4_POINT = [
  { value: 0, label: 'Not at all', description: '0 days in the last two weeks' },
  { value: 1, label: 'Several days', description: '1 to 6 days' },
  { value: 2, label: 'More than half the days', description: '7 to 11 days' },
  { value: 3, label: 'Nearly every day', description: '12 to 14 days' }
];

export const DASS_4_POINT = [
  { value: 0, label: 'Did not apply to me', description: 'Never or rarely' },
  { value: 1, label: 'Applied to me somewhat', description: 'Sometimes or to some degree' },
  { value: 2, label: 'Applied to me considerably', description: 'A good part of the time' },
  { value: 3, label: 'Applied to me very much', description: 'Most or all of the time' }
];

export const ISI_5_POINT_SEVERITY = [
  { value: 0, label: 'None', description: 'No difficulty observed' },
  { value: 1, label: 'Mild', description: 'Minor occasional difficulty' },
  { value: 2, label: 'Moderate', description: 'Noticeable difficulty' },
  { value: 3, label: 'Severe', description: 'Significant persistent difficulty' },
  { value: 4, label: 'Very Severe', description: 'Extreme or debilitating difficulty' }
];

export const ASSESSMENT_INSTRUMENTS = [
  // =========================================================================
  // 1. PHQ-9: DEPRESSION SEVERITY SCREENER
  // =========================================================================
  {
    id: 'phq-9',
    title: 'Patient Health Questionnaire (PHQ-9)',
    shortTitle: 'Depression Screener (PHQ-9)',
    category: 'Mood & Depression',
    categoryKey: 'mood',
    clinicalStandard: 'DSM-5 Validated Instrument',
    citation: 'Kroenke, Spitzer, & Williams, J Gen Intern Med 2001',
    timeEstimate: '3–4 mins',
    questionCount: 9,
    maxScore: 27,
    accentColor: '#174A3A',
    description: 'The gold-standard 9-item clinical screener evaluating the presence, frequency, and severity of depressive symptoms over the past two weeks.',
    purpose: 'Assesses core affective, cognitive, and somatic markers of depression—including anhedonia, dysphoria, fatigue, sleep disruption, and guilt.',
    whoIsItFor: 'Recommended for anyone noticing lingering low energy, emotional heaviness, loss of interest in hobbies, or feeling overwhelmed by daily tasks.',
    instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    options: LIKERT_4_POINT,
    questions: [
      {
        id: 'phq9_q1',
        index: 1,
        prompt: 'Little interest or pleasure in doing things you usually enjoy',
        domain: 'Anhedonia / Loss of Interest',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q2',
        index: 2,
        prompt: 'Feeling down, depressed, or hopeless',
        domain: 'Depressed Mood / Dysphoria',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q3',
        index: 3,
        prompt: 'Trouble falling or staying asleep, or sleeping too much',
        domain: 'Sleep Disturbance',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q4',
        index: 4,
        prompt: 'Feeling tired or having little to no energy',
        domain: 'Somatic Energy / Fatigue',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q5',
        index: 5,
        prompt: 'Poor appetite or overeating',
        domain: 'Appetite & Weight Alterations',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q6',
        index: 6,
        prompt: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
        domain: 'Self-Worth & Cognitive Guilt',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q7',
        index: 7,
        prompt: 'Trouble concentrating on things, such as reading the news or watching television',
        domain: 'Cognitive Focus & Executive Processing',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q8',
        index: 8,
        prompt: 'Moving or speaking so slowly that other people have noticed, or the opposite — being so fidgety or restless that you have been moving around more than usual',
        domain: 'Psychomotor Agitation or Retardation',
        isCrisisSensitive: false
      },
      {
        id: 'phq9_q9',
        index: 9,
        prompt: 'Thoughts that you would be better off dead, or of hurting yourself in some way',
        domain: 'Safety & Self-Harm Ideation',
        isCrisisSensitive: true
      }
    ],
    scoringBands: [
      {
        min: 0,
        max: 4,
        tier: 'MINIMAL',
        label: 'None to Minimal Depression Symptoms',
        description: 'Your responses indicate little to no clinical symptoms of depression. Your emotional balance appears stable and well-supported.',
        clinicalAction: 'Routine wellness maintenance. Continue healthy sleep, social engagement, and mindfulness habits.',
        badgeColor: 'minimal'
      },
      {
        min: 5,
        max: 9,
        tier: 'MILD',
        label: 'Mild Depression Symptoms',
        description: 'You are experiencing subtle depressive symptoms that may periodically weigh on your focus, motivation, or energy.',
        clinicalAction: 'Watchful waiting and active lifestyle support. Practice guided breathing, journaling, and consider discussing with a wellness mentor.',
        badgeColor: 'mild'
      },
      {
        min: 10,
        max: 14,
        tier: 'MODERATE',
        label: 'Moderate Depression Symptoms',
        description: 'Your responses indicate noticeable, persistent depressive symptoms that likely interfere with daily productivity or relationships.',
        clinicalAction: 'Clinical consultation recommended within 1 to 2 weeks. Structured CBT or teletherapy sessions can provide substantial relief.',
        badgeColor: 'elevated'
      },
      {
        min: 15,
        max: 19,
        tier: 'SEVERE',
        label: 'Moderately Severe Depression Symptoms',
        description: 'Significant depressive burden observed. Routine tasks and self-care may feel heavy, exhausting, or difficult to initiate.',
        clinicalAction: 'Prompt evaluation by a licensed mental health professional. Explore evidence-based psychotherapy and medical consultation.',
        badgeColor: 'severe'
      },
      {
        min: 20,
        max: 27,
        tier: 'SEVERE',
        label: 'Severe Depression Symptoms',
        description: 'Severe depressive symptom profile. Urgent clinical support is strongly advised to safeguard your health and well-being.',
        clinicalAction: 'Immediate psychiatric or psychological intake. Create a supportive safety plan with loved ones and healthcare providers.',
        badgeColor: 'severe'
      }
    ]
  },

  // =========================================================================
  // 2. GAD-7: GENERALIZED ANXIETY DISORDER SCREENER
  // =========================================================================
  {
    id: 'gad-7',
    title: 'Generalized Anxiety Disorder Screener (GAD-7)',
    shortTitle: 'Anxiety Screener (GAD-7)',
    category: 'Anxiety & Stress',
    categoryKey: 'anxiety',
    clinicalStandard: 'APA & DSM-5 Validated Instrument',
    citation: 'Spitzer, Kroenke, Williams, & Löwe, Arch Intern Med 2006',
    timeEstimate: '2–3 mins',
    questionCount: 7,
    maxScore: 21,
    accentColor: '#174A3A',
    description: 'A 7-item standardized screener measuring excessive worry, nervous tension, autonomic restlessness, and irritability over the past two weeks.',
    purpose: 'Identifies generalized anxiety, situational panic tendencies, and somatic hyperarousal to assist in early clinical intervention.',
    whoIsItFor: 'Ideal for individuals experiencing racing thoughts, difficulty unwinding, physical muscle tension, or sudden bouts of nervousness.',
    instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    options: LIKERT_4_POINT,
    questions: [
      {
        id: 'gad7_q1',
        index: 1,
        prompt: 'Feeling nervous, anxious, or on edge',
        domain: 'Autonomic Nervous Arousal',
        isCrisisSensitive: false
      },
      {
        id: 'gad7_q2',
        index: 2,
        prompt: 'Not being able to stop or control worrying',
        domain: 'Uncontrollable Rumination',
        isCrisisSensitive: false
      },
      {
        id: 'gad7_q3',
        index: 3,
        prompt: 'Worrying too much about different things',
        domain: 'Generalized Worry Overdrive',
        isCrisisSensitive: false
      },
      {
        id: 'gad7_q4',
        index: 4,
        prompt: 'Trouble relaxing or settling your mind',
        domain: 'Inability to Decompress',
        isCrisisSensitive: false
      },
      {
        id: 'gad7_q5',
        index: 5,
        prompt: 'Being so restless that it is hard to sit still',
        domain: 'Psychomotor Restlessness',
        isCrisisSensitive: false
      },
      {
        id: 'gad7_q6',
        index: 6,
        prompt: 'Becoming easily annoyed or irritable',
        domain: 'Emotional Reactivity / Irritability',
        isCrisisSensitive: false
      },
      {
        id: 'gad7_q7',
        index: 7,
        prompt: 'Feeling afraid, as if something awful might happen',
        domain: 'Catastrophic Anticipatory Dread',
        isCrisisSensitive: false
      }
    ],
    scoringBands: [
      {
        min: 0,
        max: 4,
        tier: 'MINIMAL',
        label: 'Minimal Anxiety',
        description: 'Your anxiety level is within the healthy, manageable range. Situational stressors appear manageable without overwhelming your nervous system.',
        clinicalAction: 'Continue healthy boundaries, regular physical movement, and mindfulness.',
        badgeColor: 'minimal'
      },
      {
        min: 5,
        max: 9,
        tier: 'MILD',
        label: 'Mild Anxiety Symptoms',
        description: 'Occasional worry or tension detected. You may feel periodically on edge during demanding work days or social transitions.',
        clinicalAction: 'Try structured stress reduction: 4-7-8 breathing exercises, reduced caffeine intake, and evening wind-down rituals.',
        badgeColor: 'mild'
      },
      {
        min: 10,
        max: 14,
        tier: 'MODERATE',
        label: 'Moderate Anxiety Symptoms',
        description: 'Your anxiety is significantly elevated and frequently intrudes upon daily concentration, sleep, or peace of mind.',
        clinicalAction: 'Clinical assessment with an anxiety specialist recommended. Cognitive-behavioral strategies (CBT) are highly effective.',
        badgeColor: 'elevated'
      },
      {
        min: 15,
        max: 21,
        tier: 'SEVERE',
        label: 'Severe Anxiety Symptoms',
        description: 'Intense and persistent anxiety that likely causes substantial distress, physical fatigue, or panic-like somatic sensations.',
        clinicalAction: 'Consultation with a licensed psychiatrist or psychologist recommended for diagnostic evaluation and comprehensive support.',
        badgeColor: 'severe'
      }
    ]
  },

  // =========================================================================
  // 3. DASS-21: STRESS & BURNOUT SCREENER
  // =========================================================================
  {
    id: 'dass-stress',
    title: 'Stress & Professional Burnout Inventory (DASS-21 Subscale)',
    shortTitle: 'Burnout & Stress (DASS)',
    category: 'Anxiety & Stress',
    categoryKey: 'stress',
    clinicalStandard: 'UNSW Psychometric Battery',
    citation: 'Lovibond & Lovibond, Behav Res Ther 1995',
    timeEstimate: '2–3 mins',
    questionCount: 7,
    maxScore: 21,
    accentColor: '#C58B65',
    description: 'Measures non-specific chronic arousal, tension, difficulty relaxing, and irritability associated with prolonged work and life demands.',
    purpose: 'Distinguishes acute situational exhaustion from generalized clinical mood disorders, identifying early warning signs of workplace burnout.',
    whoIsItFor: 'Recommended for corporate professionals, caregivers, healthcare workers, or students facing prolonged high-pressure deadlines.',
    instructions: 'Please read each statement and select how much the statement applied to you over the past week.',
    options: DASS_4_POINT,
    questions: [
      {
        id: 'dass_q1',
        index: 1,
        prompt: 'I found it hard to wind down and disconnect at the end of the day',
        domain: 'Autonomic De-escalation Difficulty',
        isCrisisSensitive: false
      },
      {
        id: 'dass_q2',
        index: 2,
        prompt: 'I tended to over-react to situations or small inconveniences',
        domain: 'Emotional Over-Reactivity',
        isCrisisSensitive: false
      },
      {
        id: 'dass_q3',
        index: 3,
        prompt: 'I felt that I was using up a lot of nervous energy just getting through tasks',
        domain: 'Depletion of Energy Reserves',
        isCrisisSensitive: false
      },
      {
        id: 'dass_q4',
        index: 4,
        prompt: 'I found myself getting agitated, impatient, or flustered easily',
        domain: 'Agitation & Low Tolerance Threshold',
        isCrisisSensitive: false
      },
      {
        id: 'dass_q5',
        index: 5,
        prompt: 'I found it difficult to relax even when I had free time',
        domain: 'Chronic Muscle & Mental Tension',
        isCrisisSensitive: false
      },
      {
        id: 'dass_q6',
        index: 6,
        prompt: 'I was intolerant of anything that interrupted or kept me from getting on with what I was doing',
        domain: 'Impatience & Frustration Intolerance',
        isCrisisSensitive: false
      },
      {
        id: 'dass_q7',
        index: 7,
        prompt: 'I felt that I was rather touchy, defensive, or easily upset',
        domain: 'Affective Vulnerability',
        isCrisisSensitive: false
      }
    ],
    scoringBands: [
      {
        min: 0,
        max: 7,
        tier: 'MINIMAL',
        label: 'Normal Stress Level',
        description: 'You are adapting well to current demands. Your autonomic stress response recovers efficiently between challenges.',
        clinicalAction: 'Maintain balanced work-rest rhythms and healthy personal boundaries.',
        badgeColor: 'minimal'
      },
      {
        min: 8,
        max: 9,
        tier: 'MILD',
        label: 'Mild Chronic Stress',
        description: 'Early signs of stress accumulation detected. You may feel slightly hurried, touchy, or drained at the end of long days.',
        clinicalAction: 'Incorporate mini micro-pauses during the day. Delegate non-essential commitments.',
        badgeColor: 'mild'
      },
      {
        min: 10,
        max: 12,
        tier: 'MODERATE',
        label: 'Moderate Stress & Approaching Burnout',
        description: 'Notable stress strain. Coping reserves are depleted, making small disruptions feel disproportionately burdensome.',
        clinicalAction: 'Establish firm work-life separation. Prioritize sleep hygiene and speak with a counselor or supervisor about workload adjustment.',
        badgeColor: 'elevated'
      },
      {
        min: 13,
        max: 21,
        tier: 'SEVERE',
        label: 'Severe Stress & High Burnout Vulnerability',
        description: 'Severe allostatic load detected. Your nervous system is in sustained high-alert overdrive, risking clinical exhaustion.',
        clinicalAction: 'Urgent respite and clinical stress consultation advised. Take time away from high-stress stimuli to reset neurobiology.',
        badgeColor: 'severe'
      }
    ]
  },

  // =========================================================================
  // 4. ISI: INSOMNIA SEVERITY INDEX
  // =========================================================================
  {
    id: 'isi-sleep',
    title: 'Insomnia Severity Index (ISI)',
    shortTitle: 'Sleep Quality Index (ISI)',
    category: 'Sleep & Fatigue',
    categoryKey: 'sleep',
    clinicalStandard: 'International Sleep Science Standard',
    citation: 'Bastien, Vallières, & Morin, Sleep Med 2001',
    timeEstimate: '2–3 mins',
    questionCount: 7,
    maxScore: 28,
    accentColor: '#174A3A',
    description: 'A validated 7-item clinical tool assessing both the nighttime difficulties and daytime impairments caused by insomnia.',
    purpose: 'Quantifies sleep onset latency, nocturnal awakenings, early-morning awakenings, and daytime functional impairment.',
    whoIsItFor: 'Essential for anyone struggling with sleeplessness, tossing and turning, unrefreshing sleep, or daytime exhaustion.',
    instructions: 'For each statement, please rate the severity of your sleep difficulties over the past two weeks.',
    options: ISI_5_POINT_SEVERITY,
    questions: [
      {
        id: 'isi_q1',
        index: 1,
        prompt: 'Difficulty falling asleep (sleep onset latency)',
        domain: 'Sleep Onset Latency',
        isCrisisSensitive: false
      },
      {
        id: 'isi_q2',
        index: 2,
        prompt: 'Difficulty staying asleep (waking up in the middle of the night)',
        domain: 'Sleep Maintenance',
        isCrisisSensitive: false
      },
      {
        id: 'isi_q3',
        index: 3,
        prompt: 'Problems waking up too early and being unable to fall back asleep',
        domain: 'Terminal Insomnia',
        isCrisisSensitive: false
      },
      {
        id: 'isi_q4',
        index: 4,
        prompt: 'How satisfied or dissatisfied are you with your current overall sleep pattern?',
        domain: 'Subjective Sleep Quality Satisfaction',
        isCrisisSensitive: false
      },
      {
        id: 'isi_q5',
        index: 5,
        prompt: 'How noticeable to others do you think your sleep problem is in terms of impairing the quality of your life?',
        domain: 'Social / Observational Impairment',
        isCrisisSensitive: false
      },
      {
        id: 'isi_q6',
        index: 6,
        prompt: 'How worried or distressed are you about your current sleep problem?',
        domain: 'Sleep-Related Anxiety & Frustration',
        isCrisisSensitive: false
      },
      {
        id: 'isi_q7',
        index: 7,
        prompt: 'To what extent does your sleep problem interfere with your daily functioning (e.g. daytime fatigue, ability to function at work)?',
        domain: 'Daytime Functional Impairment',
        isCrisisSensitive: false
      }
    ],
    scoringBands: [
      {
        min: 0,
        max: 7,
        tier: 'MINIMAL',
        label: 'No Clinically Significant Insomnia',
        description: 'Your sleep architecture is sound and restorative. Any occasional restless night resolves naturally without major daytime impact.',
        clinicalAction: 'Maintain regular sleep and wake times, and avoid bright screens within 60 minutes of bedtime.',
        badgeColor: 'minimal'
      },
      {
        min: 8,
        max: 14,
        tier: 'MILD',
        label: 'Subthreshold / Mild Insomnia',
        description: 'Mild sleep friction observed. You may have trouble winding down or notice slight daytime sluggishness.',
        clinicalAction: 'Practice sleep hygiene: keep your bedroom cool and dark, eliminate evening caffeine, and practice bedtime body scanning.',
        badgeColor: 'mild'
      },
      {
        min: 15,
        max: 21,
        tier: 'MODERATE',
        label: 'Clinical Insomnia (Moderate Severity)',
        description: 'Significant sleep disruption that impairs daytime alertness, mood stability, and cognitive performance.',
        clinicalAction: 'Cognitive Behavioral Therapy for Insomnia (CBT-I) recommended. Consult a physician or sleep specialist.',
        badgeColor: 'elevated'
      },
      {
        min: 22,
        max: 28,
        tier: 'SEVERE',
        label: 'Clinical Insomnia (Severe)',
        description: 'Severe, chronic insomnia creating marked functional distress and daytime exhaustion. Requires medical attention.',
        clinicalAction: 'Comprehensive medical and sleep clinic evaluation recommended to rule out sleep apnea and optimize restorative sleep.',
        badgeColor: 'severe'
      }
    ]
  },

  // =========================================================================
  // 5. MINDVISION MULTIMODAL TELEMETRY AI CHECK-IN
  // =========================================================================
  {
    id: 'multimodal-ai',
    title: 'MindVision Real-Time Multimodal Telemetry Check-in',
    shortTitle: 'Multimodal AI Check-in',
    category: 'MindVision Multimodal AI',
    categoryKey: 'multimodal',
    clinicalStandard: 'Real-Time Edge Telemetry (MediaPipe FACS + Web Audio FFT)',
    citation: 'MindVision Precision Clinical Workstation Protocol v2.4, 2026',
    timeEstimate: '3–5 mins',
    questionCount: 4,
    maxScore: 10,
    accentColor: '#174A3A',
    isMultimodalLive: true,
    description: 'MindVision’s flagship conversational check-in incorporating real-time facial micro-expression telemetry (AU04, AU15), vocal pitch micro-jitter, and conversational sentiment NLP.',
    purpose: 'Detects cross-modal affective masking ("smiling depression") where verbal optimism conflicts with involuntary physical tension.',
    whoIsItFor: 'Recommended for routine holistic check-ins, remote telehealth intake, or when self-reported text feels incomplete.',
    instructions: 'Respond to gentle, adaptive questions via voice or text while optional on-device camera telemetry monitors physical tension.',
    options: [],
    questions: [],
    scoringBands: [
      { min: 0.0, max: 3.4, tier: 'MINIMAL', label: 'Minimal Somatic & Verbal Distress', description: 'Harmonious calm pattern detected across facial expressions, vocal prosody, and verbal statements.', badgeColor: 'minimal' },
      { min: 3.5, max: 6.9, tier: 'ELEVATED', label: 'Elevated Non-Verbal Tension', description: 'Subtle physical or linguistic markers of stress detected. Self-care and pacing advised.', badgeColor: 'elevated' },
      { min: 7.0, max: 10.0, tier: 'SEVERE', label: 'Severe Discordance / Distress', description: 'Marked physical tension or acute affective discordance detected. Escalation available.', badgeColor: 'severe' }
    ]
  }
];

/**
 * Computes deterministic score and clinical categorization for an assessment instrument
 */
export function calculateAssessmentScore(instrumentId, answers = {}) {
  const instrument = ASSESSMENT_INSTRUMENTS.find((inst) => inst.id === instrumentId);
  if (!instrument) {
    throw new Error(`Unknown assessment instrument: ${instrumentId}`);
  }

  // Handle standard psychometric questionnaires
  let totalScore = 0;
  let isCrisisFlagged = false;
  const itemBreakdown = [];

  for (const q of instrument.questions) {
    const rawVal = answers[q.id];
    const val = typeof rawVal === 'number' ? rawVal : (rawVal !== undefined ? parseInt(rawVal, 10) : 0);
    const scoreVal = isNaN(val) ? 0 : val;
    totalScore += scoreVal;

    // Check crisis-sensitive questions (e.g. PHQ-9 Q9 suicidal ideation > 0)
    if (q.isCrisisSensitive && scoreVal > 0) {
      isCrisisFlagged = true;
    }

    const matchedOption = instrument.options.find((opt) => opt.value === scoreVal) || { label: 'Not answered' };
    itemBreakdown.push({
      questionId: q.id,
      index: q.index,
      prompt: q.prompt,
      domain: q.domain,
      scoreValue: scoreVal,
      selectedLabel: matchedOption.label,
      isCrisisSensitive: q.isCrisisSensitive
    });
  }

  // Match scoring band
  const matchingBand = instrument.scoringBands.find(
    (b) => totalScore >= b.min && totalScore <= b.max
  ) || instrument.scoringBands[instrument.scoringBands.length - 1];

  const percentage = Math.round((totalScore / instrument.maxScore) * 100);

  return {
    instrumentId: instrument.id,
    instrumentTitle: instrument.title,
    shortTitle: instrument.shortTitle,
    category: instrument.category,
    clinicalStandard: instrument.clinicalStandard,
    totalScore,
    maxScore: instrument.maxScore,
    percentage,
    tier: matchingBand.tier,
    severityLabel: matchingBand.label,
    description: matchingBand.description,
    clinicalAction: matchingBand.clinicalAction,
    badgeColor: matchingBand.badgeColor,
    isCrisisFlagged,
    itemBreakdown,
    completedAtIso: new Date().toISOString()
  };
}
