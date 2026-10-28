import React, { useState, useEffect, useRef } from 'react';

/**
 * MindVision Clinical AI - Multimodal Telemetry Timeline & Session Replay
 *
 * Renders multi-channel time-series telemetry tracks:
 * - Face (AU04, AU15)
 * - Voice (Prosody Tremor & RMS Level)
 * - Incongruence (Cross-modal divergence)
 * - Prototype Composite Risk Indicator
 * - Signal Quality & Milestone Events
 *
 * Supports interactive inspection on hover/click, play/pause replay scrubbing,
 * and explicit data provenance labeling (LIVE vs SANDBOX).
 */

export default function MultimodalTimeline({
  timelinePoints = [],
  onSelectPoint = null,
  isLive = false
}) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef(null);

  const points = timelinePoints && timelinePoints.length > 0
    ? timelinePoints
    : [];

  const currentIdx = selectedIdx !== null && selectedIdx < points.length
    ? selectedIdx
    : points.length - 1;

  const currentPoint = points[currentIdx] || {
    timeFormatted: '00:00',
    au4: 0.50,
    au15: 0.40,
    prosody: 0.35,
    micRmsDb: -32,
    incongruence: 0.22,
    compositeRisk: 5.2,
    signalQuality: 85,
    confidence: 76,
    mode: isLive ? 'LIVE' : 'SANDBOX',
    eventLabel: 'Sensor Baseline'
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setSelectedIdx((prev) => {
          const next = (prev === null ? 0 : prev + 1);
          if (next >= points.length) {
            setIsPlaying(false);
            return points.length - 1;
          }
          return next;
        });
      }, 700);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, points.length]);

  const handlePointClick = (idx) => {
    setSelectedIdx(idx);
    setIsPlaying(false);
    if (onSelectPoint) onSelectPoint(points[idx]);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (selectedIdx !== null && selectedIdx >= points.length - 1) {
        setSelectedIdx(0);
      }
      setIsPlaying(true);
    }
  };

  return (
    <div className="clinical-card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <div className="card-title-group">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h3 className="card-title">MULTIMODAL TELEMETRY TIMELINE &amp; SESSION REPLAY</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Replay Play / Pause controls */}
          <button
            type="button"
            className="btn-secondary"
            onClick={handleTogglePlay}
            style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem' }}
          >
            {isPlaying ? '⏸ Pause Replay' : '▶ Play Session Replay'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedIdx(points.length - 1)}
            style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
            title="Snap to current active point"
          >
            ⏭ Live Head
          </button>

          <span className={`clinical-status-pill ${currentPoint.mode === 'LIVE' ? 'minimal' : ''}`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
            ● {currentPoint.mode === 'LIVE' ? 'LIVE STREAM' : 'SANDBOX SIMULATOR'}
          </span>
        </div>
      </div>

      <div className="card-body">
        {/* Active Inspection Inspector Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.75rem',
          padding: '0.7rem 0.9rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem',
          fontFamily: 'var(--font-mono)'
        }}>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TIME OFFSET</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
              {currentPoint.timeFormatted}
            </div>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              {currentPoint.eventLabel || 'Continuous telemetry'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>FACE (AU04 / AU15)</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentPoint.au4} / {currentPoint.au15}
            </div>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              Corrugator / Depressor
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>VOICE (JITTER / RMS)</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentPoint.prosody} / {currentPoint.micRmsDb} dB
            </div>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              Pitch harmonics stability
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>INCONGRUENCE</span>
            <div style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: currentPoint.incongruence >= 0.35 ? 'var(--status-severe-text)' : 'var(--text-primary)'
            }}>
              {currentPoint.incongruence}
            </div>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              |Physical - Verbal|
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>COMPOSITE / QUALITY</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: currentPoint.compositeRisk >= 7.0 ? 'var(--status-severe-text)' : 'var(--text-primary)' }}>
              {currentPoint.compositeRisk} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ 10</span> • {currentPoint.signalQuality}%
            </div>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              Quality: {currentPoint.signalQuality >= 75 ? 'Good' : 'Moderate'}
            </span>
          </div>
        </div>

        {/* Visual Timeline Channels (Tracks) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Track 1: Face (AU04 & AU15) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '130px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              FACE (AU04/15)
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center', height: '24px', backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: 'var(--radius-sm)' }}>
              {points.map((pt, idx) => {
                const heightPct = Math.round(((pt.au4 + pt.au15) / 2) * 100);
                const isSelected = idx === currentIdx;
                return (
                  <div
                    key={pt.id || idx}
                    onClick={() => handlePointClick(idx)}
                    title={`${pt.timeFormatted} - AU04: ${pt.au4}, AU15: ${pt.au15} (${pt.mode})`}
                    style={{
                      flex: 1,
                      height: `${Math.max(15, heightPct)}%`,
                      backgroundColor: isSelected ? 'var(--accent-teal)' : 'var(--text-secondary)',
                      opacity: isSelected ? 1 : 0.65,
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Track 2: Voice Prosody & Tremor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '130px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              VOICE (PROSODY)
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center', height: '24px', backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: 'var(--radius-sm)' }}>
              {points.map((pt, idx) => {
                const heightPct = Math.round(pt.prosody * 100);
                const isSelected = idx === currentIdx;
                return (
                  <div
                    key={pt.id || idx}
                    onClick={() => handlePointClick(idx)}
                    title={`${pt.timeFormatted} - Prosody Tremor: ${pt.prosody} (${pt.micRmsDb} dBFS)`}
                    style={{
                      flex: 1,
                      height: `${Math.max(15, heightPct)}%`,
                      backgroundColor: isSelected ? 'var(--accent-teal)' : 'var(--text-muted)',
                      opacity: isSelected ? 1 : 0.6,
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Track 3: Cross-Modal Incongruence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '130px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              INCONGRUENCE
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center', height: '24px', backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: 'var(--radius-sm)' }}>
              {points.map((pt, idx) => {
                const heightPct = Math.round(pt.incongruence * 100);
                const isSelected = idx === currentIdx;
                const isSevere = pt.incongruence >= 0.35;
                return (
                  <div
                    key={pt.id || idx}
                    onClick={() => handlePointClick(idx)}
                    title={`${pt.timeFormatted} - Incongruence: ${pt.incongruence}`}
                    style={{
                      flex: 1,
                      height: `${Math.max(15, heightPct)}%`,
                      backgroundColor: isSelected
                        ? (isSevere ? 'var(--status-severe-text)' : 'var(--accent-teal)')
                        : (isSevere ? 'var(--status-severe-dot)' : 'var(--text-muted)'),
                      opacity: isSelected ? 1 : 0.7,
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Track 4: Composite Risk Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '130px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              COMPOSITE RISK
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center', height: '28px', backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: 'var(--radius-sm)' }}>
              {points.map((pt, idx) => {
                const heightPct = Math.round((pt.compositeRisk / 10) * 100);
                const isSelected = idx === currentIdx;
                const isSevere = pt.compositeRisk >= 7.0;
                const isElevated = pt.compositeRisk >= 3.5;
                return (
                  <div
                    key={pt.id || idx}
                    onClick={() => handlePointClick(idx)}
                    title={`${pt.timeFormatted} - Composite Indicator: ${pt.compositeRisk}/10`}
                    style={{
                      flex: 1,
                      height: `${Math.max(18, heightPct)}%`,
                      backgroundColor: isSelected
                        ? (isSevere ? 'var(--status-severe-text)' : isElevated ? 'var(--status-elevated-text)' : 'var(--accent-teal)')
                        : (isSevere ? 'var(--status-severe-dot)' : isElevated ? 'var(--status-elevated-dot)' : 'var(--status-minimal-dot)'),
                      opacity: isSelected ? 1 : 0.75,
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Milestone Event Indicators / Time Ticks */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <div style={{ width: '130px', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              TIME &amp; EVENTS
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {points.filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 5)) === 0 || idx === points.length - 1).map((pt, idx) => (
                <span key={idx}>
                  {pt.timeFormatted} {pt.eventLabel ? `• ${pt.eventLabel}` : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Explainability Callout footer */}
        <div style={{
          marginTop: '1rem',
          padding: '0.6rem 0.8rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.74rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>
            Hover or click any timestamp coordinate above to replay contributing multimodal telemetry signals.
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Data Reliability: {currentPoint.signalQuality}% • Confidence: {currentPoint.confidence}%
          </span>
        </div>
      </div>
    </div>
  );
}
