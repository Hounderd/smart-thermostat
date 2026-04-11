import { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Timer, Activity, Home, DollarSign, Settings, Save, RotateCcw } from 'lucide-react';
import { getBillableActionMinutes, getBillableRuntimeMinutes } from './analyticsMetrics';

const API_URL = "";

function Analytics() {
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState({
    cost_kwh: 0.14,
    cost_therm: 1.10,
    ac_kw: 3.5,
    furnace_btu: 80000,
    filter_current_hours: 0,
    filter_max_hours: 300,
    core_deadband: 0.5,
    eco_hysteresis_mild: 3.0,
    eco_hysteresis_strict: 0.5,
    auto_fan_cool_enabled: true,
    auto_fan_cool_max_outside_temp: 50,
    auto_fan_cool_fallback_minutes: 10,
    auto_fan_cool_min_drop: 0.5,
    auto_changeover_delay_minutes: 2,
    auto_reboot_enabled: false,
    auto_reboot_hours: 24,
  });
  const [stats, setStats] = useState({ min: 0, max: 0, runtime: 0, avg_humidity: 0 });
  const [estCost, setEstCost] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/history`).then(res => res.json()).then(data => {
      if (!data.length) return;
      const formatted = data.map(d => ({
        ...d,
        timeLabel: new Date(d.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setHistory(formatted);

      const temps = data.map(d => d.temp);
      const activeMinutes = getBillableRuntimeMinutes(data);
      const hums = data.map(d => d.humidity);

      setStats({
        min: Math.min(...temps),
        max: Math.max(...temps),
        runtime: activeMinutes,
        avg_humidity: hums.reduce((a, b) => a + b, 0) / hums.length,
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
    const coolMins = getBillableActionMinutes(history, 'COOL');
    const heatMins = getBillableActionMinutes(history, 'HEAT');
    const coolCost = (coolMins / 60) * settings.ac_kw * settings.cost_kwh;
    const heatCost = (heatMins / 60) * (settings.furnace_btu / 100000) * settings.cost_therm;
    setEstCost(coolCost + heatCost);
  }, [history, settings, status, stats.runtime]);

  const saveSettings = async () => {
    await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
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

  const sectionTitleClass = "text-xs font-bold uppercase tracking-[0.24em] text-gray-400";
  const sectionCopyClass = "text-xs text-gray-500";
  const settingTitleClass = "text-sm font-semibold text-white";
  const settingCopyClass = "text-[11px] leading-5 text-gray-500";
  const inputClass = "w-full bg-background border border-gray-700 rounded-2xl px-4 py-3 text-white outline-none transition-colors focus:border-white";

  const updateSetting = (key, value) => setSettings(current => ({ ...current, [key]: value }));

  const SectionShell = ({ title, description, children }) => (
    <section className="rounded-[2rem] border border-gray-800 bg-background/30 p-5 md:p-6">
      <div className="mb-5">
        <h4 className={sectionTitleClass}>{title}</h4>
        <p className={`${sectionCopyClass} mt-2 max-w-2xl`}>{description}</p>
      </div>
      {children}
    </section>
  );

  const InputField = ({ label, value, onChange, step, min }) => (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={onChange}
        className={inputClass}
      />
    </div>
  );

  const SliderRow = ({ title, description, value, min, max, step, accentClass, valueWidth = 'w-12', onChange }) => (
    <div className="rounded-2xl border border-gray-800 bg-card/60 p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h5 className={settingTitleClass}>{title}</h5>
          <p className={`${settingCopyClass} mt-1`}>{description}</p>
        </div>
        <div className="flex items-center gap-3 md:min-w-[320px]">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className={`w-full ${accentClass}`}
          />
          <span className={`text-sm font-semibold text-white text-right ${valueWidth}`}>{value}</span>
        </div>
      </div>
    </div>
  );

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
        <div className="bg-card border border-gray-800 rounded-3xl p-6 md:p-8 grid gap-6 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-white text-lg font-bold">Configuration</h3>
              <p className="text-sm text-gray-500">Organized settings for comfort behavior, costs, and maintenance.</p>
            </div>
            <button onClick={saveSettings} className="bg-neonBlue text-black font-bold px-6 py-3 rounded-2xl flex items-center gap-2 self-start md:self-auto">
              <Save size={16} /> Save
            </button>
          </div>

          <SectionShell
            title="Cost & Equipment"
            description="Operational cost assumptions and system sizing used for the analytics estimates."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Electricity Cost ($/kWh)"
                value={settings.cost_kwh}
                step="0.01"
                onChange={e => updateSetting('cost_kwh', parseFloat(e.target.value))}
              />
              <InputField
                label="Gas Cost ($/Therm)"
                value={settings.cost_therm}
                step="0.01"
                onChange={e => updateSetting('cost_therm', parseFloat(e.target.value))}
              />
              <InputField
                label="AC Power (kW)"
                value={settings.ac_kw}
                step="0.1"
                onChange={e => updateSetting('ac_kw', parseFloat(e.target.value))}
              />
              <InputField
                label="Furnace Size (BTU)"
                value={settings.furnace_btu}
                step="1000"
                onChange={e => updateSetting('furnace_btu', parseFloat(e.target.value))}
              />
            </div>
          </SectionShell>

          <SectionShell
            title="Thermostat Behavior"
            description="Comfort tuning for hysteresis, AUTO transitions, and low-outdoor-temperature fan cooling."
          >
            <div className="grid gap-4">
              <SliderRow
                title="Core Deadband"
                description="Base hysteresis used for normal heating, cooling, and AUTO mode behavior."
                value={settings.core_deadband}
                min="0.1"
                max="3"
                step="0.1"
                accentClass="accent-white"
                onChange={e => updateSetting('core_deadband', parseFloat(e.target.value))}
              />

              <SliderRow
                title="Mild Weather Deadband"
                description="Expanded deadband used during eco mode when outside temperature is between 55 F and 75 F."
                value={settings.eco_hysteresis_mild}
                min="1"
                max="6"
                step="0.5"
                accentClass="accent-neonGreen"
                onChange={e => updateSetting('eco_hysteresis_mild', parseFloat(e.target.value))}
              />

              <SliderRow
                title="Strict Weather Deadband"
                description="Tighter eco-mode deadband used when outdoor temperature is below 20 F."
                value={settings.eco_hysteresis_strict}
                min="0.1"
                max="2"
                step="0.1"
                accentClass="accent-neonBlue"
                onChange={e => updateSetting('eco_hysteresis_strict', parseFloat(e.target.value))}
              />

              <SliderRow
                title="AUTO Changeover Delay"
                description="Wait time before AUTO can switch directly between heating and cooling families."
                value={settings.auto_changeover_delay_minutes}
                min="0"
                max="10"
                step="0.5"
                accentClass="accent-amber-400"
                onChange={e => updateSetting('auto_changeover_delay_minutes', parseFloat(e.target.value))}
              />

              <div className="rounded-2xl border border-gray-800 bg-card/60 p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-xl">
                    <h5 className={settingTitleClass}>AUTO Fan Cooling</h5>
                    <p className={`${settingCopyClass} mt-1`}>
                      When AUTO wants cooling and outside air is already cool enough, use the fan relay instead of the compressor.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('auto_fan_cool_enabled', !settings.auto_fan_cool_enabled)}
                    className={`min-w-[92px] rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                      settings.auto_fan_cool_enabled
                        ? 'bg-white text-black'
                        : 'bg-background border border-gray-700 text-gray-400'
                    }`}
                  >
                    {settings.auto_fan_cool_enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Outside Temp Threshold</span>
                    <span className="text-sm font-semibold text-white">{settings.auto_fan_cool_max_outside_temp} F</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="70"
                    step="1"
                    value={settings.auto_fan_cool_max_outside_temp}
                    onChange={e => updateSetting('auto_fan_cool_max_outside_temp', parseFloat(e.target.value))}
                    className="w-full accent-white"
                  />
                  <p className={settingCopyClass}>Below this outside temperature, AUTO cooling can switch to `FAN_COOL` instead of compressor cooling.</p>
                </div>
              </div>

              <SliderRow
                title="AUTO Fan Cool Fallback Delay"
                description="How long AUTO lets fan cooling run before checking whether it has cooled the room enough to avoid compressor cooling."
                value={settings.auto_fan_cool_fallback_minutes}
                min="1"
                max="60"
                step="1"
                accentClass="accent-white"
                valueWidth="w-14"
                onChange={e => updateSetting('auto_fan_cool_fallback_minutes', parseFloat(e.target.value))}
              />

              <SliderRow
                title="AUTO Fan Cool Minimum Drop"
                description="Minimum temperature drop required during the fallback delay. If fan cooling drops less than this, AUTO switches to compressor cooling."
                value={settings.auto_fan_cool_min_drop}
                min="0.1"
                max="3"
                step="0.1"
                accentClass="accent-white"
                valueWidth="w-14"
                onChange={e => updateSetting('auto_fan_cool_min_drop', parseFloat(e.target.value))}
              />
            </div>
          </SectionShell>

          <SectionShell
            title="Maintenance & Restart"
            description="Operational controls for unattended uptime, reboot scheduling, and filter tracking."
          >
            <div className="grid gap-4">
              <div className="rounded-2xl border border-gray-800 bg-card/60 p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-xl">
                    <h5 className={settingTitleClass}>Automatic Pi Restart</h5>
                    <p className={`${settingCopyClass} mt-1`}>
                      Reboots the Raspberry Pi after the configured uptime, but only when the HVAC is idle. Active heating and cooling runs are never interrupted.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('auto_reboot_enabled', !settings.auto_reboot_enabled)}
                    className={`min-w-[92px] rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                      settings.auto_reboot_enabled
                        ? 'bg-neonBlue text-black'
                        : 'bg-background border border-gray-700 text-gray-400'
                    }`}
                  >
                    {settings.auto_reboot_enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4">
                <div className="rounded-2xl border border-gray-800 bg-card/60 p-4 md:p-5">
                  <label className="text-xs font-medium text-gray-500">Reboot Interval (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={settings.auto_reboot_hours}
                    onChange={e => updateSetting('auto_reboot_hours', parseFloat(e.target.value))}
                    className={`${inputClass} mt-2`}
                  />
                  <p className={`${settingCopyClass} mt-2`}>Default 24 hours. If a reboot becomes due during a run, it waits until the system is idle.</p>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-card/60 p-4 md:p-5">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-500">Last Pi Restart</span>
                      <span className="text-white font-mono text-right">{status ? formatTimestamp(status.last_reboot_at) : '--'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-500">Next Scheduled Restart</span>
                      <span className="text-white font-mono text-right">{status ? getNextRestartText() : '--'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-card/60 p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h5 className={settingTitleClass}>Filter Life</h5>
                    <p className={`${settingCopyClass} mt-1`}>Tracks accumulated runtime against the configured filter replacement interval.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">{settings.filter_current_hours.toFixed(1)} / {settings.filter_max_hours} hrs</span>
                    <button onClick={resetFilter} className="text-neonBlue hover:text-white transition-colors">
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </SectionShell>
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
          <span className="text-3xl font-bold text-white">{status ? status.heat_loss.toFixed(1) : '--'} <span className="text-xs text-gray-500">deg/hr</span></span>
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
              <Line type="monotone" dataKey="gas" stroke="#22c55e" strokeWidth={2} dot={false} name="Raw Gas (kOhm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
