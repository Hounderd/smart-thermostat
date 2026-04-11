# Auto Fan Cooling Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `AUTO`-only `FAN_COOL` path that uses the fan relay instead of compressor cooling when outdoor temperature is below a configurable threshold, and reflect that concrete state in the dashboard.

**Architecture:** Extend the thermostat state machine with a distinct `FAN_COOL` active state and new AUTO fan-cooling settings. Keep manual `COOL`, compressor lockout, and AUTO changeover delay intact while teaching the dashboard to color both the `AUTO` button and main temperature card from the concrete active state.

**Tech Stack:** Python, FastAPI, React, plain `unittest`, Node-based dashboard tests

---

## Chunk 1: Backend `FAN_COOL` state machine

### Task 1: Add failing thermostat tests

**Files:**
- Modify: `tests/test_auto_mode.py`
- Modify: `thermostat.py`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- `AUTO` starting `FAN_COOL` below the configured outdoor threshold
- `AUTO` starting compressor `COOL` above the threshold
- `FAN_COOL` energizing only the fan relay
- `FAN_COOL` appearing in status/history
- AUTO changeover delay treating `FAN_COOL` as part of the cooling family

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_auto_mode -v`
Expected: FAIL because `FAN_COOL` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Add:
- `FAN_COOL` active state support
- settings-backed AUTO fan-cooling threshold logic
- cooling-family handling for AUTO changeover delay
- status/history support for `FAN_COOL`

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests.test_auto_mode -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add thermostat.py tests/test_auto_mode.py
git commit -m "feat: add auto fan cooling backend"
```

## Chunk 2: Settings model and Analytics configuration

### Task 2: Add failing settings coverage

**Files:**
- Modify: `api.py`
- Modify: `tests/test_api_settings.py`
- Modify: `smart-thermostat/src/pages/Analytics.jsx`

- [ ] **Step 1: Write the failing settings tests**

Add coverage for:
- `auto_fan_cool_enabled`
- `auto_fan_cool_max_outside_temp`

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_api_settings -v`
Expected: FAIL because the settings model does not accept the new fields yet.

- [ ] **Step 3: Write the minimal implementation**

Add the new settings to:
- FastAPI `SystemSettings`
- thermostat defaults
- Analytics controls

- [ ] **Step 4: Run settings verification**

Run: `python -m unittest tests.test_api_settings -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api.py tests/test_api_settings.py smart-thermostat/src/pages/Analytics.jsx
git commit -m "feat: add auto fan cooling settings"
```

## Chunk 3: Dashboard accent updates

### Task 3: Add failing dashboard tests

**Files:**
- Modify: `smart-thermostat/src/pages/dashboardModes.js`
- Modify: `smart-thermostat/src/pages/dashboardModes.test.js`
- Modify: `smart-thermostat/src/pages/Dashboard.jsx`

- [ ] **Step 1: Write the failing dashboard tests**

Add coverage for:
- `FAN_COOL` mapping to white accents
- the main temperature card using the same concrete active-state color logic as the `AUTO` button

- [ ] **Step 2: Run test to verify it fails**

Run: `node smart-thermostat/src/pages/dashboardModes.test.js`
Expected: FAIL because `FAN_COOL` accent mapping does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Update dashboard helpers/components so:
- `HEAT` => orange
- `COOL` => blue
- `FAN_COOL` => white
- idle `AUTO` => green

- [ ] **Step 4: Run dashboard verification**

Run: `node smart-thermostat/src/pages/dashboardModes.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add smart-thermostat/src/pages/dashboardModes.js smart-thermostat/src/pages/dashboardModes.test.js smart-thermostat/src/pages/Dashboard.jsx
git commit -m "feat: reflect auto fan cooling in dashboard"
```

## Chunk 4: Final verification and handoff

### Task 4: Verify and document

**Files:**
- Modify: `docs/2026-04-10-session-handoff.md`

- [ ] **Step 1: Run Python verification**

Run: `python -m unittest tests.test_auto_mode tests.test_api_settings tests.test_auto_reboot tests.test_cooling_lockout tests.test_weather_fetch tests.test_api_status tests.test_frontend_paths -v`
Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run:
- `node smart-thermostat/src/pages/dashboardState.test.js`
- `node smart-thermostat/src/pages/dashboardModes.test.js`

Expected: PASS

- [ ] **Step 3: Run compile verification**

Run: `python -m compileall api.py thermostat.py auto_reboot.py cooling_lockout.py weather_fetch.py`
Expected: PASS

- [ ] **Step 4: Build the frontend**

Run: `npm run build`
Working directory: `smart-thermostat`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/2026-04-10-session-handoff.md
git commit -m "docs: record auto fan cooling work"
```
