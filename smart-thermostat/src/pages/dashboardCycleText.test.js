import assert from 'node:assert/strict';

import { getCycleText } from './dashboardCycleText.js';

const now = 10_000;

assert.equal(
  getCycleText({
    now,
    active: true,
    active_call: 'HEAT',
    run_start: now - (3 * 60),
    last_duration: 0,
    last_end: 0,
  }),
  'Running HEATING 3m',
);

assert.equal(
  getCycleText({
    now,
    active: false,
    active_call: null,
    run_start: 0,
    last_duration: 3 * 60,
    last_end: now - (59 * 60),
    last_active_call: 'COOL',
  }),
  'Ran COOLING 3m • 59m ago',
);

assert.equal(
  getCycleText({
    now,
    active: false,
    active_call: null,
    run_start: 0,
    last_duration: 12 * 60,
    last_end: now - (4 * 60),
    last_active_call: 'FAN_COOL',
  }),
  'Ran FAN COOLING 12m • 4m ago',
);
