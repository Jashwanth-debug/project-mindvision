import React, { useState } from 'react';
import { WellnessActivityService } from '../../services/wellnessStorageService';
import {
  IconX,
  IconMoonStar,
  IconCheck,
  IconArrowRight
} from '../Icons';

const WIND_DOWN_STEPS = [
  {
    step: 1,
    title: 'Physical Release: Drop the Shoulders & Unclench the Jaw',
    instruction: 'Let your shoulders drop down away from your ears. Gently unclamp your jaw and let your tongue rest loosely behind your teeth. Exhale completely.',
    duration: '1 minute pause'
  },
  {
    step: 2,
    title: 'Digital Sunset: Dim the Space Around You',
    instruction: 'Lower the brightness of your display or soften nearby room lights. Give your eyes a moment of low-contrast rest.',
    duration: 'Mindful transition'
  },
  {
    step: 3,
    title: 'Mental Clearing: Tomorrow Has Its Own Place',
    instruction: 'Acknowledge any unfinished tasks or lingering thoughts. Mentally place them in a quiet drawer for tomorrow morning. You do not need to solve them tonight.',
    duration: 'Peaceful closing'
  }
];

export default function WindDownModal({ isOpen, onClose, onOpenBreathing = null }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const currentStep = WIND_DOWN_STEPS[currentStepIdx];

  const handleNext = () => {
    if (currentStepIdx < WIND_DOWN_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      setIsCompleted(true);
      WellnessActivityService.recordSession({
        type: 'winddown',
        title: 'Calming Wind-Down Routine',
        durationSeconds: 180,
        notes: 'Completed evening wind-down routine to assist unwinding.'
      });
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleClose = () => {
    setCurrentStepIdx(0);
    setIsCompleted(false);
    onClose();
  };

  return (
    <div
      className="wellness-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wind-down-title"
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
          maxWidth: '540px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '2rem',
          position: 'relative',
          color: 'var(--text-primary)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--accent-warm)',
              backgroundColor: 'var(--accent-warm-soft)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <IconMoonStar size={13} />
            <span>Wind-Down Routine</span>
          </span>

          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-pill)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            aria-label="Close wind-down modal"
          >
            <IconX size={16} />
          </button>
        </div>

        {isCompleted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
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
              <IconCheck size={32} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              Space Prepared for Rest
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              Your mind and body are now invited to rest. Allow the evening to unfold gently at its own pace.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px', margin: '0 auto' }}>
              {onOpenBreathing && (
                <button
                  type="button"
                  className="btn-patient-primary"
                  onClick={() => {
                    handleClose();
                    onOpenBreathing();
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>Optional 1-Min Calming Breath</span>
                </button>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={handleClose}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Done for the Evening</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 id="wind-down-title" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
              Gentle Evening Wind-Down
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.45 }}>
              Unwinding isn't about forcing sleep; it's about signaling to your body that you are safe to slow down.
            </p>

            {/* Step Indicators */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
              {WIND_DOWN_STEPS.map((s, idx) => (
                <div
                  key={s.step}
                  style={{
                    flex: 1,
                    height: '5px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: idx <= currentStepIdx ? 'var(--accent-warm)' : 'var(--bg-secondary)',
                    transition: 'background-color var(--transition-base)'
                  }}
                />
              ))}
            </div>

            {/* Current Step */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-warm)', fontWeight: 700, marginBottom: '0.35rem' }}>
                Step {currentStepIdx + 1} of 3 • {currentStep.duration}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.75rem 0' }}>
                {currentStep.title}
              </h3>
              <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {currentStep.instruction}
              </p>
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStepIdx === 0}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.85rem',
                  color: currentStepIdx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                  cursor: currentStepIdx === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentStepIdx === 0 ? 0.5 : 1
                }}
              >
                Previous
              </button>

              <button
                type="button"
                className="btn-patient-primary"
                onClick={handleNext}
                style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem' }}
              >
                <span>{currentStepIdx === WIND_DOWN_STEPS.length - 1 ? 'Finish Wind-Down' : 'Next Step'}</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          This routine supports quiet self-reflection and does not replace medical advice or treatment for sleep disorders.
        </div>
      </div>
    </div>
  );
}
