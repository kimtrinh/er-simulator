
import React, { useState, useEffect } from 'react';
import { GameState, Message } from './types';
import { analyzePDFAndStartCase, progressSimulation } from './services/geminiService';
import { extractImagesFromPDF } from './services/pdfService';
import VitalsMonitor from './components/VitalsMonitor';
import ChatInterface from './components/ChatInterface';
import Controls from './components/Controls';
import DebriefScreen from './components/DebriefScreen';
import ErrorModal from './components/ErrorModal';

const SAVE_KEY = 'medisim_er_save_state';
const API_KEY_STORAGE = 'medisim_er_api_key';

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE) || process.env.API_KEY || '';
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (['upload', 'analyzing', 'playing', 'debrief'].includes(parsed.stage)) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to recover saved state:", e);
      }
    }
    return {
      stage: 'upload',
      vitals: { hr: 0, bpSystolic: 0, bpDiastolic: 0, rr: 0, o2: 0, temp: 0, rhythm: '--' },
      messages: [],
      learningPoints: [],
      hiddenDiagnosis: '',
      caseContext: '',
      visuals: [],
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gameState.stage !== 'upload') {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
    }
  }, [apiKey]);

  const startNewCase = () => {
    localStorage.removeItem(SAVE_KEY);
    setGameState({
      stage: 'upload',
      vitals: { hr: 0, bpSystolic: 0, bpDiastolic: 0, rr: 0, o2: 0, temp: 0, rhythm: '--' },
      messages: [],
      learningPoints: [],
      hiddenDiagnosis: '',
      caseContext: '',
      visuals: [],
    });
    window.location.reload();
  };

  const processFileContent = async (buffer: ArrayBuffer, blob: Blob) => {
    if (!apiKey) {
      setError("Please enter your Google Gemini API Key.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGameState(prev => ({ ...prev, stage: 'analyzing' }));

    try {
      setLoadingStep('Initializing Neural Engine...');
      const base64Data = await fileToBase64(blob);

      setLoadingStep('Scanning clinical visual assets...');
      const extractedImages = await extractImagesFromPDF(buffer);
      
      setLoadingStep('Constructing clinical simulation truth...');
      const initData = await analyzePDFAndStartCase(apiKey, base64Data, extractedImages);
      
      setGameState(prev => ({
        ...prev,
        stage: 'playing',
        vitals: initData.vitals,
        messages: [{
          role: 'assistant',
          content: initData.intro,
          timestamp: Date.now()
        }],
        learningPoints: initData.learningPoints,
        hiddenDiagnosis: initData.diagnosis,
        caseContext: initData.context,
        visuals: initData.visualCatalog
      }));
    } catch (err: any) {
      console.error("Error setting up case:", err);
      setError(`Failed to initialize case: ${err.message || "Unknown error"}. Ensure Key is valid & PDF contains clinical content.`);
      setGameState(prev => ({ ...prev, stage: 'upload' }));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError("Please upload a PDF file.");
      return;
    }
    const buffer = await file.arrayBuffer();
    await processFileContent(buffer, file);
  };

  const handleUserAction = async (actionText: string) => {
    if (isLoading) return;

    const userMsg: Message = { role: 'user', content: actionText, timestamp: Date.now() };
    setGameState(prev => ({ ...prev, messages: [...prev.messages, userMsg] }));
    setIsLoading(true);
    setError(null);

    try {
      const historyStrings = gameState.messages.map(m => 
        `${m.role === 'user' ? 'USER' : 'SIM'}: ${m.content}`
      );
      
      const response = await progressSimulation(
        apiKey,
        gameState.caseContext, 
        historyStrings, 
        actionText, 
        gameState.visuals
      );

      let imageUrl: string | undefined = undefined;
      
      if ((response as any)._generatedImageUrl) {
        imageUrl = (response as any)._generatedImageUrl;
      } else if (response.imageIdToDisplay) {
        const foundVisual = gameState.visuals.find(v => v.id === response.imageIdToDisplay);
        if (foundVisual) imageUrl = foundVisual.data;
      }

      const sysMsg: Message = {
        role: 'assistant',
        content: response.narrative,
        timestamp: Date.now(),
        type: (response.updatedVitals.hr < 50 || response.updatedVitals.hr > 140 || response.updatedVitals.o2 < 90) ? 'alert' : 'text',
        imageUrl: imageUrl
      };

      if (response.isCaseOver && response.debriefData) {
        setGameState(prev => ({
          ...prev,
          vitals: response.updatedVitals,
          messages: [...prev.messages, sysMsg],
          debriefData: response.debriefData,
          stage: 'debrief'
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          vitals: response.updatedVitals,
          messages: [...prev.messages, sysMsg]
        }));
      }
    } catch (err: any) {
      console.error("Simulation error:", err);
      setError(`Clinical Engine Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const renderContent = () => {
    switch (gameState.stage) {
      case 'upload':
      case 'analyzing':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="max-w-2xl w-full bg-slate-800/50 p-8 md:p-12 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-sm">
              <div className="mb-6 text-6xl">🩺</div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Clinical Case Setup</h2>
              <p className="text-slate-400 mb-8 max-w-sm mx-auto">Upload a medical guideline PDF to generate a custom ER simulation.</p>
              
              {gameState.stage === 'analyzing' ? (
                   <div className="flex flex-col items-center gap-6 py-10">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-emerald-400 font-mono text-sm font-bold animate-pulse tracking-wide">{loadingStep || 'Processing...'}</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Medical Logic Engine Active</p>
                      </div>
                   </div>
              ) : (
                  <div className="space-y-6">
                      <div className="text-left bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2 tracking-widest">
                          Google Gemini API Key
                        </label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Paste your key here (starts with AIzaSy...)"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-700"
                        />
                         <div className="flex justify-between mt-2">
                           <p className="text-[10px] text-slate-500">
                             Key is stored locally in your browser. 
                           </p>
                           <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wide">
                             Get Key &rarr;
                           </a>
                         </div>
                      </div>

                      <div className="flex justify-center">
                          <div className={`relative group w-full max-w-md ${!apiKey ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                              <input 
                                type="file" 
                                accept="application/pdf" 
                                onChange={handleFileUpload} 
                                disabled={!apiKey}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 group-hover:border-emerald-500 group-hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-4 text-center">
                                  <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                  </div>
                                  <div>
                                    <span className="block text-base font-bold text-slate-200">Select PDF Guideline</span>
                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Upload from your device</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
            </div>
          </div>
        );
      case 'debrief':
        return gameState.debriefData ? <DebriefScreen data={gameState.debriefData} onRestart={startNewCase} /> : null;
      default:
        return (
          <div className="flex-1 flex flex-col overflow-hidden relative">
              <VitalsMonitor vitals={gameState.vitals} />
              <div className="flex-1 overflow-hidden relative flex flex-col">
                  <ChatInterface 
                    messages={gameState.messages} 
                    isLoading={isLoading} 
                    apiKey={apiKey}
                  />
              </div>
              <Controls 
                  onAction={handleUserAction} 
                  disabled={isLoading} 
              />
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-200 overflow-hidden relative">
      <header className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center z-50 shadow-lg">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-emerald-500/20">M</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100 leading-none">MediSim <span className="text-emerald-500">ER</span></h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Clinical AI Engine v2.1</span>
            </div>
        </div>
        {gameState.stage !== 'upload' && (
             <button 
               onClick={startNewCase} 
               className="px-4 py-1.5 rounded-full border border-slate-700 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
             >
               New Simulation
             </button>
        )}
      </header>
      {renderContent()}
      {error && <ErrorModal message={error} onDismiss={clearError} />}
    </div>
  );
};

export default App;
