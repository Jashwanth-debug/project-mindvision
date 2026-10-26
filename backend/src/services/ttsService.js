/**
 * MindVision Clinical AI - Cloud Neural Text-To-Speech (TTS) Service
 * 
 * Commercial-grade abstracted speech synthesis engine providing:
 * - Multi-provider architecture (Azure Cognitive Services, OpenAI TTS, ElevenLabs)
 * - SSML support (rate, pitch, emotional speaking style e.g., 'chat' / 'empathy')
 * - In-memory and on-disk SHA-256 audio cache for low-latency prompt replays
 * - Graceful fallback signaling for offline or unconfigured environments
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, '..', 'data', 'ttsCache');

// Ensure cache directory exists securely
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not initialize TTS disk cache directory:', err.message);
  }
}

// In-memory LRU-like audio cache (hash -> { buffer, contentType, timestamp })
const memoryCache = new Map();
const MAX_MEMORY_CACHE_ENTRIES = 120;

export class TTSService {
  /**
   * Determine the active provider based on environment variables
   */
  static getActiveProvider() {
    const requested = (process.env.TTS_PROVIDER || '').trim().toLowerCase();
    if (requested === 'openai' || requested === 'azure' || requested === 'elevenlabs') {
      return requested;
    }
    // Auto-detect based on presence of API keys
    if (process.env.AZURE_SPEECH_KEY) return 'azure';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ELEVENLABS_API_KEY) return 'elevenlabs';
    
    // Default configured preference
    return 'azure';
  }

  /**
   * Check if credentials exist for the active provider
   */
  static isConfigured(provider = this.getActiveProvider()) {
    if (provider === 'azure') {
      return Boolean(process.env.AZURE_SPEECH_KEY);
    }
    if (provider === 'openai') {
      return Boolean(process.env.OPENAI_API_KEY);
    }
    if (provider === 'elevenlabs') {
      return Boolean(process.env.ELEVENLABS_API_KEY);
    }
    return false;
  }

  /**
   * Get count of cached phrases
   */
  static getCacheSize() {
    return memoryCache.size;
  }

  /**
   * Safely escape special XML characters for SSML construction
   */
  static escapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Compute a deterministic cache key for text and acoustic parameters
   */
  static computeCacheKey(provider, voice, rate, pitch, style, text) {
    const raw = `${provider}:${voice || ''}:${rate || ''}:${pitch || ''}:${style || ''}:${text.trim().toLowerCase()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Synthesize speech using the configured neural provider with SSML and caching
   */
  static async synthesize({ text, provider, voice, rate = '0.92', pitch = '0%', style = 'chat' }) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('Valid text is required for TTS synthesis.');
    }

    if (text.length > 2000) {
      throw new Error('Text exceeds maximum safe length of 2000 characters.');
    }

    const activeProvider = provider || this.getActiveProvider();
    const effectiveVoice = voice || this.getDefaultVoice(activeProvider);
    const cacheKey = this.computeCacheKey(activeProvider, effectiveVoice, rate, pitch, style, text);

    // 1. Check in-memory cache
    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      return {
        audioBuffer: cached.buffer,
        contentType: cached.contentType,
        cached: true,
        source: 'memory-cache'
      };
    }

    // 2. Check disk cache
    const diskPath = path.join(CACHE_DIR, `${cacheKey}.mp3`);
    if (fs.existsSync(diskPath)) {
      try {
        const diskBuffer = fs.readFileSync(diskPath);
        memoryCache.set(cacheKey, { buffer: diskBuffer, contentType: 'audio/mpeg', timestamp: Date.now() });
        return {
          audioBuffer: diskBuffer,
          contentType: 'audio/mpeg',
          cached: true,
          source: 'disk-cache'
        };
      } catch (e) {
        // Fall through to synthesize
      }
    }

    // 3. Verify provider configuration
    if (!this.isConfigured(activeProvider)) {
      return {
        fallback: true,
        error: `Cloud TTS provider '${activeProvider}' is not configured (missing API key in environment).`
      };
    }

    // 4. Delegate to provider
    try {
      let audioResult;
      if (activeProvider === 'azure') {
        audioResult = await this.synthesizeAzure({ text, voice: effectiveVoice, rate, pitch, style });
      } else if (activeProvider === 'openai') {
        audioResult = await this.synthesizeOpenAI({ text, voice: effectiveVoice, rate });
      } else if (activeProvider === 'elevenlabs') {
        audioResult = await this.synthesizeElevenLabs({ text, voice: effectiveVoice });
      } else {
        return {
          fallback: true,
          error: `Unsupported TTS provider: ${activeProvider}`
        };
      }

      if (audioResult && audioResult.audioBuffer) {
        // Store in memory cache
        if (memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
          const firstKey = memoryCache.keys().next().value;
          memoryCache.delete(firstKey);
        }
        memoryCache.set(cacheKey, {
          buffer: audioResult.audioBuffer,
          contentType: audioResult.contentType,
          timestamp: Date.now()
        });

        // Store to disk cache asynchronously
        try {
          fs.writeFileSync(diskPath, audioResult.audioBuffer);
        } catch (e) {
          console.warn('Failed to persist TTS cache file:', e.message);
        }

        return {
          audioBuffer: audioResult.audioBuffer,
          contentType: audioResult.contentType,
          cached: false,
          provider: activeProvider,
          voice: effectiveVoice
        };
      }

      return {
        fallback: true,
        error: 'Provider synthesis returned empty audio buffer.'
      };
    } catch (err) {
      console.error(`TTS synthesis error for provider '${activeProvider}':`, err.message);
      return {
        fallback: true,
        error: `Provider '${activeProvider}' error: ${err.message}`
      };
    }
  }

  /**
   * Default voices per provider
   */
  static getDefaultVoice(provider) {
    if (provider === 'azure') return process.env.AZURE_SPEECH_VOICE || 'en-US-AriaNeural';
    if (provider === 'openai') return process.env.OPENAI_TTS_VOICE || 'nova';
    if (provider === 'elevenlabs') return process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    return 'en-US-AriaNeural';
  }

  /**
   * Azure Cognitive Services Speech REST API with SSML
   */
  static async synthesizeAzure({ text, voice, rate, pitch, style }) {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const escapedText = this.escapeXml(text);
    const ssmlRate = rate || '0.92';
    const ssmlPitch = pitch || '0%';
    const ssmlStyle = style || 'chat';

    // Construct SSML with prosody rate and calm conversational style
    const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="${voice}">
    <mstts:express-as style="${ssmlStyle}">
      <prosody rate="${ssmlRate}" pitch="${ssmlPitch}">
        ${escapedText}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>`.trim();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'MindVisionClinicalAI'
      },
      body: ssml
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Azure Speech API failed with HTTP ${response.status}: ${errText}`);
    }

    const arrayBuf = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuf),
      contentType: 'audio/mpeg'
    };
  }

  /**
   * OpenAI Text-To-Speech (tts-1-hd)
   */
  static async synthesizeOpenAI({ text, voice, rate }) {
    const key = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_TTS_MODEL || 'tts-1-hd';
    const speed = parseFloat(rate) || 0.92;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        voice: voice || 'nova',
        input: text,
        speed,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI TTS API failed with HTTP ${response.status}: ${errText}`);
    }

    const arrayBuf = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuf),
      contentType: 'audio/mpeg'
    };
  }

  /**
   * ElevenLabs Neural TTS
   */
  static async synthesizeElevenLabs({ text, voice }) {
    const key = process.env.ELEVENLABS_API_KEY;
    const voiceId = voice || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.85
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`ElevenLabs API failed with HTTP ${response.status}: ${errText}`);
    }

    const arrayBuf = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuf),
      contentType: 'audio/mpeg'
    };
  }
}
