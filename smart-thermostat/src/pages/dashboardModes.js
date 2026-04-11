export const DASHBOARD_MODES = [
  { value: 'HEAT' },
  { value: 'COOL' },
  { value: 'AUTO' },
  { value: 'OFF' },
];

function getActiveDashboardState(data) {
  if (data.mode === 'AUTO') {
    return data.active_call ?? 'AUTO_IDLE';
  }
  return data.mode;
}

export function getDashboardAccentClasses(data) {
  const activeState = getActiveDashboardState(data);

  if (activeState === 'HEAT') {
    return 'text-neonOrange border-neonOrange';
  }

  if (activeState === 'COOL') {
    return 'text-neonBlue border-neonBlue';
  }

  if (activeState === 'FAN_COOL') {
    return 'text-white border-white';
  }

  if (activeState === 'AUTO_IDLE') {
    return 'text-neonGreen border-neonGreen';
  }

  return 'text-gray-500 border-gray-500';
}

export function getModeButtonClasses(data, mode) {
  if (data.mode !== mode) {
    return 'bg-background hover:bg-white/10 text-gray-400';
  }

  if (mode === 'HEAT') {
    return 'bg-neonOrange text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]';
  }

  if (mode === 'COOL') {
    return 'bg-neonBlue text-black shadow-[0_0_20px_rgba(59,130,246,0.4)]';
  }

  if (mode === 'AUTO') {
    if (data.active_call === 'HEAT') {
      return 'bg-neonOrange text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]';
    }

    if (data.active_call === 'COOL') {
      return 'bg-neonBlue text-black shadow-[0_0_20px_rgba(59,130,246,0.4)]';
    }

    if (data.active_call === 'FAN_COOL') {
      return 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.35)]';
    }

    return 'bg-neonGreen text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]';
  }

  return 'bg-white text-black shadow-lg';
}
