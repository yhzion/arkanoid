/**
 * Input abstraction + remapping — PRD §9 (controls), §30.6 (per-tick sampling).
 *
 * A single device-agnostic InputSource feeds the simulation. Each backend
 * (keyboard / gamepad / pointer / touch) translates raw device state into a set
 * of held Actions; InputSource.sample() is called exactly once per tick and
 * produces a uniform snapshot with held flags + press-edges + an integer-quantized
 * paddleX. The replay log records the snapshot's {left,right,fire,start?,paddleX?}.
 */
import { LOGICAL_W, PLAY_LEFT, PLAY_RIGHT } from '../core/constants';

/** Remappable actions (§9.5). */
export enum Action {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FIRE = 'FIRE',
  START = 'START',
  SELECT = 'SELECT',
  MUTE = 'MUTE',
  FULLSCREEN = 'FULLSCREEN',
}

/** Default keyboard bindings (§9.2): action → set of KeyboardEvent.code alternatives. */
export const DEFAULT_KEYBOARD_REMAP: Record<Action, string[]> = {
  [Action.LEFT]: ['ArrowLeft', 'KeyA'],
  [Action.RIGHT]: ['ArrowRight', 'KeyD'],
  [Action.FIRE]: ['Space', 'KeyZ', 'KeyJ'],
  [Action.START]: ['Enter', 'KeyP'],
  [Action.SELECT]: ['ShiftLeft', 'ShiftRight', 'Tab'],
  [Action.MUTE]: ['KeyM', 'Minus'],
  [Action.FULLSCREEN]: ['KeyF'],
};

/** Default gamepad standard-mapping (§9.4): action → button index. */
export const DEFAULT_GAMEPAD_REMAP: Record<Action, number> = {
  [Action.LEFT]: 14,
  [Action.RIGHT]: 15,
  [Action.FIRE]: 0, // South face
  [Action.START]: 9,
  [Action.SELECT]: 8,
  [Action.MUTE]: -1,
  [Action.FULLSCREEN]: -1,
};

/** Per-tick action snapshot fed to the simulation. */
export interface InputSnapshot {
  left: boolean;
  right: boolean;
  fire: boolean; // held this tick
  firePressed: boolean; // rising edge this tick (launch / catch-release / first laser)
  start: boolean; // edge
  select: boolean; // edge
  mute: boolean; // edge
  fullscreen: boolean; // edge
  /** Pointer/touch target X in integer logical px (quantized), or null for digital modes. */
  paddleX: number | null;
}

export interface InputBackend {
  /** Poll current held actions + optional pointer target (logical px, pre-quantize ok). */
  poll(): { held: Set<Action>; paddleX: number | null };
}

export const EMPTY_SNAPSHOT: InputSnapshot = {
  left: false,
  right: false,
  fire: false,
  firePressed: false,
  start: false,
  select: false,
  mute: false,
  fullscreen: false,
  paddleX: null,
};

/**
 * Device-agnostic sampler. Maintains previous-frame held state to compute edges.
 * Quantizes pointer X to integer logical px and clamps to playfield (§30.6).
 */
export class InputSource {
  private backend: InputBackend;
  private prevHeld: Set<Action> = new Set();

  constructor(backend: InputBackend) {
    this.backend = backend;
  }

  setBackend(backend: InputBackend): void {
    this.backend = backend;
    this.prevHeld.clear();
  }

  /** Sample exactly once per tick (§30.6). */
  sample(): InputSnapshot {
    const { held, paddleX } = this.backend.poll();
    const edge = (a: Action) => held.has(a) && !this.prevHeld.has(a);
    const snap: InputSnapshot = {
      left: held.has(Action.LEFT),
      right: held.has(Action.RIGHT),
      fire: held.has(Action.FIRE),
      firePressed: edge(Action.FIRE),
      start: edge(Action.START),
      select: edge(Action.SELECT),
      mute: edge(Action.MUTE),
      fullscreen: edge(Action.FULLSCREEN),
      paddleX: paddleX === null ? null : clampInt(paddleX),
    };
    this.prevHeld = held;
    return snap;
  }
}

