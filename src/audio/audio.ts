import { GameConfig } from '../data/levelSchema';
import { EventBus, GameEvents } from '../core/eventBus';

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private config: GameConfig | null = null;
    private isMuted: boolean = false;
    private noiseBuffer: AudioBuffer | null = null;

    constructor() {
        // Setup listeners on the EventBus
        this.registerEvents();
    }

    public async init(config: GameConfig): Promise<void> {
        this.config = config;
        this.isMuted = !config.audioEnabled;
    }

    public async unlock(): Promise<void> {
        if (this.ctx) return;

        // Initialize AudioContext on first user interaction
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();

        // Create gain nodes for routing
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        // Connect nodes
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Set volumes based on config
        if (this.config) {
            this.setMasterVolume(this.isMuted ? 0 : 1);
            this.setMusicVolume(this.config.musicVolume);
            this.setSfxVolume(this.config.sfxVolume);
        }

        // Generate white noise buffer for explosion sounds
        this.generateNoiseBuffer();

        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    private generateNoiseBuffer(): void {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }

    public setMasterVolume(v: number): void {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
        }
    }

    public setMusicVolume(v: number): void {
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(v, this.ctx.currentTime);
        }
    }

    public setSfxVolume(v: number): void {
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(v, this.ctx.currentTime);
        }
    }

    public setMuted(muted: boolean): void {
        this.isMuted = muted;
        this.setMasterVolume(muted ? 0 : 1);
    }

    // --- Synthesizer Helpers ---

    private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.5, freqEnd?: number): void {
        if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        if (freqEnd !== undefined) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        if (this.sfxGain) {
            gain.connect(this.sfxGain);
        }

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    private playNoise(duration: number, volume: number = 0.5, bandpassFreq?: number): void {
        if (!this.ctx || !this.noiseBuffer || this.isMuted || this.ctx.state === 'suspended') return;

        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        let finalNode: AudioNode = source;

        if (bandpassFreq !== undefined) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(bandpassFreq, this.ctx.currentTime);
            filter.Q.setValueAtTime(1, this.ctx.currentTime);
            source.connect(filter);
            finalNode = filter;
        }

        finalNode.connect(gain);
        if (this.sfxGain) {
            gain.connect(this.sfxGain);
        }

        source.start();
        source.stop(this.ctx.currentTime + duration);
    }

    // --- SFX Playback ---

    public playLaserSFX(): void {
        // Twin lasers: sweep 1200 Hz to 200 Hz twice rapidly
        this.playTone(1200, 'square', 0.12, 0.25, 200);
    }

    public playBounceSFX(): void {
        // Triangle wave at 440 Hz (A4)
        this.playTone(440, 'triangle', 0.08, 0.4);
    }

    public playBrickHitSFX(type: string): void {
        if (type === 'GOLD') {
            // Metallic ring
            this.playTone(987, 'sine', 0.1, 0.3, 800);
        } else {
            // Short pulse thud
            this.playTone(150, 'square', 0.05, 0.3);
        }
    }

    public playBrickDestroyedSFX(type: string): void {
        if (type === 'SILVER') {
            // Metallic crash
            this.playTone(600, 'square', 0.2, 0.3, 100);
            this.playNoise(0.25, 0.3, 1500);
        } else {
            // Standard brick explosion
            this.playNoise(0.18, 0.4, 800);
        }
    }

    public playLaunchSFX(): void {
        // Sweep up 300 to 900
        this.playTone(300, 'triangle', 0.15, 0.3, 900);
    }

    public playCapsuleCollectSFX(): void {
        // Ascending bubbly sweep
        this.playTone(523.25, 'triangle', 0.08, 0.3, 1046.50);
    }

    public playExtraLifeSFX(): void {
        // Classic 1-up
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const playT = (f: number, startOffset: number, dur: number) => {
            if (!this.ctx || !this.sfxGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + startOffset);
            gain.gain.setValueAtTime(0.2, now + startOffset);
            gain.gain.setValueAtTime(0.2, now + startOffset + dur - 0.02);
            gain.gain.linearRampToValueAtTime(0, now + startOffset + dur);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + startOffset);
            osc.stop(now + startOffset + dur);
        };
        playT(330, 0, 0.1);
        playT(392, 0.1, 0.1);
        playT(659, 0.2, 0.1);
        playT(523, 0.3, 0.1);
        playT(587, 0.4, 0.1);
        playT(784, 0.5, 0.25);
    }

    public playVausDeathSFX(): void {
        // Downward rumble
        this.playNoise(0.6, 0.5, 200);
        this.playTone(180, 'sawtooth', 0.6, 0.3, 40);
    }

    public playWarpSFX(): void {
        // Sci-fi sweep
        this.playTone(100, 'sine', 0.4, 0.3, 2000);
    }

    public playBossHitSFX(): void {
        this.playTone(200, 'sawtooth', 0.1, 0.3, 80);
    }

    // --- BGM Jingles ---

    public playRoundStartJingle(): void {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Simple 4-note retro cue
        const playTone = (f: number, start: number, dur: number) => {
            if (!this.ctx || !this.musicGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + start);
            gain.gain.setValueAtTime(0.2, now + start);
            gain.gain.setValueAtTime(0.2, now + start + dur - 0.02);
            gain.gain.linearRampToValueAtTime(0, now + start + dur);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + start);
            osc.stop(now + start + dur);
        };
        playTone(261.63, 0, 0.15); // C4
        playTone(329.63, 0.15, 0.15); // E4
        playTone(392.00, 0.3, 0.15); // G4
        playTone(523.25, 0.45, 0.4); // C5
    }

    public playGameOverJingle(): void {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Sad descending cue
        const playTone = (f: number, start: number, dur: number) => {
            if (!this.ctx || !this.musicGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + start);
            gain.gain.setValueAtTime(0.25, now + start);
            gain.gain.linearRampToValueAtTime(0.01, now + start + dur);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + start);
            osc.stop(now + start + dur);
        };
        playTone(392.00, 0, 0.2); // G4
        playTone(349.23, 0.2, 0.2); // F4
        playTone(311.13, 0.4, 0.2); // Eb4
        playTone(246.94, 0.6, 0.5); // B3
    }

    public playVictoryJingle(): void {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Triumphant fanfare
        const playTone = (f: number, start: number, dur: number) => {
            if (!this.ctx || !this.musicGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + start);
            gain.gain.setValueAtTime(0.2, now + start);
            gain.gain.setValueAtTime(0.2, now + start + dur - 0.02);
            gain.gain.linearRampToValueAtTime(0, now + start + dur);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + start);
            osc.stop(now + start + dur);
        };
        playTone(523.25, 0, 0.15); // C5
        playTone(523.25, 0.15, 0.1);
        playTone(523.25, 0.25, 0.1);
        playTone(523.25, 0.35, 0.25);
        playTone(415.30, 0.6, 0.25); // Ab4
        playTone(466.16, 0.85, 0.25); // Bb4
        playTone(523.25, 1.1, 0.6); // C5
    }

    private registerEvents(): void {
        // Subscribe to relevant EventBus cues
        EventBus.on(GameEvents.BALL_LAUNCHED, () => this.playLaunchSFX());
        EventBus.on(GameEvents.BRICK_HIT, (payload) => {
            if (payload && payload.type) {
                this.playBrickHitSFX(payload.type);
            } else {
                this.playBounceSFX();
            }
        });
        EventBus.on(GameEvents.BRICK_DESTROYED, (payload) => {
            if (payload && payload.type) {
                this.playBrickDestroyedSFX(payload.type);
            }
        });
        EventBus.on(GameEvents.LASER_FIRED, () => this.playLaserSFX());
        EventBus.on(GameEvents.CAPSULE_COLLECTED, () => this.playCapsuleCollectSFX());
        EventBus.on(GameEvents.EXTRA_LIFE_AWARDED, () => this.playExtraLifeSFX());
        EventBus.on(GameEvents.LIFE_LOST, () => this.playVausDeathSFX());
        EventBus.on(GameEvents.ROUND_STARTED, () => this.playRoundStartJingle());
        EventBus.on(GameEvents.ROUND_CLEARED, () => this.playVictoryJingle());
        EventBus.on(GameEvents.BREAK_WARP_ENTERED, () => this.playWarpSFX());
        EventBus.on(GameEvents.BOSS_HIT, () => this.playBossHitSFX());
        EventBus.on(GameEvents.GAME_OVER, () => this.playGameOverJingle());
    }
}

export const Audio = new AudioEngine();
export default Audio;
