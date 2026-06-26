export type InputMode = 'keyboard' | 'gamepad' | 'relative-pointer' | 'absolute-pointer' | 'touch';
export type DeflectionModel = 'continuous' | 'discrete8';
export type Region = 'US' | 'JP';
export type GameMode = 'licensed-fidelity' | 'clean-room';

export interface GameConfig {
  region: Region;
  mode: GameMode;
  enableManualLevelSkipSecret: boolean;
  enableHighScoreNameEntry: boolean;
  enableTwoPlayerMode: boolean;
  inputMode: InputMode;
  renderScaleMode: 'integer' | 'fit';
  audioEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  deflectionModel: DeflectionModel;
  jitterEnabled: boolean;
  numericModel: string;
  deterministicSeed: string;
}

export const DEFAULT_CONFIG: GameConfig = {
  region: 'US',
  mode: 'clean-room',
  enableManualLevelSkipSecret: true,
  enableHighScoreNameEntry: true,
  enableTwoPlayerMode: false,
  inputMode: 'keyboard',
  renderScaleMode: 'integer',
  audioEnabled: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  deflectionModel: 'continuous',
  jitterEnabled: false,
  numericModel: 'q16.16-v1',
  deterministicSeed: 'arkanoid-default',
};
