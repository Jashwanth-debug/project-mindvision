import React from 'react';

/**
 * MindVision Clinical AI - Explainability & Feature Contribution Modal
 *
 * Provides rigorous, non-diagnostic attribution breakdowns:
 * - Signal contribution points and percentages based on actual implemented weights
 * - Explicit categorization of:
 *   1. User-reported information
 *   2. Measured signal features
 *   3. Model predictions
 *   4. Rule-based calculations
 *   5. AI-generated interpretations
 * - Modality availability and data provenance verification
 * - Strict non-diagnostic disclaimer compliance
 */

export default function ExplainabilityModal({
  isOpen,
  onClose,
  metrics,
  qualityReport,
  mode = 'SANDBOX'
}) {
  if (!isOpen || !metrics) return null;

  const hasFacial = metrics.hasFacialTelemetry ?? metrics.hasFacial ?? Boolean(metrics.au4 > 0 || metrics.au15 > 0);
  const hasAudio = metrics.hasAudioTelemetry ?? metrics.hasAudio ?? Boolean(metrics.acousticJitter > 0 || metrics.prosody > 0);
  const isTextValid = metrics.isTextValid ?? Boolean(metrics.textSentiment !== undefined || (metrics.text && metrics.text.length > 5));

  const au4 = hasFacial ? (metrics.au4 || 0) : 0;
  const au15 = hasFacial ? (metrics.au15 || 0) : 0;
  const acousticJitter = hasAudio ? (metrics.acousticJitter || metrics.prosody || 0) : 0;
  const textSentiment = isTextValid ? (metrics.textSentiment || metrics.sentiment || 0.15) : 0.15;
  const compositeRisk = metrics.compositeRisk || 1.0;
  const incongruenceIndex = metrics.incongruenceIndex || metrics.incongruence || 0.0;

  // Retrieve actual scaled weights from inputMetadata if available, or compute according to exact implementation
  const metadataWeights = metrics.inputMetadata?.provenance?.ruleBasedCalculations?.scaledWeights;

  const baseWeights = {
    au4: hasFacial ? 2.2 : 0,
    au15: hasFacial ? 1.8 : 0,
    jitter: hasAudio ? 2.0 : 0,
    text: isTextValid ? (hasFacial && hasAudio ? 4.0 : (!hasFacial && !hasAudio ? 10.0 : 5.5)) : 0
  };
  const totalBase = (baseWeights.au4 + baseWeights.au15 + baseWeights.jitter + baseWeights.text) || 1.0;
  const scale = totalBase > 0 ? (10.0 / totalBase) : 1.0;

  const au4Weight = metadataWeights?.au4 ?? (baseWeights.au4 * scale);
  const au15Weight = metadataWeights?.au15 ?? (baseWeights.au15 * scale);
  const jitterWeight = metadataWeights?.jitter ?? (baseWeights.jitter * scale);
  const textWeight = metadataWeights?.text ?? (baseWeights.text * scale);

  // Exact point contributions out of 10.0
  const au4Points = hasFacial ? parseFloat((au4 * au4Weight).toFixed(2)) : 0;
  const au15Points = hasFacial ? parseFloat((au15 * au15Weight).toFixed(2)) : 0;
  const facialPoints = parseFloat((au4Points + au15Points).toFixed(2));
  const voicePoints = hasAudio ? parseFloat((acousticJitter * jitterWeight).toFixed(2)) : 0;
  const textPoints = isTextValid ? parseFloat((textSentiment * textWeight).toFixed(2)) : 0;
  const totalActivePoints = (facialPoints + voicePoints + textPoints) || 0.01;

  // Relative percentages among active channels
  const facialPct = Math.round((facialPoints / totalActivePoints) * 100);
  const voicePct = Math.round((voicePoints / totalActivePoints) * 100);
  const textPct = Math.round((textPoints / totalActivePoints) * 100);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="explain-modal-title">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-teal)' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <h3 id="explain-modal-title" className="modal-title">Signal Transparency &amp; Attribution Breakdown</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div className="modal-body">
          {/* Header Summary Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>COMPOSITE RISK</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {compositeRisk.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ 10</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {compositeRisk >= 7.0 ? 'Severe Concern' : compositeRisk >= 3.5 ? 'Elevated Stress' : 'Minimal Stress'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>INPUT QUALITY</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>
                {qualityReport?.overallScore || (metrics.isInsufficientData ? 15 : 85)}%
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {metrics.isInsufficientData ? 'Inconclusive Signal' : 'Tracking Confidence'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACTIVE MODALITIES</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {[hasFacial && 'FACE', hasAudio && 'AUDIO', isTextValid && 'TEXT'].filter(Boolean).join(' • ') || 'NONE'}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {mode === 'LIVE' ? 'Real-time hardware feed' : 'Calibrated test session'}
              </span>
            </div>
          </div>

          {/* High-Level Modality Contribution Breakdown */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Actual Modality Contribution to Risk Score
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.6rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span>Facial Geometry (AU04 Furrow + AU15 Depressor)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {hasFacial ? `${facialPct}% (+${facialPoints.toFixed(2)} pts)` : 'Inactive / Not Measured (0 pts)'}
                  </span>
                </div>
                <div className="stat-progress-bar">
                  <div className="stat-progress-fill" style={{ width: `${hasFacial ? facialPct : 0}%`, backgroundColor: 'var(--text-primary)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span>Vocal Prosody (Acoustic FFT Frequency Tremor)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {hasAudio ? `${voicePct}% (+${voicePoints.toFixed(2)} pts)` : 'Inactive / Not Measured (0 pts)'}
                  </span>
                </div>
                <div className="stat-progress-bar">
                  <div className="stat-progress-fill" style={{ width: `${hasAudio ? voicePct : 0}%`, backgroundColor: 'var(--accent-teal)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span>Verbal Statements (Clinical Lexicon Matching)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {isTextValid ? `${textPct}% (+${textPoints.toFixed(2)} pts)` : 'Inactive / No Tokens (0 pts)'}
                  </span>
                </div>
                <div className="stat-progress-bar">
                  <div className="stat-progress-fill" style={{ width: `${isTextValid ? textPct : 0}%`, backgroundColor: 'var(--text-secondary)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Epistemological Signal Categorization */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Signal Provenance &amp; Implementation Classification
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>1. User-Reported Information:</strong> Spoken answers and typed responses reflecting subjective thoughts, sleep, energy, and coping strategies.
              </div>
              <div style={{ padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>2. Measured Signal Features:</strong> Normalized inter-eyebrow distance ratio (AU04), lip-corner descent ratio (AU15), and 256-bin Web Audio FFT spectral peak magnitude.
              </div>
              <div style={{ padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>3. Model Predictions:</strong> Pretrained Google MediaPipe FaceMesh model regressing 468 3D spatial landmarks running 100% locally in WebAssembly. (No custom trained neural networks exist in repository).
              </div>
              <div style={{ padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>4. Rule-Based Calculations:</strong> Adaptive linear weighted fusion (base weights: AU4=2.2, AU15=1.8, Audio=2.0, Text=4.0), 32-character regex negation windows, and cross-modal incongruence delta (|Physical - Verbal| = {incongruenceIndex.toFixed(2)}).
              </div>
              <div style={{ padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>5. AI-Generated Interpretations:</strong> Context-aware clinical narrative rules, dynamic SOAP clinical notes, and domain reflection summaries.
              </div>
            </div>
          </div>

          {/* Strict Non-Diagnostic Guardrail Notice */}
          <div style={{
            padding: '0.75rem 0.9rem',
            backgroundColor: 'var(--status-moderate-bg, rgba(234, 179, 8, 0.1))',
            border: '1px solid var(--status-moderate-border, rgba(234, 179, 8, 0.3))',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--text-primary)',
            lineHeight: 1.5
          }}>
            <strong style={{ color: 'var(--status-moderate-text, #b45309)' }}>Non-Diagnostic Medical Notice:</strong> MindVision is an experimental wellness and decision-support prototype. <strong>It cannot diagnose depression, anxiety disorders, PTSD, bipolar disorder, or any medical or psychiatric condition.</strong> All indicators reflect heuristic approximations to guide patient reflection and support qualified clinician review.
          </div>

          <div className="modal-actions-footer" style={{ marginTop: '1.25rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              Close Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
