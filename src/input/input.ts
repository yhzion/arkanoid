// PRD §9: Input system - keyboard, mouse, gamepad, touch

export interface InputState {
  left: boolean;
  right: boolean;
  fire: boolean;
  start: boolean;
  select: boolean;
  mute: boolean;
  fullscreen: boolean;
}

const EMPTY_INPUT: InputState = {
  left: false,
  right: false,
  fire: false,
  start: false,
  select: false,
  mute: false,
  fullscreen: false,
};

export class InputManager {
  private state: InputState = { ...EMPTY_INPUT };
  private previous: InputState = { ...EMPTY_INPUT };
  private keys = new Set<string>();
  private pointerX = 0;
  private pointerDown = false;

  constructor() {
    this.bindKeyboard();
    this.bindPointer();
  }

  getState(): InputState {
    return this.state;
  }

  isPressed(key: keyof InputState): boolean {
    return this.state[key];
  }

  justPressed(key: keyof InputState): boolean {
    return this.state[key] && !this.previous[key];
  }

  getPointerX(): number {
    return this.pointerX;
  }

  isPointerDown(): boolean {
    return this.pointerDown;
  }

  update(): void {
    this.previous = { ...this.state };
    this.pollGamepad();
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.syncState();
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.syncState();
    });
  }

  private bindPointer(): void {
    window.addEventListener('pointermove', (e) => {
      this.pointerX = e.clientX;
    });
    window.addEventListener('pointerdown', () => {
      this.pointerDown = true;
      this.state.fire = true;
    });
    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
      this.state.fire = false;
    });
  }

  private pollGamepad(): void {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp) continue;

      // Left stick / D-pad
      const axisX = gp.axes[0] ?? 0;
      this.state.left = axisX < -0.2 || (gp.buttons[14]?.pressed ?? false);
      this.state.right = axisX > 0.2 || (gp.buttons[15]?.pressed ?? false);

      // South face button = fire
      this.state.fire = gp.buttons[0]?.pressed ?? this.state.fire;

      // Start/Menu
      this.state.start = gp.buttons[9]?.pressed ?? false;

      // Select/View
      this.state.select = gp.buttons[8]?.pressed ?? false;
      break;
    }
  }

  private syncState(): void {
    this.state.left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    this.state.right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    this.state.fire =
      this.keys.has('Space') || this.keys.has('KeyZ') || this.keys.has('KeyJ');
    this.state.start = this.keys.has('Enter') || this.keys.has('KeyP');
    this.state.select =
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.keys.has('Tab');
    this.state.mute = this.keys.has('KeyM') || this.keys.has('Minus');
    this.state.fullscreen = this.keys.has('KeyF');
  }
}