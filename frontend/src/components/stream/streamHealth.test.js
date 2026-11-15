import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incomingBitrate } from './streamHealth.js';

test('bitrate uses byte delta and actual elapsed time in Mbps', () => {
  assert.equal(incomingBitrate({ sourceId: 'a', bytesReceived: 100 }, { sourceId: 'a', ready: true, bytesReceived: 1250100 }, 5000), 2);
});
test('does not show stale or negative bitrate after reconnect, reset or offline', () => {
  const old = { sourceId: 'a', bytesReceived: 100 };
  for (const current of [
    { sourceId: 'b', ready: true, bytesReceived: 200 },
    { sourceId: 'a', ready: true, bytesReceived: 0 },
    { sourceId: 'a', ready: false, bytesReceived: 200 },
  ]) assert.equal(incomingBitrate(old, current, 1000), null);
  assert.equal(incomingBitrate(null, old, 1000), null);
  assert.equal(incomingBitrate(old, old, 0), null);
});
