/**
 * MindVision Clinical AI - Text-To-Speech Controller
 */

import { TTSService } from '../services/ttsService.js';

export class TTSController {
  /**
   * POST /api/tts/synthesize
   * Stream or return neural audio MP3 buffer, or signal fallback
   */
  static async synthesize(req, res) {
    try {
      const { text, provider, voice, rate, pitch, style } = req.body || {};

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({
          success: false,
          fallback: true,
          error: 'Parameter "text" is required and must be a non-empty string.'
        });
      }

      if (text.length > 2000) {
        return res.status(400).json({
          success: false,
          fallback: true,
          error: 'Text length exceeds maximum allowed limit (2000 chars).'
        });
      }

      const result = await TTSService.synthesize({
        text,
        provider,
        voice,
        rate,
        pitch,
        style
      });

      if (result.fallback) {
        // Signal client to seamlessly trigger emergency local speech synthesis fallback
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          fallback: true,
          error: result.error
        }));
      }

      // Return binary MP3 audio buffer
      res.writeHead(200, {
        'Content-Type': result.contentType || 'audio/mpeg',
        'Content-Length': result.audioBuffer.length,
        'X-TTS-Cached': String(Boolean(result.cached)),
        'X-TTS-Source': result.source || result.provider || 'cloud',
        'Cache-Control': 'public, max-age=86400'
      });
      return res.end(result.audioBuffer);
    } catch (err) {
      console.error('TTSController synthesis error:', err.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        fallback: true,
        error: err.message
      }));
    }
  }

  /**
   * GET /api/tts/status
   * Health and configuration state of TTS providers
   */
  static getStatus(req, res) {
    const activeProvider = TTSService.getActiveProvider();
    const isConfigured = TTSService.isConfigured(activeProvider);
    const cachedCount = TTSService.getCacheSize();

    return res.json({
      success: true,
      activeProvider,
      isConfigured,
      cachedCount,
      supportedProviders: ['azure', 'openai', 'elevenlabs'],
      defaultVoice: TTSService.getDefaultVoice(activeProvider)
    });
  }
}
