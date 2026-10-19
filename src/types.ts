export interface CharacterProfile {
  name: string;
  description: string;
  vocalProfile: string;
  suggestedVoice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  colorTag?: string;
}

export interface EpisodeRunningState {
  lastPageCliffhanger: string;
  unresolvedPlotTension: string;
  activePropInventory: string[];
  characterPhysicalStates: Record<string, string>; // e.g., { "HEARST": "wounded, breathing heavily" }
  ambientAcousticEnvironment: string;
}

export interface PagePlan {
  pageNumber: number;
  episodeIndex: number;
  act: string;
  sceneHeading: string;
  beatSummary: string;
  keyDialogueConflict: string;
  signatureSfx: string;
  musicCue?: string;
  hasBumperBreak?: boolean;
}

export interface ScriptEpisode {
  episodeIndex: number; // 1-based (e.g., Episode 1, Episode 2)
  title: string;
  subtitle?: string;
  targetRuntimeMinutes: number; // e.g. 15, 30, 45
  pageStart: number;
  pageEnd: number;
  pageCount: number;
  dramaticFocus: string;
  signatureSfxPreview?: string;
  bumperPlacement?: string; // e.g. "Mid-Episode Station ID & Vintage Sponsor Break on Page 5"
  status: 'pending' | 'generating' | 'completed' | 'approved';
}

export interface SfxChecklistItem {
  id: string;
  pageNumber: number;
  episodeIndex: number;
  type: 'sfx' | 'music';
  cueText: string;
  cleanDescription: string;
  category: 'foley_action' | 'ambience_weather' | 'mechanical_technology' | 'horror_creature' | 'music_stinger';
  freesoundSearchUrl: string;
  bbcSoundSearchUrl: string;
  freePdSearchUrl?: string;
  isAcquired: boolean;
  notes?: string;
}

export type BumperStyle =
  | 'vintage_1930s_sponsor'
  | 'bbc_chimes_station_id'
  | 'noir_station_break'
  | 'modern_podcast_sponsor'
  | 'none_dramatic_only';

export type ShowDurationPreset = 'auto' | '15min' | '30min' | '45min' | '60min';

export interface SourceMetrics {
  wordCount: number;
  characterCount: number;
  estimatedReadTimeMinutes: number;
  sourceType: string;
  detectedTitle?: string;
  detectedAuthor?: string;
  recommendedTotalPages: number;
  faithfulPages: number;
  condensedPages: number;
  recommendedEpisodes: ScriptEpisode[];
  estimatedAirtimeMinutes: number;
  calculationRationale: string;
  pacingNote: string;
  suggestedBumperStyle: BumperStyle;
}

export interface ScriptLine {
  id?: string;
  type: 'heading' | 'sfx' | 'music' | 'dialogue' | 'bumper' | 'direction' | 'note';
  speaker?: string;
  direction?: string;
  line?: string;
  text?: string;
}

export interface GeneratedPage {
  pageNumber: number;
  episodeIndex?: number;
  rawScript: string;
  lines: ScriptLine[];
  pageSummary: string;
  estimatedDurationSec: number;
  endingHook?: string;
  accumulatedState?: EpisodeRunningState;
  audioBlobKey?: string; // Cache key for rendered audio
  generatedAt?: number;
  isCustomEdited?: boolean;
}

export interface RadioScriptBlueprint {
  title: string;
  originalAuthor?: string;
  logline: string;
  settingEra: string;
  audioAtmosphere: string;
  characters: CharacterProfile[];
  sfxPalette: string[];
  episodes: ScriptEpisode[];
  pages: PagePlan[];
  totalPages: number;
  bumperStyle: BumperStyle;
  stationIdText?: string;
  commercialSponsorText?: string;
}

export type StylePreset =
  | 'classic_otr'
  | 'bbc_theatre'
  | 'modern_cinematic'
  | 'noir_detective'
  | 'gothic_horror'
  | 'sci_fi_pulp';

export type FoleyDensity = 'heavy' | 'balanced' | 'subtle';
export type NarratorPresence = 'prominent' | 'minimal' | 'none';

export interface AdaptationSettings {
  stylePreset: StylePreset;
  showDuration: ShowDurationPreset; // e.g. 'auto', '15min', '30min', '45min', '60min'
  targetPages: number;
  foleyDensity: FoleyDensity;
  narratorPresence: NarratorPresence;
  bumperStyle: BumperStyle;
  customBumperText: string;
  customNotes: string;
  pacingMode: 'recommended' | 'faithful' | 'condensed' | 'custom';
}

export interface AudioMixOptions {
  includeFoley: boolean;
  includeMusic: boolean;
  masterVolume: number;
  telephoneFilterWet: number;
  roomReverbWet: number;
}

export interface AudioExportProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
  statusText: string;
}

export interface ProjectState {
  id?: string;
  title?: string;
  sourceText?: string;
  sourceFileName?: string;
  sourcePdfBase64?: string | null;
  metrics: SourceMetrics | null;
  settings: AdaptationSettings;
  blueprint: RadioScriptBlueprint | null;
  pages: Record<number, GeneratedPage>;
  currentPageNumber: number;
  currentEpisodeIndex: number;
  lastUpdated?: number;
}
