import { InputSnapshot } from '../input/input';

// Canonical replay schema (docs/qa/replay_format.md, PRD §19.4.1 / §30.6).
// inputTicks is a DENSE log: exactly one record per tick, tick === array index.
export interface IFrameInput {
    tick: number; // equals array index
    input: {
        left: boolean;
        right: boolean;
        fire: boolean;
        start?: boolean;
        paddleX?: number; // integer logical pixels, quantized before sim (§30.6)
    };
}

export interface IReplayLog {
    formatVersion: number;
    gameVersion: string;
    region: 'US' | 'JP';
    mode: 'licensed-fidelity' | 'clean-room';
    seed: string;
    startRound: number;
    configHash: string;
    deflectionModel: 'continuous' | 'discrete8';
    jitterEnabled: boolean;
    numericModel: string;
    prngState: string[]; // mulberry32 state per active stream (one per player in 2P)
    inputTicks: IFrameInput[];
}

const NEUTRAL_PADDLE_X = 128;

export class ReplaySystem {
    // Bump on any determinism-breaking change (§30.7).
    public static readonly FORMAT_VERSION = 1;

    private recording: boolean = false;
    private playing: boolean = false;

    private recordedInputs: IFrameInput[] = [];
    private playbackInputs: IFrameInput[] = [];

    constructor() {}

    public startRecording(): void {
        this.recordedInputs = [];
        this.recording = true;
        this.playing = false;
    }

    public recordTick(tick: number, snapshot: InputSnapshot): void {
        if (!this.recording) return;

        this.recordedInputs.push({
            tick,
            input: {
                left: snapshot.left,
                right: snapshot.right,
                fire: snapshot.fire,
                start: snapshot.start,
                // Quantize the analog pointer position to integer logical pixels (§30.6).
                paddleX: Math.round(snapshot.pointerXAbsolute),
            },
        });
    }

    public stopRecording(): IFrameInput[] {
        this.recording = false;
        return this.recordedInputs;
    }

    /**
     * Load and validate an untrusted replay before playback (§19.4.1, §30.7).
     * Rejects (throws) on formatVersion/configHash mismatch or a non-dense log.
     */
    public loadReplay(replayData: IReplayLog, expectedConfigHash: string): void {
        if (!replayData || typeof replayData !== 'object') {
            throw new Error('Replay rejected: payload is not an object.');
        }
        if (replayData.formatVersion !== ReplaySystem.FORMAT_VERSION) {
            throw new Error(
                `Replay rejected: formatVersion ${replayData.formatVersion} !== ${ReplaySystem.FORMAT_VERSION}.`
            );
        }
        if (replayData.configHash !== expectedConfigHash) {
            throw new Error('Replay rejected: configHash mismatch.');
        }
        if (!Array.isArray(replayData.inputTicks)) {
            throw new Error('Replay rejected: inputTicks missing or not an array.');
        }
        // Enforce the dense-log invariant: tick === array index (§30.6).
        for (let i = 0; i < replayData.inputTicks.length; i++) {
            const rec = replayData.inputTicks[i];
            if (!rec || rec.tick !== i || !rec.input) {
                throw new Error(`Replay rejected: not dense at index ${i} (tick=${rec?.tick}).`);
            }
        }

        this.playbackInputs = replayData.inputTicks;
        this.playing = true;
        this.recording = false;
    }

    public playTick(tick: number): InputSnapshot | null {
        if (!this.playing) return null;

        // Replay exhausted -> stop cleanly.
        if (tick >= this.playbackInputs.length) {
            this.playing = false;
            return null;
        }

        // Dense log: index === tick. A mismatch is a desync, surfaced loudly
        // rather than masked with neutral input.
        const record = this.playbackInputs[tick];
        if (record.tick !== tick) {
            throw new Error(
                `Replay desync: expected tick ${tick}, got ${record.tick}.`
            );
        }

        const paddleX = record.input.paddleX ?? NEUTRAL_PADDLE_X;
        return {
            left: record.input.left,
            right: record.input.right,
            fire: record.input.fire,
            start: record.input.start ?? false,
            select: false,
            pointerXDelta: 0,
            pointerXAbsolute: paddleX,
            pointerClicked: record.input.fire,
        };
    }

    public stopPlayback(): void {
        this.playing = false;
    }

    public isRecording(): boolean {
        return this.recording;
    }

    public isPlaying(): boolean {
        return this.playing;
    }

    /**
     * Compute SHA-256 of the canonical configuration settings (§30.7).
     */
    public static async computeConfigHash(
        region: string,
        mode: string,
        deflectionModel: string,
        jitterEnabled: boolean,
        numericModel: string,
        levelHashes: string[]
    ): Promise<string> {
        // Create canonical JSON structure (sorted keys, no spaces)
        const canonicalConfig = {
            deflectionModel,
            jitterEnabled,
            levelHashes: [...levelHashes].sort(),
            mode,
            numericModel,
            region,
        };

        const jsonString = JSON.stringify(canonicalConfig);

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(jsonString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (e) {
            console.error('Crypto subtle not supported. Falling back to a simple string hash code.', e);
            // Simple fallback hash for environments where Web Crypto is blocked
            let hash = 0;
            for (let i = 0; i < jsonString.length; i++) {
                hash = (hash << 5) - hash + jsonString.charCodeAt(i);
                hash |= 0;
            }
            return 'fallback-' + Math.abs(hash).toString(16);
        }
    }
}
export default ReplaySystem;
