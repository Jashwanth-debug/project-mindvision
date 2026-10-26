/**
 * MindVision Patient Wellness Hub - Local Storage & Audio Service
 * 
 * Provides confidential client-side persistence for patient-facing wellness tools:
 * - Guided Breathing Session Tracking & Gentle Audio Chime Synthesizer
 * - Daily Mood Tracker (independent of check-ins)
 * - Private Journaling (CRUD, local search, opt-in theme analysis)
 * - Self-Reported Habit Ratings (Sleep, Energy, Stress)
 * - Smart Reminders & Weekly Wellness Goals
 * 
 * PRIVACY GUARANTEE:
 * All wellness logs (journal entries, mood notes, habit ratings) are stored
 * strictly on the patient's local device (localStorage). They are never transmitted
 * to backend telemetry, clinical APIs, or shared with clinicians without explicit export.
 */

const STORAGE_KEYS = {
  MOODS: 'mindvision_wellness_moods',
  JOURNAL: 'mindvision_wellness_journal',
  JOURNAL_CONSENT: 'mindvision_wellness_journal_consent',
  ACTIVITIES: 'mindvision_wellness_activities',
  HABITS: 'mindvision_wellness_habits',
  REMINDERS_GOALS: 'mindvision_wellness_reminders_goals'
};

// Standard Mood Definitions
export const MOOD_DEFINITIONS = [
  { id: 'great', label: 'Great / Joyful', emoji: '🌸', score: 5, color: '#257C6F', bg: 'rgba(37, 124, 111, 0.12)' },
  { id: 'good', label: 'Good / Calm', emoji: '🌿', score: 4, color: '#2D8A61', bg: 'rgba(45, 138, 97, 0.12)' },
  { id: 'neutral', label: 'Okay / Neutral', emoji: '🌤️', score: 3, color: '#3B82A6', bg: 'rgba(59, 130, 166, 0.12)' },
  { id: 'low', label: 'Low / Down', emoji: '🌧️', score: 2, color: '#8C6B99', bg: 'rgba(140, 107, 153, 0.12)' },
  { id: 'stressed', label: 'Stressed / Tense', emoji: '⚡', score: 2, color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '🌊', score: 1, color: '#D9534F', bg: 'rgba(217, 83, 79, 0.12)' }
];

// Curated daily reflection prompts
export const DAILY_PROMPTS = [
  "What is on your mind today?",
  "What brought you a gentle moment of comfort or peace recently?",
  "What is one feeling or pressure you can allow yourself to gently set down?",
  "How did your body and mind feel when you woke up this morning?",
  "What is one small kindness you can offer yourself today?",
  "Who or what made you feel supported recently?"
];

// Safe local storage helpers
function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[WellnessStorage] Failed reading ${key}:`, err);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[WellnessStorage] Failed writing ${key}:`, err);
    return false;
  }
}

