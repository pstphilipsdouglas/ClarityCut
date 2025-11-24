import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Scissors, Sparkles, Play, Check } from 'lucide-react';
import { Button } from './Button';
import { ProcessingMetrics, VideoConfig } from '../types';
import { generateEditingReport } from '../services/geminiService';
import { CutEvent } from '../types';

interface ProcessPhaseProps {
  metrics: ProcessingMetrics;
  cuts: CutEvent[]; // Passed to generate report
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

  // Simulate rendering progress
  useEffect(() => {
    if (progress >= 100) {
      setIsComplete(true);
      return;
    }
    
    // Non-linear progress simulation
    const timeout = setTimeout(() => {
      const increment = Math.max(1, Math.floor(Math.random() * 10));
      setProgress(prev => Math.min(100, prev + increment));
    }, 300);

    return () => clearTimeout(timeout);
  }, [progress]);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in w-full max-w-2xl mx-auto text-center space-y-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
           <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
           <div 
             className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
             style={{ animationDuration: '1.5s' }}
           ></div>
           <Scissors className="w-10 h-10 text-indigo-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Rendering your video...</h2>
          <p className="text-slate-400">
            Stitching clips and exporting as <span className="text-indigo-400 font-mono uppercase">{config.outputFormat}</span> at <span className="text-indigo-400 font-mono uppercase">{config.outputQuality}</span>.
          </p>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="font-mono text-slate-500">{progress}%</p>
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