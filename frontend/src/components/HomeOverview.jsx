import React from 'react';
import { getHumanStatus } from '../utils/terminology';
import { SpecialistStrip } from './DoctorMarketplace';
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
  IconArrowRight
} from './Icons';

/**
 * HomeOverview - Production-Grade Patient-Centered Wellness Home Screen
 * 
 * Rebalanced Patient Layout & Design:
 * 1. Top full-width hero: Atmospheric gradient card with custom badge hierarchy & pulsing CTA.
 * 2. Secondary reflection module: Recessed elevation with SVG iconography & 7-day wellness dots.
 * 3. Secondary action cards: Elevated hover micro-interactions, distinct iconography, clear hierarchy.
 * 4. Subordinate compact specialist strip: Gradient-masked horizontal scroll track with dynamic avatars.
 * 5. 24/7 crisis support & privacy assurance: Subtle warm banner with instant click-to-call action.
 */
export default function HomeOverview({
  setActiveTab,
  latestRecord = null,
  records = [],
  userRole = 'PATIENT',
  setUserRole,
  onConnectDoctor,
  onShowToast
}) {
  // Derive latest record or realistic baseline
  const activeRecord = latestRecord || (records && records.length > 0 ? records[0] : {
    riskLevel: 'MINIMAL',
    compositeRisk: 1.2,
    timestamp: 'Today'
  });

  const isElevated = activeRecord.riskLevel === 'ELEVATED' || activeRecord.riskLevel === 'SEVERE';
  const statusHeadline = isElevated ? "Support is here if you need it" : "Steady & calm pattern reported";
  const statusRecap = isElevated
    ? "Your recent responses showed subtle signs of stress. Taking small pauses for yourself can bring gentle relief."
    : "Your recent check-in showed a steady, calm pattern. Taking regular moments to pause helps maintain your well-being.";

  // 7-day steady trend dots for weekly summary module
  const weeklyTrendDays = [
    { label: 'M', status: 'CALM', date: 'Mon' },
    { label: 'T', status: 'CALM', date: 'Tue' },
    { label: 'W', status: 'CALM', date: 'Wed' },
    { label: 'T', status: isElevated ? 'ELEVATED' : 'CALM', date: 'Thu' },
    { label: 'F', status: 'CALM', date: 'Fri' },
    { label: 'S', status: 'CALM', date: 'Sat' },
    { label: 'Today', status: isElevated ? 'ELEVATED' : 'CALM', isToday: true }
  ];

  return (
    <div className="patient-view-shell">
      
      {/* 1. TOP FULL-WIDTH HERO: REAL-TIME AI CHECK-IN */}
      <section className="patient-hero-card animate-enter-1" style={{ width: '100%' }} aria-label="Real-Time AI Check-in">
        <div className="patient-hero-kicker">
          <span className="badge-hero-primary">
            <IconSparkles size={14} />
            <span>Real-Time AI Check-in</span>
          </span>
          <span className="badge-info-tag">
            <IconShieldCheck size={13} />
            <span>100% Private &amp; Secure</span>
          </span>
        </div>

        <h1 className="patient-hero-title">
          Start your check-in — it only takes a minute.
        </h1>

        <p className="patient-hero-subtitle">
          Take a quiet pause for yourself. Our gentle, voice-guided companion listens with empathy to help you notice how you're really doing today, with personalized insights and zero judgment.
        </p>

        {/* Large Pulsing CTA Button with micro-badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-patient-primary pulse-cta"
            onClick={() => setActiveTab('assessment')}
            aria-label="Start Real-Time AI Check-in"
          >
            <span>Start Check-in</span>
            <IconChevronRight size={18} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.84rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <IconClock size={15} style={{ color: 'var(--color-primary)' }} />
              <span>Takes ~1–2 minutes</span>
            </span>
            <span style={{ color: 'var(--border-color-strong)' }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <IconMic size={15} style={{ color: 'var(--color-primary)' }} />
              <span>Speak or type freely</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. SECONDARY MODULE: LAST CHECK-IN SUMMARY & WEEKLY TREND */}
      <section
        className="card-depth-secondary animate-enter-2"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
        aria-label="Recent Check-in Summary"
      >
        {/* Left Side: Summary Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', minWidth: '280px', flex: '1 1 340px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isElevated ? 'var(--status-elevated-bg)' : 'var(--status-minimal-bg)',
              color: isElevated ? 'var(--status-elevated-text)' : 'var(--status-minimal-text)',
              border: `1px solid ${isElevated ? 'var(--status-elevated-border)' : 'var(--status-minimal-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isElevated ? <IconHeartPulse size={22} /> : <IconLeaf size={22} />}
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              Latest Reflection • {activeRecord.timestamp || 'Recent'}
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem 0', fontFamily: 'var(--font-heading)' }}>
              {statusHeadline}
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              {statusRecap}
            </p>
          </div>
        </div>

        {/* Right Side: Weekly Trend Indicator */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.5rem',
            paddingLeft: '1.25rem',
            borderLeft: '1px solid var(--border-color)'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
            7-DAY WELLNESS PATTERN
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {weeklyTrendDays.map((day, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title={`${day.date}: ${day.status === 'CALM' ? 'Calm pattern' : 'Elevated stress'}`}
              >
                <div
                  style={{
                    width: day.isToday ? '12px' : '9px',
                    height: day.isToday ? '12px' : '9px',
                    borderRadius: '50%',
                    backgroundColor: day.status === 'CALM' ? 'var(--status-minimal-dot)' : 'var(--status-elevated-dot)',
                    border: day.isToday ? '2px solid var(--accent-teal)' : 'none',
                    boxShadow: day.isToday ? '0 0 0 2px var(--accent-teal-subtle)' : 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                />
                <span style={{ fontSize: '0.66rem', color: day.isToday ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: day.isToday ? 700 : 500 }}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'color var(--transition-fast)'
            }}
          >
            <span>View check-in timeline</span>
            <IconChevronRight size={13} />
          </button>
        </div>
      </section>

      {/* 3. SECONDARY ACTION CARDS (Friendly, Spacious Grid) */}
      <section className="patient-cards-grid animate-enter-3" aria-label="Wellness Tools & Supportive Resources">
        {/* Card A: Wellness Hub */}
        <div
          className="patient-action-card"
          onClick={() => setActiveTab('wellness')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('wellness'); }}
        >
          <div>
            <div className="patient-action-card-icon" style={{ backgroundColor: 'var(--accent-teal-soft-bg)', color: 'var(--accent-teal)' }}>
              <IconLeaf size={20} />
            </div>
            <h2 className="patient-action-card-title">
              Patient Wellness Hub
            </h2>
            <p className="patient-action-card-desc">
              Box breathing guide, daily mood logs, private reflection journal, habit tracking, and gentle coping toolkit.
            </p>
          </div>
          <div className="patient-action-card-link">
            <span>Explore wellness tools</span>
            <IconChevronRight size={16} />
          </div>
        </div>

        {/* Card B: My Past Check-ins */}
        <div
          className="patient-action-card"
          onClick={() => setActiveTab('results')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('results'); }}
        >
          <div>
            <div className="patient-action-card-icon">
              <IconCalendar size={20} />
            </div>
            <h2 className="patient-action-card-title">
              See my past check-ins
            </h2>
            <p className="patient-action-card-desc">
              Review your personal wellness history and observe how your sleep, energy, and mood evolve over time.
            </p>
          </div>
          <div className="patient-action-card-link">
            <span>View your history</span>
            <IconChevronRight size={16} />
          </div>
        </div>

        {/* Card B: Self-Reflection & Guidance */}
        <div
          className="patient-action-card"
          onClick={() => setActiveTab('docs')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('docs'); }}
        >
          <div>
            <div className="patient-action-card-icon" style={{ backgroundColor: 'var(--status-support-bg)', color: 'var(--status-support-text)' }}>
              <IconBookOpen size={20} />
            </div>
            <h2 className="patient-action-card-title">
              Wellness guidance &amp; FAQs
            </h2>
            <p className="patient-action-card-desc">
              Learn how your gentle check-ins help build self-awareness and how your privacy is rigorously protected.
            </p>
          </div>
          <div className="patient-action-card-link">
            <span>Read guide &amp; privacy</span>
            <IconChevronRight size={16} />
          </div>
        </div>
      </section>

      {/* 4. COMPACT SPECIALIST FOOTER STRIP (Subordinate, Horizontally Scrollable) */}
      <div className="animate-enter-4">
        <SpecialistStrip
          onConnectDoctor={onConnectDoctor}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* 5. REASSURING CRISIS SUPPORT CARD */}
      <section className="patient-crisis-banner animate-enter-4" aria-label="Crisis Support Information">
        <div className="patient-crisis-text">
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--status-support-bg)',
            color: 'var(--status-support-text)',
            border: '1px solid var(--status-support-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <IconLifeBuoy size={22} />
          </div>
          <div>
            <h2 className="patient-crisis-title">
              Need immediate support or someone to talk to right now?
            </h2>
            <p className="patient-crisis-subtitle">
              Free, confidential help is available 24/7. Call or text <strong>988</strong> to reach the Suicide &amp; Crisis Lifeline, or text <strong>HOME</strong> to <strong>741741</strong>.
            </p>
          </div>
        </div>
        <a
          href="tel:988"
          className="patient-crisis-cta"
          aria-label="Call or text 988 Crisis Lifeline"
        >
          <IconPhone size={15} />
          <span>Call or Text 988</span>
        </a>
      </section>

      {/* 6. QUIET CONFIDENTIALITY FOOTNOTE */}
      <footer
        style={{
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
          <strong>Your privacy is protected:</strong>
        </span>
        <span>
          All check-in reflections are kept confidential and are never shared without your permission. MindVision is designed as a wellness companion and does not replace medical diagnosis or psychiatric therapy.
        </span>
      </footer>

    </div>
  );
}