// Generate date string YYYY-MM-DD in local time
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Seed initial representative data if empty (includes missing dates to verify requirements)
function seedDemonstrationDataIfEmpty() {
  const existingMoods = readStorage(STORAGE_KEYS.MOODS, null);
  if (!existingMoods) {
    const today = new Date();
    const dMinus1 = new Date(today.getTime() - 1 * 86400000);
    const dMinus3 = new Date(today.getTime() - 3 * 86400000);
    const dMinus5 = new Date(today.getTime() - 5 * 86400000);

    const initialMoods = [
      {
        id: 'mood_seed_1',
        timestamp: dMinus1.toLocaleString(),
        dateStr: getLocalDateString(dMinus1),
        mood: 'good',
        label: 'Good / Calm',
        emoji: '🌿',
        tags: ['Rest', 'Routine'],
        note: 'Spent a calm evening reading and winding down without screens.'
      },
      {
        id: 'mood_seed_2',
        timestamp: dMinus3.toLocaleString(),
        dateStr: getLocalDateString(dMinus3),
        mood: 'stressed',
        label: 'Stressed / Tense',
        emoji: '⚡',
        tags: ['Work', 'Deadlines'],
        note: 'High volume of project meetings; noticed tension in shoulders.'
      },
      {
        id: 'mood_seed_3',
        timestamp: dMinus5.toLocaleString(),
        dateStr: getLocalDateString(dMinus5),
        mood: 'neutral',
        label: 'Okay / Neutral',
        emoji: '🌤️',
        tags: ['Routine'],
        note: 'Fairly average day, feeling steady.'
      }
    ];
    writeStorage(STORAGE_KEYS.MOODS, initialMoods);
  }

  const existingJournal = readStorage(STORAGE_KEYS.JOURNAL, null);
  if (!existingJournal) {
    const today = new Date();
    const dMinus2 = new Date(today.getTime() - 2 * 86400000);
    const initialJournal = [
      {
        id: 'jrnl_seed_1',
        title: 'Mid-week breather',
        prompt: 'What brought you a gentle moment of comfort or peace recently?',
        content: 'Stepping outside for a short 10-minute walk during lunch made a real difference today. The cool air helped clear my head after a busy morning of screen time.',
        timestamp: dMinus2.toLocaleString(),
        dateStr: getLocalDateString(dMinus2),
        tags: ['Self-care', 'Nature', 'Rest']
      }
    ];
    writeStorage(STORAGE_KEYS.JOURNAL, initialJournal);
  }

  const existingActivities = readStorage(STORAGE_KEYS.ACTIVITIES, null);
  if (!existingActivities) {
    const today = new Date();
    const dMinus1 = new Date(today.getTime() - 1 * 86400000);
    const dMinus2 = new Date(today.getTime() - 2 * 86400000);

    const initialActivities = [
      {
        id: 'act_seed_1',
        type: 'breathing',
        title: 'Box Breathing (1 min)',
        durationSeconds: 64,
        cycles: 4,
        timestamp: dMinus1.toLocaleString(),
        dateStr: getLocalDateString(dMinus1),
        completed: true
      },
      {
        id: 'act_seed_2',
        type: 'grounding',
        title: '5-4-3-2-1 Sensory Grounding',
        durationSeconds: 120,
        timestamp: dMinus2.toLocaleString(),
        dateStr: getLocalDateString(dMinus2),
        completed: true
      }
    ];
    writeStorage(STORAGE_KEYS.ACTIVITIES, initialActivities);
  }

  const existingHabits = readStorage(STORAGE_KEYS.HABITS, null);
  if (!existingHabits) {
    const today = new Date();
    const dMinus1 = new Date(today.getTime() - 1 * 86400000);
    const dMinus2 = new Date(today.getTime() - 2 * 86400000);
    const dMinus3 = new Date(today.getTime() - 3 * 86400000);

    const initialHabits = [
      {
        dateStr: getLocalDateString(dMinus1),
        sleepRating: 4,
        energyRating: 4,
        stressRating: 2,
        timestamp: dMinus1.toLocaleString()
      },
      {
        dateStr: getLocalDateString(dMinus2),
        sleepRating: 3,
        energyRating: 3,
        stressRating: 3,
        timestamp: dMinus2.toLocaleString()
      },
      {
        dateStr: getLocalDateString(dMinus3),
        sleepRating: 2,
        energyRating: 2,
        stressRating: 4,
        timestamp: dMinus3.toLocaleString()
      }
    ];
    writeStorage(STORAGE_KEYS.HABITS, initialHabits);
  }

  const existingRemindersGoals = readStorage(STORAGE_KEYS.REMINDERS_GOALS, null);
  if (!existingRemindersGoals) {
    const initialRemindersGoals = {
      checkInReminder: {
        enabled: false,
        time: '09:00',
        frequency: 'daily',
        paused: false
      },
      goals: {
        journalWeeklyTarget: 3,
        breathingWeeklyTarget: 3,
        checkinWeeklyTarget: 5
      },
      notificationStatus: 'default' // 'default' | 'granted' | 'denied' | 'unsupported'
    };
    writeStorage(STORAGE_KEYS.REMINDERS_GOALS, initialRemindersGoals);
  }
}

// Auto-seed on load
seedDemonstrationDataIfEmpty();

