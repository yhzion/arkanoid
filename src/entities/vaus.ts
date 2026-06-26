/**
 * Vaus (player paddle) — PRD §10.1, §33.2.
 */
import { Fx, fxClamp, fromInt } from '../core/fixedpoint';
import { PLAY_LEFT, PLAY_RIGHT, VAUS_H, VAUS_MOVE_STEP, VAUS_W, VAUS_W_LARGE, VAUS_Y } from '../core/constants';

export class Vaus {
  x: Fx; // top-left, fixed-point
  readonly y: number = VAUS_Y;
  readonly h: number = VAUS_H;
  width: Fx = VAUS_W;
  enlarged = false;

  constructor() {
    // Center the Vaus initially.
    this.x = fromInt((PLAY_LEFT + PLAY_RIGHT) / 2 - 16);
  }

  center(): Fx {
    return this.x + (this.width >> 1);
  }

  halfW(): Fx {
    return this.width >> 1;
  }

  /** Digital move (§33.2: 3 px/tick, no acceleration). */
  moveDigital(dir: -1 | 0 | 1): void {
    this.x = fxClamp(this.x + dir * VAUS_MOVE_STEP, fromInt(PLAY_LEFT), fromInt(PLAY_RIGHT) - this.width);
  }

  /** Absolute pointer move: set center to logical px (integer). */
  moveToCenterX(centerX: number): void {
    const half = this.halfW();
    const nx = fxClamp(fromInt(centerX) - half, fromInt(PLAY_LEFT), fromInt(PLAY_RIGHT) - this.width);
    this.x = nx;
  }

  setEnlarged(on: boolean): void {
    this.enlarged = on;
    this.width = on ? VAUS_W_LARGE : VAUS_W;
    // Keep within bounds after resize.
    this.x = fxClamp(this.x, fromInt(PLAY_LEFT), fromInt(PLAY_RIGHT) - this.width);
  }

  aabb(): { x: Fx; y: number; w: Fx; h: number } {
    return { x: this.x, y: this.y, w: this.width, h: this.h };
  }
}
