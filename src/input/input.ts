export interface InputState {
  left: boolean; right: boolean; fire: boolean;
  start: boolean; select: boolean; mute: boolean;
  firePressed: boolean; startPressed: boolean; selectPressed: boolean;
  mouseX: number; mouseY: number; mouseActive: boolean;
}

export interface KeyBindings {
  left: string[]; right: string[]; fire: string[];
  start: string[]; select: string[]; mute: string[];
}

export const DEFAULT_BINDINGS: KeyBindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fire: ['Space', 'KeyZ', 'KeyJ'],
  start: ['Enter', 'KeyP'],
  select: ['ShiftLeft', 'Tab'],
  mute: ['KeyM'],
};

export class InputManager {
  state: InputState = {
    left: false, right: false, fire: false,
    start: false, select: false, mute: false,
    firePressed: false, startPressed: false, selectPressed: false,
    mouseX: 0, mouseY: 0, mouseActive: false,
  };

  bindings: KeyBindings = { ...DEFAULT_BINDINGS };
  private keys = new Set<string>();
  private prevKeys = new Set<string>();
  private canvas: HTMLCanvasElement;
  private canvasRect: DOMRect;
  private gamepadIndex: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasRect = canvas.getBoundingClientRect();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });
  }

  poll() {
    this.prevKeys = new Set(this.keys);
    this.state.left = this.isHeld(this.bindings.left);
    this.state.right = this.isHeld(this.bindings.right);
    this.state.fire = this.isHeld(this.bindings.fire);
    this.state.start = this.isHeld(this.bindings.start);
    this.state.select = this.isHeld(this.bindings.select);
    this.state.mute = this.isHeld(this.bindings.mute);
    this.state.firePressed = this.justPressed(this.bindings.fire);
    this.state.startPressed = this.justPressed(this.bindings.start);
    this.state.selectPressed = this.justPressed(this.bindings.select);

    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        if (gp.axes[0] < -0.3 || gp.buttons[14]?.pressed) this.state.left = true;
        if (gp.axes[0] > 0.3 || gp.buttons[15]?.pressed) this.state.right = true;
        if (gp.buttons[0]?.pressed) { this.state.fire = true; if (!this.prevKeys.has('GP0')) this.state.firePressed = true; }
        if (gp.buttons[9]?.pressed) { this.state.start = true; if (!this.prevKeys.has('GP9')) this.state.startPressed = true; }
        if (gp.buttons[8]?.pressed) { this.state.select = true; if (!this.prevKeys.has('GP8')) this.state.selectPressed = true; }
        for (let i = 0; i < gp.buttons.length; i++) {
          if (gp.buttons[i]?.pressed) this.keys.add(`GP${i}`); else this.keys.delete(`GP${i}`);
        }
      }
    }
  }

  private isHeld(codes: string[]): boolean { return codes.some(c => this.keys.has(c)); }
  private justPressed(codes: string[]): boolean { return codes.some(c => this.keys.has(c) && !this.prevKeys.has(c)); }

  private onKeyDown = (e: KeyboardEvent) => { this.keys.add(e.code); e.preventDefault(); };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };
  private onMouseMove = (e: MouseEvent) => {
    this.canvasRect = this.canvas.getBoundingClientRect();
    this.state.mouseX = ((e.clientX - this.canvasRect.left) / this.canvasRect.width) * 256;
    this.state.mouseY = ((e.clientY - this.canvasRect.top) / this.canvasRect.height) * 240;
    this.state.mouseActive = true;
  };
  private onMouseDown = () => { this.keys.add('Mouse0'); };
  private onMouseUp = () => { this.keys.delete('Mouse0'); };
  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    this.canvasRect = this.canvas.getBoundingClientRect();
    this.state.mouseX = ((t.clientX - this.canvasRect.left) / this.canvasRect.width) * 256;
    this.state.mouseActive = true;
    this.keys.add('Mouse0');
  };
  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    this.canvasRect = this.canvas.getBoundingClientRect();
    this.state.mouseX = ((t.clientX - this.canvasRect.left) / this.canvasRect.width) * 256;
  };
  private onTouchEnd = () => { this.keys.delete('Mouse0'); this.state.mouseActive = false; };

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
