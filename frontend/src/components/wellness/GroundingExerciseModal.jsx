import React, { useState } from 'react';
import { WellnessActivityService } from '../../services/wellnessStorageService';
import {
  IconX,
  IconEye,
  IconHand,
  IconEar,
  IconCoffee,
  IconSmile,
  IconCheck,
  IconArrowRight,
  IconSparkles
} from '../Icons';

const GROUNDING_STEPS = [
  {
    step: 5,
    title: '5 Things You Can See',
    prompt: 'Look around the room or outside. Notice 5 objects, colors, or textures nearby.',
    icon: IconEye,
    examples: ['A shadow on the wall', 'A pen on the table', 'Green leaves outside', 'Texture of the rug', 'The light in the ceiling'],
    placeholder: 'e.g., Wooden desk, blue coffee mug, sunlight on the floor...'
  },
  {
    step: 4,
    title: '4 Things You Can Feel',
    prompt: 'Bring attention to your physical body. Notice 4 tactile sensations.',
    icon: IconHand,
    examples: ['Feet resting on the ground', 'Fabric of your clothing', 'Cool air on your skin', 'Smooth surface of your desk'],
    placeholder: 'e.g., Warmth in hands, weight of chair, soft sleeves...'
  },
  {
    step: 3,
    title: '3 Things You Can Hear',
    prompt: 'Listen quietly. Pay attention to 3 sounds in your environment or distant background.',
    icon: IconEar,
    examples: ['Hum of a computer fan', 'Distant birds or street sounds', 'Sound of your own breath'],
    placeholder: 'e.g., Clock ticking, gentle breeze, hum of AC...'
  },
  {
    step: 2,
    title: '2 Things You Can Smell',
    prompt: 'Notice 2 scents in the air, or recall two comforting scents you enjoy.',
    icon: IconCoffee,
    examples: ['Fresh air', 'Coffee or tea', 'Soothing soap', 'Rain on pavement'],
    placeholder: 'e.g., Herbal tea, fresh morning air...'
  },
  {
    step: 1,
    title: '1 Thing You Can Taste or Appreciate',
    prompt: 'Notice a taste in your mouth, take a small sip of water, or identify 1 positive thought about yourself.',
    icon: IconSmile,
    examples: ['A sip of cool water', 'Mint or aftertaste of lunch', 'Appreciation for taking this moment'],
    placeholder: 'e.g., Fresh water, taking care of myself right now...'
  }
];

export default function GroundingExerciseModal({ isOpen, onClose, onOpenBreathing = null }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [userInputs, setUserInputs] = useState(['', '', '', '', '']);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const currentStep = GROUNDING_STEPS[currentStepIdx];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIdx < GROUNDING_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      // Completed all 5 steps
      setIsCompleted(true);
      WellnessActivityService.recordSession({
        type: 'grounding',
        title: '5-4-3-2-1 Sensory Grounding',
        durationSeconds: 120,
        notes: 'Completed 5-4-3-2-1 grounding exercise to alleviate feeling overwhelmed.'
      });
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIdx(0);
    setUserInputs(['', '', '', '', '']);
    setIsCompleted(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div
      className="wellness-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grounding-exercise-title"
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
              color: 'var(--accent-teal)',
              backgroundColor: 'var(--accent-teal-soft-bg)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <IconSparkles size={13} />
            <span>Sensory Grounding</span>
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
            aria-label="Close grounding exercise"
          >
            <IconX size={16} />
          </button>
        </div>

        {isCompleted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
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
              <IconCheck size={34} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              Grounding Complete
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              By connecting with your five senses, you gently anchored yourself in the present moment. Notice the solid ground beneath you.
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
                  <span>Follow with 1-Min Box Breathing</span>
                  <IconArrowRight size={16} />
                </button>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Repeat Exercise</span>
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
                Return to Wellness Hub
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 id="grounding-exercise-title" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
              5-4-3-2-1 Sensory Grounding
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.45 }}>
              When feelings of overwhelm arise, gently shifting focus to your immediate senses helps your mind and body return to center.
            </p>

            {/* Step Indicator */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
              {GROUNDING_STEPS.map((s, idx) => (
                <div
                  key={s.step}
                  style={{
                    flex: 1,
                    height: '5px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: idx <= currentStepIdx ? 'var(--accent-teal)' : 'var(--bg-secondary)',
                    transition: 'background-color var(--transition-base)'
                  }}
                />
              ))}
            </div>

            {/* Current Step Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-teal-soft-bg)',
                    color: 'var(--accent-teal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <StepIcon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Step {currentStepIdx + 1} of 5
                  </div>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {currentStep.title}
                  </h3>
                </div>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                {currentStep.prompt}
              </p>

              {/* Ideas / Examples */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                <strong>Ideas:</strong> {currentStep.examples.join(' • ')}
              </div>

              {/* Optional Text Input for mindful grounding */}
              <input
                type="text"
                value={userInputs[currentStepIdx]}
                onChange={(e) => {
                  const val = e.target.value;
                  setUserInputs((prev) => {
                    const copy = [...prev];
                    copy[currentStepIdx] = val;
                    return copy;
                  });
                }}
                placeholder={currentStep.placeholder}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
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
                <span>{currentStepIdx === GROUNDING_STEPS.length - 1 ? 'Finish Grounding' : 'Next Sense'}</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          This grounding technique promotes self-reflection and does not replace medical or psychological care.
        </div>
      </div>
    </div>
  );
}
