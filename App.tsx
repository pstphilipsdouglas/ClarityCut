import React, { useState, useEffect } from 'react';
import { UploadPhase } from './components/UploadPhase';
import { ReviewPhase } from './components/ReviewPhase';
import { ProcessPhase } from './components/ProcessPhase';
import { Phase, VideoConfig, CutEvent, ProcessingMetrics, PhraseList } from './types';
import { analyzeVideoMock } from './services/geminiService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  
  const [config, setConfig] = useState<VideoConfig>({
    removeCliches: true,
    removeFillers: true,
    removeSilence: true,
    removeRepetition: true,
    removeStuttering: true,
    silenceThreshold: 1.0,
    customPhrases: [],
    outputFormat: 'mp4',
    outputQuality: '1080p'
  });

  // State for managing saved lists of phrases
  const [savedLists, setSavedLists] = useState<PhraseList[]>([
    { 
      id: 'default-1', 
      name: 'Church Service', 
      phrases: ['Hallelujah', 'Amen', 'Praise God', 'Blessing', 'Scripture'] 
    },
    { 
      id: 'default-2', 
      name: 'Corporate Meeting', 
      phrases: ['Touch base', 'Circle back', 'Synergy', 'Deep dive', 'Offline'] 
    },
    {
      id: 'default-3',
      name: 'Gen Z Slang',
      phrases: ['Literally', 'No cap', 'Vibe', 'Bet', 'Lowkey']
    }
  ]);

  const [cuts, setCuts] = useState<CutEvent[]>([]);
  const [originalDuration, setOriginalDuration] = useState(0);

  // Setup file URL for preview
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      
      // Get duration quickly to feed mock service
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        setOriginalDuration(video.duration);
      };
      video.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleStartAnalysis = async () => {
    if (!file) return;
    setPhase('analyzing');
    
    try {
      // In a real app, we'd upload the file here.
      // Here we simulate the analysis delay and generation of cut metadata.
      // We pass the duration so the mock cuts are within valid range.
      const mockDuration = originalDuration || 60; // Fallback if metadata load failed
      const generatedCuts = await analyzeVideoMock(mockDuration);
      
      // Filter based on config (basic client-side filtering of mock data)
      const filteredCuts = generatedCuts.filter(c => {
         if (c.type === 'cliche' && !config.removeCliches) return false;
         if (c.type === 'filler' && !config.removeFillers) return false;
         
         if (c.type === 'silence') {
            if (!config.removeSilence) return false;
            // Respect the silence threshold (duration of silence must be > threshold)
            if ((c.end - c.start) < config.silenceThreshold) return false;
         }

         if (c.type === 'repetition' && !config.removeRepetition) return false;
         if (c.type === 'stutter' && !config.removeStuttering) return false;
         return true;
      });

      setCuts(filteredCuts);
      setPhase('review');
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed. Please try again.");
      setPhase('upload');
    }
  };

  const handleConfirmCuts = () => {
    setPhase('processing');
  };

  const handleReset = () => {
    setPhase('upload');
    setFile(null);
    setFileUrl('');
    setCuts([]);
  };

  const handleSaveList = (name: string, phrases: string[]) => {
    const newList: PhraseList = {
      id: Date.now().toString(),
      name,
      phrases: [...phrases]
    };
    setSavedLists(prev => [...prev, newList]);
  };

  const handleDeleteList = (id: string) => {
    setSavedLists(prev => prev.filter(l => l.id !== id));
  };

  const calculateMetrics = (): ProcessingMetrics => {
    const acceptedCuts = cuts.filter(c => c.status === 'accepted');
    const timeSaved = acceptedCuts.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
    return {
      originalDuration,
      finalDuration: originalDuration - timeSaved,
      cutsCount: acceptedCuts.length,
      timeSaved
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 flex items-center justify-center lg:justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-lg flex items-center justify-center">
             <span className="font-bold text-white text-lg">C</span>
          </div>
          <span className="font-bold text-xl tracking-tight">ClarityCut <span className="text-indigo-400">AI</span></span>
        </div>
        <div className="hidden lg:flex items-center gap-4 text-sm text-slate-400">
           {phase !== 'upload' && (
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               {phase === 'analyzing' ? 'Analyzing...' : phase === 'review' ? 'Review Mode' : phase === 'processing' ? 'Rendering...' : 'Complete'}
             </div>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto min-h-screen flex flex-col">
        
        {phase === 'upload' && (
          <UploadPhase 
            onFileSelect={setFile} 
            config={config} 
            setConfig={setConfig}
            onStartAnalysis={handleStartAnalysis}
            savedLists={savedLists}
            onSaveList={handleSaveList}
            onDeleteList={handleDeleteList}
          />
        )}

        {phase === 'analyzing' && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-fade-in">
             <div className="relative">
               <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="w-8 h-8 text-indigo-400 animate-pulse" />
               </div>
             </div>
             <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Analyzing Content</h2>
                <p className="text-slate-400">Detecting speech patterns, pauses, and filler words...</p>
             </div>
           </div>
        )}

        {phase === 'review' && (
          <ReviewPhase 
            fileUrl={fileUrl}
            cuts={cuts}
            setCuts={setCuts}
            onConfirm={handleConfirmCuts}
            onCancel={() => setPhase('upload')}
          />
        )}

        {(phase === 'processing' || phase === 'completed') && (
          <ProcessPhase 
            metrics={calculateMetrics()}
            cuts={cuts}
            config={config}
            onReset={handleReset}
          />
        )}

      </main>
    </div>
  );
};

export default App;