function clampInt(x: number): number {
  const q = Math.trunc(x);
  if (q < PLAY_LEFT) return PLAY_LEFT;
  if (q > PLAY_RIGHT) return PLAY_RIGHT;
  return q;
}

// --- Keyboard backend -------------------------------------------------------

/** Keyboard backend: listens on a target (window) and maps codes → actions. */
export class KeyboardBackend implements InputBackend {
  private held: Set<Action> = new Set();
  private codeToAction: Map<string, Action> = new Map();

  constructor(
    target: { addEventListener: (t: string, cb: (e: { code: string; preventDefault?: () => void }) => void) => void; removeEventListener?: (t: string, cb: (e: { code: string }) => void) => void },
    remap: Record<Action, string[]> = DEFAULT_KEYBOARD_REMAP,
  ) {
    this.setRemap(remap);
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
  }

  setRemap(remap: Record<Action, string[]>): void {
    this.codeToAction.clear();
    (Object.keys(remap) as Action[]).forEach((action) => {
      for (const code of remap[action]) this.codeToAction.set(code, action);
    });
  }

  private onDown = (e: { code: string; preventDefault?: () => void }): void => {
    const a = this.codeToAction.get(e.code);
    if (a) {
      this.held.add(a);
      e.preventDefault?.();
    }
  };

  private onUp = (e: { code: string }): void => {
    const a = this.codeToAction.get(e.code);
    if (a) this.held.delete(a);
  };

  poll(): { held: Set<Action>; paddleX: number | null } {
    return { held: new Set(this.held), paddleX: null };
  }

  /** Test/programmatic helper: directly set held actions. */
  setHeld(actions: Iterable<Action>): void {
    this.held = new Set(actions);
  }
}

// --- Pointer / touch backend (absolute paddle X) ---------------------------

/** Absolute pointer backend: Vaus follows pointer X (§9.3 absolute mode). */
export class PointerBackend implements InputBackend {
  private held: Set<Action> = new Set();
  private x: number | null = null;

  constructor(scale: (clientX: number) => number) {
    this.scale = scale;
  }
  private scale: (clientX: number) => number;

  onPointerMove(clientX: number, pressing: boolean): void {
    this.x = this.scale(clientX);
    if (pressing) this.held.add(Action.FIRE);
  }
  onPointerDown(clientX: number): void {
    this.x = this.scale(clientX);
    this.held.add(Action.FIRE);
  }
  onPointerUp(): void {
    this.held.delete(Action.FIRE);
  }
  /** Drag-to-move zone fire button (touch OSC) can set fire independently. */
  setFire(on: boolean): void {
    if (on) this.held.add(Action.FIRE);
    else this.held.delete(Action.FIRE);
  }

  poll(): { held: Set<Action>; paddleX: number | null } {
    return { held: new Set(this.held), paddleX: this.x };
  }
}

// --- Gamepad backend (standard mapping) ------------------------------------

export class GamepadBackend implements InputBackend {
  constructor(private remap: Record<Action, number> = DEFAULT_GAMEPAD_REMAP) {}

  poll(): { held: Set<Action>; paddleX: number | null } {
    const held = new Set<Action>();
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads.find((p) => p);
    if (!pad) return { held, paddleX: null };
    const r = this.remap;
    const pressed = (idx: number) => idx >= 0 && !!pad.buttons[idx]?.pressed;
    if (pressed(r[Action.LEFT]) || pad.axes[0] < -0.4) held.add(Action.LEFT);
    if (pressed(r[Action.RIGHT]) || pad.axes[0] > 0.4) held.add(Action.RIGHT);
    if (pressed(r[Action.FIRE])) held.add(Action.FIRE);
    if (pressed(r[Action.START])) held.add(Action.START);
    if (pressed(r[Action.SELECT])) held.add(Action.SELECT);
    // Analog stick X → paddleX (quantized in InputSource.sample)
    const ax = pad.axes[0] ?? 0;
    return { held, paddleX: Math.abs(ax) > 0.1 ? ax : null };
  }
}

/** Logical-width helper for pointer scaling (call with clientX→logical conversion). */
export function makePointerScale(canvasRectLeft: number, canvasWidth: number): (clientX: number) => number {
  return (clientX: number) => ((clientX - canvasRectLeft) / canvasWidth) * LOGICAL_W;
}
