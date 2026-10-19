import React from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ScriptLine, CharacterProfile } from '../types';

interface TableReadBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentLineIndex: number;
  totalLines: number;
  currentLine: ScriptLine | null;
  activeSpeaker: string;
  characters: CharacterProfile[];
  soundEffectsEnabled: boolean;
  ttsEngine: 'gemini' | 'browser';
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNextLine: () => void;
  onPrevLine: () => void;
  onToggleSoundEffects: () => void;
  onToggleTtsEngine: () => void;
}

export const TableReadBar: React.FC<TableReadBarProps> = ({
  isPlaying,
  isPaused,
  currentLineIndex,
  totalLines,
  currentLine,
  activeSpeaker,
  soundEffectsEnabled,
  ttsEngine,
  onPlay,
  onPause,
  onStop,
  onNextLine,
  onPrevLine,
  onToggleSoundEffects,
  onToggleTtsEngine,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-xl px-4 lg:px-8 py-3 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Speaker & Line Subtitle */}
        <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Radio className={`w-5 h-5 ${isPlaying && !isPaused ? 'animate-pulse text-red-400' : ''}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider truncate">
                {activeSpeaker || 'STUDIO TABLE READ'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {totalLines > 0 ? `Cue ${currentLineIndex + 1}/${totalLines}` : 'Ready'}
              </span>
            </div>
            <p className="text-xs text-zinc-300 truncate font-script">
              {currentLine?.line || currentLine?.text || 'Click Play to listen to current script page'}
            </p>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevLine}
            disabled={!isPlaying || currentLineIndex <= 0}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
            title="Previous Cue"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {isPlaying && !isPaused ? (
            <button
              onClick={onPause}
              className="p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 font-bold transition-all"
              title="Pause"
            >
              <Pause className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 font-bold transition-all"
              title="Play Table Read"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          )}

          <button
            onClick={onStop}
            disabled={!isPlaying}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
            title="Stop Table Read"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={onNextLine}
            disabled={!isPlaying || currentLineIndex >= totalLines - 1}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
            title="Next Cue"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Audio Features (Foley sound synth & TTS Engine toggle) */}
        <div className="flex items-center gap-3">
          {/* Sound Effects Toggle */}
          <button
            onClick={onToggleSoundEffects}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              soundEffectsEnabled
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
            }`}
            title="Toggle synthesized Foley sound effects during playback"
          >
            {soundEffectsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Foley SFX</span>
          </button>

          {/* TTS Engine Switcher */}
          <button
            onClick={onToggleTtsEngine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
            title="Toggle between Gemini Studio Voice and Browser Voice"
          >
            {ttsEngine === 'gemini' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gemini Studio Voice</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>Fast Browser Speech</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
