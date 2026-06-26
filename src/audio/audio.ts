import { eventBus, GameEvents } from '../core/EventBus';
import type { GameConfig } from '../core/GameConfig';

type AudioContextType = typeof AudioContext;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private config!: GameConfig;
  private initialized = false;
  private unlocked = false;

  async init(config: GameConfig): Promise<void> {
    this.config = config;
    const AC: AudioContextType = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.applyVolumes();
    this.initialized = true;
  }

  async unlock(): Promise<void> {
    if (!this.ctx || this.ctx.state === 'running') return;
    try {
      await this.ctx.resume();
      this.unlocked = true;
    } catch {}
  }

  private applyVolumes(): void {
    if (!this.masterGain || !this.musicGain || !this.sfxGain) return;
    this.masterGain.gain.value = this.config.audioEnabled ? 1 : 0;
    this.musicGain.gain.value = this.config.musicVolume;
    this.sfxGain.gain.value = this.config.sfxVolume;
  }

  setMasterVolume(v: number): void { this.config.audioEnabled = v > 0; if (this.masterGain) this.masterGain.gain.value = v; }
  setMusicVolume(v: number): void { this.config.musicVolume = v; if (this.musicGain) this.musicGain.gain.value = v; }
  setSfxVolume(v: number): void { this.config.sfxVolume = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMuted(m: boolean): void { this.config.audioEnabled = !m; if (this.masterGain) this.masterGain.gain.value = m ? 0 : 1; }

  preloadRound(_roundId: number): Promise<void> { return Promise.resolve(); }

  playTone(freq: number, duration: number, type: OscillatorType = 'square', vol = 0.3): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(vol, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration: number, vol = 0.2): void {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(vol, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(env);
    env.connect(this.sfxGain);
    src.start();
  }

  wireEvents(): void {
    const sfxMap: Array<[GameEvents, () => void]> = [
      [GameEvents.BALL_LAUNCHED, () => this.playTone(440, 0.1)],
      [GameEvents.BRICK_HIT, () => this.playTone(660, 0.05)],
      [GameEvents.BRICK_DESTROYED, () => this.playTone(880, 0.1)],
      [GameEvents.CAPSULE_SPAWNED, () => this.playTone(330, 0.08)],
      [GameEvents.CAPSULE_COLLECTED, () => this.playTone(550, 0.12)],
      [GameEvents.LASER_FIRED, () => this.playTone(1100, 0.05, 'square', 0.15)],
      [GameEvents.ENEMY_SPAWNED, () => this.playTone(220, 0.15, 'sawtooth', 0.1)],
      [GameEvents.ENEMY_DESTROYED, () => this.playTone(770, 0.1)],
      [GameEvents.BALL_LOST, () => this.playTone(200, 0.2, 'triangle', 0.3)],
      [GameEvents.LIFE_LOST, () => { this.playTone(150, 0.3, 'sawtooth', 0.3); }],
      [GameEvents.EXTRA_LIFE_AWARDED, () => { this.playTone(523, 0.1); this.playTone(659, 0.1); }],
      [GameEvents.ROUND_CLEARED, () => { this.playTone(440, 0.15); this.playTone(660, 0.15); this.playTone(880, 0.2); }],
      [GameEvents.BOSS_HIT, () => this.playNoise(0.1, 0.3)],
      [GameEvents.BOSS_PROJECTILE_FIRED, () => this.playTone(300, 0.1, 'sawtooth', 0.15)],
      [GameEvents.BOSS_DEFEATED, () => { this.playTone(440, 0.2); this.playTone(660, 0.2); this.playTone(880, 0.3); }],
      [GameEvents.GAME_OVER, () => { this.playTone(200, 0.3, 'triangle', 0.3); setTimeout(() => this.playTone(150, 0.5, 'triangle', 0.3), 300); }],
    ];
    for (const [event, play] of sfxMap) {
      eventBus.on(event, play);
    }
  }
}

export const audioEngine = new AudioEngine();
