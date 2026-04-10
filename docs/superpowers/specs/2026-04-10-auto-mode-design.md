# Auto Mode Design

## Goal

Add an `AUTO` thermostat mode that uses the existing single target temperature and automatically decides whether to heat, cool, or stay idle.

## Requirements

- Keep the existing single target temperature UI.
- Add `AUTO` next to `HEAT`, `COOL`, and `OFF`.
- In `AUTO`, the system must:
  - heat when the sensed temperature falls below the lower threshold
  - cool when the sensed temperature rises above the upper threshold
  - remain idle while the temperature stays inside the deadband
- Cooling lockout must still apply whenever `AUTO` wants to start cooling.
- Fan control and eco mode must keep working with the same payload shape and dashboard behavior used today.

## Control Model

`AUTO` uses the current target temperature plus the existing hysteresis/deadband logic.

With target `72` and hysteresis `0.5`:

- below `71.5` => start heating
- above `72.5` => start cooling
- between `71.5` and `72.5` => stay idle

This intentionally does not add separate heat and cool setpoints.

## Backend Design

Files:

- [thermostat.py](/C:/Users/Hound/Desktop/smart-thermostat/thermostat.py)
- [api.py](/C:/Users/Hound/Desktop/smart-thermostat/api.py)

The thermostat engine will treat `AUTO` as a top-level operating mode and continue using `active_call` to represent the currently running action (`HEAT` or `COOL`).

Behavior:

- If mode is `AUTO` and temperature is below the low threshold, start or keep heating.
- If mode is `AUTO` and temperature is above the high threshold, start or keep cooling.
- If mode is `AUTO` and temperature is inside the band, shut down any active heat or cool call.
- Cooling short-cycle lockout is checked only when the active decision is cooling.
- History should continue recording the actual action using `active_call`, not the parent mode string `AUTO`.

## Frontend Design

Files:

- [smart-thermostat/src/pages/Dashboard.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Dashboard.jsx)
- [smart-thermostat/src/pages/dashboardState.js](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/dashboardState.js)

The dashboard will add an `AUTO` button to the existing mode button group and keep the same optimistic control flow.

No new controls are needed because the target temperature remains single-setpoint.

## Testing

Files:

- [tests/test_auto_mode.py](/C:/Users/Hound/Desktop/smart-thermostat/tests/test_auto_mode.py)
- [smart-thermostat/src/pages/dashboardState.test.js](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/dashboardState.test.js)

Required regression coverage:

- `AUTO` starts heating below the lower threshold.
- `AUTO` starts cooling above the upper threshold.
- `AUTO` idles inside the deadband.
- `AUTO` respects cooling lockout before energizing cooling.
- Dashboard payload/state helpers preserve `AUTO` as a valid mode.
