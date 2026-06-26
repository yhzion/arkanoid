export type GameConfig = {
  region: 'US' | 'JP';
  mode: 'licensed-fidelity' | 'clean-room';
  enableManualLevelSkipSecret: boolean;
  enableHighScoreNameEntry: boolean;
  enableTwoPlayerMode: boolean;
  inputMode: 'keyboard' | 'gamepad' | 'relative-pointer' | 'absolute-pointer' | 'touch';
  renderScaleMode: 'integer' | 'fit';
  audioEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  masterVolume: number;
  deflectionModel: 'continuous' | 'discrete8';
  jitterEnabled: boolean;
  numericModel: string;
  deterministicSeed: string;
  crtFilter: boolean;
};

export const DEFAULT_CONFIG: GameConfig = {
  region: 'US',
  mode: 'clean-room',
  enableManualLevelSkipSecret: true,
  enableHighScoreNameEntry: true,
  enableTwoPlayerMode: true,
  inputMode: 'keyboard',
  renderScaleMode: 'integer',
  audioEnabled: true,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  masterVolume: 0.8,
  deflectionModel: 'continuous',
  jitterEnabled: false,
  numericModel: 'q16.16-v1',
  deterministicSeed: 'arkanoid-2026',
  crtFilter: false,
};
