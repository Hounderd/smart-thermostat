import assert from 'node:assert/strict';

import { DASHBOARD_MODES, getModeButtonClasses } from './dashboardModes.js';

assert.deepEqual(
  DASHBOARD_MODES.map((mode) => mode.value),
  ['HEAT', 'COOL', 'AUTO', 'OFF'],
);

assert.match(
  getModeButtonClasses({ mode: 'AUTO', active_call: 'HEAT' }, 'AUTO'),
  /bg-neonOrange/,
);
assert.match(
  getModeButtonClasses({ mode: 'AUTO', active_call: 'COOL' }, 'AUTO'),
  /bg-neonBlue/,
);
assert.match(
  getModeButtonClasses({ mode: 'AUTO', active_call: null }, 'AUTO'),
  /bg-neonGreen/,
);
assert.match(
  getModeButtonClasses({ mode: 'AUTO', active_call: 'HEAT' }, 'HEAT'),
  /bg-background/,
);
