/**
 * GameConfig + configHash — PRD §25 (config flags) and §30.7 (D7–D10, L9).
 */
import { Fx, fromFloatBuildOnly, fromInt } from './fixedpoint';

export type Region = 'US' | 'JP';
export type GameMode = 'licensed-fidelity' | 'clean-room';
export type InputMode = 'keyboard' | 'gamepad' | 'relative-pointer' | 'absolute-pointer' | 'touch';
export type RenderScaleMode = 'integer' | 'fit';
export type DeflectionModel = 'continuous' | 'discrete8';

/** PRD §25. */
export interface GameConfig {
  region: Region;
  mode: GameMode;
  enableManualLevelSkipSecret: boolean;
  enableHighScoreNameEntry: boolean;
  enableTwoPlayerMode: boolean;
  inputMode: InputMode;
  renderScaleMode: RenderScaleMode;
  audioEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  deflectionModel: DeflectionModel;
  jitterEnabled: boolean;
  numericModel: string;
  deterministicSeed: string;
}

/** Clean-room defaults (§1: clean-room is the safe default until rights are secured). */
export const DEFAULT_CONFIG: GameConfig = {
  region: 'US',
  mode: 'clean-room',
  enableManualLevelSkipSecret: true,
  enableHighScoreNameEntry: true,
  enableTwoPlayerMode: false,
  inputMode: 'keyboard',
  renderScaleMode: 'integer',
  audioEnabled: true,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  deflectionModel: 'continuous',
  jitterEnabled: false,
  numericModel: 'q16.16-v1',
  deterministicSeed: 'arkanoid-default-seed',
};

/**
 * Canonical JSON of the gameplay-affecting allowlist (§30.7): UTF-8, keys sorted
 * ascending, no insignificant whitespace, plus the simulation-asset manifest digest
 * (per-round level-data identity). Cosmetic settings (volumes, inputMode, etc.) are
 * excluded by construction.
 */
export function canonicalConfigJson(
  config: GameConfig,
  levelManifestDigest: string,
): string {
  const allowlist: Record<string, unknown> = {
    deflectionModel: config.deflectionModel,
    jitterEnabled: config.jitterEnabled,
    levelManifestDigest,
    mode: config.mode,
    numericModel: config.numericModel,
    region: config.region,
  };
  // Sorted ascending by key, no whitespace.
  const keys = Object.keys(allowlist).sort();
  return '{' + keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(allowlist[k])}`).join(',') + '}';
}

/** SHA-256 hex of the canonical config JSON (async — Web Crypto digest). */
export async function configHash(config: GameConfig, levelManifestDigest: string): Promise<string> {
  const encoded = new TextEncoder().encode(canonicalConfigJson(config, levelManifestDigest));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

// --- Ball speed constants in Q16.16 (§33.1) --------------------------------
export const SPEED_BASE: Fx = fromInt(2);
export const SPEED_SLOW: Fx = fromFloatBuildOnly(1.5);
export const SPEED_CEIL_STEP: Fx = fromFloatBuildOnly(0.25);
export const SPEED_BRICK_STEP: Fx = fromFloatBuildOnly(0.05);
export const SPEED_MAX: Fx = fromInt(5);
