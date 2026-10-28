import React, { useState, useEffect } from 'react';
import GuidedBreathingModal from './GuidedBreathingModal';
import GroundingExerciseModal from './GroundingExerciseModal';
import WindDownModal from './WindDownModal';
import DailyMoodTrackerView from './DailyMoodTrackerView';
import PrivateJournalView from './PrivateJournalView';
import HabitInsightsView from './HabitInsightsView';
import RemindersGoalsView from './RemindersGoalsView';
import {
  IconShieldCheck,
  IconWind,
  IconSmile,
  IconBookOpen,
  IconBarChart2,
  IconTarget,
  IconMoonStar,
  IconCompass,
  IconChevronRight,
  IconLeaf
} from '../Icons';

export default function WellnessHubView({
  initialTab = 'toolkit',
  initialActivity = null,
  records = [],
  setActiveTab,
  onShowToast = () => {}
}) {
  const [currentSection, setCurrentSection] = useState(initialTab || 'toolkit');

  // Modals for guided interactive exercises
  const [isBreathingOpen, setIsBreathingOpen] = useState(initialActivity === 'breathing');
  const [isGroundingOpen, setIsGroundingOpen] = useState(initialActivity === 'grounding');
  const [isWindDownOpen, setIsWindDownOpen] = useState(initialActivity === 'winddown');
  const [breathingInitialDuration, setBreathingInitialDuration] = useState(60);

  // Sync initial activity prop if changed
  useEffect(() => {
    Promise.resolve().then(() => {
      if (initialActivity === 'breathing') {
        setIsBreathingOpen(true);
      } else if (initialActivity === 'grounding') {
        setIsGroundingOpen(true);
      } else if (initialActivity === 'winddown') {
        setIsWindDownOpen(true);
      } else if (initialActivity === 'journal') {
        setCurrentSection('journal');
      } else if (initialActivity === 'mood') {
        setCurrentSection('mood');
      }
    });
  }, [initialActivity]);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (initialTab) {
        setCurrentSection(initialTab);
      }
    });
  }, [initialTab]);

  return (
    <div className="patient-view-shell" style={{ width: '100%' }}>
      {/* 1. Atmospheric Header */}
      <section className="patient-hero-card animate-enter-1" style={{ width: '100%', marginBottom: '1.5rem' }}>
        <div className="patient-hero-kicker">
          <span className="badge-hero-primary">
            <IconLeaf size={14} />
            <span>Patient Wellness Hub</span>
          </span>
          <span className="badge-info-tag">
            <IconShieldCheck size={13} />
            <span>100% Confidential &amp; Local</span>
          </span>
        </div>

        <h1 className="patient-hero-title">
          Gentle tools to care for your mind &amp; body.
        </h1>

        <p className="patient-hero-subtitle">
          Pause, breathe, reflect, and track how you feel over time. All wellness tools are self-paced, private to this device, and designed to support everyday self-awareness.
        </p>

        {/* Quick Coping Selector Prompt */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            backgroundColor: 'var(--card-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <IconCompass size={16} style={{ color: 'var(--accent-teal)' }} />
            <span>How are you feeling right now? (Personalized Coping Suggestion)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
            {/* Overwhelmed -> Grounding */}
            <button
              type="button"
              onClick={() => setIsGroundingOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Feeling Overwhelmed
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  5-4-3-2-1 Sensory Grounding ›
                </div>
              </div>
              <span style={{ fontSize: '1.25rem' }}>🌊</span>
            </button>

            {/* Tense -> Guided Breathing */}
            <button
              type="button"
              onClick={() => {
                setBreathingInitialDuration(60);
                setIsBreathingOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Feeling Tense / Tight
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  1-Min Box Breathing Guide ›
                </div>
              </div>
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
            </button>

            {/* Low -> Journaling or Self-Care */}
            <button
              type="button"
              onClick={() => setCurrentSection('journal')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Feeling Down or Low
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Gentle Journaling Prompt ›
                </div>
              </div>
              <span style={{ fontSize: '1.25rem' }}>🌧️</span>
            </button>

            {/* Trouble Unwinding -> Wind-Down */}
            <button
              type="button"
              onClick={() => setIsWindDownOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Trouble Unwinding
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Gentle Wind-Down Routine ›
                </div>
              </div>
              <span style={{ fontSize: '1.25rem' }}>🌙</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Primary Navigation Tabs for Wellness Features */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem'
        }}
        aria-label="Wellness Hub Navigation"
      >
        {[
          { id: 'toolkit', label: 'Coping Toolkit & Breathing', icon: IconWind },
          { id: 'mood', label: 'Daily Mood Tracker', icon: IconSmile },
          { id: 'journal', label: 'Private Journal', icon: IconBookOpen },
          { id: 'insights', label: 'Habits & Insights', icon: IconBarChart2 },
          { id: 'reminders', label: 'Reminders & Goals', icon: IconTarget }
        ].map((tab) => {
          const isActive = currentSection === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentSection(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                borderRadius: 'var(--radius-pill)',
                border: isActive ? '1px solid var(--accent-teal)' : '1px solid transparent',
                backgroundColor: isActive ? 'var(--accent-teal-soft-bg)' : 'transparent',
                color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              }}
            >
              <TabIcon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ============================================================== */}
      {/* 3. ACTIVE SUB-SECTION VIEW */}
      {/* ============================================================== */}

      {/* SECTION A: Coping Toolkit & Guided Activities */}
      {currentSection === 'toolkit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Breathing Showcase Card */}
          <section
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-color)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}
          >
            <div style={{ maxWidth: '500px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-teal)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                <IconWind size={15} />
                <span>Feature 1 • Guided Breathing</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
                Box Breathing Session
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                Follow an animated rhythm with gentle audio cues. Choose a 1-minute refresher or a deeper 3–5 minute session to settle tension.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-patient-primary"
                  onClick={() => {
                    setBreathingInitialDuration(60);
                    setIsBreathingOpen(true);
                  }}
                  style={{ padding: '0.65rem 1.35rem', fontSize: '0.92rem' }}
                >
                  <IconWind size={16} />
                  <span>Start 1-Min Session</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setBreathingInitialDuration(180);
                    setIsBreathingOpen(true);
                  }}
                  style={{ padding: '0.65rem 1.35rem', fontSize: '0.92rem' }}
                >
                  <span>3-Min Session</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setBreathingInitialDuration(300);
                    setIsBreathingOpen(true);
                  }}
                  style={{ padding: '0.65rem 1.35rem', fontSize: '0.92rem' }}
                >
                  <span>5-Min Session</span>
                </button>
              </div>
            </div>

            <div
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '30px',
                backgroundColor: 'var(--accent-teal-soft-bg)',
                border: '2px solid var(--accent-teal-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-teal)',
                flexShrink: 0
              }}
            >
              <div className="calm-breathing-orb listening" style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconWind size={36} />
              </div>
            </div>
          </section>

          {/* Coping Grid: Grounding, Wind-Down, Self-Care */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Grounding Exercise */}
            <div
              className="patient-action-card"
              onClick={() => setIsGroundingOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setIsGroundingOpen(true); }}
            >
              <div>
                <div className="patient-action-card-icon" style={{ backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)' }}>
                  <IconCompass size={22} />
                </div>
                <h3 className="patient-action-card-title">
                  5-4-3-2-1 Sensory Grounding
                </h3>
                <p className="patient-action-card-desc">
                  Recommended when feelings of overwhelm or racing thoughts arise. Gently connects you to what you see, touch, hear, and smell.
                </p>
              </div>
              <div className="patient-action-card-link">
                <span>Start grounding exercise</span>
                <IconChevronRight size={16} />
              </div>
            </div>

            {/* Wind-Down Routine */}
            <div
              className="patient-action-card"
              onClick={() => setIsWindDownOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setIsWindDownOpen(true); }}
            >
              <div>
                <div className="patient-action-card-icon" style={{ backgroundColor: 'var(--accent-warm-soft)', color: 'var(--accent-warm)' }}>
                  <IconMoonStar size={22} />
                </div>
                <h3 className="patient-action-card-title">
                  Evening Wind-Down Routine
                </h3>
                <p className="patient-action-card-desc">
                  Recommended when struggling to unwind before bed. Releases tension in the jaw and shoulders with a gentle digital sunset.
                </p>
              </div>
              <div className="patient-action-card-link">
                <span>Open wind-down guide</span>
                <IconChevronRight size={16} />
              </div>
            </div>

            {/* Journaling / Self-Care */}
            <div
              className="patient-action-card"
              onClick={() => setCurrentSection('journal')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setCurrentSection('journal'); }}
            >
              <div>
                <div className="patient-action-card-icon" style={{ backgroundColor: 'var(--status-support-bg)', color: 'var(--status-support-text)' }}>
                  <IconBookOpen size={22} />
                </div>
                <h3 className="patient-action-card-title">
                  Gentle Self-Care &amp; Journal
                </h3>
                <p className="patient-action-card-desc">
                  Recommended when feeling low or depleted. Write your thoughts or try a micro-pause with a warm cup of herbal tea.
                </p>
              </div>
              <div className="patient-action-card-link">
                <span>Open private journal</span>
                <IconChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: Daily Mood Tracker */}
      {currentSection === 'mood' && (
        <DailyMoodTrackerView
          onViewWithHistory={() => setActiveTab('results')}
          onShowToast={onShowToast}
        />
      )}

      {/* SECTION C: Private Journal */}
      {currentSection === 'journal' && (
        <PrivateJournalView onShowToast={onShowToast} />
      )}

      {/* SECTION D: Habits & Insights */}
      {currentSection === 'insights' && (
        <HabitInsightsView onShowToast={onShowToast} />
      )}

      {/* SECTION E: Reminders & Goals */}
      {currentSection === 'reminders' && (
        <RemindersGoalsView records={records} onShowToast={onShowToast} />
      )}

      {/* Quiet Non-Diagnostic Disclaimer */}
      <footer
        style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <IconShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
          <strong>Care notice:</strong>
        </span>
        <span>
          These wellness activities support self-reflection and personal comfort. They do not diagnose conditions or replace professional medical, psychiatric, or psychological care.
        </span>
      </footer>

      {/* ============================================================== */}
      {/* GUIDED EXERCISE MODALS */}
      {/* ============================================================== */}
      <GuidedBreathingModal
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
        initialDuration={breathingInitialDuration}
        onOpenMoodTracker={() => setCurrentSection('mood')}
      />

      <GroundingExerciseModal
        isOpen={isGroundingOpen}
        onClose={() => setIsGroundingOpen(false)}
        onOpenBreathing={() => {
          setBreathingInitialDuration(60);
          setIsBreathingOpen(true);
        }}
      />

      <WindDownModal
        isOpen={isWindDownOpen}
        onClose={() => setIsWindDownOpen(false)}
        onOpenBreathing={() => {
          setBreathingInitialDuration(60);
          setIsBreathingOpen(true);
        }}
      />
    </div>
  );
}
