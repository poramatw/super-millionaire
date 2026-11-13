const MUTE_STORAGE_KEY = 'sm_9028_sound_muted';

class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean;

  constructor() {
    let saved = false;
    try {
      saved = window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
      saved = false;
    }
    this.muted = saved;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // Ignore storage failures
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    startOffset: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.14,
    endFreq?: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playDiceRoll(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const rattleOffsets = [0, 0.055, 0.11, 0.17, 0.24, 0.32];
    rattleOffsets.forEach((offset, i) => {
      const pitch = 210 + ((i * 73) % 140);
      this.playTone(pitch, offset, 0.045, 'square', 0.06, pitch * 0.72);
    });
    // Final crisp wooden settle
    this.playTone(480, 0.39, 0.07, 'triangle', 0.12, 260);
  }

  public playPawnHop(stepIndex = 0): void {
    const base = 360 + (stepIndex % 4) * 28;
    this.playTone(base, 0, 0.065, 'triangle', 0.11, base * 1.25);
  }

  public playCashChing(): void {
    // Classic bright two-note cash register bell
    this.playTone(1046.5, 0, 0.14, 'sine', 0.14);
    this.playTone(1567.98, 0.075, 0.28, 'triangle', 0.16);
    this.playTone(2093.0, 0.12, 0.34, 'sine', 0.09);
  }

  public playCardFlip(): void {
    this.playTone(280, 0, 0.09, 'sine', 0.1, 620);
    this.playTone(540, 0.07, 0.11, 'triangle', 0.09, 780);
  }

  public playJailBuzzer(): void {
    this.playTone(155, 0, 0.22, 'sawtooth', 0.1, 125);
    this.playTone(135, 0.24, 0.32, 'sawtooth', 0.11, 98);
  }

  public playFanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, idx * 0.11, idx === notes.length - 1 ? 0.55 : 0.16, 'triangle', 0.15);
    });
  }
}

export const soundFX = new RetroSoundEngine();
