import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Scissors, Sparkles, Play, Check, Film, Layers, Cpu } from 'lucide-react';
import { Button } from './Button';
import { ProcessingMetrics, VideoConfig, CutEvent } from '../types';
import { generateEditingReport } from '../services/geminiService';

interface ProcessPhaseProps {
  metrics: ProcessingMetrics;
  cuts: CutEvent[];
  config: VideoConfig;
  onReset: () => void;
  fileUrl: string;
  file: File | null;
}

export const ProcessPhase: React.FC<ProcessPhaseProps> = ({ metrics, cuts, config, onReset, fileUrl, file }) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to determine current stage based on progress
  const getStageInfo = (p: number) => {
    if (p < 20) return { label: 'Initializing Engine', icon: Cpu, detail: 'Loading video into processing buffer...' };
    if (p < 45) return { label: 'Analyzing Audio', icon: Sparkles, detail: 'Identifying filler words and silences...' };
    if (p < 70) return { label: 'Trimming Segments', icon: Scissors, detail: `Removing ${cuts.filter(c => c.status === 'accepted').length} detected events...` };
    if (p < 90) return { label: 'Stitching & Encoding', icon: Layers, detail: `Reassembling as ${config.outputFormat.toUpperCase()}...` };
    return { label: 'Finalizing', icon: Film, detail: 'Preparing download...' };
  };

  const currentStage = getStageInfo(progress);
  const StageIcon = currentStage.icon;

  // Simulate rendering progress
  useEffect(() => {
    if (progress >= 100) {
      if (!isComplete) setIsComplete(true);
      return;
    }
    
    // Varying speeds for different stages to simulate realism
    let delay = 300;
    let increment = Math.max(1, Math.floor(Math.random() * 5));

    if (progress > 60 && progress < 80) {
        // Slow down during "heavy" processing
        delay = 500;
        increment = Math.max(1, Math.floor(Math.random() * 3));
    }

    const timeout = setTimeout(() => {
      setProgress(prev => Math.min(100, prev + increment));
    }, delay);

    return () => clearTimeout(timeout);
  }, [progress, isComplete]);

  // Fetch AI report when complete
  useEffect(() => {
    if (isComplete) {
      setLoadingReport(true);
      generateEditingReport(cuts, metrics.originalDuration)
        .then(report => {
          setAiReport(report);
        })
        .finally(() => setLoadingReport(false));
    }
  }, [isComplete, cuts, metrics.originalDuration]);

  // Auto-skip logic for preview player
  useEffect(() => {
    let animationFrame: number;

    const checkTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        const time = videoRef.current.currentTime;
        
        // Check if current time falls into any ACCEPTED cut
        // We ensure we don't skip if we are already practically at the end of the cut to avoid stutter loops
        const activeCut = cuts.find(c => 
          c.status === 'accepted' && 
          time >= c.start && 
          time < (c.end - 0.1) 
        );

        if (activeCut) {
          // Jump to end of cut + small buffer to ensure we clear the cut region
          videoRef.current.currentTime = activeCut.end + 0.05;
        }
      }
      animationFrame = requestAnimationFrame(checkTime);
    };

    if (isComplete) {
      animationFrame = requestAnimationFrame(checkTime);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isComplete, cuts]);

  const handlePlayPreview = () => {
    if (videoRef.current) {
        videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (videoRef.current.paused) {
            videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
        }
    }
  };

  const handleDownload = () => {
    // Priority: Create a fresh URL from the original File object if available.
    // This is robust against stale blob URLs which can cause "Network Failed" or "Connect to internet" errors in browsers.
    if (file) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = `clarity_cut_optimized.${config.outputFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Revoke after a delay to allow the download process to register the blob
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return;
    }

    // Fallback to existing fileUrl (less reliable for downloads if state changed)
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `clarity_cut_optimized.${config.outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in w-full max-w-2xl mx-auto text-center space-y-12">
        
        {/* Animated Icon Container */}
        <div className="relative">
           <div className="w-32 h-32 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50 shadow-2xl relative overflow-hidden">
             {/* Spinning Border */}
             <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
             <div 
               className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
               style={{ animationDuration: '2s' }}
             ></div>
             
             {/* Center Icon */}
             <div className="relative z-10 p-4 bg-slate-900 rounded-full border border-slate-700 shadow-inner">
               <StageIcon className="w-10 h-10 text-indigo-400 animate-pulse" />
             </div>
           </div>
        </div>
        
        {/* Progress Stages */}
        <div className="w-full space-y-4 px-8">
           <div className="flex justify-between items-end">
              <div className="text-left space-y-1">
                 <h2 className="text-2xl font-bold text-white tracking-tight">{currentStage.label}</h2>
                 <p className="text-sm text-slate-400 font-mono flex items-center gap-2">
                   <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                   {currentStage.detail}
                 </p>
              </div>
              <span className="text-3xl font-bold text-slate-700 font-mono">{progress}%</span>
           </div>

           <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner border border-slate-700/50 relative">
              {/* Animated Stripes Background */}
              <div 
                 className="absolute inset-0 w-full h-full opacity-10"
                 style={{ 
                    backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', 
                    backgroundSize: '1rem 1rem' 
                 }}
              ></div>
              
              {/* Progress Bar */}
              <div 
                className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)] relative overflow-hidden" 
                style={{ width: `${progress}%` }}
              >
                  {/* Shimmer Effect */}
                  <div className="absolute top-0 left-0 w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"></div>
              </div>
           </div>
        </div>

        {/* Technical Specs */}
        <div className="grid grid-cols-2 gap-8 text-xs text-slate-500 border-t border-slate-800/50 pt-8 w-full max-w-lg">
           <div className="flex justify-between border-b border-slate-800 pb-2">
             <span>Export Format</span>
             <span className="text-slate-300 font-mono uppercase">{config.outputFormat}</span>
           </div>
           <div className="flex justify-between border-b border-slate-800 pb-2">
             <span>Resolution</span>
             <span className="text-slate-300 font-mono uppercase">{config.outputQuality}</span>
           </div>
        </div>

      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8 pb-12">
      
      {/* Success Banner */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-green-400">
          <Check className="w-6 h-6" />
          <h2 className="text-2xl font-bold text-white">Video Processed Successfully!</h2>
        </div>
        <p className="text-slate-300">Your concise, polished video is ready.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Preview Player */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-400" /> Preview Result
          </h3>
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
            <video 
              ref={videoRef}
              src={fileUrl}
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls
              playsInline
            />
            
            {/* Playing Indicator */}
            {isPlaying && (
               <div className="absolute top-4 left-4 bg-indigo-500/90 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-none z-10">
                 Previewing Optimized Cut
               </div>
            )}

            {/* Large Play Overlay */}
            {!isPlaying && (
                <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer z-20 group/overlay"
                    onClick={handlePlayPreview}
                >
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-xl group-hover/overlay:scale-110 transition-transform duration-300">
                        <Play className="w-10 h-10 text-white ml-1.5" fill="currentColor" />
                    </div>
                </div>
            )}
          </div>
          <p className="text-xs text-slate-500 text-center">
            This player simulates the final edit by skipping removed segments in real-time.
          </p>
        </div>

        {/* Right Column: Stats & Report */}
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Time Saved', value: `${metrics.timeSaved.toFixed(1)}s`, color: 'text-indigo-400' },
              { label: 'Cuts Made', value: metrics.cutsCount, color: 'text-pink-400' },
              { label: 'New Duration', value: `${(metrics.finalDuration / 60).toFixed(1)}m`, color: 'text-white' },
              { label: 'Format', value: config.outputFormat.toUpperCase(), color: 'text-green-400' }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* AI Report Card */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-white" />
            </div>
            <h3 className="flex items-center gap-2 text-indigo-300 font-medium mb-3">
              <Sparkles className="w-4 h-4" />
              AI Analysis Report
            </h3>
            {loadingReport ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-2 bg-slate-700 rounded"></div>
                  <div className="h-2 bg-slate-700 rounded w-5/6"></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-200 italic leading-relaxed">
                "{aiReport}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-slate-800">
        <Button onClick={handlePlayPreview} variant="secondary" className="w-full sm:w-auto h-12 order-2 sm:order-1">
             <Play className="w-5 h-5 mr-2" />
             Watch Preview
        </Button>
        <Button onClick={handleDownload} className="w-full sm:w-auto h-12 text-lg px-8 shadow-lg shadow-indigo-500/20 order-1 sm:order-2">
          <Download className="w-5 h-5 mr-2" />
          Download .{config.outputFormat.toUpperCase()}
        </Button>
        <Button variant="ghost" onClick={onReset} className="w-full sm:w-auto h-12 order-3 text-slate-400 hover:text-white">
          <RefreshCw className="w-5 h-5 mr-2" />
          Process Another
        </Button>
      </div>

      <p className="text-center text-xs text-slate-600">
        Link valid for 24 hours. Original files are deleted automatically.
      </p>
    </div>
  );
};