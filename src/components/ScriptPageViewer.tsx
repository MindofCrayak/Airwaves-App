import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Edit3,
  Check,
  RotateCw,
  Copy,
  Clock,
  Play,
  FileText,
  Send,
  Wand2,
  ArrowRight,
  GitCompare,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import { GeneratedPage, PagePlan, RadioScriptBlueprint, ScriptLine } from '../types';

interface ScriptPageViewerProps {
  page: GeneratedPage | undefined;
  pagePlan: PagePlan | undefined;
  blueprint: RadioScriptBlueprint;
  pageNumber: number;
  totalPages: number;
  allPages: Record<number, GeneratedPage>;
  isGenerating: boolean;
  activeLineIndex: number | null;
  onGeneratePage: () => void;
  onGenerateSequentialUpTo?: (targetPage: number) => void;
  onSelectPage?: (pageNumber: number) => void;
  onUpdateScriptText: (newText: string) => void;
  onTweakPage: (instruction: string) => Promise<void>;
  onPlaySingleLine: (line: ScriptLine, index: number) => void;
}

export const ScriptPageViewer: React.FC<ScriptPageViewerProps> = ({
  page,
  pagePlan,
  blueprint,
  pageNumber,
  totalPages,
  allPages,
  isGenerating,
  activeLineIndex,
  onGeneratePage,
  onGenerateSequentialUpTo,
  onSelectPage,
  onUpdateScriptText,
  onTweakPage,
  onPlaySingleLine,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [tweakInstruction, setTweakInstruction] = useState('');
  const [isTweaking, setIsTweaking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Director Revision Diff State
  const [pendingRevision, setPendingRevision] = useState<{
    originalScript: string;
    revisedScript: string;
    notes?: string;
  } | null>(null);

  // Check for prior missing pages for strict continuity
  let firstMissingPage: number | null = null;
  for (let p = 1; p < pageNumber; p++) {
    if (!allPages[p]) {
      firstMissingPage = p;
      break;
    }
  }

  const handleStartEdit = () => {
    setEditText(page?.rawScript || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onUpdateScriptText(editText);
    setIsEditing(false);
  };

  const handleCopyPage = () => {
    if (page?.rawScript) {
      navigator.clipboard.writeText(page.rawScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTweakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tweakInstruction.trim() || isTweaking || !page) return;
    setIsTweaking(true);
    try {
      const res = await fetch('/api/tweak-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentScript: page.rawScript,
          instruction: tweakInstruction,
          characters: blueprint.characters,
        }),
      });

      if (res.ok) {
        const tweaked = await res.json();
        if (tweaked.rawScript) {
          // Open Diff View
          setPendingRevision({
            originalScript: page.rawScript,
            revisedScript: tweaked.rawScript,
            notes: tweaked.notes,
          });
          setTweakInstruction('');
          return;
        }
      }
      // Fallback direct execution
      await onTweakPage(tweakInstruction);
      setTweakInstruction('');
    } catch (err: any) {
      console.warn('Tweak failed, using fallback:', err);
      await onTweakPage(tweakInstruction);
      setTweakInstruction('');
    } finally {
      setIsTweaking(false);
    }
  };

  const handleAcceptRevision = () => {
    if (pendingRevision) {
      onUpdateScriptText(pendingRevision.revisedScript);
      setPendingRevision(null);
    }
  };

  const handleDiscardRevision = () => {
    setPendingRevision(null);
  };

  // If page is not generated yet, show pleasant invitation or sequential notice
  if (!page) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-12 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-5 shadow-lg shadow-amber-500/10">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono mb-3">
            <span>{pagePlan?.act || `Act ${Math.ceil(pageNumber / 3)}`}</span>
            <span>•</span>
            <span>Page {pageNumber} of {totalPages}</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
            {pagePlan?.sceneHeading || `SCENE: INT. RADIO STUDIO - DAY`}
          </h2>

          <p className="text-zinc-400 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            {pagePlan?.beatSummary || 'Ready to write this dramatic segment of the radio script.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-8 text-left text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Key Audio Cue / Foley:</span>
              <span className="text-amber-400 font-mono">
                {pagePlan?.signatureSfx || 'Environmental room tone & tactile Foley'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Dramatic Conflict:</span>
              <span className="text-zinc-300">
                {pagePlan?.keyDialogueConflict || 'Character confrontation & tension escalation'}
              </span>
            </div>
          </div>

          {firstMissingPage !== null ? (
            <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sequential Continuity Grounding</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                To keep voice acting dialogue and sound cues tightly connected, radio scripts should be written chronologically. Page {firstMissingPage} hasn't been written yet.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                {onSelectPage && (
                  <button
                    onClick={() => onSelectPage(firstMissingPage!)}
                    className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
                  >
                    Go to Next Missing (Page {firstMissingPage})
                  </button>
                )}
                {onGenerateSequentialUpTo && (
                  <button
                    onClick={() => onGenerateSequentialUpTo(pageNumber)}
                    className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
                  >
                    Generate Prior & This Page
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onGeneratePage}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Generating Page {pageNumber}...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Write Page {pageNumber} Broadcast Script</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active Script Viewer
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-4">
      {/* Page Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-amber-400 text-sm">
            PAGE {page.pageNumber} OF {totalPages}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Airtime: ~{page.estimatedDurationSec}s
          </span>
          {page.isCustomEdited && (
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono">
              Custom Edited
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPage}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1.5 transition-colors"
            title="Copy script text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={() => (isEditing ? handleSaveEdit() : handleStartEdit())}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Save Edits' : 'Edit Script'}</span>
          </button>

          <button
            onClick={onGeneratePage}
            disabled={isGenerating}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
            title="Regenerate this page"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Director Revision Diff Modal / Section */}
      {pendingRevision && (
        <div className="p-4 rounded-xl bg-zinc-950 border-2 border-amber-500/50 shadow-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-mono">
              <GitCompare className="w-4 h-4 text-amber-400" />
              <span>DIRECTOR'S REVISION PREVIEW (DIFF COMPARISON)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAcceptRevision}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Accept Revision</span>
              </button>
              <button
                onClick={handleDiscardRevision}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
            </div>
          </div>

          {pendingRevision.notes && (
            <div className="text-xs text-zinc-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 font-mono">
              <span className="font-bold text-amber-400">Director Note: </span>
              {pendingRevision.notes}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-script">
            {/* Previous */}
            <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-red-900/40 space-y-1">
              <div className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider mb-2">
                Current Page Version
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-zinc-400 max-h-72 overflow-y-auto">
                {pendingRevision.originalScript}
              </pre>
            </div>

            {/* Revised */}
            <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-1">
              <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider mb-2">
                Proposed Polish Version
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-emerald-200 max-h-72 overflow-y-auto">
                {pendingRevision.revisedScript}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Main Broadcast Script Sheet (Courier Typography) */}
      <div className="bg-[#fcfbfa] border-2 border-[#e6e2d8] rounded-xl shadow-2xl p-6 sm:p-12 text-[#1c1b18] min-h-[550px] relative overflow-hidden transition-all">
        {/* Top Paper Header */}
        <div className="border-b-2 border-zinc-900/10 pb-4 mb-6 flex items-center justify-between text-xs font-script text-zinc-600">
          <span className="uppercase font-bold tracking-wider">
            {blueprint.title} • BROADCAST COPY
          </span>
          <span className="font-mono font-bold">PAGE {page.pageNumber}</span>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={18}
              className="w-full font-script text-xs sm:text-sm bg-white border border-zinc-300 rounded-lg p-4 leading-relaxed focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 font-script text-xs sm:text-sm">
            {page.lines && page.lines.length > 0 ? (
              page.lines.map((line, idx) => {
                const isActive = activeLineIndex === idx;

                if (line.type === 'heading') {
                  return (
                    <div
                      key={idx}
                      className={`font-bold uppercase tracking-wider py-1.5 transition-colors ${
                        isActive ? 'bg-amber-300/60 -mx-2 px-2 rounded font-black' : 'text-zinc-950'
                      }`}
                    >
                      {line.text || line.line}
                    </div>
                  );
                }

                if (line.type === 'sfx') {
                  return (
                    <div
                      key={idx}
                      className={`py-1 transition-colors flex items-center justify-between group ${
                        isActive ? 'bg-amber-300/60 -mx-2 px-2 rounded font-bold' : 'text-amber-800 font-semibold'
                      }`}
                    >
                      <span>{line.text || line.line}</span>
                      <button
                        onClick={() => onPlaySingleLine(line, idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-200 text-amber-900 transition-opacity"
                        title="Trigger this sound cue"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (line.type === 'music') {
                  return (
                    <div
                      key={idx}
                      className={`py-1 transition-colors flex items-center justify-between group ${
                        isActive ? 'bg-amber-300/60 -mx-2 px-2 rounded font-bold' : 'text-purple-800 font-semibold'
                      }`}
                    >
                      <span>{line.text || line.line}</span>
                      <button
                        onClick={() => onPlaySingleLine(line, idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-purple-200 text-purple-900 transition-opacity"
                        title="Trigger music stinger"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (line.type === 'bumper') {
                  return (
                    <div
                      key={idx}
                      className={`my-3 p-3 border-y-2 border-dashed border-amber-600/40 text-amber-900 font-bold bg-amber-50/80 rounded ${
                        isActive ? 'bg-amber-300/60' : ''
                      }`}
                    >
                      {line.text || line.line}
                    </div>
                  );
                }

                if (line.type === 'dialogue') {
                  return (
                    <div
                      key={idx}
                      className={`group py-2.5 px-3 transition-all rounded-lg border border-transparent hover:border-amber-500/20 hover:bg-amber-50/60 ${
                        isActive ? 'bg-amber-300/60 border-amber-400/80 shadow-sm' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-950 uppercase tracking-wide">
                          {line.speaker}
                        </span>
                        <button
                          onClick={() => onPlaySingleLine(line, idx)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-500 hover:text-amber-900 hover:bg-amber-200/80 transition-all border border-zinc-200 hover:border-amber-300 cursor-pointer shadow-xs"
                          title="Audition dialogue line with vocal perspective filter"
                        >
                          <Volume2 className="w-3 h-3 text-amber-600" />
                          <span>Audition</span>
                        </button>
                      </div>

                      {line.direction && (
                        <div className="pl-4 sm:pl-8 text-zinc-600 italic text-xs py-0.5">
                          {line.direction}
                        </div>
                      )}

                      <div className="pl-4 sm:pl-8 text-zinc-900 text-sm leading-relaxed">
                        {line.line}
                      </div>
                    </div>
                  );
                }

                // Default / note
                return (
                  <div key={idx} className="text-zinc-600 italic py-1 pl-4">
                    {line.text || line.line}
                  </div>
                );
              })
            ) : (
              <pre className="font-script whitespace-pre-wrap leading-relaxed text-zinc-900">
                {page.rawScript}
              </pre>
            )}
          </div>
        )}

        {/* Page Bottom / Ending Hook */}
        {page.endingHook && (
          <div className="mt-8 pt-4 border-t border-zinc-300 flex items-center justify-between text-xs font-script text-zinc-500">
            <span>[FADE OUT / PAGE BREAK]</span>
            <span className="italic">{page.endingHook}</span>
          </div>
        )}
      </div>

      {/* AI Director Tweak & Revision Bar */}
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Director's Polish & Revision</span>
          </div>
          <span className="text-[11px] text-zinc-500">
            Refine dialogue, adjust Foley acoustic perspective, or apply radio filters
          </span>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            'Make the dialogue sharper and faster-paced',
            'Add more rain and thunder Foley cues',
            'Increase the tension and dread before the cliffhanger',
            'Give the villain a chilling whisper direction',
            'Add telephone radio filter distortion',
          ].map((preset, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => setTweakInstruction(preset)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-colors"
            >
              + {preset}
            </button>
          ))}
        </div>

        {/* Instruction Input */}
        <form onSubmit={handleTweakSubmit} className="flex gap-2">
          <input
            type="text"
            value={tweakInstruction}
            onChange={(e) => setTweakInstruction(e.target.value)}
            placeholder="Tell the AI director how to polish or rewrite Page..."
            className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={!tweakInstruction.trim() || isTweaking}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isTweaking ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Polishing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Preview Polish</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
