import test from 'node:test';
import assert from 'node:assert/strict';
import { TelemetryTimelineService } from '../src/services/telemetryTimelineService.js';

test('TelemetryTimelineService: Timeline and Longitudinal Analytics', async (t) => {
  await t.test('returns active timeline points with valid structure', () => {
    const timeline = TelemetryTimelineService.getActiveTimeline();
    assert.ok(Array.isArray(timeline), 'Timeline should be an array');
    assert.ok(timeline.length > 0, 'Timeline should not be empty');
    assert.ok(timeline[0].timestamp !== undefined, 'Timestamp must exist');
    assert.ok(timeline[0].compositeRisk !== undefined, 'compositeRisk must exist');
  });

  await t.test('records a new timeline point successfully', () => {
    TelemetryTimelineService.resetSession();
    assert.equal(TelemetryTimelineService.activeBuffer.length, 0);

    const point = TelemetryTimelineService.recordTimelinePoint({
      au4: 0.65,
      au15: 0.45,
      acousticJitter: 0.35,
      incongruence: 0.25,
      compositeRisk: 6.2,
      signalQuality: 90
    });

    assert.ok(point.id, 'Point should have generated an id');
    assert.equal(point.au4, 0.65);
    assert.equal(TelemetryTimelineService.activeBuffer.length, 1);

    // After 8 or more recorded points, activeBuffer is returned directly
    for (let i = 0; i < 7; i++) {
      TelemetryTimelineService.recordTimelinePoint({ au4: 0.5, au15: 0.5 });
    }
    const fullTimeline = TelemetryTimelineService.getActiveTimeline();
    assert.equal(fullTimeline.length, 8);
  });

  await t.test('calculates delta without throwing errors when given empty or null metrics', () => {
    const deltaDefault = TelemetryTimelineService.calculateDelta();
    assert.ok(deltaDefault, 'Delta should return a comparison object');
    assert.ok(deltaDefault.deltas, 'Delta must contain deltas property');
    assert.ok(deltaDefault.previous, 'Delta must contain previous session');
    assert.ok(deltaDefault.current, 'Delta must contain current session');

    const deltaNull = TelemetryTimelineService.calculateDelta(null);
    assert.ok(deltaNull, 'Delta with null should return safely');

    const deltaCustom = TelemetryTimelineService.calculateDelta({
      compositeRisk: 7.5,
      signalQuality: 92,
      au4: 0.70,
      prosody: 0.50,
      incongruence: 0.30
    });
    assert.ok(deltaCustom.deltas.indicator, 'Indicator delta should be calculated');
    assert.ok(deltaCustom.summaryText, 'Summary text should be generated');
  });

  await t.test('returns longitudinal sessions history', () => {
    const sessions = TelemetryTimelineService.getLongitudinalSessions();
    assert.ok(Array.isArray(sessions), 'Sessions should be an array');
    assert.ok(sessions.length >= 3, 'Should have initial historical sessions');
  });
});
