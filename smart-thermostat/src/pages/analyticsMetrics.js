const BILLABLE_RUNTIME_ACTIONS = new Set(['HEAT', 'COOL']);

export function getBillableRuntimeMinutes(history) {
  return history.filter((entry) => BILLABLE_RUNTIME_ACTIONS.has(entry.action)).length;
}

export function getBillableActionMinutes(history, action) {
  if (!BILLABLE_RUNTIME_ACTIONS.has(action)) {
    return 0;
  }

  return history.filter((entry) => entry.action === action).length;
}
