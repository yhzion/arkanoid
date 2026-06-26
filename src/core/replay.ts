import { InputState } from '../input/input';

export interface ReplayHeader {
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
  prngState: number[];
}

export interface ReplayData {
  header: ReplayHeader;
  inputTicks: InputState[];
}

export class ReplayRecorder {
  private ticks: InputState[] = [];
  header: ReplayHeader;

  constructor(header: ReplayHeader) {
    this.header = header;
  }

  record(input: InputState) {
    this.ticks.push({ ...input });
  }

  export(): ReplayData {
    return { header: this.header, inputTicks: this.ticks };
  }

  toJSON(): string {
    return JSON.stringify(this.export());
  }
}

export class ReplayPlayer {
  private tickIndex = 0;
  private data: ReplayData;

  constructor(data: ReplayData) {
    this.data = data;
  }

  get header(): ReplayHeader { return this.data.header; }
  get finished(): boolean { return this.tickIndex >= this.data.inputTicks.length; }

  next(): InputState | null {
    if (this.finished) return null;
    return this.data.inputTicks[this.tickIndex++];
  }

  reset() { this.tickIndex = 0; }
}

export function parseReplay(json: string): ReplayData | null {
  try {
    const data = JSON.parse(json);
    if (!data.header || !data.header.formatVersion || !Array.isArray(data.inputTicks)) return null;
    return data as ReplayData;
  } catch {
    return null;
  }
}
