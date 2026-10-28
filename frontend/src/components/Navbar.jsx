import React, { useState, useRef } from 'react';
import {
  IconShieldCheck,
  IconLifeBuoy,
  IconUserCheck,
  IconStethoscope,
  IconSliders,
  IconSun,
  IconMoon,
  IconMenu,
  IconX
} from './Icons';
import { Drawer, IconButton, InteractiveButton } from './primitives';
import NetworkStatusBadge from './NetworkStatusBadge';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hamburgerBtnRef = useRef(null);

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

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleEmergencyClick = () => {
    setIsMobileMenuOpen(false);
    if (onEmergencyConnect) {
      onEmergencyConnect();
    } else {
      setActiveTab('crisis');
    }
  };

  return (
    <header className="nav-header">
      <div className="nav-container">
        {/* Left Section: Brand & Mobile Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Mobile Hamburger Menu Toggle */}
          <button
            ref={hamburgerBtnRef}
            type="button"
            className="mobile-nav-toggle"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              minHeight: '44px',
              minWidth: '44px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMobileMenuOpen ? <IconX size={22} /> : <IconMenu size={22} />}
          </button>

          {/* Branding (Left) */}
          <div
            className="brand-section"
            onClick={() => handleNavClick('home')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavClick('home');
              }
            }}
            aria-label="MindVision home"
            style={{ cursor: 'pointer' }}
          >
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
        </div>

        {/* Dynamic Desktop Navigation Tabs */}
        <nav className="nav-links" aria-label="Main Navigation">
          {/* PATIENT ROLE NAVIGATION */}
          {currentRole === 'PATIENT' && (
            <>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => handleNavClick('home')}
              >
                <span>Home</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'assessments' ? 'active' : ''}`}
                onClick={() => handleNavClick('assessments')}
              >
                <span>Assessments</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'wellness' ? 'active' : ''}`}
                onClick={() => handleNavClick('wellness')}
              >
                <span>Wellness Hub</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => handleNavClick('results')}
              >
                <span>My Check-ins</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => handleNavClick('doctors')}
              >
                <span>Talk to Someone</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'docs' || activeTab === 'help' ? 'active' : ''}`}
                onClick={() => handleNavClick('docs')}
              >
                <span>Help</span>
              </button>
            </>
          )}

          {/* CLINICIAN ROLE NAVIGATION */}
          {(currentRole === 'DOCTOR' || currentRole === 'CLINICIAN') && (
            <>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'portal' ? 'active' : ''}`}
                onClick={() => handleNavClick('portal')}
              >
                <span>Clinician Portal</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => handleNavClick('results')}
              >
                <span>Patient History</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'assessment' ? 'active' : ''}`}
                onClick={() => handleNavClick('assessment')}
              >
                <span>Clinical Intake</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => handleNavClick('doctors')}
              >
                <span>Provider Network</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'demo' ? 'active' : ''}`}
                onClick={() => handleNavClick('demo')}
              >
                <span>Simulator</span>
              </button>
            </>
          )}

          {/* ADMIN / TECHNICAL ROLE NAVIGATION */}
          {(currentRole === 'ADMIN' || currentRole === 'TECHNICAL') && (
            <>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'demo' ? 'active' : ''}`}
                onClick={() => handleNavClick('demo')}
              >
                <span>Telemetry Sandbox</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => handleNavClick('admin')}
              >
                <span>Admin Audit</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'portal' ? 'active' : ''}`}
                onClick={() => handleNavClick('portal')}
              >
                <span>Clinician Portal</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => handleNavClick('home')}
              >
                <span>Patient View</span>
              </button>
              <button
                type="button"
                className={`nav-link-btn ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => handleNavClick('docs')}
              >
                <span>System Docs</span>
              </button>
            </>
          )}
        </nav>

        {/* System & Navigation Actions */}
        <div className="nav-actions">
          {/* Internal Role Switcher - Gated for Clinician/Staff */}
          {currentRole !== 'PATIENT' && (
            <div
              style={{
                display: 'inline-flex',
                padding: '2px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-color)',
                alignItems: 'center',
                height: '34px'
              }}
              title="Switch workstation perspective"
            >
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
                  transition: 'all var(--motion-fast) var(--motion-ease-out)'
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
                  transition: 'all var(--motion-fast) var(--motion-ease-out)'
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
                  transition: 'all var(--motion-fast) var(--motion-ease-out)'
                }}
              >
                <IconSliders size={13} />
                <span>Technical</span>
              </button>
            </div>
          )}

          {/* Privacy Reassurance Badge */}
          <div
            className="nav-privacy-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0 0.85rem',
              height: '34px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--accent-teal-subtle)',
              color: 'var(--accent-teal)',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: '1px solid var(--accent-teal-border)'
            }}
          >
            <IconShieldCheck size={14} />
            <span>Private &amp; Secure</span>
          </div>

          {/* Real-Time Connectivity / Offline Status Badge */}
          <NetworkStatusBadge />

          {/* Instant Safety-Critical Crisis Support Button */}
          <button
            type="button"
            className="nav-help-now-btn"
            onClick={handleEmergencyClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: activeTab === 'crisis' ? 'var(--status-support-border)' : 'var(--status-support-bg)',
              color: 'var(--status-support-text)',
              border: '1px solid var(--status-support-border)',
              borderRadius: 'var(--radius-pill)',
              padding: '0 0.95rem',
              height: '34px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color var(--motion-fast) var(--motion-ease-out), transform var(--motion-fast) var(--motion-ease-out)'
            }}
            title="Need immediate listening support or free crisis resources?"
            aria-label="Need immediate crisis support or help now"
          >
            <IconLifeBuoy size={14} />
            <span>Need help now?</span>
          </button>

          {/* Provider Login Action */}
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
              transition: 'all var(--motion-fast) var(--motion-ease-out)'
            }}
            title="Clinician / Provider sign in"
          >
            <IconUserCheck size={14} style={{ color: 'var(--text-muted)' }} />
            <span>{currentRole === 'PATIENT' ? 'Provider login' : (doctorName || 'Staff Console')}</span>
          </button>

          {/* Theme Switcher */}
          <IconButton
            icon={theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
            label={theme === 'dark' ? 'Switch to daylight theme' : 'Switch to evening theme'}
            onClick={toggleTheme}
            style={{ height: '34px', width: '34px', minHeight: '34px', minWidth: '34px' }}
          />
        </div>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => {
          setIsMobileMenuOpen(false);
          if (hamburgerBtnRef.current) hamburgerBtnRef.current.focus();
        }}
        title="MindVision Navigation"
        subtitle={currentRole === 'PATIENT' ? 'Wellness Companion' : 'Workstation'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Safety First Emergency CTA */}
          <button
            type="button"
            onClick={handleEmergencyClick}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              backgroundColor: 'var(--status-support-bg)',
              color: 'var(--status-support-text)',
              border: '1.5px solid var(--status-support-border)',
              borderRadius: 'var(--radius-pill)',
              padding: '0.85rem',
              fontSize: '0.98rem',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            <IconLifeBuoy size={18} />
            <span>Need help now? (Free 24/7 Support)</span>
          </button>

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Navigation Menu
            </span>

            {currentRole === 'PATIENT' && (
              <>
                <InteractiveButton
                  variant={activeTab === 'home' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('home')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Home Overview
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'assessments' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('assessments')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Assessment Centre
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'wellness' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('wellness')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Wellness Hub
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'results' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('results')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  My Check-ins
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'doctors' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('doctors')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Talk to Someone
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'docs' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('docs')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Help &amp; FAQs
                </InteractiveButton>
              </>
            )}

            {(currentRole === 'DOCTOR' || currentRole === 'CLINICIAN') && (
              <>
                <InteractiveButton
                  variant={activeTab === 'portal' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('portal')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Clinician Portal
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'results' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('results')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Patient History
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'assessment' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('assessment')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Clinical Intake
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'doctors' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('doctors')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Provider Network
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'demo' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('demo')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Simulator
                </InteractiveButton>
              </>
            )}

            {(currentRole === 'ADMIN' || currentRole === 'TECHNICAL') && (
              <>
                <InteractiveButton
                  variant={activeTab === 'demo' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('demo')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Telemetry Sandbox
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'admin' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('admin')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Admin Audit
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'portal' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('portal')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Clinician Portal
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'home' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('home')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  Patient View
                </InteractiveButton>
                <InteractiveButton
                  variant={activeTab === 'docs' ? 'primary' : 'ghost'}
                  onClick={() => handleNavClick('docs')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  System Docs
                </InteractiveButton>
              </>
            )}
          </div>

          {/* Account / Provider Link */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <InteractiveButton
              variant="outline"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAuth();
              }}
              style={{ width: '100%' }}
            >
              {currentRole === 'PATIENT' ? 'Provider Sign In' : (doctorName || 'Staff Console')}
            </InteractiveButton>
          </div>
        </div>
      </Drawer>
    </header>
  );
}
