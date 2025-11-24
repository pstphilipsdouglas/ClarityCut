import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Scissors, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { ProcessingMetrics, VideoConfig } from '../types';
import { generateEditingReport } from '../services/geminiService';
import { CutEvent } from '../types';

interface ProcessPhaseProps {
  metrics: ProcessingMetrics;
  cuts: CutEvent[]; // Passed to generate report
  config: VideoConfig;
  onReset: () => void;
}

export const ProcessPhase: React.FC<ProcessPhaseProps> = ({ metrics, cuts, config, onReset }) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);

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
    <div className="max-w-3xl mx-auto animate-fade-in space-y-8">
      
      {/* Success Banner */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white">Video Processed Successfully!</h2>
        <p className="text-slate-300">Your concise, polished video is ready for download.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Time Saved', value: `${metrics.timeSaved.toFixed(1)}s`, color: 'text-indigo-400' },
          { label: 'Cuts Made', value: metrics.cutsCount, color: 'text-pink-400' },
          { label: 'New Duration', value: `${(metrics.finalDuration / 60).toFixed(1)}m`, color: 'text-white' },
          { label: 'Format', value: config.outputFormat.toUpperCase(), color: 'text-green-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* AI Report Card */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
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
          <p className="text-lg text-slate-100 italic leading-relaxed">
            "{aiReport}"
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Button className="w-full sm:w-auto h-12 text-lg px-8 shadow-lg shadow-indigo-500/20">
          <Download className="w-5 h-5 mr-2" />
          Download .{config.outputFormat.toUpperCase()}
        </Button>
        <Button variant="secondary" onClick={onReset} className="w-full sm:w-auto h-12">
          <RefreshCw className="w-5 h-5 mr-2" />
          Process Another Video
        </Button>
      </div>

      <p className="text-center text-xs text-slate-600">
        Link valid for 24 hours. Original files are deleted automatically.
      </p>
    </div>
  );
};

// Simple Icon component fallback if needed, but I used Lucide imports
const Check = ({className}: {className?:string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
);