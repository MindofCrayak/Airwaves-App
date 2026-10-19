import React, { useState, useEffect, useRef } from 'react';
import {
  RadioScriptBlueprint,
  GeneratedPage,
  AdaptationSettings,
  ScriptLine,
  SourceMetrics,
  ScriptEpisode,
  AudioExportProgress,
  ProjectState,
} from './types';
import { Header } from './components/Header';
import { SourceUploader } from './components/SourceUploader';
import { AdaptationProposal } from './components/AdaptationProposal';
import { PageNavigator } from './components/PageNavigator';
import { ScriptPageViewer } from './components/ScriptPageViewer';
import { FullScriptModal } from './components/FullScriptModal';
import { BlueprintDrawer } from './components/BlueprintDrawer';
import { SfxChecklistModal } from './components/SfxChecklistModal';
import { TableReadBar } from './components/TableReadBar';
import { foleySynth, renderBroadcastMasterTrack } from './utils/audioFoley';
import {
  formatFullScriptText,
  formatBbcRadioPlay,
  formatFountainScript,
  downloadFile,
  printBroadcastScript,
} from './utils/scriptExport';
import {
  loadProject,
  saveProject,
  clearProject,
  saveAudioBlob,
  getAudioBlob,
} from './utils/storage';
import { RotateCw, Sparkles, Disc3, CheckCircle2 } from 'lucide-react';

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export default function App() {
  // Core Project State
  const [metrics, setMetrics] = useState<SourceMetrics | null>(null);
  const [blueprint, setBlueprint] = useState<RadioScriptBlueprint | null>(null);
  const [pages, setPages] = useState<Record<number, GeneratedPage>>({});
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(1);
  const [sourceText, setSourceText] = useState<string>('');
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [sourcePdfBase64, setSourcePdfBase64] = useState<string | null>(null);
  const [currentSettings, setCurrentSettings] = useState<AdaptationSettings>({
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

  // UI state
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const [isBuildingBlueprint, setIsBuildingBlueprint] = useState(false);
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [isGeneratingEpisode, setIsGeneratingEpisode] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [backgroundWritingPage, setBackgroundWritingPage] = useState<number | null>(null);

  const [showFullScript, setShowFullScript] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [showSfxChecklist, setShowSfxChecklist] = useState(false);
  const [showTableRead, setShowTableRead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Master Audio Mixdown Progress
  const [mixdownProgress, setMixdownProgress] = useState<AudioExportProgress | null>(null);

  // Audio Table Read State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [ttsEngine, setTtsEngine] = useState<'gemini' | 'browser'>('browser');

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const resumePromiseRef = useRef<{ resolve: () => void } | null>(null);
  const ttsMemoryCache = useRef<Map<string, string>>(new Map());

  // Awaitable sleep helper that suspends on pause and aborts on stop
  const awaitableSleep = async (ms: number): Promise<boolean> => {
    let remaining = ms;
    const slice = 50;
    while (remaining > 0) {
      if (isStoppedRef.current) return false;
      if (isPausedRef.current) {
        await new Promise<void>((resolve) => {
          resumePromiseRef.current = { resolve };
        });
        if (isStoppedRef.current) return false;
      }
      await new Promise((r) => setTimeout(r, Math.min(slice, remaining)));
      remaining -= slice;
    }
    return !isStoppedRef.current;
  };

  // Load initial saved project from IndexedDB
  useEffect(() => {
    loadProject()
      .then((saved) => {
        if (saved) {
          if (saved.blueprint) setBlueprint(saved.blueprint);
          if (saved.pages) setPages(saved.pages);
          if (saved.currentPageNumber) setCurrentPageNumber(saved.currentPageNumber);
          if (saved.currentEpisodeIndex) setCurrentEpisodeIndex(saved.currentEpisodeIndex);
          if (saved.metrics) setMetrics(saved.metrics);
          if (saved.sourceText) setSourceText(saved.sourceText);
          if (saved.sourceFileName) setSourceFileName(saved.sourceFileName);
          if (saved.sourcePdfBase64) setSourcePdfBase64(saved.sourcePdfBase64);
          if (saved.settings) setCurrentSettings(saved.settings);
        }
      })
      .catch((err) => {
        console.warn('[Storage] Failed to load from IndexedDB:', err);
      });
  }, []);

  // Auto-save project state to IndexedDB on changes
  useEffect(() => {
    if (blueprint || metrics) {
      const stateToSave: ProjectState = {
        title: blueprint?.title || 'Radio Drama Adaptation',
        sourceText,
        sourceFileName,
        sourcePdfBase64,
        metrics,
        settings: currentSettings,
        blueprint,
        pages,
        currentPageNumber,
        currentEpisodeIndex,
        lastUpdated: Date.now(),
      };

      saveProject(stateToSave).catch((e) => {
        console.warn('[Storage] Auto-save error:', e);
      });
    }
  }, [blueprint, pages, currentPageNumber, currentEpisodeIndex, sourceText, sourceFileName, sourcePdfBase64, currentSettings, metrics]);

  // Client-Side TTS In-Memory & IndexedDB Audio Cache
  const getOrFetchTtsAudio = async (
    line: ScriptLine,
    voiceName = 'Kore',
    vocalProfile = ''
  ): Promise<string | null> => {
    const text = line.line || line.text || '';
    if (!text.trim()) return null;

    const cacheKey = `${(line.speaker || 'SPEAKER').toUpperCase()}_${voiceName}_${hashString(text)}`;

    // 1. In-memory check
    if (ttsMemoryCache.current.has(cacheKey)) {
      return ttsMemoryCache.current.get(cacheKey)!;
    }

    // 2. IndexedDB check
    const idbCached = await getAudioBlob(cacheKey);
    if (idbCached) {
      ttsMemoryCache.current.set(cacheKey, idbCached);
      return idbCached;
    }

    // 3. Network fetch with fallback
    try {
      const res = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speaker: line.speaker || 'Actor',
          voiceName,
          stylePrompt: line.direction || vocalProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          ttsMemoryCache.current.set(cacheKey, data.audioBase64);
          await saveAudioBlob(cacheKey, data.audioBase64);
          return data.audioBase64;
        }
      }
    } catch (e) {
      console.warn('[TTS] Network fetch failed:', e);
    }
    return null;
  };

  // Step 1: Calculate document length and episode breakdown
  const handleCalculateMetrics = async (payload: {
    text?: string;
    pdfBase64?: string;
    fileName?: string;
    settings: AdaptationSettings;
  }) => {
    setIsCalculatingMetrics(true);
    setErrorMessage(null);
    try {
      if (payload.text) setSourceText(payload.text);
      if (payload.fileName) setSourceFileName(payload.fileName);
      if (payload.pdfBase64) setSourcePdfBase64(payload.pdfBase64);
      setCurrentSettings(payload.settings);

      const res = await fetch('/api/calculate-source-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payload.text,
          pdfBase64: payload.pdfBase64,
          fileName: payload.fileName,
          stylePreset: payload.settings.stylePreset,
          showDuration: payload.settings.showDuration,
          bumperStyle: payload.settings.bumperStyle,
          customNotes: payload.settings.customNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to calculate source metrics');
      }

      const calculatedMetrics: SourceMetrics = await res.json();
      setMetrics(calculatedMetrics);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Error calculating document length: ${err.message}`);
    } finally {
      setIsCalculatingMetrics(false);
    }
  };

  // Step 2: User Approves the Page Calculation & Episode Structure
  const handleApproveProposal = async (
    approvedTargetPages: number,
    approvedEpisodes: ScriptEpisode[],
    titleOverride?: string
  ) => {
    setIsBuildingBlueprint(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/analyze-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          pdfBase64: sourcePdfBase64,
          stylePreset: currentSettings.stylePreset,
          targetPages: approvedTargetPages,
          approvedEpisodes,
          bumperStyle: currentSettings.bumperStyle,
          customBumperText: currentSettings.customBumperText,
          customNotes: currentSettings.customNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate blueprint from approved plan');
      }

      const bp: RadioScriptBlueprint = await res.json();
      if (titleOverride) {
        bp.title = titleOverride;
      }
      setBlueprint(bp);
      setPages({});
      setCurrentPageNumber(1);
      setCurrentEpisodeIndex(1);

      // Start generating Page 1 immediately
      await generateSpecificPage(1, bp, {});
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Error building blueprint: ${err.message}`);
    } finally {
      setIsBuildingBlueprint(false);
    }
  };

  // Generate a single script page strictly sequential with cumulative episodic continuity state
  const generateSpecificPage = async (
    pageNum: number,
    bpOverride?: RadioScriptBlueprint,
    pagesOverride?: Record<number, GeneratedPage>
  ) => {
    const activeBlueprint = bpOverride || blueprint;
    const activePages = pagesOverride || pages;
    if (!activeBlueprint) return;

    setIsGeneratingPage(true);
    setBackgroundWritingPage(pageNum);

    try {
      const pagePlan = activeBlueprint.pages.find((p) => p.pageNumber === pageNum);
      const prevPage = pageNum > 1 ? activePages[pageNum - 1] : undefined;
      const episode = activeBlueprint.episodes?.find((e) => e.episodeIndex === pagePlan?.episodeIndex);

      const res = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: pageNum,
          totalPages: activeBlueprint.pages.length,
          pagePlan,
          blueprint: activeBlueprint,
          episodeInfo: episode,
          previousPageScript: prevPage?.rawScript || '',
          previousPageSummary: prevPage?.pageSummary || '',
          accumulatedState: prevPage?.accumulatedState || null,
          stylePreset: currentSettings.stylePreset,
          foleyDensity: currentSettings.foleyDensity,
          narratorPresence: currentSettings.narratorPresence,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate page ${pageNum}`);
      }

      const generated: GeneratedPage = await res.json();
      generated.generatedAt = Date.now();
      generated.episodeIndex = pagePlan?.episodeIndex;

      setPages((prev) => ({
        ...prev,
        [pageNum]: generated,
      }));
      setCurrentPageNumber(pageNum);
      if (pagePlan?.episodeIndex) {
        setCurrentEpisodeIndex(pagePlan.episodeIndex);
      }
      return generated;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Failed to generate page ${pageNum}: ${err.message}`);
    } finally {
      setIsGeneratingPage(false);
      setBackgroundWritingPage(null);
    }
  };

  // Generate missing prior pages up to targetPage sequentially
  const handleGenerateSequentialUpTo = async (targetPage: number) => {
    if (!blueprint) return;
    setIsGeneratingEpisode(true);
    let currentAcc = { ...pages };

    try {
      for (let p = 1; p <= targetPage; p++) {
        if (!currentAcc[p]) {
          setCurrentPageNumber(p);
          const generated = await generateSpecificPage(p, blueprint, currentAcc);
          if (generated) {
            currentAcc[p] = generated;
          }
          await new Promise((r) => setTimeout(r, 450));
        }
      }
    } finally {
      setIsGeneratingEpisode(false);
    }
  };

  // Generate an entire episode sequentially
  const handleGenerateCurrentEpisode = async () => {
    if (!blueprint || isGeneratingEpisode) return;
    const activeEp =
      blueprint.episodes?.find((e) => e.episodeIndex === currentEpisodeIndex) ||
      blueprint.episodes?.[0];
    if (!activeEp) return;

    setIsGeneratingEpisode(true);
    let currentAcc = { ...pages };

    try {
      for (let p = 1; p < activeEp.pageStart; p++) {
        if (!currentAcc[p]) {
          setCurrentPageNumber(p);
          const gen = await generateSpecificPage(p, blueprint, currentAcc);
          if (gen) currentAcc[p] = gen;
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      for (let p = activeEp.pageStart; p <= activeEp.pageEnd; p++) {
        if (!currentAcc[p]) {
          setCurrentPageNumber(p);
          const generated = await generateSpecificPage(p, blueprint, currentAcc);
          if (generated) {
            currentAcc[p] = generated;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } finally {
      setIsGeneratingEpisode(false);
    }
  };

  // Unstoppable Autonomous Batch Generation with Retries
  const handleBatchGenerate = async () => {
    if (!blueprint || isBatchGenerating) return;
    setIsBatchGenerating(true);
    let currentAccPages = { ...pages };

    try {
      for (let p = 1; p <= blueprint.pages.length; p++) {
        if (!currentAccPages[p]) {
          setCurrentPageNumber(p);
          let success = false;
          let retries = 0;

          while (!success && retries < 3) {
            try {
              const generated = await generateSpecificPage(p, blueprint, currentAccPages);
              if (generated) {
                currentAccPages[p] = generated;
                success = true;
              } else {
                throw new Error('Empty page response');
              }
            } catch (err) {
              retries++;
              console.warn(`[Batch Generation] Retrying Page ${p} (attempt ${retries}/3)...`, err);
              await new Promise((r) => setTimeout(r, 1500));
            }
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Director Tweak for Current Page
  const handleTweakCurrentPage = async (instruction: string) => {
    const currentPage = pages[currentPageNumber];
    if (!currentPage || !blueprint) return;

    try {
      const res = await fetch('/api/tweak-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentScript: currentPage.rawScript,
          instruction,
          characters: blueprint.characters,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to polish script');
      }

      const tweaked = await res.json();
      setPages((prev) => ({
        ...prev,
        [currentPageNumber]: {
          ...currentPage,
          rawScript: tweaked.rawScript,
          lines: tweaked.lines,
          isCustomEdited: true,
        },
      }));
    } catch (err: any) {
      console.error(err);
      alert(`Failed to tweak script: ${err.message}`);
    }
  };

  // Update raw text directly from editor
  const handleUpdateScriptText = (newText: string) => {
    const currentPage = pages[currentPageNumber];
    if (!currentPage) return;

    setPages((prev) => ({
      ...prev,
      [currentPageNumber]: {
        ...currentPage,
        rawScript: newText,
        isCustomEdited: true,
      },
    }));
  };

  // Play single line audio helper with cache & Web Audio Perspective DSP
  const playLineAudio = async (line: ScriptLine, characterRoster: any[] = []): Promise<void> => {
    if (!line.line && !line.text) return;
    const textToSpeak = line.line || line.text || '';
    const char = characterRoster.find(
      (c) => c.name?.toUpperCase() === line.speaker?.toUpperCase()
    );

    const voiceName = char?.suggestedVoice || 'Kore';
    const vocalProfile = char?.vocalProfile || '';

    // Check cached audio or fetch server TTS
    const base64Audio = await getOrFetchTtsAudio(line, voiceName, vocalProfile);

    if (base64Audio) {
      return new Promise<void>((resolve) => {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        currentAudioRef.current = audio;

        audio.onended = () => resolve();
        audio.onerror = () => resolve();

        audio.play().catch(() => resolve());
      });
    }

    // Web Speech API fallback with perspective adjustment
    if ('speechSynthesis' in window) {
      return new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        if (line.speaker?.includes('NARRATOR')) {
          utterance.rate = 0.95;
          utterance.pitch = 0.92;
        } else if (line.speaker?.includes('OLD MAN')) {
          utterance.rate = 0.85;
          utterance.pitch = 0.8;
        } else if (line.speaker?.includes('INSPECTOR')) {
          utterance.rate = 1.0;
          utterance.pitch = 1.05;
        } else {
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
        }

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    }
  };

  // Synchronized, Interruptible Table Read Execution Loop
  const startTableRead = async () => {
    const currentPage = pages[currentPageNumber];
    if (!currentPage || !currentPage.lines || currentPage.lines.length === 0) {
      alert('Generate script for this page first.');
      return;
    }

    isStoppedRef.current = false;
    isPausedRef.current = false;
    setIsPlayingAudio(true);
    setIsAudioPaused(false);
    setShowTableRead(true);

    const lines = currentPage.lines;
    const startIndex =
      activeLineIndex !== null && activeLineIndex < lines.length ? activeLineIndex : 0;

    for (let i = startIndex; i < lines.length; i++) {
      if (isStoppedRef.current) break;

      setActiveLineIndex(i);
      const line = lines[i];

      if (line.type === 'sfx') {
        if (soundEffectsEnabled) {
          foleySynth.triggerByCueText(line.text || line.line || '');
        }
        const cont = await awaitableSleep(1200);
        if (!cont) break;
      } else if (line.type === 'music') {
        if (soundEffectsEnabled) {
          foleySynth.playDramaticStinger();
        }
        const cont = await awaitableSleep(1800);
        if (!cont) break;
      } else if (line.type === 'heading') {
        const cont = await awaitableSleep(600);
        if (!cont) break;
      } else if (line.type === 'dialogue') {
        await playLineAudio(line, blueprint?.characters || []);
        const cont = await awaitableSleep(400);
        if (!cont) break;
      } else if (line.type === 'bumper') {
        const cont = await awaitableSleep(2000);
        if (!cont) break;
      }

      if (isStoppedRef.current) break;
    }

    if (!isPausedRef.current) {
      setIsPlayingAudio(false);
      setActiveLineIndex(null);
    }
  };

  const stopTableRead = () => {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    setIsPlayingAudio(false);
    setIsAudioPaused(false);
    setActiveLineIndex(null);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (resumePromiseRef.current) {
      resumePromiseRef.current.resolve();
      resumePromiseRef.current = null;
    }
  };

  const pauseTableRead = () => {
    isPausedRef.current = true;
    setIsAudioPaused(true);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
  };

  const resumeTableRead = () => {
    isPausedRef.current = false;
    setIsAudioPaused(false);

    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play().catch(() => {});
    }
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    if (resumePromiseRef.current) {
      resumePromiseRef.current.resolve();
      resumePromiseRef.current = null;
    }
  };

  // Master Audio Multi-Track Offline Mixdown Export Handler
  const handleExportMasterMix = async () => {
    if (!blueprint) return;
    try {
      setMixdownProgress({
        currentPage: 1,
        totalPages: blueprint.pages.length,
        percent: 5,
        statusText: 'Initializing Web Audio Master Engine...',
      });

      const getAudioBufferForMix = async (line: ScriptLine): Promise<ArrayBuffer | null> => {
        const char = blueprint.characters.find(
          (c) => c.name.toUpperCase() === line.speaker?.toUpperCase()
        );
        const base64 = await getOrFetchTtsAudio(
          line,
          char?.suggestedVoice || 'Kore',
          char?.vocalProfile || ''
        );
        if (!base64) return null;

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      };

      const wavBlob = await renderBroadcastMasterTrack(
        blueprint,
        pages,
        getAudioBufferForMix,
        {
          includeFoley: true,
          includeMusic: true,
          masterVolume: 1.0,
          telephoneFilterWet: 0.8,
          roomReverbWet: 0.7,
        },
        (progress) => setMixdownProgress(progress)
      );

      const filename = `${(blueprint.title || 'radio-drama').toLowerCase().replace(/\s+/g, '-')}-master-mix.wav`;
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[Mixdown Error]:', err);
      alert(`Master mixdown error: ${err?.message || err}`);
    } finally {
      setTimeout(() => setMixdownProgress(null), 1200);
    }
  };

  // Reset to new adaptation with IndexedDB purge
  const handleNewScript = () => {
    if (blueprint && !confirm('Start a new script adaptation? Your current project can be backed up via Export.')) {
      return;
    }
    stopTableRead();
    setMetrics(null);
    setBlueprint(null);
    setPages({});
    setCurrentPageNumber(1);
    setCurrentEpisodeIndex(1);
    setSourceText('');
    setSourceFileName('');
    setSourcePdfBase64(null);
    clearProject();
  };

  const totalPagesCount = blueprint?.pages?.length || currentSettings.targetPages;
  const currentPageData = pages[currentPageNumber];
  const currentPagePlan = blueprint?.pages?.find((p) => p.pageNumber === currentPageNumber);

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Studio Header */}
      <Header
        blueprint={blueprint}
        pages={pages}
        totalPages={totalPagesCount}
        isGenerating={isGeneratingPage || isGeneratingEpisode || isBatchGenerating || isCalculatingMetrics || isBuildingBlueprint}
        isPlayingAudio={isPlayingAudio}
        isMixingAudio={Boolean(mixdownProgress)}
        onOpenFullScript={() => setShowFullScript(true)}
        onOpenBlueprint={() => setShowBlueprint(true)}
        onOpenSfxChecklist={() => setShowSfxChecklist(true)}
        onNewScript={handleNewScript}
        onPrint={() => printBroadcastScript(blueprint, pages, totalPagesCount)}
        onExportText={() => {
          const txt = formatFullScriptText(blueprint, pages, totalPagesCount);
          downloadFile(
            txt,
            `${(blueprint?.title || 'radio-drama').toLowerCase().replace(/\s+/g, '-')}-script.txt`
          );
        }}
        onExportBbc={() => {
          const bbcTxt = formatBbcRadioPlay(blueprint, pages, totalPagesCount);
          downloadFile(
            bbcTxt,
            `${(blueprint?.title || 'radio-drama').toLowerCase().replace(/\s+/g, '-')}.bbc.txt`
          );
        }}
        onExportFountain={() => {
          const ftn = formatFountainScript(blueprint, pages, totalPagesCount);
          downloadFile(
            ftn,
            `${(blueprint?.title || 'radio-drama').toLowerCase().replace(/\s+/g, '-')}.fountain`
          );
        }}
        onExportMasterMix={handleExportMasterMix}
        onToggleTableRead={() => {
          if (isPlayingAudio) {
            stopTableRead();
          } else {
            setShowTableRead(true);
            startTableRead();
          }
        }}
      />

      {/* Master Audio Mixdown Progress Overlay */}
      {mixdownProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Disc3 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                Master Audio Mixdown
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                {mixdownProgress.statusText}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>Rendering Progress</span>
                <span className="text-amber-400 font-bold">{mixdownProgress.percent}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${mixdownProgress.percent}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              Applying DSP perspective filters, procedural Foley triggers, and 16-bit 44.1kHz stereo encoding.
            </p>
          </div>
        </div>
      )}

      {/* Non-Blocking Background Generation Status Floating Bar */}
      {(isGeneratingPage || isGeneratingEpisode || isBatchGenerating) && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>
                Writing {backgroundWritingPage ? `Page ${backgroundWritingPage}` : 'radio script pages'} in background...
                You can freely browse the Cast List, SFX Cue Sheet, or inspect completed pages.
              </span>
            </div>
            <button
              onClick={() => {
                setShowBlueprint(true);
              }}
              className="text-amber-400 underline font-medium hover:text-amber-200"
            >
              Browse Cast & Breakdown
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="bg-red-950/70 border-b border-red-800 px-4 py-2 text-xs text-red-200 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white underline font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Workspace */}
      <main className="flex-1 flex flex-col">
        {!metrics && !blueprint ? (
          /* Step 1: Source Upload & Length Calculation */
          <SourceUploader
            onCalculateMetrics={handleCalculateMetrics}
            isLoading={isCalculatingMetrics}
          />
        ) : metrics && !blueprint ? (
          /* Step 2: Page Calculation & Episode Breakdown Proposal */
          <AdaptationProposal
            metrics={metrics}
            settings={currentSettings}
            onApprove={handleApproveProposal}
            onBackToSource={() => setMetrics(null)}
            isBuildingBlueprint={isBuildingBlueprint}
          />
        ) : (
          /* Step 3: Studio & Episode-by-Episode Script Generator */
          <div className="flex-1 flex flex-col pb-28">
            {blueprint && (
              <PageNavigator
                blueprint={blueprint}
                pages={pages}
                currentPageNumber={currentPageNumber}
                currentEpisodeIndex={currentEpisodeIndex}
                totalPages={totalPagesCount}
                isGeneratingPage={isGeneratingPage}
                isGeneratingEpisode={isGeneratingEpisode}
                isBatchGenerating={isBatchGenerating}
                onSelectPage={(p) => setCurrentPageNumber(p)}
                onSelectEpisode={(epIdx) => {
                  setCurrentEpisodeIndex(epIdx);
                  const ep = blueprint.episodes?.find((e) => e.episodeIndex === epIdx);
                  if (ep) {
                    setCurrentPageNumber(ep.pageStart);
                  }
                }}
                onGenerateCurrentPage={() => generateSpecificPage(currentPageNumber)}
                onGenerateCurrentEpisode={handleGenerateCurrentEpisode}
                onGenerateBatch={handleBatchGenerate}
              />
            )}

            {blueprint && (
              <ScriptPageViewer
                page={currentPageData}
                pagePlan={currentPagePlan}
                blueprint={blueprint}
                pageNumber={currentPageNumber}
                totalPages={totalPagesCount}
                allPages={pages}
                isGenerating={isGeneratingPage}
                activeLineIndex={activeLineIndex}
                onGeneratePage={() => generateSpecificPage(currentPageNumber)}
                onGenerateSequentialUpTo={handleGenerateSequentialUpTo}
                onSelectPage={(p) => setCurrentPageNumber(p)}
                onUpdateScriptText={handleUpdateScriptText}
                onTweakPage={handleTweakCurrentPage}
                onPlaySingleLine={(line, idx) => {
                  setActiveLineIndex(idx);
                  if (line.type === 'sfx') {
                    foleySynth.triggerByCueText(line.text || line.line || '');
                  } else if (line.type === 'music') {
                    foleySynth.playDramaticStinger();
                  } else if (line.type === 'dialogue') {
                    playLineAudio(line, blueprint?.characters || []);
                  }
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Table Read Bar */}
      {showTableRead && currentPageData && (
        <TableReadBar
          isPlaying={isPlayingAudio}
          isPaused={isAudioPaused}
          currentLineIndex={activeLineIndex !== null ? activeLineIndex : 0}
          totalLines={currentPageData.lines?.length || 0}
          currentLine={activeLineIndex !== null && currentPageData.lines ? currentPageData.lines[activeLineIndex] : null}
          activeSpeaker={activeLineIndex !== null && currentPageData.lines ? currentPageData.lines[activeLineIndex]?.speaker || 'NARRATOR' : 'NARRATOR'}
          characters={blueprint?.characters || []}
          soundEffectsEnabled={soundEffectsEnabled}
          ttsEngine={ttsEngine}
          onPlay={startTableRead}
          onPause={pauseTableRead}
          onStop={stopTableRead}
          onNextLine={() => {
            if (activeLineIndex !== null && currentPageData.lines) {
              setActiveLineIndex(Math.min(currentPageData.lines.length - 1, activeLineIndex + 1));
            }
          }}
          onPrevLine={() => {
            if (activeLineIndex !== null) {
              setActiveLineIndex(Math.max(0, activeLineIndex - 1));
            }
          }}
          onToggleSoundEffects={() => setSoundEffectsEnabled((prev) => !prev)}
          onToggleTtsEngine={() => setTtsEngine((prev) => (prev === 'gemini' ? 'browser' : 'gemini'))}
        />
      )}

      {/* Modals & Drawers */}
      {showFullScript && (
        <FullScriptModal
          isOpen={showFullScript}
          onClose={() => setShowFullScript(false)}
          blueprint={blueprint}
          pages={pages}
          totalPages={totalPagesCount}
        />
      )}

      {showBlueprint && (
        <BlueprintDrawer
          isOpen={showBlueprint}
          onClose={() => setShowBlueprint(false)}
          blueprint={blueprint}
          currentPageNumber={currentPageNumber}
          onSelectPage={(p) => setCurrentPageNumber(p)}
        />
      )}

      {showSfxChecklist && (
        <SfxChecklistModal
          isOpen={showSfxChecklist}
          onClose={() => setShowSfxChecklist(false)}
          blueprint={blueprint}
          pages={pages}
          totalPages={totalPagesCount}
        />
      )}
    </div>
  );
}
