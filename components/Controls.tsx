import React, { useState } from 'react';

interface Props {
  onAction: (action: string) => void;
  disabled: boolean;
}

const Controls: React.FC<Props> = ({ 
  onAction, disabled 
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onAction(inputText.trim());
    setInputText('');
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-4 md:p-6 relative">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Clinical Command Interface</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono italic">Enter clinical orders or assessment requests...</span>
        </div>

        {/* Input Form */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSubmit} className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 font-mono text-lg group-focus-within:text-emerald-500 transition-colors">
              &gt;
            </div>
            <input
              type="text"
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={disabled}
              placeholder={disabled ? 'Simulating results...' : "Order EKG, give 4mg Morphine, check lungs..."}
              className="w-full bg-slate-950 text-slate-100 rounded-xl pl-10 pr-14 py-4 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm md:text-base shadow-2xl placeholder:text-slate-700"
            />
            <button 
              type="submit" 
              disabled={disabled || !inputText.trim()} 
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-0 transition-all shadow-lg active:scale-95"
            >
              EXECUTE
            </button>
          </form>
        </div>
        
        {/* Helper Hints */}
        <div className="flex gap-4 px-1">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Alt + Enter to line break</span>
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Esc to clear</span>
        </div>
      </div>
    </div>
  );
};

export default Controls;