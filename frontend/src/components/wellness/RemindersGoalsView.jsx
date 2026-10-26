import React, { useState } from 'react';
import {
  RemindersGoalsService
} from '../../services/wellnessStorageService';
import {
  IconBell,
  IconBellOff,
  IconTarget,
  IconClock,
  IconCheck,
  IconSparkles,
  IconShieldCheck
} from '../Icons';

export default function RemindersGoalsView({
  records = [],
  onShowToast = () => {}
}) {
  const [settings, setSettings] = useState(() => RemindersGoalsService.getSettings());
  const [goalProgress, setGoalProgress] = useState(() => RemindersGoalsService.calculateWeeklyGoalProgress(records));
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState(null);

  const refreshState = () => {
    setSettings(RemindersGoalsService.getSettings());
    setGoalProgress(RemindersGoalsService.calculateWeeklyGoalProgress(records));
  };

  const handleToggleReminder = async (enabled) => {
    if (enabled) {
      // First explain permission before requesting
      setIsRequestingPermission(true);
      const permission = await RemindersGoalsService.requestNotificationPermission();
      setIsRequestingPermission(false);

      if (permission === 'granted') {
        RemindersGoalsService.updateSettings({
          checkInReminder: { enabled: true, paused: false }
        });
        setPermissionNotice({ type: 'success', text: 'Daily reminders are active for your chosen time.' });
        onShowToast('Scheduled check-in reminder enabled.');
      } else if (permission === 'denied') {
        RemindersGoalsService.updateSettings({
          checkInReminder: { enabled: false }
        });
        setPermissionNotice({
          type: 'denied',
          text: 'Notifications are blocked in your browser settings. You can still use in-app reminders or enable notifications in site settings.'
        });
        onShowToast('Notification permission was blocked.');
      } else {
        // Unsupported or dismissed
        RemindersGoalsService.updateSettings({
          checkInReminder: { enabled: true, paused: false, inAppOnly: true }
        });
        setPermissionNotice({
          type: 'info',
          text: 'Browser notifications are not supported in this environment. In-app reminders will appear whenever you open MindVision.'
        });
        onShowToast('In-app reminders active.');
      }
    } else {
      RemindersGoalsService.updateSettings({
        checkInReminder: { enabled: false }
      });
      setPermissionNotice(null);
      onShowToast('Reminders turned off.');
    }
    refreshState();
  };

  const handleTogglePause = () => {
    const isPaused = settings.checkInReminder.paused;
    RemindersGoalsService.updateSettings({
      checkInReminder: { paused: !isPaused }
    });
    refreshState();
    onShowToast(!isPaused ? 'Reminders paused gently.' : 'Reminders resumed.');
  };

  const handleTimeChange = (time) => {
    RemindersGoalsService.updateSettings({
      checkInReminder: { time }
    });
    refreshState();
    onShowToast(`Reminder time set to ${time}.`);
  };

  const handleGoalChange = (field, val) => {
    const target = Math.max(1, Math.min(14, Number(val) || 1));
    RemindersGoalsService.updateSettings({
      goals: { [field]: target }
    });
    refreshState();
  };

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
            <IconTarget size={14} />
            <span>Gentle Accountability</span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
            Smart Reminders &amp; Weekly Goals
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Establish a gentle routine for daily check-ins and self-care. Reminders are off by default and only turn on with your explicit permission.
          </p>
        </div>
      </div>

      {/* 2. Daily Check-in Reminder Settings */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Daily Check-in Reminder Settings"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: settings.checkInReminder.enabled ? 'var(--accent-teal-soft-bg)' : 'var(--bg-secondary)',
                color: settings.checkInReminder.enabled ? 'var(--accent-teal)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {settings.checkInReminder.enabled ? <IconBell size={22} /> : <IconBellOff size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                Daily Check-in Reminder
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                {settings.checkInReminder.enabled
                  ? settings.checkInReminder.paused
                    ? 'Currently paused. No notifications will be sent.'
                    : `Active daily at ${settings.checkInReminder.time}.`
                  : 'Currently turned off. Opt-in to receive a peaceful daily notification.'}
              </p>
            </div>
          </div>

          {/* Master Enable / Disable Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {settings.checkInReminder.enabled && (
              <button
                type="button"
                onClick={handleTogglePause}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: settings.checkInReminder.paused ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {settings.checkInReminder.paused ? 'Resume Reminders' : 'Pause Reminders'}
              </button>
            )}

            <button
              type="button"
              className={settings.checkInReminder.enabled ? 'btn-secondary' : 'btn-patient-primary'}
              onClick={() => handleToggleReminder(!settings.checkInReminder.enabled)}
              disabled={isRequestingPermission}
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
            >
              {settings.checkInReminder.enabled ? 'Disable Reminders' : 'Enable Daily Reminder'}
            </button>
          </div>
        </div>

        {/* Permission Feedback Alert */}
        {permissionNotice && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              fontSize: '0.86rem',
              lineHeight: 1.5,
              backgroundColor:
                permissionNotice.type === 'denied'
                  ? 'var(--status-severe-bg)'
                  : permissionNotice.type === 'success'
                  ? 'var(--status-minimal-bg)'
                  : 'var(--bg-secondary)',
              color:
                permissionNotice.type === 'denied'
                  ? 'var(--status-severe-text)'
                  : permissionNotice.type === 'success'
                  ? 'var(--status-minimal-text)'
                  : 'var(--text-secondary)',
              border: `1px solid ${
                permissionNotice.type === 'denied'
                  ? 'var(--status-severe-border)'
                  : permissionNotice.type === 'success'
                  ? 'var(--status-minimal-border)'
                  : 'var(--border-color)'
              }`
            }}
          >
            {permissionNotice.text}
          </div>
        )}

        {/* Time Selection Controls (Only when enabled) */}
        {settings.checkInReminder.enabled && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconClock size={16} style={{ color: 'var(--accent-teal)' }} />
              <label htmlFor="reminder-time-input" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Preferred time:
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['09:00', '14:00', '20:00'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleTimeChange(preset)}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: settings.checkInReminder.time === preset ? '1.5px solid var(--accent-teal)' : '1px solid var(--border-color)',
                    backgroundColor: settings.checkInReminder.time === preset ? 'var(--accent-teal-soft-bg)' : 'var(--bg-secondary)',
                    color: settings.checkInReminder.time === preset ? 'var(--accent-teal)' : 'var(--text-secondary)'
                  }}
                >
                  {preset === '09:00' ? 'Morning (9 AM)' : preset === '14:00' ? 'Afternoon (2 PM)' : 'Evening (8 PM)'}
                </button>
              ))}

              <input
                id="reminder-time-input"
                type="time"
                value={settings.checkInReminder.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem'
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 3. Weekly Goals & Progress Summaries */}
      <section
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
        aria-label="Weekly Goals & Progress"
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Weekly Progress &amp; Targets
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Track how often you nurture your well-being this week. Adjust targets anytime to fit your schedule.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {/* Goal 1: Private Journaling */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Private Journaling
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                {goalProgress.journal.completed} of {goalProgress.journal.target} this week
              </span>
            </div>

            {/* Progress Track */}
            <div style={{ height: '8px', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${goalProgress.journal.percentage}%`,
                  backgroundColor: 'var(--accent-teal)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>{goalProgress.journal.percentage}% of weekly target</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Target:</span>
                <select
                  value={settings.goals.journalWeeklyTarget}
                  onChange={(e) => handleGoalChange('journalWeeklyTarget', e.target.value)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    padding: '2px 4px'
                  }}
                >
                  {[1, 2, 3, 4, 5, 7].map((num) => (
                    <option key={num} value={num}>
                      {num}x / week
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Goal 2: Guided Breathing Sessions */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Guided Breathing
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-warm)' }}>
                {goalProgress.breathing.completed} of {goalProgress.breathing.target} this week
              </span>
            </div>

            {/* Progress Track */}
            <div style={{ height: '8px', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${goalProgress.breathing.percentage}%`,
                  backgroundColor: 'var(--accent-warm)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>{goalProgress.breathing.percentage}% of weekly target</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Target:</span>
                <select
                  value={settings.goals.breathingWeeklyTarget}
                  onChange={(e) => handleGoalChange('breathingWeeklyTarget', e.target.value)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    padding: '2px 4px'
                  }}
                >
                  {[1, 2, 3, 4, 5, 7].map((num) => (
                    <option key={num} value={num}>
                      {num}x / week
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Goal 3: Check-in Reflections */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Check-in Reflections
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                {goalProgress.checkin.completed} of {goalProgress.checkin.target} this week
              </span>
            </div>

            {/* Progress Track */}
            <div style={{ height: '8px', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${goalProgress.checkin.percentage}%`,
                  backgroundColor: 'var(--accent-teal)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>{goalProgress.checkin.percentage}% of weekly target</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Target:</span>
                <select
                  value={settings.goals.checkinWeeklyTarget}
                  onChange={(e) => handleGoalChange('checkinWeeklyTarget', e.target.value)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    padding: '2px 4px'
                  }}
                >
                  {[1, 2, 3, 5, 7].map((num) => (
                    <option key={num} value={num}>
                      {num}x / week
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
