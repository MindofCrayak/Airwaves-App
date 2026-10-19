import React, { useState } from 'react';
import { X, Users, Volume2, Layers, Mic, Tv, Megaphone, VolumeX, RotateCw } from 'lucide-react';
import { RadioScriptBlueprint, CharacterProfile } from '../types';

interface BlueprintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: RadioScriptBlueprint | null;
  currentPageNumber: number;
  onSelectPage: (p: number) => void;
}

export const BlueprintDrawer: React.FC<BlueprintDrawerProps> = ({
  isOpen,
  onClose,
  blueprint,
  currentPageNumber,
  onSelectPage,
}) => {
  const [activeTab, setActiveTab] = useState<'cast' | 'episodes' | 'foley' | 'bumpers'>('cast');
  const [auditioningIndex, setAuditioningIndex] = useState<number | null>(null);

  if (!isOpen || !blueprint) return null;

  const handleAuditionVoice = async (char: CharacterProfile, idx: number) => {
    if (auditioningIndex !== null) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setAuditioningIndex(null);
      return;
    }

    setAuditioningIndex(idx);
    const sampleLine = `This is ${char.name}. ${char.description.split('.')[0]}. Level check for broadcast transmission.`;

    try {
      const res = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleLine,
          speaker: char.name,
          voiceName: char.suggestedVoice || 'Kore',
          stylePrompt: char.vocalProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audio.onended = () => setAuditioningIndex(null);
          audio.onerror = () => setAuditioningIndex(null);
          await audio.play();
          return;
        }
      }

      // Web Speech fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sampleLine);
        utterance.rate = char.suggestedVoice === 'Charon' ? 0.88 : char.suggestedVoice === 'Puck' ? 1.05 : 0.98;
        utterance.pitch = char.suggestedVoice === 'Fenrir' ? 0.8 : char.suggestedVoice === 'Kore' ? 1.1 : 1.0;
        utterance.onend = () => setAuditioningIndex(null);
        utterance.onerror = () => setAuditioningIndex(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setAuditioningIndex(null);
      }
    } catch (err) {
      console.warn('Audition error:', err);
      setAuditioningIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">
                Cast Roster & Production Rundown
              </h3>
              <span className="text-xs text-zinc-400">
                Studio specifications, vocal audition sandbox, and episode map
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-zinc-800 flex items-center gap-2 bg-zinc-950/60 overflow-x-auto">
          {(
            [
              { id: 'cast', label: 'Cast Roster & Auditions', icon: Users },
              { id: 'episodes', label: 'Episodes', icon: Tv },
              { id: 'foley', label: 'Foley Palette', icon: Volume2 },
              { id: 'bumpers', label: 'Bumpers & Ads', icon: Megaphone },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Synopsis Header */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider block mb-1">
              ADAPTATION LOGLINE
            </span>
            <h4 className="text-base font-bold text-zinc-100 mb-1">{blueprint.title}</h4>
            <p className="text-xs text-zinc-300 leading-relaxed mb-3">{blueprint.logline}</p>
            <div className="text-[11px] text-zinc-400 flex flex-col gap-1 border-t border-zinc-800/80 pt-2 font-mono">
              <span>Setting: {blueprint.settingEra}</span>
              {blueprint.audioAtmosphere && (
                <span>Acoustic Atmosphere: {blueprint.audioAtmosphere}</span>
              )}
            </div>
          </div>

          {/* Tab 1: Cast & Audition Sandbox */}
          {activeTab === 'cast' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Voice Acting Roles & Audition Sandbox ({blueprint.characters?.length || 0})
                </span>
                <span className="text-[11px] text-zinc-500">Preview vocal delivery</span>
              </div>
              <div className="space-y-2.5">
                {blueprint.characters?.map((char, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-amber-400 uppercase tracking-wide">
                        {char.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1">
                          <Mic className="w-2.5 h-2.5 text-amber-400" />
                          Voice: {char.suggestedVoice || 'Kore'}
                        </span>
                        {/* Voice Audition Sandbox Trigger */}
                        <button
                          type="button"
                          onClick={() => handleAuditionVoice(char, idx)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 transition-all ${
                            auditioningIndex === idx
                              ? 'bg-amber-500 text-zinc-950 font-bold animate-pulse'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30'
                          }`}
                          title={`Audition voice actor for ${char.name}`}
                        >
                          {auditioningIndex === idx ? (
                            <>
                              <RotateCw className="w-3 h-3 animate-spin" />
                              <span>Auditioning...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3 text-amber-400" />
                              <span>Audition</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 mb-2">{char.description}</p>
                    <div className="text-[11px] text-zinc-400 font-mono bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-amber-500/80 font-semibold">Vocal Profile & Mic Notes: </span>
                      {char.vocalProfile}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Episodes */}
          {activeTab === 'episodes' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                Broadcast Episode Breakdown ({blueprint.episodes?.length || 1})
              </span>
              <div className="space-y-3">
                {blueprint.episodes?.map((ep) => (
                  <div
                    key={ep.episodeIndex}
                    className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-400">
                        Episode {ep.episodeIndex}: {ep.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                        Pages {ep.pageStart}–{ep.pageEnd} (~{ep.targetRuntimeMinutes}m)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{ep.dramaticFocus}</p>
                    {ep.bumperPlacement && (
                      <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/60 flex items-center gap-2">
                        <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{ep.bumperPlacement}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Page beats */}
              <div className="pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block mb-2">
                  Page Beat Roadmap
                </span>
                <div className="space-y-2">
                  {blueprint.pages?.map((plan) => (
                    <div
                      key={plan.pageNumber}
                      onClick={() => {
                        onSelectPage(plan.pageNumber);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        plan.pageNumber === currentPageNumber
                          ? 'bg-amber-500/10 border-amber-500 text-zinc-100'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-amber-400">
                          Page {plan.pageNumber} • Ep.{plan.episodeIndex || 1} • {plan.act}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {plan.signatureSfx}
                        </span>
                      </div>
                      <div className="font-semibold text-zinc-200 mb-0.5">{plan.sceneHeading}</div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">{plan.beatSummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Foley Palette */}
          {activeTab === 'foley' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                Signature Sound Design Palette
              </span>
              <div className="flex flex-wrap gap-2">
                {blueprint.sfxPalette?.map((sfx, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 flex items-center gap-2"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{sfx}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Bumpers & Station ID */}
          {activeTab === 'bumpers' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                Broadcast Station Bumpers & Sponsor copy
              </span>

              {blueprint.stationIdText && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                    Station Identification
                  </span>
                  <p className="text-xs font-script text-zinc-200 leading-relaxed">
                    "{blueprint.stationIdText}"
                  </p>
                </div>
              )}

              {blueprint.commercialSponsorText && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                    Mid-Episode Commercial Sponsor Copy
                  </span>
                  <p className="text-xs font-script text-zinc-200 leading-relaxed">
                    "{blueprint.commercialSponsorText}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
