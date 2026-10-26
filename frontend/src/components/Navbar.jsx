import React from 'react';
import {
  IconShieldCheck,
  IconLifeBuoy,
  IconUserCheck,
  IconStethoscope,
  IconSliders,
  IconSun,
  IconMoon
} from './Icons';

export default function Navbar({
  activeTab,
  setActiveTab,
  theme,
  toggleTheme,
  onEmergencyConnect,
  onOpenAuth,
  currentSession,
  userRole = 'PATIENT',
  setUserRole
}) {
  const currentRole = userRole || currentSession?.role || 'PATIENT';
  const doctorName = currentSession?.user?.fullName || currentSession?.user?.name;

  const handleRoleChange = (role) => {
    if (setUserRole) setUserRole(role);
    if (role === 'PATIENT') {
      setActiveTab('home');
    } else if (role === 'DOCTOR' || role === 'CLINICIAN') {
      setActiveTab('portal');
    } else if (role === 'ADMIN' || role === 'TECHNICAL') {
      setActiveTab('demo');
    }
  };

  return (
    <header className="nav-header">
      <div className="nav-container">
        {/* Branding (Left) */}
        <div className="brand-section" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-hex">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" opacity="0.3" />
              <path d="M12 6v12M6 12h12" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">MindVision</span>
            <span className="brand-subtitle">
              {currentRole === 'DOCTOR' || currentRole === 'CLINICIAN'
                ? 'Clinical Decision Support Workstation'
                : currentRole === 'ADMIN' || currentRole === 'TECHNICAL'
                ? 'Multimodal Telemetry & Research'
                : 'Your Wellness Check-in Companion'}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs based on Role */}
        <nav className="nav-links" aria-label="Main Navigation">
          {/* PATIENT ROLE NAVIGATION */}
          {(currentRole === 'PATIENT') && (
            <>
              <button
                className={`nav-link-btn ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => setActiveTab('home')}
              >
                Home
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'wellness' ? 'active' : ''}`}
                onClick={() => setActiveTab('wellness')}
              >
                Wellness Hub
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => setActiveTab('results')}
              >
                My Check-ins
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctors')}
              >
                Talk to Someone
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'docs' || activeTab === 'help' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
              >
                Help
              </button>
            </>
          )}

          {/* CLINICIAN ROLE NAVIGATION */}
          {(currentRole === 'DOCTOR' || currentRole === 'CLINICIAN') && (
            <>
              <button
                className={`nav-link-btn ${activeTab === 'portal' ? 'active' : ''}`}
                onClick={() => setActiveTab('portal')}
              >
                Clinician Portal
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => setActiveTab('results')}
              >
                Patient History
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'assessment' ? 'active' : ''}`}
                onClick={() => setActiveTab('assessment')}
              >
                Clinical Intake
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctors')}
              >
                Provider Network
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'demo' ? 'active' : ''}`}
                onClick={() => setActiveTab('demo')}
              >
                Simulator
              </button>
            </>
          )}

          {/* ADMIN / TECHNICAL ROLE NAVIGATION */}
          {(currentRole === 'ADMIN' || currentRole === 'TECHNICAL') && (
            <>
              <button
                className={`nav-link-btn ${activeTab === 'demo' ? 'active' : ''}`}
                onClick={() => setActiveTab('demo')}
              >
                Telemetry Sandbox
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin Audit
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'portal' ? 'active' : ''}`}
                onClick={() => setActiveTab('portal')}
              >
                Clinician Portal
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => setActiveTab('home')}
              >
                Patient View
              </button>
              <button
                className={`nav-link-btn ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
              >
                System Docs
              </button>
            </>
          )}
        </nav>

        {/* System & Navigation Actions */}
        <div className="nav-actions">
          {/* Internal Role Switcher - Gated strictly for Clinician/Technical Staff */}
          {(currentRole !== 'PATIENT') && (
            <div style={{
              display: 'inline-flex',
              padding: '2px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-color)',
              alignItems: 'center',
              height: '34px'
            }} title="Switch workstation perspective">
              <button
                type="button"
                onClick={() => handleRoleChange('PATIENT')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: currentRole === 'PATIENT' ? 'var(--color-primary)' : 'transparent',
                  color: currentRole === 'PATIENT' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  height: '28px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <IconUserCheck size={13} />
                <span>Patient</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('DOCTOR')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: (currentRole === 'DOCTOR' || currentRole === 'CLINICIAN') ? 'var(--color-primary)' : 'transparent',
                  color: (currentRole === 'DOCTOR' || currentRole === 'CLINICIAN') ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  height: '28px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <IconStethoscope size={13} />
                <span>Clinician</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('ADMIN')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: (currentRole === 'ADMIN' || currentRole === 'TECHNICAL') ? 'var(--color-primary)' : 'transparent',
                  color: (currentRole === 'ADMIN' || currentRole === 'TECHNICAL') ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  height: '28px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <IconSliders size={13} />
                <span>Technical</span>
              </button>
            </div>
          )}

          {/* Simple, Non-Alarming Privacy Reassurance for Patients */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0 0.85rem',
            height: '34px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--accent-teal-subtle)',
            color: 'var(--color-primary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: '1px solid var(--border-color)'
          }}>
            <IconShieldCheck size={14} />
            <span>Private &amp; Secure</span>
          </div>

          {/* Gentle, Calm Immediate Support Option */}
          <button
            type="button"
            onClick={onEmergencyConnect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'var(--status-support-bg)',
              color: 'var(--status-support-text)',
              border: '1px solid var(--status-support-border)',
              borderRadius: 'var(--radius-pill)',
              padding: '0 0.95rem',
              height: '34px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            title="Need immediate listening support or free crisis resources?"
          >
            <IconLifeBuoy size={14} />
            <span>Need help now?</span>
          </button>

          {/* Clinician Access Link */}
          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              padding: '0 0.65rem',
              height: '34px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 500,
              transition: 'all var(--transition-fast)'
            }}
            title="Clinician / Provider sign in"
          >
            <IconUserCheck size={14} style={{ color: 'var(--text-muted)' }} />
            <span>{currentRole === 'PATIENT' ? 'Provider login' : (doctorName || 'Staff Console')}</span>
          </button>

          {/* Theme Switcher */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            title={theme === 'dark' ? 'Switch to daylight theme' : 'Switch to evening theme'}
            style={{ height: '34px', width: '34px' }}
          >
            {theme === 'dark' ? (
              <IconSun size={15} />
            ) : (
              <IconMoon size={15} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
