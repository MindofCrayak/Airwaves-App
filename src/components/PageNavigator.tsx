import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  RotateCw,
  Tv,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { RadioScriptBlueprint, GeneratedPage, ScriptEpisode } from '../types';

interface PageNavigatorProps {
  blueprint: RadioScriptBlueprint;
  pages: Record<number, GeneratedPage>;
  currentPageNumber: number;
  currentEpisodeIndex: number;
  totalPages: number;
  isGeneratingPage: boolean;
  isGeneratingEpisode: boolean;
  isBatchGenerating: boolean;
  onSelectPage: (pageNumber: number) => void;
  onSelectEpisode: (episodeIndex: number) => void;
  onGenerateCurrentPage: () => void;
  onGenerateCurrentEpisode: () => void;
  onGenerateBatch: () => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
  blueprint,
  pages,
  currentPageNumber,
  currentEpisodeIndex,
  totalPages,
  isGeneratingPage,
  isGeneratingEpisode,
  isBatchGenerating,
  onSelectPage,
  onSelectEpisode,
  onGenerateCurrentPage,
  onGenerateCurrentEpisode,
  onGenerateBatch,
}) => {
  const generatedCount = Object.keys(pages).length;
  const currentPageData = pages[currentPageNumber];
  const currentPagePlan = blueprint.pages.find((p) => p.pageNumber === currentPageNumber);

  // Active episode
  const episodes = blueprint.episodes || [];
  const activeEpisode =
    episodes.find((e) => e.episodeIndex === currentEpisodeIndex) || episodes[0];

  // Episode pages
  const epPages = activeEpisode
    ? Array.from({ length: activeEpisode.pageEnd - activeEpisode.pageStart + 1 }).map(
        (_, i) => activeEpisode.pageStart + i
      )
    : [];

  const epGeneratedCount = epPages.filter((pNum) => Boolean(pages[pNum])).length;
  const isEpisodeComplete = epPages.length > 0 && epGeneratedCount === epPages.length;

  // Check if current page is sequential or if prior pages are missing
  let priorMissingPage: number | null = null;
  for (let p = 1; p < currentPageNumber; p++) {
    if (!pages[p]) {
      priorMissingPage = p;
      break;
    }
  }

  return (
    <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 lg:px-8 py-3 sticky top-[61px] z-30 backdrop-blur-md space-y-2.5">
      {/* Top Row: Episode Selector Tabs */}
      {episodes.length > 0 && (
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-800/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-zinc-500 font-bold flex items-center gap-1 shrink-0">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              Episodes:
            </span>
            <div className="flex items-center gap-1.5">
              {episodes.map((ep) => {
                const isSelected = ep.episodeIndex === currentEpisodeIndex;
                const ePages = Array.from(
                  { length: ep.pageEnd - ep.pageStart + 1 },
                  (_, i) => ep.pageStart + i
                );
                const eGen = ePages.filter((p) => Boolean(pages[p])).length;
                const eComplete = eGen === ePages.length;

                return (
                  <button
                    key={ep.episodeIndex}
                    onClick={() => {
                      onSelectEpisode(ep.episodeIndex);
                      onSelectPage(ep.pageStart);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 font-bold shadow-sm'
                        : 'bg-zinc-950/60 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    <span>
                      Ep.{ep.episodeIndex} ({ep.targetRuntimeMinutes}m • P.{ep.pageStart}-{ep.pageEnd})
                    </span>
                    {eComplete ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : eGen > 0 ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Episode Quick Generation Action */}
          <div className="flex items-center gap-2 shrink-0">
            {activeEpisode && !isEpisodeComplete && (
              <button
                onClick={onGenerateCurrentEpisode}
                disabled={isGeneratingEpisode || isGeneratingPage || isBatchGenerating}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 font-bold text-xs shadow-md shadow-amber-500/15 transition-all cursor-pointer disabled:cursor-not-allowed"
                title={`Generate all pages for Episode ${activeEpisode.episodeIndex} sequentially`}
              >
                {isGeneratingEpisode ? (
                  <>
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Writing Episode {activeEpisode.episodeIndex} Sequentially...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    <span>Generate Episode {activeEpisode.episodeIndex} ({epPages.length - epGeneratedCount} pgs left)</span>
                  </>
                )}
              </button>
            )}

            {isEpisodeComplete && activeEpisode && activeEpisode.episodeIndex < episodes.length && (
              <button
                onClick={() => {
                  const nextEp = episodes[activeEpisode.episodeIndex];
                  if (nextEp) {
                    onSelectEpisode(nextEp.episodeIndex);
                    onSelectPage(nextEp.pageStart);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
              >
                <span>Ep.{activeEpisode.episodeIndex} Done → Next Episode</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Row: Page-by-Page Stepper */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Previous / Next & Page Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => onSelectPage(Math.max(1, currentPageNumber - 1))}
            disabled={currentPageNumber <= 1}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Buttons Stepper */}
          <div className="flex items-center gap-1.5">
            {blueprint.pages.map((plan) => {
              const pNum = plan.pageNumber;
              const isGen = Boolean(pages[pNum]);
              const isCurrent = pNum === currentPageNumber;

              return (
                <button
                  key={pNum}
                  onClick={() => onSelectPage(pNum)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all relative ${
                    isCurrent
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                      : isGen
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-500 border border-zinc-800/80'
                  }`}
                  title={`${plan.act}: ${plan.sceneHeading} - ${plan.beatSummary}`}
                >
                  <span>P.{pNum}</span>
                  {isGen && (
                    <CheckCircle2
                      className={`w-3 h-3 ${isCurrent ? 'text-zinc-950' : 'text-emerald-400'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onSelectPage(Math.min(totalPages, currentPageNumber + 1))}
            disabled={currentPageNumber >= totalPages}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Current Page Beat Teaser */}
        <div className="hidden xl:flex items-center gap-3 text-xs text-zinc-400 max-w-md truncate">
          <span className="font-mono text-amber-400 font-semibold shrink-0">
            {currentPagePlan?.act || `Page ${currentPageNumber}`}
          </span>
          <span className="truncate text-zinc-300" title={currentPagePlan?.beatSummary}>
            {currentPagePlan?.sceneHeading} — {currentPagePlan?.beatSummary}
          </span>
        </div>

        {/* Right: Quick Action Generation Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Generate Current Page */}
          <button
            onClick={onGenerateCurrentPage}
            disabled={isGeneratingPage || isGeneratingEpisode || isBatchGenerating}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
              currentPageData
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                : priorMissingPage !== null
                ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/40'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 animate-pulse'
            }`}
          >
            {isGeneratingPage ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Writing Page {currentPageNumber}...</span>
              </>
            ) : currentPageData ? (
              <>
                <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Regenerate Page {currentPageNumber}</span>
              </>
            ) : priorMissingPage !== null ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Write Missing P.{priorMissingPage} First</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Page {currentPageNumber}</span>
              </>
            )}
          </button>

          {/* Batch Generate All Remaining */}
          {generatedCount < totalPages && (
            <button
              onClick={onGenerateBatch}
              disabled={isGeneratingPage || isGeneratingEpisode || isBatchGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 transition-all disabled:opacity-40"
              title="Automatically generates all remaining pages sequentially"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isBatchGenerating ? 'Auto-Generating...' : 'Auto-Generate All'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
