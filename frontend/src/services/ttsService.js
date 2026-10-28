/**
 * MindVision Clinical AI - Front-End Neural Text-To-Speech (TTS) Service
 *
 * Commercial-grade speech synthesis pipeline providing:
 * - Cloud Neural Audio Streaming via backend proxy (Azure Speech, OpenAI, ElevenLabs)
 * - Automatic pre-buffering and client-side Blob URL caching for repeated phrases
 * - Immediate cancellation and overlap prevention for concurrent prompts
 * - Real-time loading/buffering signals to maintain fluid, non-blocking patient UI
 * - Silent, high-fidelity window.speechSynthesis emergency fallback when offline or unconfigured
 */

// Global Voice Cache for emergency fallback
let gCachedFallbackVoices = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    gCachedFallbackVoices = window.speechSynthesis.getVoices() || [];
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        gCachedFallbackVoices = window.speechSynthesis.getVoices() || [];
      } catch {}
    };
  } catch {}
}

export class TTSService {
  // In-memory cache of object URLs: normalized text -> blobUrl
  static blobUrlCache = new Map();

  // Currently playing HTMLAudioElement or null
  static activeAudio = null;

  // Active fetch AbortController for in-flight cloud TTS requests
  static activeAbortController = null;

  // Track currently active utterance for cancelation
  static isLocalUtteranceActive = false;

