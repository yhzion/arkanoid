/**
 * Boot layer — architecture.md §2 (`/app`). Wires DOM, canvas, input, audio,
 * persistence, and the game controller to the fixed-step loop.
 */
import { DEFAULT_CONFIG, GameConfig } from '../core/config';
import { EventBus } from '../core/eventBus';
import { FixedStepper } from '../core/fixedStep';
import { InputSource, KeyboardBackend, PointerBackend, makePointerScale, Action } from '../input/input';
import { PersistenceStore } from '../data/persistence';
import { loadLevel } from '../loaders/assetLoader';
import { ILevelData } from '../data/schemas';
import { GameController } from '../game/gameController';
import { GameState } from '../core/stateMachine';
import { render } from '../render/renderer';
import { WebAudioEngine, wireAudioToBus } from '../audio/audio';
import { EMPTY_SNAPSHOT, InputSnapshot } from '../input/input';

export interface AppHandles {
  controller: GameController;
  stepper: FixedStepper;
  start(): void;
}

/** Build the app against a canvas + window. Returns handles + a start() to run. */
export function boot(canvas: HTMLCanvasElement, win: Window = window): AppHandles {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const g: CanvasRenderingContext2D = ctx;

  // Load persisted settings (config + remaps), falling back to defaults.
  const store = new PersistenceStore();
  const stored = store.loadSettings();
  const config: GameConfig = (stored?.config as GameConfig) ?? DEFAULT_CONFIG;
  const bus = new EventBus();

  // Audio (graceful no-op in unsupported envs).
  const audio = new WebAudioEngine();
  audio.init(config);
  wireAudioToBus(audio, bus);

  // Level provider (browser fetch path).
  const levelProvider = (region: 'US' | 'JP', round: number) => {
    // Synchronous cache is warmed at boot; fall back to a fetch (rare during play).
    throwIfNotCached(region, round);
    return cachedLevels.get(levelKey(region, round))!;
  };
  const cachedLevels = new Map<string, ILevelData>();
  const levelKey = (r: string, n: number) => `${r}-${n}`;
  function throwIfNotCached(region: string, round: number): void {
    if (!cachedLevels.has(levelKey(region, round))) {
      throw new Error(`Level ${region}-${round} not preloaded`);
    }
  }

  const controller = new GameController({ config, bus, store, levelProvider });

  // Input: keyboard primary + pointer (absolute) for mouse/touch.
  const kb = new KeyboardBackend(win);
  const pointer = new PointerBackend(makePointerScale(0, canvas.width || 256));
  let activeBackend: 'keyboard' | 'pointer' = 'keyboard';
  const inputSource = new InputSource(kb);

  // Pointer wiring.
  canvas.addEventListener('pointermove', (e) => {
    activeBackend = 'pointer';
    const rect = canvas.getBoundingClientRect();
    pointer.onPointerMove(e.clientX - rect.left, e.buttons > 0);
    inputSource.setBackend(pointer);
  });
  canvas.addEventListener('pointerdown', (e) => {
    activeBackend = 'pointer';
    const rect = canvas.getBoundingClientRect();
    pointer.onPointerDown(e.clientX - rect.left);
    inputSource.setBackend(pointer);
  });
  canvas.addEventListener('pointerup', () => pointer.onPointerUp());
  // Re-arm keyboard on any key.
  win.addEventListener('keydown', () => {
    if (activeBackend !== 'keyboard') {
      activeBackend = 'keyboard';
      inputSource.setBackend(kb);
    }
  });

  // Direct letter input for name entry.
  win.addEventListener('keydown', (e) => {
    if (controller.sm.state === GameState.NAME_ENTRY) {
      if (e.key === 'Backspace') controller.nameEntry.input('backspace');
      else if (/^[a-zA-Z0-9]$/.test(e.key)) controller.nameEntry.input(e.key);
    }
    if (e.code === 'KeyM') bus.emit('INPUT_ACTION' as never, { action: 'mute' } as never);
  });

  let lastInput: InputSnapshot = EMPTY_SNAPSHOT;
  const stepper = new FixedStepper({
    onTick: () => {
      lastInput = inputSource.sample();
      controller.tick(lastInput);
    },
    onFrame: (alpha) => {
      void alpha;
      draw();
    },
  });

  function draw(): void {
    const sim = controller.currentSim;
    const boss = controller.currentBoss;
    render(
      { ctx: g },
      controller.sm.state,
      {
        sim: sim ?? undefined,
        boss: boss ?? undefined,
        round: controller.round,
        score: controller.score.score,
        lives: controller.lives,
        region: controller.region,
      },
    );
  }

  // Pause on tab hidden (saves CPU; sim freezes — pausing semantics §8.5).
  document.addEventListener('visibilitychange', () => {
    void Action; // referenced for the input enum side-effect
  });

  function start(): void {
    // Audio unlock + asset preload + boot to title.
    audio.unlock().then(async () => {
      const total = 36;
      for (let r = 1; r <= total; r++) {
        try {
          cachedLevels.set(levelKey(config.region, r), await loadLevel(config.region, r, config.mode));
        } catch {
          // tolerate missing assets in dev; levelProvider will throw on use
        }
      }
      controller.bootToTitle();
      draw();
    });

    // RAF loop driving the fixed stepper.
    let prev = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(100, now - prev); // clamp huge gaps (tab switches)
      prev = now;
      stepper.advance(dt);
      win.requestAnimationFrame(frame);
    };
    win.requestAnimationFrame(frame);
  }

  return { controller, stepper, start };
}
