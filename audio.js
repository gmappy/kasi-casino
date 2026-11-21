// audio.js - Synthesized Sound FX using Web Audio API

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.2, decay = true) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      if (decay) {
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  // Card slide / deal sound
  playDeal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch (e) {}
  }

  // Card placed on table / snap
  playPlayCard() {
    this.playTone(320, 'triangle', 0.08, 0.25);
    this.playDeal();
  }

  // Capture / Chips chime
  playCapture() {
    if (!this.enabled) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.15, 0.15);
      }, idx * 45);
    });
  }

  // Build / Wooden lock tap
  playBuild() {
    this.playTone(220, 'square', 0.06, 0.18);
    setTimeout(() => {
      this.playTone(440, 'triangle', 0.1, 0.2);
    }, 50);
  }

  // Triumphant Sweep Fanfare
  playSweep() {
    if (!this.enabled) return;
    this.init();
    const fanfare = [
      { f: 440, d: 0.1 },
      { f: 554.37, d: 0.1 },
      { f: 659.25, d: 0.1 },
      { f: 880, d: 0.35 }
    ];
    let time = 0;
    fanfare.forEach(note => {
      setTimeout(() => {
        this.playTone(note.f, 'triangle', note.d, 0.3);
      }, time);
      time += note.d * 850;
    });
  }

  // Game Victory Fanfare
  playWin() {
    if (!this.enabled) return;
    this.init();
    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 'sine', 0.5, 0.25);
      }, i * 80);
    });
  }

  // Error / Invalid move
  playError() {
    this.playTone(150, 'sawtooth', 0.15, 0.2);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export const sound = new SoundEffects();
