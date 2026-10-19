import React from 'react';
import { Radio, Mic, FileText, Download, Printer, Sparkles, Layers, Disc3 } from 'lucide-react';
import { RadioScriptBlueprint, GeneratedPage } from '../types';

interface HeaderProps {
  blueprint: RadioScriptBlueprint | null;
  pages: Record<number, GeneratedPage>;
  totalPages: number;
  isGenerating: boolean;
  isPlayingAudio: boolean;
  isMixingAudio?: boolean;
  onOpenFullScript: () => void;
  onOpenBlueprint: () => void;
  onOpenSfxChecklist: () => void;
  onNewScript: () => void;
  onPrint: () => void;
  onExportText: () => void;
  onExportBbc: () => void;
  onExportFountain: () => void;
  onExportMasterMix: () => void;
  onToggleTableRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  blueprint,
  pages,
  totalPages,
  isGenerating,
  isPlayingAudio,
  isMixingAudio = false,
  onOpenFullScript,
  onOpenBlueprint,
  onOpenSfxChecklist,
  onNewScript,
  onPrint,
  onExportText,
  onExportBbc,
  onExportFountain,
  onExportMasterMix,
  onToggleTableRead,
}) => {
  const generatedCount = Object.keys(pages).length;
  const totalEstSeconds = Object.values(pages).reduce((acc, p) => acc + (p.estimatedDurationSec || 75), 0);
  const minutes = Math.floor(totalEstSeconds / 60);
  const seconds = totalEstSeconds % 60;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & On-Air Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold tracking-wider text-white text-base lg:text-lg">
                  AIRWAVES
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Radio Drama
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Page-by-Page Audio Drama Script Generator
              </p>
            </div>
          </div>

          {/* Vintage "ON AIR" / Studio Light */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider transition-all duration-300 ${
              isGenerating || isPlayingAudio || isMixingAudio
                ? 'bg-red-600/90 text-white on-air-glow border border-red-400'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isGenerating || isPlayingAudio || isMixingAudio ? 'bg-white animate-ping' : 'bg-zinc-600'
              }`}
            />
            <span>
              {isMixingAudio
                ? 'MASTERING WAV'
                : isGenerating
                ? 'GENERATING SCRIPT'
                : isPlayingAudio
                ? 'ON AIR'
                : 'STUDIO READY'}
            </span>
          </div>
        </div>

        {/* Center: Current Script Title & Runtime */}
        {blueprint && (
          <div className="hidden md:flex flex-col items-center">
            <span className="text-sm font-semibold text-zinc-200 max-w-md truncate">
              {blueprint.title}
            </span>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <span className="text-amber-400 font-medium">
                {generatedCount} of {totalPages} pages generated
              </span>
              <span>•</span>
              <span>
                Airtime: ~{minutes}m {seconds > 0 ? `${seconds}s` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {blueprint && (
            <>
              {/* Play / Table Read Toggle */}
              <button
                onClick={onToggleTableRead}
                disabled={generatedCount === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isPlayingAudio
                    ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title="Play audio table read of current script page"
              >
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>{isPlayingAudio ? 'Stop Reading' : 'Table Read'}</span>
              </button>

              {/* Master Mix Button */}
              <button
                onClick={onExportMasterMix}
                disabled={generatedCount === 0 || isMixingAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Render complete multi-track stereo WAV mixdown"
              >
                <Disc3 className={`w-3.5 h-3.5 text-amber-400 ${isMixingAudio ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Master Mix (.wav)</span>
              </button>

              {/* Production Blueprint / Cast Drawer */}
              <button
                onClick={onOpenBlueprint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors"
                title="View Characters & Production Blueprint"
              >
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Cast & Specs</span>
              </button>

              {/* Foley & SFX Checklist */}
              <button
                onClick={onOpenSfxChecklist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 transition-colors"
                title="Open Sound Effect Cue Sheet & Live Soundboard"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">SFX Cue Sheet</span>
              </button>

              {/* Full Script Viewer */}
              <button
                onClick={onOpenFullScript}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors"
                title="View full accumulated script"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Full Script</span>
              </button>

              {/* Export Dropdown / Buttons */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors">
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <div className="absolute right-0 mt-1 w-48 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl py-1 hidden group-hover:block z-50">
                  <button
                    onClick={onExportMasterMix}
                    disabled={generatedCount === 0 || isMixingAudio}
                    className="w-full text-left px-3 py-1.5 text-xs text-amber-300 hover:bg-zinc-800 font-semibold flex items-center justify-between"
                  >
                    <span>Master Audio (.wav)</span>
                    <Disc3 className="w-3 h-3 text-amber-400" />
                  </button>
                  <button
                    onClick={onExportBbc}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>BBC Format (.bbc.txt)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Production</span>
                  </button>
                  <button
                    onClick={onExportText}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Standard Script (.txt)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Plain text</span>
                  </button>
                  <button
                    onClick={onExportFountain}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Fountain Script (.fountain)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Screenplay</span>
                  </button>
                  <button
                    onClick={onPrint}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between border-t border-zinc-800 mt-1 pt-1"
                  >
                    <span>Print Broadcast Copy</span>
                    <Printer className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* New / Reset Adaptation */}
          <button
            onClick={onNewScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Script</span>
          </button>
        </div>
      </div>
    </header>
  );
};
