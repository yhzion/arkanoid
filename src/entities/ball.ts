/**
 * Energy ball — PRD §10.2, §10.3, §30.3.
 *
 * Direction is stored as a **unit vector** (`dir`) and speed as a scalar; the
 * per-tick velocity is always `dir × speed`. This lets speed change mid-flight
 * (ceiling/brick speed-up) without sqrt: bumping speed just recomputes the
 * velocity from the unchanged unit direction. Wall/brick reflections negate a
 * component of the unit vector, which preserves unit length.
 */
import { Fx, fxClamp, fxMul, fromInt } from '../core/fixedpoint';
import { BALL_H, BALL_W, PLAY_LEFT, PLAY_RIGHT } from '../core/constants';
import { SPEED_BASE, SPEED_MAX } from '../core/config';
import { UnitVec, LAUNCH_LEFT, LAUNCH_RIGHT } from '../core/trigTables';

export class Ball {
  x: Fx;
  y: Fx;
  readonly w = BALL_W;
  readonly h = BALL_H;
  dir: UnitVec = { vx: 0, vy: -1 << 16 }; // straight up
  speed: Fx = SPEED_BASE;
  alive = true;
  ceilingHitThisRound = false;
  brickHitsThisRound = 0;

  constructor(x: Fx, y: Fx) {
    this.x = x;
    this.y = y;
  }

  get vx(): Fx {
    return fxMul(this.dir.vx, this.speed);
  }
  get vy(): Fx {
    return fxMul(this.dir.vy, this.speed);
  }

  centerX(): Fx {
    return this.x + fromInt(this.w >> 1);
  }
  centerY(): Fx {
    return this.y + fromInt(this.h >> 1);
  }

  /** Launch at given speed, ±30° from vertical (§10.3). */
  launch(toRight: boolean, speed: Fx = SPEED_BASE): void {
    this.speed = speed;
    this.dir = toRight ? LAUNCH_RIGHT : LAUNCH_LEFT;
  }

  /** Set direction from a unit vector (deflection / split). */
  setDirection(unit: UnitVec): void {
    this.dir = unit;
  }

  /** Reflect off a vertical surface (flip horizontal direction). */
  reflectX(): void {
    this.dir = { vx: -this.dir.vx, vy: this.dir.vy };
  }
  /** Reflect off a horizontal surface (flip vertical direction). */
  reflectY(): void {
    this.dir = { vx: this.dir.vx, vy: -this.dir.vy };
  }

  onBrickHit(speedStep: Fx): void {
    this.brickHitsThisRound++;
    if (this.brickHitsThisRound % 10 === 0) this.bumpSpeed(speedStep);
  }

  onCeilingHit(ceilStep: Fx): void {
    if (!this.ceilingHitThisRound) {
      this.ceilingHitThisRound = true;
      this.bumpSpeed(ceilStep);
    }
  }

  private bumpSpeed(step: Fx): void {
    this.speed = fxClamp(this.speed + step, 0, SPEED_MAX);
  }

  resetForLife(): void {
    this.speed = SPEED_BASE;
    this.ceilingHitThisRound = false;
    this.brickHitsThisRound = 0;
    this.dir = { vx: 0, vy: -(1 << 16) };
  }

  clampX(): void {
    this.x = fxClamp(this.x, fromInt(PLAY_LEFT), fromInt(PLAY_RIGHT - this.w));
  }
}
