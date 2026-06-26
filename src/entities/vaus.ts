import { Fx, fx, fxFloor, fxMul, fxClamp, FX_NEG_ONE, FX_ONE } from '../physics/fixedPoint';
import { AABB } from '../physics/collision';

export const VAUS_NORMAL_WIDTH = 32;
export const VAUS_ENLARGED_WIDTH = 48;
export const VAUS_HEIGHT = 8;
export const VAUS_MOVE_STEP = 3;
export const PLAYFIELD_LEFT = 8;
export const PLAYFIELD_RIGHT = 248;
export const VAUS_Y_POS = 224;

export class Vaus {
  x: Fx = fx(112);
  y: Fx = fx(VAUS_Y_POS);
  width: number = VAUS_NORMAL_WIDTH;
  enlarged = false;
  hasLaser = false;
  hasCatch = false;
  hasSlow = false;
  hasBreak = false;
  invincible = false;
  fireCooldown = 0;

  get aabb(): AABB {
    return { x: this.x, y: this.y, w: this.width, h: VAUS_HEIGHT };
  }

  moveLeft(): void {
    this.x = fxClamp(fx(fxFloor(this.x) - VAUS_MOVE_STEP), fx(PLAYFIELD_LEFT), fx(PLAYFIELD_RIGHT - this.width));
  }

  moveRight(): void {
    this.x = fxClamp(fx(fxFloor(this.x) + VAUS_MOVE_STEP), fx(PLAYFIELD_LEFT), fx(PLAYFIELD_RIGHT - this.width));
  }

  setX(px: number): void {
    this.x = fxClamp(fx(px), fx(PLAYFIELD_LEFT), fx(PLAYFIELD_RIGHT - this.width));
  }

  reset(): void {
    this.x = fx(112);
    this.y = fx(VAUS_Y_POS);
    this.width = VAUS_NORMAL_WIDTH;
    this.enlarged = false;
    this.hasLaser = false;
    this.hasCatch = false;
    this.hasSlow = false;
    this.hasBreak = false;
    this.fireCooldown = 0;
  }

  resetPowerups(): void {
    this.hasLaser = false;
    this.hasCatch = false;
    this.hasSlow = false;
    this.hasBreak = false;
    this.enlarged = false;
    this.width = VAUS_NORMAL_WIDTH;
    this.fireCooldown = 0;
  }

  centerX(): Fx {
    return fx(fxFloor(this.x) + this.width / 2);
  }
}
