const CYCLE_LABELS = {
  HEAT: 'HEATING',
  COOL: 'COOLING',
  FAN_COOL: 'FAN COOLING',
};

function getCycleLabel(call) {
  return CYCLE_LABELS[call] ?? null;
}

export function getCycleText({
  now,
  active,
  active_call,
  run_start,
  last_duration,
  last_end,
  last_active_call,
}) {
  if (active && run_start > 0) {
    const duration = Math.floor((now - run_start) / 60);
    const label = getCycleLabel(active_call);
    if (label) {
      return `Running ${label} ${Math.max(0, duration)}m`;
    }
    return `Running for ${Math.max(0, duration)}m`;
  }

  if (!active && last_duration > 0) {
    const duration = Math.floor(last_duration / 60);
    const ago = Math.floor((now - last_end) / 60);
    const label = getCycleLabel(last_active_call);
    if (label) {
      return `Ran ${label} ${Math.max(1, duration)}m • ${Math.max(0, ago)}m ago`;
    }
    return `Ran ${Math.max(1, duration)}m • ${Math.max(0, ago)}m ago`;
  }

  return null;
}
