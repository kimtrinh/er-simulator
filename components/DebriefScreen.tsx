import React from 'react';
import { DebriefData } from '../types';

interface Props {
  data: DebriefData;
  onRestart: () => void;
}

const ProgressBar = ({ label, value }: { label: string; value: number }) => {
    let color = 'bg-red-500';
    if (value >= 80) color = 'bg-emerald-500';
    else if (value >= 60) color = 'bg-yellow-500';

    return (
        <div className="mb-2">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${color} transition-all duration-1000 ease-out`} 
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
};

const DebriefScreen: React.FC<Props> = ({ data, onRestart }) => {
  const scoreColor = data.score >= 80 ? 'text-emerald-400 border-emerald-500' 
                   : data.score >= 60 ? 'text-yellow-400 border-yellow-500' 
                   : 'text-red-400 border-red-500';

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900 animate-fadeIn pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Card */}
            <div className="col-span-1 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col items-center justify-center">
                <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center flex-shrink-0 mb-4 ${scoreColor} shadow-[0_0_15px_rgba(0,0,0,0.3)]`}>
                    <div className="text-center">
                    <span className="block text-4xl font-bold monitor-font">{data.score}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Overall</span>
                    </div>
                </div>
                <h2 className="text-xl font-bold text-white text-center">{data.outcome}</h2>
            </div>

            {/* Performance Breakdown */}
            <div className="col-span-1 md:col-span-2 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Performance Metrics</h3>
                <div className="space-y-3">
                    <ProgressBar label="History & Data Collection" value={data.performanceBreakdown.historyDataCollection} />
                    <ProgressBar label="Differential Diagnosis" value={data.performanceBreakdown.differentialDiagnosis} />
                    <ProgressBar label="Medical Management" value={data.performanceBreakdown.medicalManagement} />
                    <ProgressBar label="Efficiency" value={data.performanceBreakdown.communicationEfficiency} />
                </div>
            </div>
        </div>

        {/* Narrative Summary */}
        <div className="bg-slate-950/50 border-l-4 border-emerald-500 p-6 rounded-r-lg">
            <h3 className="text-emerald-400 font-bold mb-2 text-lg">Case Summary</h3>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base">{data.summary}</p>
        </div>

        {/* Critical Events Analysis */}
        <div>
          <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
            <span className="text-emerald-500">⚡</span> Critical Decision Timeline
          </h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            {data.criticalEvents.map((event, idx) => {
               const isPositive = event.type === 'positive';
               const isNegative = event.type === 'negative';
               const borderColor = isPositive ? 'border-emerald-500/50' : isNegative ? 'border-red-500/50' : 'border-slate-700';
               const icon = isPositive ? '✅' : isNegative ? '⚠️' : 'ℹ️';
               
               return (
                <div key={idx} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active`}>
                    
                    {/* Timeline Dot */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 bg-slate-900 ${isPositive ? 'border-emerald-500 text-emerald-500' : isNegative ? 'border-red-500 text-red-500' : 'border-slate-500 text-slate-500'}`}>
                        <span className="text-lg">{isPositive ? '✓' : isNegative ? '!' : '•'}</span>
                    </div>

                    {/* Content Card */}
                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 bg-slate-900 rounded-xl border ${borderColor} shadow-lg`}>
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-slate-100">{event.event}</h4>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isPositive ? 'bg-emerald-900/30 text-emerald-400' : isNegative ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                                {isPositive ? 'Good Call' : isNegative ? 'Pitfall' : 'Note'}
                            </span>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                                    <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">You</span>
                                    <span className={isNegative ? 'text-red-300' : 'text-slate-300'}>{event.userAction}</span>
                                </div>
                                <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                                    <span className="text-[10px] uppercase text-emerald-600/70 font-bold block mb-1">Optimal</span>
                                    <span className="text-emerald-100/80">{event.optimalAction}</span>
                                </div>
                            </div>
                            <div className="text-slate-400 italic text-xs pt-2 border-t border-slate-800/50">
                                "{event.feedback}"
                            </div>
                        </div>
                    </div>
                </div>
               );
            })}
          </div>
        </div>

        {/* Learning & Missed Opps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-slate-800/20 p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span>🔍</span> Missed Opportunities
            </h3>
            {data.missedOpportunities.length > 0 ? (
                <ul className="space-y-2">
                {data.missedOpportunities.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{point}</span>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-slate-500 italic">None detected. Great job!</p>
            )}
          </div>

          <div className="bg-slate-800/20 p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
              <span>📚</span> CME Core Concepts
            </h3>
            <ul className="space-y-2">
              {data.cmeLearningPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Restart Action */}
        <div className="flex justify-center pt-8">
            <button 
                onClick={onRestart}
                className="group relative px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/50 transition-all overflow-hidden"
            >
                <span className="relative z-10 flex items-center gap-2">
                    Start New Case
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
        </div>

      </div>
    </div>
  );
};

export default DebriefScreen;