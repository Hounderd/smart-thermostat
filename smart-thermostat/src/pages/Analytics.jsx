import { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Timer, Activity, Home, DollarSign, Settings, Save, RotateCcw } from 'lucide-react';

const API_URL = "";

function Analytics() {
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState({
    cost_kwh: 0.14, cost_therm: 1.10, ac_kw: 3.5, furnace_btu: 80000,
    filter_current_hours: 0, filter_max_hours: 300,
    core_deadband: 0.5,
    eco_hysteresis_mild: 3.0, eco_hysteresis_strict: 0.5,
    auto_reboot_enabled: false, auto_reboot_hours: 24
  });
  const [stats, setStats] = useState({ min: 0, max: 0, runtime: 0, avg_humidity: 0 });
  const [estCost, setEstCost] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/history`).then(res => res.json()).then(data => {
      if (!data.length) return;
      const formatted = data.map(d => ({
        ...d,
        timeLabel: new Date(d.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setHistory(formatted);

      const temps = data.map(d => d.temp);
      const activeMinutes = data.filter(d => d.action && d.action !== 'IDLE').length;
      const hums = data.map(d => d.humidity);

      setStats({
        min: Math.min(...temps),
        max: Math.max(...temps),
        runtime: activeMinutes,
        avg_humidity: hums.reduce((a, b) => a + b, 0) / hums.length
      });
    });

    fetch(`${API_URL}/status`).then(res => res.json()).then(data => setStatus(data));

    fetch(`${API_URL}/settings`).then(res => res.json()).then(data => {
      if (data.cost_kwh) {
        setSettings(current => ({ ...current, ...data }));
      }
    });
  }, []);

  useEffect(() => {
    if (!status || !stats.runtime) return;
    const coolMins = history.filter(d => d.action === 'COOL').length;
    const heatMins = history.filter(d => d.action === 'HEAT').length;
    const coolCost = (coolMins / 60) * settings.ac_kw * settings.cost_kwh;
    const heatCost = (heatMins / 60) * (settings.furnace_btu / 100000) * settings.cost_therm;
    setEstCost(coolCost + heatCost);
  }, [history, settings, status, stats.runtime]);

  const saveSettings = async () => {
    await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    setShowSettings(false);
    fetch(`${API_URL}/status`).then(res => res.json()).then(data => setStatus(data));
  };

  const resetFilter = () => setSettings({ ...settings, filter_current_hours: 0 });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Disabled';
    return new Date(timestamp * 1000).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getNextRestartText = () => {
    if (!status?.next_reboot_due_at) {
      return 'Disabled';
    }

    const scheduled = formatTimestamp(status.next_reboot_due_at);
    if (status.reboot_pending && status.active) {
      return `${scheduled} (waiting for idle)`;
    }

    return scheduled;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-gray-700 p-3 rounded shadow-xl text-xs z-50">
          <p className="font-bold text-gray-400 mb-2">{label}</p>
          {payload.map((p, idx) => (
            <p key={idx} style={{ color: p.color }}>
              {p.name}: <span className="font-bold">{Number(p.value).toFixed(1)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const filterPercent = status ? Math.max(0, 100 - ((status.filter_hours / status.filter_max) * 100)) : 100;
  const filterColor = filterPercent > 20 ? 'text-neonGreen' : 'text-red-500';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-8 pb-32">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">System Analytics</h1>
          <p className="text-gray-500 text-sm">Historical data & Cost Estimation</p>
        </div>
        {status && !status.read_only && (
          <button onClick={() => setShowSettings(!showSettings)} className="bg-card p-3 rounded-full hover:bg-white/10 transition-colors">
            <Settings size={20} className="text-gray-400" />
          </button>
        )}
      </div>

      {showSettings && (
        <div className="bg-card border border-gray-800 rounded-3xl p-6 grid gap-4 animate-in fade-in zoom-in duration-300">
          <h3 className="font-bold text-white mb-2">Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-800 pb-4">
            <div>
              <label className="text-xs text-gray-500">Electricity Cost ($/kWh)</label>
              <input type="number" step="0.01" value={settings.cost_kwh} onChange={e => setSettings({ ...settings, cost_kwh: parseFloat(e.target.value) })} className="w-full bg-background border border-gray-700 rounded p-2 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Gas Cost ($/Therm)</label>
              <input type="number" step="0.01" value={settings.cost_therm} onChange={e => setSettings({ ...settings, cost_therm: parseFloat(e.target.value) })} className="w-full bg-background border border-gray-700 rounded p-2 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500">AC Power (kW)</label>
              <input type="number" step="0.1" value={settings.ac_kw} onChange={e => setSettings({ ...settings, ac_kw: parseFloat(e.target.value) })} className="w-full bg-background border border-gray-700 rounded p-2 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Furnace Size (BTU)</label>
              <input type="number" step="1000" value={settings.furnace_btu} onChange={e => setSettings({ ...settings, furnace_btu: parseFloat(e.target.value) })} className="w-full bg-background border border-gray-700 rounded p-2 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
            <div>
              <label className="text-xs text-gray-400">Core Deadband</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0.1" max="3" step="0.1" value={settings.core_deadband} onChange={e => setSettings({ ...settings, core_deadband: parseFloat(e.target.value) })} className="w-full accent-white" />
                <span className="text-white w-10">{settings.core_deadband}</span>
              </div>
              <p className="text-[10px] text-gray-500">Base hysteresis used for normal heat, cool, and auto mode behavior.</p>
            </div>
            <div>
              <label className="text-xs text-neonGreen">Mild Weather Deadband (Default 3°)</label>
              <div className="flex items-center gap-2">
                <input type="range" min="1" max="6" step="0.5" value={settings.eco_hysteresis_mild} onChange={e => setSettings({ ...settings, eco_hysteresis_mild: parseFloat(e.target.value) })} className="w-full accent-neonGreen" />
                <span className="text-white w-8">{settings.eco_hysteresis_mild}</span>
              </div>
              <p className="text-[10px] text-gray-500">Range allowed when outside is 55-75°F</p>
            </div>
            <div>
              <label className="text-xs text-neonBlue">Strict Weather Deadband (Default 0.5°)</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0.1" max="2" step="0.1" value={settings.eco_hysteresis_strict} onChange={e => setSettings({ ...settings, eco_hysteresis_strict: parseFloat(e.target.value) })} className="w-full accent-neonBlue" />
                <span className="text-white w-8">{settings.eco_hysteresis_strict}</span>
              </div>
              <p className="text-[10px] text-gray-500">Range when outside is freezing (&lt;20°F)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 border-t border-gray-800 pt-4 pb-4">
            <div className="bg-background/40 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-widest">Automatic Pi Restart</label>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Reboots the Raspberry Pi after the configured uptime, but only once the HVAC is idle. Active heating and cooling runs are never interrupted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, auto_reboot_enabled: !settings.auto_reboot_enabled })}
                  className={`min-w-[88px] rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                    settings.auto_reboot_enabled
                      ? 'bg-neonBlue text-black'
                      : 'bg-card border border-gray-700 text-gray-400'
                  }`}
                >
                  {settings.auto_reboot_enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Reboot Interval (Hours)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={settings.auto_reboot_hours}
                onChange={e => setSettings({ ...settings, auto_reboot_hours: parseFloat(e.target.value) })}
                className="w-full bg-background border border-gray-700 rounded p-2 text-white"
              />
              <p className="text-[10px] text-gray-500 mt-2">Default 24 hours. The reboot waits until the system is idle.</p>
              <div className="mt-4 space-y-2 rounded-2xl border border-gray-800 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-gray-500">Last Pi Restart</span>
                  <span className="text-white font-mono">{status ? formatTimestamp(status.last_reboot_at) : '--'}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-gray-500">Next Scheduled Restart</span>
                  <span className="text-white font-mono text-right">{status ? getNextRestartText() : '--'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Filter Life</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{settings.filter_current_hours.toFixed(1)} / {settings.filter_max_hours} hrs</span>
                <button onClick={resetFilter} className="text-neonBlue hover:text-white"><RotateCcw size={14} /></button>
              </div>
            </div>
            <button onClick={saveSettings} className="bg-neonBlue text-black font-bold px-6 py-2 rounded-xl flex items-center gap-2">
              <Save size={16} /> Save
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-gray-800 rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold"><Timer size={14} className="text-neonGreen" /> Runtime (24h)</div>
          <span className="text-3xl font-bold text-white">{stats.runtime} <span className="text-xs text-gray-500">min</span></span>
        </div>
        <div className="bg-card border border-gray-800 rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold"><DollarSign size={14} className="text-yellow-400" /> Est. Cost (24h)</div>
          <span className="text-3xl font-bold text-white">${estCost.toFixed(2)}</span>
        </div>
        <div className="bg-card border border-gray-800 rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold"><Activity size={14} className="text-blue-400" /> Filter Health</div>
          <span className={`text-3xl font-bold ${filterColor}`}>{filterPercent.toFixed(0)}%</span>
        </div>
        <div className="bg-card border border-gray-800 rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold"><Home size={14} className="text-purple-500" /> Heat Loss</div>
          <span className="text-3xl font-bold text-white">{status ? status.heat_loss.toFixed(1) : '--'} <span className="text-xs text-gray-500">°/hr</span></span>
        </div>
      </div>

      <div className="bg-card border border-gray-800 rounded-3xl p-6 h-96 mt-4">
        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">Thermal Performance (In vs Out)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="timeLabel" stroke="#666" fontSize={10} minTickGap={50} />
            <YAxis stroke="#666" domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Area type="monotone" dataKey="outside" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} strokeDasharray="5 5" name="Outside Temp" />
            <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" name="Inside Temp" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-gray-800 rounded-3xl p-6 h-64">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">Humidity %</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="timeLabel" hide />
              <YAxis stroke="#666" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={false} name="Humidity" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-gray-800 rounded-3xl p-6 h-64">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">Air Quality Score</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="timeLabel" hide />
              <YAxis stroke="#666" domain={[0, 500]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="gas" stroke="#22c55e" strokeWidth={2} dot={false} name="Raw Gas (kΩ)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
