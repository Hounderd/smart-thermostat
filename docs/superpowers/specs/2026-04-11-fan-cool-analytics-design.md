# Fan Cool Analytics Design

## Goal

Exclude `FAN_COOL` from paid HVAC runtime analytics so low-cost AUTO fan cooling does not inflate runtime or cost reporting.

Also make the small dashboard cycle-status line use the concrete HVAC call name so recent activity is readable without changing the main `RUNNING` / `IDLE` chip.

## Requirements

- Keep raw history and live status unchanged so the system still records when `FAN_COOL` happened.
- Treat `HEAT` and compressor `COOL` as billable HVAC runtime.
- Treat `FAN_COOL` as non-billable assist runtime for analytics purposes.
- Keep estimated cost behavior aligned with the same billable runtime definition.
- Apply this consistently anywhere analytics runtime totals are derived from history, not just on one summary card.
- Keep the main header chip unchanged as `RUNNING` / `IDLE`.
- Update only the smaller cycle text to mention the concrete current or last action.

## Analytics Model

Analytics should distinguish between:

- billable HVAC runtime
- non-billable assist actions

For the current action set:

- `HEAT` counts as billable runtime
- `COOL` counts as billable runtime
- `FAN_COOL` does not count as billable runtime
- `IDLE` does not count as runtime

This keeps analytics aligned with the product meaning:

- compressor cooling and heating represent meaningful equipment runtime and energy cost
- `FAN_COOL` is an energy-saving AUTO assist path and should remain visible in raw history, but not inflate paid-runtime analytics

## Backend Design

Files:

- [thermostat.py](/C:/Users/Hound/Desktop/smart-thermostat/thermostat.py)

No thermostat control logic needs to change. The backend should continue recording `FAN_COOL` in history exactly as it does now.

The only backend requirement is to preserve enough fidelity in the stored history for analytics to classify actions correctly. The current action history already does that.

## Frontend Design

Files:

- [smart-thermostat/src/pages/Analytics.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Analytics.jsx)
- [smart-thermostat/src/pages/Dashboard.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Dashboard.jsx)

Introduce a small analytics classification helper so runtime calculations are derived from one shared definition rather than repeated ad hoc filters.

Initial billable runtime rule:

- billable runtime actions are `HEAT` and `COOL`

Use that helper for:

- `Runtime (24H)`
- `Est. Cost (24H)`
- any other Analytics-derived totals in this page that currently interpret any non-`IDLE` action as runtime

Do not remove `FAN_COOL` from the historical chart data itself unless the chart is explicitly intended to represent billable HVAC runtime only.

For the dashboard cycle text:

- when active, show `Running <STATE> <minutes>m`
- when idle with recent history, show `Ran <STATE> <minutes>m • <minutes>m ago`
- state labels should be human-readable:
  - `HEAT` => `HEATING`
  - `COOL` => `COOLING`
  - `FAN_COOL` => `FAN COOLING`
- if no concrete state is available, fall back to the existing generic text behavior

## Testing

Required coverage:

- Analytics runtime totals exclude `FAN_COOL`
- Estimated cost remains based only on `HEAT` and compressor `COOL`
- Mixed histories containing `HEAT`, `COOL`, `FAN_COOL`, and `IDLE` produce the expected runtime totals
- Dashboard cycle text formats active and last-run text with `HEATING`, `COOLING`, and `FAN COOLING`

## Risks

- If runtime filtering stays duplicated inline, future analytics additions can easily regress and start counting `FAN_COOL` again.
- If `FAN_COOL` is removed from raw history instead of just analytics totals, the system loses visibility into when the free-cooling path actually ran.
- If dashboard wording is tied too tightly to raw enum values, UI text will become brittle as more active states are added later.
