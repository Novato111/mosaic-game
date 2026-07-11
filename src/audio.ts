/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private isMuted: boolean = false;
  private volumeLevel: number = 0.5;
  private lastScratchTime: number = 0;

  constructor() {
    // Lazy initialization on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.value = this.isMuted ? 0 : this.volumeLevel;
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported in this browser.", e);
    }
  }

  public getAudioContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  public getMasterVolume(): GainNode | null {
    this.init();
    return this.masterVolume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterVolume) {
      this.masterVolume.gain.setValueAtTime(
        muted ? 0 : this.volumeLevel,
        this.ctx?.currentTime || 0
      );
    }
  }

  public setVolume(volume: number) {
    this.volumeLevel = Math.max(0, Math.min(1, volume));
    if (this.masterVolume && !this.isMuted) {
      this.masterVolume.gain.setValueAtTime(this.volumeLevel, this.ctx?.currentTime || 0);
    }
  }

  private resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Play a satisfying click sound when colliding with the circle boundary.
   */
  public playBounce(pitchMultiplier: number = 1.0) {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterVolume!);

    // Soft organic sine wave
    osc.type = 'sine';
    
    // Set pitch based on velocity / size
    const baseFreq = 180 * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    // Rapid pitch sweep downwards for a "thump/pop" quality
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  /**
   * Play a granular highpass noise scrape when scratching tiles.
   * We rate-limit to avoid clipping and sound fatigue.
   */
  public playScratch() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const now = Date.now();
    if (now - this.lastScratchTime < 25) {
      return; // Rate limit scratches to 40 per second
    }
    this.lastScratchTime = now;

    const bufferSize = this.ctx.sampleRate * 0.02; // 20ms duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Populate with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Create high-pass filter for the ASMR "scratch" texture
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3500, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume!);

    noiseNode.start();
    noiseNode.stop(this.ctx.currentTime + 0.025);
  }

  /**
   * Play a deep energetic whoosh with a sweeping bandpass filter for the booster.
   */
  public playBooster() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    // We use an oscillator with a pitch sweep and a resonant bandpass filter
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    subOsc.type = 'triangle';

    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.25);

    subOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.25);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.25);
    filter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume!);

    osc.start();
    subOsc.start();
    osc.stop(this.ctx.currentTime + 0.3);
    subOsc.stop(this.ctx.currentTime + 0.3);
  }

  /**
   * Play a beautiful chimes arpeggio when fully cleared.
   */
  public playFinalClear() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const baseFrequencies = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major notes
    const delayStep = 0.08;

    baseFrequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * delayStep);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime);
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * delayStep);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx!.currentTime + idx * delayStep + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * delayStep + 0.6);

      osc.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start(this.ctx!.currentTime + idx * delayStep);
      osc.stop(this.ctx!.currentTime + idx * delayStep + 0.65);
    });
  }
}

export const audioSynth = new AudioSynthesizer();
