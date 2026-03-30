export function buildControlTransaction(currentData, updates) {
  const nextData = { ...currentData, ...updates };

  return {
    nextData,
    payload: {
      mode: nextData.mode,
      target: nextData.target,
      fan: nextData.fan_mode,
      eco: nextData.eco_mode,
    },
  };
}

export function matchesControlPayload(status, payload) {
  if (!payload) {
    return true;
  }

  return (
    status.mode === payload.mode &&
    status.target === payload.target &&
    status.fan_mode === payload.fan &&
    status.eco_mode === payload.eco
  );
}