// ============================================================================
// 1. GUIDED BREATHING & WEB AUDIO SOUND ENGINE
// ============================================================================

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const WellnessAudioEngine = {
  /**
   * Plays a gentle, non-jarring harmonic tone for breathing cues.
   * Completely silent if isMuted is true.
   */
  playPhaseChime(phase, isMuted = false) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (phase === 'inhale') {
        // Soft rising swell: 396Hz to 528Hz
        osc.frequency.setValueAtTime(396, now);
        osc.frequency.exponentialRampToValueAtTime(528, now + 1.2);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.start(now);
        osc.stop(now + 1.85);
      } else if (phase === 'hold') {
        // Soft harmonic chime at 528Hz
        osc.frequency.setValueAtTime(528, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.05);
      } else if (phase === 'exhale') {
        // Soft grounding descent: 528Hz down to 396Hz
        osc.frequency.setValueAtTime(528, now);
        osc.frequency.exponentialRampToValueAtTime(352, now + 1.5);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc.start(now);
        osc.stop(now + 2.05);
      } else if (phase === 'complete') {
        // Harmonious completion triad (528Hz, 660Hz, 792Hz)
        [528, 660, 792].forEach((freq, idx) => {
          const oscNode = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscNode.type = 'sine';
          oscNode.frequency.setValueAtTime(freq, now + idx * 0.15);
          oscNode.connect(gainNode);
          gainNode.connect(ctx.destination);

          gainNode.gain.setValueAtTime(0.001, now + idx * 0.15);
          gainNode.gain.linearRampToValueAtTime(0.06, now + idx * 0.15 + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.4);

          oscNode.start(now + idx * 0.15);
          oscNode.stop(now + idx * 0.15 + 1.45);
        });
      }
    } catch (err) {
      // Audio playback fails gracefully without disturbing exercise
      console.debug('[WellnessAudioEngine] Audio notice:', err);
    }
  }
};

// ============================================================================
// 2. DAILY MOOD TRACKER SERVICE
// ============================================================================

