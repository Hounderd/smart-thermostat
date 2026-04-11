# Analytics Settings Cleanup Design

## Goal

Rework the Analytics configuration panel into a clean settings form with clear sections, consistent control density, and more legible hierarchy.

## Problems In Current Layout

- Too many unrelated controls share one dense multi-column row.
- Sliders, toggles, and large info cards all compete for attention at the same visual level.
- `AUTO Fan Cooling` is much heavier than the neighboring slider controls, which makes the whole row feel lopsided.
- Supporting copy is compressed into narrow columns and becomes hard to scan.
- Maintenance and restart controls are visually disconnected from the thermostat behavior settings above them.

## Layout Direction

Use a clean settings form, not a dense control grid.

Structure the Configuration panel into 3 stacked sections:

1. `Cost & Equipment`
2. `Thermostat Behavior`
3. `Maintenance & Restart`

This keeps the panel readable at desktop and mid-width breakpoints while still collapsing cleanly on mobile.

## Section Design

### Cost & Equipment

Keep the current 4 numeric inputs in a simple 2-column grid:

- Electricity Cost
- Gas Cost
- AC Power
- Furnace Size

These fields are already compact and benefit from staying grouped together.

### Thermostat Behavior

Convert the current slider row into a stack of individual setting rows/cards.

Each setting row should contain:

- title
- short supporting description
- control area
- current value

Settings to include:

- Core Deadband
- Mild Weather Deadband
- Strict Weather Deadband
- AUTO Changeover Delay
- AUTO Fan Cooling

`AUTO Fan Cooling` should be a full-width row with:

- enable toggle
- threshold slider below it
- supporting description

This removes the current cramped 5-column behavior grid.

### Maintenance & Restart

Group operational items together:

- Automatic Pi Restart toggle
- Reboot Interval
- Last Pi Restart
- Next Scheduled Restart
- Filter Life

This section should read like maintenance/operations rather than thermostat behavior.

## Visual System

- Use section headers with stronger hierarchy than inline labels.
- Keep labels left-aligned and helper text directly under labels.
- Use more vertical spacing between setting rows.
- Avoid mixing tiny text blocks with wide sliders inside the same narrow columns.
- Keep `Save` anchored at the bottom-right of the full Configuration panel.

## Implementation Notes

Files:

- [smart-thermostat/src/pages/Analytics.jsx](/C:/Users/Hound/Desktop/smart-thermostat/smart-thermostat/src/pages/Analytics.jsx)

This is a layout cleanup only:

- no thermostat behavior changes
- no API changes
- no settings schema changes

If helpful, small local helpers/components can be extracted inside the file to reduce repeated row markup.

## Testing

Required verification:

- existing frontend tests still pass
- the Analytics panel still loads/saves the same settings payload
- the page still builds successfully
