# Auto Changeover Delay Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable `AUTO` heat/cool changeover delay that prevents direct opposite-call switching for a short period while preserving the existing cooling compressor lockout.

**Architecture:** Extend the thermostat state machine to remember the last stopped HVAC call and gate opposite-call starts in `AUTO` until the configured delay expires. Surface the delay state in `/status`, add the setting to the Analytics configuration model, and keep compressor lockout as a separate cooling-only rule.

**Tech Stack:** Python, FastAPI, React, plain `unittest`, Node-based page tests

---

## Chunk 1: Backend changeover state machine

### Task 1: Add failing thermostat tests

**Files:**
- Modify: `tests/test_auto_mode.py`
- Modify: `thermostat.py`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- blocking `HEAT -> COOL` in `AUTO` until the delay expires
- blocking `COOL -> HEAT` in `AUTO` until the delay expires
- exposing `auto_changeover_pending` and `auto_changeover_until` in status

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_auto_mode -v`
Expected: FAIL because the delay tracking does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Add:
- a configurable `auto_changeover_delay_minutes` setting with a default of `2`
- state tracking for the last stopped call and stop timestamp
- `AUTO` gating logic for opposite-call starts
- status serialization for pending delay state

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests.test_auto_mode -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add thermostat.py tests/test_auto_mode.py
git commit -m "feat: add auto changeover delay state machine"
```

## Chunk 2: Settings and Analytics support

### Task 2: Add failing settings/UI coverage

**Files:**
- Modify: `api.py`
- Modify: `smart-thermostat/src/pages/Analytics.jsx`

- [ ] **Step 1: Write the failing coverage**

Add the new setting to the settings model and extend the Analytics state so `auto_changeover_delay_minutes` is loaded, edited, and saved.

- [ ] **Step 2: Run verification to observe the missing field**

Run: `python -m unittest tests.test_api_status -v`
Expected: FAIL if the setting model rejects the new field or status/settings round-trip is incomplete.

- [ ] **Step 3: Implement the minimal settings/UI update**

Add:
- `auto_changeover_delay_minutes` to the FastAPI settings model
- an Analytics configuration control for the delay in minutes

- [ ] **Step 4: Re-run the relevant checks**

Run: `python -m unittest tests.test_api_status -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api.py smart-thermostat/src/pages/Analytics.jsx
git commit -m "feat: add auto changeover delay setting"
```

## Chunk 3: Final verification and handoff

### Task 3: Verify, document, and prepare integration

**Files:**
- Modify: `docs/2026-04-10-session-handoff.md`

- [ ] **Step 1: Run Python verification**

Run: `python -m unittest tests.test_auto_mode tests.test_auto_reboot tests.test_cooling_lockout tests.test_weather_fetch tests.test_api_status tests.test_frontend_paths -v`
Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run: `node smart-thermostat/src/pages/dashboardModes.test.js`
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
git commit -m "docs: record auto changeover delay work"
```
