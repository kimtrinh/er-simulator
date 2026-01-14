
import React, { useState, useEffect, useRef } from 'react';
import { Vitals } from '../types';
import TelemetryWaveform from './TelemetryWaveform';

interface Props {
  vitals: Vitals;
}

const VitalBox = ({ 
  label, 
  value, 
  unit, 
  color, 
  flicker = false,
  subValue
}: { 
  label: string, 
  value: string | number, 
  unit?: string, 
  color: string, 
  flicker?: boolean,
  subValue?: string
}) => (
  <div className={`flex flex-col items-start justify-between bg-black/60 border border-slate-800 p-1.5 rounded w-full shadow-inner relative overflow-hidden ${flicker ? 'animate-pulse' : ''}`}>
    <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5"></div>
    <span className={`text-[9px] font-bold ${color} opacity-80 uppercase tracking-tighter`}>{label}</span>
    <div className="flex items-end gap-1">
      <span className={`text-2xl font-bold monitor-font ${color} leading-none drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]`}>
        {value}
      </span>
      <div className="flex flex-col">
        {subValue && <span className={`text-[9px] font-bold monitor-font ${color} opacity-60`}>{subValue}</span>}
        {unit && <span className="text-[9px] text-slate-500 font-bold uppercase">{unit}</span>}
      </div>
    </div>
  </div>
);

const VitalsMonitor: React.FC<Props> = ({ vitals }) => {
  const [liveVitals, setLiveVitals] = useState<Vitals>(vitals);
  const lastPropsVitals = useRef<Vitals>(vitals);

  useEffect(() => {
    lastPropsVitals.current = vitals;
    setLiveVitals(vitals);
  }, [vitals]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVitals(current => {
        const baseline = lastPropsVitals.current;
        const jitter = (val: number, factor: number) => {
          const noise = (Math.random() - 0.5) * factor;
          const result = val + noise;
          const baselineVal = baseline[Object.keys(baseline).find(key => baseline[key as keyof Vitals] === val) as keyof Vitals] as number;
          if (Math.abs(result - baselineVal) > factor * 2) return baselineVal + (Math.random() - 0.5);
          return result;
        };

        return {
          ...current,
          hr: Math.round(jitter(current.hr, 1)),
          rr: Math.round(jitter(current.rr, 1)),
          o2: Math.min(100, Math.max(0, Math.round(jitter(current.o2, 0.5)))),
          temp: parseFloat(jitter(current.temp, 0.02).toFixed(1))
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getHrColor = (hr: number) => hr > 110 || hr < 55 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)';
  const getO2Color = (o2: number) => o2 < 93 ? 'text-red-500' : 'text-blue-400';
  const getBpColor = (sys: number) => sys < 95 || sys > 160 ? 'text-red-500' : 'text-yellow-400';

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-2 md:p-3 shadow-2xl z-30">
      <div className="max-w-5xl mx-auto space-y-2">
        {/* Monitor Header */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
              <h2 className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold">Bedside Monitor — Bed 04</h2>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[9px] text-slate-500 font-mono">25mm/s</span>
              <span className="text-[9px] text-emerald-500/80 font-mono font-bold tracking-tighter bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                LIVE
              </span>
           </div>
        </div>
        
        {/* Main Waveform Display - Clear and Large */}
        <div className="w-full bg-black/60 border border-slate-800 rounded-lg p-1 h-[140px] relative overflow-hidden shadow-inner">
           <div className="absolute top-2 left-3 flex flex-col gap-0.5 z-10 pointer-events-none">
              <span className="text-[10px] font-bold text-emerald-500 opacity-60 uppercase tracking-widest">Lead II</span>
              <span className="text-[8px] font-mono text-slate-600">Gain: x1.0</span>
           </div>
           <div className="absolute top-2 right-3 z-10 text-[10px] font-bold text-emerald-500/40 monitor-font pointer-events-none">
             {liveVitals.hr} BPM
           </div>
           <TelemetryWaveform hr={liveVitals.hr} color={getHrColor(liveVitals.hr)} rhythm={vitals.rhythm} />
        </div>

        {/* Vital Parameters Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <VitalBox 
              label="ECG/HR" 
              value={liveVitals.hr} 
              unit="bpm" 
              color={liveVitals.hr > 110 || liveVitals.hr < 55 ? 'text-red-500' : 'text-emerald-500'} 
              flicker={liveVitals.hr > 120}
          />
          <VitalBox 
              label="NIBP" 
              value={`${liveVitals.bpSystolic}/${liveVitals.bpDiastolic}`} 
              unit="mmHg" 
              color={getBpColor(liveVitals.bpSystolic)} 
              subValue={`MAP ${Math.round((liveVitals.bpSystolic + 2 * liveVitals.bpDiastolic) / 3)}`}
          />
          <VitalBox 
              label="SpO2" 
              value={liveVitals.o2} 
              unit="%" 
              color={getO2Color(liveVitals.o2)} 
          />
          <VitalBox 
              label="Resp" 
              value={liveVitals.rr} 
              unit="brpm" 
              color="text-cyan-400" 
          />
        </div>
        
        {/* Status Footer */}
        <div className="flex justify-between items-center border-t border-slate-800/50 pt-1.5">
             <div className="flex gap-4">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Alarms: Active</span>
             </div>
             <span className={`text-[10px] font-bold tracking-widest uppercase monitor-font animate-pulse ${liveVitals.hr > 110 || liveVitals.hr < 55 ? 'text-red-500' : 'text-emerald-500'}`}>
                {vitals.rhythm}
             </span>
        </div>
      </div>
    </div>
  );
};

export default VitalsMonitor;
