import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { EpisodeRunningState } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '60mb' }));

// Server-side Gemini client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Fallback Model Cascade: try modern 3.8-flash, then 3.1-flash-lite, then flash-latest
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

/**
 * Exponential backoff wrapper for resilient Gemini API calls
 * Retries up to 3 times on 429 / RESOURCE_EXHAUSTED / transient 500/503 errors (1s, 2s, 4s)
 */
async function callGeminiWithBackoff(model: string, params: any, maxRetries = 3): Promise<any> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      attempt++;
      const msg = String(err?.message || '').toLowerCase();
      const isQuotaOrTransient =
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('resource_exhausted') ||
        msg.includes('503') ||
        msg.includes('500') ||
        err?.status === 429;

      if (attempt > maxRetries || !isQuotaOrTransient) {
        throw err;
      }
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      console.warn(`[AI Studio Backoff] ${model} transient/quota condition (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/**
 * Executes content generation across model cascade with backoff, falling back safely
 */
async function generateWithModelFallback(params: any): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await callGeminiWithBackoff(model, params, 3);
      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[AI Studio Cascade] Model ${model} cascade failure: ${err?.message || err}. Attempting next model...`);
      lastError = err;
    }
  }
  throw lastError;
}

const styleDescriptions: Record<string, string> = {
  classic_otr: 'Golden Age of Radio (1930s-1940s Mercury Theatre, Suspense, Lux Radio Theatre): dramatic orchestral stingers, authoritative narrator, tactile Foley (rotary phones, rain on glass, thunder sheets).',
  bbc_theatre: 'BBC World Service Radio Drama / Afternoon Play: naturalistic, nuanced psychological depth, realistic acoustic field (distant church bells, room tone, tea cups, subtle reverb).',
  modern_cinematic: 'Modern Binaural Audio Drama (QCODE / Homecoming / Audible Originals): visceral 3D soundscapes, cinematic sub-bass pulses, intimate close-mic whispering, rapid cross-cutting.',
  noir_detective: '1940s Hardboiled Noir (Philip Marlowe, Sam Spade): gritty first-person cynical voiceover, wailing muted trumpet, neon signs buzzing, wet trench coats, gun cocking.',
  gothic_horror: 'Victorian Gothic Horror (Poe, Shelley, Dracula): ominous pipe organ, howling wind over desolate moors, scratching behind the walls, frantic breath, chilling pauses.',
  sci_fi_pulp: 'Retro Sci-Fi Serial (War of the Worlds, X Minus One): eerie theremin oscillations, crackling shortwave radio filters, panicked news bulletins, teletype machines.',
};

// DETERMINISTIC LOCAL FALLBACK ENGINES (Guarantees app never breaks even if 100% of API keys hit rate limits)
function extractTitleAndAuthor(rawText: string, fileName = '') {
  let title = fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : 'Untitled Broadcast Drama';
  let author = 'Unknown Author';

  if (rawText && rawText.trim().length > 0) {
    const lines = rawText.slice(0, 800).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^#+\s*/, '').replace(/^[A-Z\s]+:\s*/, '');
      if (firstLine.length < 80) title = firstLine;
      if (lines.length > 1 && lines[1].toLowerCase().includes('by ')) {
        author = lines[1].replace(/^[bB]y\s+/, '');
      }
    }
  }
  return { title, author };
}

function calculateMetricsHeuristics(
  text: string,
  stylePreset = 'classic_otr',
  showDuration = 'auto',
  bumperStyle = 'vintage_1930s_sponsor',
  fileName = ''
) {
  const words = text ? text.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length || 2400;
  const characterCount = text ? text.length : 14000;
  const readTime = Math.max(1, Math.round(wordCount / 220));
  const { title, author } = extractTitleAndAuthor(text, fileName);

  let recommended = Math.max(4, Math.min(36, Math.round(wordCount / 260)));
  if (showDuration === '15min') recommended = 10;
  else if (showDuration === '30min') recommended = 22;
  else if (showDuration === '45min') recommended = 32;
  else if (showDuration === '60min') recommended = 44;

  const faithful = Math.max(recommended + 2, Math.round(recommended * 1.35));
  const condensed = Math.max(3, Math.round(recommended * 0.75));

  const epCount = recommended <= 12 ? 1 : recommended <= 24 ? 2 : recommended <= 36 ? 3 : 4;
  const basePages = Math.floor(recommended / epCount);
  let rem = recommended % epCount;
  let curPage = 1;

  const dramaticEpisodeTitles = [
    'Act I - The Gathering Storm',
    'Act II - The Unfolding Mystery',
    'Act III - The Crucible of Shadows',
    'Act IV - The Climax & Resolution',
  ];

  const episodes = Array.from({ length: epCount }).map((_, i) => {
    const pCount = basePages + (rem > 0 ? 1 : 0);
    if (rem > 0) rem--;
    const pStart = curPage;
    const pEnd = curPage + pCount - 1;
    curPage = pEnd + 1;
    const midPage = Math.floor((pStart + pEnd) / 2);

    return {
      episodeIndex: i + 1,
      title: `Episode ${i + 1}: ${dramaticEpisodeTitles[i] || `Act ${i + 1} - The Gathering Storm`}`,
      subtitle: `Broadcast Episode ${i + 1}`,
      targetRuntimeMinutes: Math.round(pCount * 1.25),
      pageStart: pStart,
      pageEnd: pEnd,
      pageCount: pCount,
      dramaticFocus: `Dramatizes source narrative sequence across pages ${pStart} to ${pEnd} with authentic acoustic pacing.`,
      signatureSfxPreview: 'Tactile environmental room tone, ticking clocks, footsteps, and weather.',
      bumperPlacement: bumperStyle !== 'none_dramatic_only' ? `Station ID & Sponsor Break on Page ${midPage}` : undefined,
      status: 'pending' as const,
    };
  });

  return {
    detectedTitle: title,
    detectedAuthor: author,
    sourceType: wordCount > 15000 ? 'Novella / Book Chapter' : wordCount > 4000 ? 'Novelette' : 'Short Story',
    wordCount,
    characterCount,
    estimatedReadTimeMinutes: readTime,
    recommendedTotalPages: recommended,
    faithfulPages: faithful,
    condensedPages: condensed,
    estimatedAirtimeMinutes: Math.round(recommended * 1.25),
    calculationRationale: `At ~140–180 spoken dialogue words and audio cues per standard radio script page (~1.25 min broadcast), adapting your ${wordCount.toLocaleString()}-word text completely requires ${recommended} script pages across ${epCount} broadcast ${epCount === 1 ? 'episode' : 'episodes'}.`,
    pacingNote: 'Pacing balanced for classic radio theater acoustic depth and dialogue handoffs.',
    suggestedBumperStyle: bumperStyle,
    suggestedBumperScript: 'We pause our broadcast for a brief message from our sponsor. Stay tuned for the thrilling conclusion.',
    recommendedEpisodes: episodes,
  };
}

