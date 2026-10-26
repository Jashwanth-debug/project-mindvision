import test from 'node:test';
import assert from 'node:assert/strict';
import { TTSService } from '../src/services/ttsService.js';

test('TTSService: SSML XML Escaping & Utilities', async (t) => {
  await t.test('escapes XML special characters safely for SSML', () => {
    const raw = `Let's test & verify <special> "quotes" and 'apostrophes'`;
    const escaped = TTSService.escapeXml(raw);
    assert.equal(escaped, `Let&apos;s test &amp; verify &lt;special&gt; &quot;quotes&quot; and &apos;apostrophes&apos;`);
  });

  await t.test('handles empty or null text safely in escapeXml', () => {
    assert.equal(TTSService.escapeXml(''), '');
    assert.equal(TTSService.escapeXml(null), '');
    assert.equal(TTSService.escapeXml(undefined), '');
  });

  await t.test('computes deterministic SHA-256 cache key', () => {
    const key1 = TTSService.computeCacheKey('azure', 'en-US-AriaNeural', '0.92', '0%', 'chat', 'Hello world');
    const key2 = TTSService.computeCacheKey('azure', 'en-US-AriaNeural', '0.92', '0%', 'chat', 'hello world ');
    const keyDiff = TTSService.computeCacheKey('azure', 'en-US-JennyNeural', '0.92', '0%', 'chat', 'Hello world');

    assert.equal(key1, key2, 'Case and trailing whitespace differences should normalize to same hash');
    assert.notEqual(key1, keyDiff, 'Different voice should result in different hash');
    assert.equal(key1.length, 64, 'SHA-256 hex string should be 64 characters');
  });

  await t.test('rejects empty, non-string, or oversized inputs', async () => {
    await assert.rejects(async () => {
      await TTSService.synthesize({ text: '' });
    }, /Valid text is required/);

    await assert.rejects(async () => {
      await TTSService.synthesize({ text: null });
    }, /Valid text is required/);

    await assert.rejects(async () => {
      await TTSService.synthesize({ text: 'a'.repeat(2001) });
    }, /exceeds maximum safe length/);
  });

  await t.test('returns graceful fallback flag when provider credentials are not in environment', async () => {
    // Ensure clean test environment without cloud keys
    const origAzure = process.env.AZURE_SPEECH_KEY;
    const origOpenAI = process.env.OPENAI_API_KEY;
    const origEleven = process.env.ELEVENLABS_API_KEY;
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;

    try {
      const result = await TTSService.synthesize({ text: 'How have you been feeling?' });
      assert.equal(result.fallback, true, 'Should signal fallback when unconfigured');
      assert.ok(result.error.includes('not configured'), 'Error should explain missing configuration');
    } finally {
      if (origAzure) process.env.AZURE_SPEECH_KEY = origAzure;
      if (origOpenAI) process.env.OPENAI_API_KEY = origOpenAI;
      if (origEleven) process.env.ELEVENLABS_API_KEY = origEleven;
    }
  });
});
