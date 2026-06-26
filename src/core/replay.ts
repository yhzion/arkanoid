import { InputSnapshot } from '../input/input';

export interface ReplayInputTick {
  left: boolean;
  right: boolean;
  fire: boolean;
  start: boolean;
  select: boolean;
}

export interface ReplayHeader {
  formatVersion: number;
  gameVersion: string;
  region: 'US' | 'JP';
  mode: string;
  seed: string;
  startRound: number;
  configHash: string;
  deflectionModel: 'continuous' | 'discrete8';
  jitterEnabled: boolean;
  numericModel: string;
  prngState: number[];
  inputTicks: ReplayInputTick[];
}

export function snapshotToReplayInput(snap: InputSnapshot): ReplayInputTick {
  return {
    left: snap.left,
    right: snap.right,
    fire: snap.fire,
    start: snap.start,
    select: snap.select,
  };
}

export function validateReplay(data: any): data is ReplayHeader {
  if (!data || typeof data !== 'object') return false;
  if (data.formatVersion !== 1) return false;
  if (typeof data.gameVersion !== 'string') return false;
  if (data.region !== 'US' && data.region !== 'JP') return false;
  if (typeof data.mode !== 'string') return false;
  if (typeof data.seed !== 'string') return false;
  if (typeof data.startRound !== 'number') return false;
  if (typeof data.configHash !== 'string') return false;
  if (data.deflectionModel !== 'continuous' && data.deflectionModel !== 'discrete8') return false;
  if (typeof data.jitterEnabled !== 'boolean') return false;
  if (typeof data.numericModel !== 'string') return false;
  if (!Array.isArray(data.prngState)) return false;
  if (!Array.isArray(data.inputTicks)) return false;
  for (const tick of data.inputTicks) {
    if (typeof tick.left !== 'boolean') return false;
    if (typeof tick.right !== 'boolean') return false;
    if (typeof tick.fire !== 'boolean') return false;
  }
  return true;
}

export function computeConfigHash(config: {
  region: string;
  mode: string;
  deflectionModel: string;
  jitterEnabled: boolean;
  numericModel: string;
}): string {
  const canonical = JSON.stringify(config, Object.keys(config).sort());
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash.toString(16);
}