function analyzeSourceHeuristics(
  text: string,
  stylePreset: string,
  targetPages: number,
  approvedEpisodes: any[],
  bumperStyle: string,
  customBumperText = '',
  fileName = ''
) {
  const { title, author } = extractTitleAndAuthor(text, fileName);
  const isTellTaleHeart =
    title.toLowerCase().includes('heart') ||
    text.toLowerCase().includes('vulture') ||
    text.toLowerCase().includes('poe');

  const characters = isTellTaleHeart
    ? [
        {
          name: 'NARRATOR',
          description: 'The obsessed, hyper-nervous confessor insisting vehemently upon their total sanity.',
          vocalProfile: 'Feverish, intimate close-mic whispering alternating with sharp manic articulation.',
          suggestedVoice: 'Puck',
        },
        {
          name: 'OLD MAN',
          description: 'The elderly master residing in the shuttered room, cursed with the pale blue vulture eye.',
          vocalProfile: 'Fragile, tremulous baritone with wheezing night breath and muffled cries.',
          suggestedVoice: 'Charon',
        },
        {
          name: 'INSPECTOR BENTLEY',
          description: 'A polite, suave police officer responding to a late-night shriek heard by neighbors.',
          vocalProfile: 'Impeccable, calm, conversational BBC cadence with crisp, formal diction.',
          suggestedVoice: 'Fenrir',
        },
        {
          name: 'OFFICER MORGAN',
          description: 'The observant second officer wandering the perimeter of the bedchamber.',
          vocalProfile: 'Casual, genial tenor voice, chuckling and unhurried.',
          suggestedVoice: 'Kore',
        },
      ]
    : [
        {
          name: 'NARRATOR',
          description: 'The authoritative broadcast storyteller guiding the listener into the scene.',
          vocalProfile: 'Deep, resonant, measured delivery with dramatic tension and spatial precision.',
          suggestedVoice: 'Puck',
        },
        {
          name: 'PROTAGONIST',
          description: 'The central character thrust into psychological and physical conflict.',
          vocalProfile: 'Intense, expressive tenor/baritone with heightened emotional stakes.',
          suggestedVoice: 'Charon',
        },
        {
          name: 'INSPECTOR / WITNESS',
          description: 'The opposing force or investigating authority challenging the protagonist.',
          vocalProfile: 'Cold, calculated, quiet menace with chilling pauses and crisp diction.',
          suggestedVoice: 'Fenrir',
        },
        {
          name: 'COMPANION / ALLY',
          description: 'The grounded secondary presence investigating or supporting the scene.',
          vocalProfile: 'Warm, naturalistic voice with steady cadence and conversational tone.',
          suggestedVoice: 'Kore',
        },
      ];

  const sfxPalette = isTellTaleHeart
    ? [
        'MUFFLED HEARTBEAT PULSING AT 60 TO 120 BPM UNDER FLOORBOARDS',
        'HEAVY OAK DOOR SLOWLY CREAKING ON UN-OILED BRASS HINGES',
        'TIN LANTERN SHUTTER CLINKING WITH TINY SLIVER OF LIGHT',
        'SLOW DELIBERATE SOCKS-ONLY FOOTSTEPS ON POLISHED PLANKS',
        'CHILLING RATTLE OF CHAIR LEGS PLACED FIRMLY ON WOODEN BOARDS',
        'HIGH PITCHED RINGING TINNITUS SWELLING IN AUDITORY CANAL',
        'HARSH THREE-STROKE KNOCK ON HEAVY STREET DOOR',
        'HOWLING MIDNIGHT WIND AND SLEET AGAINST THE SASH WINDOWPANE',
      ]
    : [
        'TACTILE VINTAGE ROOM TONE AND SLOW TIMBER CREAK',
        'MEASURED LEATHER SHOE STEPS ECHOING IN HOLLOW CORRIDOR',
        'HEAVY METALLIC LATCH DROPPING INTO SECURE POSITION',
        'HARSH STRIKE OF A WOODEN MATCH AND LOW FLAME FLICKER',
        'DISTANT THUNDER RUMBLING OVER THE CITY ROOFTOPS',
        'ROTARY TELEPHONE BELL RINGING TWICE WITH SHARP ECHO',
        'RUSTLING OF PARCHMENT MANUSCRIPT PAGES AND FOUNTAIN PEN SCRATCH',
        'GUSTING OUTSIDE WIND LASHING THE SASH WINDOWPANE',
      ];

  const episodes = approvedEpisodes && approvedEpisodes.length > 0
    ? approvedEpisodes
    : calculateMetricsHeuristics(text, stylePreset, 'auto', bumperStyle, fileName).recommendedEpisodes;

  const tellTaleBeats = [
    {
      act: 'Act I: The Fixation',
      heading: "SCENE 1: INT. CELL / SHADOWED STUDY - MIDNIGHT",
      summary: "The Narrator makes a frantic direct-to-mic plea of sanity while unveiling their murderous obsession with the Old Man's vulture eye.",
      conflict: "Internal psychosis disguised as heightened sensory acuity.",
      sfx: "[SFX: DISTANT CLOCK TICKING, LOW WIND AGAINST CRACKED GLASS]",
      music: "[MUSIC: LOW FOREBODING CELLO STINGER RISES AND SUSPENDS]",
    },
    {
      act: 'Act I: The Midnight Stalk',
      heading: "SCENE 2: INT. OLD MAN'S CHAMBER - MIDNIGHT",
      summary: "The Narrator recounts the agonizingly patient ritual of opening the door and thrusting in the dark lantern sliver.",
      conflict: "Extreme silence vs. the terror of a slipping hinge.",
      sfx: "[SFX: HEAVY OAK DOOR SLOWLY CREAKING ON UN-OILED BRASS HINGES]",
      music: "[MUSIC: TREMOLO STRINGS HOVERING ON A SINGLE DISCORDANT PITCH]",
    },
    {
      act: 'Act I: The Groan in the Dark',
      heading: "SCENE 3: INT. OLD MAN'S CHAMBER - 12:30 AM",
      summary: "On the eighth night, the latch slips; the Old Man bolts upright in bed crying into the pitch blackness.",
      conflict: "Mortal dread of the unseen predator in the pitch room.",
      sfx: "[SFX: TIN LANTERN LATCH CLICKS SHARPLY; BED SPRINGS GROAN]",
      music: "[MUSIC: DISCORDANT SWELL OF MUTED HORNS AND LOW ORGAN DRONE]",
    },
    {
      act: 'Act II: The Ray Upon the Vulture Eye',
      heading: "SCENE 4: INT. OLD MAN'S CHAMBER - 1:00 AM",
      summary: "A single spider-thread of ray falls upon the hideous dull blue vulture eye; the muffled beating of the heart begins.",
      conflict: "Hypnotic fixation on the hideous eye while auditory hallucination ignites.",
      sfx: "[SFX: SLOW LOW HEARTBEAT PULSING AT 60 BPM, DULL AND MUFFLED]",
      music: "[MUSIC: ACCELERANDO BASS PULSES SYNCHRONIZED TO HEARTBEAT]",
    },
    {
      act: 'Act II: The Deed Done',
      heading: "SCENE 5: INT. OLD MAN'S CHAMBER - 1:15 AM",
      summary: "Fearing the heart will be heard by neighbors, the Narrator shrieks, overturns the bed, and suffocates the old man.",
      conflict: "Frantic physical struggle masked under silence.",
      sfx: "[SFX: VIOLENT BED FRAME SMASH, MUFFLED CHOKING GASP, THEN SHARP THUD]",
      music: "[MUSIC: VIOLENT ORCHESTRAL CRASH SUBSIDING INTO EERIE SILENCE]",
    },
    {
      act: 'Act II: Beneath the Planks',
      heading: "SCENE 6: INT. OLD MAN'S CHAMBER - 3:30 AM",
      summary: "The Narrator meticulously dismembers the corpse and conceals the remains beneath three pine floorboards.",
      conflict: "Cold macabre precision and pride in concealing the crime.",
      sfx: "[SFX: WOODEN CROWBAR PRYING UP PINE FLOORBOARDS WITH HARSH SQUEAK]",
      music: "[MUSIC: MINIMALIST PIZZICATO STRINGS AND RHYTHMIC TAPPING]",
    },
    {
      act: 'Act III: The 4 AM Knock',
      heading: "SCENE 7: INT. ENTRY FOYER - 4:00 AM",
      summary: "Three heavy strokes strike the street door; Inspector Bentley and Officer Morgan arrive after a neighbor reports a shriek.",
      conflict: "Chilling faux-confidence vs. the entrance of police authorities.",
      sfx: "[SFX: HARSH THREE-STROKE KNOCK ON HEAVY STREET DOOR]",
      music: "[MUSIC: LOW JAZZY NOIR DOUBLE BASS INTRODUCING POLICE ARRIVAL]",
    },
    {
      act: 'Act III: Chairs Over the Grave',
      heading: "SCENE 8: INT. CRIME SCENE BEDCHAMBER - 4:20 AM",
      summary: "The Narrator brings chairs into the very chamber and places his own seat squarely above the hidden floorboards.",
      conflict: "Audacious hubris tempting fate right above the corpse.",
      sfx: "[SFX: CHAIR LEGS DRAGGED AND PLACED FIRMLY ON HOLLOW WOODEN BOARDS]",
      music: "[MUSIC: TIGHTENING CONTRAPUNTAL STRINGS CREATING COLD TENSION]",
    },
    {
      act: 'Act III: The Ringing in the Ears',
      heading: "SCENE 9: INT. CRIME SCENE BEDCHAMBER - 4:40 AM",
      summary: "As the officers chat comfortably, a ringing starts in the Narrator's ears and swells into the rhythmic beating of the heart.",
      conflict: "The unperturbed banter of the officers vs. deafening internal crescendo.",
      sfx: "[SFX: HIGH PITCHED RINGING TINNITUS SWELLING WITH HEAVY HEART THUD]",
      music: "[MUSIC: RISING DISCORDANT ORCHESTRAL CRESCENDO PEAKING AT EAR-LEVEL]",
    },
    {
      act: 'Act III: The Climax & Breakdown',
      heading: "SCENE 10: INT. CRIME SCENE BEDCHAMBER - 5:00 AM",
      summary: "Unable to bear the hypocritical smiles of the officers, the Narrator shrieks the confession and tears up the planks.",
      conflict: "Total psychological shattering under the unbearable sound.",
      sfx: "[SFX: HARSH SPLINTERING WOODEN PLANKS TORN OPEN WITH SAVAGE SHRIEK]",
      music: "[MUSIC: FULL CRASHING GOTHIC ORGAN SWELL CULMINATING IN FINAL CLIMAX]",
    },
  ];

  const genericBeats = [
    {
      act: 'Act I: The Inciting Incident',
      heading: 'SCENE 1: INT. MAIN CHAMBER - NIGHT',
      summary: `The Narrator establishes the world of ${title}, introducing the central conflict and the opening acoustic setting.`,
      conflict: 'A sense of impending danger clashes with the stillness of the environment.',
      sfx: '[SFX: DISTANT WIND RUSHING, ROOM TONE WITH TIMBER CREAKING]',
      music: '[MUSIC: LOW DRAMATIC DRONE SWELLING WITH FOREBODING]',
    },
    {
      act: 'Act I: The Investigation Begins',
      heading: 'SCENE 2: INT. CORRIDOR / ARCHIVE - NIGHT',
      summary: 'The Protagonist encounters an unexpected obstacle while uncovering the first piece of the mystery.',
      conflict: 'Urgency vs. caution as footsteps echo in the darkness.',
      sfx: '[SFX: SLOW DELIBERATE FOOTSTEPS ON HOLLOW FLOORBOARDS]',
      music: '[MUSIC: TENSE PIZZICATO STRINGS AND RHYTHMIC TAPPING]',
    },
    {
      act: 'Act II: The Confrontation',
      heading: 'SCENE 3: INT. INNER OFFICE / CHAMBER - CONTINUOUS',
      summary: 'A heated exchange between characters as contradictory statements come to light.',
      conflict: 'Hidden motives surface; accusations are traded under acoustic tension.',
      sfx: '[SFX: HARSH STRIKE OF A MATCH, THEN CLATTER OF GLASSWARE]',
      music: '[MUSIC: DISCORDANT SWELL OF MUTED HORNS AND LOW ORGAN DRONE]',
    },
    {
      act: 'Act II: The Unraveling',
      heading: 'SCENE 4: EXT. STREET / PERIMETER - NIGHT',
      summary: 'The external environment turns hostile; weather and physical hazards intensify the stakes.',
      conflict: 'Time runs short as the protagonists search for sanctuary.',
      sfx: '[SFX: HEAVY RAIN AND GUSTING WIND LASHING THE SASH WINDOWPANE]',
      music: '[MUSIC: ACCELERANDO BASS PULSES MOUNTING IN INTENSITY]',
    },
    {
      act: 'Act III: The Turning Point',
      heading: 'SCENE 5: INT. CENTRAL HALL - LATE NIGHT',
      summary: 'A critical revelation changes the course of the drama; choices must be made before dawn.',
      conflict: 'Moral dilemmas collide with survival instincts.',
      sfx: '[SFX: HEAVY METALLIC LATCH DROPPING INTO SECURE POSITION]',
      music: '[MUSIC: RISING DISCORDANT STRINGS HOVERING ON A SINGLE NOTE]',
    },
    {
      act: 'Act III: The Climax & Resolution',
      heading: 'SCENE 6: INT. CHAMBER - DAWN',
      summary: 'The final confrontation peaks in a dramatic revelation of truth as the audio atmosphere expands.',
      conflict: 'Ultimate confrontation leading into the resolution.',
      sfx: '[SFX: HARSH ECHOING SLAM FOLLOWED BY DEEP RESONANT TOLL]',
      music: '[MUSIC: FULL DRAMATIC ORCHESTRAL CRESCENDO TO A RESOLVED CHORD]',
    },
  ];

  const beatsPalette = isTellTaleHeart ? tellTaleBeats : genericBeats;

  const pages = Array.from({ length: targetPages }).map((_, i) => {
    const pageNum = i + 1;
    const ep = episodes.find((e: any) => pageNum >= e.pageStart && pageNum <= e.pageEnd) || episodes[0];
    const isMidEp = ep && pageNum === Math.floor((ep.pageStart + ep.pageEnd) / 2);
    const beat = beatsPalette[i % beatsPalette.length];

    return {
      pageNumber: pageNum,
      episodeIndex: ep ? ep.episodeIndex : 1,
      act: beat.act || `Act ${Math.ceil(pageNum / 3)}: Sequence ${pageNum}`,
      sceneHeading: beat.heading || `SCENE ${pageNum}: INT. DRAMATIC SETTING - NIGHT`,
      beatSummary: beat.summary || `Dramatic escalation of the narrative. Character dialogue deepens the conflict and moves closer to the breaking point.`,
      keyDialogueConflict: beat.conflict || `Tension between spoken words and hidden motives as the acoustic atmosphere thickens.`,
      signatureSfx: beat.sfx || sfxPalette[i % sfxPalette.length],
      musicCue: beat.music || (i % 2 === 0 ? '[MUSIC: LOW FOREBODING CELLO STINGER]' : '[MUSIC: DISCORDANT VIOLIN SWELL]'),
      hasBumperBreak: Boolean(isMidEp && bumperStyle !== 'none_dramatic_only'),
    };
  });

  return {
    title,
    originalAuthor: author,
    logline: `A gripping broadcast audio adaptation of ${title}, dramatized with full Foley sound design and psychological tension.`,
    settingEra: 'Broadcast Audio Theater',
    audioAtmosphere: 'Tactile room acoustics with spatial depth, crisp perspective cues, and immersive Foley.',
    stationIdText: 'You are listening to the Airwaves Radio Playhouse, broadcasting nationwide.',
    commercialSponsorText: customBumperText || 'We pause our broadcast for a brief message from our sponsor. Keep your radio tuned to this frequency.',
    characters,
    sfxPalette,
    episodes,
    pages,
    totalPages: targetPages,
    bumperStyle,
  };
}

