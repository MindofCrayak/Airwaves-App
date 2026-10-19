/**
 * Web Audio API synthesizer for vintage radio drama Foley & music stingers,
 * real-time DSP perspective filters, and offline master multi-track WAV mixdown.
 */

import { GeneratedPage, RadioScriptBlueprint, ScriptLine, AudioMixOptions, AudioExportProgress } from '../types';

export class FoleySynth {
  private ctx: AudioContext | null = null;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Vintage Radio Static / Tuning whistle
  playRadioStatic(duration = 1.2, dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + duration);
    filter.Q.value = 3.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.linearRampToValueAtTime(1600, now + duration * 0.4);
    osc.frequency.linearRampToValueAtTime(820, now + duration);
    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.connect(oscGain);
    oscGain.connect(destination);

    noise.start(now);
    osc.start(now);
    noise.stop(now + duration);
    osc.stop(now + duration);
  }

  // Dramatic Organ / Minor chord stinger
  playDramaticStinger(dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;
    const freqs = [130.81, 155.56, 196.0, 261.63]; // C minor chord (C3, Eb3, G3, C4)

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 2.5);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12 / freqs.length, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 2.5);
    });
  }

  // Footsteps generator (wood or gravel)
  playFootsteps(surface: 'wood' | 'gravel' = 'wood', dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;
    const stepCount = 3;

    for (let s = 0; s < stepCount; s++) {
      const stepTime = now + s * 0.42;
      const stepDuration = 0.16;
      const bufferSize = Math.floor(ctx.sampleRate * stepDuration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = surface === 'wood' ? 'lowpass' : 'bandpass';
      const baseFreq = surface === 'wood' ? 140 + (s % 2 === 0 ? 0 : 35) : 800 + (s % 2 === 0 ? 0 : 150);
      filter.frequency.setValueAtTime(baseFreq, stepTime);
      filter.Q.value = surface === 'wood' ? 3.0 : 1.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, stepTime);
      gain.gain.linearRampToValueAtTime(surface === 'wood' ? 0.35 : 0.22, stepTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.13);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(stepTime);
      noise.stop(stepTime + stepDuration);
    }
  }

  // Continuous howling wind / blizzard
  playWindBlizzard(duration = 3.0, dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(320, now);
    bandpass.Q.value = 6.0;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.2; // 0.2 Hz gusting
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220; // sweep +/- 220Hz
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(destination);

    noise.start(now);
    lfo.start(now);
    noise.stop(now + duration);
    lfo.stop(now + duration);
  }

  // Gunshot with sharp click transient and sub rumble
  playGunshot(dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;
    const duration = 0.7;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Transient click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1200, now);
    clickGain.gain.setValueAtTime(0.6, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.002);
    click.connect(clickGain);
    clickGain.connect(destination);
    click.start(now);
    click.stop(now + 0.005);

    // Blast decay
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.07);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // Thunder sheet & distant lightning rumble
  playThunder(dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;
    const duration = 2.8;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.linearRampToValueAtTime(450, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // Door Creak & Heavy Thud
  playDoorCreak(dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.4);
    osc.frequency.linearRampToValueAtTime(180, now + 0.8);
    osc.frequency.linearRampToValueAtTime(320, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.Q.value = 5.0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 1.35);
  }

  // Heartbeat pulse (Thud-thud)
  playHeartbeat(dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;

    const playThump = (time: number, freq: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.18);

      gain.gain.setValueAtTime(0.01, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(time);
      osc.stop(time + 0.22);
    };

    playThump(now, 75, 0.4);
    playThump(now + 0.22, 60, 0.28);
  }

  // Rotary Telephone Ring / Bell
  playTelephoneRing(dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;

    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.frequency.value = 20;
    modGain.gain.value = 0.5;

    mod.connect(gain.gain);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    mod.start(now);

    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
    mod.stop(now + 1.2);
  }

  // Crisp Typewriter / Teletype clatter
  playTypewriterKey(dest?: AudioNode) {
    const ctx = this.getContext();
    const destination = dest || ctx.destination;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Generic sound trigger by cue text inspection
  triggerByCueText(cueText: string) {
    const lower = cueText.toLowerCase();
    if (lower.includes('footstep') || lower.includes('walk') || lower.includes('pacing')) {
      this.playFootsteps(lower.includes('gravel') ? 'gravel' : 'wood');
    } else if (lower.includes('wind') || lower.includes('blizzard') || lower.includes('gale')) {
      this.playWindBlizzard(3.2);
    } else if (lower.includes('gunshot') || lower.includes('shot') || lower.includes('pistol') || lower.includes('revolver')) {
      this.playGunshot();
    } else if (lower.includes('thunder') || lower.includes('storm') || lower.includes('rain')) {
      this.playThunder();
    } else if (lower.includes('organ') || lower.includes('sting') || lower.includes('music') || lower.includes('theme') || lower.includes('chime')) {
      this.playDramaticStinger();
    } else if (lower.includes('door') || lower.includes('creak') || lower.includes('slam') || lower.includes('hinge')) {
      this.playDoorCreak();
    } else if (lower.includes('heart') || lower.includes('thud') || lower.includes('pulse')) {
      this.playHeartbeat();
    } else if (lower.includes('phone') || lower.includes('ring') || lower.includes('bell') || lower.includes('telephone')) {
      this.playTelephoneRing();
    } else if (lower.includes('type') || lower.includes('teletype') || lower.includes('click') || lower.includes('clock')) {
      this.playTypewriterKey();
    } else {
      this.playRadioStatic(0.8);
    }
  }

  /**
   * Creates an Acoustic Perspective DSP Node Chain
   * Applies telephone bandpass with distortion or off-mic room reverb
   */
  createPerspectiveChain(
    ctx: BaseAudioContext,
    target: AudioNode,
    direction?: string
  ): { input: AudioNode; output: AudioNode } {
    const upper = (direction || '').toUpperCase();

    // 1. Telephone / Radio Filter Chain
    if (upper.includes('FILTER') || upper.includes('TELEPHONE') || upper.includes('RADIO')) {
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 350;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3200;

      const peaking = ctx.createBiquadFilter();
      peaking.type = 'peaking';
      peaking.frequency.value = 1800;
      peaking.Q.value = 2.5;
      peaking.gain.value = 6;

      // Soft waveshaping distortion for analog carbon mic crunch
      const waveShaper = ctx.createWaveShaper();
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      const k = 15;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      waveShaper.curve = curve;
      waveShaper.oversample = '4x';

      highpass.connect(lowpass);
      lowpass.connect(peaking);
      peaking.connect(waveShaper);
      waveShaper.connect(target);

      return { input: highpass, output: waveShaper };
    }

    // 2. Off-Mic / Distant Stage Reverb Chain
    if (upper.includes('OFF-MIC') || upper.includes('DISTANT') || upper.includes('HALLWAY') || upper.includes('ROOM')) {
      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.35; // attenuated dry signal
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.65;

      const delay1 = ctx.createDelay();
      delay1.delayTime.value = 0.045;
      const delay2 = ctx.createDelay();
      delay2.delayTime.value = 0.075;

      const feedback = ctx.createGain();
      feedback.gain.value = 0.35;

      const rolloff = ctx.createBiquadFilter();
      rolloff.type = 'lowpass';
      rolloff.frequency.value = 1800;

      const inputNode = ctx.createGain();

      inputNode.connect(dryGain);
      inputNode.connect(delay1);

      delay1.connect(delay2);
      delay2.connect(rolloff);
      rolloff.connect(feedback);
      feedback.connect(delay1);
      rolloff.connect(wetGain);

      dryGain.connect(target);
      wetGain.connect(target);

      return { input: inputNode, output: target };
    }

    // Default: Direct Pass-Through
    return { input: target, output: target };
  }
}

export const foleySynth = new FoleySynth();

/**
 * Offline Master Audio Mixdown Engine
 * Compiles spoken dialogue, sound cues, and music stingers into a broadcast-grade 16-bit 44.1kHz stereo .wav Blob.
 */
export async function renderBroadcastMasterTrack(
  blueprint: RadioScriptBlueprint,
  pages: Record<number, GeneratedPage>,
  getAudioFn: (line: ScriptLine) => Promise<ArrayBuffer | null>,
  options: AudioMixOptions = {
    includeFoley: true,
    includeMusic: true,
    masterVolume: 1.0,
    telephoneFilterWet: 0.8,
    roomReverbWet: 0.7,
  },
  onProgress?: (p: AudioExportProgress) => void
): Promise<Blob> {
  const sampleRate = 44100;
  const sortedPageNumbers = Object.keys(pages)
    .map(Number)
    .sort((a, b) => a - b);

  if (sortedPageNumbers.length === 0) {
    throw new Error('No script pages available to render.');
  }

  // Pre-load / decode all voice line buffers
  const timelineEvents: {
    time: number;
    buffer?: AudioBuffer;
    cueType?: 'sfx' | 'music';
    cueText?: string;
    direction?: string;
    gain: number;
  }[] = [];

  const tempCtx = new AudioContext();
  let currentTime = 1.0; // 1s opening silence before broadcast begins

  const totalPages = sortedPageNumbers.length;

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const pageNum = sortedPageNumbers[pIdx];
    const page = pages[pageNum];

    onProgress?.({
      currentPage: pageNum,
      totalPages,
      percent: Math.round((pIdx / totalPages) * 50),
      statusText: `Pre-fetching audio stems for Page ${pageNum}...`,
    });

    const lines = page.lines || [];

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];

      if (line.type === 'dialogue') {
        const rawBuf = await getAudioFn(line);
        if (rawBuf && rawBuf.byteLength > 0) {
          try {
            const decoded = await tempCtx.decodeAudioData(rawBuf.slice(0));
            timelineEvents.push({
              time: currentTime,
              buffer: decoded,
              direction: line.direction,
              gain: 1.0,
            });
            currentTime += decoded.duration + 0.35; // pacing pause between speakers
          } catch (e) {
            console.warn(`[Mixdown] Failed to decode speech line for ${line.speaker}:`, e);
            currentTime += 2.0; // estimate pause
          }
        } else {
          // Estimated spoken pause if audio not rendered
          const words = (line.line || line.text || '').split(/\s+/).length;
          currentTime += Math.max(1.5, (words / 150) * 60);
        }
      } else if (line.type === 'sfx' && options.includeFoley) {
        timelineEvents.push({
          time: currentTime,
          cueType: 'sfx',
          cueText: line.text || line.line || '',
          gain: 0.7,
        });
        currentTime += 1.2;
      } else if (line.type === 'music' && options.includeMusic) {
        timelineEvents.push({
          time: currentTime,
          cueType: 'music',
          cueText: line.text || line.line || '',
          gain: 0.6,
        });
        currentTime += 2.5;
      } else if (line.type === 'bumper') {
        currentTime += 3.5;
      }
    }

    currentTime += 1.0; // Inter-page buffer
  }

  tempCtx.close();

  // Total mixdown duration in seconds
  const totalDuration = Math.max(5.0, currentTime + 2.0);
  const totalFrames = Math.ceil(totalDuration * sampleRate);

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    percent: 60,
    statusText: `Mastering multi-track timeline (${Math.round(totalDuration)}s airtime)...`,
  });

  // Offline Audio Context for sample-accurate stereo rendering
  const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

  // Master Gain & Limiter
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = options.masterVolume;
  masterGain.connect(offlineCtx.destination);

  // Schedule speech buffers & procedural Foley nodes
  for (const ev of timelineEvents) {
    if (ev.buffer) {
      const source = offlineCtx.createBufferSource();
      source.buffer = ev.buffer;

      const lineGain = offlineCtx.createGain();
      lineGain.gain.value = ev.gain;

      // Perspective filter chain (telephone / off-mic)
      const { input } = foleySynth.createPerspectiveChain(offlineCtx, lineGain, ev.direction);
      lineGain.connect(masterGain);
      source.connect(input);

      source.start(ev.time);
    } else if (ev.cueType === 'sfx') {
      // Synthesize procedural Foley into the offline track
      const cue = (ev.cueText || '').toLowerCase();
      const sfxGain = offlineCtx.createGain();
      sfxGain.gain.value = ev.gain;
      sfxGain.connect(masterGain);

      if (cue.includes('heart') || cue.includes('pulse')) {
        const osc = offlineCtx.createOscillator();
        const g = offlineCtx.createGain();
        osc.frequency.setValueAtTime(75, ev.time);
        osc.frequency.exponentialRampToValueAtTime(30, ev.time + 0.18);
        g.gain.setValueAtTime(0.5, ev.time);
        g.gain.exponentialRampToValueAtTime(0.001, ev.time + 0.22);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(ev.time);
        osc.stop(ev.time + 0.25);
      } else if (cue.includes('organ') || cue.includes('sting') || cue.includes('music')) {
        [130.81, 155.56, 196.0, 261.63].forEach((f, idx) => {
          const osc = offlineCtx.createOscillator();
          const g = offlineCtx.createGain();
          osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(f, ev.time);
          g.gain.setValueAtTime(0.08, ev.time);
          g.gain.exponentialRampToValueAtTime(0.001, ev.time + 2.2);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(ev.time);
          osc.stop(ev.time + 2.3);
        });
      } else {
        // Subtle ambient radio crackle
        const bufferSize = Math.floor(sampleRate * 0.8);
        const buf = offlineCtx.createBuffer(1, bufferSize, sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
        const src = offlineCtx.createBufferSource();
        src.buffer = buf;
        src.connect(sfxGain);
        src.start(ev.time);
        src.stop(ev.time + 0.8);
      }
    }
  }

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    percent: 85,
    statusText: 'Rendering broadcast-grade stereo WAV stems...',
  });

  const renderedBuffer = await offlineCtx.startRendering();

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    percent: 95,
    statusText: 'Encoding broadcast 16-bit PCM .wav file...',
  });

  const wavBlob = audioBufferToWavBlob(renderedBuffer);

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    percent: 100,
    statusText: 'Mixdown complete! Ready for transmission.',
  });

  return wavBlob;
}

/**
 * Converts Web Audio AudioBuffer to standard 16-bit stereo PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const length = left.length * numChannels * 2;

  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF Chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');

  // FMT sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, bitDepth, true);

  // DATA sub-chunk
  writeString(36, 'data');
  view.setUint32(40, length, true);

  // Interleave audio samples as 16-bit signed PCM
  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    // Left channel
    let sampleL = Math.max(-1, Math.min(1, left[i]));
    view.setInt16(offset, sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff, true);
    offset += 2;

    // Right channel
    let sampleR = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
