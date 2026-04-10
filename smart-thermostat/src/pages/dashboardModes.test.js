import assert from 'node:assert/strict';

import { DASHBOARD_MODES } from './dashboardModes.js';

assert.deepEqual(
  DASHBOARD_MODES.map((mode) => mode.value),
  ['HEAT', 'COOL', 'AUTO', 'OFF'],
);
