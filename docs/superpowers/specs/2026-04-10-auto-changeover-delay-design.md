# Auto Changeover Delay Design

## Goal

Add a configurable delay that prevents `AUTO` mode from switching directly between heating and cooling for a short period after the previous active call stops.

## Requirements

- Keep the existing `AUTO` single-target behavior.
- Do not change existing fan mode behavior.
- Keep the existing compressor lockout intact for cooling safety.
- Add a new Analytics configuration setting for the `AUTO` heat/cool changeover delay.
- When `AUTO` is waiting on this delay, expose that state through `/status` so the UI can explain why the system is idle.

## Control Model

This feature introduces a second timing rule that is separate from compressor lockout:

- Compressor lockout:
  - applies only before cooling can start
  - protects the condenser/compressor
- Auto changeover delay:
  - applies only in `AUTO`
  - blocks starting the opposite call shortly after the previous call stops
  - applies in both directions:
    - after `HEAT` stops, block `COOL`
    - after `COOL` stops, block `HEAT`

Recommended default: `2` minutes.

## Backend Design

Files:

- [thermostat.py](/C:/Users/Hound/Desktop/smart-thermostat/thermostat.py)
- [api.py](/C:/Users/Hound/Desktop/smart-thermostat/api.py)
- [tests/test_auto_mode.py](/C:/Users/Hound/Desktop/smart-thermostat/tests/test_auto_mode.py)

The thermostat engine should track the last active HVAC call that stopped and when it stopped. In `AUTO`, when the opposite call is requested, the engine should remain idle until the configured delay expires.

New settings/state:

- `auto_changeover_delay_minutes`
- `auto_changeover_pending`
- `auto_changeover_until`

Behavior:

- When an active `HEAT` or `COOL` call stops, persist:
  - the stopped call type
  - the stop timestamp
- In `AUTO`, if the opposite call is requested before the configured delay has elapsed:
  - do not start the new call
  - set `auto_changeover_pending = true`
  - set `auto_changeover_until` to the release timestamp
- Once the delay expires, allow the requested opposite call normally.
- If the requested opposite call is `COOL`, compressor lockout must still also pass before cooling starts.

## Frontend Design

Files:

- [smart-thermostat/src/pages/Analytics.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Analytics.jsx)
- [smart-thermostat/src/pages/Dashboard.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Dashboard.jsx)

Analytics will expose a numeric setting for the `AUTO` changeover delay in minutes.

Dashboard changes should stay minimal:

- no new controls are required
- the page may consume the new status fields for future messaging, but the primary feature is backend behavior plus configurability

## Testing

Required regression coverage:

- `AUTO` does not switch directly from `HEAT` to `COOL` before the configured delay expires.
- `AUTO` does not switch directly from `COOL` to `HEAT` before the configured delay expires.
- `AUTO` starts the opposite call once the delay expires.
- `AUTO` still respects compressor lockout before starting cooling.
- `/status` includes the pending-delay fields.
- Analytics settings round-trip the new delay field.
