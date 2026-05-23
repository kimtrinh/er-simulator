import React, { useState, useRef, useEffect } from 'react';

interface Props {
  onAction: (action: string) => void;
  disabled: boolean;
}

const Controls: React.FC<Props> = ({
  onAction, disabled
}) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [inputText]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || disabled) return;
    onAction(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setInputText('');
      textareaRef.current?.blur();
    }
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
            <div className="absolute left-4 top-4 text-emerald-500/50 font-mono text-lg group-focus-within:text-emerald-500 transition-colors">
              &gt;
            </div>
            <label htmlFor="clinical-input" className="sr-only">Clinical orders</label>
            <textarea
              ref={textareaRef}
              id="clinical-input"
              rows={1}
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? 'Simulating results...' : "Order EKG, give 4mg Morphine, check lungs..."}
              className="w-full bg-slate-950 text-slate-100 rounded-xl pl-10 pr-14 py-4 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm md:text-base shadow-2xl placeholder:text-slate-700 resize-none overflow-hidden"
            />
            <button
              type="submit"
              disabled={disabled || !inputText.trim()}
              className="absolute right-3 top-4 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-0 transition-all shadow-lg active:scale-95"
            >
              EXECUTE
            </button>
          </form>
        </div>

        {/* Helper Hints */}
        <div className="flex gap-4 px-1">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Shift + Enter for newline</span>
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Esc to clear</span>
        </div>
      </div>
    </div>
  );
};

export default Controls;
