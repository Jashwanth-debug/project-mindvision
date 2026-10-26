import React, { useState, useEffect } from 'react';
import { getHumanStatus } from '../utils/terminology';
import {
  MoodTrackerService,
  WellnessActivityService,
  MOOD_DEFINITIONS
} from '../services/wellnessStorageService';
import {
  IconSparkles,
  IconCalendar,
  IconShieldCheck,
  IconHeartPulse,
  IconLeaf,
  IconChevronRight,
  IconSmile,
  IconWind,
  IconCheck,
  IconBarChart2,
  IconFilter
} from './Icons';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

/**
 * PatientHistoryView - Warm, human check-in history for patients
 * 
 * Supports:
 * - Longitudinal check-ins & interactive mood/wellness trend chart
 * - Theme-adaptive Recharts visualization with semantic risk tokens
 * - Screen reader accessible table fallback (.sr-only)
 * - Click-to-select sync between chart points and timeline detail cards
 * - Daily mood logs & completed wellness activity logs
 */
export default function PatientHistoryView({ records = [], setActiveTab }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'checkins' | 'moods' | 'activities'
  const [activeRecord, setActiveRecord] = useState(() => (records && records.length > 0 ? records[0] : null));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [moodEntries] = useState(() => MoodTrackerService.getEntries());
  const [wellnessActivities] = useState(() => WellnessActivityService.getActivities());
  const [trendDays] = useState(() => MoodTrackerService.getRecentDaysTrend(7));

  // Sync activeRecord if records update dynamically
  useEffect(() => {
    if (records && records.length > 0) {
      if (!activeRecord || !records.some((r) => r.id === activeRecord.id)) {
        setActiveRecord(records[0]);
        setSelectedIndex(0);
      }
    }
  }, [records]);

  // Color token mapper for risk levels using semantic CSS variables
  const getRiskColor = (riskLevel) => {
    const level = (riskLevel || '').toUpperCase();
    if (level === 'SEVERE') return 'var(--status-severe-dot)';
    if (level === 'ELEVATED') return 'var(--status-elevated-dot)';
    return 'var(--status-minimal-dot)';
  };

  // Sort check-ins chronologically (oldest to newest) for longitudinal trend plotting
  const chronologicalCheckins = [...(records || [])]
    .filter((r) => r && (r.compositeRisk !== undefined || r.riskLevel !== undefined))
    .sort((a, b) => {
      const timeA = new Date(a.dateIso || a.timestamp).getTime();
      const timeB = new Date(b.dateIso || b.timestamp).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) return timeA - timeB;
      return 0;
    });

  const chartData = chronologicalCheckins.map((rec, index) => {
    const d = new Date(rec.dateIso || rec.timestamp);
    const isValidDate = !isNaN(d.getTime());
    const shortLabel = isValidDate
      ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : rec.timestamp || `Check-in ${index + 1}`;

    const humanStatus = getHumanStatus(rec.riskLevel, rec.compositeRisk);
    const summary = rec.summary || humanStatus.title || 'Steady pattern reported';
    const riskLevel = (rec.riskLevel || 'MINIMAL').toUpperCase();
    const compositeRisk = typeof rec.compositeRisk === 'number'
      ? Number(rec.compositeRisk.toFixed(1))
      : parseFloat(rec.compositeRisk) || 0;

    return {
      id: rec.id || `chk_pt_${index}`,
      index,
      shortLabel,
      fullDate: rec.timestamp || shortLabel,
      compositeRisk,
      riskLevel,
      summary,
      record: rec
    };
  });

  // Select record and smoothly focus detail in timeline
  const handleSelectRecord = (record, idx) => {
    if (!record) return;
    setActiveRecord(record);
    if (typeof idx === 'number') {
      setSelectedIndex(idx);
    } else {
      const foundIdx = (records || []).findIndex((r) => r.id === record.id);
      if (foundIdx !== -1) setSelectedIndex(foundIdx);
    }

    if (record.id) {
      const el = document.getElementById(`record-${record.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Custom Point Dot with theme adaptation, risk color, and focus halo
  const renderCustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const isSelected = activeRecord?.id === payload.id;
    const dotColor = getRiskColor(payload.riskLevel);

    return (
      <g
        key={`dot-${payload.id || props.index}`}
        tabIndex={0}
        role="button"
        aria-label={`Check-in on ${payload.fullDate}: ${payload.summary}, Stress score ${payload.compositeRisk.toFixed(1)} of 10, ${payload.riskLevel} risk`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelectRecord(payload.record, payload.index);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectRecord(payload.record, payload.index);
        }}
        style={{ cursor: 'pointer', outline: 'none' }}
      >
        {isSelected && (
          <circle
            cx={cx}
            cy={cy}
            r={11}
            fill="none"
            stroke={dotColor}
            strokeWidth={2}
            strokeDasharray="3 3"
            opacity={0.85}
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 6.5 : 5}
          fill={dotColor}
          stroke="var(--card-bg)"
          strokeWidth={2}
          style={{
            transition: 'all 0.2s ease',
            filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' : 'none'
          }}
        />
      </g>
    );
  };

  // Custom Tooltip adhering strictly to theme CSS custom variables
  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = getHumanStatus(data.riskLevel, data.compositeRisk);
      const dotColor = getRiskColor(data.riskLevel);

      return (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.1rem',
            boxShadow: 'var(--shadow-card)',
            color: 'var(--text-primary)',
            maxWidth: '290px',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {data.fullDate}
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: status.bgColor,
                color: status.color
              }}
            >
              {data.riskLevel}
            </span>
          </div>

          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0', lineHeight: 1.35 }}>
            {data.summary}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
            <span>Overall Stress:</span>
            <span style={{ fontWeight: 700, color: dotColor, fontFamily: 'var(--font-mono)' }}>
              {data.compositeRisk.toFixed(1)} / 10.0
            </span>
          </div>

          <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Click point to select reflection details
          </div>
        </div>
      );
    }
    return null;
  };

  // Merge items chronologically for the 'all' view
  const formattedCheckins = (records || []).map((r) => ({
    id: r.id,
    itemType: 'checkin',
    rawDate: new Date(r.timestamp),
    timestamp: r.timestamp,
    data: r
  }));

  const formattedMoods = moodEntries.map((m) => ({
    id: m.id,
    itemType: 'mood',
    rawDate: new Date(m.timestamp),
    timestamp: m.timestamp,
    data: m
  }));

  const formattedActivities = wellnessActivities.map((a) => ({
    id: a.id,
    itemType: 'activity',
    rawDate: new Date(a.timestamp),
    timestamp: a.timestamp,
    data: a
  }));

  let displayItems = [];
  if (filterType === 'all') {
    displayItems = [...formattedCheckins, ...formattedMoods, ...formattedActivities].sort((a, b) => {
      const timeA = !isNaN(a.rawDate) ? a.rawDate.getTime() : 0;
      const timeB = !isNaN(b.rawDate) ? b.rawDate.getTime() : 0;
      return timeB - timeA;
    });
  } else if (filterType === 'checkins') {
    displayItems = formattedCheckins;
  } else if (filterType === 'moods') {
    displayItems = formattedMoods;
  } else if (filterType === 'activities') {
    displayItems = formattedActivities;
  }

  return (
    <div className="patient-view-shell">
      {/* Top Header */}
      <div className="animate-enter-1">
        <div className="patient-hero-kicker">
          <span className="badge-hero-primary">
            <IconSparkles size={14} />
            <span>Your Wellness Journey</span>
          </span>
          <span className="badge-info-tag">
            <IconShieldCheck size={13} />
            <span>Confidential &amp; Private</span>
          </span>
        </div>
        <h1 className="patient-hero-title" style={{ fontSize: '1.9rem', marginBottom: '0.4rem' }}>
          My Check-in &amp; Wellness History
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Review past check-in reflections, mood entries, and completed wellness exercises in one unified timeline.
        </p>
      </div>

      {/* Start New Check-in Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--accent-teal-soft-bg) 100%)',
          border: '1px solid var(--accent-teal-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Ready for today's check-in?
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
            It takes just 2 minutes to pause and notice how you're feeling right now.
          </p>
        </div>
        <button
          type="button"
          className="btn-patient-primary"
          onClick={() => setActiveTab('assessment')}
          style={{ padding: '0.75rem 1.4rem', fontSize: '0.95rem' }}
        >
          <span>Take Check-in</span>
          <span>›</span>
        </button>
      </div>

      {/* Longitudinal Mood & Wellness Trend Chart Card */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl, 20px)',
          border: '1px solid var(--border-color)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
        aria-labelledby="wellness-trend-heading"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-teal-subtle)',
                  color: 'var(--accent-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconBarChart2 size={16} />
              </div>
              <h2 id="wellness-trend-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Longitudinal Wellness Trend
              </h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
              Tracking overall stress indicators across check-ins over time. Select any point to inspect details.
            </p>
          </div>

          {/* Theme-Adaptive Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-minimal-dot)' }} />
              <span>Steady &amp; Calm</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-elevated-dot)' }} />
              <span>Elevated</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-severe-dot)' }} />
              <span>Care Recommended</span>
            </span>
          </div>
        </div>

        {/* Empty State vs. Interactive Trend Chart */}
        {chartData.length < 2 ? (
          <div
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-color)'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-teal-subtle)',
                color: 'var(--accent-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IconBarChart2 size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Complete a few more check-ins to see your wellness trend
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
              Once you complete at least two check-ins, a longitudinal timeline chart will visualize your patterns and recovery progress over time.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: -16, bottom: 4 }}
                  onClick={(e) => {
                    if (e && e.activePayload && e.activePayload.length) {
                      handleSelectRecord(e.activePayload[0].payload.record, e.activePayload[0].payload.index);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.6} vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    stroke="var(--border-color)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    tickLine={{ stroke: 'var(--border-color)' }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2.5, 5, 7.5, 10]}
                    stroke="var(--border-color)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    tickLine={{ stroke: 'var(--border-color)' }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="compositeRisk"
                    stroke="var(--accent-teal)"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    dot={renderCustomDot}
                    activeDot={{
                      r: 8,
                      stroke: 'var(--card-bg)',
                      strokeWidth: 2,
                      fill: 'var(--accent-teal)'
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Screen Reader Accessible Table Fallback (Visually Hidden) */}
            <div className="sr-only">
              <table>
                <caption>Patient past check-in wellness and stress trend history</caption>
                <thead>
                  <tr>
                    <th scope="col">Date &amp; Time</th>
                    <th scope="col">Overall Stress Level (0-10)</th>
                    <th scope="col">Risk Classification</th>
                    <th scope="col">Reflection Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d) => (
                    <tr key={`sr-${d.id}`}>
                      <td>{d.fullDate}</td>
                      <td>{d.compositeRisk.toFixed(1)} out of 10</td>
                      <td>{d.riskLevel}</td>
                      <td>{d.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Point Status Indicator */}
            {activeRecord && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--card-bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getRiskColor(activeRecord.riskLevel)
                    }}
                  />
                  <span>
                    Selected: <strong>{activeRecord.timestamp || 'Check-in'}</strong> — {getHumanStatus(activeRecord.riskLevel, activeRecord.compositeRisk).title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectRecord(activeRecord, selectedIndex)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-teal)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  View in timeline below ↓
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 7-Day Mood Trend Strip (Explicit Missing Entries) */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '1.25rem 1.5rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Recent Mood Reflection Strip"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            7-Day Mood Trend (Unrecorded Days Clearly Indicated)
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('wellness')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-teal)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: 0
            }}
          >
            <span>Log mood or view trends</span>
            <IconChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', overflowX: 'auto' }}>
          {trendDays.map((day) => {
            const hasEntry = day.hasEntry && day.entry;
            const moodDef = hasEntry ? MOOD_DEFINITIONS.find((m) => m.id === day.entry.mood) : null;

            return (
              <div
                key={day.dateStr}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.65rem 0.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: day.isToday
                    ? '2px solid var(--accent-teal)'
                    : hasEntry
                    ? '1px solid var(--border-color)'
                    : '1px dashed var(--border-color)',
                  backgroundColor: hasEntry
                    ? moodDef?.bg || 'var(--bg-secondary)'
                    : 'var(--bg-secondary)',
                  minHeight: '72px',
                  justifyContent: 'center',
                  gap: '0.2rem'
                }}
                title={hasEntry ? `${day.fullDateLabel}: ${moodDef?.label}` : `${day.fullDateLabel}: No entry recorded`}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: day.isToday ? 700 : 500, color: day.isToday ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                  {day.dayLabel}
                </span>

                {hasEntry ? (
                  <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{moodDef?.emoji}</span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    —
                  </span>
                )}

                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  {hasEntry ? moodDef?.id : 'None'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filter Tabs for History */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Reflections &amp; Wellness Timeline
        </h2>

        {/* View Mode Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'all', label: 'All Together' },
            { id: 'checkins', label: 'Check-ins' },
            { id: 'moods', label: 'Mood Logs' },
            { id: 'activities', label: 'Exercises' }
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterType(pill.id)}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: filterType === pill.id ? 'var(--color-primary)' : 'transparent',
                color: filterType === pill.id ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Items Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {displayItems.length > 0 ? (
          displayItems.map((item, idx) => {
            // A. CHECK-IN ITEM
            if (item.itemType === 'checkin') {
              const rec = item.data;
              const status = getHumanStatus(rec.riskLevel, rec.compositeRisk);
              const isLatest = idx === 0 && filterType !== 'moods' && filterType !== 'activities';
              const isSelected = activeRecord?.id === rec.id;

              return (
                <div
                  key={rec.id || `chk_${idx}`}
                  id={`record-${rec.id}`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectRecord(rec, idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectRecord(rec, idx);
                    }
                  }}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: isSelected
                      ? '2px solid var(--accent-teal)'
                      : isLatest
                      ? `1.5px solid ${status.borderColor}`
                      : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    boxShadow: isSelected
                      ? 'var(--shadow-card), 0 0 0 3px var(--accent-teal-subtle)'
                      : 'var(--shadow-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>{status.icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: status.color }}>
                            {status.title}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--accent-teal)',
                                color: '#ffffff',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-pill)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <IconCheck size={11} />
                              <span>Selected Reflection</span>
                            </span>
                          )}
                          {isLatest && !isSelected && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--accent-teal-soft-bg)',
                                color: 'var(--accent-teal)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-pill)'
                              }}
                            >
                              Latest Check-in
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Check-in Reflection • {rec.timestamp}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: status.bgColor,
                        color: status.color
                      }}
                    >
                      {rec.riskLevel === 'MINIMAL' ? 'Calm & Steady' : rec.riskLevel === 'MODERATE' ? 'Mild Stress' : rec.riskLevel === 'ELEVATED' ? 'Support Encouraged' : 'Care Recommended'}
                    </span>
                  </div>

                  {/* Friendly Patient Statement */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1.1rem',
                      fontSize: '0.92rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      fontStyle: 'italic'
                    }}
                  >
                    {rec.text ? rec.text.replace(/\(High somatic.*?\)/g, '') : "Check-in completed calmly."}
                  </div>

                  {/* Expanded detail section for selected record */}
                  {isSelected && (rec.clinicalNarrative || rec.dialogHistory?.length) && (
                    <div
                      style={{
                        backgroundColor: 'var(--card-bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        padding: '0.9rem 1.1rem',
                        fontSize: '0.86rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Reflection Detail &amp; Notes
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Pattern Score: {rec.compositeRisk ? Number(rec.compositeRisk).toFixed(1) : '1.0'} / 10
                        </span>
                      </div>
                      {rec.clinicalNarrative && (
                        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {rec.clinicalNarrative}
                        </p>
                      )}
                      {rec.dialogHistory && rec.dialogHistory.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Questions Answered ({rec.dialogHistory.length})
                          </span>
                          {rec.dialogHistory.map((h, hIdx) => (
                            <div key={hIdx} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>• {h.prompt}:</strong> {h.answer}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      {rec.riskLevel === 'SEVERE' || rec.riskLevel === 'ELEVATED' ? (
                        <>
                          <IconHeartPulse size={14} style={{ color: 'var(--status-elevated-text)' }} />
                          <span>A conversation with a counselor could bring clarity.</span>
                        </>
                      ) : (
                        <>
                          <IconLeaf size={14} style={{ color: 'var(--status-minimal-text)' }} />
                          <span>Nice work checking in with yourself.</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('doctors');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>Talk with a counselor</span>
                      <IconChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            }

            // B. MOOD LOG ITEM
            if (item.itemType === 'mood') {
              const mood = item.data;
              const moodDef = MOOD_DEFINITIONS.find((m) => m.id === mood.mood);

              return (
                <div
                  key={mood.id || `mood_${idx}`}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    boxShadow: 'var(--shadow-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>{mood.emoji || moodDef?.emoji}</span>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: moodDef?.color || 'var(--text-primary)' }}>
                          {mood.label || moodDef?.label}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Daily Mood Check-in • {mood.timestamp}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: moodDef?.bg || 'var(--bg-secondary)',
                        color: moodDef?.color || 'var(--text-primary)'
                      }}
                    >
                      Mood Log
                    </span>
                  </div>

                  {mood.note && (
                    <div
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        lineHeight: 1.45
                      }}
                    >
                      "{mood.note}"
                    </div>
                  )}

                  {mood.tags && mood.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {mood.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // C. WELLNESS ACTIVITY ITEM
            if (item.itemType === 'activity') {
              const act = item.data;
              return (
                <div
                  key={act.id || `act_${idx}`}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    boxShadow: 'var(--shadow-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--accent-teal-soft-bg)',
                        color: 'var(--accent-teal)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <IconWind size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {act.title}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Completed Exercise • {act.timestamp}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--status-minimal-bg)',
                      color: 'var(--status-minimal-text)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <IconCheck size={12} />
                    <span>Completed ({Math.round(act.durationSeconds / 60) || 1} min)</span>
                  </span>
                </div>
              );
            }

            return null;
          })
        ) : (
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '2.5rem',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--accent-teal-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconCalendar size={28} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>No history matching this filter</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
              Your check-ins and mood logs will appear here as you take them.
            </p>
            <button
              type="button"
              className="btn-patient-primary"
              onClick={() => setActiveTab('assessment')}
              style={{ fontSize: '0.9rem', padding: '0.7rem 1.5rem' }}
            >
              Start Check-in
            </button>
          </div>
        )}
      </div>

      {/* Reassuring Disclaimer */}
      <div
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--card-bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem'
        }}
      >
        <IconShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
        <span>
          <strong>Your privacy matters:</strong> All check-in reflections and mood logs are kept confidential on this device and are never shared without your permission. MindVision is a wellness companion and does not provide formal medical diagnoses.
        </span>
      </div>
    </div>
  );
}
