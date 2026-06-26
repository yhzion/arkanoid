import { GameEvents } from './events.js';

// Simple Web-Audio chiptune fallback with voice stealing priority (PRD §17.4, §17.5).
export class AudioEngine {
  constructor(bus) {
    this.bus = bus;
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.musicVol = 0.4;
    this.sfxVol = 0.4;
    this.muted = false;
    this._musicNodes = [];
    this._wireEvents();
  }

  unlock() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this._applyVolumes();
  }

  setVolumes(master, music, sfx) {
    this.musicVol = music ?? this.musicVol;
    this.sfxVol = sfx ?? this.sfxVol;
    this._applyVolumes();
  }

  setMuted(m) {
    this.muted = m;
    this._applyVolumes();
  }

  setEnabled(en) {
    this.enabled = en;
    if (en && !this.ctx) this.unlock();
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this.master) return;
    const m = this.enabled && !this.muted ? 1 : 0;
    this.master.gain.setTargetAtTime(m * 0.8, this.ctx.currentTime, 0.01);
  }

  _now() { return this.ctx ? this.ctx.currentTime : 0; }

  playTone(freq, durationMs, type = 'square', vol = 0.15, when = null) {
    if (!this.ctx || !this.enabled || this.muted) return;
    const t = when ?? this._now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + durationMs / 1000 + 0.02);
  }

  playNoise(durationMs, vol = 0.1) {
    if (!this.ctx || !this.enabled || this.muted) return;
    const t = this._now();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * (durationMs / 1000), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
    src.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  _wireEvents() {
    const on = (ev, fn) => this.bus.on(ev, fn);
    on(GameEvents.BALL_LAUNCHED, () => this.playTone(880, 80, 'square'));
    on(GameEvents.BRICK_HIT, () => this.playTone(600, 40, 'square', 0.08));
    on(GameEvents.BRICK_DESTROYED, ({ type }) => {
      if (type === 'SILVER') this.playTone(400, 60, 'square', 0.12);
      else if (type === 'GOLD') this.playNoise(50, 0.1);
      else this.playTone(700 + Math.random() * 200, 60, 'square', 0.1);
    });
    on(GameEvents.CAPSULE_COLLECTED, () => this.playTone(1200, 80, 'square', 0.12));
    on(GameEvents.LASER_FIRED, () => this.playTone(1600, 40, 'square', 0.08));
    on(GameEvents.ENEMY_DESTROYED, () => this.playNoise(80, 0.12));
    on(GameEvents.EXTRA_LIFE_AWARDED, () => {
      this.playTone(1200, 100, 'square', 0.15);
      setTimeout(() => this.playTone(1500, 120, 'square', 0.15), 100);
    });
    on(GameEvents.LIFE_LOST, () => {
      this.playNoise(200, 0.2);
      this.playTone(200, 250, 'sawtooth', 0.15);
    });
    on(GameEvents.ROUND_CLEARED, () => {
      [440, 554, 659, 880].forEach((f, i) => this.playTone(f, 120, 'square', 0.12, this._now() + i * 0.12));
    });
    on(GameEvents.BOSS_HIT, () => this.playTone(300, 100, 'square', 0.2));
    on(GameEvents.BOSS_DEFEATED, () => {
      [330, 392, 494, 659, 880].forEach((f, i) => this.playTone(f, 180, 'square', 0.15, this._now() + i * 0.12));
    });
  }
}
