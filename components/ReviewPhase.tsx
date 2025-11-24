import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Check, X as XIcon, Rewind, FastForward } from 'lucide-react';
import { CutEvent } from '../types';
import { Button } from './Button';

interface ReviewPhaseProps {
  fileUrl: string;
  cuts: CutEvent[];
  setCuts: React.Dispatch<React.SetStateAction<CutEvent[]>>;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ReviewPhase: React.FC<ReviewPhaseProps> = ({
  fileUrl,
  cuts,
  setCuts,
  onConfirm,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeCutId, setActiveCutId] = useState<string | null>(null);
  
  // Scrubbing State
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const wasPlayingRef = useRef(false);

  // Preview State
  const previewEndTimeRef = useRef<number | null>(null);

  // Generate synthetic waveform data
  const waveformBars = useMemo(() => {
    const bars = [];
    const count = 100;
    let activity = 0.5;
    for(let i = 0; i < count; i++) {
         // Generate pseudo-random heights that look like audio
         // We want some clustering to look like speech phrases
         if (Math.random() > 0.85) activity = Math.random(); 
         const noise = Math.random() * 0.3;
         const baseHeight = (Math.sin(i * 0.2) + 1) / 2;
         const value = Math.max(0.1, Math.min(1.0, (baseHeight * activity) + noise));
         bars.push(value);
    }
    return bars;
  }, []);

  // Toggle acceptance status of a cut
  const toggleCutStatus = (id: string, status: 'accepted' | 'rejected') => {
    setCuts(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  // Playback Loop & Skip Logic
  useEffect(() => {
    let animationFrame: number;

    const checkTime = () => {
      // Don't auto-skip or update from video while user is manually scrubbing
      if (isScrubbing) {
        animationFrame = requestAnimationFrame(checkTime);
        return;
      }

      if (videoRef.current && !videoRef.current.paused) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        // Preview Logic: Stop if we reached the preview end time
        if (previewEndTimeRef.current !== null) {
            if (time >= previewEndTimeRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
                previewEndTimeRef.current = null;
            } else {
                // Ensure the cut being previewed remains highlighted
                const currentPreviewCut = cuts.find(c => time >= (c.start - 1.5) && time <= (c.end + 1.5));
                if (currentPreviewCut) setActiveCutId(currentPreviewCut.id);
            }
            // While previewing specific range, DO NOT skip cuts.
            animationFrame = requestAnimationFrame(checkTime);
            return;
        }

        // Standard Logic: Skip accepted cuts
        // Find if we are currently inside an ACCEPTED cut
        // We only skip if the user is NOT scrubbing.
        const currentCut = cuts.find(c => 
          c.status === 'accepted' && 
          time >= c.start && 
          time < c.end
        );

        if (currentCut) {
          // Visual indicator we are skipping
          setActiveCutId(currentCut.id);
          // Jump
          videoRef.current.currentTime = currentCut.end;
        } else {
           // Check if we are near any cut to highlight it in the UI list
           const upcomingCut = cuts.find(c => Math.abs(c.start - time) < 2);
           setActiveCutId(upcomingCut ? upcomingCut.id : null);
        }
      } else {
        // Synchronize state if video paused externally or finished
        if (videoRef.current && videoRef.current.paused !== !isPlaying) {
             setIsPlaying(!videoRef.current.paused);
        }
      }
      animationFrame = requestAnimationFrame(checkTime);
    };

    animationFrame = requestAnimationFrame(checkTime);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, cuts, isScrubbing]);

  // Preview specific cut (1s before and 1s after)
  const previewCut = (cut: CutEvent) => {
    // Explicitly set active cut so UI highlights immediately
    setActiveCutId(cut.id);
    
    if (videoRef.current) {
      const start = Math.max(0, cut.start - 1);
      const end = Math.min(duration, cut.end + 1);
      
      previewEndTimeRef.current = end;
      
      videoRef.current.currentTime = start;
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Play failed", e));
    }
  };

  // Skip forward or backward
  const skip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      // Clear preview state if skipping manually
      previewEndTimeRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeExact = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000); // Milliseconds
    // Using colon separator as requested for milliseconds (e.g. 1:23:456)
    return `${mins}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
  };

  // Scrubbing Handlers
  const handleScrubMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (timelineRef.current && videoRef.current && duration > 0) {
       const rect = timelineRef.current.getBoundingClientRect();
       const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
       const percentage = x / rect.width;
       const newTime = percentage * duration;
       
       // Update state for UI playhead
       setCurrentTime(newTime);

       // Update video frame for visual feedback
       // We update the video current time but DO NOT play, effectively scrubbing.
       videoRef.current.currentTime = newTime;

       // Identify active cut during scrub for visual feedback
       const cutAtTime = cuts.find(c => newTime >= c.start && newTime < c.end);
       setActiveCutId(cutAtTime ? cutAtTime.id : null);
    }
  }, [duration, cuts]);

  const handleScrubStart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    if (!timelineRef.current || !videoRef.current) return;

    setIsScrubbing(true);
    // Clear preview limit if user interacts
    previewEndTimeRef.current = null;
    
    // Pause if playing to prevent audio stutter while scrubbing
    if (!videoRef.current.paused) {
        wasPlayingRef.current = true;
        videoRef.current.pause();
    } else {
        wasPlayingRef.current = false;
    }
    
    // Immediate jump/update on click
    handleScrubMove(e);
  };

  const handleScrubEnd = useCallback(() => {
    if (!isScrubbing) return;

    setIsScrubbing(false);
    // Resume playback only if it was playing before
    if (wasPlayingRef.current && videoRef.current) {
        videoRef.current.play().catch(console.error);
    }
    wasPlayingRef.current = false;
  }, [isScrubbing]);

  // Window listeners for dragging outside timeline
  useEffect(() => {
    if (isScrubbing) {
      window.addEventListener('mousemove', handleScrubMove);
      window.addEventListener('mouseup', handleScrubEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleScrubMove);
      window.removeEventListener('mouseup', handleScrubEnd);
    };
  }, [isScrubbing, handleScrubMove, handleScrubEnd]);


  // Helper for colors
  const getCutColor = (type: string, isBg = false) => {
      switch(type) {
          case 'cliche': return isBg ? 'bg-pink-500' : 'text-pink-400';
          case 'filler': return isBg ? 'bg-amber-500' : 'text-amber-400';
          case 'repetition': return isBg ? 'bg-blue-500' : 'text-blue-400';
          case 'stutter': return isBg ? 'bg-purple-500' : 'text-purple-400';
          default: return isBg ? 'bg-slate-500' : 'text-slate-400';
      }
  };

  const getCutBadgeStyles = (type: string) => {
      switch(type) {
          case 'cliche': return 'bg-pink-500/20 text-pink-400';
          case 'filler': return 'bg-amber-500/20 text-amber-400';
          case 'repetition': return 'bg-blue-500/20 text-blue-400';
          case 'stutter': return 'bg-purple-500/20 text-purple-400';
          default: return 'bg-slate-500/20 text-slate-400';
      }
  };

  // Memoized stats
  const stats = useMemo(() => {
    const accepted = cuts.filter(c => c.status === 'accepted');
    const timeSaved = accepted.reduce((acc, c) => acc + (c.end - c.start), 0);
    return { count: accepted.length, timeSaved };
  }, [cuts]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-7xl mx-auto w-full animate-fade-in gap-6">
      
      {/* Header Info */}
      <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">Review & Edit</h2>
          <p className="text-sm text-slate-400">
            {stats.count} cuts selected • <span className="text-green-400">-{stats.timeSaved.toFixed(1)}s removed</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>Back</Button>
          <Button onClick={onConfirm}>Process Video</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        
        {/* Left: Video Player */}
        <div className="flex-1 flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative group">
          <div className="relative flex-1 bg-black flex items-center justify-center">
             <video
              ref={videoRef}
              src={fileUrl}
              className="max-h-full max-w-full"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls={false} // Custom controls below
              playsInline
            />
            {/* Cut overlay notification */}
            {activeCutId && !isScrubbing && previewEndTimeRef.current === null && (
              <div className="absolute top-4 right-4 bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg backdrop-blur-sm">
                Skipping Cut...
              </div>
            )}
            {previewEndTimeRef.current !== null && (
              <div className="absolute top-4 right-4 bg-indigo-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
                Previewing Segment
              </div>
            )}
          </div>

          {/* Custom Timeline & Controls */}
          <div className="h-auto py-4 bg-slate-900 border-t border-slate-800 px-4 flex flex-col justify-between shrink-0 select-none">
             {/* Timeline Track with Waveform */}
             <div 
               ref={timelineRef}
               className={`relative h-24 bg-slate-950 rounded-lg mb-4 group/timeline overflow-hidden border border-slate-800 touch-none select-none ${isScrubbing ? 'cursor-grabbing' : 'cursor-pointer'}`}
               onMouseDown={handleScrubStart}
               onMouseMove={(e) => {
                 if (!isScrubbing && timelineRef.current && duration > 0) {
                    const rect = timelineRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    setHoverTime((x / rect.width) * duration);
                 }
               }}
               onMouseLeave={() => setHoverTime(null)}
             >
                {/* Waveform Visualization Layer */}
                <div className="absolute inset-0 flex items-center justify-between px-1 gap-px opacity-40 pointer-events-none">
                    {waveformBars.map((height, i) => (
                        <div 
                            key={i}
                            className="flex-1 bg-slate-400 rounded-full transition-all duration-300"
                            style={{ height: `${height * 60}%` }}
                        />
                    ))}
                </div>

                <div className="absolute inset-0 rounded overflow-hidden pointer-events-none">
                    {/* Progress Fill (Visual Feedback) */}
                    <div 
                        className="absolute top-0 left-0 h-full bg-indigo-500/10 border-r border-indigo-500/30"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />

                    {/* Cuts Markers */}
                    {cuts.map(cut => {
                        const isActive = activeCutId === cut.id;
                        return (
                            <div
                                key={cut.id}
                                className={`absolute h-full transition-all duration-200 backdrop-blur-[1px] ${
                                cut.status === 'accepted' 
                                    ? getCutColor(cut.type, true)
                                    : 'bg-slate-700'
                                } ${isActive ? 'opacity-80 ring-2 ring-white/70 z-10 brightness-110' : 'opacity-60'}`}
                                style={{
                                left: `${(cut.start / duration) * 100}%`,
                                width: `${Math.max(0.5, ((cut.end - cut.start) / duration) * 100)}%`
                                }}
                            />
                        );
                    })}
                    
                    {/* Ghost Playhead (Hover) */}
                    {!isScrubbing && hoverTime !== null && (
                        <div 
                            className="absolute top-0 w-px h-full bg-white/40 z-0"
                            style={{ left: `${(hoverTime / duration) * 100}%` }}
                        />
                    )}

                    {/* Active Playhead */}
                    <div 
                    className={`absolute top-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20 transition-all duration-75 ${
                        isScrubbing ? 'w-1 bg-indigo-400 shadow-indigo-500/50' : 'w-0.5'
                    }`}
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                    />
                </div>

                {/* Time Tooltip */}
                {(isScrubbing || hoverTime !== null) && duration > 0 && (
                    <div 
                        className="absolute top-2 -translate-x-1/2 px-2 py-1 bg-slate-800/90 text-white text-xs font-mono rounded shadow-lg pointer-events-none z-40 whitespace-nowrap border border-slate-600 backdrop-blur"
                        style={{ 
                            left: `${((isScrubbing ? currentTime : hoverTime!) / duration) * 100}%` 
                        }}
                    >
                        {formatTimeExact(isScrubbing ? currentTime : hoverTime!)}
                    </div>
                )}
             </div>

             {/* Transport Controls */}
             <div className="flex items-center justify-between">
                
                {/* Left: Time Display */}
                <div className="w-24 text-sm font-mono text-slate-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Center: Main Controls */}
                <div className="flex items-center gap-6">
                  {/* Rewind 10s */}
                  <button 
                    onClick={() => skip(-10)}
                    className="text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none p-2 hover:bg-slate-800 rounded-full group"
                    title="Rewind 10s"
                  >
                    <Rewind className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                  </button>

                  {/* Skip Back 5s */}
                  <button 
                    onClick={() => skip(-5)}
                    className="text-slate-400 hover:text-white transition-colors focus:outline-none p-2 hover:bg-slate-800 rounded-full"
                    title="Back 5s"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => {
                        if(videoRef.current) {
                            if(isPlaying) videoRef.current.pause();
                            else videoRef.current.play();
                        }
                    }}
                    className="text-white bg-indigo-600 hover:bg-indigo-500 transition-all focus:outline-none transform active:scale-95 p-3 rounded-full shadow-lg shadow-indigo-500/20"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                  </button>

                  {/* Skip Forward 5s */}
                  <button 
                    onClick={() => skip(5)}
                    className="text-slate-400 hover:text-white transition-colors focus:outline-none p-2 hover:bg-slate-800 rounded-full"
                    title="Forward 5s"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>

                   {/* Fast Forward 10s */}
                  <button 
                    onClick={() => skip(10)}
                    className="text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none p-2 hover:bg-slate-800 rounded-full group"
                    title="Fast Forward 10s"
                  >
                    <FastForward className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                
                {/* Right: Legend */}
                <div className="hidden xl:flex gap-3 text-xs font-medium items-center justify-end">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Filler Words"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>Filler</div>
                  <div className="flex items-center gap-1.5 text-slate-400" title="Clichés"><span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></span>Cliché</div>
                  <div className="flex items-center gap-1.5 text-slate-400" title="Stuttering"><span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>Stutter</div>
                  <div className="flex items-center gap-1.5 text-slate-400" title="Repetitions"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>Repeat</div>
                  <div className="flex items-center gap-1.5 text-slate-400" title="Silences"><span className="w-2 h-2 rounded-full bg-slate-500"></span>Silence</div>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Cut List */}
        <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-xl flex flex-col shrink-0 overflow-hidden shadow-xl">
           <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
             <h3 className="font-semibold text-white">Detected Events</h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {cuts.length === 0 ? (
                <div className="text-center p-8 text-slate-500">
                  No cuts detected. You speak perfectly!
                </div>
              ) : (
                cuts.map((cut) => (
                  <div 
                    key={cut.id}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                       activeCutId === cut.id ? 'bg-indigo-900/20 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-lg' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    } ${cut.status === 'rejected' ? 'opacity-60' : ''}`}
                    id={`cut-item-${cut.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getCutBadgeStyles(cut.type)}`}>
                            {cut.type}
                          </span>
                          <span className="font-medium text-slate-200 text-sm">"{cut.word}"</span>
                       </div>
                       <span className="text-xs font-mono text-slate-500">{formatTimeExact(cut.start)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                       <button 
                         onClick={() => previewCut(cut)}
                         className="flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                       >
                         <Play className="w-3 h-3 mr-1" /> Preview
                       </button>

                       <div className="flex gap-2">
                          {/* Reject Button */}
                          <button
                             onClick={() => toggleCutStatus(cut.id, 'rejected')}
                             className={`p-1.5 rounded transition-colors ${
                               cut.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                             }`}
                             title="Keep Original"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                          
                          {/* Accept Button */}
                          <button
                             onClick={() => toggleCutStatus(cut.id, 'accepted')}
                             className={`p-1.5 rounded transition-colors ${
                               cut.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                             }`}
                             title="Accept Cut"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

      </div>
    </div>
  );
};