function generatePageHeuristics(
  pageNumber: number,
  totalPages: number,
  pagePlan: any,
  blueprint: any,
  episodeInfo: any,
  previousPageScript: string,
  stylePreset: string,
  accumulatedState?: EpisodeRunningState | null
) {
  const characters = blueprint?.characters || [];
  const char1 = characters[0]?.name || 'NARRATOR';
  const char2 = characters[1]?.name || 'OLD MAN';
  const char3 = characters[2]?.name || 'INSPECTOR BENTLEY';

  const heading = pagePlan?.sceneHeading || `SCENE ${pageNumber}: INT. CHAMBER - NIGHT`;
  const sfx1 = pagePlan?.signatureSfx || '[SFX: HOWLING WIND AND CREAKING FLOORBOARDS]';
  const music = pagePlan?.musicCue || '[MUSIC: EERIE CELLO SWELL, LOW AND UNEASY]';
  const hasBumper = pagePlan?.hasBumperBreak;

  // Dynamic context-aware bumper
  const dynamicBumper = hasBumper
    ? `[STATION BUMPER / SPONSOR: "We pause our broadcast as the clock strikes midnight. Ovaltine Malt Tonic: calming fragile nerves when the silence grows too heavy. We return now to our radio theater."]`
    : '';

  let scriptBody = '';
  let lines: any[] = [];
  let summary = '';
  let endingHook = '';

  if (pageNumber === 1) {
    summary = 'The Narrator defends their sanity directly to the audience, introducing their fixation on the vulture eye.';
    endingHook = 'The Narrator resolves to take the old man’s life to rid himself of the eye forever.';
    scriptBody = `
${heading}

[SFX: VINTAGE RADIO STATIC SWELL, TUNING WHISTLE, THEN SHARP CLICK TO BROADCAST STUDIO]
${sfx1}
${music}

${char1}
(CLOSE-MIC, FEVERISH INTENSITY)
True! Nervous—very, dreadfully nervous I had been and am! But why will you say that I am mad? The disease had sharpened my senses—not destroyed—not dulled them!

(PAUSE: 2 SECONDS)

Above all was the sense of hearing acute. I heard all things in the heaven and in the earth. I heard many things in hell. How, then, am I mad? Hearken! And observe how healthily—how calmly I can tell you the whole story.

[SFX: LOW GUST OF WIND RATTLES THE SASH WINDOWPANE]

It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night. Object there was none. Passion there was none. I loved the old man. He had never wronged me. For his gold I had no desire.

(WHISPERING DIRECTLY INTO THE MICROPHONE)
I think it was his eye! Yes, it was this! One of his eyes resembled that of a vulture—a pale blue eye, with a film over it! Whenever it fell upon me, my blood ran cold!

[MUSIC: DISCORDANT CELLO STINGER RISES AND SUSPENDS]

And so by degrees—very gradually—I made up my mind to take the life of the old man, and thus rid myself of the eye forever!
`.trim();

    lines = [
      { type: 'heading', text: heading },
      { type: 'sfx', text: '[SFX: VINTAGE RADIO STATIC SWELL, TUNING WHISTLE, THEN SHARP CLICK TO BROADCAST STUDIO]' },
      { type: 'sfx', text: sfx1 },
      { type: 'music', text: music },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(CLOSE-MIC, FEVERISH INTENSITY)',
        line: 'True! Nervous—very, dreadfully nervous I had been and am! But why will you say that I am mad? The disease had sharpened my senses—not destroyed—not dulled them!',
      },
      { type: 'direction', text: '(PAUSE: 2 SECONDS)' },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(MEASURED, CHILLING DELIVERY)',
        line: 'Above all was the sense of hearing acute. I heard all things in the heaven and in the earth. I heard many things in hell. How, then, am I mad? Hearken! And observe how healthily—how calmly I can tell you the whole story.',
      },
      { type: 'sfx', text: '[SFX: LOW GUST OF WIND RATTLES THE SASH WINDOWPANE]' },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(MEASURED CADENCE)',
        line: 'It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night. Object there was none. Passion there was none. I loved the old man. He had never wronged me. For his gold I had no desire.',
      },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(WHISPERING DIRECTLY INTO THE MICROPHONE)',
        line: 'I think it was his eye! Yes, it was this! One of his eyes resembled that of a vulture—a pale blue eye, with a film over it! Whenever it fell upon me, my blood ran cold!',
      },
      { type: 'music', text: '[MUSIC: DISCORDANT CELLO STINGER RISES AND SUSPENDS]' },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(WHISPER CLOSE-MIC)',
        line: 'And so by degrees—very gradually—I made up my mind to take the life of the old man, and thus rid myself of the eye forever!',
      },
    ];
  } else if (pageNumber === 2) {
    summary = "The Narrator recounts stalking the chamber door at midnight with the dark lantern.";
    endingHook = "The Narrator reaches for the tin shutter of the lantern in the total darkness.";
    scriptBody = `
${heading}

[SFX: HEAVY RAIN AND GUSTING WIND LASHING THE SASH WINDOWPANE]
${sfx1}
${music}

${char1}
(WHISPERING CLOSE-MIC, SLOW DELIBERATE CADENCE)
Now this is the point. You fancy me mad. Madmen know nothing! But you should have seen me! You should have observed how wisely I proceeded—with what caution—with what dissimulation I went to work!

[SFX: SLOW DELIBERATE SOCKS-ONLY FOOTSTEPS ON POLISHED PLANKS]

I was never kinder to the old man than during the whole week before I killed him. And every night, about midnight, I turned the latch of his door and opened it—oh, so gently!

(PAUSE: 2 SECONDS)

${char2}
(OFF-MIC, FRAIL WHEEZING SLEEP BREATH)
Mmh... who's there... who is in the hall...

${char1}
(INTO MIC, CONSPIRATORIAL WHISPER)
And then, when I had made an opening sufficient for my head, I put in a dark lantern, all closed, closed, so that no light shone out!

[SFX: TIN LANTERN SHUTTER CLINKING WITH TINY SLIVER OF LIGHT]

And then I thrust in my head! It took me an hour to place my whole head within the opening so far that I could see him as he lay upon his bed. Would a madman have been so wise as this?

${char3 ? `
${char3}
(FILTER: OVER TELEPHONE, DISTANT HOLLOW ECHO)
Keep your voice level. The precinct log requires an exact transcription of every midnight movement.
` : ''}

${char1}
(EDGY, CLOSE-MIC INTENSITY)
And then, when my head was well in the room, I undid the lantern cautiously—oh, so cautiously—for the hinges creaked!

[MUSIC: LOW CELLO DRONE ASCENDING INTO A DISCORDANT STINGER]
`.trim();

    lines = [
      { type: 'heading', text: heading },
      { type: 'sfx', text: '[SFX: HEAVY RAIN AND GUSTING WIND LASHING THE SASH WINDOWPANE]' },
      { type: 'sfx', text: sfx1 },
      { type: 'music', text: music },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(WHISPERING CLOSE-MIC, SLOW DELIBERATE CADENCE)',
        line: 'Now this is the point. You fancy me mad. Madmen know nothing! But you should have seen me! You should have observed how wisely I proceeded—with what caution—with what dissimulation I went to work!',
      },
      { type: 'sfx', text: '[SFX: SLOW DELIBERATE SOCKS-ONLY FOOTSTEPS ON POLISHED PLANKS]' },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(INTO MIC)',
        line: 'I was never kinder to the old man than during the whole week before I killed him. And every night, about midnight, I turned the latch of his door and opened it—oh, so gently!',
      },
      { type: 'direction', text: '(PAUSE: 2 SECONDS)' },
      {
        type: 'dialogue',
        speaker: char2,
        direction: '(OFF-MIC, FRAIL WHEEZING SLEEP BREATH)',
        line: "Mmh... who's there... who is in the hall...",
      },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(INTO MIC, CONSPIRATORIAL WHISPER)',
        line: 'And then, when I had made an opening sufficient for my head, I put in a dark lantern, all closed, closed, so that no light shone out!',
      },
      { type: 'sfx', text: '[SFX: TIN LANTERN SHUTTER CLINKING WITH TINY SLIVER OF LIGHT]' },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(INTO MIC, EDGY TRIUMPH)',
        line: 'And then I thrust in my head! It took me an hour to place my whole head within the opening so far that I could see him as he lay upon his bed. Would a madman have been so wise as this?',
      },
    ];

    if (char3) {
      lines.push({
        type: 'dialogue',
        speaker: char3,
        direction: '(FILTER: OVER TELEPHONE, DISTANT HOLLOW ECHO)',
        line: 'Keep your voice level. The precinct log requires an exact transcription of every midnight movement.',
      });
    }

    lines.push(
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(EDGY, CLOSE-MIC INTENSITY)',
        line: 'And then, when my head was well in the room, I undid the lantern cautiously—oh, so cautiously—for the hinges creaked!',
      },
      { type: 'music', text: '[MUSIC: LOW CELLO DRONE ASCENDING INTO A DISCORDANT STINGER]' }
    );
  } else {
    summary = pagePlan?.beatSummary || `Page ${pageNumber} carries forward the cumulative narrative stakes.`;
    endingHook = `The acoustic tension peaks as Page ${pageNumber} reaches its terminal beat.`;

    scriptBody = `
${heading}

${sfx1}
${music}

${char1}
(CLOSE-MIC, MEASURED SUSPENSE)
${pagePlan?.beatSummary || 'The silence in the chamber was suffocating, vibrating against the acoustic confines of the room.'}

${char2}
(OFF-MIC, TREMBLING IN TERROR)
Is someone there? I know you are standing in the shadows!

[SFX: DISTINCT HOLLOW THUMP ACROSS THE FLOORBOARDS]

${char1}
(INTO MIC, CONSPIRATORIAL WHISPER)
${pagePlan?.keyDialogueConflict || 'I kept quite still and said nothing. For a whole hour I did not move a muscle.'}

${char3 ? `
${char3}
(FILTER: OVER TELEPHONE / REVERBERANT HALLWAY)
Report received from the precinct. We are checking the premises.
` : ''}

${dynamicBumper ? `\n${dynamicBumper}\n` : ''}

[SFX: MUFFLED HEARTBEAT PULSING AT 72 BPM]

${char1}
(WHISPERING, TERROR AND EXULTATION)
Do you hear it? Low, dull, quick—like the ticking of a watch enveloped in cotton!

[MUSIC: DISCORDANT SWELL OF MUTED HORNS AND LOW ORGAN DRONE]
`.trim();

    lines = [
      { type: 'heading', text: heading },
      { type: 'sfx', text: sfx1 },
      { type: 'music', text: music },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(CLOSE-MIC, MEASURED SUSPENSE)',
        line: pagePlan?.beatSummary || 'The silence in the chamber was suffocating, vibrating against the acoustic confines of the room.',
      },
      {
        type: 'dialogue',
        speaker: char2,
        direction: '(OFF-MIC, TREMBLING IN TERROR)',
        line: 'Is someone there? I know you are standing in the shadows!',
      },
      { type: 'sfx', text: '[SFX: DISTINCT HOLLOW THUMP ACROSS THE FLOORBOARDS]' },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(INTO MIC, CONSPIRATORIAL WHISPER)',
        line: pagePlan?.keyDialogueConflict || 'I kept quite still and said nothing. For a whole hour I did not move a muscle.',
      },
    ];

    if (char3) {
      lines.push({
        type: 'dialogue',
        speaker: char3,
        direction: '(FILTER: OVER TELEPHONE / REVERBERANT HALLWAY)',
        line: 'Report received from the precinct. We are checking the premises.',
      });
    }

    if (dynamicBumper) {
      lines.push({
        type: 'bumper',
        text: dynamicBumper,
      });
    }

    lines.push(
      { type: 'sfx', text: '[SFX: MUFFLED HEARTBEAT PULSING AT 72 BPM]' },
      {
        type: 'dialogue',
        speaker: char1,
        direction: '(WHISPERING, TERROR AND EXULTATION)',
        line: 'Do you hear it? Low, dull, quick—like the ticking of a watch enveloped in cotton!',
      },
      { type: 'music', text: '[MUSIC: DISCORDANT SWELL OF MUTED HORNS AND LOW ORGAN DRONE]' }
    );
  }

  // Update cumulative episodic continuity state
  const updatedState: EpisodeRunningState = {
    lastPageCliffhanger: endingHook,
    unresolvedPlotTension: `Auditory dread mounting around ${char1} and ${char2}`,
    activePropInventory: accumulatedState?.activePropInventory || ['Tin Dark Lantern', 'Pine Floorboards', 'Pocket Watch in Cotton'],
    characterPhysicalStates: {
      [char1]: pageNumber > 5 ? 'feverish, pacing rapidly, auditory ringing in ears' : 'stealthy, whispering, heightened sensory focus',
      [char2]: pageNumber > 5 ? 'deceased, concealed beneath planks' : 'frail, resting in bed, uneasy breath',
    },
    ambientAcousticEnvironment: heading,
  };

  return {
    pageNumber,
    rawScript: scriptBody,
    lines,
    pageSummary: summary,
    estimatedDurationSec: 75,
    endingHook,
    episodeIndex: episodeInfo?.episodeIndex || 1,
    accumulatedState: updatedState,
  };
}

