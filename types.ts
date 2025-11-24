export type Phase = 'upload' | 'analyzing' | 'review' | 'processing' | 'completed';

export type CutType = 'cliche' | 'filler' | 'silence' | 'repetition' | 'stutter';

export type OutputFormat = 'mp4' | 'mov' | 'avi' | 'mkv';
export type OutputQuality = 'original' | '4k' | '1080p' | '720p' | '480p';

export interface CutEvent {
  id: string;
  type: CutType;
  word?: string; // e.g., "Um", "Amen"
  start: number; // seconds
  end: number; // seconds
  confidence: number; // 0-1
  status: 'accepted' | 'rejected';
}

export interface VideoConfig {
  removeCliches: boolean;
  removeFillers: boolean;
  removeSilence: boolean;
  removeRepetition: boolean;
  removeStuttering: boolean;
  silenceThreshold: number;
  customPhrases: string[];
  outputFormat: OutputFormat;
  outputQuality: OutputQuality;
}

export interface PhraseList {
  id: string;
  name: string;
  phrases: string[];
}

export interface ProcessingMetrics {
  originalDuration: number;
  finalDuration: number;
  cutsCount: number;
  timeSaved: number;
}