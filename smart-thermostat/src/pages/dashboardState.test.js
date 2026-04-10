import assert from 'node:assert/strict';

import { buildControlTransaction, matchesControlPayload } from './dashboardState.js';

const current = {
  mode: 'OFF',
  target: 72,
  fan_mode: 'AUTO',
  eco_mode: false,
};

const first = buildControlTransaction(current, { target: 73 });
const second = buildControlTransaction(first.nextData, { target: 74 });
const third = buildControlTransaction(second.nextData, { mode: 'COOL' });
const fourth = buildControlTransaction(third.nextData, { mode: 'AUTO' });

assert.equal(first.payload.target, 73);
assert.equal(second.payload.target, 74);
assert.equal(third.payload.target, 74);
assert.equal(third.payload.mode, 'COOL');
assert.equal(fourth.payload.mode, 'AUTO');
assert.equal(
  matchesControlPayload(
    { mode: 'COOL', target: 74, fan_mode: 'AUTO', eco_mode: false },
    third.payload,
  ),
  true,
);
assert.equal(
  matchesControlPayload(
    { mode: 'AUTO', target: 74, fan_mode: 'AUTO', eco_mode: false },
    fourth.payload,
  ),
  true,
);
