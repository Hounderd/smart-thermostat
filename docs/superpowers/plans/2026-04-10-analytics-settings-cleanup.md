# Analytics Settings Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Analytics configuration panel into a cleaner, sectioned settings form without changing settings behavior or API contracts.

**Architecture:** Keep the existing settings model and save flow intact, but reorganize the panel into stacked semantic sections with consistent row/card treatment for controls. Use small local JSX helpers if needed to keep `Analytics.jsx` maintainable.

**Tech Stack:** React, Tailwind-style utility classes, existing page/component tests, Vite build

---

## Chunk 1: Restructure the configuration layout

### Task 1: Refactor the Analytics settings panel

**Files:**
- Modify: `smart-thermostat/src/pages/Analytics.jsx`

- [ ] **Step 1: Write the smallest failing or missing layout expectation**

Document the target structure in code comments or local helper extraction plan before changing markup:
- `Cost & Equipment`
- `Thermostat Behavior`
- `Maintenance & Restart`

- [ ] **Step 2: Implement the layout refactor**

Reorganize the settings panel so:
- cost/equipment inputs stay in a simple 2-column grid
- thermostat behavior controls become stacked setting rows/cards
- `AUTO Fan Cooling` becomes a full-width row
- restart and maintenance items become their own section
- `Save` remains bottom-right

- [ ] **Step 3: Keep the settings payload unchanged**

Confirm all existing inputs still read/write the same `settings` state keys.

- [ ] **Step 4: Commit**

```bash
git add smart-thermostat/src/pages/Analytics.jsx
git commit -m "refactor: clean up analytics settings layout"
```

## Chunk 2: Verify the page still behaves correctly

### Task 2: Run frontend verification

**Files:**
- Modify: `docs/2026-04-10-session-handoff.md`

- [ ] **Step 1: Run existing frontend tests**

Run:
- `node smart-thermostat/src/pages/dashboardState.test.js`
- `node smart-thermostat/src/pages/dashboardModes.test.js`

Expected: PASS

- [ ] **Step 2: Build the frontend**

Run: `npm run build`
Working directory: `smart-thermostat`
Expected: PASS

- [ ] **Step 3: Update handoff docs**

Record that the Analytics configuration panel was visually reorganized into sectioned settings groups.

- [ ] **Step 4: Commit**

```bash
git add docs/2026-04-10-session-handoff.md
git commit -m "docs: record analytics settings cleanup"
```
