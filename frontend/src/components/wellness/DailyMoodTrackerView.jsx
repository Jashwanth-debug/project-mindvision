import React, { useState, useEffect } from 'react';
import {
  MoodTrackerService,
  MOOD_DEFINITIONS,
  getLocalDateString
} from '../../services/wellnessStorageService';
import {
  IconSmile,
  IconCalendar,
  IconClock,
  IconTrash2,
  IconPlus,
  IconCheck,
  IconSparkles,
  IconShieldCheck,
  IconChevronRight
} from '../Icons';

const COMMON_TAGS = ['Work', 'Sleep', 'Family', 'Health', 'Social', 'Solitude', 'Routine', 'Exercise'];

export default function DailyMoodTrackerView({
  onViewWithHistory = null,
  onShowToast = () => {}
}) {
  const [entries, setEntries] = useState(() => MoodTrackerService.getEntries());
  const [trendDays, setTrendDays] = useState(() => MoodTrackerService.getRecentDaysTrend(7));

  // Form State
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Sync state when entries update
  const refreshData = () => {
    const fresh = MoodTrackerService.getEntries();
    setEntries(fresh);
    setTrendDays(MoodTrackerService.getRecentDaysTrend(7));
  };

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitMood = (e) => {
    e.preventDefault();
    if (!selectedMood) {
      onShowToast('Please select how you are feeling first.');
      return;
    }

    setIsSubmitting(true);
    MoodTrackerService.addEntry({
      mood: selectedMood,
      tags: selectedTags,
      note: note.trim()
    });

    setIsSubmitting(false);
    setShowSavedFeedback(true);
    setSelectedMood(null);
    setSelectedTags([]);
    setNote('');
    refreshData();
    onShowToast('Mood entry recorded gently.');

    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 4000);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this mood reflection?')) {
      MoodTrackerService.deleteEntry(id);
      refreshData();
      onShowToast('Mood entry removed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* Introduction Card */}
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
            <IconSmile size={14} />
            <span>Independent Reflection</span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
            Daily Mood Tracker
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Check in with how your emotions feel throughout the day — completely independent of voice or camera check-ins.
          </p>
        </div>

        {onViewWithHistory && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onViewWithHistory}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <IconCalendar size={15} />
            <span>View with Past Reflections</span>
            <IconChevronRight size={14} />
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. LOG NEW MOOD FORM */}
      {/* ============================================================== */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Record Daily Mood"
      >
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
          How are you feeling right now?
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
          Choose the mood that best resonates with your current state.
        </p>

        <form onSubmit={handleSubmitMood} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Accessible Emoji Selector with Clear Visible Text Labels */}
          <div
            role="radiogroup"
            aria-label="Current Mood"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {MOOD_DEFINITIONS.map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedMood(m.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '1rem 0.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: isSelected ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? m.bg : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    boxShadow: isSelected ? '0 0 0 1px ' + m.color : 'none'
                  }}
                >
                  <span style={{ fontSize: '2rem', lineHeight: 1 }} aria-hidden="true">
                    {m.emoji}
                  </span>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? m.color : 'var(--text-primary)',
                      textAlign: 'center'
                    }}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Optional Reason Tags */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              What is influencing your mood? (Optional tags)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {COMMON_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.8rem',
                      fontWeight: active ? 700 : 500,
                      border: active ? '1px solid var(--accent-teal)' : '1px solid var(--border-color)',
                      backgroundColor: active ? 'var(--accent-teal-soft-bg)' : 'var(--bg-secondary)',
                      color: active ? 'var(--accent-teal)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {active ? `✓ ${tag}` : tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="mood-note-input" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Optional Note or Context
            </label>
            <textarea
              id="mood-note-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Felt a sense of relief after wrapping up the team presentation..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <IconShieldCheck size={14} style={{ color: 'var(--color-primary)' }} />
              <span>Saved locally on this device. Never uploaded to server.</span>
            </span>

            <button
              type="submit"
              className="btn-patient-primary"
              disabled={!selectedMood || isSubmitting}
              style={{ padding: '0.65rem 1.6rem', fontSize: '0.92rem', opacity: !selectedMood ? 0.6 : 1 }}
            >
              <IconPlus size={16} />
              <span>Save Mood Reflection</span>
            </button>
          </div>

          {showSavedFeedback && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--status-minimal-bg)',
                color: 'var(--status-minimal-text)',
                border: '1px solid var(--status-minimal-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <IconCheck size={18} />
              <span>Your mood reflection was recorded. Taking small moments to notice how you feel builds lasting self-awareness.</span>
            </div>
          )}
        </form>
      </section>

      {/* ============================================================== */}
      {/* 2. WEEKLY MOOD TREND STRIP (Explicit Missing Dates) */}
      {/* ============================================================== */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Weekly Mood Trend"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              7-Day Mood Overview
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Days without entries are clearly shown as unrecorded. No mood is assumed for missing days.
            </p>
          </div>
        </div>

        {/* 7-Day Trend Track */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem'
          }}
        >
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
                  padding: '0.85rem 0.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: day.isToday
                    ? '2px solid var(--accent-teal)'
                    : hasEntry
                    ? '1px solid var(--border-color)'
                    : '1px dashed var(--border-color)',
                  backgroundColor: hasEntry
                    ? moodDef?.bg || 'var(--bg-secondary)'
                    : 'var(--bg-secondary)',
                  minHeight: '100px',
                  justifyContent: 'space-between',
                  transition: 'all var(--transition-fast)'
                }}
                title={hasEntry ? `${day.fullDateLabel}: ${moodDef?.label}` : `${day.fullDateLabel}: No entry recorded`}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: day.isToday ? 700 : 500, color: day.isToday ? 'var(--accent-teal)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {day.dayLabel}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {day.dateStr.slice(5)}
                  </div>
                </div>

                <div style={{ margin: '0.35rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {hasEntry ? (
                    <>
                      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{moodDef?.emoji}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: moodDef?.color, marginTop: '0.2rem', textAlign: 'center' }}>
                        {moodDef?.id}
                      </span>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', opacity: 0.6 }}>—</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                        No entry
                      </span>
                    </div>
                  )}
                </div>

                {day.isToday && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: 'var(--accent-teal)',
                      backgroundColor: 'var(--accent-teal-soft-bg)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-pill)'
                    }}
                  >
                    Today
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. RECENT MOOD ENTRIES LIST */}
      {/* ============================================================== */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Logged Mood Entries"
      >
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
          Past Mood Logs ({entries.length})
        </h3>

        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>No mood logs recorded yet. Choose an emotion above to log your first reflection.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {entries.slice(0, 10).map((entry) => {
              const moodDef = MOOD_DEFINITIONS.find((m) => m.id === entry.mood);
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: '1 1 280px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: moodDef?.bg || 'var(--card-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        flexShrink: 0
                      }}
                    >
                      {entry.emoji || moodDef?.emoji}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.98rem', color: moodDef?.color || 'var(--text-primary)' }}>
                          {entry.label || moodDef?.label}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {entry.timestamp}
                        </span>
                      </div>

                      {entry.note && (
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: '0.35rem 0 0 0', lineHeight: 1.45 }}>
                          "{entry.note}"
                        </p>
                      )}

                      {entry.tags && entry.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-pill)'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete mood entry"
                    aria-label={`Delete mood entry from ${entry.timestamp}`}
                  >
                    <IconTrash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
