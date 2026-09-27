type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

interface SoundOptions {
  frequency?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  decay?: number;
  startTime?: number;
}

class SoundEngine {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 0.25;
  private ambientEnabled: boolean = false;
  private ambientOscillator: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAmbient();
    }
  }

  setAmbientEnabled(enabled: boolean) {
    this.ambientEnabled = enabled;
    if (enabled) {
      this.startAmbient();
    } else {
      this.stopAmbient();
    }
  }

  getAmbientEnabled(): boolean {
    return this.ambientEnabled;
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.masterVolume * 0.03;
    }
  }

  playTone(options: SoundOptions) {
    if (!this.enabled) return;

    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type || "sine";
    osc.frequency.value = options.frequency || 440;

    const now = ctx.currentTime;
    const attack = options.attack || 0.01;
    const decay = options.decay || options.duration || 0.2;
    const volume = (options.volume || 0.5) * this.masterVolume;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + decay + 0.1);
  }

  playClick() {
    this.playTone({ frequency: 800, duration: 0.08, type: "square", volume: 0.3 });
  }

  playSuccess() {
    this.playTone({ frequency: 523, duration: 0.15, type: "sine", volume: 0.4 });
    setTimeout(() => this.playTone({ frequency: 659, duration: 0.15, type: "sine", volume: 0.4 }), 80);
    setTimeout(() => this.playTone({ frequency: 784, duration: 0.25, type: "sine", volume: 0.4 }), 160);
  }

  playFailure() {
    this.playTone({ frequency: 200, duration: 0.3, type: "sawtooth", volume: 0.4 });
    setTimeout(() => this.playTone({ frequency: 150, duration: 0.3, type: "sawtooth", volume: 0.3 }), 100);
  }

  playWarning() {
    this.playTone({ frequency: 400, duration: 0.15, type: "square", volume: 0.4 });
    setTimeout(() => this.playTone({ frequency: 300, duration: 0.15, type: "square", volume: 0.4 }), 150);
  }

  playTerminal() {
    this.playTone({ frequency: 600, duration: 0.05, type: "square", volume: 0.2 });
    setTimeout(() => this.playTone({ frequency: 800, duration: 0.05, type: "square", volume: 0.2 }), 50);
    setTimeout(() => this.playTone({ frequency: 1000, duration: 0.05, type: "square", volume: 0.2 }), 100);
  }

  playScan() {
    this.playTone({ frequency: 1200, duration: 0.1, type: "sine", volume: 0.25, attack: 0.02, decay: 0.1 });
  }

  playUnlock() {
    this.playTone({ frequency: 440, duration: 0.1, type: "sine", volume: 0.3 });
    setTimeout(() => this.playTone({ frequency: 554, duration: 0.1, type: "sine", volume: 0.3 }), 80);
    setTimeout(() => this.playTone({ frequency: 659, duration: 0.2, type: "sine", volume: 0.4 }), 160);
  }

  startAmbient() {
    if (!this.enabled || this.ambientOscillator) return;

    const ctx = this.getContext();
    this.ambientOscillator = ctx.createOscillator();
    this.ambientGain = ctx.createGain();

    this.ambientOscillator.type = "sine";
    this.ambientOscillator.frequency.value = 55;

    this.ambientGain.gain.value = this.masterVolume * 0.05;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambientOscillator.frequency);

    this.ambientOscillator.connect(this.ambientGain);
    this.ambientGain.connect(ctx.destination);

    this.ambientOscillator.start();
    lfo.start();
  }

  stopAmbient() {
    if (this.ambientOscillator) {
      this.ambientOscillator.stop();
      this.ambientOscillator.disconnect();
      this.ambientOscillator = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
  }

  playLocationEnter() {
    this.playTone({ frequency: 300, duration: 0.1, type: "sine", volume: 0.2 });
    setTimeout(() => this.playTone({ frequency: 400, duration: 0.1, type: "sine", volume: 0.2 }), 60);
    setTimeout(() => this.playTone({ frequency: 500, duration: 0.15, type: "sine", volume: 0.25 }), 120);
  }

  playObjectiveComplete() {
    this.playTone({ frequency: 523, duration: 0.1, type: "sine", volume: 0.4 });
    setTimeout(() => this.playTone({ frequency: 659, duration: 0.1, type: "sine", volume: 0.4 }), 80);
    setTimeout(() => this.playTone({ frequency: 784, duration: 0.1, type: "sine", volume: 0.4 }), 160);
    setTimeout(() => this.playTone({ frequency: 1047, duration: 0.3, type: "sine", volume: 0.5 }), 240);
  }
}

export const soundEngine = new SoundEngine();