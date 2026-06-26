import { GameConfig } from '../data/levelSchema';
import { GameState } from '../core/gameState';
import { FixedStep } from '../core/fixedStep';
import { StateMachine } from '../core/stateMachine';
import { InputManager } from '../input/input';
import { Renderer } from '../render/renderer';
import { AudioEngine } from '../audio/audio';
import { GameEvent } from '../core/eventBus';
import { loadSettings, saveSettings } from '../data/persistence';

const SFX_MAP: Partial<Record<GameEvent, string>> = {
  [GameEvent.BALL_LAUNCHED]: 'BALL_LAUNCHED',
  [GameEvent.BRICK_HIT]: 'BRICK_HIT',
  [GameEvent.BRICK_DESTROYED]: 'BRICK_DESTROYED',
  [GameEvent.CAPSULE_COLLECTED]: 'CAPSULE_COLLECTED',
  [GameEvent.LASER_FIRED]: 'LASER_FIRED',
  [GameEvent.ENEMY_DESTROYED]: 'ENEMY_DESTROYED',
  [GameEvent.BALL_LOST]: 'BALL_LOST',
  [GameEvent.LIFE_LOST]: 'LIFE_LOST',
  [GameEvent.ROUND_CLEARED]: 'ROUND_CLEARED',
  [GameEvent.GAME_OVER]: 'GAME_OVER',
  [GameEvent.BOSS_HIT]: 'BOSS_HIT',
  [GameEvent.BOSS_DEFEATED]: 'BOSS_DEFEATED',
  [GameEvent.EXTRA_LIFE_AWARDED]: 'EXTRA_LIFE_AWARDED',
  [GameEvent.BREAK_WARP_ENTERED]: 'BREAK_WARP_ENTERED',
};

export function main(): void {
  const canvas = document.createElement('canvas');
  const app = document.getElementById('app')!;
  app.innerHTML = '';
  app.appendChild(canvas);

  const defaultConfig: GameConfig = {
    region: 'US',
    mode: 'clean-room',
    enableManualLevelSkipSecret: true,
    enableHighScoreNameEntry: true,
    enableTwoPlayerMode: false,
    inputMode: 'keyboard',
    renderScaleMode: 'integer',
    audioEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 1.0,
    deflectionModel: 'continuous',
    jitterEnabled: false,
    numericModel: 'q16.16-v1',
    deterministicSeed: 'arkanoid-' + Date.now(),
  };

  const savedSettings = loadSettings();
  const config = savedSettings ? { ...defaultConfig, ...savedSettings.config } : defaultConfig;

  const state = new GameState(config);
  const renderer = new Renderer(canvas);
  const input = new InputManager();
  const audio = new AudioEngine();
  const stateMachine = new StateMachine(state);

  input.init(canvas);
  audio.init(config).catch(() => {});
  renderer.resize();

  for (const [event, sfxName] of Object.entries(SFX_MAP)) {
    state.eventBus.on(event as GameEvent, () => audio.playSfx(sfxName!));
  }

  window.addEventListener('click', () => { audio.unlock(); }, { once: true });
  window.addEventListener('resize', () => renderer.resize());

  const step = new FixedStep(
    (tick) => {
      const snap = input.sample();

      if (snap.mute) {
        config.audioEnabled = !config.audioEnabled;
        audio.setMuted(!config.audioEnabled);
      }
      if (snap.fullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.body.requestFullscreen();
        }
      }

      stateMachine.handleTick(tick, snap);
    },
    () => {
      renderer.render(state);
    },
  );

  step.start();
}
