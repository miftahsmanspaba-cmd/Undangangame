import { MusicTrackId } from '../types/wedding';

interface NoteStep {
  melody: number | null; // MIDI note
  bass: number | null;
  chord?: number[];
}

// MIDI to Frequency helper
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Track 1: Romansa Pagi (Canon-inspired music box)
const CANON_BOX_SEQ: NoteStep[] = [
  { melody: 76, bass: 48, chord: [60, 64, 67] }, // E5 / C
  { melody: 74, bass: null },
  { melody: 72, bass: 43, chord: [59, 62, 67] }, // C5 / G
  { melody: 71, bass: null },
  { melody: 69, bass: 45, chord: [57, 60, 64] }, // A4 / Am
  { melody: 67, bass: null },
  { melody: 65, bass: 40, chord: [55, 59, 64] }, // F4 / Em
  { melody: 67, bass: null },
  { melody: 69, bass: 41, chord: [57, 60, 65] }, // F
  { melody: 72, bass: null },
  { melody: 71, bass: 48, chord: [60, 64, 67] }, // C
  { melody: 72, bass: null },
  { melody: 74, bass: 41, chord: [57, 62, 65] }, // Dm/F
  { melody: 76, bass: null },
  { melody: 74, bass: 43, chord: [59, 62, 67] }, // G
  { melody: 79, bass: null },
];

// Track 2: Melodi Senja (Warm romantic 3/4 waltz)
const SENJA_WALTZ_SEQ: NoteStep[] = [
  { melody: 72, bass: 48, chord: [60, 64, 67] },
  { melody: 76, bass: null, chord: [60, 64, 67] },
  { melody: 79, bass: null, chord: [60, 64, 67] },
  { melody: 77, bass: 41, chord: [60, 65, 69] },
  { melody: 76, bass: null, chord: [60, 65, 69] },
  { melody: 74, bass: null, chord: [60, 65, 69] },
  { melody: 72, bass: 45, chord: [60, 64, 69] },
  { melody: 74, bass: null, chord: [60, 64, 69] },
  { melody: 76, bass: null, chord: [60, 64, 69] },
  { melody: 74, bass: 43, chord: [59, 62, 67] },
  { melody: 71, bass: null, chord: [59, 62, 67] },
  { melody: 67, bass: null, chord: [59, 62, 67] },
];

// Track 3: Bahagia 8-Bit (Cheerful retro adventure love theme)
const BAHAGIA_8BIT_SEQ: NoteStep[] = [
  { melody: 72, bass: 48 },
  { melody: 76, bass: null },
  { melody: 79, bass: 55 },
  { melody: 76, bass: null },
  { melody: 81, bass: 53 },
  { melody: 79, bass: null },
  { melody: 76, bass: 48 },
  { melody: 74, bass: 55 },
  { melody: 72, bass: 45 },
  { melody: 74, bass: null },
  { melody: 76, bass: 52 },
  { melody: 79, bass: null },
  { melody: 77, bass: 50 },
  { melody: 76, bass: null },
  { melody: 74, bass: 43 },
  { melody: null, bass: 55 },
];

class WeddingAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private isMuted = false;
  private timerId: number | null = null;
  private stepIndex = 0;
  private currentTrack: MusicTrackId = 'canon_box';
  private customAudioEl: HTMLAudioElement | null = null;
  private customUrl: string | undefined;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setTrack(track: MusicTrackId, customDataUrl?: string) {
    const changed = this.currentTrack !== track || this.customUrl !== customDataUrl;
    this.currentTrack = track;
    this.customUrl = customDataUrl;
    if (changed && this.isPlaying) {
      this.stopMusic();
      this.startMusic(track, customDataUrl);
    }
  }

  public getPlayingState(): boolean {
    return this.isPlaying && !this.isMuted;
  }

  public toggleMusic(track?: MusicTrackId, customDataUrl?: string): boolean {
    if (track) {
      this.currentTrack = track;
      this.customUrl = customDataUrl;
    }
    if (this.isPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic(this.currentTrack, this.customUrl);
      return true;
    }
  }

  public startMusic(track?: MusicTrackId, customDataUrl?: string) {
    if (track) this.currentTrack = track;
    if (customDataUrl !== undefined) this.customUrl = customDataUrl;

    this.stopMusic();
    this.isPlaying = true;
    this.isMuted = false;

    if (this.currentTrack === 'custom' && this.customUrl) {
      try {
        this.customAudioEl = new Audio(this.customUrl);
        this.customAudioEl.loop = true;
        this.customAudioEl.volume = 0.5;
        this.customAudioEl.play().catch(() => {
          // Fallback to built-in synth if browser blocks custom audio
          this.startSynthLoop();
        });
        return;
      } catch {
        // Fallback
      }
    }

    this.startSynthLoop();
  }

  private startSynthLoop() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stepIndex = 0;

    const tempoMs =
      this.currentTrack === 'senja_waltz'
        ? 440
        : this.currentTrack === 'bahagia_8bit'
        ? 250
        : 380;

    const tick = () => {
      if (!this.isPlaying || this.isMuted) return;
      const seq =
        this.currentTrack === 'senja_waltz'
          ? SENJA_WALTZ_SEQ
          : this.currentTrack === 'bahagia_8bit'
          ? BAHAGIA_8BIT_SEQ
          : CANON_BOX_SEQ;

      const step = seq[this.stepIndex % seq.length];
      this.stepIndex++;

      const now = ctx.currentTime;
      const is8Bit = this.currentTrack === 'bahagia_8bit';

      if (step.melody !== null) {
        this.playTone(
          midiToFreq(step.melody),
          now,
          is8Bit ? 0.18 : 0.48,
          is8Bit ? 'square' : 'triangle',
          is8Bit ? 0.045 : 0.11
        );
      }
      if (step.bass !== null) {
        this.playTone(
          midiToFreq(step.bass),
          now,
          is8Bit ? 0.22 : 0.65,
          is8Bit ? 'triangle' : 'sine',
          is8Bit ? 0.06 : 0.09
        );
      }
      if (step.chord && !is8Bit) {
        for (const n of step.chord) {
          this.playTone(midiToFreq(n), now, 0.55, 'sine', 0.032);
        }
      }
    };

    tick();
    this.timerId = window.setInterval(tick, tempoMs);
  }

  public stopMusic() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.currentTime = 0;
      this.customAudioEl = null;
    }
  }

  private playTone(
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    peakGain: number
  ) {
    const ctx = this.ctx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
  }

  public playJump() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.14);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playCollectHeart() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playTone(784, now, 0.12, 'triangle', 0.11); // G5
    this.playTone(1046.5, now + 0.07, 0.22, 'triangle', 0.12); // C6
  }

  public playCheckpoint() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.playTone(freq, now + i * 0.08, 0.28, 'triangle', 0.1);
    });
  }

  public playVictoryFanfare() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0, d: 0.15 },
      { f: 659.25, t: 0.14, d: 0.15 },
      { f: 783.99, t: 0.28, d: 0.15 },
      { f: 1046.5, t: 0.42, d: 0.55 },
      { f: 783.99, t: 0.65, d: 0.18 },
      { f: 1046.5, t: 0.85, d: 0.7 },
    ];
    notes.forEach((n) => this.playTone(n.f, now + n.t, n.d, 'triangle', 0.13));
  }
}

export const weddingAudio = new WeddingAudioEngine();
