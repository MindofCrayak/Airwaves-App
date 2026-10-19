import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  Sliders,
  BookOpen,
  Volume2,
  Radio,
  Clock,
  ArrowRight,
  AlertCircle,
  Tv,
  Megaphone,
} from 'lucide-react';
import {
  AdaptationSettings,
  StylePreset,
  FoleyDensity,
  NarratorPresence,
  ShowDurationPreset,
  BumperStyle,
} from '../types';
import { SAMPLE_SOURCES, SampleSource } from '../data/sampleSources';

interface SourceUploaderProps {
  onCalculateMetrics: (payload: {
    text?: string;
    pdfBase64?: string;
    fileName?: string;
    settings: AdaptationSettings;
  }) => Promise<void>;
  isLoading: boolean;
}

export const SourceUploader: React.FC<SourceUploaderProps> = ({
  onCalculateMetrics,
  isLoading,
}) => {
  const [sourceText, setSourceText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);

  const [settings, setSettings] = useState<AdaptationSettings>({
    stylePreset: 'classic_otr',
    showDuration: 'auto',
    targetPages: 8,
    foleyDensity: 'balanced',
    narratorPresence: 'prominent',
    bumperStyle: 'vintage_1930s_sponsor',
    customBumperText: '',
    customNotes: '',
    pacingMode: 'recommended',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSample = (sample: SampleSource) => {
    setSourceText(sample.text);
    setFileName(`${sample.title} (${sample.author})`);
    setSettings((prev) => ({
      ...prev,
      stylePreset: sample.recommendedStyle,
      showDuration: 'auto',
    }));
    setErrorMsg(null);
  };

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setSourceText('');
    setIsReadingFile(true);

    try {
      let text: string;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const { extractTextFromPdf } = await import('../utils/pdfExtractor');
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }
      setSourceText(text);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to read source file.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) {
      setErrorMsg('Please upload a book/source, paste text, or select one of the classic samples.');
      return;
    }

    try {
      await onCalculateMetrics({
        text: sourceText,
        fileName: fileName || undefined,
        settings,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error analyzing document length');
    }
  };

  const durationOptions: { id: ShowDurationPreset; label: string; desc: string; estPages: string }[] = [
    {
      id: 'auto',
      label: 'Auto-Calculate Best Fit',
      desc: 'Scans source length to determine the ideal episode count & broadcast airtime without trimming.',
      estPages: 'Smart Match',
    },
    {
      id: '15min',
      label: '15-Minute Serial Episodes',
      desc: 'Pacing optimized for 15-min cliffhanger episodes (~10–12 script pages each).',
      estPages: '~10–12 pgs/ep',
    },
    {
      id: '30min',
      label: '30-Minute Radio Play',
      desc: 'Classic half-hour format (Mercury Theatre / Suspense) with mid-show station break.',
      estPages: '~22–26 pgs/ep',
    },
    {
      id: '45min',
      label: '45-Minute Feature Drama',
      desc: 'Extended radio drama presentation with two intermission bumper breaks.',
      estPages: '~32–36 pgs',
    },
    {
      id: '60min',
      label: '60-Minute Masterpiece',
      desc: 'Full-length epic broadcast for complete novellas and multi-act dramas.',
      estPages: '~44–50 pgs',
    },
  ];

  const bumperOptions: { id: BumperStyle; label: string; desc: string }[] = [
    {
      id: 'vintage_1930s_sponsor',
      label: '1930s-40s Vintage Commercial / Sponsor',
      desc: 'Authentic mid-show sponsor message (Acme Fountain Pens, Ovaltine, or Chesterfield).',
    },
    {
      id: 'bbc_chimes_station_id',
      label: 'BBC World Service Chimes & Station ID',
      desc: 'Greenwich time pips, chime interval signals, and dignified broadcast station identification.',
    },
    {
      id: 'noir_station_break',
      label: 'Late-Night Noir Radio Station Break',
      desc: 'Midnight AM frequency tone with a sultry announcer voice setting the dial.',
    },
    {
      id: 'modern_podcast_sponsor',
      label: 'Modern Podcast Bumper & Midroll',
      desc: 'Contemporary binaural bumper chime and host-read sponsorship cue.',
    },
    {
      id: 'none_dramatic_only',
      label: 'Pure Dramatic (No Bumpers)',
      desc: 'Unbroken narrative flow with zero commercial or station interruptions.',
    },
  ];

  const styleOptions: { id: StylePreset; label: string; desc: string }[] = [
    {
      id: 'classic_otr',
      label: 'Golden Age Radio (1930s-40s)',
      desc: 'Mercury Theatre style. Authoritative voice, orchestral stingers, acoustic studio Foley.',
    },
    {
      id: 'bbc_theatre',
      label: 'BBC Radio Theatre',
      desc: 'Naturalistic, nuanced performance, atmospheric ambient room tone & realistic Foley.',
    },
    {
      id: 'modern_cinematic',
      label: 'Modern Binaural Audio',
      desc: 'Intimate close-mic drama (Audible/QCODE style), sub-bass pulses, 3D sonic spatial cues.',
    },
    {
      id: 'noir_detective',
      label: 'Hardboiled Noir',
      desc: 'First-person cynical narrator, rain against glass, buzzing neon, muted jazz trumpet.',
    },
    {
      id: 'gothic_horror',
      label: 'Victorian Gothic Horror',
      desc: 'Edgar Allan Poe & Mary Shelley atmosphere, organ drones, frantic whispers, scratching walls.',
    },
    {
      id: 'sci_fi_pulp',
      label: 'Vintage Sci-Fi Serial',
      desc: 'War of the Worlds panic bulletins, eerie theremin cues, crackling radio frequencies.',
    },
  ];

  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Hero Banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-wider mb-4">
          <Radio className="w-3.5 h-3.5" />
          Broadcast Audio Dramatization
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-wide mb-3">
          Adapt Any Story Into A Full Radio Drama
        </h1>
        <p className="text-zinc-400 text-base max-w-2xl mx-auto">
          Upload any book, novel, or story. The engine reads the length, calculates the required episodes
          and pages, and generates the script sequentially with authentic Foley cues, bumpers, and table read audio.
        </p>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* 1-Click Samples */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Try With Classic Radio Drama Sources:
          </span>
          <span className="text-xs text-zinc-500">Click to load source instantly</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {SAMPLE_SOURCES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className="text-left p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="font-medium text-xs text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                  {sample.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                  {sample.suggestedPages}p
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                {sample.teaser}
              </p>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Dropzone & Text Area */}
        <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Upload Source Material or Paste Text
            </label>
            {fileName && (
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 truncate max-w-xs">
                Loaded: {fileName}
              </span>
            )}
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-4 ${
              dragActive
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.rtf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                <Upload className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">
                Click to browse or drop a book, chapter, or manuscript (.pdf, .txt, .md)
              </span>
              <span className="text-xs text-zinc-500">
                Supports full books, manuscripts, novella excerpts, or short stories
              </span>
            </div>
          </div>

          {/* Or Paste Text */}
          <div className="relative">
            <textarea
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
              }}
              placeholder="Or paste your source text, dialogue scene, or book chapter here..."
              rows={5}
              className="w-full rounded-xl bg-zinc-950/70 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 p-4 text-sm text-zinc-200 placeholder:text-zinc-600 font-sans resize-y transition-colors leading-relaxed"
            />
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 px-1">
              <span>
                {isReadingFile ? 'Extracting source text…' : `${wordCount.toLocaleString()} words loaded`}
              </span>
              {sourceText && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceText('');
                    setFileName(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-200 text-xs underline"
                >
                  Clear text
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Broadcast Show & Format Settings Panel */}
        <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Tv className="w-4 h-4 text-amber-400" />
              Intended Show Duration & Broadcast Episode Format
            </h2>
            <span className="text-xs text-zinc-500">Configures episode lengths & timing</span>
          </div>

          {/* Intended Show Duration */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
              Target Episode / Broadcast Length
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {durationOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, showDuration: opt.id })}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    settings.showDuration === opt.id
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-zinc-200">{opt.label}</span>
                    <span className="text-[10px] font-mono text-amber-400">{opt.estPages}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Station Bumpers & Commercial Sponsor Section */}
          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                Station Bumpers & Interstitial Sponsor Breaks
              </label>
              <span className="text-[11px] text-zinc-500">Mid-episode station ID & sponsor cues</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
              {bumperOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, bumperStyle: opt.id })}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    settings.bumperStyle === opt.id
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold text-zinc-200 mb-0.5">{opt.label}</div>
                  <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">{opt.desc}</p>
                </button>
              ))}
            </div>

            {settings.bumperStyle !== 'none_dramatic_only' && (
              <div>
                <input
                  type="text"
                  value={settings.customBumperText}
                  onChange={(e) => setSettings({ ...settings, customBumperText: e.target.value })}
                  placeholder="Optional custom sponsor product (e.g., 'Brought to you by Lucky Strike Cigarettes' or 'Pemberton Fountain Pens')..."
                  className="w-full rounded-xl bg-zinc-950/70 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            )}
          </div>

          {/* Style Preset */}
          <div className="border-t border-zinc-800 pt-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
              Production Tone & Era
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {styleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, stylePreset: opt.id })}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    settings.stylePreset === opt.id
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 text-zinc-200">{opt.label}</div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Foley & Narrator Presence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
            {/* Foley Density */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-2">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Foley & Sound Effects:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['subtle', 'balanced', 'heavy'] as FoleyDensity[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSettings({ ...settings, foleyDensity: level })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize border transition-all ${
                      settings.foleyDensity === level
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Narrator Presence */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-2">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                Narrator Presence:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['prominent', 'minimal', 'none'] as NarratorPresence[]).map((pres) => (
                  <button
                    key={pres}
                    type="button"
                    onClick={() => setSettings({ ...settings, narratorPresence: pres })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize border transition-all ${
                      settings.narratorPresence === pres
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {pres}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Reads entire document length to calculate required pages & episode plan</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || isReadingFile || !sourceText.trim()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Reading Document & Calculating Episode Breakdown...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span>Calculate Episodes & Page Count</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
