# Fan Cool Analytics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exclude `FAN_COOL` from paid HVAC runtime analytics and make the dashboard cycle text name the current or last HVAC action.

**Architecture:** Leave thermostat history recording unchanged and centralize analytics runtime classification plus cycle-text formatting in small frontend helpers. Make `Analytics.jsx` and `Dashboard.jsx` consume those helpers so `FAN_COOL` is consistently treated as non-billable assist runtime and dashboard wording stays derived from `active_call`.

**Tech Stack:** React, Vite, plain JavaScript, existing Node-based page tests

---

## File Map

- Modify: `smart-thermostat/src/pages/Analytics.jsx`
  - Replace ad hoc runtime and cost filters with a shared analytics classification helper.
- Create: `smart-thermostat/src/pages/analyticsMetrics.js`
  - Define the billable runtime action set and expose helpers for counting runtime and cost-driving minutes.
- Create: `smart-thermostat/src/pages/analyticsMetrics.test.js`
  - Cover mixed histories so `FAN_COOL` is excluded from runtime and cost totals.
- Create: `smart-thermostat/src/pages/dashboardCycleText.js`
  - Format the cycle-status line from `active_call`, `last_duration`, and `last_end`.
- Create: `smart-thermostat/src/pages/dashboardCycleText.test.js`
  - Cover active and last-run wording for `HEAT`, `COOL`, and `FAN_COOL`.
- Modify: `smart-thermostat/src/pages/Dashboard.jsx`
  - Swap inline cycle-text logic for the shared helper.
- Modify: `docs/2026-04-10-session-handoff.md`
  - Note the analytics/runtime change for future sessions.

## Chunk 1: Add failing helper tests

### Task 1: Write analytics and cycle-text tests first

**Files:**
- Create: `smart-thermostat/src/pages/analyticsMetrics.test.js`
- Create: `smart-thermostat/src/pages/dashboardCycleText.test.js`

- [ ] **Step 1: Write the failing analytics test**
- [ ] **Step 2: Run `node smart-thermostat/src/pages/analyticsMetrics.test.js` and verify it fails because the helper does not exist**
- [ ] **Step 3: Write the failing dashboard cycle-text test**
- [ ] **Step 4: Run `node smart-thermostat/src/pages/dashboardCycleText.test.js` and verify it fails because the helper does not exist**

## Chunk 2: Implement the minimal helpers

### Task 2: Add analytics classification and cycle-text helpers

**Files:**
- Create: `smart-thermostat/src/pages/analyticsMetrics.js`
- Create: `smart-thermostat/src/pages/dashboardCycleText.js`
- Test: `smart-thermostat/src/pages/analyticsMetrics.test.js`
- Test: `smart-thermostat/src/pages/dashboardCycleText.test.js`

- [ ] **Step 1: Implement billable runtime helpers with `HEAT` and `COOL` as the only billable actions**
- [ ] **Step 2: Implement cycle-text formatting with human-readable labels for `HEAT`, `COOL`, and `FAN_COOL`**
- [ ] **Step 3: Run both helper tests and verify they pass**

## Chunk 3: Wire the page components

### Task 3: Switch Analytics.jsx and Dashboard.jsx to the shared helpers

**Files:**
- Modify: `smart-thermostat/src/pages/Analytics.jsx`
- Modify: `smart-thermostat/src/pages/Dashboard.jsx`

- [ ] **Step 1: Replace inline runtime and cost filters in `Analytics.jsx`**
- [ ] **Step 2: Replace inline cycle-text generation in `Dashboard.jsx`**
- [ ] **Step 3: Run targeted verification**

Run:
- `node smart-thermostat/src/pages/analyticsMetrics.test.js`
- `node smart-thermostat/src/pages/dashboardCycleText.test.js`
- `node smart-thermostat/src/pages/dashboardState.test.js`
- `node smart-thermostat/src/pages/dashboardModes.test.js`
- `npm run build`

Expected:
- all tests pass
- frontend build succeeds

## Chunk 4: Final documentation and integration

### Task 4: Update handoff notes and prepare PR flow

**Files:**
- Modify: `docs/2026-04-10-session-handoff.md`

- [ ] **Step 1: Note that `FAN_COOL` is excluded from paid HVAC runtime analytics**
- [ ] **Step 2: Note that the dashboard cycle text now includes the concrete call name**
- [ ] **Step 3: Run final verification again if any cleanup changed code**
- [ ] **Step 4: Push the feature branch and open a PR with `gh`**