  /**
   * Asynchronously ensure voice list is loaded from window.speechSynthesis
   */
  static async ensureVoicesLoaded(timeoutMs = 600) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];

    if (gCachedFallbackVoices && gCachedFallbackVoices.length > 0) {
      return gCachedFallbackVoices;
    }

    const immediate = window.speechSynthesis.getVoices() || [];
    if (immediate.length > 0) {
      gCachedFallbackVoices = immediate;
      return immediate;
    }

    return new Promise((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        try {
          const v = window.speechSynthesis.getVoices() || [];
          if (v.length > 0) gCachedFallbackVoices = v;
          resolve(v);
        } catch {
          resolve([]);
        }
      };

      const originalHandler = window.speechSynthesis.onvoiceschanged;
      window.speechSynthesis.onvoiceschanged = (e) => {
        if (typeof originalHandler === 'function') {
          try { originalHandler(e); } catch {}
        }
        finish();
      };

      setTimeout(finish, timeoutMs);
    });
  }

  /**
   * Determine if a voice is mechanical, vintage robotic, or novelty synthesizer
   */
  static isRoboticOrNoveltyVoice(voice) {
    if (!voice || !voice.name) return true;
    const n = voice.name.toLowerCase();
    const blacklist = [
      'alex', 'fred', 'albert', 'bad news', 'bahh', 'bells', 'boing',
      'bubbles', 'cellos', 'good news', 'jester', 'junior', 'organ',
      'ralph', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox',
      'sinister', 'hysterical', 'deranged', 'victor', 'edward'
    ];
    return blacklist.some((keyword) => n.includes(keyword));
  }

  /**
   * Determine best natural human voice in strict clinical priority sequence
   */
  static selectBestFallbackVoice(voiceList = null) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = (voiceList && voiceList.length > 0)
      ? voiceList
      : ((gCachedFallbackVoices && gCachedFallbackVoices.length > 0)
          ? gCachedFallbackVoices
          : (window.speechSynthesis.getVoices() || []));
    if (!voices || voices.length === 0) return null;

    // Filter to English non-robotic candidates
    const englishNonRobotic = voices.filter(
      (v) => v.lang && v.lang.toLowerCase().startsWith('en') && !this.isRoboticOrNoveltyVoice(v)
    );
    const candidatePool = englishNonRobotic.length > 0
      ? englishNonRobotic
      : voices.filter((v) => !this.isRoboticOrNoveltyVoice(v));

    if (candidatePool.length === 0) {
      // Fallback only if no non-robotic voice exists at all
      return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en')) || voices[0] || null;
    }

    // Priority 1: High-fidelity Neural / Online voices (e.g., Microsoft Aria/Jenny Natural)
    const msNatural = candidatePool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes('natural') && (n.includes('aria') || n.includes('jenny') || n.includes('guy') || n.includes('microsoft'));
    });
    if (msNatural) return msNatural;

    // Priority 2: Google US English (Standard Chrome high-fidelity natural voice - warm & conversational)
    const googleUS = candidatePool.find((v) => {
      const n = v.name.toLowerCase();
      return n === 'google us english' || n.includes('google us english');
    });
    if (googleUS) return googleUS;

    // Priority 3: Google UK English Female / Male
    const googleUKFemale = candidatePool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes('google uk english female') || (n.includes('google') && n.includes('female'));
    });
    if (googleUKFemale) return googleUKFemale;

    const googleOther = candidatePool.find((v) => v.name.toLowerCase().includes('google'));
    if (googleOther) return googleOther;

    // Priority 4: Apple Enhanced / Premium voices (Samantha Enhanced, Ava Enhanced, Serena Enhanced)
    const appleEnhanced = candidatePool.find((v) => {
      const n = v.name.toLowerCase();
      const isEnhanced = n.includes('enhanced') || n.includes('premium');
      const isNaturalApple = n.includes('samantha') || n.includes('ava') || n.includes('karen') ||
                             n.includes('serena') || n.includes('allison') || n.includes('daniel') ||
                             n.includes('zoe') || n.includes('oliver');
      return isEnhanced && isNaturalApple;
    });
    if (appleEnhanced) return appleEnhanced;

    // Priority 5: Apple Standard Natural voices (Samantha, Ava, Karen, Daniel, Serena)
    const appleNatural = candidatePool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes('samantha') || n.includes('ava') || n.includes('karen') ||
             n.includes('daniel') || n.includes('serena') || n.includes('moira') ||
             n.includes('tessa');
    });
    if (appleNatural) return appleNatural;

    // Priority 6: Any generic voice tagged 'natural' or 'neural'
    const genericNatural = candidatePool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes('natural') || n.includes('neural');
    });
    if (genericNatural) return genericNatural;

    // Priority 7: Microsoft standard desktop natural
    const msDesktop = candidatePool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes('zira') || n.includes('jenny');
    });
    if (msDesktop) return msDesktop;

    // Priority 8: Clean en-US or en-GB candidate
    const enUsOrGb = candidatePool.find((v) => {
      const l = (v.lang || '').toLowerCase();
      return l === 'en-us' || l === 'en-gb';
    });
    if (enUsOrGb) return enUsOrGb;

    return candidatePool[0] || null;
  }

  /**
   * Stop all active audio playback, cancel in-flight requests, and cancel local speech
   */
  static stop() {
    // 1. Stop playing HTML Audio element
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
        this.activeAudio.onplay = null;
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
      } catch {}
      this.activeAudio = null;
    }

    // 2. Abort any pending cloud audio download
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }

    // 3. Cancel any emergency browser speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      this.isLocalUtteranceActive = false;
    }
  }

  /**
   * Main speak method: sends text to neural TTS backend proxy, plays audio,
   * and falls back to window.speechSynthesis silently on error.
   *
   * @param {string} text - Plain language text to speak
   * @param {object} options - { rate: 0.92, pitch: '0%', style: 'chat', voice, provider }
   * @param {object} callbacks - { onStart, onFinish, onLoading, onError }
   */
  static async speak(text, options = {}, callbacks = {}) {
    const {
      rate = 0.92,
      pitch = '0%',
      style = 'chat',
      voice = null,
      provider = null
    } = options;

    const {
      onStart = null,
      onFinish = null,
      onLoading = null,
      onError = null
    } = callbacks;

    if (!text || !text.trim()) {
      if (onFinish) onFinish();
      return;
    }

    const cleanText = text.trim();
    const cacheKey = `${provider || 'auto'}:${voice || 'def'}:${rate}:${cleanText.toLowerCase()}`;

    // Always stop and cancel previous audio before starting new speech
    this.stop();

    // 1. Fast Path: Check client-side in-memory Blob URL cache
    if (this.blobUrlCache.has(cacheKey)) {
      const cachedBlobUrl = this.blobUrlCache.get(cacheKey);
      if (onLoading) onLoading(false);
      this.playAudioBlobUrl(cachedBlobUrl, onStart, onFinish, () => {
        // In case blob URL became invalid, fallback
        this.fallbackToSpeechSynthesis(cleanText, onStart, onFinish);
      });
      return;
    }

    // 2. Offline Path: If offline, instantly use local speech synthesis with zero delay
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (onLoading) onLoading(false);
      this.fallbackToSpeechSynthesis(cleanText, onStart, onFinish);
      return;
    }

    // 3. Network Path: Request neural audio from backend TTS proxy with bounded timeout
    const controller = new AbortController();
    this.activeAbortController = controller;
    const timeoutId = setTimeout(() => {
      try { controller.abort(); } catch {}
    }, 2500);
    if (onLoading) onLoading(true);

    try {
      // Direct proxy route works via Vite or directly on :5001
      const apiUrl = (typeof window !== 'undefined' && window.location.port === '5173')
        ? '/api/tts/synthesize'
        : 'http://localhost:5001/api/tts/synthesize';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg, application/json'
        },
        body: JSON.stringify({
          text: cleanText,
          rate: String(rate),
          pitch: String(pitch),
          style: String(style),
          voice,
          provider
        }),
        signal: controller.signal
      });

      // Check if aborted in flight
      if (controller.signal.aborted) {
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      // If backend returned JSON (e.g., { fallback: true, error: "..." }), use silent emergency fallback
      if (contentType.includes('application/json')) {
        if (onLoading) onLoading(false);
        this.fallbackToSpeechSynthesis(cleanText, onStart, onFinish);
        return;
      }

      // If HTTP error, fallback silently
      if (!response.ok) {
        if (onLoading) onLoading(false);
        this.fallbackToSpeechSynthesis(cleanText, onStart, onFinish);
        return;
      }

      // Receive audio blob (MP3)
      const audioBlob = await response.blob();
      if (controller.signal.aborted) return;

      const blobUrl = URL.createObjectURL(audioBlob);
      this.blobUrlCache.set(cacheKey, blobUrl);

      if (onLoading) onLoading(false);
      this.playAudioBlobUrl(blobUrl, onStart, onFinish, () => {
        this.fallbackToSpeechSynthesis(cleanText, onStart, onFinish);
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        // Intentionally aborted by another prompt; ignore
        return;
      }
      if (onLoading) onLoading(false);
      // Fallback silently to window.speechSynthesis
      this.fallbackToSpeechSynthesis(cleanText, onStart, onFinish);
      if (onError) onError(err);
    } finally {
      clearTimeout(timeoutId);
      if (this.activeAbortController === controller) {
        this.activeAbortController = null;
      }
    }
  }

  /**
   * Play an audio Blob URL via an HTMLAudioElement
   */
  static playAudioBlobUrl(blobUrl, onStart, onFinish, onPlayError) {
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = blobUrl;
      this.activeAudio = audio;

      let started = false;

      audio.onplay = () => {
        started = true;
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.activeAudio = null;
        if (onFinish) onFinish();
      };

      audio.onerror = () => {
        this.activeAudio = null;
        if (!started && onPlayError) {
          onPlayError();
        } else if (onFinish) {
          onFinish();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== 'AbortError' && onPlayError) {
            onPlayError();
          }
        });
      }
    } catch {
      if (onPlayError) onPlayError();
    }
  }

  /**
   * Silent emergency fallback to window.speechSynthesis
   * Adheres strictly to requirements:
   * - Awaits voice list initialization to prevent robotic default
   * - Natural high-fidelity voice selection (Microsoft Natural / Google US / Apple Enhanced)
   * - Empathetic rate (0.94) and pitch (1.0) with gentle conversational pauses
   * - Immediate window.speechSynthesis.cancel() before speak()
   */
  static async fallbackToSpeechSynthesis(text, onStart, onFinish) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onFinish) onFinish();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      this.isLocalUtteranceActive = true;

      // Ensure voice list is fully initialized
      const loadedVoices = await this.ensureVoicesLoaded(500);
      const bestVoice = this.selectBestFallbackVoice(loadedVoices);

      // Add gentle conversational punctuation pauses between sentences if needed
      const conversationalText = text.replace(/([.?!])\s+/g, '$1  ');

      const utterance = new SpeechSynthesisUtterance(conversationalText);
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      // Empathetic, human conversational prosody
      utterance.rate = 0.94;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.isLocalUtteranceActive = false;
        if (onFinish) onFinish();
      };

      utterance.onerror = () => {
        this.isLocalUtteranceActive = false;
        if (onFinish) onFinish();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isLocalUtteranceActive = false;
      if (onFinish) onFinish();
    }
  }

  /**
   * Pre-cache an array of common phrases in the background to ensure instantaneous playback
   */
  static async precache(phrases = []) {
    if (!Array.isArray(phrases) || phrases.length === 0) return;

    for (const phrase of phrases) {
      if (!phrase || typeof phrase !== 'string') continue;
      const cleanText = phrase.trim();
      const cacheKey = `auto:def:0.92:${cleanText.toLowerCase()}`;
      if (this.blobUrlCache.has(cacheKey)) continue;

      try {
        const apiUrl = (typeof window !== 'undefined' && window.location.port === '5173')
          ? '/api/tts/synthesize'
          : 'http://localhost:5001/api/tts/synthesize';

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg, application/json'
          },
          body: JSON.stringify({
            text: cleanText,
            rate: '0.92',
            pitch: '0%',
            style: 'chat'
          })
        });

        if (response.ok && response.headers.get('content-type')?.includes('audio/')) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.blobUrlCache.set(cacheKey, blobUrl);
        }
      } catch {
        // Pre-caching error is silent and non-fatal
      }
    }
  }

  /**
   * Query status of cloud TTS provider
   */
  static async checkStatus() {
    try {
      const apiUrl = (typeof window !== 'undefined' && window.location.port === '5173')
        ? '/api/tts/status'
        : 'http://localhost:5001/api/tts/status';

      const response = await fetch(apiUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch {}
    return { success: false, isConfigured: false, activeProvider: 'fallback' };
  }
}

// Background pre-warm voice list on client load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  TTSService.ensureVoicesLoaded(1000).catch(() => {});
}
