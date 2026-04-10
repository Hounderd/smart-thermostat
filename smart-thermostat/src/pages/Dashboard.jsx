import { useEffect, useRef, useState } from 'react';
import { Thermometer, Droplets, Flame, Snowflake, Power, Plus, Minus, Wind, Leaf, Gauge, Activity, Radio, Heart, CloudSun } from 'lucide-react';
import { buildControlTransaction, matchesControlPayload } from './dashboardState';
import { DASHBOARD_MODES } from './dashboardModes';

const API_URL = ""; 

function Dashboard() {
  const [data, setData] = useState({
    temp: 0, local_temp: 0, remote_temp: 0, outside_temp: null,
    target: 72, humidity: 0, pressure: 0, gas: 0, iaq: 0,
    mode: "OFF", fan_mode: "AUTO", eco_mode: false,
    active: false, locked_out: false, remote_active: false, read_only: false,
    run_start: 0, last_duration: 0, last_end: 0, control_pending: false
  });
  const dataRef = useRef(data);
  const pendingPayloadRef = useRef(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status`);
      const json = await res.json();
      if (json.error) return;

      const pendingPayload = pendingPayloadRef.current;
      if (pendingPayload && !matchesControlPayload(json, pendingPayload)) {
        return;
      }

      if (pendingPayload && !json.control_pending) {
        pendingPayloadRef.current = null;
      }

      dataRef.current = json;
      setData(json);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => { clearInterval(interval); }
  }, []);

  const sendControl = async (updates) => {
    if (dataRef.current.read_only) return;

    const { nextData, payload } = buildControlTransaction(dataRef.current, updates);
    const optimisticData = { ...nextData, control_pending: true };

    pendingPayloadRef.current = payload;
    dataRef.current = optimisticData;
    setData(optimisticData);

    try {
      const res = await fetch(`${API_URL}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Control request failed with status ${res.status}`);
      }
      fetchStatus();
    } catch (err) {
      console.error(err);
      pendingPayloadRef.current = null;
      fetchStatus();
    }
  };

  // --- CYCLE TEXT GENERATOR ---
  const getCycleText = () => {
    const now = Date.now() / 1000;
    
    if (data.active && data.run_start > 0) {
      const duration = Math.floor((now - data.run_start) / 60);
      return `Running for ${Math.max(0, duration)}m`;
    }
    
    if (!data.active && data.last_duration > 0) {
      const duration = Math.floor(data.last_duration / 60);
      const ago = Math.floor((now - data.last_end) / 60);
      return `Ran ${Math.max(1, duration)}m • ${Math.max(0, ago)}m ago`;
    }
    
    return null;
  };

  const getIaqColor = (score) => {
    if (score <= 50) return 'text-neonGreen'; 
    if (score <= 150) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getIaqText = (score) => {
    if (score <= 50) return 'EXCELLENT';
    if (score <= 100) return 'GOOD';
    if (score <= 150) return 'FAIR';
    return 'POOR';
  };

  const getThemeColor = () => {
    if (data.mode === 'HEAT') return 'text-neonOrange border-neonOrange';
    if (data.mode === 'COOL') return 'text-neonBlue border-neonBlue';
    if (data.mode === 'AUTO') return 'text-neonGreen border-neonGreen';
    return 'text-gray-500 border-gray-500';
  };

  const cycleText = getCycleText();

  return (
    <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-full">
      
      {/* Header / Outside Weather */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-2 text-gray-400">
          <CloudSun size={20} className={data.outside_temp ? 'text-yellow-400' : 'text-gray-600'} />
          <div className="flex flex-col leading-none">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Outside</span>
            <span className="font-bold font-mono text-xl text-white">
              {data.outside_temp ? `${data.outside_temp}°` : '--'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
           <div className="flex items-center gap-2">
             {data.locked_out && <span className="text-red-500 font-bold animate-pulse text-xs">⚠ LOCKOUT</span>}
             {data.control_pending && <span className="text-neonBlue font-bold text-xs">SYNCING</span>}
             <span className={`text-xs font-bold px-3 py-1 rounded-full ${data.active ? 'bg-neonGreen text-black animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
               {data.active ? 'RUNNING' : 'IDLE'}
             </span>
           </div>
           {/* CYCLE TEXT */}
           {cycleText && (
             <span className="text-[10px] text-gray-500 font-mono tracking-tight animate-in fade-in slide-in-from-right-2">
               {cycleText}
             </span>
           )}
        </div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- LEFT COLUMN (Display) --- */}
        <div className="flex flex-col gap-6">
          <div className={`bg-card rounded-[2.5rem] p-8 md:p-10 border-2 shadow-2xl relative overflow-visible transition-all duration-500 ${getThemeColor()}`}>
            
            {/* Indicators */}
            <div className="absolute top-6 right-6 md:top-8 md:right-8 flex flex-col items-end gap-2 z-20">
              {data.read_only && (
                <span className="bg-neonOrange/20 text-neonOrange border border-neonOrange px-3 py-1 rounded-full text-[10px] md:text-xs font-bold animate-pulse whitespace-nowrap">
                  VIEW ONLY
                </span>
              )}
              
              {data.remote_active && (
                <div className="group relative flex items-center gap-1.5 text-neonBlue text-[10px] md:text-xs cursor-help bg-neonBlue/10 px-2 md:px-3 py-1 rounded-full border border-neonBlue/20 whitespace-nowrap">
                  <Radio size={12} /> <span className="hidden md:inline">Remote Sensor</span> <span className="md:hidden">Remote</span>
                  <div className="absolute right-0 top-full mt-2 w-40 bg-black border border-gray-700 p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                    <div className="flex justify-between text-gray-400 mb-1 text-xs"><span>Local:</span> <span className="text-white font-bold">{data.local_temp}°</span></div>
                    <div className="flex justify-between text-gray-400 text-xs"><span>Remote:</span> <span className="text-white font-bold">{data.remote_temp}°</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <span className="text-gray-400 text-xs uppercase tracking-widest">Room Temperature</span>
              <div className="flex items-start -ml-1">
                <span className="text-[5rem] md:text-[7rem] lg:text-[8rem] leading-none font-bold tracking-tighter text-white">
                  {Number(data.temp).toFixed(1)}
                </span>
                <span className="text-3xl md:text-4xl text-gray-500 mt-4 md:mt-6">°</span>
              </div>
            </div>

            <div className="mt-8 md:mt-12 grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-background/40 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Droplets size={14} /><span className="text-[10px] tracking-wider">HUMIDITY</span></div>
                <span className="text-xl md:text-2xl font-bold text-white">{data.humidity}%</span>
              </div>
              <div className="bg-background/40 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Gauge size={14} /><span className="text-[10px] tracking-wider">PRESSURE</span></div>
                <span className="text-xl md:text-2xl font-bold text-white">{data.pressure}</span>
              </div>
              
              <div className="bg-background/40 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Activity size={14} /><span className="text-[10px] tracking-wider">AQI SCORE</span></div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl md:text-2xl font-bold ${getIaqColor(data.iaq)}`}>{data.iaq}</span>
                  <span className={`text-[10px] font-bold ${getIaqColor(data.iaq)}`}>{getIaqText(data.iaq)}</span>
                </div>
              </div>
              
              <div className="bg-background/40 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-1"><Thermometer size={14} /><span className="text-[10px] tracking-wider">TARGET</span></div>
                <span className="text-xl md:text-2xl font-bold text-white">{data.target}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN (Controls) --- */}
        <div className={`flex flex-col gap-6 transition-opacity duration-300 ${data.read_only ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
           {/* Mode Buttons */}
           <div className="bg-card rounded-[2rem] p-6 md:p-8 border border-gray-800 shadow-xl">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
               {DASHBOARD_MODES.map(({ value: m }) => (
                 <button key={m} onClick={() => sendControl({ mode: m })} className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 ${data.mode === m ? (m === 'HEAT' ? 'bg-neonOrange text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]' : m === 'COOL' ? 'bg-neonBlue text-black shadow-[0_0_20px_rgba(59,130,246,0.4)]' : m === 'AUTO' ? 'bg-neonGreen text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-white text-black shadow-lg') : 'bg-background hover:bg-white/10 text-gray-400'}`}>
                   {m === 'HEAT' ? <Flame size={24}/> : m === 'COOL' ? <Snowflake size={24}/> : m === 'AUTO' ? <Activity size={24}/> : <Power size={24}/>} <span className="font-bold text-xs mt-1">{m}</span>
                 </button>
               ))}
             </div>
           </div>
           
           {/* Temp Adjust */}
           <div className="bg-card rounded-[2rem] p-6 border border-gray-800 shadow-xl flex items-center justify-between">
              <button onClick={() => sendControl({ target: data.target - 1 })} className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-background border border-gray-700 hover:border-white flex items-center justify-center text-white transition-all active:scale-95"><Minus size={24}/></button>
              <div className="flex flex-col items-center">
                 <span className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Set Point</span>
                 <span className="text-5xl md:text-6xl font-bold">{data.target}°</span>
              </div>
              <button onClick={() => sendControl({ target: data.target + 1 })} className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-background border border-gray-700 hover:border-white flex items-center justify-center text-white transition-all active:scale-95"><Plus size={24}/></button>
           </div>
           
           {/* Fan/Eco */}
           <div className="grid grid-cols-2 gap-4 md:gap-6">
            <button onClick={() => sendControl({ fan_mode: data.fan_mode === 'AUTO' ? 'ON' : 'AUTO' })} className={`p-6 rounded-[2rem] border border-gray-800 flex flex-col justify-between h-32 md:h-36 transition-all ${data.fan_mode === 'ON' ? 'bg-white text-black shadow-lg' : 'bg-card hover:bg-white/5 text-gray-400'}`}>
              <div className="flex justify-between items-start w-full">
                <Wind size={28} className={data.fan_mode === 'ON' ? 'animate-spin-slow' : ''} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{data.fan_mode}</span>
              </div>
              <span className="font-bold text-left text-sm md:text-lg">Fan Control</span>
            </button>

            <button onClick={() => sendControl({ eco_mode: !data.eco_mode })} className={`p-6 rounded-[2rem] border border-gray-800 flex flex-col justify-between h-32 md:h-36 transition-all ${data.eco_mode ? 'bg-neonGreen text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-card hover:bg-white/5 text-gray-400'}`}>
              <div className="flex justify-between items-start w-full">
                <Leaf size={28} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{data.eco_mode ? 'ON' : 'OFF'}</span>
              </div>
              <span className="font-bold text-left text-sm md:text-lg">Eco Mode</span>
            </button>
           </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-16 flex items-center gap-1.5 text-gray-600 text-sm font-mono opacity-50 hover:opacity-100 transition-opacity">
        <span>coded with</span>
        <Heart size={14} className="text-red-500 fill-red-500" />
        <span>by</span>
        <a href="https://github.com/Hounderd" target="_blank" rel="noopener noreferrer" className="text-neonBlue hover:underline hover:text-white transition-colors">
          Hounderd
        </a>
      </div>
    </div>
  );
}

export default Dashboard;
