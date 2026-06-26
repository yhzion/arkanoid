import type { InputMode } from '../core/GameConfig';

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  fire: boolean;
  start: boolean;
  select: boolean;
  mute: boolean;
  fullscreen: boolean;
  escape: boolean;
  pointerX: number;
  pointerActive: boolean;
  fireHeld: boolean;
  startHeld: boolean;
  selectHeld: boolean;
}

export const EMPTY_INPUT: InputSnapshot = {
  left: false, right: false, fire: false,
  start: false, select: false,
  mute: false, fullscreen: false, escape: false,
  pointerX: 0, pointerActive: false,
  fireHeld: false, startHeld: false, selectHeld: false,
};

export interface KeyBindings {
  left: string[];
  right: string[];
  fire: string[];
  start: string[];
  select: string[];
  mute: string[];
  fullscreen: string[];
}

export const DEFAULT_BINDINGS: KeyBindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fire: ['Space', 'KeyZ', 'KeyJ'],
  start: ['Enter', 'KeyP'],
  select: ['ShiftLeft', 'ShiftRight', 'Tab'],
  mute: ['KeyM'],
  fullscreen: ['KeyF'],
};

export class InputManager {
  private keys = new Set<string>();
  private prevKeys = new Set<string>();
  private pointerX = 0;
  private pointerActive = false;
  private bindings: KeyBindings = DEFAULT_BINDINGS;
  private mode: InputMode = 'keyboard';
  private gamepadIndex: number | null = null;
  private touchActive = false;
  private canvas: HTMLCanvasElement | null = null;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    window.addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (this.isAction(e.code, 'fire') || this.isAction(e.code, 'start')) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      this.pointerX = (e.clientX - rect.left) / rect.width * 256;
      this.pointerActive = true;
    });
    canvas.addEventListener('mousedown', () => { this.pointerActive = true; });
    canvas.addEventListener('mouseup', () => { this.pointerActive = true; });
    canvas.addEventListener('mouseleave', () => { this.pointerActive = false; });

    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.pointerX = (t.clientX - rect.left) / rect.width * 256;
      this.touchActive = true;
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.pointerX = (t.clientX - rect.left) / rect.width * 256;
    }, { passive: true });
    canvas.addEventListener('touchend', () => { this.touchActive = false; }, { passive: true });

    window.addEventListener('gamepadconnected', e => {
      this.gamepadIndex = e.gamepad.index;
    });
  }

  private isAction(code: string, action: keyof KeyBindings): boolean {
    return this.bindings[action]?.includes(code) ?? false;
  }

  setBindings(b: Partial<KeyBindings>): void {
    Object.assign(this.bindings, b);
  }

  setMode(m: InputMode): void {
    this.mode = m;
  }

  sample(): InputSnapshot {
    const snap: InputSnapshot = { ...EMPTY_INPUT };

    if (this.mode === 'keyboard' || this.mode === 'touch') {
      for (const k of this.bindings.left) if (this.keys.has(k)) snap.left = true;
      for (const k of this.bindings.right) if (this.keys.has(k)) snap.right = true;
      snap.fireHeld = this.isAnyActionKey('fire');
      snap.startHeld = this.isAnyActionKey('start');
      snap.selectHeld = this.isAnyActionKey('select');
      snap.fire = this.isFireEdge();
      snap.start = this.isStartEdge();
      snap.select = this.isSelectEdge();
      if (this.isAction('KeyM', 'mute') && !this.prevKeys.has('KeyM') && this.keys.has('KeyM')) snap.mute = true;
      if (this.isAction('KeyF', 'fullscreen') && !this.prevKeys.has('KeyF') && this.keys.has('KeyF')) snap.fullscreen = true;
      snap.escape = !this.prevKeys.has('Escape') && this.keys.has('Escape');
    }

    if (this.mode === 'relative-pointer' || this.mode === 'absolute-pointer') {
      snap.pointerX = this.pointerX;
      snap.pointerActive = this.pointerActive;
      snap.fire = this.isFireEdge();
    }

    if (this.touchActive) {
      snap.pointerX = this.pointerX;
      snap.pointerActive = true;
    }

    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        const x = gp.axes[0] ?? 0;
        if (x < -0.3) snap.left = true;
        if (x > 0.3) snap.right = true;
        if (gp.buttons[0]?.pressed && !this.prevGamepadFire) snap.fire = true;
      }
    }

    this.prevKeys = new Set(this.keys);
    this.prevGamepadFire = navigator.getGamepads()[this.gamepadIndex ?? -1]?.buttons[0]?.pressed ?? false;
    return snap;
  }

  private prevFire = false;
  private prevStart = false;
  private prevSelect = false;
  private prevGamepadFire = false;

  private isFireEdge(): boolean {
    const now = this.isAnyActionKey('fire');
    const edge = now && !this.prevFire;
    this.prevFire = now;
    return edge;
  }

  private isStartEdge(): boolean {
    const now = this.isAnyActionKey('start');
    const edge = now && !this.prevStart;
    this.prevStart = now;
    return edge;
  }

  private isSelectEdge(): boolean {
    const now = this.isAnyActionKey('select');
    const edge = now && !this.prevSelect;
    this.prevSelect = now;
    return edge;
  }

  private isAnyActionKey(action: keyof KeyBindings): boolean {
    return this.bindings[action]?.some(k => this.keys.has(k)) ?? false;
  }
}

export const inputManager = new InputManager();