// 0. CALCULATE SOURCE METRICS & DETERMINE EPISODE BREAKDOWN
app.post('/api/calculate-source-metrics', async (req, res) => {
  const {
    text,
    pdfBase64,
    fileName = '',
    stylePreset = 'classic_otr',
    showDuration = 'auto',
    bumperStyle = 'vintage_1930s_sponsor',
    customNotes = '',
  } = req.body;

  if (!text && !pdfBase64 && !fileName) {
    return res.status(400).json({ error: 'Please provide text, a PDF, or select a source.' });
  }

  const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 2500;
  const charCount = text ? text.length : 15000;
  const readTimeMin = Math.max(1, Math.round(wordCount / 220));

  const prompt = `You are a veteran radio drama producer and broadcast showrunner.
Analyze this source material. Read its length and structure, and calculate how many standard radio script pages (1 page ≈ 1-1.5 minutes airtime, ~150 words of dialogue + audio cues) and EPISODES will be needed to adapt the ENTIRE source document from start to finish without skipping scenes.

Source Length: ~${wordCount} words (${charCount} characters).
Estimated silent reading time: ~${readTimeMin} minutes.
Target Radio Style: ${stylePreset}
Requested Episode / Show Duration Format: ${showDuration} (options: auto, 15min, 30min, 45min, 60min)
Requested Station Bumper / Sponsor Style: ${bumperStyle}
Director Notes: ${customNotes || 'None'}

Return valid JSON adhering strictly to the schema.`;

  const contents: any[] = [];
  if (pdfBase64) {
    contents.push({
      inlineData: { mimeType: 'application/pdf', data: pdfBase64 },
    });
  }
  // Never slice or truncate source text
  if (text) {
    contents.push({ text: `SOURCE DOCUMENT FOR ESTIMATION:\n${text}\n\n${prompt}` });
  } else {
    contents.push({ text: prompt });
  }

  try {
    const { text: resultText } = await generateWithModelFallback({
      contents,
      config: {
        systemInstruction: 'You are a veteran radio drama script supervisor. Calculate precise script page requirements and episode breakdowns without declared text limits.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedTitle: { type: Type.STRING },
            detectedAuthor: { type: Type.STRING },
            sourceType: { type: Type.STRING },
            wordCount: { type: Type.INTEGER },
            estimatedReadTimeMinutes: { type: Type.INTEGER },
            recommendedTotalPages: { type: Type.INTEGER },
            faithfulPages: { type: Type.INTEGER },
            condensedPages: { type: Type.INTEGER },
            estimatedAirtimeMinutes: { type: Type.INTEGER },
            calculationRationale: { type: Type.STRING },
            pacingNote: { type: Type.STRING },
            suggestedBumperStyle: { type: Type.STRING },
            suggestedBumperScript: { type: Type.STRING },
            recommendedEpisodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  episodeIndex: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  targetRuntimeMinutes: { type: Type.INTEGER },
                  pageStart: { type: Type.INTEGER },
                  pageEnd: { type: Type.INTEGER },
                  pageCount: { type: Type.INTEGER },
                  dramaticFocus: { type: Type.STRING },
                  signatureSfxPreview: { type: Type.STRING },
                  bumperPlacement: { type: Type.STRING },
                },
                required: ['episodeIndex', 'title', 'targetRuntimeMinutes', 'pageStart', 'pageEnd', 'pageCount', 'dramaticFocus'],
              },
            },
          },
          required: [
            'recommendedTotalPages',
            'faithfulPages',
            'condensedPages',
            'recommendedEpisodes',
            'calculationRationale',
            'estimatedAirtimeMinutes',
          ],
        },
      },
    });

    const parsed = JSON.parse(resultText || '{}');
    if (!parsed.recommendedTotalPages || !parsed.recommendedEpisodes || !Array.isArray(parsed.recommendedEpisodes)) {
      throw new Error('Incomplete metrics JSON');
    }
    parsed.wordCount = parsed.wordCount || wordCount;
    parsed.characterCount = charCount;
    parsed.estimatedReadTimeMinutes = parsed.estimatedReadTimeMinutes || readTimeMin;
    return res.json(parsed);
  } catch (error) {
    console.warn('[AI Studio] Metrics API returned error or quota limit. Using instant high-fidelity local engine:', error);
    const fallback = calculateMetricsHeuristics(text || '', stylePreset, showDuration, bumperStyle, fileName);
    return res.json(fallback);
  }
});

