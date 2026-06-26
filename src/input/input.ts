export interface InputSnapshot {
  left: boolean;
  right: boolean;
  fire: boolean;
  start: boolean;
  select: boolean;
  mute: boolean;
  fullscreen: boolean;
  pointerX: number | null;
  pointerActive: boolean;
}

export interface RemapEntry {
  keyboard: Record<string, string>;
  gamepad: Record<string, number>;
}

export const DEFAULT_KEYBOARD_MAP: Record<string, string> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'fire',
  KeyZ: 'fire',
  KeyJ: 'fire',
  Enter: 'start',
  KeyP: 'start',
  ShiftLeft: 'select',
  ShiftRight: 'select',
  Tab: 'select',
  KeyM: 'mute',
  KeyF: 'fullscreen',
};

export class InputManager {
  private keys = new Map<string, boolean>();
  private prevKeys = new Map<string, boolean>();
  private _pointerX: number | null = null;
  private _pointerActive = false;
  private keyMap: Record<string, string> = { ...DEFAULT_KEYBOARD_MAP };
  private canvas: HTMLCanvasElement | null = null;

  private tickSnapshot: InputSnapshot = { left: false, right: false, fire: false, start: false, select: false, mute: false, fullscreen: false, pointerX: null, pointerActive: false };

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('gamepadconnected', () => {});
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('mouseup', this.onMouseUp);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
    }
  }

  setKeyMap(map: Record<string, string>): void {
    this.keyMap = { ...DEFAULT_KEYBOARD_MAP, ...map };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.set(e.code, true);
    if (e.code === 'KeyF') return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.set(e.code, false);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    this._pointerX = (e.clientX - rect.left) * scaleX;
  };

  private onMouseDown = (e: MouseEvent): void => {
    this._pointerActive = true;
    this._pointerX = null;
  };

  private onMouseUp = (e: MouseEvent): void => {
    this._pointerActive = false;
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.canvas || !e.touches[0]) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    this._pointerX = (e.touches[0].clientX - rect.left) * scaleX;
    this._pointerActive = true;
  };

  private onTouchStart = (e: TouchEvent): void => {
    this._pointerActive = true;
  };

  private onTouchEnd = (e: TouchEvent): void => {
    this._pointerActive = false;
  };

  private isPressed(code: string): boolean {
    return this.keys.get(code) === true;
  }

  private actionPressed(action: string): boolean {
    for (const [code, a] of Object.entries(this.keyMap)) {
      if (a === action && this.isPressed(code)) return true;
    }
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp) continue;
      if (action === 'fire' && (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed)) return true;
      if (action === 'start' && (gp.buttons[9]?.pressed || gp.buttons[7]?.pressed)) return true;
      if (action === 'select' && (gp.buttons[8]?.pressed || gp.buttons[6]?.pressed)) return true;
      if (action === 'left' && (gp.axes[0] !== undefined && gp.axes[0] < -0.5 || gp.buttons[14]?.pressed)) return true;
      if (action === 'right' && (gp.axes[0] !== undefined && gp.axes[0] > 0.5 || gp.buttons[15]?.pressed)) return true;
    }
    return false;
  }

  sample(): InputSnapshot {
    const snapshot: InputSnapshot = {
      left: this.actionPressed('left'),
      right: this.actionPressed('right'),
      fire: this.actionPressed('fire'),
      start: this.isEdge('start'),
      select: this.isEdge('select'),
      mute: this.isEdge('mute'),
      fullscreen: this.isEdge('fullscreen'),
      pointerX: this._pointerX,
      pointerActive: this._pointerActive,
    };
    this.prevKeys = new Map(this.keys);
    return snapshot;
  }

  private isEdge(action: string): boolean {
    const now = this.actionPressed(action);
    const before = this.actionPressedPrev(action);
    return now && !before;
  }

  private actionPressedPrev(action: string): boolean {
    for (const [code, a] of Object.entries(this.keyMap)) {
      if (a === action && this.prevKeys.get(code) === true) return true;
    }
    return false;
  }
}
