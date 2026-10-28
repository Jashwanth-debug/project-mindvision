import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  THEMATIC_QUESTION_BANK,
  getInitialQuestion,
  determineNextQuestion,
  getConversationalAcknowledgement,
  getFriendlyProgress,
  recordSessionCompleted,
  getRecentQuestionHistory,
  checkForCrisisTriggers
} from '../../frontend/src/utils/conversationEngine.js';

// Polyfill minimal localStorage for Node test runner
const memoryStorage = {};
global.localStorage = {
  getItem: (key) => memoryStorage[key] || null,
  setItem: (key, val) => { memoryStorage[key] = String(val); },
  removeItem: (key) => { delete memoryStorage[key]; },
  clear: () => {
    Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
  }
};

describe('Adaptive Conversational Question Engine', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  it('provides at least 20 diverse question variants across 6 distinct themes', () => {
    const themes = Object.keys(THEMATIC_QUESTION_BANK);
    assert.deepStrictEqual(
      themes.sort(),
      ['coping', 'energy', 'mood', 'sleep', 'social_connection', 'stress'].sort()
    );

    let totalVariants = 0;
    themes.forEach((theme) => {
      const variants = THEMATIC_QUESTION_BANK[theme];
      assert.ok(Array.isArray(variants), `Theme ${theme} should have an array of variants`);
      assert.ok(variants.length >= 4, `Theme ${theme} should have at least 4 variants`);
      variants.forEach((v) => {
        assert.ok(v.id, `Variant in ${theme} must have an id`);
        assert.ok(v.prompt, `Variant ${v.id} must have a prompt`);
        assert.ok(v.theme === theme, `Variant ${v.id} theme must match ${theme}`);
        totalVariants++;
      });
    });

    assert.ok(totalVariants >= 20, `Total variants should be >= 20, received ${totalVariants}`);
  });

  it('selects initial question from mood theme and avoids recent session IDs', () => {
    const q1 = getInitialQuestion();
    assert.ok(q1);
    assert.strictEqual(q1.theme, 'mood');

    // Simulate saving session with q1.id
    recordSessionCompleted([q1.id], ['mood']);
    const history = getRecentQuestionHistory();
    assert.strictEqual(history.length, 1);
    assert.deepStrictEqual(history[0].questionIds, [q1.id]);

    // Next initial question should rotate away from q1.id
    const q2 = getInitialQuestion();
    assert.ok(q2);
    assert.strictEqual(q2.theme, 'mood');
    assert.notStrictEqual(q2.id, q1.id, 'q2 should differ from recently asked q1');
  });

  it('adaptively branches to stress question when patient expresses tension and pressure', () => {
    const answer = "I've been feeling so much stress and pressure at work with endless deadlines.";
    const asked = ['mood_v1'];
    const nextQ = determineNextQuestion(answer, asked, 1, 4);

    assert.ok(nextQ);
    assert.strictEqual(nextQ.theme, 'stress');
    assert.ok(!asked.includes(nextQ.id));
  });

  it('adaptively branches to sleep question when patient expresses insomnia or restless nights', () => {
    const answer = "My sleep has been terrible, waking up at 3am restless.";
    const asked = ['mood_v1'];
    const nextQ = determineNextQuestion(answer, asked, 1, 4);

    assert.ok(nextQ);
    assert.strictEqual(nextQ.theme, 'sleep');
  });

  it('adaptively branches to social connection when patient expresses feeling lonely or isolated', () => {
    const answer = "I feel pretty lonely and disconnected from my friends lately.";
    const asked = ['mood_v1'];
    const nextQ = determineNextQuestion(answer, asked, 1, 4);

    assert.ok(nextQ);
    assert.strictEqual(nextQ.theme, 'social_connection');
  });

  it('always concludes on coping & grounding strengths as the final question before wrap-up', () => {
    // If questionCount === 3 in a 4-question check-in
    const answer = "I felt tired during the afternoon.";
    const asked = ['mood_v1', 'stress_v1', 'energy_v1'];
    const finalQ = determineNextQuestion(answer, asked, 3, 4);

    assert.ok(finalQ);
    assert.strictEqual(finalQ.theme, 'coping');
  });

  it('returns null when target question count is reached to gracefully complete assessment', () => {
    const answer = "Taking walks and deep breathing helps.";
    const asked = ['mood_v1', 'stress_v1', 'energy_v1', 'coping_v1'];
    const end = determineNextQuestion(answer, asked, 4, 4);

    assert.strictEqual(end, null);
  });

  it('rotates empathetic acknowledgments without rigid immediate repetition', () => {
    const ack1 = getConversationalAcknowledgement("Work stress is piling up", 1, false);
    const ack2 = getConversationalAcknowledgement("Work stress is piling up", 2, false);

    assert.ok(typeof ack1 === 'string' && ack1.length > 0);
    assert.ok(typeof ack2 === 'string' && ack2.length > 0);
    // Since we have 4 stress acknowledgment variants and filter out the last one, ack1 and ack2 should not be identical
    assert.notStrictEqual(ack1, ack2, 'Subsequent acknowledgments for the same category should rotate');
  });

  it('returns soft pacing text without rigid Question/Step X of Y counters', () => {
    const progressMood = getFriendlyProgress(1, 'mood');
    const progressSleep = getFriendlyProgress(2, 'sleep');
    const progressCoping = getFriendlyProgress(4, 'coping');

    [progressMood, progressSleep, progressCoping].forEach((text) => {
      assert.ok(typeof text === 'string');
      assert.ok(!text.includes('Question '), `Progress "${text}" should not expose rigid "Question X"`);
      assert.ok(!text.includes('Step '), `Progress "${text}" should not expose rigid "Step X"`);
      assert.ok(!text.includes('of 4') && !text.includes('of 6'), `Progress "${text}" should not expose "of N" script`);
    });
  });

  it('accurately identifies crisis triggers for safety escalation', () => {
    assert.strictEqual(checkForCrisisTriggers("I want to end my life"), true);
    assert.strictEqual(checkForCrisisTriggers("thinking about suicide"), true);
    assert.strictEqual(checkForCrisisTriggers("feeling like I want to hurt myself"), true);
    assert.strictEqual(checkForCrisisTriggers("Just feeling tired from work"), false);
  });
});
