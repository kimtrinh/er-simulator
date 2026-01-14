
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../types';
import { speakClinicalNarrative } from '../services/ttsService';

interface Props {
  messages: Message[];
  isLoading: boolean;
  apiKey: string;
}

const ChatInterface: React.FC<Props> = ({ messages, isLoading, apiKey }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handlePlayAudio = async (text: string, idx: number) => {
    if (playingIdx !== null) return;
    if (!apiKey) {
      alert("Please configure your API Key to use TTS.");
      return;
    }
    
    try {
      setPlayingIdx(idx);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      await speakClinicalNarrative(apiKey, text, audioContextRef.current);
    } catch (err) {
      console.error("Audio playback failed", err);
    } finally {
      setTimeout(() => setPlayingIdx(null), 1000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-950/50">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
        >
          <div
            className={`max-w-[85%] md:max-w-[70%] rounded-xl shadow-2xl transition-all ${
              msg.role === 'user'
                ? 'bg-blue-900/30 text-blue-100 border border-blue-800 p-4'
                : msg.type === 'alert'
                ? 'bg-red-900/20 text-red-200 border border-red-800 p-4'
                : 'bg-slate-800 text-slate-200 border border-slate-700 p-4'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                  {msg.type === 'alert' ? '🚨 CRITICAL UPDATE' : 'SIM ENGINE'}
                </div>
                <button
                  onClick={() => handlePlayAudio(msg.content, idx)}
                  disabled={playingIdx !== null}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/50 border border-slate-700/50 hover:bg-slate-700 transition-all group ${playingIdx === idx ? 'animate-pulse border-emerald-500/50' : ''}`}
                  title="Play Clinical Voice"
                >
                  <svg 
                    className={`w-3 h-3 ${playingIdx === idx ? 'text-emerald-500' : 'text-slate-400 group-hover:text-white'}`} 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${playingIdx === idx ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {playingIdx === idx ? 'Playing...' : 'Voice'}
                  </span>
                </button>
              </div>
            )}
            
            <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
              {msg.content}
            </p>

            {msg.imageUrl && (
              <div className="mt-4 group relative cursor-zoom-in">
                 <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="bg-slate-900/80 text-white text-[10px] font-bold px-3 py-1 rounded uppercase tracking-widest border border-white/20">Click to Enlarge</span>
                 </div>
                 <img 
                   src={msg.imageUrl} 
                   alt="Clinical Finding" 
                   className="rounded-lg border border-slate-700 w-full object-cover max-h-[300px] shadow-lg grayscale-[0.2] contrast-125"
                   onClick={() => setLightboxImage(msg.imageUrl || null)}
                 />
                 <div className="mt-1 flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Source: CME Document Extraction</span>
                 </div>
              </div>
            )}
            
            <div className="text-[10px] text-slate-500 mt-2 text-right font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-2 border border-slate-700">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            <span className="text-xs text-emerald-500 ml-1 font-mono uppercase tracking-widest">Processing Clinical Logic...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-7xl w-full max-h-full flex flex-col items-center">
            <img 
              src={lightboxImage} 
              className="max-w-full max-h-[85vh] object-contain shadow-[0_0_50px_rgba(16,185,129,0.2)] border border-white/10 rounded"
              alt="Clinical Find Large"
            />
            <button className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-full font-bold hover:bg-slate-700 transition-colors border border-slate-600">
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
