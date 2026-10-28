import React, { useState } from 'react';
import {
  JournalService,
  DAILY_PROMPTS
} from '../../services/wellnessStorageService';
import {
  IconBookOpen,
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash2,
  IconSparkles,
  IconLock,
  IconCheck,
  IconX,
  IconRefreshCw
} from '../Icons';

export default function PrivateJournalView({ onShowToast = () => {} }) {
  const [_entries, setEntries] = useState(() => JournalService.getEntries());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);

  // Consent & Theme summary state
  const [themeConsent, setThemeConsent] = useState(() => JournalService.getConsent());
  const [themeSummary, setThemeSummary] = useState(() => JournalService.getThemeSummary());
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Form / Editor state
  const [isCreating, setIsCreating] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryTags, setEntryTags] = useState('');

  const refreshData = () => {
    setEntries(JournalService.getEntries());
    setThemeSummary(JournalService.getThemeSummary());
  };

  const handleNextPrompt = () => {
    setCurrentPromptIdx((prev) => (prev + 1) % DAILY_PROMPTS.length);
  };

  const currentDailyPrompt = DAILY_PROMPTS[currentPromptIdx];

  const handleStartNew = () => {
    setEntryTitle('');
    setEntryContent('');
    setEntryTags('');
    setEditingEntry(null);
    setIsCreating(true);
  };

  const handleStartEdit = (entry) => {
    setEditingEntry(entry);
    setEntryTitle(entry.title || '');
    setEntryContent(entry.content || '');
    setEntryTags((entry.tags || []).join(', '));
    setIsCreating(true);
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();
    if (!entryContent.trim()) {
      onShowToast('Please write your thoughts before saving.');
      return;
    }

    const tagsArray = entryTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingEntry) {
      JournalService.updateEntry(editingEntry.id, {
        title: entryTitle,
        content: entryContent,
        tags: tagsArray
      });
      onShowToast('Journal entry updated.');
    } else {
      JournalService.createEntry({
        title: entryTitle,
        content: entryContent,
        prompt: currentDailyPrompt,
        tags: tagsArray
      });
      onShowToast('Journal entry saved privately.');
    }

    setIsCreating(false);
    setEditingEntry(null);
    refreshData();
  };

  const handleDeleteEntry = (id) => {
    if (window.confirm('Are you sure you want to delete this journal entry? This cannot be undone.')) {
      JournalService.deleteEntry(id);
      refreshData();
      onShowToast('Journal entry deleted.');
    }
  };

  const handleToggleConsent = (allow) => {
    JournalService.setConsent(allow);
    setThemeConsent(allow);
    setShowConsentModal(false);
    refreshData();
    onShowToast(allow ? 'Theme summaries enabled with local processing.' : 'Theme summaries disabled.');
  };

  // Filter entries
  const filteredEntries = JournalService.searchEntries(searchQuery);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* 1. Header & Privacy Guarantee */}
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
            <IconLock size={14} />
            <span>Private &amp; Confidential</span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
            Private Journaling
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            A quiet space to untangle thoughts without judgment. All entries remain strictly on this device and are never shared with doctors or logged in clinical telemetry.
          </p>
        </div>

        <button
          type="button"
          className="btn-patient-primary"
          onClick={handleStartNew}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <IconPlus size={16} />
          <span>Write New Entry</span>
        </button>
      </div>

      {/* 2. Daily Prompt Box */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--accent-teal-border)',
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--accent-teal-soft-bg) 100%)',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-teal)', fontWeight: 700, marginBottom: '0.3rem' }}>
            Today's Reflection Prompt
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
            "{currentDailyPrompt}"
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Take two quiet minutes to put whatever comes to mind into words.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleNextPrompt}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
            title="Try another reflection prompt"
          >
            <IconRefreshCw size={13} />
            <span>Different Prompt</span>
          </button>

          <button
            type="button"
            className="btn-patient-primary"
            onClick={() => {
              setEntryTitle(`Reflection • ${new Date().toLocaleDateString()}`);
              setEntryContent('');
              setEntryTags('Daily Prompt');
              setEditingEntry(null);
              setIsCreating(true);
            }}
            style={{ fontSize: '0.84rem', padding: '0.5rem 1rem' }}
          >
            <span>Write to this Prompt</span>
          </button>
        </div>
      </div>

      {/* 3. Recurring Theme Summary with Explicit User Consent */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Journal Recurring Themes"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-teal-soft-bg)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSparkles size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Recurring Theme Insights (Optional)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Processed purely on this device • Requires explicit consent
              </span>
            </div>
          </div>

          <div>
            {themeConsent ? (
              <button
                type="button"
                onClick={() => handleToggleConsent(false)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.78rem',
                  color: 'var(--status-severe-text)',
                  cursor: 'pointer'
                }}
              >
                Revoke Consent &amp; Hide
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--accent-teal-border)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.35rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--accent-teal)',
                  cursor: 'pointer'
                }}
              >
                Enable Theme Summaries ›
              </button>
            )}
          </div>
        </div>

        {themeConsent ? (
          <div>
            {themeSummary.themes && themeSummary.themes.length > 0 ? (
              <>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                  Based on {themeSummary.totalEntriesAnalyzed} journal {themeSummary.totalEntriesAnalyzed === 1 ? 'entry' : 'entries'}, here are themes that have gently surfaced in your writing:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
                  {themeSummary.themes.map((th) => (
                    <div
                      key={th.name}
                      style={{
                        padding: '0.45rem 0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.84rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{th.name}</span>
                      <span style={{ fontSize: '0.74rem', backgroundColor: 'var(--accent-teal-soft-bg)', color: 'var(--accent-teal)', padding: '1px 6px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                        {th.count} mentions
                      </span>
                    </div>
                  ))}
                </div>

                {themeSummary.topKeywords && themeSummary.topKeywords.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <strong>Frequent words:</strong> {themeSummary.topKeywords.map((k) => `${k.word} (${k.count})`).join(', ')}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
                Keep journaling! Once you write a few entries, common themes you reflect upon will appear here.
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.86rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}
          >
            Theme summaries are currently <strong>disabled</strong> to ensure your complete privacy. When enabled with your explicit consent, recurring topics (like work, sleep, or gratitude) are summarized strictly inside your web browser. Nothing is sent to our servers.
          </div>
        )}
      </section>

      {/* 4. Journal Entries List & Search */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Your Journal Entries"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Your Entries ({filteredEntries.length})
          </h3>

          {/* Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-color)',
              padding: '0.35rem 0.85rem',
              width: '100%',
              maxWidth: '280px'
            }}
          >
            <IconSearch size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries or tags..."
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: '0.84rem',
                color: 'var(--text-primary)',
                width: '100%'
              }}
              aria-label="Search journal entries"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--accent-teal-soft-bg)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <IconBookOpen size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 0.4rem 0', color: 'var(--text-primary)' }}>
              {searchQuery ? 'No matching entries found' : 'Your journal is empty'}
            </h4>
            <p style={{ fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>
              {searchQuery ? 'Try another keyword or clear your search query.' : 'Write your first gentle reflection to start building your self-awareness.'}
            </p>
            {!searchQuery && (
              <button type="button" className="btn-patient-primary" onClick={handleStartNew}>
                <IconPlus size={16} />
                <span>Write First Entry</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'border-color var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                      {entry.title}
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {entry.timestamp}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(entry)}
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '0.3rem 0.7rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      title="Edit journal entry"
                    >
                      <IconEdit size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '0.3rem 0.6rem',
                        color: 'var(--status-severe-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Delete entry"
                      aria-label={`Delete entry ${entry.title}`}
                    >
                      <IconTrash2 size={14} />
                    </button>
                  </div>
                </div>

                {entry.prompt && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', fontStyle: 'italic' }}>
                    Prompt: "{entry.prompt}"
                  </div>
                )}

                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {entry.content}
                </p>

                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', paddingTop: '0.35rem' }}>
                    {entry.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)'
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 5. CREATE / EDIT MODAL */}
      {/* ============================================================== */}
      {isCreating && (
        <div
          className="wellness-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-editor-title"
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
              maxWidth: '620px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '2rem',
              color: 'var(--text-primary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 id="journal-editor-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {editingEntry ? 'Edit Journal Entry' : 'New Private Journal Entry'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
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
                aria-label="Close editor"
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder="e.g., Thoughts after a long walk..."
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Your Reflection
                </label>
                <textarea
                  rows={7}
                  value={entryContent}
                  onChange={(e) => setEntryContent(e.target.value)}
                  placeholder="What is truly on your mind today? Write without concern for grammar or judgment..."
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    fontFamily: 'var(--font-sans)',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Tags (comma-separated, e.g., Rest, Work, Family)
                </label>
                <input
                  type="text"
                  value={entryTags}
                  onChange={(e) => setEntryTags(e.target.value)}
                  placeholder="e.g., Work, Rest, Gratitude"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-patient-primary"
                  style={{ padding: '0.65rem 1.6rem' }}
                >
                  <IconCheck size={16} />
                  <span>{editingEntry ? 'Update Entry' : 'Save Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. EXPLICIT CONSENT MODAL FOR THEME SUMMARIES */}
      {/* ============================================================== */}
      {showConsentModal && (
        <div
          className="wellness-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-modal-title"
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
              maxWidth: '520px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '2rem',
              color: 'var(--text-primary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--accent-teal-soft-bg)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconSparkles size={20} />
              </div>
              <h3 id="consent-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Theme Summaries Consent
              </h3>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
              Before activating theme summaries, we want to be completely honest about how this works:
            </p>

            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0 0 1.25rem 0' }}>
              <li><strong>Local Processing Only:</strong> MindVision looks at your journal entries entirely inside this browser on this device to group common topics like work, sleep, or family.</li>
              <li><strong>No Server Upload:</strong> Your journal text is never sent to our servers or AI APIs.</li>
              <li><strong>Completely Optional:</strong> You can revoke consent at any time, which immediately hides and clears the summary.</li>
            </ul>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConsentModal(false)}
              >
                No, Keep Disabled
              </button>
              <button
                type="button"
                className="btn-patient-primary"
                onClick={() => handleToggleConsent(true)}
              >
                I Consent, Enable Summaries
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