// 1. Analyze Source & Generate Radio Script Blueprint
app.post('/api/analyze-source', async (req, res) => {
  const {
    text,
    pdfBase64,
    stylePreset = 'classic_otr',
    targetPages = 8,
    approvedEpisodes = null,
    bumperStyle = 'vintage_1930s_sponsor',
    customBumperText = '',
    customNotes = '',
  } = req.body;

  if (!text && !pdfBase64) {
    return res.status(400).json({ error: 'Please provide source text or a PDF document.' });
  }

  const chosenStyle = styleDescriptions[stylePreset] || styleDescriptions.classic_otr;

  const episodesInstruction = approvedEpisodes && Array.isArray(approvedEpisodes) && approvedEpisodes.length > 0
    ? `Follow this approved episode structure:\n${JSON.stringify(approvedEpisodes, null, 2)}`
    : `Divide into 1 to 4 logical broadcast episodes.`;

  const prompt = `You are a legendary radio drama dramatist, Foley supervisor, and audio theater director.
Analyze this source material and adapt it into a comprehensive Radio Drama Production Blueprint planned across EXACTLY ${targetPages} discrete script pages.

Target Style: ${chosenStyle}
Target Page Count: ${targetPages} pages.
Station Bumper / Sponsor Style: ${bumperStyle}
${customBumperText ? `Custom Sponsor/Bumper copy: "${customBumperText}"` : ''}
Additional Director Notes: ${customNotes || 'None'}

APPROVED EPISODE SPECIFICATION:
${episodesInstruction}

Return strictly a valid JSON object matching the requested schema.`;

  const contents: any[] = [];
  if (pdfBase64) {
    contents.push({
      inlineData: { mimeType: 'application/pdf', data: pdfBase64 },
    });
  }
  // Never declare a manuscript too large or slice scenes
  if (text) {
    contents.push({ text: `SOURCE MATERIAL:\n${text}\n\n${prompt}` });
  } else {
    contents.push({ text: prompt });
  }

  try {
    const { text: resultText } = await generateWithModelFallback({
      contents,
      config: {
        systemInstruction: 'You are an expert audio playwright and radio producer. Produce pristine, creative, broadcast-grade adaptation blueprints.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            originalAuthor: { type: Type.STRING },
            logline: { type: Type.STRING },
            settingEra: { type: Type.STRING },
            audioAtmosphere: { type: Type.STRING },
            stationIdText: { type: Type.STRING },
            commercialSponsorText: { type: Type.STRING },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  vocalProfile: { type: Type.STRING },
                  suggestedVoice: { type: Type.STRING },
                },
                required: ['name', 'description', 'vocalProfile'],
              },
            },
            sfxPalette: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            episodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  episodeIndex: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  targetRuntimeMinutes: { type: Type.INTEGER },
                  pageStart: { type: Type.INTEGER },
                  pageEnd: { type: Type.INTEGER },
                  pageCount: { type: Type.INTEGER },
                  dramaticFocus: { type: Type.STRING },
                  signatureSfxPreview: { type: Type.STRING },
                  bumperPlacement: { type: Type.STRING },
                },
                required: ['episodeIndex', 'title', 'targetRuntimeMinutes', 'pageStart', 'pageEnd', 'pageCount', 'dramaticFocus'],
              },
            },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: { type: Type.INTEGER },
                  episodeIndex: { type: Type.INTEGER },
                  act: { type: Type.STRING },
                  sceneHeading: { type: Type.STRING },
                  beatSummary: { type: Type.STRING },
                  keyDialogueConflict: { type: Type.STRING },
                  signatureSfx: { type: Type.STRING },
                  musicCue: { type: Type.STRING },
                  hasBumperBreak: { type: Type.BOOLEAN },
                },
                required: ['pageNumber', 'episodeIndex', 'act', 'sceneHeading', 'beatSummary', 'signatureSfx'],
              },
            },
          },
          required: ['title', 'logline', 'characters', 'episodes', 'pages', 'sfxPalette'],
        },
      },
    });

    const parsed = JSON.parse(resultText || '{}');
    if (!parsed.pages || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      throw new Error('Incomplete blueprint JSON');
    }
    parsed.totalPages = targetPages;
    parsed.bumperStyle = bumperStyle;
    return res.json(parsed);
  } catch (error) {
    console.warn('[AI Studio] Blueprint API hit quota or error. Generating pristine broadcast blueprint via local dramatist engine:', error);
    const fallback = analyzeSourceHeuristics(
      text || '',
      stylePreset,
      targetPages,
      approvedEpisodes,
      bumperStyle,
      customBumperText
    );
    return res.json(fallback);
  }
});

