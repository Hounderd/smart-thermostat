# 2026-04-10 Session Handoff

## Summary
- Audited the reported fan-relay issue.
  - Result: current code path for `fan_mode == "ON"` only energizes `PIN_FAN`.
  - No code change was made for relay mapping because the user re-tested hardware behavior and confirmed fan control is working correctly.
- Added a new single-target `AUTO` mode.
  - `AUTO` heats below the lower threshold.
  - `AUTO` cools above the upper threshold.
  - `AUTO` stays idle when an idle system is already inside the deadband.
  - Cooling lockout still applies before `AUTO` can start cooling.
- Added a dedicated dashboard mode list so the UI can expose `AUTO` without hardcoding the old three-button list.
- Added follow-up AUTO mode visibility and scheduling controls.
  - `AUTO` now exposes the concrete running action through status as `active_call`
  - the `AUTO` mode button changes to heating orange or cooling blue while AUTO is actively driving that call
  - Analytics now lets the user configure the core deadband that replaces the old fixed `0.5`
  - Analytics now shows `Last Pi Restart` and `Next Scheduled Restart`
- Added configurable `AUTO` changeover delay behavior.
  - `AUTO` still respects the existing cooling compressor lockout before starting cooling
  - `AUTO` now also waits a configurable number of minutes before switching directly from `HEAT` to `COOL` or from `COOL` to `HEAT`
  - Analytics now exposes `AUTO Changeover Delay (Minutes)` with a default of `2`
  - status now exposes `auto_changeover_pending` and `auto_changeover_until`
- Added `AUTO` fan-cooling behavior for low outdoor temperatures.
  - `AUTO` can now choose a distinct `FAN_COOL` active state instead of compressor `COOL`
  - `FAN_COOL` is enabled/configured from Analytics with `AUTO Fan Cooling` and an outdoor threshold
  - `FAN_COOL` uses the fan relay only and does not use the compressor cooling relay
  - the `AUTO` button and main room-temperature card now both reflect the concrete active state, including white for `FAN_COOL`
- Set up passwordless SSH from the main Windows machine to the Pi in the prior session and verified it works.

## Files Changed For AUTO Mode
- [thermostat.py](/C:/Users/Hound/Desktop/smart-thermostat/thermostat.py)
- [auto_reboot.py](/C:/Users/Hound/Desktop/smart-thermostat/auto_reboot.py)
- [api.py](/C:/Users/Hound/Desktop/smart-thermostat/api.py)
- [tests/test_auto_mode.py](/C:/Users/Hound/Desktop/smart-thermostat/tests/test_auto_mode.py)
- [tests/test_auto_reboot.py](/C:/Users/Hound/Desktop/smart-thermostat/tests/test_auto_reboot.py)
- [smart-thermostat/src/pages/Dashboard.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Dashboard.jsx)
- [smart-thermostat/src/pages/Analytics.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Analytics.jsx)
- [smart-thermostat/src/pages/dashboardModes.js](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/dashboardModes.js)
- [smart-thermostat/src/pages/dashboardModes.test.js](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/dashboardModes.test.js)
- [smart-thermostat/src/pages/dashboardState.test.js](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/dashboardState.test.js)
- [tests/test_api_settings.py](/C:/Users/Hound/Desktop/smart-thermostat/tests/test_api_settings.py)
- [docs/superpowers/specs/2026-04-10-auto-fan-cool-design.md](/C:/Users/Hound/Desktop/smart-thermostat/docs/superpowers/specs/2026-04-10-auto-fan-cool-design.md)
- [docs/superpowers/plans/2026-04-10-auto-fan-cool.md](/C:/Users/Hound/Desktop/smart-thermostat/docs/superpowers/plans/2026-04-10-auto-fan-cool.md)
- [docs/superpowers/specs/2026-04-10-auto-changeover-delay-design.md](/C:/Users/Hound/Desktop/smart-thermostat/docs/superpowers/specs/2026-04-10-auto-changeover-delay-design.md)
- [docs/superpowers/plans/2026-04-10-auto-changeover-delay.md](/C:/Users/Hound/Desktop/smart-thermostat/docs/superpowers/plans/2026-04-10-auto-changeover-delay.md)
- [docs/superpowers/specs/2026-04-10-auto-mode-design.md](/C:/Users/Hound/Desktop/smart-thermostat/docs/superpowers/specs/2026-04-10-auto-mode-design.md)
- [docs/superpowers/plans/2026-04-10-auto-mode.md](/C:/Users/Hound/Desktop/smart-thermostat/docs/superpowers/plans/2026-04-10-auto-mode.md)

## Behavior Notes
- Active runtime history now records the actual running call (`HEAT`, `COOL`, or `FAN_COOL`) instead of the parent `AUTO` mode string.
- `AUTO` preserves hysteresis behavior by continuing an active heating or cooling cycle until the opposite side of the band is reached.
- `AUTO` now enforces a separate bidirectional changeover delay before starting the opposite HVAC call.
- `AUTO` can now choose `FAN_COOL` when outdoor temperature is below the configured threshold.
- Compressor lockout remains a separate cooling-only safety gate and still applies inside `AUTO`.
- `FAN_COOL` bypasses the compressor lockout because it does not use the compressor relay.
- `current_deadband` in status now reflects the configured core deadband unless eco mode overrides it.
- Automatic Pi restart scheduling is now anchored to the actual Pi boot time instead of the thermostat process start time.
- Fan behavior is unchanged:
  - `fan_mode == "ON"` always energizes the fan relay
  - `fan_mode == "AUTO"` follows normal cooling behavior and optional heat-fan behavior

## Verification Run
- `python -m unittest tests.test_auto_mode tests.test_auto_reboot tests.test_cooling_lockout tests.test_weather_fetch tests.test_api_status tests.test_frontend_paths -v`
- `python -m unittest tests.test_auto_mode tests.test_api_settings tests.test_auto_reboot tests.test_cooling_lockout tests.test_weather_fetch tests.test_api_status tests.test_frontend_paths -v`
- `node smart-thermostat/src/pages/dashboardState.test.js`
- `node smart-thermostat/src/pages/dashboardModes.test.js`
- `python -m compileall api.py thermostat.py auto_reboot.py cooling_lockout.py weather_fetch.py`
- `npm install` in `smart-thermostat/` inside the fresh worktree before the build
- `npm run build` in `smart-thermostat/`

## Branch / PR Intent
- Working branch for this session: `feature/auto-fan-cool`
- Preferred flow remains:
  1. commit verified changes on the feature branch
  2. push branch
  3. open PR with `gh`
  4. merge PR
  5. pull `main` on the Pi
  6. rebuild frontend and restart PM2 services as needed
