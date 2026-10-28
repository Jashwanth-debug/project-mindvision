import React, { useMemo } from 'react';
import { AssessmentStorageService } from '../services/assessmentStorageService';
import {
  IconSparkles,
  IconShieldCheck,
  IconClock,
  IconMic,
  IconLeaf,
  IconHeartPulse,
  IconCalendar,
  IconBookOpen,
  IconLifeBuoy,
  IconPhone,
  IconChevronRight,
  IconArrowRight,
  IconFileText,
  IconCheck,
  IconTrendingUp,
  IconSmile,
  IconHand,
  IconWind,
  IconCompass,
  IconUserCheck,
  IconLock
} from './Icons';

/**
 * HomeOverview - Production-Quality Patient-Centered Wellness Homepage
 *
 * Reimagined with MindVision Clinical-Tech Design System:
 * 1. Premium Hero Section with original organic botanical composition & live reflection sanctuary.
 * 2. Personalized Wellbeing Overview adapting strictly to real saved records (zero fabricated data).
 * 3. Assessment Discovery Experience highlighting DSM-5 / APA validated clinical screeners.
 * 4. Wellness Hub Preview featuring real existing self-guided somatic tools.
 * 5. Honest Recent Check-in & 7-Day Pattern Indicator (accurate missing-day representation).
 * 6. Longitudinal Trajectory Data Visualization (real records with graceful empty state).
 * 7. Next Steps & Compassionate 24/7 Crisis Support Integration.
 * 8. Comprehensive Clinical SaaS Footer.
 */
