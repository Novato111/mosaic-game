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
  private bounceNoteIndex: number = 0;

  // Famous, beautiful Pachelbel's Canon in D Major arpeggiated arpeggio loop:
  private readonly pianoNotes: number[] = [
    // 1. D Major (Uplifting, warm)
    146.83, // D3 (Bass)
    220.00, // A3
    293.66, // D4
    369.99, // F#4
    440.00, // A4
    587.33, // D5
    369.99, // F#4
    293.66, // D4

    // 2. A Major (Gentle, bright)
    110.00, // A2 (Bass)
    164.81, // E3
    220.00, // A3
    277.18, // C#4
    329.63, // E4
    440.00, // A4
    277.18, // C#4
    220.00, // A3

    // 3. B Minor (Introspective, rich)
    123.47, // B2 (Bass)
    185.00, // F#3
    246.94, // B3
    293.66, // D4
    369.99, // F#4
    493.88, // B4
    293.66, // D4
    246.94, // B3

    // 4. F# Minor (Melancholy, deep)
    92.50,  // F#2 (Bass)
    138.59, // C#3
    185.00, // F#3
    220.00, // A3
    277.18, // C#4
    369.99, // F#4
    220.00, // A3
    185.00, // F#3

    // 5. G Major (Uplifting, hopeful)
    98.00,  // G2 (Bass)
    146.83, // D3
    196.00, // G3
    246.94, // B3
    293.66, // D4
    392.00, // G4
    246.94, // B3
    196.00, // G3

    // 6. D Major (Familiar theme)
    146.83, // D3 (Bass)
    220.00, // A3
    293.66, // D4
    369.99, // F#4
    440.00, // A4
    587.33, // D5
    369.99, // F#4
    293.66, // D4

    // 7. G Major (Warm transition)
    98.00,  // G2 (Bass)
    146.83, // D3
    196.00, // G3
    246.94, // B3
    293.66, // D4
    392.00, // G4
    246.94, // B3
    196.00, // G3

    // 8. A Major (Resolving dominant)
    110.00, // A2 (Bass)
    164.81, // E3
    220.00, // A3
    277.18, // C#4
    329.63, // E4
    440.00, // A4
    277.18, // C#4
    220.00, // A3
  ];

  // ASMR ambient states
  private isAmbientRunning: boolean = false;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientTimer: any = null;

  // Lush delay nodes for beautiful, lingering cathedral-like echoes
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;

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

      // Initialize the lush ambient feedback delay network
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.35; // 350ms delay for relaxing tempo arpeggios
      
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.38; // 38% lingering feedback for a relaxing tail
      
      this.delayFilter = this.ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 1200; // soft warm echoes, filtering out high-end harshness

      // Delay feedback loop: delayNode -> delayFilter -> delayFeedback -> delayNode
      this.delayNode.connect(this.delayFilter);
      this.delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);

      // Connect delayNode to masterVolume so we hear the echoes
      this.delayNode.connect(this.masterVolume);
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
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.startAmbient();
    }
  }

  /**
   * Play a relaxing, beautiful synthesized piano sound when colliding with the circle boundary.
   * Every bounce plays a different note from a peaceful classical-piano arpeggio progression.
   * Includes dynamic 3D stereo panning and a cathedral echo delay send for an ultra-relaxing brain ASMR effect.
   */
  public playBounce(pitchMultiplier: number = 1.0, xPos?: number) {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;

      // Select the next note in our relaxing chord progression
      const baseFreq = this.pianoNotes[this.bounceNoteIndex % this.pianoNotes.length];
      this.bounceNoteIndex = (this.bounceNoteIndex + 1) % this.pianoNotes.length;

      // Use pitchMultiplier (based on ball speed) to scale velocity/dynamics (volume & tone)
      const velocity = Math.min(1.8, Math.max(0.4, pitchMultiplier));
      const baseVolume = 0.08 * velocity;

      // Master gain for this note to shape the envelope beautifully
      const noteGain = this.ctx.createGain();

      // Implement dynamic stereo panning based on ball horizontal position
      let panNode: StereoPannerNode | null = null;
      if (this.ctx.createStereoPanner && xPos !== undefined) {
        panNode = this.ctx.createStereoPanner();
        // CENTER_X is 480, horizontal bounds range from ~50 to ~910
        const dx = xPos - 480;
        const panVal = Math.min(0.75, Math.max(-0.75, dx / 430)); // Scale pan to [-0.75, 0.75]
        panNode.pan.setValueAtTime(panVal, now);
        
        noteGain.connect(panNode);
        panNode.connect(this.masterVolume!);
      } else {
        noteGain.connect(this.masterVolume!);
      }

      // Connect to the lush echo delay line (feed 45% of the dry note into the cathedral echo)
      if (this.delayNode) {
        const delaySend = this.ctx.createGain();
        delaySend.gain.setValueAtTime(0.45, now);
        noteGain.connect(delaySend);
        delaySend.connect(this.delayNode);
      }

      // Quick linear attack (0.006s) to simulate a soft piano hammer striking a string,
      // followed by a long, relaxing decay (longer for harder/faster hits)
      const decayDuration = 1.4 + (velocity * 0.2);
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(baseVolume, now + 0.006);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + decayDuration);

      // 1. Fundamental frequency (Sine wave: pure, deep, relaxing base)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      gain1.gain.setValueAtTime(0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + decayDuration);
      osc1.connect(gain1);
      gain1.connect(noteGain);
      osc1.start(now);
      osc1.stop(now + decayDuration + 0.05);

      // 2. Second Harmonic (Sine wave: warm body brightness, louder with higher velocity)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
      gain2.gain.setValueAtTime(0.28 * velocity, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + decayDuration * 0.6);
      osc2.connect(gain2);
      gain2.connect(noteGain);
      osc2.start(now);
      osc2.stop(now + decayDuration * 0.6 + 0.05);

      // 3. Third Harmonic (Sine wave: beautiful bell-like tine sparkle)
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(baseFreq * 3, now);
      gain3.gain.setValueAtTime(0.12 * (velocity * 0.8), now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + decayDuration * 0.3);
      osc3.connect(gain3);
      gain3.connect(noteGain);
      osc3.start(now);
      osc3.stop(now + decayDuration * 0.3 + 0.05);

      // 4. Hammer Felt Strike (Subtle soft noise burst for the physical hammer feel)
      const bufferSize = this.ctx.sampleRate * 0.015; // 15ms duration
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      // Softer hammer strike for slower/relaxing bounces, slightly brighter for faster
      const filterFreq = 300 + (velocity * 100);
      filter.frequency.setValueAtTime(filterFreq, now);

      const strikeGain = this.ctx.createGain();
      strikeGain.gain.setValueAtTime(0.14 * velocity, now);
      strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      noise.connect(filter);
      filter.connect(strikeGain);
      strikeGain.connect(noteGain);

      noise.start(now);
      noise.stop(now + 0.02);

    } catch (e) {
      // Safe fallback
    }
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
   * Play an organic, extremely satisfying ASMR "whoosh" brush sound with a warm bass body.
   * Scales dynamically with the ball's current radius to sound deeper, heavier, and more resonant as it grows.
   */
  public playBooster(ballRadius: number = 16) {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const startTime = this.ctx.currentTime;
      
      // Calculate size ratio based on initial radius (16px)
      const sizeRatio = Math.max(0.6, Math.min(3.5, ballRadius / 16));
      
      // Larger ball = slightly longer, heavier sound decay
      const duration = 0.32 + Math.min(0.18, (sizeRatio - 1.0) * 0.1);

      // 1. Procedural wind brush (using white noise + sweeping bandpass filter)
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const bandpassFilter = this.ctx.createBiquadFilter();
      bandpassFilter.type = 'bandpass';
      
      // Pitch-down the wind sweep frequency as the ball gets larger to simulate greater air displacement
      const startFreq = Math.max(120, 350 / sizeRatio);
      const endFreq = Math.max(500, 1900 / Math.sqrt(sizeRatio));
      
      bandpassFilter.frequency.setValueAtTime(startFreq, startTime);
      bandpassFilter.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration * 0.8);
      bandpassFilter.Q.setValueAtTime(2.2, startTime);

      const noiseGain = this.ctx.createGain();
      // Keep brush volume in control but solid
      noiseGain.gain.setValueAtTime(0.09, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      noiseNode.connect(bandpassFilter);
      bandpassFilter.connect(noiseGain);
      noiseGain.connect(this.masterVolume!);

      // 2. Pure soft physical bass body (using a warm triangle wave)
      const subOsc = this.ctx.createOscillator();
      const subFilter = this.ctx.createBiquadFilter();
      const subGain = this.ctx.createGain();

      subOsc.type = 'triangle';
      
      // Deeper base frequency for a larger ball to give it massive, physical low-end weight
      const baseSubFreq = Math.max(30, 65 / Math.sqrt(sizeRatio));
      const endSubFreq = Math.max(60, 140 / Math.sqrt(sizeRatio));
      
      subOsc.frequency.setValueAtTime(baseSubFreq, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(endSubFreq, startTime + duration * 0.8);

      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(baseSubFreq * 3.0, startTime);

      // Thicker bass weight for larger balls
      const baseBassGain = 0.09 + Math.min(0.08, (sizeRatio - 1.0) * 0.04);
      subGain.gain.setValueAtTime(baseBassGain, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(this.masterVolume!);

      // 3. Resonant ASMR acoustic crystal bell layer (sine ring)
      // Adds a gorgeous, high-end organic ring that aligns with the scale of the ball
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      
      chimeOsc.type = 'sine';
      // Harmonic series pitch (e.g., beautiful warm bell note) sliding down as ball grows
      const chimeFreq = Math.max(100, 330 / sizeRatio);
      chimeOsc.frequency.setValueAtTime(chimeFreq, startTime);
      
      // Chime volume is clean and subtle to prevent high frequency noise
      const chimeVolume = 0.05 + Math.min(0.05, (sizeRatio - 1.0) * 0.02);
      chimeGain.gain.setValueAtTime(chimeVolume, startTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.9);
      
      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterVolume!);

      // Trigger all layers
      noiseNode.start(startTime);
      subOsc.start(startTime);
      chimeOsc.start(startTime);

      noiseNode.stop(startTime + duration + 0.05);
      subOsc.stop(startTime + duration + 0.05);
      chimeOsc.stop(startTime + duration + 0.05);

    } catch (err) {
      // Safe fallback
    }
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

  /**
   * Play an extremely relaxing, layered ASMR swelling and crystalline chimes sound for the tile rebuild animation.
   * A gentle warm wave whoosh with a resonant sweep, followed by cascading physical crystal pops as tiles restore.
   */
  public playRebuildWave() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 1.9; // Matches the longer 2.0s rebuild animation

      // --- LAYER 1: Deep Warm Wave Pressure Swell ---
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle'; // softer and warmer than sawtooth, fuller than pure sine
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + duration * 0.7);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + duration * 0.7);
      filter.Q.setValueAtTime(1.5, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.5); // swelling up smoothly
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // smooth decaying tail

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start(now);
      osc.stop(now + duration + 0.05);

      // --- LAYER 2: Staggered Crystalline Chimes (Pentatonic Ripple) ---
      // These trigger in a cascading sequence representing the tiles sweeping outward from the center
      const chimeNotes = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        392.00, // G4
        440.00, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
      ];

      const startTimeOffset = 0.3; // Starts shortly after the swell begins
      const spacing = 0.15;        // Stagger spacing

      chimeNotes.forEach((freq, idx) => {
        const chimeOsc = this.ctx!.createOscillator();
        const chimeGain = this.ctx!.createGain();
        const chimeTime = now + startTimeOffset + idx * spacing;
        const chimeDecay = 0.7; // beautiful long ring

        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, chimeTime);

        // Gentle high frequency detune for rich celestial character
        chimeOsc.detune.setValueAtTime((Math.random() - 0.5) * 6, chimeTime);

        chimeGain.gain.setValueAtTime(0, now);
        chimeGain.gain.setValueAtTime(0, chimeTime);
        chimeGain.gain.linearRampToValueAtTime(0.045, chimeTime + 0.01); // ultra-fast attack
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + chimeDecay);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.masterVolume!);

        chimeOsc.start(chimeTime);
        chimeOsc.stop(chimeTime + chimeDecay + 0.05);
      });

    } catch (e) {
      // safe fallback
    }
  }

  /**
   * Continuous relaxing ASMR ambient background synthesis (Rainfall & Ocean Waves).
   */
  public startAmbient() {
    if (this.isAmbientRunning || !this.ctx || !this.masterVolume) return;
    this.isAmbientRunning = true;

    try {
      // 1. Create white noise buffer
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Generate pink-ish noise (softer and deeper than white noise, perfect for rain/waves)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // normalise/scale to keeps peaks safe
        b6 = white * 0.115926;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      // Filter to shape into a warm, cozy rain shower / distant ocean
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, this.ctx.currentTime); // Low soothing frequencies
      filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.007, this.ctx.currentTime); // Subtle, ambient ocean roar

      // Create a slow breathing LFO to simulate rising and falling ocean wave swells
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.06, this.ctx.currentTime); // Slow 16s breathing cycle

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(140, this.ctx.currentTime); // Swells filter cutoff

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterVolume);

      noiseNode.start();
      lfo.start();

      this.ambientNoiseSource = noiseNode;
      this.ambientLfo = lfo;

      // 3. Trigger randomized soothing ASMR water droplet sounds
      const triggerNextDroplet = () => {
        if (!this.isMuted) {
          this.playSoftASMRDroplet();
        }
        // Warm organic droplet drops every 4.5 to 8.5 seconds
        const nextDelay = 4500 + Math.random() * 4000;
        this.ambientTimer = setTimeout(triggerNextDroplet, nextDelay);
      };
      
      this.ambientTimer = setTimeout(triggerNextDroplet, 3000);

    } catch (err) {
      console.warn("ASMR background sound initialization omitted.", err);
    }
  }

  /**
   * Extremely satisfying, deep ASMR water drop sound ("plop").
   * Simulates a heavy droplet falling onto a quiet pool of water.
   */
  public playSoftASMRDroplet() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      
      // Starts around 220Hz and drops very quickly to 80Hz for an organic organic plop shape
      const startTime = this.ctx.currentTime;
      osc.frequency.setValueAtTime(230, startTime);
      osc.frequency.exponentialRampToValueAtTime(70, startTime + 0.16);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.022, startTime + 0.02); // gentle pop-free rise
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3); // rapid organic dissipation

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start();
      osc.stop(startTime + 0.35);
    } catch (e) {
      // safe fallback
    }
  }

  /**
   * Play a classic high-pitched sizzling white noise fuse burning sound ("sssss...").
   */
  public playTntFuse() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const startTime = this.ctx.currentTime;
      const duration = 1.0; // Fuse burns for 1.0s before exploding

      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, startTime);

      // Low-frequency oscillation for sizzling texture
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(15, startTime); // 15Hz sizzle
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(2000, startTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + duration * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume!);

      lfo.start(startTime);
      noiseNode.start(startTime);

      lfo.stop(startTime + duration + 0.05);
      noiseNode.stop(startTime + duration + 0.05);
    } catch (e) {
      // safe fallback
    }
  }

  /**
   * Play a massive, deep, pixelated lowpass-filtered noise explosion with a sharp pop!
   */
  public playTntExplosion() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const startTime = this.ctx.currentTime;
      const duration = 1.2;

      // 1. Heavy bass thud oscillator
      const subOsc = this.ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(120, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(30, startTime + 0.25);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.25, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

      subOsc.connect(subGain);
      subGain.connect(this.masterVolume!);
      subOsc.start(startTime);
      subOsc.stop(startTime + 0.45);

      // 2. White noise explosion rumble with high-frequency pop at beginning
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(800, startTime);
      lowpass.frequency.exponentialRampToValueAtTime(40, startTime + duration * 0.8);
      lowpass.Q.setValueAtTime(3.0, startTime); // resonant rumble

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, startTime); // punchy start
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      noiseNode.connect(lowpass);
      lowpass.connect(noiseGain);
      noiseGain.connect(this.masterVolume!);

      noiseNode.start(startTime);
      noiseNode.stop(startTime + duration + 0.05);
    } catch (e) {
      // safe fallback
    }
  }
}

export const audioSynth = new AudioSynthesizer();
