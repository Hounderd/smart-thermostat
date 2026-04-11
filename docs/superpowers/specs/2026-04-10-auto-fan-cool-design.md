# Auto Fan Cooling Design

## Goal

Extend `AUTO` mode so that when cooling is needed and the outdoor temperature is low enough, the thermostat uses the fan relay instead of the compressor cooling relay.

## Requirements

- Apply this behavior only in `AUTO`.
- Keep manual `COOL` unchanged.
- Add a configurable outdoor temperature threshold, defaulting to about `50 F`.
- Expose the low-outdoor-temp cooling path as a distinct active state.
- Make the dashboard reflect the concrete active state, including the main room-temperature card accent.
- Preserve the existing compressor lockout and AUTO changeover delay behavior.

## Control Model

`AUTO` now has three possible concrete active states:

- `HEAT`
- `COOL`
- `FAN_COOL`

When `AUTO` wants cooling:

- if `outside_temp` is above the configured threshold, use normal compressor `COOL`
- if `outside_temp` is at or below the configured threshold, use `FAN_COOL`

`FAN_COOL` is considered part of the cooling family for decision-making and display, but it is a separate active state because it energizes different hardware and represents a different energy path.

## Backend Design

Files:

- [thermostat.py](/C:/Users/Hound/Desktop/smart-thermostat/thermostat.py)
- [api.py](/C:/Users/Hound/Desktop/smart-thermostat/api.py)
- [tests/test_auto_mode.py](/C:/Users/Hound/Desktop/smart-thermostat/tests/test_auto_mode.py)
- [tests/test_api_settings.py](/C:/Users/Hound/Desktop/smart-thermostat/tests/test_api_settings.py)

New settings:

- `auto_fan_cool_enabled`
- `auto_fan_cool_max_outside_temp`

New active state:

- `FAN_COOL`

Behavior:

- In `AUTO`, when cooling is requested:
  - if `auto_fan_cool_enabled` is false, use the existing cooling decision path
  - if outdoor temperature is missing, use the existing cooling decision path
  - if outdoor temperature is above the threshold, use compressor `COOL`
  - if outdoor temperature is at or below the threshold, use `FAN_COOL`
- `FAN_COOL` energizes only `PIN_FAN`
- Compressor lockout still applies only before starting compressor `COOL`
- AUTO changeover delay should treat `COOL` and `FAN_COOL` as cooling-family states, so switching from `HEAT` to either cooling path still waits
- History and `/status` should report `FAN_COOL` explicitly

## Frontend Design

Files:

- [smart-thermostat/src/pages/Dashboard.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Dashboard.jsx)
- [smart-thermostat/src/pages/dashboardModes.js](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/dashboardModes.js)
- [smart-thermostat/src/pages/Analytics.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Analytics.jsx)

Analytics adds:

- an enable toggle for AUTO fan cooling
- a slider or numeric control for the outdoor temperature threshold

Dashboard accent behavior:

- `HEAT` => orange
- `COOL` => blue
- `FAN_COOL` => white
- idle `AUTO` => green

This accent logic should drive both:

- the `AUTO` mode button
- the main room-temperature card border/accent

## Testing

Required regression coverage:

- `AUTO` starts `FAN_COOL` below the configured outdoor threshold
- `AUTO` starts compressor `COOL` above the threshold
- `FAN_COOL` energizes only the fan relay
- history and status report `FAN_COOL`
- AUTO changeover delay still blocks `HEAT <-> FAN_COOL`
- dashboard accent helpers map `FAN_COOL` to white for both the button and main card
