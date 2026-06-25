import { InputSnapshot } from '../input/input';

export interface IReplayInputRecord {
    tick: number;
    input: {
        left: boolean;
        right: boolean;
        fire: boolean;
        start: boolean;
        select: boolean;
        pointerXDelta: number;
        pointerXAbsolute: number;
    };
}

export interface IReplayData {
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
    prngState: number[]; // PRNG seed state(s)
    inputTicks: IReplayInputRecord[];
}

export class ReplaySystem {
    private recording: boolean = false;
    private playing: boolean = false;
    
    private recordedInputs: IReplayInputRecord[] = [];
    private playbackInputs: IReplayInputRecord[] = [];
    private playbackIndex: number = 0;

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
                select: snapshot.select,
                pointerXDelta: snapshot.pointerXDelta,
                pointerXAbsolute: snapshot.pointerXAbsolute
            }
        });
    }

    public stopRecording(): IReplayInputRecord[] {
        this.recording = false;
        return this.recordedInputs;
    }

    public startPlayback(replayData: IReplayData): void {
        this.playbackInputs = replayData.inputTicks;
        this.playbackIndex = 0;
        this.playing = true;
        this.recording = false;
    }

    public playTick(tick: number): InputSnapshot | null {
        if (!this.playing) return null;

        // Try to find the input record for the current tick
        const record = this.playbackInputs[this.playbackIndex];
        if (record && record.tick === tick) {
            this.playbackIndex++;
            return {
                left: record.input.left,
                right: record.input.right,
                fire: record.input.fire,
                start: record.input.start,
                select: record.input.select,
                pointerXDelta: record.input.pointerXDelta,
                pointerXAbsolute: record.input.pointerXAbsolute,
                pointerClicked: record.input.fire
            };
        }

        // If no record found for tick, return a neutral default input
        return {
            left: false,
            right: false,
            fire: false,
            start: false,
            select: false,
            pointerXDelta: 0,
            pointerXAbsolute: 128,
            pointerClicked: false
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
     * Compute SHA-256 of the canonical configuration settings.
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
            region
        };

        const jsonString = JSON.stringify(canonicalConfig);
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(jsonString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
