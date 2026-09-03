// Web Audio API procedural sound synthesizer for realistic wood clicks and marble rolling

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private rollNode: AudioBufferSourceNode | null = null;
  private rollGain: GainNode | null = null;
  private rollFilter: BiquadFilterNode | null = null;
  private isRollingInitialized: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.rollGain) {
      this.rollGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Wooden tap / click sound when marble collides with wood maze wall
  public playWoodImpact(intensity: number = 0.5) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const clampedIntensity = Math.min(Math.max(intensity, 0.05), 1.0);
    const now = this.ctx.currentTime;

    // Fast acoustic transient: wood pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Wood has a resonant cavity pitch between 180Hz and 420Hz with fast pitch drop
    const baseFreq = 220 + Math.random() * 80;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 2.2, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.035);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(4.0, now);

    const peakVol = clampedIntensity * 0.28;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);

    // Subtle high-frequency wood click click
    if (clampedIntensity > 0.2) {
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(1800, now);
      clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.015);

      clickGain.gain.setValueAtTime(clampedIntensity * 0.12, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      clickOsc.start(now);
      clickOsc.stop(now + 0.025);
    }
  }

  // Smooth rolling rumble loop
  public updateRoll(speed: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (!this.isRollingInitialized) {
      this.initRollRumble();
    }

    if (!this.rollGain || !this.rollFilter) return;

    const now = this.ctx.currentTime;
    const clampedSpeed = Math.min(Math.max(speed, 0), 8.0);

    if (clampedSpeed < 0.1) {
      this.rollGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    // Velocity-dependent volume and frequency
    const targetVol = Math.min((clampedSpeed / 6.0) * 0.12, 0.12);
    const targetFreq = 120 + (clampedSpeed / 6.0) * 280;

    this.rollGain.gain.setTargetAtTime(targetVol, now, 0.05);
    this.rollFilter.frequency.setTargetAtTime(targetFreq, now, 0.05);
  }

  private initRollRumble() {
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pink noise synthesis for natural wood friction texture
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

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 160;
      filter.Q.value = 2.5;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseSource.start();
      this.rollNode = noiseSource;
      this.rollGain = gain;
      this.rollFilter = filter;
      this.isRollingInitialized = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Celebratory musical chime when goal reached
  public playGoalCelebration() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + idx * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 1.3);
    });
  }
}

export const soundManager = new SoundManager();