export default function HomeOverview({
  setActiveTab,
  records = [],
  _onShowToast
}) {
  // Retrieve saved standardized assessments for real historical context
  const assessmentRecords = useMemo(() => {
    try {
      return AssessmentStorageService.getAssessmentRecords();
    } catch {
      return [];
    }
  }, []);

  // Most recent patient check-in record (strictly real, or null if new user)
  const latestCheckIn = useMemo(() => {
    if (!Array.isArray(records) || records.length === 0) return null;
    return [...records].sort((a, b) => {
      const timeA = new Date(a.dateIso || a.timestamp || 0).getTime();
      const timeB = new Date(b.dateIso || b.timestamp || 0).getTime();
      return timeB - timeA;
    })[0];
  }, [records]);

  // Most recent standardized psychometric screener (or null if none taken)
  const latestAssessment = useMemo(() => {
    if (!Array.isArray(assessmentRecords) || assessmentRecords.length === 0) return null;
    return [...assessmentRecords].sort((a, b) => {
      const timeA = new Date(a.dateIso || a.timestamp || 0).getTime();
      const timeB = new Date(b.dateIso || b.timestamp || 0).getTime();
      return timeB - timeA;
    })[0];
  }, [assessmentRecords]);

  const hasHistory = Boolean(latestCheckIn || latestAssessment);

  // Compute honest 7-day pattern based strictly on real calendar dates
  const sevenDayPattern = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - i);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(targetDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayOfMonth}`;

      const dayLetter = targetDate.toLocaleDateString(undefined, { weekday: 'narrow' });
      const dayShort = targetDate.toLocaleDateString(undefined, { weekday: 'short' });
      const formattedDate = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const isToday = i === 0;

      // Find real matching check-in
      const match = records.find((rec) => {
        const raw = rec?.dateIso || rec?.timestamp;
        if (!raw) return false;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return false;
        const rY = parsed.getFullYear();
        const rM = String(parsed.getMonth() + 1).padStart(2, '0');
        const rD = String(parsed.getDate()).padStart(2, '0');
        return `${rY}-${rM}-${rD}` === dateKey;
      });

      if (match) {
        const isElevated =
          match.riskLevel === 'ELEVATED' ||
          match.riskLevel === 'SEVERE' ||
          (typeof match.compositeRisk === 'number' && match.compositeRisk >= 5.0);

        days.push({
          dateKey,
          label: isToday ? 'Today' : dayLetter,
          dayShort,
          formattedDate,
          isToday,
          hasCheckIn: true,
          status: isElevated ? 'ELEVATED' : 'CALM',
          statusText: isElevated ? 'Elevated Stress Recorded' : 'Calm & Steady Pattern',
          record: match
        });
      } else {
        days.push({
          dateKey,
          label: isToday ? 'Today' : dayLetter,
          dayShort,
          formattedDate,
          isToday,
          hasCheckIn: false,
          status: 'UNRECORDED',
          statusText: 'No check-in recorded',
          record: null
        });
      }
    }
    return days;
  }, [records]);

  const recordedDaysCount = sevenDayPattern.filter((d) => d.hasCheckIn).length;

  // Filter valid numeric risk points for the mini-trajectory chart
  const validTrajectoryPoints = useMemo(() => {
    return records
      .filter((r) => typeof r.compositeRisk === 'number' && Number.isFinite(r.compositeRisk))
      .sort((a, b) => new Date(a.dateIso || a.timestamp).getTime() - new Date(b.dateIso || b.timestamp).getTime());
  }, [records]);

  // Handle assessment navigation with toast acknowledgment
  const handleLaunchAssessment = (tab = 'assessments') => {
    setActiveTab(tab);
  };

  return (
    <div className="patient-view-shell homepage-shell">

      {/* =========================================================================
          1. HERO SECTION: BRAND SHOWCASE & SANCTUARY COMPOSITION
          ========================================================================= */}
      <section className="mv-home-hero animate-enter-1" aria-label="MindVision Introduction">
        <div className="mv-hero-content">
          <div className="mv-hero-badge-row">
            <span className="mv-badge-pill primary">
              <IconLeaf size={14} />
              <span>Evidence-Based Clinical AI</span>
            </span>
            <span className="mv-badge-pill subtle">
              <IconLock size={13} />
              <span>100% On-Device &amp; Private</span>
            </span>
          </div>

          <h1 className="mv-hero-title">
            Understand your wellbeing. One check-in at a time.
          </h1>

          <p className="mv-hero-lead">
            Take a moment to reflect on how you're feeling. MindVision helps you explore your emotional wellbeing, complete structured assessments, and discover useful patterns over time.
          </p>

          {/* Primary & Secondary Action Buttons */}
          <div className="mv-hero-actions">
            <button
              type="button"
              className="btn-mv-primary"
              onClick={() => setActiveTab('assessment')}
              aria-label="Start a Real-Time Voice and Facial Check-in"
            >
              <span>Start a Check-in</span>
              <IconArrowRight size={17} />
            </button>

            <button
              type="button"
              className="btn-mv-secondary"
              onClick={() => setActiveTab('assessments')}
              aria-label="Explore Clinical Psychometric Assessments"
            >
              <IconFileText size={16} />
              <span>Explore Assessments</span>
            </button>
          </div>

          {/* Compact Verified Trust Row */}
          <div className="mv-hero-trust-row" aria-label="Privacy & Security Guarantees">
            <div className="mv-trust-item">
              <IconShieldCheck size={16} className="trust-icon" />
              <span>Private on this device</span>
            </div>
            <div className="mv-trust-item">
              <IconMic size={16} className="trust-icon" />
              <span>Voice, video or typing</span>
            </div>
            <div className="mv-trust-item">
              <IconClock size={16} className="trust-icon" />
              <span>1–2 quiet minutes</span>
            </div>
          </div>
        </div>

        {/* Hero Visual: Original Wellbeing & Botanical Composition */}
        <div className="mv-hero-visual-frame" aria-hidden="true">
          <div className="mv-visual-backdrop">
            {/* Organic botanical wave layers */}
            <svg viewBox="0 0 400 320" className="mv-botanical-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mvLeafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--mv-primary)" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="var(--mv-secondary)" stopOpacity="0.06" />
                </linearGradient>
                <linearGradient id="mvLeafGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--mv-accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--mv-primary)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d="M 20,80 Q 120,10 240,60 T 380,110 Q 320,240 180,260 T 20,80 Z"
                fill="url(#mvLeafGrad1)"
              />
              <path
                d="M 60,180 Q 160,120 280,180 T 360,280 Q 200,310 100,260 T 60,180 Z"
                fill="url(#mvLeafGrad2)"
              />
              <circle cx="80" cy="70" r="48" fill="var(--mv-secondary)" fillOpacity="0.12" />
              <circle cx="320" cy="230" r="64" fill="var(--mv-accent)" fillOpacity="0.08" />
            </svg>
          </div>

          {/* Floating Live Reflection Sanctuary Card */}
          <div className="mv-sanctuary-card">
            <div className="mv-sanctuary-header">
              <div className="mv-sanctuary-icon">
                <IconSparkles size={18} />
              </div>
              <div>
                <span className="mv-sanctuary-kicker">
                  {latestCheckIn ? 'Latest Recorded Reflection' : 'Personal Reflection Sanctuary'}
                </span>
                <div className="mv-sanctuary-date">
                  {latestCheckIn
                    ? new Date(latestCheckIn.dateIso || latestCheckIn.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Confidential & Private'}
                </div>
              </div>
            </div>

            <div className="mv-sanctuary-body">
              {latestCheckIn ? (
                <>
                  <p className="mv-sanctuary-quote">
                    "{latestCheckIn.summary || latestCheckIn.text || 'Steady reflection recorded.'}"
                  </p>
                  <div className="mv-sanctuary-metrics">
                    <span className={`mv-status-chip ${latestCheckIn.riskLevel === 'ELEVATED' ? 'elevated' : 'minimal'}`}>
                      {latestCheckIn.riskLevel === 'ELEVATED' ? 'Elevated Stress' : 'Steady & Calm'}
                    </span>
                    {typeof latestCheckIn.compositeRisk === 'number' && (
                      <span className="mv-metric-tag" title="Recorded composite risk indicator">
                        Risk Indicator: {latestCheckIn.compositeRisk.toFixed(1)}/10
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mv-sanctuary-quote">
                    "Your personal reflection space. Pause for 2 quiet minutes to explore how your mind and body feel today."
                  </p>
                  <div className="mv-sanctuary-onboarding-hint">
                    <IconCheck size={14} style={{ color: 'var(--mv-primary)' }} />
                    <span>No account or cloud sync required</span>
                  </div>
                </>
              )}
            </div>

            <div className="mv-sanctuary-footer">
              <button
                type="button"
                className="mv-sanctuary-action"
                onClick={() => setActiveTab(latestCheckIn ? 'results' : 'assessment')}
              >
                <span>{latestCheckIn ? 'View in Check-in History' : 'Begin Your First Check-in'}</span>
                <IconChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. PERSONALIZED WELLBEING OVERVIEW (Real Saved Data or Clean Onboarding)
          ========================================================================= */}
      <section className="mv-section animate-enter-2" aria-labelledby="section-overview-title">
        <div className="mv-section-header">
          <div>
            <span className="mv-section-kicker">Personalized Snapshot</span>
            <h2 id="section-overview-title" className="mv-section-title">
              {hasHistory ? 'Your Wellbeing Journey' : 'Begin Your Wellbeing Journey'}
            </h2>
          </div>
          {hasHistory && (
            <button
              type="button"
              className="mv-text-btn"
              onClick={() => setActiveTab('results')}
            >
              <span>View full timeline</span>
              <IconChevronRight size={14} />
            </button>
          )}
        </div>

        {hasHistory ? (
          <div className="mv-overview-grid">
            {/* Card 1: Latest Conversational Check-in */}
            <div className="mv-overview-card">
              <div className="mv-card-top">
                <div className="mv-icon-badge primary">
                  <IconHeartPulse size={20} />
                </div>
                <span className="mv-pill-tag">
                  {latestCheckIn ? 'Most Recent Check-in' : 'No Check-ins Yet'}
                </span>
              </div>
              <h3 className="mv-card-headline">
                {latestCheckIn ? (latestCheckIn.summary || 'Check-in Recorded') : 'Start with a check-in'}
              </h3>
              <p className="mv-card-text">
                {latestCheckIn
                  ? (latestCheckIn.explanation || 'Reflections and voice cadence captured locally on your device.')
                  : 'Take 2 minutes to reflect on how you feel. Your words and telemetry stay entirely private.'}
              </p>
              <div className="mv-card-bottom">
                <button
                  type="button"
                  className="mv-card-cta"
                  onClick={() => setActiveTab(latestCheckIn ? 'results' : 'assessment')}
                >
                  <span>{latestCheckIn ? 'Inspect Check-in' : 'Start Check-in'}</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Card 2: Latest Psychometric Assessment */}
            <div className="mv-overview-card">
              <div className="mv-card-top">
                <div className="mv-icon-badge secondary">
                  <IconFileText size={20} />
                </div>
                <span className="mv-pill-tag">
                  {latestAssessment ? 'Clinical Screener' : 'Standardized Battery'}
                </span>
              </div>
              <h3 className="mv-card-headline">
                {latestAssessment ? latestAssessment.shortTitle : 'Take PHQ-9 or GAD-7'}
              </h3>
              <p className="mv-card-text">
                {latestAssessment
                  ? `Completed with score ${latestAssessment.totalScore}/${latestAssessment.maxScore} (${latestAssessment.severityLabel}). Evidence-based decision support.`
                  : 'Structured clinical questionnaires used by healthcare providers to measure depression, anxiety, and sleep health.'}
              </p>
              <div className="mv-card-bottom">
                <button
                  type="button"
                  className="mv-card-cta"
                  onClick={() => setActiveTab('assessments')}
                >
                  <span>{latestAssessment ? 'View Assessment History' : 'Browse Screeners'}</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Card 3: Privacy & Device Local Storage */}
            <div className="mv-overview-card accent-card">
              <div className="mv-card-top">
                <div className="mv-icon-badge accent">
                  <IconShieldCheck size={20} />
                </div>
                <span className="mv-pill-tag">On-Device Security</span>
              </div>
              <h3 className="mv-card-headline">
                Private on this device
              </h3>
              <p className="mv-card-text">
                Your check-in reflections and clinical reports are stored strictly in your browser's local sandbox. No advertising trackers, no cloud profiling.
              </p>
              <div className="mv-card-bottom">
                <button
                  type="button"
                  className="mv-card-cta"
                  onClick={() => setActiveTab('docs')}
                >
                  <span>Read Privacy Details</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Intentional Onboarding State for New Users */
          <div className="mv-onboarding-panel">
            <div className="mv-onboarding-content">
              <div className="mv-onboarding-icon">
                <IconCompass size={28} />
              </div>
              <div className="mv-onboarding-text">
                <h3>Your wellbeing journey starts here</h3>
                <p>
                  Complete your first check-in to begin reflecting on your wellbeing over time. MindVision provides a calm, confidential space to explore patterns in how you feel.
                </p>
              </div>
            </div>
            <div className="mv-onboarding-actions">
              <button
                type="button"
                className="btn-mv-primary"
                onClick={() => setActiveTab('assessment')}
              >
                <span>Start Your First Check-in</span>
                <IconArrowRight size={16} />
              </button>
              <button
                type="button"
                className="btn-mv-secondary"
                onClick={() => setActiveTab('assessments')}
              >
                <span>Browse Clinical Screeners</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          3. ASSESSMENT DISCOVERY EXPERIENCE (DSM-5 & APA Instruments)
          ========================================================================= */}
      <section className="mv-section animate-enter-3" aria-labelledby="section-assessments-title">
        <div className="mv-section-header">
          <div>
            <span className="mv-section-kicker">Clinical Screening Batteries</span>
            <h2 id="section-assessments-title" className="mv-section-title">
              Evidence-Based Psychometric Screeners
            </h2>
            <p className="mv-section-subtitle">
              Standardized questionnaires used by clinicians worldwide. Fully confidential, self-guided, and calculated locally on your device.
            </p>
          </div>
          <button
            type="button"
            className="btn-mv-outline"
            onClick={() => setActiveTab('assessments')}
          >
            <span>View All Assessments</span>
            <IconChevronRight size={15} />
          </button>
        </div>

        <div className="mv-assessment-grid">
          {/* Card A: PHQ-9 Depression Screener */}
          <article className="mv-assessment-card">
            <div className="mv-asmt-top">
              <span className="mv-standard-badge">DSM-5 Validated</span>
              <span className="mv-time-badge">
                <IconClock size={12} />
                <span>~3 mins</span>
              </span>
            </div>
            <h3 className="mv-asmt-title">
              Patient Health Questionnaire (PHQ-9)
            </h3>
            <p className="mv-asmt-desc">
              The gold-standard 9-item clinical screener measuring the presence, frequency, and severity of depressive symptoms over the past 2 weeks.
            </p>
            <div className="mv-asmt-meta">
              <span>9 Questions</span>
              <span>•</span>
              <span>DSM-5 Severity Scale</span>
            </div>
            <div className="mv-asmt-footer">
              <button
                type="button"
                className="btn-asmt-launch"
                onClick={() => handleLaunchAssessment('assessments')}
                aria-label="Start PHQ-9 Depression Screener"
              >
                <span>Start PHQ-9</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </article>

          {/* Card B: GAD-7 Anxiety Screener */}
          <article className="mv-assessment-card">
            <div className="mv-asmt-top">
              <span className="mv-standard-badge">APA Validated</span>
              <span className="mv-time-badge">
                <IconClock size={12} />
                <span>~2 mins</span>
              </span>
            </div>
            <h3 className="mv-asmt-title">
              Generalized Anxiety Disorder (GAD-7)
            </h3>
            <p className="mv-asmt-desc">
              A 7-item standardized screener measuring excessive worry, nervous tension, autonomic restlessness, and irritability over the past 2 weeks.
            </p>
            <div className="mv-asmt-meta">
              <span>7 Questions</span>
              <span>•</span>
              <span>APA Anxiety Scale</span>
            </div>
            <div className="mv-asmt-footer">
              <button
                type="button"
                className="btn-asmt-launch"
                onClick={() => handleLaunchAssessment('assessments')}
                aria-label="Start GAD-7 Anxiety Screener"
              >
                <span>Start GAD-7</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </article>

          {/* Card C: DASS-21 Burnout & Stress */}
          <article className="mv-assessment-card">
            <div className="mv-asmt-top">
              <span className="mv-standard-badge">UNSW Psychometrics</span>
              <span className="mv-time-badge">
                <IconClock size={12} />
                <span>~2 mins</span>
              </span>
            </div>
            <h3 className="mv-asmt-title">
              Stress &amp; Burnout Inventory (DASS-21)
            </h3>
            <p className="mv-asmt-desc">
              Measures non-specific chronic arousal, difficulty relaxing, impatience, and irritability associated with prolonged work and life demands.
            </p>
            <div className="mv-asmt-meta">
              <span>7 Questions</span>
              <span>•</span>
              <span>Stress Subscale</span>
            </div>
            <div className="mv-asmt-footer">
              <button
                type="button"
                className="btn-asmt-launch"
                onClick={() => handleLaunchAssessment('assessments')}
                aria-label="Start DASS-21 Burnout Screener"
              >
                <span>Start DASS-21</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </article>

          {/* Card D: Insomnia Severity Index */}
          <article className="mv-assessment-card">
            <div className="mv-asmt-top">
              <span className="mv-standard-badge">Morin Scale</span>
              <span className="mv-time-badge">
                <IconClock size={12} />
                <span>~2 mins</span>
              </span>
            </div>
            <h3 className="mv-asmt-title">
              Insomnia Severity Index (ISI)
            </h3>
            <p className="mv-asmt-desc">
              Evaluates the nature, severity, and daytime impact of insomnia, including sleep onset difficulty, nighttime awakenings, and sleep satisfaction.
            </p>
            <div className="mv-asmt-meta">
              <span>7 Questions</span>
              <span>•</span>
              <span>Sleep Hygiene</span>
            </div>
            <div className="mv-asmt-footer">
              <button
                type="button"
                className="btn-asmt-launch"
                onClick={() => handleLaunchAssessment('assessments')}
                aria-label="Start Insomnia Severity Index"
              >
                <span>Start ISI</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* =========================================================================
          4. WELLNESS HUB PREVIEW: SUPPORTIVE TOOLS FOR DAILY BALANCE
          ========================================================================= */}
      <section className="mv-section animate-enter-4" aria-labelledby="section-wellness-title">
        <div className="mv-section-header">
          <div>
            <span className="mv-section-kicker">Self-Guided Practices</span>
            <h2 id="section-wellness-title" className="mv-section-title">
              Supportive Tools for Daily Balance
            </h2>
            <p className="mv-section-subtitle">
              Gentle practices to help you reset, ground your nervous system, and cultivate calm awareness throughout your day.
            </p>
          </div>
          <button
            type="button"
            className="btn-mv-outline"
            onClick={() => setActiveTab('wellness')}
          >
            <span>Open Wellness Hub</span>
            <IconChevronRight size={15} />
          </button>
        </div>

        <div className="mv-wellness-tools-grid">
          {/* Tool 1: Box Breathing */}
          <div
            className="mv-tool-card"
            onClick={() => setActiveTab('wellness')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('wellness'); }}
          >
            <div className="mv-tool-icon-frame" style={{ backgroundColor: 'var(--mv-primary-subtle)', color: 'var(--mv-primary)' }}>
              <IconWind size={22} />
            </div>
            <h3 className="mv-tool-title">Guided Box Breathing</h3>
            <p className="mv-tool-desc">
              4-4-4-4 physiological sigh and paced breath visualizer to regulate vagal tone and ease acute tension.
            </p>
            <div className="mv-tool-link">
              <span>Practice Breathing</span>
              <IconChevronRight size={14} />
            </div>
          </div>

          {/* Tool 2: Daily Mood Log */}
          <div
            className="mv-tool-card"
            onClick={() => setActiveTab('wellness')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('wellness'); }}
          >
            <div className="mv-tool-icon-frame" style={{ backgroundColor: 'var(--mv-secondary-subtle)', color: 'var(--mv-primary)' }}>
              <IconSmile size={22} />
            </div>
            <h3 className="mv-tool-title">Daily Mood &amp; Energy Tracker</h3>
            <p className="mv-tool-desc">
              Log emotional climate, sleep quality, and energy levels without judgment to observe week-over-week trends.
            </p>
            <div className="mv-tool-link">
              <span>Log Today's Mood</span>
              <IconChevronRight size={14} />
            </div>
          </div>

          {/* Tool 3: Private Journal */}
          <div
            className="mv-tool-card"
            onClick={() => setActiveTab('wellness')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('wellness'); }}
          >
            <div className="mv-tool-icon-frame" style={{ backgroundColor: 'var(--mv-accent-subtle)', color: 'var(--mv-accent)' }}>
              <IconBookOpen size={22} />
            </div>
            <h3 className="mv-tool-title">Private Reflection Journal</h3>
            <p className="mv-tool-desc">
              An unhurried space for unstructured thoughts and gratitude reflections. Securely stored in your browser.
            </p>
            <div className="mv-tool-link">
              <span>Open Journal</span>
              <IconChevronRight size={14} />
            </div>
          </div>

          {/* Tool 4: Grounding Reset */}
          <div
            className="mv-tool-card"
            onClick={() => setActiveTab('wellness')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('wellness'); }}
          >
            <div className="mv-tool-icon-frame" style={{ backgroundColor: 'rgba(59, 130, 166, 0.12)', color: '#1E5C7E' }}>
              <IconHand size={22} />
            </div>
            <h3 className="mv-tool-title">5-4-3-2-1 Somatic Grounding</h3>
            <p className="mv-tool-desc">
              A sensory re-centering exercise designed to reconnect you with the physical room during moments of panic.
            </p>
            <div className="mv-tool-link">
              <span>Start Grounding</span>
              <IconChevronRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. HONEST 7-DAY PATTERN & RECENT CHECK-IN EXPERIENCE
          ========================================================================= */}
      <section className="mv-section animate-enter-4" aria-labelledby="section-pattern-title">
        <div className="mv-pattern-card">
          <div className="mv-pattern-main">
            <div className="mv-pattern-header">
              <div className="mv-pattern-title-wrap">
                <IconCalendar size={20} style={{ color: 'var(--mv-primary)' }} />
                <h2 id="section-pattern-title" className="mv-pattern-title">
                  Recent Check-in &amp; 7-Day Pattern
                </h2>
              </div>
              <div className="mv-pattern-caption">
                {recordedDaysCount > 0
                  ? `${recordedDaysCount} of the last 7 days recorded`
                  : 'No check-ins recorded this week'}
              </div>
            </div>

            {/* 7-Day Dots Indicator (Strictly Real Data, Unfilled for Missing Days) */}
            <div className="mv-seven-day-strip" role="group" aria-label="Seven-day check-in history">
              {sevenDayPattern.map((day, idx) => (
                <div
                  key={idx}
                  className={`mv-day-pill ${day.hasCheckIn ? 'active' : 'empty'} ${day.isToday ? 'is-today' : ''}`}
                  title={`${day.formattedDate} (${day.dayShort}): ${day.statusText}`}
                >
                  <div
                    className={`mv-day-dot ${day.hasCheckIn ? (day.status === 'ELEVATED' ? 'elevated' : 'calm') : 'unrecorded'}`}
                  />
                  <span className="mv-day-label">{day.label}</span>
                </div>
              ))}
            </div>

            <p className="mv-pattern-explanation">
              {recordedDaysCount > 0
                ? 'Check in daily to build a clear understanding of your emotional reserves and stress triggers over time.'
                : 'Complete regular check-ins to build a continuous record of your emotional patterns over time.'}
            </p>
          </div>

          {/* Right Side: Quick Check-in Callout */}
          <div className="mv-pattern-cta-well">
            <div>
              <h3 className="mv-cta-well-title">
                {latestCheckIn ? 'Continue your rhythm' : 'Ready to start?'}
              </h3>
              <p className="mv-cta-well-desc">
                {latestCheckIn
                  ? 'Consistent daily pauses help you recognize subtle shifts in stress before fatigue accumulates.'
                  : 'Take 2 minutes today to reflect and start tracking your emotional wellbeing.'}
              </p>
            </div>
            <button
              type="button"
              className="btn-mv-primary"
              onClick={() => setActiveTab('assessment')}
            >
              <span>{latestCheckIn ? 'Check in for Today' : 'Start Check-in'}</span>
              <IconArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. DATA VISUALIZATION: LONGITUDINAL TRAJECTORY (Or Clear Empty State)
          ========================================================================= */}
      <section className="mv-section animate-enter-4" aria-labelledby="section-trajectory-title">
        <div className="mv-section-header">
          <div>
            <span className="mv-section-kicker">Longitudinal Trajectory</span>
            <h2 id="section-trajectory-title" className="mv-section-title">
              Recorded Risk &amp; Wellness Trajectory
            </h2>
            <p className="mv-section-subtitle">
              Chronological progression of your recorded composite risk indicators across past check-ins.
            </p>
          </div>
          {validTrajectoryPoints.length >= 2 && (
            <button
              type="button"
              className="mv-text-btn"
              onClick={() => setActiveTab('results')}
            >
              <span>Detailed history chart</span>
              <IconChevronRight size={14} />
            </button>
          )}
        </div>

        {validTrajectoryPoints.length >= 2 ? (
          <div className="mv-trajectory-card">
            <div className="mv-trajectory-meta">
              <div>
                <span className="mv-meta-label">Total Data Points</span>
                <span className="mv-meta-value">{validTrajectoryPoints.length} check-ins</span>
              </div>
              <div>
                <span className="mv-meta-label">Observation Window</span>
                <span className="mv-meta-value">
                  {new Date(validTrajectoryPoints[0].dateIso || validTrajectoryPoints[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(validTrajectoryPoints[validTrajectoryPoints.length - 1].dateIso || validTrajectoryPoints[validTrajectoryPoints.length - 1].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* SVG Mini-Trajectory Sparkline */}
            <div className="mv-sparkline-container" tabIndex={0} aria-label="Recorded composite risk trajectory chart">
              <svg viewBox="0 0 600 140" className="mv-sparkline-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mvSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--mv-primary)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--mv-primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Reference Cutoff Line (Moderate Risk = 5.0) */}
                <line
                  x1="40"
                  y1="70"
                  x2="580"
                  y2="70"
                  stroke="var(--status-elevated-dot)"
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                />
                <text x="580" y="66" fill="var(--status-elevated-text)" fontSize="10" textAnchor="end">
                  Moderate Cut-off (5.0)
                </text>

                {/* Sparkline Path Calculation */}
                {(() => {
                  const paddingL = 40;
                  const paddingR = 40;
                  const innerW = 600 - paddingL - paddingR;
                  const innerH = 100;
                  const topOffset = 20;

                  const points = validTrajectoryPoints.map((pt, i) => {
                    const x = paddingL + (validTrajectoryPoints.length > 1 ? (i / (validTrajectoryPoints.length - 1)) * innerW : innerW / 2);
                    const clampedRisk = Math.max(0, Math.min(10, pt.compositeRisk));
                    const y = topOffset + (1 - clampedRisk / 10) * innerH;
                    return { x, y, risk: clampedRisk, date: new Date(pt.dateIso || pt.timestamp) };
                  });

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} ${topOffset + innerH} L ${points[0].x} ${topOffset + innerH} Z`;

                  return (
                    <>
                      <path d={areaPath} fill="url(#mvSparklineGrad)" />
                      <path d={linePath} fill="none" stroke="var(--mv-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4" fill="var(--mv-card)" stroke="var(--mv-primary)" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 8} fill="var(--mv-text)" fontSize="10" fontWeight="700" textAnchor="middle">
                            {p.risk.toFixed(1)}
                          </text>
                          <text x={p.x} y={135} fill="var(--mv-text-muted)" fontSize="9" textAnchor="middle">
                            {p.date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="mv-trajectory-footer-note">
              <span>* Composite risk is an algorithmic estimate calculated locally from your answers and telemetry, not a diagnostic mood score.</span>
            </div>
          </div>
        ) : (
          /* Graceful Empty State for Trajectory */
          <div className="mv-trajectory-empty-card">
            <div className="mv-empty-icon-wrap">
              <IconTrendingUp size={28} />
            </div>
            <h3 className="mv-empty-title">Trajectory data unlocks after 2 check-ins</h3>
            <p className="mv-empty-desc">
              Once you complete two or more check-ins, MindVision plots your recorded composite-risk indicators chronologically to illuminate subtle stress patterns.
            </p>
            <button
              type="button"
              className="btn-mv-secondary"
              onClick={() => setActiveTab('assessment')}
            >
              <span>Take a Check-in Now</span>
            </button>
          </div>
        )}
      </section>

      {/* =========================================================================
          7. NEXT STEPS & COMPASSIONATE CRISIS SUPPORT
          ========================================================================= */}
      <section className="mv-section animate-enter-4" aria-label="Support and Professional Care">
        <div className="mv-support-grid">
          {/* Card 1: Professional Network */}
          <div className="mv-support-card">
            <div className="mv-support-icon">
              <IconUserCheck size={22} />
            </div>
            <div>
              <h3 className="mv-support-title">Talk to a Licensed Clinician</h3>
              <p className="mv-support-desc">
                Connect with board-certified psychiatrists and psychologists for collaborative care, diagnostic evaluation, or teletherapy.
              </p>
            </div>
            <button
              type="button"
              className="btn-mv-outline"
              onClick={() => setActiveTab('doctors')}
            >
              <span>View Clinician Network</span>
              <IconChevronRight size={14} />
            </button>
          </div>

          {/* Card 2: Full History Archive */}
          <div className="mv-support-card">
            <div className="mv-support-icon">
              <IconCalendar size={22} />
            </div>
            <div>
              <h3 className="mv-support-title">Review Check-in Archive</h3>
              <p className="mv-support-desc">
                Inspect your past reflections, compare two check-ins side-by-side, or export your full history as a clinical PDF report.
              </p>
            </div>
            <button
              type="button"
              className="btn-mv-outline"
              onClick={() => setActiveTab('results')}
            >
              <span>Open Check-in History</span>
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* 24/7 Compassionate Crisis Lifeline Banner */}
        <aside className="mv-crisis-banner" role="complementary" aria-label="Crisis Support Resources">
          <div className="mv-crisis-main">
            <div className="mv-crisis-icon-badge">
              <IconLifeBuoy size={24} />
            </div>
            <div>
              <h3 className="mv-crisis-headline">
                Need immediate support or someone to talk to right now?
              </h3>
              <p className="mv-crisis-text">
                Free, confidential support is available 24 hours a day, 7 days a week. You do not have to carry heavy emotions alone.
              </p>
            </div>
          </div>
          <div className="mv-crisis-actions">
            <a
              href="tel:988"
              className="btn-crisis-phone"
              aria-label="Call or text 988 Suicide & Crisis Lifeline"
            >
              <IconPhone size={16} />
              <span>Call or Text 988</span>
            </a>
            <span className="mv-crisis-subtext">
              Crisis Text Line: Text <strong>HOME</strong> to <strong>741741</strong>
            </span>
          </div>
        </aside>
      </section>

      {/* =========================================================================
          8. CLEAN, PROFESSIONAL CLINICAL SAAS FOOTER
          ========================================================================= */}
      <footer className="mv-platform-footer" role="contentinfo" aria-label="MindVision Platform Footer">
        <div className="mv-footer-container">
          {/* Column 1: Brand & Mission */}
          <div className="mv-footer-brand-col">
            <div className="mv-footer-logo-row">
              <div className="mv-footer-logo-hex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" opacity="0.3" />
                  <path d="M12 6v12M6 12h12" />
                </svg>
              </div>
              <span className="mv-footer-brand-title">MindVision</span>
            </div>
            <p className="mv-footer-brand-desc">
              Clinical decision support and self-guided wellness companion engineered for private on-device reflection and structured psychometric screening.
            </p>
            <div className="mv-footer-badge">
              <IconShieldCheck size={14} style={{ color: 'var(--mv-primary)' }} />
              <span>100% Client-Side Architecture</span>
            </div>
          </div>

          {/* Column 2: Clinical Screeners */}
          <div className="mv-footer-nav-col">
            <h4 className="mv-footer-heading">Clinical Screeners</h4>
            <ul className="mv-footer-list">
              <li>
                <button type="button" onClick={() => setActiveTab('assessments')}>
                  PHQ-9 Depression Screener
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('assessments')}>
                  GAD-7 Anxiety Screener
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('assessments')}>
                  DASS-21 Burnout Subscale
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('assessments')}>
                  Insomnia Severity Index (ISI)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('assessment')}>
                  Real-Time Multimodal Check-in
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Daily Wellness Hub */}
          <div className="mv-footer-nav-col">
            <h4 className="mv-footer-heading">Wellness Tools</h4>
            <ul className="mv-footer-list">
              <li>
                <button type="button" onClick={() => setActiveTab('wellness')}>
                  Guided Box Breathing
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('wellness')}>
                  Daily Mood &amp; Energy Tracker
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('wellness')}>
                  Private Reflection Journal
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('wellness')}>
                  5-4-3-2-1 Somatic Grounding
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('results')}>
                  Past Check-in History
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Ethics & Crisis Support */}
          <div className="mv-footer-nav-col">
            <h4 className="mv-footer-heading">Support &amp; Ethics</h4>
            <ul className="mv-footer-list">
              <li>
                <a href="tel:988" style={{ color: 'var(--status-severe-text)', fontWeight: 600 }}>
                  988 Suicide &amp; Crisis Lifeline
                </a>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('doctors')}>
                  Clinician Network Directory
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('docs')}>
                  Privacy &amp; Security Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('portal')}>
                  Provider Portal Login
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Medical Notice */}
        <div className="mv-footer-bottom-row">
          <p className="mv-disclaimer-text">
            <strong>Medical Notice:</strong> MindVision is an evidence-based wellness and self-awareness platform, not a medical device or formal psychiatric diagnostic tool. MindVision does not replace consultation with a licensed physician, clinical psychologist, or mental healthcare professional. If you or someone you know is in crisis, please call or text 988 immediately.
          </p>
          <div className="mv-copyright-text">
            &copy; {new Date().getFullYear()} MindVision Clinical AI • Engineered for Local Privacy
          </div>
        </div>
      </footer>

    </div>
  );
}
