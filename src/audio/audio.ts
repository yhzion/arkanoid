export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private unlocked = false;

  masterVolume = 0.8;
  musicVolume = 0.6;
  sfxVolume = 0.8;
  muted = false;

  async unlock() {
    if (this.unlocked) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.updateVolumes();
    this.unlocked = true;
  }

  updateVolumes() {
    if (!this.masterGain) return;
    const m = this.muted ? 0 : this.masterVolume;
    this.masterGain.gain.value = m;
    this.musicGain!.gain.value = this.musicVolume;
    this.sfxGain!.gain.value = this.sfxVolume;
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'square') {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  sfx(name: string) {
    switch (name) {
      case 'ball_launch': this.playTone(440, 0.1); break;
      case 'paddle_hit': this.playTone(330, 0.05); break;
      case 'wall_hit': this.playTone(220, 0.03); break;
      case 'brick_hit': this.playTone(550, 0.05); break;
      case 'brick_destroy': this.playTone(660, 0.08); break;
      case 'silver_hit': this.playTone(880, 0.06); break;
      case 'gold_hit': this.playTone(110, 0.04); break;
      case 'capsule_collect': this.playTone(770, 0.1, 'sine'); break;
      case 'laser_fire': this.playNoise(0.05); break;
      case 'laser_hit': this.playTone(400, 0.04); break;
      case 'enemy_destroy': this.playTone(500, 0.1); break;
      case 'extra_life': this.playTone(880, 0.15, 'sine'); this.playTone(1100, 0.15, 'sine'); break;
      case 'vaus_destroy': this.playNoise(0.3); break;
      case 'round_clear': this.playTone(660, 0.1, 'sine'); this.playTone(880, 0.15, 'sine'); break;
      case 'boss_hit': this.playTone(200, 0.1); break;
      case 'boss_defeated': this.playNoise(0.5); break;
      case 'game_over': this.playTone(220, 0.2, 'sawtooth'); this.playTone(165, 0.3, 'sawtooth'); break;
      case 'pause': this.playTone(440, 0.05, 'sine'); break;
      case 'warp': this.playTone(1200, 0.2, 'sine'); break;
      default: this.playTone(440, 0.05); break;
    }
  }
}
