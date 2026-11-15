import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdown, toLocalDateTime } from './schedule.js';

test('countdown respects timezone offsets and never becomes negative', () => {
  const start = '2026-11-16T19:00:00+07:00';
  assert.equal(countdown(start, Date.parse('2026-11-15T11:58:59Z')).text, '1d 00h 01m 01s');
  assert.equal(countdown(start, Date.parse('2026-11-16T12:00:00Z')).seconds, 0);
  assert.equal(countdown(start, Date.parse('2026-11-17T12:00:00Z')).seconds, 0);
  assert.equal(countdown(null), null);
  assert.equal(countdown('invalid'), null);
});
test('editing a schedule preserves the instant through local form conversion', () => {
  const instant = '2026-11-16T12:00:00.000Z';
  assert.equal(new Date(toLocalDateTime(instant)).toISOString(), instant);
  assert.equal(toLocalDateTime(null), '');
});