export const MoodTrackerService = {
  getEntries() {
    return readStorage(STORAGE_KEYS.MOODS, []);
  },

  addEntry({ mood, tags = [], note = '', customDate = null }) {
    const entries = this.getEntries();
    const dateObj = customDate ? new Date(customDate) : new Date();
    const moodDef = MOOD_DEFINITIONS.find((m) => m.id === mood) || MOOD_DEFINITIONS[2];

    const newEntry = {
      id: `mood_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: dateObj.toLocaleString(),
      dateStr: getLocalDateString(dateObj),
      mood: moodDef.id,
      label: moodDef.label,
      emoji: moodDef.emoji,
      score: moodDef.score,
      tags: Array.isArray(tags) ? tags : [],
      note: (note || '').trim()
    };

    const updated = [newEntry, ...entries];
    writeStorage(STORAGE_KEYS.MOODS, updated);
    return newEntry;
  },

  deleteEntry(id) {
    const entries = this.getEntries();
    const filtered = entries.filter((e) => e.id !== id);
    writeStorage(STORAGE_KEYS.MOODS, filtered);
    return filtered;
  },

  /**
   * Generates a 7-day or 14-day streak grid.
   * Explicitly marks missing dates with hasEntry: false so no mood is assumed.
   */
  getRecentDaysTrend(daysCount = 7) {
    const entries = this.getEntries();
    const results = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const targetDate = new Date(today.getTime() - i * 86400000);
      const dateStr = getLocalDateString(targetDate);
      const dayLabel = targetDate.toLocaleDateString(undefined, { weekday: 'short' });
      const fullDateLabel = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      // Find all entries for this date
      const matched = entries.filter((e) => e.dateStr === dateStr);
      if (matched.length > 0) {
        // Use most recent entry for the day
        const primary = matched[0];
        results.push({
          dateStr,
          dayLabel,
          fullDateLabel,
          hasEntry: true,
          entry: primary,
          isToday: i === 0
        });
      } else {
        results.push({
          dateStr,
          dayLabel,
          fullDateLabel,
          hasEntry: false,
          entry: null,
          isToday: i === 0
        });
      }
    }
    return results;
  }
};

// ============================================================================
// 3. PRIVATE JOURNALING SERVICE
// ============================================================================

export const JournalService = {
  getEntries() {
    return readStorage(STORAGE_KEYS.JOURNAL, []);
  },

  createEntry({ title = '', content = '', prompt = '', tags = [] }) {
    const entries = this.getEntries();
    const now = new Date();
    const newEntry = {
      id: `jrnl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim() || `Journal • ${now.toLocaleDateString()}`,
      content: content.trim(),
      prompt: prompt || DAILY_PROMPTS[0],
      tags: Array.isArray(tags) ? tags : [],
      timestamp: now.toLocaleString(),
      dateStr: getLocalDateString(now),
      updatedAt: now.toLocaleString()
    };
    const updated = [newEntry, ...entries];
    writeStorage(STORAGE_KEYS.JOURNAL, updated);
    return newEntry;
  },

  updateEntry(id, { title, content, tags }) {
    const entries = this.getEntries();
    const updated = entries.map((entry) => {
      if (entry.id !== id) return entry;
      return {
        ...entry,
        title: title !== undefined ? title.trim() : entry.title,
        content: content !== undefined ? content.trim() : entry.content,
        tags: tags !== undefined ? tags : entry.tags,
        updatedAt: new Date().toLocaleString()
      };
    });
    writeStorage(STORAGE_KEYS.JOURNAL, updated);
    return updated.find((e) => e.id === id);
  },

  deleteEntry(id) {
    const entries = this.getEntries();
    const filtered = entries.filter((e) => e.id !== id);
    writeStorage(STORAGE_KEYS.JOURNAL, filtered);
    return filtered;
  },

  searchEntries(query = '') {
    const entries = this.getEntries();
    const q = (query || '').toLowerCase().trim();
    if (!q) return entries;
    return entries.filter((e) => {
      return (
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.content && e.content.toLowerCase().includes(q)) ||
        (e.prompt && e.prompt.toLowerCase().includes(q)) ||
        (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  },

  // Consent for recurring theme analysis
  getConsent() {
    return readStorage(STORAGE_KEYS.JOURNAL_CONSENT, false);
  },

  setConsent(consented) {
    writeStorage(STORAGE_KEYS.JOURNAL_CONSENT, Boolean(consented));
    return Boolean(consented);
  },

  /**
   * Generates recurring theme summaries strictly on-device with explicit user consent.
   * If consent is not given, returns null.
   */
  getThemeSummary() {
    if (!this.getConsent()) {
      return { consented: false, themes: [], topKeywords: [] };
    }

    const entries = this.getEntries();
    if (!entries || entries.length === 0) {
      return { consented: true, themes: [], topKeywords: [] };
    }

    const keywordCategories = {
      'Work & Deadlines': ['work', 'project', 'deadline', 'boss', 'meeting', 'office', 'career', 'job', 'tasks'],
      'Rest & Sleep': ['sleep', 'tired', 'rest', 'bed', 'morning', 'nap', 'energy', 'night', 'exhausted', 'awake'],
      'Personal Relationships': ['family', 'friend', 'friends', 'partner', 'parents', 'mom', 'dad', 'talked', 'call'],
      'Self-Care & Calm': ['walk', 'breathe', 'tea', 'nature', 'quiet', 'music', 'pause', 'gentle', 'reading', 'peace'],
      'Stress & Overwhelm': ['stress', 'overwhelm', 'anxious', 'pressure', 'hard', 'struggle', 'worry', 'rush'],
      'Gratitude & Hope': ['grateful', 'thankful', 'good', 'happy', 'comfort', 'kindness', 'smile', 'hope', 'proud']
    };

    const categoryCounts = {};
    const wordFrequency = {};
    const stopWords = new Set(['the', 'and', 'to', 'a', 'of', 'i', 'in', 'was', 'my', 'that', 'for', 'it', 'with', 'on', 'as', 'at', 'this', 'me', 'but', 'is']);

    entries.forEach((e) => {
      const text = `${e.title || ''} ${e.content || ''}`.toLowerCase();
      const words = text.match(/\b[a-z]{3,}\b/g) || [];

      words.forEach((w) => {
        if (!stopWords.has(w)) {
          wordFrequency[w] = (wordFrequency[w] || 0) + 1;
        }
      });

      Object.entries(keywordCategories).forEach(([category, keywords]) => {
        const matches = keywords.filter((kw) => text.includes(kw));
        if (matches.length > 0) {
          categoryCounts[category] = (categoryCounts[category] || 0) + matches.length;
        }
      });
    });

    const themes = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topKeywords = Object.entries(wordFrequency)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      consented: true,
      themes,
      topKeywords,
      totalEntriesAnalyzed: entries.length
    };
  }
};

// ============================================================================
// 4. WELLNESS ACTIVITIES & HABIT INSIGHTS SERVICE
// ============================================================================

export const WellnessActivityService = {
  getActivities() {
    return readStorage(STORAGE_KEYS.ACTIVITIES, []);
  },

  recordSession({ type, title, durationSeconds, cycles = null, notes = '' }) {
    const list = this.getActivities();
    const now = new Date();
    const newSession = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type, // 'breathing' | 'grounding' | 'winddown' | 'journal' | 'selfcare'
      title: title || 'Wellness Exercise',
      durationSeconds: Number(durationSeconds) || 60,
      cycles: cycles !== null ? Number(cycles) : null,
      notes: (notes || '').trim(),
      timestamp: now.toLocaleString(),
      dateStr: getLocalDateString(now),
      completed: true
    };
    const updated = [newSession, ...list];
    writeStorage(STORAGE_KEYS.ACTIVITIES, updated);
    return newSession;
  },

  getHabitRatings() {
    return readStorage(STORAGE_KEYS.HABITS, []);
  },

  saveDailyHabits({ sleepRating, energyRating, stressRating, date = new Date() }) {
    const list = this.getHabitRatings();
    const dateStr = getLocalDateString(new Date(date));
    const now = new Date();

    const existingIdx = list.findIndex((h) => h.dateStr === dateStr);
    const entry = {
      dateStr,
      sleepRating: Number(sleepRating) || 3,
      energyRating: Number(energyRating) || 3,
      stressRating: Number(stressRating) || 3,
      timestamp: now.toLocaleString()
    };

    let updated;
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = entry;
    } else {
      updated = [entry, ...list];
    }

    writeStorage(STORAGE_KEYS.HABITS, updated);
    return entry;
  },

  getWeeklyHabitInsights() {
    const habits = this.getHabitRatings();
    const activities = this.getActivities();
    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = getLocalDateString(d);
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'narrow' });
      const fullDay = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });

      const habit = habits.find((h) => h.dateStr === dateStr);
      const dayActivities = activities.filter((a) => a.dateStr === dateStr);

      days.push({
        dateStr,
        dayLabel,
        fullDay,
        hasHabit: Boolean(habit),
        sleep: habit ? habit.sleepRating : null,
        energy: habit ? habit.energyRating : null,
        stress: habit ? habit.stressRating : null,
        activityCount: dayActivities.length,
        isToday: i === 0
      });
    }

    // Calculate self-reported pattern observation without clinical assertions
    const completedBreathing = activities.filter((a) => a.type === 'breathing').length;
    const completedTotal = activities.length;

    return {
      days,
      completedBreathing,
      completedTotal
    };
  }
};

