import React, { useState } from 'react';
import {
  WellnessActivityService,
  getLocalDateString
} from '../../services/wellnessStorageService';
import {
  IconSunMedium,
  IconMoonStar,
  IconHeartPulse,
  IconCheck,
  IconShieldCheck,
  IconTrendingUp
} from '../Icons';

export default function HabitInsightsView({ onShowToast = () => {} }) {
  const [habitData, setHabitData] = useState(() => WellnessActivityService.getWeeklyHabitInsights());
  const [activities] = useState(() => WellnessActivityService.getActivities());

  // Today's ratings input
  const todayStr = getLocalDateString(new Date());
  const todayEntry = habitData.days.find((d) => d.dateStr === todayStr);

  const [sleepRating, setSleepRating] = useState(todayEntry?.sleep || 3);
  const [energyRating, setEnergyRating] = useState(todayEntry?.energy || 3);
  const [stressRating, setStressRating] = useState(todayEntry?.stress || 3);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveDailyRatings = (e) => {
    e.preventDefault();
    WellnessActivityService.saveDailyHabits({
      sleepRating,
      energyRating,
      stressRating
    });
    setHabitData(WellnessActivityService.getWeeklyHabitInsights());
    setIsSaved(true);
    onShowToast('Today’s self-reported habits saved.');
    setTimeout(() => setIsSaved(false), 3500);
  };

  const RATING_STEPS = [
    { val: 1, label: '1 - Low / Poor' },
    { val: 2, label: '2 - Mild' },
    { val: 3, label: '3 - Moderate' },
    { val: 4, label: '4 - Good' },
    { val: 5, label: '5 - High / Restful' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* 1. Header Overview */}
      <div
        className="card-depth-secondary"
        style={{
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-teal)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            <IconTrendingUp size={14} />
            <span>Habit Insights &amp; Progress</span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
            Wellness Patterns &amp; Habits
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Observe weekly shifts in your self-reported rest, energy, and stress alongside completed breathing and self-care sessions.
          </p>
        </div>

        {/* Clear Medical Framing Disclaimer */}
        <div
          style={{
            padding: '0.65rem 0.95rem',
            backgroundColor: 'var(--accent-teal-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            maxWidth: '320px'
          }}
        >
          <IconShieldCheck size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span>
            <strong>Self-reported pattern only:</strong> These observations reflect your logged entries and are not medical diagnoses.
          </span>
        </div>
      </div>

      {/* 2. Log Today's Rest, Energy & Stress (Optional Self-Rating) */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Rate Daily Sleep, Energy, and Stress"
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
            Log Today's Rest &amp; Energy (Optional)
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
            Checking in with your physical body provides context on how life factors influence your emotional rhythm.
          </p>
        </div>

        <form onSubmit={handleSaveDailyRatings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Sleep Quality */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconMoonStar size={16} style={{ color: 'var(--accent-teal)' }} />
                <span>Sleep Quality last night</span>
              </label>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                {RATING_STEPS.find((r) => r.val === sleepRating)?.label}
              </span>
            </div>
            <div role="radiogroup" aria-label="Sleep Rating" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
              {RATING_STEPS.map((step) => {
                const isSelected = sleepRating === step.val;
                return (
                  <button
                    key={step.val}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSleepRating(step.val)}
                    style={{
                      padding: '0.6rem 0.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--accent-teal)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--accent-teal-soft-bg)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--accent-teal)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span>★ {step.val}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Energy Level */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconSunMedium size={16} style={{ color: 'var(--accent-warm)' }} />
                <span>Daytime Energy Level</span>
              </label>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-warm)' }}>
                {RATING_STEPS.find((r) => r.val === energyRating)?.label}
              </span>
            </div>
            <div role="radiogroup" aria-label="Energy Rating" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
              {RATING_STEPS.map((step) => {
                const isSelected = energyRating === step.val;
                return (
                  <button
                    key={step.val}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setEnergyRating(step.val)}
                    style={{
                      padding: '0.6rem 0.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--accent-warm)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--accent-warm-soft)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--accent-warm)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span>⚡ {step.val}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stress Level */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconHeartPulse size={16} style={{ color: 'var(--status-elevated-dot)' }} />
                <span>Perceived Tension / Stress</span>
              </label>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--status-elevated-text)' }}>
                {stressRating === 1 ? '1 - Very Calm' : stressRating === 2 ? '2 - Low Stress' : stressRating === 3 ? '3 - Moderate' : stressRating === 4 ? '4 - Elevated' : '5 - High Pressure'}
              </span>
            </div>
            <div role="radiogroup" aria-label="Stress Rating" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
              {RATING_STEPS.map((step) => {
                const isSelected = stressRating === step.val;
                return (
                  <button
                    key={step.val}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setStressRating(step.val)}
                    style={{
                      padding: '0.6rem 0.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--status-elevated-dot)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--status-elevated-bg)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--status-elevated-text)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span>● {step.val}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {isSaved && (
              <span style={{ fontSize: '0.84rem', color: 'var(--status-minimal-text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <IconCheck size={16} />
                <span>Habit ratings updated!</span>
              </span>
            )}

            <button type="submit" className="btn-patient-primary" style={{ padding: '0.6rem 1.6rem' }}>
              <span>Save Today's Ratings</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. Accessible Longitudinal Comparison Chart & Summary (Doesn't Rely on Color Alone) */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="7-Day Longitudinal Habit Patterns"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              7-Day Self-Reported Patterns
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
              Tracking sleep (★), energy (⚡), and stress (●) with distinct symbols, patterns, and values.
            </p>
          </div>

          {/* Accessible Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-teal)', fontWeight: 600 }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent-teal)', borderRadius: '2px' }} />
              <span>★ Sleep (1-5)</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-warm)', fontWeight: 600 }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent-warm)', borderRadius: '50%' }} />
              <span>⚡ Energy (1-5)</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--status-elevated-text)', fontWeight: 600 }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--status-elevated-dot)', transform: 'rotate(45deg)' }} />
              <span>● Stress (1-5)</span>
            </span>
          </div>
        </div>

        {/* Accessible Visual Grid Chart */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.75rem',
            alignItems: 'flex-end',
            minHeight: '180px',
            padding: '1rem 0.5rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.5rem'
          }}
          role="img"
          aria-label="Bar chart showing sleep, energy, and stress ratings over the last 7 days. Full data is also available in the table below."
        >
          {habitData.days.map((day) => {
            const sleepH = day.sleep ? (day.sleep / 5) * 100 : 0;
            const energyH = day.energy ? (day.energy / 5) * 100 : 0;
            const stressH = day.stress ? (day.stress / 5) * 100 : 0;

            return (
              <div
                key={day.dateStr}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: '0.5rem'
                }}
              >
                {/* 3 Metric Bars per day */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', width: '100%', justifyContent: 'center' }}>
                  {/* Sleep Bar */}
                  <div
                    title={`Sleep: ${day.sleep ? day.sleep + '/5' : 'Not recorded'}`}
                    style={{
                      width: '10px',
                      height: `${sleepH}%`,
                      backgroundColor: 'var(--accent-teal)',
                      borderRadius: '2px 2px 0 0',
                      minHeight: day.sleep ? '6px' : '0px',
                      opacity: day.sleep ? 1 : 0.2
                    }}
                  />
                  {/* Energy Bar */}
                  <div
                    title={`Energy: ${day.energy ? day.energy + '/5' : 'Not recorded'}`}
                    style={{
                      width: '10px',
                      height: `${energyH}%`,
                      backgroundColor: 'var(--accent-warm)',
                      borderRadius: '2px 2px 0 0',
                      minHeight: day.energy ? '6px' : '0px',
                      opacity: day.energy ? 1 : 0.2
                    }}
                  />
                  {/* Stress Bar */}
                  <div
                    title={`Stress: ${day.stress ? day.stress + '/5' : 'Not recorded'}`}
                    style={{
                      width: '10px',
                      height: `${stressH}%`,
                      backgroundColor: 'var(--status-elevated-dot)',
                      borderRadius: '2px 2px 0 0',
                      minHeight: day.stress ? '6px' : '0px',
                      opacity: day.stress ? 1 : 0.2
                    }}
                  />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: day.isToday ? 700 : 500, color: day.isToday ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                    {day.dayLabel}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                    {day.dateStr.slice(5)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Screen-Reader Friendly Structured Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              textAlign: 'left'
            }}
          >
            <caption style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              Tabular breakdown of weekly recorded habits
            </caption>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <th style={{ padding: '0.5rem' }}>Day</th>
                <th style={{ padding: '0.5rem' }}>Date</th>
                <th style={{ padding: '0.5rem' }}>Sleep (1–5)</th>
                <th style={{ padding: '0.5rem' }}>Energy (1–5)</th>
                <th style={{ padding: '0.5rem' }}>Stress (1–5)</th>
                <th style={{ padding: '0.5rem' }}>Wellness Activities</th>
              </tr>
            </thead>
            <tbody>
              {habitData.days.map((day) => (
                <tr key={day.dateStr} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.6rem 0.5rem', fontWeight: day.isToday ? 700 : 500 }}>
                    {day.fullDay} {day.isToday && '(Today)'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                    {day.dateStr}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {day.sleep ? `★ ${day.sleep} / 5` : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {day.energy ? `⚡ ${day.energy} / 5` : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {day.stress ? `● ${day.stress} / 5` : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {day.activityCount > 0 ? `${day.activityCount} completed` : 'None logged'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Completed Breathing & Self-Care Activities History */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Completed Wellness Activities"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              Completed Wellness Exercises ({activities.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Guided breathing sessions, grounding exercises, and wind-down pauses.
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-teal)', backgroundColor: 'var(--accent-teal-soft-bg)', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}>
            {habitData.completedBreathing} Breathing Sessions
          </span>
        </div>

        {activities.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
            No exercises completed yet. Try a 1-minute box breathing session in the Coping Toolkit.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activities.slice(0, 8).map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--accent-teal-soft-bg)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconCheck size={14} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.title}
                    </span>
                    {act.cycles && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        ({act.cycles} breath cycles)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {act.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
