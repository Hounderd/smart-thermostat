import assert from 'node:assert/strict';

import { getBillableActionMinutes, getBillableRuntimeMinutes } from './analyticsMetrics.js';

const history = [
  { action: 'HEAT' },
  { action: 'COOL' },
  { action: 'FAN_COOL' },
  { action: 'IDLE' },
  { action: 'FAN_COOL' },
];

assert.equal(getBillableRuntimeMinutes(history), 2);
assert.equal(getBillableActionMinutes(history, 'HEAT'), 1);
assert.equal(getBillableActionMinutes(history, 'COOL'), 1);
assert.equal(getBillableActionMinutes(history, 'FAN_COOL'), 0);
