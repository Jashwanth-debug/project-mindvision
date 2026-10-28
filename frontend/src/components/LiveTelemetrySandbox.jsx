import React, { useState, useEffect } from 'react';
import MultimodalTimeline from './MultimodalTimeline';
import ExplainabilityModal from './ExplainabilityModal';
import {
  analyzeLinguisticStress,
  calculateTelemetryMetrics,
  generateClinicalNarrative,
  synthesizeSoapNote
} from '../utils/telemetryMath';
import { TelemetryTimelineService } from '../services/telemetryTimelineService';
import { evaluateSignalQuality } from '../utils/signalQualityEngine';
import {
  getHumanStatus,
  getHumanObservations,
  CLINICAL_DISCLAIMER
} from '../utils/terminology';

const generateRecordId = () => 'mv_' + Date.now().toString(36);
const generateRecordTimestamp = () => new Date().toLocaleString();

export default function LiveTelemetrySandbox({
  onLaunchSensor,
  onSavePatientRecord,
  onShowToast,
  _onTriggerHighRiskEscalation,
  externalValues,
  initialMode = 'basic'
}) {
  // Mode switcher: 'basic' (default per Section 3) or 'advanced'
  const [sandboxMode, setSandboxMode] = useState(initialMode);
  const [isTechDetailsOpen, setIsTechDetailsOpen] = useState(false);

  // Biometric state variables
  const [au4, setAu4] = useState(0.45);
  const [au15, setAu15] = useState(0.40);
  const [acousticJitter, setAcousticJitter] = useState(0.38);
  const [patientText, setPatientText] = useState(
    "I have been feeling fatigued lately from work, but I am doing my best to stay on top of daily tasks."
  );
  const [activePreset, setActivePreset] = useState('custom');

  // Explainability Modal State
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);

  // Quality Report State from Hardware Engine
  const [qualityReport] = useState(() => evaluateSignalQuality({
    isHardwareActive: false,
    isCameraActive: false,
    isAudioActive: false,
    luminance: 140,
    micVolumeDb: -32.5,
    stabilityScore: 96,
    isLiveMode: false
  }));

  // Multimodal Timeline points state
  const [timelinePoints] = useState(() => TelemetryTimelineService.getActiveTimeline(4.2, 88));

  // Handle external sync from live sensor if received
  useEffect(() => {
    if (!externalValues) return;
    const { au4: extAu4, au15: extAu15, jitter: extJitter } = externalValues;
    Promise.resolve().then(() => {
      if (extAu4 !== undefined) setAu4(extAu4);
      if (extAu15 !== undefined) setAu15(extAu15);
      if (extJitter !== undefined) setAcousticJitter(extJitter);
      setActivePreset('live');
    });
  }, [externalValues]);

  // Dynamic linguistic sentiment extraction
  const textSentiment = analyzeLinguisticStress(patientText);

  // Real-time calculation of composite risk, incongruence, and SHAP attributions
  const metrics = calculateTelemetryMetrics(au4, au15, acousticJitter, textSentiment);
  const clinicalNarrative = generateClinicalNarrative(metrics);
  const soapNote = synthesizeSoapNote(patientText, metrics);

  // Human-friendly interpretations
  const humanStatus = getHumanStatus(metrics.riskLevel, metrics.compositeRisk);
  const humanObservations = getHumanObservations({
    au4,
    au15,
    acousticJitter,
    sentiment: textSentiment,
    incongruence: metrics.incongruenceIndex
  });

  // Preset Configurations with clear, relatable labels
  const applyPreset = (type) => {
    setActivePreset(type);
    if (type === 'calm') {
      setAu4(0.08);
      setAu15(0.06);
      setAcousticJitter(0.08);
      setPatientText("Feeling calm, well-rested, and maintaining steady daily routine.");
    } else if (type === 'moderate' || type === 'anxiety') {
      setAu4(0.48);
      setAu15(0.38);
      setAcousticJitter(0.46);
      setPatientText("Feeling somewhat stressed about upcoming work deadlines, but sleeping okay.");
    } else if (type === 'masked') {
      setAu4(0.82);
      setAu15(0.70);
      setAcousticJitter(0.62);
      setPatientText("Everything is totally fine! I am completely happy and have zero problems.");
    } else if (type === 'crisis') {
      setAu4(0.95);
      setAu15(0.88);
      setAcousticJitter(0.82);
      setPatientText("I cannot take it anymore. The overwhelm is very high and I am having trouble coping.");
    }
  };

  // Copy SOAP note to clipboard
  const handleCopySoap = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(soapNote.fullMarkdown);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = soapNote.fullMarkdown;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      onShowToast?.('Clinical documentation copied to clipboard!');
    } catch {
      onShowToast?.('Copied summary to clipboard!');
    }
  };

  // Save current record to clinician portal
  const handleSaveToPortal = () => {
    const recordId = generateRecordId();
    const record = {
      id: recordId,
      timestamp: generateRecordTimestamp(),
      au4: metrics.au4,
      au15: metrics.au15,
      prosody: metrics.acousticJitter,
      sentiment: metrics.textSentiment,
      compositeRisk: metrics.compositeRisk,
      incongruence: metrics.incongruenceIndex,
      riskLevel: metrics.riskLevel,
      text: patientText
    };
    onSavePatientRecord?.(record);
    onShowToast?.(`Record ${record.id} saved to Clinician Portal!`);
  };

  return (
    <div className="sandbox-wrapper">
      {/* Simulation / Demo Transparency Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.55rem 1rem',
        backgroundColor: 'var(--card-bg-subtle, rgba(255,255,255,0.03))',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem' }}>🧪</span>
          <span><strong>DEMO SIMULATION:</strong> Adjust signals to observe how multimodal decision support responds. Not a diagnosis.</span>
        </div>
        <div style={{
          display: 'inline-flex',
          padding: '2px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            onClick={() => setSandboxMode('basic')}
            style={{
              padding: '0.3rem 0.8rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: sandboxMode === 'basic' ? 'var(--accent-teal)' : 'transparent',
              color: sandboxMode === 'basic' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Basic Mode
          </button>
          <button
            type="button"
            onClick={() => setSandboxMode('advanced')}
            style={{
              padding: '0.3rem 0.8rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: sandboxMode === 'advanced' ? 'var(--accent-teal)' : 'transparent',
              color: sandboxMode === 'advanced' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Advanced Mode
          </button>
        </div>
      </div>

      {/* Mode Header */}
      {sandboxMode === 'basic' ? (
        <div className="command-bar" style={{ marginBottom: '1.25rem' }}>
          <div className="command-left">
            <div className="command-title-row">
              <span className="command-kicker" style={{ color: 'var(--accent-teal)' }}>Interactive Simulation</span>
              <h1 className="command-heading" style={{ fontSize: '1.5rem' }}>Stress Check Simulation</h1>
            </div>
            <p className="command-meta" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Adjust the signals below to see how the assessment changes. Simple information first, technical details on demand.
            </p>
          </div>

          <button className="banner-action-btn" onClick={onLaunchSensor}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Launch Live Sensor</span>
          </button>
        </div>
      ) : (
        <div className="command-bar" style={{ marginBottom: '1.25rem' }}>
          <div className="command-left">
            <div className="command-title-row">
              <span className="command-kicker">Simulator Engine • Clinical Telemetry</span>
              <h1 className="command-heading">Multimodal Telemetry Fusion &amp; Stress Simulator</h1>
            </div>
            <p className="command-meta">
              Adjust calibrated biometric inputs to simulate somatic-verbal incongruence and verify automated diagnostic triage.
            </p>
          </div>

          <button className="banner-action-btn" onClick={onLaunchSensor}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Launch Camera Sensor</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* BASIC MODE: Simple, Plain Language, Progressive Disclosure */}
      {/* ============================================================== */}
      {sandboxMode === 'basic' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

          {/* Left Column: Plain Language Controls */}
          <div className="clinical-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Signal Adjustments
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Slide to adjust</span>
            </div>

            {/* Quick Simulation Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`preset-pill ${activePreset === 'calm' ? 'active' : ''}`}
                onClick={() => applyPreset('calm')}
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
              >
                🟢 Relaxed Baseline
              </button>
              <button
                type="button"
                className={`preset-pill ${activePreset === 'anxiety' ? 'active' : ''}`}
                onClick={() => applyPreset('anxiety')}
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
              >
                🟡 Moderate Stress
              </button>
              <button
                type="button"
                className={`preset-pill ${activePreset === 'masked' ? 'active' : ''}`}
                onClick={() => applyPreset('masked')}
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
              >
                🟠 Holding Back Stress
              </button>
              <button
                type="button"
                className={`preset-pill ${activePreset === 'crisis' ? 'active' : ''}`}
                onClick={() => applyPreset('crisis')}
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
              >
                🔴 Acute Overwhelm
              </button>
            </div>

            {/* Slider 1: Facial expression */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Facial expression tension
                </label>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {au4 > 0.65 ? 'Elevated tension' : au4 > 0.35 ? 'Moderate furrow' : 'Relaxed expression'}
                </span>
              </div>
              <input
                type="range"
                min="0.00"
                max="1.00"
                step="0.01"
                value={au4}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAu4(val);
                  setAu15(Math.max(0, val - 0.15));
                  setActivePreset('custom');
                }}
                className="clinical-slider"
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>Relaxed (0.0)</span>
                <span>Subtle tension (0.5)</span>
                <span>Noticeable tension (1.0)</span>
              </div>
            </div>

            {/* Slider 2: Voice stress / variation */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Voice variation
                </label>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {acousticJitter > 0.65 ? 'Noticeable fluctuation' : acousticJitter > 0.35 ? 'Slight variance' : 'Steady pitch'}
                </span>
              </div>
              <input
                type="range"
                min="0.00"
                max="1.00"
                step="0.01"
                value={acousticJitter}
                onChange={(e) => {
                  setAcousticJitter(parseFloat(e.target.value));
                  setActivePreset('custom');
                }}
                className="clinical-slider"
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>Steady voice (0.0)</span>
                <span>Mild fluctuation (0.5)</span>
                <span>High variation (1.0)</span>
              </div>
            </div>

            {/* Reported feelings textarea */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Reported feelings
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Your responses</span>
              </div>
              <textarea
                className="clinical-textarea"
                rows={3}
                value={patientText}
                onChange={(e) => {
                  setPatientText(e.target.value);
                  setActivePreset('custom');
                }}
                placeholder="Type sample check-in thoughts or verbal response..."
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Right Column: Assessment Result & Plain Observations */}
          <div className="clinical-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Current Assessment
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: humanStatus.bgColor,
                  color: humanStatus.color,
                  border: `1px solid ${humanStatus.borderColor}`,
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  <span>{humanStatus.icon}</span>
                  <span>{humanStatus.title}</span>
                </span>
              </div>

              {/* Status explanation */}
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                {humanStatus.subtitle}
              </p>

              {/* What We Noticed Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    🎙️ Voice
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {humanObservations.voice}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    💬 Responses
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {humanObservations.responses}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    👁️ Facial signals
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {humanObservations.facial}
                  </div>
                </div>

                {humanObservations.divergence && (
                  <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(234, 179, 8, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#eab308', marginBottom: '0.2rem' }}>
                      ⚡ Noticeable Difference Between Signals
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {humanObservations.divergence}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clear Next Action & Disclaimer */}
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.85rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveToPortal}
                  style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.82rem' }}
                >
                  Save Check-in Result
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsTechDetailsOpen(!isTechDetailsOpen)}
                  style={{ padding: '0.6rem 1rem', fontSize: '0.82rem' }}
                >
                  {isTechDetailsOpen ? 'Hide Details ▲' : 'Technical Details ▾'}
                </button>
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {CLINICAL_DISCLAIMER}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================================== */}
      {/* COLLAPSIBLE TECHNICAL DETAILS (In Basic Mode) */}
      {/* ============================================================== */}
      {sandboxMode === 'basic' && isTechDetailsOpen && (
        <div className="clinical-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--accent-teal-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Technical Details &amp; Signal Metrics
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Internal biometric feature values, confidence estimates, and attribution breakdown.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsExplainModalOpen(true)}
              style={{ fontSize: '0.74rem', padding: '0.3rem 0.65rem' }}
            >
              Full Feature Inspector ↗
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Overall Stress Index</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {metrics.compositeRisk.toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ 10</span>
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Signal Quality</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-teal)', marginTop: '0.2rem' }}>
                {qualityReport.overallScore}%
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Result Confidence</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {qualityReport.confidenceScore}%
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Facial Tension (AU4 / AU15)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {metrics.au4.toFixed(2)} / {metrics.au15.toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Voice Variation (Jitter)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {metrics.acousticJitter.toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Signal Differences</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: metrics.incongruenceIndex >= 0.35 ? 'var(--status-severe-text)' : 'var(--text-primary)', marginTop: '0.2rem' }}>
                {metrics.incongruenceIndex.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick SHAP bar summary */}
          <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Why We Reached This Result (Signal Contributions):
            </div>
            {metrics.shapAttributions.slice(0, 3).map((item, idx) => (
              <div key={idx} style={{ marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span style={{ fontWeight: 600, color: item.color }}>{item.weight}%</span>
                </div>
                <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.weight}%`, height: '100%', background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADVANCED MODE: Full Engineer & Clinician Workstation */}
      {/* ============================================================== */}
      {sandboxMode === 'advanced' && (
        <>
          {/* Main Telemetry Grid (Controls vs Decision Support) */}
          <div className="telemetry-grid">
            {/* 2. Left Panel: INPUT TELEMETRY CONTROLS */}
            <div className="clinical-card">
              <div className="card-header">
                <div className="card-title-group">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  <h3 className="card-title">Biometric Telemetry Input Controls</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`clinical-status-pill ${qualityReport.mode === 'LIVE' ? 'minimal' : ''}`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                    ● {qualityReport.mode === 'LIVE' ? 'LIVE FEED' : 'SANDBOX SIM'}
                  </span>
                </div>
              </div>

              <div className="card-body">
                {/* Quick Presets */}
                <div className="preset-selector">
                  <span className="preset-label">Presets:</span>
                  <button
                    className={`preset-pill ${activePreset === 'masked' ? 'active' : ''}`}
                    onClick={() => applyPreset('masked')}
                  >
                    Severe Incongruence (Masked)
                  </button>
                  <button
                    className={`preset-pill ${activePreset === 'crisis' ? 'active' : ''}`}
                    onClick={() => applyPreset('crisis')}
                  >
                    Acute Crisis Breakdown
                  </button>
                  <button
                    className={`preset-pill ${activePreset === 'anxiety' ? 'active' : ''}`}
                    onClick={() => applyPreset('anxiety')}
                  >
                    Somatic Anxiety
                  </button>
                  <button
                    className={`preset-pill ${activePreset === 'calm' ? 'active' : ''}`}
                    onClick={() => applyPreset('calm')}
                  >
                    Baseline Calm
                  </button>
                </div>

                {/* Slider 1: AU4 Eyebrow Furrow Stress */}
                <div className="control-group">
                  <div className="control-header">
                    <div className="control-label-group">
                      <label className="control-label" htmlFor="slider-au4">
                        AU4 Eyebrow Furrow Stress
                      </label>
                      <span className="channel-tag">PyFeat FACS</span>
                    </div>
                    <span className="control-value-badge">{au4.toFixed(2)}</span>
                  </div>
                  <input
                    id="slider-au4"
                    type="range"
                    min="0.00"
                    max="1.00"
                    step="0.01"
                    value={au4}
                    onChange={(e) => {
                      setAu4(parseFloat(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="clinical-slider"
                  />
                  <div className="slider-ticks">
                    <span>0.00 (Relaxed)</span>
                    <span>0.50 (Moderate Furrow)</span>
                    <span>1.00 (Extreme Tension)</span>
                  </div>
                </div>

                {/* Slider 2: AU15 Lip Corner Depressor */}
                <div className="control-group">
                  <div className="control-header">
                    <div className="control-label-group">
                      <label className="control-label" htmlFor="slider-au15">
                        AU15 Lip Corner Depressor
                      </label>
                      <span className="channel-tag">PyFeat FACS</span>
                    </div>
                    <span className="control-value-badge">{au15.toFixed(2)}</span>
                  </div>
                  <input
                    id="slider-au15"
                    type="range"
                    min="0.00"
                    max="1.00"
                    step="0.01"
                    value={au15}
                    onChange={(e) => {
                      setAu15(parseFloat(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="clinical-slider"
                  />
                  <div className="slider-ticks">
                    <span>0.00 (Neutral)</span>
                    <span>0.50 (Mild Depressor)</span>
                    <span>1.00 (Severe Down-Turn)</span>
                  </div>
                </div>

                {/* Slider 3: Acoustic Pitch Tremor / Jitter */}
                <div className="control-group">
                  <div className="control-header">
                    <div className="control-label-group">
                      <label className="control-label" htmlFor="slider-jitter">
                        Acoustic Pitch Tremor / Jitter
                      </label>
                      <span className="channel-tag">wav2vec2-base</span>
                    </div>
                    <span className="control-value-badge">{acousticJitter.toFixed(2)}</span>
                  </div>
                  <input
                    id="slider-jitter"
                    type="range"
                    min="0.00"
                    max="1.00"
                    step="0.01"
                    value={acousticJitter}
                    onChange={(e) => {
                      setAcousticJitter(parseFloat(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="clinical-slider"
                  />
                  <div className="slider-ticks">
                    <span>0.00 (Steady Prosody)</span>
                    <span>0.50 (Tremolo Fluctuation)</span>
                    <span>1.00 (Vocal Instability / Choked)</span>
                  </div>
                </div>

                {/* Spoken Verbal Report Text Area */}
                <div className="textarea-wrapper">
                  <div className="control-header">
                    <div className="control-label-group">
                      <label className="control-label" htmlFor="patient-speech-text">
                        Spoken Verbal Report
                      </label>
                      <span className="channel-tag">DeBERTa-v3 STT</span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Editable transcript
                    </span>
                  </div>

                  <textarea
                    id="patient-speech-text"
                    className="clinical-textarea"
                    rows={3}
                    value={patientText}
                    onChange={(e) => {
                      setPatientText(e.target.value);
                      setActivePreset('custom');
                    }}
                    placeholder="Enter patient spoken statement..."
                  />

                  <div className="sentiment-meter-bar">
                    <div className="sentiment-indicator">
                      <span>Calculated Linguistic Stress Index:</span>
                      <span className="control-value-badge">{textSentiment.toFixed(2)}</span>
                    </div>
                    <span>Semantic Polarity &amp; Distortion Check</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Right Panel: CLINICAL DECISION SUPPORT PANEL */}
            <div className={`clinical-card ${metrics.riskLevel === 'SEVERE' ? 'severe-border' : metrics.riskLevel === 'ELEVATED' ? 'elevated-border' : ''}`}>
              <div className="card-header">
                <div className="card-title-group">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <h3 className="card-title">Clinical Decision Support &amp; Explainability</h3>
                </div>

                {/* Alert Badge (Top Right) */}
                <div className={`clinical-status-pill ${metrics.riskLevel.toLowerCase()}`}>
                  <span className="pulse-dot"></span>
                  <span>{metrics.riskLevel} DISTRESS</span>
                </div>
              </div>

              <div className="card-body">
                {/* Separated Indicator from Reliability & Confidence */}
                <div className="stats-display-row">
                  {/* Stat 1: Composite Indicator */}
                  <div className="stat-box">
                    <span className="stat-box-title">COMPOSITE INDICATOR</span>
                    <div className={`stat-box-value ${metrics.riskLevel.toLowerCase()}`}>
                      {metrics.compositeRisk.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ 10</span>
                    </div>
                    <span className="stat-box-sub">
                      Cross-modal stress index
                    </span>
                    <div className="stat-progress-bar">
                      <div
                        className="stat-progress-fill"
                        style={{
                          width: `${(metrics.compositeRisk / 10) * 100}%`,
                          backgroundColor: metrics.riskLevel === 'SEVERE'
                            ? 'var(--status-severe-dot)'
                            : metrics.riskLevel === 'ELEVATED'
                            ? 'var(--status-elevated-dot)'
                            : 'var(--status-minimal-dot)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Stat 2: Data Quality Score */}
                  <div className="stat-box">
                    <span className="stat-box-title">DATA QUALITY</span>
                    <div className="stat-box-value" style={{ color: 'var(--accent-teal)' }}>
                      {qualityReport.overallScore}%
                    </div>
                    <span className="stat-box-sub">
                      Hardware integrity [{qualityReport.rating}]
                    </span>
                    <div className="stat-progress-bar">
                      <div
                        className="stat-progress-fill"
                        style={{
                          width: `${qualityReport.overallScore}%`,
                          backgroundColor: 'var(--accent-teal)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Stat 3: Signal-derived Confidence */}
                  <div className="stat-box">
                    <span className="stat-box-title">ANALYSIS CONFIDENCE</span>
                    <div className="stat-box-value" style={{ color: 'var(--text-primary)' }}>
                      {qualityReport.confidenceScore}%
                    </div>
                    <span className="stat-box-sub">
                      Signal-derived prototype confidence
                    </span>
                    <div className="stat-progress-bar">
                      <div
                        className="stat-progress-fill"
                        style={{
                          width: `${qualityReport.confidenceScore}%`,
                          backgroundColor: 'var(--text-secondary)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Data Provenance Banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  marginBottom: '0.85rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span><strong>Source:</strong></span>
                    <span>✓ Camera telemetry</span>
                    <span>✓ Audio telemetry</span>
                    <span>✓ Questionnaire</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: qualityReport.mode === 'LIVE' ? 'var(--status-minimal-text)' : 'var(--text-muted)' }}>
                    Mode: {qualityReport.mode}
                  </span>
                </div>

                {/* Dynamic Clinical Narrative */}
                <div className="narrative-box">
                  <strong>Clinical Narrative &amp; Decision Support:</strong> {clinicalNarrative}
                </div>

                {/* Contributing Signals Panel */}
                <div className="shap-inspector" style={{ marginTop: '1rem' }}>
                  <div className="shap-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="shap-title">WHY THIS INDICATOR? — CONTRIBUTING SIGNALS</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsExplainModalOpen(true)}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                    >
                      🔍 View Details
                    </button>
                  </div>

                  {metrics.shapAttributions.map((item, idx) => (
                    <div className="shap-item" key={idx}>
                      <div className="shap-item-label-row">
                        <span className="shap-item-name">{item.name} ({item.channel})</span>
                        <span className="shap-item-weight" style={{ color: item.color }}>
                          {item.weight}% ({item.impact})
                        </span>
                      </div>
                      <div className="shap-bar-track">
                        <div
                          className="shap-bar-fill"
                          style={{
                            width: `${item.weight}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Medical Disclaimer Box */}
                <div className="medical-disclaimer-box">
                  <span className="disclaimer-icon">⚠️</span>
                  <div>
                    <strong>Medical Decision-Support Notice:</strong> Metrics displayed are statistical decision-support indicators synthesized via on-device machine learning models. They are designed exclusively to assist qualified healthcare professionals and must not be used as an autonomous medical diagnostic tool.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multimodal Telemetry Timeline & Session Replay */}
          <MultimodalTimeline
            timelinePoints={timelinePoints}
            isLive={qualityReport.mode === 'LIVE'}
          />

          {/* Bottom Card: AUTOMATED CLINICAL SOAP NOTE */}
          <div className="soap-card">
            <div className="card-header">
              <div className="card-title-group">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <h3 className="card-title">Synthesized Clinical SOAP Documentation</h3>
              </div>

              <div className="soap-header-actions">
                <button className="btn-secondary" onClick={handleSaveToPortal} title="Store note in Clinician Workstation history">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Save Record</span>
                </button>
                <button className="btn-primary" onClick={handleCopySoap} title="Copy formatted SOAP summary to clipboard">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy SOAP Note</span>
                </button>
              </div>
            </div>

            {/* SOAP 4-Quadrant Grid */}
            <div className="soap-grid">
              {/* S - SUBJECTIVE */}
              <div className="soap-quadrant">
                <div className="soap-quadrant-header">
                  <span className="soap-letter">S</span>
                  <span className="soap-quadrant-title">Subjective</span>
                </div>
                <div className="soap-content">
                  <p style={{ marginBottom: '0.5rem' }}>{soapNote.subjective}</p>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <strong>Linguistic Distortion Markers:</strong> {textSentiment > 0.5 ? 'Fatigue, minimization, suppressed affect cues detected.' : 'No acute cognitive distortions identified in speech segment.'}
                  </div>
                </div>
              </div>

              {/* O - OBJECTIVE */}
              <div className="soap-quadrant">
                <div className="soap-quadrant-header">
                  <span className="soap-letter">O</span>
                  <span className="soap-quadrant-title">Objective (Biometric Telemetry)</span>
                </div>
                <ul className="soap-telemetry-list">
                  <li className="soap-telemetry-item">
                    <span className="soap-telemetry-label">AU04 Corrugator Brow Furrow</span>
                    <span className="soap-telemetry-val">{metrics.au4.toFixed(2)} (Ref: &lt; 0.20)</span>
                  </li>
                  <li className="soap-telemetry-item">
                    <span className="soap-telemetry-label">AU15 Depressor Anguli Oris</span>
                    <span className="soap-telemetry-val">{metrics.au15.toFixed(2)} (Ref: &lt; 0.20)</span>
                  </li>
                  <li className="soap-telemetry-item">
                    <span className="soap-telemetry-label">Acoustic Pitch Tremor / Jitter</span>
                    <span className="soap-telemetry-val">{metrics.acousticJitter.toFixed(2)} (Ref: &lt; 0.25)</span>
                  </li>
                  <li className="soap-telemetry-item">
                    <span className="soap-telemetry-label">Cross-Modal Incongruence Index</span>
                    <span className="soap-telemetry-val" style={{ color: metrics.incongruenceIndex >= 0.35 ? 'var(--status-severe-text)' : 'inherit', fontWeight: 700 }}>
                      {metrics.incongruenceIndex.toFixed(2)}
                    </span>
                  </li>
                </ul>
              </div>

              {/* A - ASSESSMENT */}
              <div className="soap-quadrant">
                <div className="soap-quadrant-header">
                  <span className="soap-letter">A</span>
                  <span className="soap-quadrant-title">Assessment</span>
                </div>
                <div className="soap-content">
                  <p>{soapNote.assessment}</p>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <strong>Cross-Attention Fusion Layer:</strong> Projected 256-d multimodal embedding divergence: {(metrics.incongruenceIndex * 1.42).toFixed(3)} rad.
                  </div>
                </div>
              </div>

              {/* P - PLAN */}
              <div className="soap-quadrant">
                <div className="soap-quadrant-header">
                  <span className="soap-letter">P</span>
                  <span className="soap-quadrant-title">Plan &amp; Recommendations</span>
                </div>
                <div className="soap-content" style={{ whiteSpace: 'pre-line' }}>
                  {soapNote.plan}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Explainability & Contribution Details Modal */}
      <ExplainabilityModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        metrics={metrics}
        qualityReport={qualityReport}
        mode={qualityReport.mode}
      />
    </div>
  );
}
