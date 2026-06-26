// PRD 14.1 Digital Input (Keyboard/Gamepad D-pad)

export interface InputState {
  left: boolean;
  right: boolean;
  fire: boolean;
  start: boolean;
}

export class InputManager {
  private currentState: InputState = {
    left: false,
    right: false,
    fire: false,
    start: false,
  };

  constructor() {
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }

  private handleKey(e: KeyboardEvent, isDown: boolean) {
    switch (e.code) {
      case 'ArrowLeft':
        this.currentState.left = isDown;
        break;
      case 'ArrowRight':
        this.currentState.right = isDown;
        break;
      case 'Space':
        this.currentState.fire = isDown;
        break;
      case 'Enter':
        this.currentState.start = isDown;
        break;
    }
  }

  // PRD 30.6 Input is sampled exactly once per tick
  public sample(): InputState {
    return { ...this.currentState };
  }
}