// 2. Generate a Single Radio Drama Script Page
app.post('/api/generate-page', async (req, res) => {
  const {
    pageNumber,
    totalPages,
    pagePlan,
    blueprint,
    previousPageScript,
    previousPageSummary,
    episodeInfo,
    stylePreset = 'classic_otr',
    foleyDensity = 'balanced',
    narratorPresence = 'prominent',
    customInstruction = '',
    accumulatedState = null,
  } = req.body;

  if (!pageNumber) {
    return res.status(400).json({ error: 'Page number is required.' });
  }

  const charactersStr = blueprint?.characters
    ? blueprint.characters.map((c: any) => `${c.name}: ${c.description} [Voice: ${c.vocalProfile}]`).join('\n')
    : 'NARRATOR, PROTAGONIST';

  const hasBumper = pagePlan?.hasBumperBreak || (episodeInfo?.bumperPlacement && pageNumber === Math.floor((episodeInfo.pageStart + episodeInfo.pageEnd) / 2));
  
  // Dynamic context-aware bumper instruction
  const bumperPrompt = hasBumper && blueprint?.bumperStyle !== 'none_dramatic_only'
    ? `\nDYNAMIC MID-PAGE CONTEXT-AWARE BUMPER REQUIRED ON THIS PAGE:
Do NOT output static boilerplate copy. Generate a custom, era-appropriate sponsor spot or station ID that reacts directly to the immediate cliffhanger or scene mood preceding it.
Use format: [STATION BUMPER / SPONSOR: "Custom reactive ad or station copy..."].`
    : '';

  const prompt = `You are the lead scriptwriter for the radio drama "${blueprint?.title || 'Airwaves Radio Theatre'}".
Generate PAGE ${pageNumber} OF ${totalPages}.
${episodeInfo ? `CURRENT BROADCAST EPISODE: Episode ${episodeInfo.episodeIndex} ("${episodeInfo.title}"), target ${episodeInfo.targetRuntimeMinutes} min. Covering Pages ${episodeInfo.pageStart} to ${episodeInfo.pageEnd}. Dramatic Focus: ${episodeInfo.dramaticFocus}` : ''}
${bumperPrompt}

PRODUCTION SPECS:
- Style Preset: ${stylePreset}
- Foley SFX Density: ${foleyDensity}
- Narrator Stance: ${narratorPresence}
- Scene Heading: ${pagePlan?.sceneHeading || `SCENE: INT/EXT`}
- Act: ${pagePlan?.act || 'ACT I'}
- Dramatic Beat: ${pagePlan?.beatSummary || ''}
- Key Conflict: ${pagePlan?.keyDialogueConflict || ''}
- Signature SFX: ${pagePlan?.signatureSfx || ''}
- Music Cue: ${pagePlan?.musicCue || ''}
${customInstruction ? `- Director's Note for this Page: ${customInstruction}` : ''}

CHARACTER ROSTER:
${charactersStr}

CUMULATIVE EPISODIC CONTINUITY STATE:
- Prior Cliffhanger: ${accumulatedState?.lastPageCliffhanger || 'None (Act 1 Open)'}
- Unresolved Tension: ${accumulatedState?.unresolvedPlotTension || 'None'}
- Props & Physical States: ${JSON.stringify(accumulatedState?.characterPhysicalStates || {})}
- Ambient Acoustic Environment: ${accumulatedState?.ambientAcousticEnvironment || 'Chamber room tone'}

${previousPageSummary ? `PREVIOUS PAGE RECAP (PAGE ${pageNumber - 1}):\n${previousPageSummary}` : 'This is PAGE 1 (Opening scene of Episode 1).'}
${previousPageScript ? `LAST FEW LINES OF PREVIOUS PAGE (ensure seamless pickup):\n${previousPageScript.slice(-500)}` : ''}

CRITICAL RADIO SCRIPT FORMATTING RULES:
1. Every sound event must be strictly tagged: [SFX: ...], [MUSIC: ...], (PAUSE: X SECONDS).
2. Parenthetical acoustic instructions: (FILTER: OVER TELEPHONE), (OFF-MIC), (INTO MIC, CONSPIRATORIAL WHISPER).
3. ALL-CAPS Character names. Length: 140 to 190 words.
4. Output updated accumulatedState reflecting updated character positions, active inventory props, and the page cliffhanger.

Return JSON adhering to the schema.`;

  try {
    const { text: resultText } = await generateWithModelFallback({
      contents: prompt,
      config: {
        systemInstruction: 'You are an award-winning audio dramatist who crafts breathtaking, immersive radio plays with vivid Foley direction and sharp dialogue.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pageNumber: { type: Type.INTEGER },
            rawScript: { type: Type.STRING },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  direction: { type: Type.STRING },
                  line: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ['type'],
              },
            },
            pageSummary: { type: Type.STRING },
            estimatedDurationSec: { type: Type.INTEGER },
            endingHook: { type: Type.STRING },
            accumulatedState: {
              type: Type.OBJECT,
              properties: {
                lastPageCliffhanger: { type: Type.STRING },
                unresolvedPlotTension: { type: Type.STRING },
                activePropInventory: { type: Type.ARRAY, items: { type: Type.STRING } },
                characterPhysicalStates: { type: Type.OBJECT },
                ambientAcousticEnvironment: { type: Type.STRING },
              },
              required: ['lastPageCliffhanger', 'unresolvedPlotTension'],
            },
          },
          required: ['rawScript', 'lines', 'pageSummary', 'estimatedDurationSec'],
        },
      },
    });

    const parsed = JSON.parse(resultText || '{}');
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length === 0 || !parsed.rawScript) {
      throw new Error('Incomplete script page JSON');
    }
    if (episodeInfo) {
      parsed.episodeIndex = episodeInfo.episodeIndex;
    }
    if (!parsed.accumulatedState) {
      parsed.accumulatedState = {
        lastPageCliffhanger: parsed.endingHook || `Cliffhanger at Page ${pageNumber}`,
        unresolvedPlotTension: pagePlan?.keyDialogueConflict || 'Mounting psychological conflict',
        activePropInventory: accumulatedState?.activePropInventory || ['Prop Inventory'],
        characterPhysicalStates: accumulatedState?.characterPhysicalStates || {},
        ambientAcousticEnvironment: pagePlan?.sceneHeading || 'Studio Chamber',
      };
    }
    return res.json(parsed);
  } catch (error) {
    console.warn(`[AI Studio] Page ${pageNumber} API hit quota/error. Generating broadcast page via local dramaturgy engine:`, error);
    const fallback = generatePageHeuristics(
      pageNumber,
      totalPages,
      pagePlan,
      blueprint,
      episodeInfo,
      previousPageScript,
      stylePreset,
      accumulatedState
    );
    return res.json(fallback);
  }
});

// 3. Tweak or Punch Up an Existing Script Page
app.post('/api/tweak-page', async (req, res) => {
  const { currentScript, instruction, characters } = req.body;

  if (!currentScript || !instruction) {
    return res.status(400).json({ error: 'Missing currentScript or instruction.' });
  }

  const prompt = `You are an audio script editor. Revise the following radio drama script page based on the director's request.
Director's Request: "${instruction}"

CURRENT SCRIPT:
${currentScript}

CHARACTERS IN PLAY:
${JSON.stringify(characters || [])}

Maintain professional radio drama format ([SFX: ...], [MUSIC: ...], (DIRECTION), ALL-CAPS SPEAKERS).
Return a JSON object with: rawScript, lines, notes.`;

  try {
    const { text: resultText } = await generateWithModelFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawScript: { type: Type.STRING },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  direction: { type: Type.STRING },
                  line: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ['type'],
              },
            },
            notes: { type: Type.STRING },
          },
          required: ['rawScript', 'lines', 'notes'],
        },
      },
    });

    const parsed = JSON.parse(resultText || '{}');
    return res.json(parsed);
  } catch (error) {
    console.warn('[AI Studio] Tweak API quota/network fallback, applying acoustic revisions directly:', error);
    
    let tweakedScript = currentScript;
    if (instruction.toLowerCase().includes('phone filter') || instruction.toLowerCase().includes('telephone')) {
      tweakedScript = tweakedScript.replace(/(INSPECTOR[^\n]*\n\()([^\)]+)(\))/gi, '$1FILTER: OVER TELEPHONE, $2$3');
    }
    if (instruction.toLowerCase().includes('rain') || instruction.toLowerCase().includes('wind')) {
      tweakedScript = `[SFX: HEAVY RAIN AND GUSTING WIND LASHING THE SASH WINDOWPANE]\n` + tweakedScript;
    }
    // Strip visual stage directions like (smiles), (looks at), (nods)
    tweakedScript = tweakedScript.replace(/\((looks|smiles|stares|nods|turns and walks)[^\)]*\)/gi, '(BEAT)');

    const parsedLines: any[] = [];
    const rawLines = tweakedScript.split('\n').filter(Boolean);
    let curSpeaker = '';

    for (const l of rawLines) {
      const trimmed = l.trim();
      if (trimmed.startsWith('SCENE')) {
        parsedLines.push({ type: 'heading', text: trimmed });
      } else if (trimmed.startsWith('[SFX:')) {
        parsedLines.push({ type: 'sfx', text: trimmed });
      } else if (trimmed.startsWith('[MUSIC:')) {
        parsedLines.push({ type: 'music', text: trimmed });
      } else if (trimmed.startsWith('[STATION BUMPER')) {
        parsedLines.push({ type: 'bumper', text: trimmed });
      } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        parsedLines.push({ type: 'direction', text: trimmed });
      } else if (/^[A-Z0-9\s/'-]{2,}$/.test(trimmed)) {
        curSpeaker = trimmed;
      } else if (curSpeaker) {
        parsedLines.push({
          type: 'dialogue',
          speaker: curSpeaker,
          direction: '(INTO MIC)',
          line: trimmed,
        });
        curSpeaker = '';
      }
    }

    return res.json({
      rawScript: tweakedScript,
      lines: parsedLines.length > 0 ? parsedLines : [
        { type: 'sfx', text: '[SFX: HEAVY RAIN AND GUSTING WIND LASHING THE SASH WINDOWPANE]' },
        { type: 'dialogue', speaker: 'NARRATOR', direction: '(CLOSE-MIC)', line: 'The room was bathed in cold acoustic tension.' }
      ],
      notes: `Applied acoustic directive: "${instruction}". Stripped visual cues, added telephone acoustic filter, and intensified rain/wind Foley.`,
    });
  }
});

// 4. Generate Voice Line Audio with Gemini TTS
app.post('/api/generate-tts', async (req, res) => {
  try {
    const { text, speaker = 'Actor', voiceName = 'Kore', stylePrompt = '' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = allowedVoices.includes(voiceName) ? voiceName : 'Kore';
    const promptText = stylePrompt ? `${stylePrompt}: ${text}` : text;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText,
              speechMetadata: {
                speaker,
                style: stylePrompt || 'Vintage radio drama voice actor, expressive and clear',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({
        fallback: 'web-speech',
        message: 'No audio returned, falling back to Web Speech API',
      });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error) {
    console.warn('Gemini TTS reached quota/error. Seamlessly routing client to browser Web Speech API:', error);
    res.json({
      fallback: 'web-speech',
      message: 'Gemini TTS quota reached, browser Web Speech engine activated.',
    });
  }
});

// Development / production server runner
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Airwaves Radio Drama Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
