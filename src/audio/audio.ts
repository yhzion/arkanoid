/**
 * Audio engine — PRD §17.4, §17.5; design: audio.md.
 *
 * Web Audio API with master/music/sfx volume, mute, autoplay unlock, and a
 * pre-decoded buffer cache. Clean-room fallback synthesizes NES-inspired cues on 4
 * emulated APU channels (Pulse1, Pulse2, Triangle, Noise) with voice stealing: SFX
 * take priority and hijack their channel from BGM until the SFX finishes (§17.5).
 *
 * The complete event→SFX cue-sheet is [DEFERRED → M4] (§17.3); this engine provides
 * the infrastructure + generic cue trigger. In non-DOM runtimes (Node/tests) it
 * degrades to a no-op so the sim stays runnable (§20.5 graceful degradation).
 */
import { GameConfig } from '../core/config';
import { EventBus, GameEvents } from '../core/eventBus';

/** NES APU channel emulation targets (§17.5). */
export type AudioChannel = 'pulse1' | 'pulse2' | 'triangle' | 'noise';

interface ActiveVoice {
  channel: AudioChannel;
  stopAt: number;
}

export interface AudioEngine {
  init(config: GameConfig): Promise<void>;
  unlock(): Promise<void>;
  preloadRound(roundId: number): Promise<void>;
  setMasterVolume(v: number): void;
  setMusicVolume(v: number): void;
  setSfxVolume(v: number): void;
  setMuted(muted: boolean): void;
  /** Trigger a named cue (SFX name per §17.3, or BGM state cue). */
  playSfx(name: string): void;
}

/** SFX → channel assignment (§17.5 voice-steal table, provisional). */
const SFX_CHANNEL: Record<string, AudioChannel> = {
  ballLaunch: 'pulse1',
  paddleHit: 'pulse2',
  wallHit: 'triangle',
  brickHit: 'pulse1',
  brickDestroy: 'pulse2',
  capsuleSpawn: 'triangle',
  capsuleCollect: 'pulse2',
  laserFire: 'noise',
  laserHit: 'noise',
  enemySpawn: 'triangle',
  enemyDestroy: 'noise',
  extraLife: 'pulse1',
  roundClear: 'pulse1',
  bossHit: 'noise',
  gameOver: 'triangle',
};

export class WebAudioEngine implements AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private masterVol = 1;
  private musicVol = 0.7;
  private sfxVol = 0.8;
  private voices: Partial<Record<AudioChannel, ActiveVoice>> = {};
  // Pre-decoded SFX buffers (populated by preloadRound in licensed mode) would live
  // here; clean-room synth needs none. Intentionally omitted until the cue-sheet
  // lands (§17.3 [DEFERRED → M4]).

  async init(config: GameConfig): Promise<void> {
    this.masterVol = 1;
    this.musicVol = config.musicVolume;
    this.sfxVol = config.sfxVolume;
    this.muted = !config.audioEnabled;
    // AudioContext is created lazily on unlock (autoplay policy).
  }

  async unlock(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctor = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return; // unsupported → graceful no-op
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
  }

  async preloadRound(_roundId: number): Promise<void> {
    // Pre-decode + cache SFX buffers for the round (§17.4). For clean-room mode the
    // synth path needs no buffers; licensed mode would fetch decoded packs here.
    // Implementation detail deferred with the cue-sheet (§17.3).
  }

  setMasterVolume(v: number): void {
    this.masterVol = v;
    this.applyVolumes();
  }
  setMusicVolume(v: number): void {
    this.musicVol = v;
    this.applyVolumes();
  }
  setSfxVolume(v: number): void {
    this.sfxVol = v;
    this.applyVolumes();
  }
  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.master || !this.musicGain || !this.sfxGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.muted ? 0 : this.masterVol;
    this.master.gain.setValueAtTime(m, t);
    this.musicGain.gain.setValueAtTime(this.muted ? 0 : this.musicVol, t);
    this.sfxGain.gain.setValueAtTime(this.muted ? 0 : this.sfxVol, t);
  }

  /** Trigger a synthesized SFX cue (clean-room §17.5). Voice-steals its channel. */
  playSfx(name: string): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const channel = SFX_CHANNEL[name] ?? 'pulse2';
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 0.12;
    // Voice steal: if the channel is busy, let the new SFX take over (§17.5).
    this.voices[channel] = { channel, stopAt: now + dur };

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const type: OscillatorType = channel === 'noise' ? 'square' : channel === 'triangle' ? 'triangle' : 'square';
    osc.type = type;
    osc.frequency.setValueAtTime(this.cueFreq(name), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur);
  }

  private cueFreq(name: string): number {
    // Provisional clean-room pitches (functional role only, §17.5).
    const map: Record<string, number> = {
      ballLaunch: 660,
      paddleHit: 440,
      wallHit: 220,
      brickHit: 880,
      brickDestroy: 990,
      capsuleSpawn: 550,
      capsuleCollect: 770,
      laserFire: 1200,
      laserHit: 300,
      enemySpawn: 330,
      enemyDestroy: 200,
      extraLife: 1320,
      roundClear: 990,
      bossHit: 250,
      gameOver: 160,
    };
    return map[name] ?? 440;
  }
}

/**
 * Wire the audio engine to the EventBus: map §17.3 game events to SFX cues.
 */
export function wireAudioToBus(audio: AudioEngine, bus: EventBus): () => void {
  const map: [GameEvents, string][] = [
    [GameEvents.BALL_LAUNCHED, 'ballLaunch'],
    [GameEvents.BRICK_HIT, 'brickHit'],
    [GameEvents.BRICK_DESTROYED, 'brickDestroy'],
    [GameEvents.CAPSULE_SPAWNED, 'capsuleSpawn'],
    [GameEvents.CAPSULE_COLLECTED, 'capsuleCollect'],
    [GameEvents.LASER_FIRED, 'laserFire'],
    [GameEvents.ENEMY_SPAWNED, 'enemySpawn'],
    [GameEvents.ENEMY_DESTROYED, 'enemyDestroy'],
    [GameEvents.EXTRA_LIFE_AWARDED, 'extraLife'],
    [GameEvents.ROUND_CLEARED, 'roundClear'],
    [GameEvents.BOSS_HIT, 'bossHit'],
    [GameEvents.GAME_OVER, 'gameOver'],
  ];
  const offs = map.map(([ev, cue]) => bus.on(ev, () => audio.playSfx(cue)));
  return () => offs.forEach((off) => off());
}
