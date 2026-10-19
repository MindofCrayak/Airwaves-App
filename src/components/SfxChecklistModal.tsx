import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Volume2,
  CheckCircle2,
  Circle,
  ExternalLink,
  Download,
  Search,
  Radio,
  Keyboard,
} from 'lucide-react';
import { RadioScriptBlueprint, GeneratedPage, SfxChecklistItem } from '../types';
import { foleySynth } from '../utils/audioFoley';

interface SfxChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: RadioScriptBlueprint | null;
  pages: Record<number, GeneratedPage>;
  totalPages: number;
}

export const SfxChecklistModal: React.FC<SfxChecklistModalProps> = ({
  isOpen,
  onClose,
  blueprint,
  pages,
  totalPages,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'sfx' | 'music' | 'unacquired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [acquiredMap, setAcquiredMap] = useState<Record<string, boolean>>({});
  const [activeTriggeredKey, setActiveTriggeredKey] = useState<number | null>(null);

  // Helper to categorize Foley cue
  const categorizeCue = (
    text: string,
    isMusic: boolean
  ): SfxChecklistItem['category'] => {
    if (isMusic) return 'music_stinger';
    const lower = text.toLowerCase();
    if (
      lower.includes('rain') ||
      lower.includes('wind') ||
      lower.includes('thunder') ||
      lower.includes('storm') ||
      lower.includes('fog') ||
      lower.includes('sea') ||
      lower.includes('wave')
    ) {
      return 'ambience_weather';
    }
    if (
      lower.includes('phone') ||
      lower.includes('radio') ||
      lower.includes('engine') ||
      lower.includes('clock') ||
      lower.includes('typewriter') ||
      lower.includes('machine') ||
      lower.includes('teletype') ||
      lower.includes('dial')
    ) {
      return 'mechanical_technology';
    }
    if (
      lower.includes('monster') ||
      lower.includes('creature') ||
      lower.includes('growl') ||
      lower.includes('tentacle') ||
      lower.includes('scream') ||
      lower.includes('wolf') ||
      lower.includes('heart')
    ) {
      return 'horror_creature';
    }
    return 'foley_action';
  };

  // Compile all SFX & Music items across all pages & blueprints
  const items: SfxChecklistItem[] = useMemo(() => {
    const list: SfxChecklistItem[] = [];
    const seenCues = new Set<string>();

    for (let p = 1; p <= totalPages; p++) {
      const pageData = pages[p];
      if (pageData && pageData.lines) {
        pageData.lines.forEach((line, idx) => {
          if (line.type === 'sfx' || line.type === 'music') {
            const raw = line.text || line.line || '';
            const clean = raw
              .replace(/^\[(SFX|MUSIC):\s*/i, '')
              .replace(/\]$/, '')
              .trim();

            const key = `p${p}_${idx}_${clean.toLowerCase()}`;
            if (!seenCues.has(key)) {
              seenCues.add(key);
              const isMusic = line.type === 'music';
              const searchTerms = encodeURIComponent(clean.split(',')[0].slice(0, 40));

              list.push({
                id: key,
                pageNumber: p,
                episodeIndex: pageData.episodeIndex || Math.ceil(p / 10),
                type: isMusic ? 'music' : 'sfx',
                cueText: raw,
                cleanDescription: clean,
                category: categorizeCue(clean, isMusic),
                freesoundSearchUrl: `https://freesound.org/search/?q=${searchTerms}`,
                bbcSoundSearchUrl: `https://sound-effects.bbcrewind.co.uk/search?q=${searchTerms}`,
                freePdSearchUrl: isMusic ? `https://freepd.com/` : undefined,
                isAcquired: Boolean(acquiredMap[key]),
              });
            }
          }
        });
      }
    }

    if (blueprint?.pages) {
      blueprint.pages.forEach((plan) => {
        if (!pages[plan.pageNumber]) {
          if (plan.signatureSfx) {
            const key = `plan_p${plan.pageNumber}_sfx`;
            if (!seenCues.has(key)) {
              seenCues.add(key);
              const searchTerms = encodeURIComponent(plan.signatureSfx.split(',')[0].slice(0, 40));
              list.push({
                id: key,
                pageNumber: plan.pageNumber,
                episodeIndex: plan.episodeIndex || Math.ceil(plan.pageNumber / 10),
                type: 'sfx',
                cueText: `[SFX: ${plan.signatureSfx}]`,
                cleanDescription: plan.signatureSfx,
                category: categorizeCue(plan.signatureSfx, false),
                freesoundSearchUrl: `https://freesound.org/search/?q=${searchTerms}`,
                bbcSoundSearchUrl: `https://sound-effects.bbcrewind.co.uk/search?q=${searchTerms}`,
                isAcquired: Boolean(acquiredMap[key]),
              });
            }
          }
          if (plan.musicCue) {
            const key = `plan_p${plan.pageNumber}_music`;
            if (!seenCues.has(key)) {
              seenCues.add(key);
              const searchTerms = encodeURIComponent(plan.musicCue.split(',')[0].slice(0, 40));
              list.push({
                id: key,
                pageNumber: plan.pageNumber,
                episodeIndex: plan.episodeIndex || Math.ceil(plan.pageNumber / 10),
                type: 'music',
                cueText: plan.musicCue,
                cleanDescription: plan.musicCue.replace(/^\[MUSIC:\s*/i, '').replace(/\]$/, ''),
                category: 'music_stinger',
                freesoundSearchUrl: `https://freesound.org/search/?q=${searchTerms}`,
                bbcSoundSearchUrl: `https://sound-effects.bbcrewind.co.uk/search?q=${searchTerms}`,
                isAcquired: Boolean(acquiredMap[key]),
              });
            }
          }
        }
      });
    }

    return list;
  }, [pages, blueprint, totalPages, acquiredMap]);

  // Toggle acquired
  const toggleAcquired = (id: string) => {
    setAcquiredMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered list
  const filteredItems = items.filter((item) => {
    if (filterType === 'sfx' && item.type !== 'sfx') return false;
    if (filterType === 'music' && item.type !== 'music') return false;
    if (filterType === 'unacquired' && item.isAcquired) return false;
    if (
      searchQuery &&
      !item.cleanDescription.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Soundboard Trigger Helper
  const triggerSound = (item: SfxChecklistItem) => {
    if (item.type === 'music') {
      foleySynth.playDramaticStinger();
    } else {
      foleySynth.triggerByCueText(item.cleanDescription);
    }
  };

  // Live Studio Soundboard Mode: Keyboard binding for keys 1 through 9
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        const targetItem = filteredItems[num - 1];
        if (targetItem) {
          e.preventDefault();
          setActiveTriggeredKey(num);
          triggerSound(targetItem);
          setTimeout(() => setActiveTriggeredKey(null), 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems]);

  const acquiredCount = items.filter((i) => i.isAcquired).length;
  const progressPct = items.length > 0 ? Math.round((acquiredCount / items.length) * 100) : 0;

  // Export Foley Sheet (.csv)
  const handleExportCsv = () => {
    const rows = [
      ['Page', 'Episode', 'Type', 'Category', 'Cue Description', 'Acquired Status', 'Open Source Search'],
      ...items.map((i) => [
        `P.${i.pageNumber}`,
        `Ep.${i.episodeIndex}`,
        i.type.toUpperCase(),
        i.category,
        `"${i.cleanDescription.replace(/"/g, '""')}"`,
        i.isAcquired ? 'ACQUIRED' : 'PENDING',
        i.freesoundSearchUrl,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(blueprint?.title || 'radio-drama').toLowerCase().replace(/\s+/g, '-')}-foley-cue-sheet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white">
                  Sound Effects & Foley Cue Sheet
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {items.length} Cues Indexed
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Live Studio Soundboard & Free Open-Source Audio Asset Library
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
              title="Download spreadsheet cue sheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Studio Soundboard Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-300 font-mono">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span className="font-bold">LIVE SOUNDBOARD ACTIVE:</span>
            <span className="hidden sm:inline">Press number keys 1 through 9 on your keyboard to instantly trigger Foley cues while reading along!</span>
          </div>
          <div className="flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
            <span>KEYS 1-9 READY</span>
          </div>
        </div>

        {/* Progress & Free Sound Archives Info Banner */}
        <div className="bg-zinc-950/80 px-4 sm:px-6 py-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-1/2">
            <span className="font-mono text-zinc-400 whitespace-nowrap">
              Foley Acquired: {acquiredCount}/{items.length} ({progressPct}%)
            </span>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-mono">
            <span>Direct Open-Source Archives:</span>
            <span className="text-amber-400">Freesound.org</span>
            <span>•</span>
            <span className="text-blue-400">BBC Sound Effects</span>
            <span>•</span>
            <span className="text-purple-400">FreePD (Public Domain)</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {(['all', 'sfx', 'music', 'unacquired'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterType(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filterType === mode
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                {mode === 'unacquired' ? 'Pending Assets' : mode === 'sfx' ? 'Foley SFX' : mode === 'music' ? 'Music Cues' : 'All Cues'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Foley cue or sound..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Cues List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-zinc-950/40">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No sound effects match the selected filter.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isKeyBound = idx < 9;
              const keyNumber = idx + 1;
              const isTriggered = activeTriggeredKey === keyNumber;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isTriggered
                      ? 'bg-amber-500/20 border-amber-400 scale-[1.01]'
                      : item.isAcquired
                      ? 'bg-zinc-900/40 border-zinc-800/60 opacity-80'
                      : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Left: Checkbox & Cue details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => toggleAcquired(item.id)}
                      className="mt-0.5 text-zinc-400 hover:text-amber-400 transition-colors shrink-0"
                      title={item.isAcquired ? 'Mark pending' : 'Mark acquired'}
                    >
                      {item.isAcquired ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Key badge for soundboard */}
                        {isKeyBound && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border transition-colors ${
                              isTriggered
                                ? 'bg-amber-400 text-zinc-950 border-amber-300'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            [Key {keyNumber}]
                          </span>
                        )}

                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                          P.{item.pageNumber} • Ep.{item.episodeIndex}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                            item.type === 'music'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="text-[10px] text-zinc-500 capitalize">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="font-script text-xs sm:text-sm text-zinc-200">
                        {item.cleanDescription}
                      </div>
                    </div>
                  </div>

                  {/* Right: Sound Preview & Open Source Links */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Live Web Audio Studio Synth Preview */}
                    <button
                      type="button"
                      onClick={() => triggerSound(item)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors font-mono ${
                        isTriggered
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                      title="Synthesize audio preview directly in browser (or press key)"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isKeyBound ? `Trigger (${keyNumber})` : 'Synth Preview'}</span>
                    </button>

                    {/* Freesound.org search link */}
                    <a
                      href={item.freesoundSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-xs flex items-center gap-1 transition-colors font-mono"
                      title="Find CC/Free recording on Freesound.org"
                    >
                      <span>Freesound</span>
                      <ExternalLink className="w-3 h-3 text-amber-400" />
                    </a>

                    {/* BBC Sound Effects search link */}
                    <a
                      href={item.bbcSoundSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-blue-300 border border-blue-500/30 text-xs flex items-center gap-1 transition-colors font-mono"
                      title="Search the official BBC Sound Effects Archive"
                    >
                      <span>BBC Sound</span>
                      <ExternalLink className="w-3 h-3 text-blue-400" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
