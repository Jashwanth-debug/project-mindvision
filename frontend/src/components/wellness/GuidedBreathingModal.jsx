import React, { useState, useEffect, useRef } from 'react';
import { WellnessAudioEngine, WellnessActivityService } from '../../services/wellnessStorageService';
import {
  IconX,
  IconPlay,
  IconPause,
  IconSquare,
  IconVolume2,
  IconVolumeX,
  IconSparkles,
  IconCheck,
  IconClock,
  IconSmile
} from '../Icons';

// Box Breathing timing: 4s Inhale, 4s Hold, 4s Exhale, 4s Hold
const PHASES = [
  { name: 'Inhale', duration: 4, instruction: 'Breathe in slowly through your nose', scale: 1.35 },
  { name: 'Hold', duration: 4, instruction: 'Gently hold your breath with relaxed shoulders', scale: 1.35 },
  { name: 'Exhale', duration: 4, instruction: 'Release your breath gently through your mouth', scale: 0.85 },
  { name: 'Hold', duration: 4, instruction: 'Pause quietly before your next breath', scale: 0.85 }
];

export default function GuidedBreathingModal({
  isOpen,
  onClose,
  onOpenMoodTracker = null,
  initialDuration = 60 // 60, 180, or 300 seconds
}) {
  const [selectedDuration, setSelectedDuration] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Breathing cycle tracking
  const [phaseIndex, setPhaseIndex] = useState(0); // 0 to 3
  const [secondsLeftInPhase, setSecondsLeftInPhase] = useState(PHASES[0].duration);
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);

  const timerRef = useRef(null);

  // Check system reduced-motion preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const listener = (e) => setReducedMotion(e.matches);
      mediaQuery.addEventListener?.('change', listener);
      return () => mediaQuery.removeEventListener?.('change', listener);
    }
  }, []);

  // Sync initial duration when prop changes
  useEffect(() => {
    if (initialDuration) {
      setSelectedDuration(initialDuration);
    }
  }, [initialDuration]);

  // Main countdown & phase transition loop
  useEffect(() => {
    if (!isActive || isPaused || isCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeftInPhase((prevPhaseSec) => {
        if (prevPhaseSec > 1) {
          return prevPhaseSec - 1;
        }

        // Transition to next phase
        setPhaseIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % PHASES.length;
          const nextPhase = PHASES[nextIndex];

          // Trigger audio chime for new phase
          WellnessAudioEngine.playPhaseChime(nextPhase.name.toLowerCase(), isMuted);

          if (nextIndex === 0) {
            setCompletedCycles((c) => c + 1);
          }
          return nextIndex;
        });

        return PHASES[(phaseIndex + 1) % PHASES.length].duration;
      });

      setTotalSecondsElapsed((prevTotal) => {
        const nextTotal = prevTotal + 1;
        if (nextTotal >= selectedDuration) {
          // Session Completed
          handleSessionComplete();
          return selectedDuration;
        }
        return nextTotal;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, isCompleted, phaseIndex, selectedDuration, isMuted]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setIsCompleted(false);
    setPhaseIndex(0);
    setSecondsLeftInPhase(PHASES[0].duration);
    setTotalSecondsElapsed(0);
    setCompletedCycles(0);

    // Initial chime
    WellnessAudioEngine.playPhaseChime('inhale', isMuted);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    WellnessAudioEngine.playPhaseChime(PHASES[phaseIndex].name.toLowerCase(), isMuted);
  };

  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsPaused(false);
    setSecondsLeftInPhase(PHASES[0].duration);
    setPhaseIndex(0);
    setTotalSecondsElapsed(0);
  };

  const handleSessionComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsPaused(false);
    setIsCompleted(true);

    WellnessAudioEngine.playPhaseChime('complete', isMuted);

    // Save session in local wellness storage
    const minutes = Math.round(selectedDuration / 60);
    WellnessActivityService.recordSession({
      type: 'breathing',
      title: `Box Breathing (${minutes} min)`,
      durationSeconds: selectedDuration,
      cycles: completedCycles + 1,
      notes: 'Completed calm box breathing exercise.'
    });
  };

  const handleClose = () => {
    handleStop();
    setIsCompleted(false);
    onClose();
  };

  if (!isOpen) return null;

  const currentPhase = PHASES[phaseIndex];
  const percentComplete = Math.min(100, Math.round((totalSecondsElapsed / selectedDuration) * 100));

  return (
    <div
      className="wellness-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-breathing-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 15, 21, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="wellness-modal-card animate-enter-1"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          color: 'var(--text-primary)'
        }}
      >
        {/* Top Header Controls */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--accent-teal)',
                backgroundColor: 'var(--accent-teal-soft-bg)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              <IconSparkles size={13} />
              <span>Box Breathing</span>
            </span>

            {/* Reduced motion badge / toggle */}
            <button
              type="button"
              onClick={() => setReducedMotion(!reducedMotion)}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-pill)',
                padding: '2px 8px',
                fontSize: '0.72rem',
                color: reducedMotion ? 'var(--accent-teal)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
              title="Toggle reduced motion visual mode"
              aria-label="Toggle reduced motion mode"
            >
              {reducedMotion ? 'Reduced motion: On' : 'Reduced motion: Off'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Audio Mute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-pill)',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isMuted ? 'var(--text-muted)' : 'var(--accent-teal)',
                cursor: 'pointer'
              }}
              title={isMuted ? 'Unmute gentle tones' : 'Mute gentle tones'}
              aria-label={isMuted ? 'Unmute gentle tones' : 'Mute gentle tones'}
            >
              {isMuted ? <IconVolumeX size={16} /> : <IconVolume2 size={16} />}
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-pill)',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              aria-label="Close breathing session"
            >
              <IconX size={17} />
            </button>
          </div>
        </div>

        {/* Modal Title */}
        <h2 id="guided-breathing-title" style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0 0 0.35rem 0', textAlign: 'center' }}>
          Guided Box Breathing
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', textAlign: 'center', maxWidth: '420px', lineHeight: 1.5 }}>
          A 4-4-4-4 rhythm to soothe your nervous system. Inhale 4s, hold 4s, exhale 4s, and hold 4s.
        </p>

        {/* ============================================================== */}
        {/* COMPLETION VIEW */}
        {/* ============================================================== */}
        {isCompleted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0', width: '100%' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-minimal-bg)',
                color: 'var(--status-minimal-text)',
                border: '2px solid var(--status-minimal-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto'
              }}
            >
              <IconCheck size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              Breathing Session Complete
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              Take a quiet moment to notice how your chest, shoulders, and breath feel right now.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}
            >
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                  {Math.round(selectedDuration / 60)} min
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Duration
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }} />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                  {completedCycles || Math.round(selectedDuration / 16)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Breath Cycles
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
              {onOpenMoodTracker && (
                <button
                  type="button"
                  className="btn-patient-primary"
                  onClick={() => {
                    handleClose();
                    onOpenMoodTracker();
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <IconSmile size={16} />
                  <span>Log Mood in Tracker</span>
                </button>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={handleStart}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Breathe Again</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* DURATION SELECTOR (Shown before starting or when stopped) */}
            {!isActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Session Length:
                </span>
                {[
                  { label: '1 Minute', seconds: 60 },
                  { label: '3 Minutes', seconds: 180 },
                  { label: '5 Minutes', seconds: 300 }
                ].map((opt) => (
                  <button
                    key={opt.seconds}
                    type="button"
                    onClick={() => setSelectedDuration(opt.seconds)}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedDuration === opt.seconds ? '1.5px solid var(--accent-teal)' : '1px solid var(--border-color)',
                      backgroundColor: selectedDuration === opt.seconds ? 'var(--accent-teal-soft-bg)' : 'var(--bg-secondary)',
                      color: selectedDuration === opt.seconds ? 'var(--accent-teal)' : 'var(--text-secondary)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* ============================================================== */}
            {/* ANIMATED BREATHING GUIDE ORB / BOX */}
            {/* ============================================================== */}
            <div
              style={{
                width: '260px',
                height: '260px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0.5rem 0 1.5rem 0'
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {/* Outer guide track */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '32px',
                  border: '2px dashed var(--border-color)',
                  opacity: 0.6
                }}
              />

              {/* Pulsing Guide Container */}
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '28px',
                  backgroundColor: 'var(--accent-teal-soft-bg)',
                  border: '2.5px solid var(--accent-teal)',
                  boxShadow: isActive
                    ? '0 0 35px var(--accent-teal-subtle)'
                    : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: reducedMotion
                    ? 'none'
                    : 'transform 3.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease',
                  transform: reducedMotion
                    ? 'none'
                    : isActive
                    ? `scale(${currentPhase.scale})`
                    : 'scale(1.0)'
                }}
              >
                {/* Phase Instruction & Countdown */}
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '0.2rem' }}>
                  {isActive ? currentPhase.name : 'Ready'}
                </div>

                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
                  {isActive ? secondsLeftInPhase : '4'}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {isActive ? `Cycle #${completedCycles + 1}` : 'Box 4-4-4-4'}
                </div>
              </div>
            </div>

            {/* Instruction Text Cues for High Accessibility */}
            <div style={{ textAlign: 'center', minHeight: '38px', marginBottom: '1.25rem', padding: '0 1rem' }}>
              <p style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.2rem 0' }}>
                {isActive ? currentPhase.instruction : 'Sit comfortably, relax your jaw, and click Start when ready.'}
              </p>
              {isActive && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Phase {phaseIndex + 1} of 4 • {selectedDuration - totalSecondsElapsed}s remaining
                </div>
              )}
            </div>

            {/* Progress bar across session */}
            {isActive && (
              <div
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  height: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-pill)',
                  overflow: 'hidden',
                  marginBottom: '1.5rem'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percentComplete}%`,
                    backgroundColor: 'var(--accent-teal)',
                    transition: 'width 1s linear'
                  }}
                />
              </div>
            )}

            {/* ============================================================== */}
            {/* INTERACTIVE CONTROLS (Start, Pause, Resume, Stop) */}
            {/* ============================================================== */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {!isActive ? (
                <button
                  type="button"
                  className="btn-patient-primary"
                  onClick={handleStart}
                  style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                >
                  <IconPlay size={18} />
                  <span>Start Breathing</span>
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      type="button"
                      className="btn-patient-primary"
                      onClick={handleResume}
                      style={{ padding: '0.65rem 1.4rem' }}
                    >
                      <IconPlay size={16} />
                      <span>Resume</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handlePause}
                      style={{ padding: '0.65rem 1.4rem' }}
                    >
                      <IconPause size={16} />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStop}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1.25rem',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <IconSquare size={14} />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Quiet disclaimer */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Guided breathing supports nervous system relaxation. It is a self-care tool and does not replace medical treatment.
        </div>
      </div>
    </div>
  );
}
