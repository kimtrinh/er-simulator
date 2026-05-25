
import React, { useEffect, useRef } from 'react';

interface Props {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

const ErrorModal: React.FC<Props> = ({ message, onDismiss, onRetry }) => {
  const retryRef = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (retryRef.current ?? dismissRef.current)?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Simulation error"
      className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onKeyDown={(e) => { if (e.key === 'Escape') onDismiss(); }}
    >
      <div className="max-w-md w-full bg-red-900 border border-red-700 rounded-2xl p-8 shadow-2xl text-center">
        <div className="text-5xl mb-4 animate-bounce" aria-hidden="true">&#x1F6A8;</div>
        <h3 className="text-xl font-bold text-white mb-3">Simulation Error</h3>
        <p className="text-red-100 text-sm mb-6 leading-relaxed">
          {message}
        </p>
        <div className={`flex gap-3 ${onRetry ? '' : 'justify-center'}`}>
          <button
            ref={dismissRef}
            onClick={onDismiss}
            className={`${onRetry ? 'flex-1' : 'w-full'} bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75`}
          >
            Dismiss
          </button>
          {onRetry && (
            <button
              ref={retryRef}
              onClick={onRetry}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