// ============================================================================
// 5. SMART REMINDERS & WEEKLY GOALS SERVICE
// ============================================================================

export const RemindersGoalsService = {
  getSettings() {
    return readStorage(STORAGE_KEYS.REMINDERS_GOALS, {
      checkInReminder: {
        enabled: false,
        time: '09:00',
        frequency: 'daily',
        paused: false
      },
      goals: {
        journalWeeklyTarget: 3,
        breathingWeeklyTarget: 3,
        checkinWeeklyTarget: 5
      },
      notificationStatus: 'default'
    });
  },

  updateSettings(partial) {
    const current = this.getSettings();
    const merged = {
      ...current,
      ...partial,
      checkInReminder: {
        ...current.checkInReminder,
        ...(partial.checkInReminder || {})
      },
      goals: {
        ...current.goals,
        ...(partial.goals || {})
      }
    };
    writeStorage(STORAGE_KEYS.REMINDERS_GOALS, merged);
    return merged;
  },

  /**
   * Request browser notification permission explicitly with user-facing explanation.
   * Handles unsupported environments gracefully.
   */
  async requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.updateSettings({ notificationStatus: 'unsupported' });
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      this.updateSettings({ notificationStatus: permission });
      return permission;
    } catch (err) {
      console.warn('[Reminders] Permission request error:', err);
      this.updateSettings({ notificationStatus: 'denied' });
      return 'denied';
    }
  },

  /**
   * Calculates weekly progress towards patient-set goals for the current calendar week.
   */
  calculateWeeklyGoalProgress(checkinRecords = []) {
    const settings = this.getSettings();
    const journals = JournalService.getEntries();
    const activities = WellnessActivityService.getActivities();

    // Determine start of current week (Sunday or Monday)
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const isInCurrentWeek = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= startOfWeek;
    };

    const journalThisWeek = journals.filter((j) => isInCurrentWeek(j.dateStr || j.timestamp)).length;
    const breathingThisWeek = activities.filter((a) => a.type === 'breathing' && isInCurrentWeek(a.dateStr || a.timestamp)).length;
    const checkinThisWeek = (checkinRecords || []).filter((c) => isInCurrentWeek(c.timestamp)).length;

    const jTarget = settings.goals.journalWeeklyTarget || 3;
    const bTarget = settings.goals.breathingWeeklyTarget || 3;
    const cTarget = settings.goals.checkinWeeklyTarget || 5;

    return {
      journal: {
        completed: journalThisWeek,
        target: jTarget,
        percentage: Math.min(100, Math.round((journalThisWeek / jTarget) * 100))
      },
      breathing: {
        completed: breathingThisWeek,
        target: bTarget,
        percentage: Math.min(100, Math.round((breathingThisWeek / bTarget) * 100))
      },
      checkin: {
        completed: checkinThisWeek,
        target: cTarget,
        percentage: Math.min(100, Math.round((checkinThisWeek / cTarget) * 100))
      }
    };
  }
};
