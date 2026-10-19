import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Radio,
  Volume2,
  Info,
  ArrowRight,
  Edit2,
  RotateCw,
  Tv,
  Megaphone,
} from 'lucide-react';
import { SourceMetrics, AdaptationSettings, ScriptEpisode } from '../types';

interface AdaptationProposalProps {
  metrics: SourceMetrics;
  settings: AdaptationSettings;
  onApprove: (
    approvedTargetPages: number,
    approvedEpisodes: ScriptEpisode[],
    titleOverride?: string
  ) => void;
  onBackToSource: () => void;
  isBuildingBlueprint: boolean;
}

export const AdaptationProposal: React.FC<AdaptationProposalProps> = ({
  metrics,
  settings,
  onApprove,
  onBackToSource,
  isBuildingBlueprint,
}) => {
  const [selectedPacing, setSelectedPacing] = useState<'recommended' | 'faithful' | 'condensed' | 'custom'>('recommended');
  const [customPages, setCustomPages] = useState<number>(metrics.recommendedTotalPages);
  const [editedTitle, setEditedTitle] = useState(metrics.detectedTitle || 'Untitled Radio Drama');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Active target page count based on pacing choice
  const activeTargetPages =
    selectedPacing === 'recommended'
      ? metrics.recommendedTotalPages
      : selectedPacing === 'faithful'
      ? metrics.faithfulPages
      : selectedPacing === 'condensed'
      ? metrics.condensedPages
      : customPages;

  // Compute episodes dynamically if custom page count was adjusted
  const computeAdjustedEpisodes = (targetPages: number): ScriptEpisode[] => {
    if (
      metrics.recommendedEpisodes &&
      metrics.recommendedEpisodes.length > 0 &&
      targetPages === metrics.recommendedTotalPages
    ) {
      return metrics.recommendedEpisodes;
    }

    // Partition into 1 to 4 episodes based on total pages
    const epCount = targetPages <= 12 ? 1 : targetPages <= 24 ? 2 : targetPages <= 36 ? 3 : 4;
    const basePages = Math.floor(targetPages / epCount);
    let remainder = targetPages % epCount;
    let curPage = 1;

    return Array.from({ length: epCount }).map((_, i) => {
      const pCount = basePages + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      const pStart = curPage;
      const pEnd = curPage + pCount - 1;
      curPage = pEnd + 1;

      const defaultTitle =
        metrics.recommendedEpisodes[i]?.title || `Episode ${i + 1}: The Unfolding Mystery`;
      const defaultFocus =
        metrics.recommendedEpisodes[i]?.dramaticFocus ||
        `Covers pages ${pStart} to ${pEnd} of the story broadcast.`;

      const midPage = Math.floor((pStart + pEnd) / 2);

      return {
        episodeIndex: i + 1,
        title: defaultTitle,
        subtitle: `Broadcast Episode ${i + 1}`,
        targetRuntimeMinutes: Math.round(pCount * 1.25),
        pageStart: pStart,
        pageEnd: pEnd,
        pageCount: pCount,
        dramaticFocus: defaultFocus,
        bumperPlacement: `Mid-Episode Station ID & Sponsor Bumper on Page ${midPage}`,
        status: 'pending',
      };
    });
  };

  const currentEpisodes = computeAdjustedEpisodes(activeTargetPages);
  const estAirtimeMin = Math.round(activeTargetPages * 1.25);

  const handleApprove = () => {
    onApprove(activeTargetPages, currentEpisodes, editedTitle);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Source Document Analyzed
        </div>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-wide mb-2">
          Radio Adaptation & Episode Proposal
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto">
          We analyzed your source material's word count and dramatic scope to plan a broadcast series covering the entire story with station bumpers and sequential page grounding.
        </p>
      </div>

      <div className="space-y-6">
        {/* Source Metrics Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-0.5">
                SOURCE WORK IDENTIFIED
              </span>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="text-xs text-amber-400 font-semibold px-2 py-1 rounded hover:bg-zinc-800"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{editedTitle}</h2>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-zinc-500 hover:text-zinc-300 p-1"
                    title="Edit Title"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {metrics.detectedAuthor && (
                <p className="text-xs text-zinc-400">By {metrics.detectedAuthor}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                {metrics.wordCount?.toLocaleString()} Words
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                {metrics.sourceType || 'Story'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
                ~{metrics.estimatedReadTimeMinutes}m Reading
              </span>
            </div>
          </div>

          {/* Rationale explanation box */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 leading-relaxed flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">How the Page Count & Episodes are Calculated: </span>
              {metrics.calculationRationale ||
                `At ~140–180 spoken dialogue words and audio cues per standard radio script page (1 to 1.5 min airtime), adapting your ${metrics.wordCount?.toLocaleString()}-word text completely requires ${metrics.recommendedTotalPages} script pages.`}
            </div>
          </div>
        </div>

        {/* Pacing Options */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Select Production Pacing & Length
              </h3>
              <p className="text-xs text-zinc-400">
                Configure total script depth across the episode series
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 font-mono block">Estimated Total Series</span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                {activeTargetPages} Pages (~{estAirtimeMin} min)
              </span>
            </div>
          </div>

          {/* Pacing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Recommended */}
            <button
              type="button"
              onClick={() => setSelectedPacing('recommended')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                selectedPacing === 'recommended'
                  ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Recommended
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {metrics.recommendedTotalPages} Pages
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-snug mb-2">
                Balanced dramatization. Covers all narrative beats with standard radio theater dialogue, Foley, and station breaks.
              </p>
              <div className="text-[11px] font-mono text-zinc-500">
                ~{Math.round(metrics.recommendedTotalPages * 1.25)} min airtime
              </div>
            </button>

            {/* Faithful / Unabridged */}
            <button
              type="button"
              onClick={() => setSelectedPacing('faithful')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPacing === 'faithful'
                  ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Faithful / Detailed
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {metrics.faithfulPages} Pages
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-snug mb-2">
                Unabridged depth. Expands subtext, character dialogue, and extended atmospheric room tone.
              </p>
              <div className="text-[11px] font-mono text-zinc-500">
                ~{Math.round(metrics.faithfulPages * 1.25)} min airtime
              </div>
            </button>

            {/* Condensed */}
            <button
              type="button"
              onClick={() => setSelectedPacing('condensed')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPacing === 'condensed'
                  ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Brisk / Condensed
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {metrics.condensedPages} Pages
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-snug mb-2">
                Fast-paced radio serial format. Tightens dialogue and converts exposition directly into brisk Foley.
              </p>
              <div className="text-[11px] font-mono text-zinc-500">
                ~{Math.round(metrics.condensedPages * 1.25)} min airtime
              </div>
            </button>
          </div>

          {/* Custom pages slider */}
          <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80">
            <span className="flex items-center gap-1.5">
              <span>Need a custom length?</span>
              <button
                type="button"
                onClick={() => setSelectedPacing('custom')}
                className={`underline hover:text-amber-400 ${
                  selectedPacing === 'custom' ? 'text-amber-400 font-bold' : ''
                }`}
              >
                Set manual page count
              </button>
            </span>

            {selectedPacing === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="3"
                  max="36"
                  value={customPages}
                  onChange={(e) => setCustomPages(Number(e.target.value))}
                  className="w-32 accent-amber-500"
                />
                <span className="font-mono font-bold text-amber-400 w-12 text-right">
                  {customPages} pgs
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Proposed Episode Breakdown Roadmap */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Broadcast Episode Breakdown ({currentEpisodes.length} {currentEpisodes.length === 1 ? 'Episode' : 'Episodes'})
              </h3>
            </div>
            <span className="text-xs text-zinc-400">
              Generated sequentially page-by-page to keep narrative consistency tight
            </span>
          </div>

          {/* Episodes List */}
          <div className="space-y-3">
            {currentEpisodes.map((ep) => (
              <div
                key={ep.episodeIndex}
                className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-400 text-xs">
                      {ep.episodeIndex}
                    </div>
                    <span className="font-bold text-sm text-zinc-100">
                      Episode {ep.episodeIndex}: {ep.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-semibold">
                      Pages {ep.pageStart}–{ep.pageEnd} ({ep.pageCount} pgs)
                    </span>
                    <span className="text-zinc-500">
                      ~{ep.targetRuntimeMinutes} min
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 mb-2 leading-relaxed">
                  {ep.dramaticFocus}
                </p>

                {ep.bumperPlacement && settings.bumperStyle !== 'none_dramatic_only' && (
                  <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                    <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{ep.bumperPlacement}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Approval Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={onBackToSource}
            disabled={isBuildingBlueprint}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline order-2 sm:order-1"
          >
            ← Upload different source or adjust text
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isBuildingBlueprint}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 order-1 sm:order-2"
          >
            {isBuildingBlueprint ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Building Blueprint & Preparing Episode 1...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Proposal & Generate Episode 1</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
