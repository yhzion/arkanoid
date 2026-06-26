import { EventBus, GameEvent } from '../core/eventBus';
import { GameConfig } from '../data/levelSchema';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private config: GameConfig | null = null;
  private buffers = new Map<string, AudioBuffer>();

  async init(config: GameConfig): Promise<void> {
    this.config = config;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.applyConfig(config);
  }

  private applyConfig(config: GameConfig): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;
    this.muted = !config.audioEnabled;
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.musicGain.gain.value = config.musicVolume;
    this.sfxGain.gain.value = config.sfxVolume;
  }

  async unlock(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : v;
  }

  setMusicVolume(v: number): void {
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }

  preloadRound(roundId: number): void {
  }

  playSfx(name: string): void {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    gain.gain.value = 0.5;
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    const freq = SFX_FREQUENCIES[name] ?? 440;
    osc.frequency.value = freq;
    osc.type = 'square';
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playBgm(name: string): void {
  }

  stopBgm(): void {
  }

  destroy(): void {
    this.ctx?.close();
  }
}

const SFX_FREQUENCIES: Record<string, number> = {
  BALL_LAUNCHED: 880,
  BRICK_HIT: 440,
  BRICK_DESTROYED: 660,
  CAPSULE_COLLECTED: 550,
  LASER_FIRED: 1100,
  ENEMY_DESTROYED: 770,
  BALL_LOST: 220,
  LIFE_LOST: 110,
  ROUND_CLEARED: 990,
  GAME_OVER: 165,
  BOSS_HIT: 440,
  BOSS_DEFEATED: 1320,
  EXTRA_LIFE_AWARDED: 770,
  BREAK_WARP_ENTERED: 660,
};
