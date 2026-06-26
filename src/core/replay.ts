export interface ReplayInput {
  tick: number;
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface ReplayData {
  formatVersion: number;
  gameVersion: string;
  region: string;
  mode: string;
  seed: string;
  startRound: number;
  configHash: string;
  deflectionModel: string;
  jitterEnabled: boolean;
  numericModel: string;
  prngState: number[];
  inputTicks: ReplayInput[];
}

export function validateReplay(data: unknown): data is ReplayData {
  if (typeof data !== 'object' || data === null) return false;
  const r = data as Record<string, unknown>;
  return (
    typeof r.formatVersion === 'number' &&
    typeof r.gameVersion === 'string' &&
    typeof r.region === 'string' &&
    typeof r.mode === 'string' &&
    Array.isArray(r.inputTicks) &&
    typeof r.configHash === 'string'
  );
}

export function computeConfigHash(config: Record<string, unknown>): string {
  const sorted = Object.keys(config).sort();
  const canonical: Record<string, unknown> = {};
  for (const k of sorted) canonical[k] = config[k];
  return btoa(JSON.stringify(canonical));
}
