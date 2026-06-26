// PRD §17.4: Web Audio API engine
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;

  async init(): Promise<void> {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.masterGain.gain.value = 0.8;
    this.musicGain.gain.value = 0.6;
    this.sfxGain.gain.value = 0.8;
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setMusicVolume(v: number): void {
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.8;
    }
  }

  // Simple tone-based SFX
  playSfx(type: string): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    switch (type) {
      case 'ball_hit':
        osc.frequency.value = 440;
        osc.type = 'square';
        break;
      case 'brick_hit':
        osc.frequency.value = 880;
        osc.type = 'square';
        break;
      case 'paddle_hit':
        osc.frequency.value = 220;
        osc.type = 'triangle';
        break;
      case 'capsule':
        osc.frequency.value = 660;
        osc.type = 'sine';
        break;
      case 'laser':
        osc.frequency.value = 1200;
        osc.type = 'sawtooth';
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        break;
      case 'game_over':
        osc.frequency.value = 110;
        osc.type = 'square';
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        break;
      case 'round_clear':
        osc.frequency.value = 523;
        osc.type = 'sine';
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        break;
      default:
        osc.frequency.value = 440;
        osc.type = 'square';
    }

    osc.start(now);
    osc.stop(now + 0.5);
  }
}