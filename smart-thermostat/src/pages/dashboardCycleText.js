const CYCLE_LABELS = {
  HEAT: 'HEATING',
  COOL: 'COOLING',
  FAN_COOL: 'FAN COOLING',
};

const BULLET = '\u2022';

function getCycleLabel(call) {
  return CYCLE_LABELS[call] ?? null;
}

export function getCycleText({
  now,
  active,
  active_call,
  auto_heat_wait_pending,
  auto_heat_wait_until,
  run_start,
  last_duration,
  last_end,
  last_active_call,
}) {
  if (auto_heat_wait_pending) {
    if (auto_heat_wait_until && auto_heat_wait_until > now) {
      const minutesLeft = Math.max(1, Math.ceil((auto_heat_wait_until - now) / 60));
      return `Waiting for passive warming ${minutesLeft}m left`;
    }
    return 'Waiting for passive warming';
  }

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
      return `Ran ${label} ${Math.max(1, duration)}m ${BULLET} ${Math.max(0, ago)}m ago`;
    }
    return `Ran ${Math.max(1, duration)}m ${BULLET} ${Math.max(0, ago)}m ago`;
  }

  return null;
}
