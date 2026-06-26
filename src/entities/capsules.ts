import { Fx, fx, fxFloor, fxMul, FX_ONE } from '../physics/fixedPoint';
import { AABB } from '../physics/collision';
import { CapsuleType } from '../data/levelSchema';
import { Vaus } from './vaus';
import { GameState } from '../core/gameState';
import { GameEvent } from '../core/eventBus';
import { createBall, attachBallToVaus, BASE_BALL_SPEED, SLOW_BALL_SPEED } from './ball';

export const CAPSULE_FALL_SPEED = 1;
export const CAPSULE_WIDTH = 16;
export const CAPSULE_HEIGHT = 7;

export interface Capsule {
  x: Fx;
  y: Fx;
  type: CapsuleType;
  active: boolean;
}

const CAPSULE_WEIGHTS: Record<CapsuleType, number> = {
  S: 2, C: 2, L: 2, D: 2, E: 2, P: 1, B: 1,
};

const CAPSULE_TYPES: CapsuleType[] = ['S', 'C', 'L', 'D', 'E', 'P', 'B'];

export function capsuleWeightedRoll(previous: string | null, rand: () => number): CapsuleType {
  const totalWeight = Object.values(CAPSULE_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rand() % totalWeight;
  let chosen: CapsuleType = 'S';
  for (const type of CAPSULE_TYPES) {
    roll -= CAPSULE_WEIGHTS[type];
    if (roll < 0) {
      chosen = type;
      break;
    }
  }
  if (chosen === previous) return 'D';
  return chosen;
}

export function applyCapsuleEffect(type: CapsuleType, state: GameState): void {
  const p = state.player;
  switch (type) {
    case 'S':
      p.activePowerUp = type;
      p.vaus.hasSlow = true;
      for (const b of p.balls) {
        if (b.active) b.speed = fx(SLOW_BALL_SPEED);
      }
      break;
    case 'C':
      p.activePowerUp = type;
      p.vaus.hasCatch = true;
      p.tickSinceCatch = 0;
      break;
    case 'L':
      p.activePowerUp = type;
      p.vaus.hasLaser = true;
      p.vaus.fireCooldown = 0;
      break;
    case 'D': {
      p.activePowerUp = type;
      const newBalls: any[] = [];
      for (const b of p.balls) {
        if (!b.active) continue;
        const orig = b;
        const speed = orig.speed;
        const vx = fxToFloat(orig.vx);
        const vy = fxToFloat(orig.vy);
        const fxSpeed = fxToFloat(speed);
        if (vy !== 0 && fxSpeed > 0) {
          const angle = Math.atan2(vy, vx);
          const b1 = { ...orig };
          b1.vx = fx(Math.cos(angle - 15 * Math.PI / 180) * fxSpeed);
          b1.vy = fx(Math.sin(angle - 15 * Math.PI / 180) * fxSpeed);
          const b2 = { ...orig };
          b2.vx = vx;
          b2.vy = vy;
          const b3 = { ...orig };
          b3.vx = fx(Math.cos(angle + 15 * Math.PI / 180) * fxSpeed);
          b3.vy = fx(Math.sin(angle + 15 * Math.PI / 180) * fxSpeed);
          newBalls.push(b1, b2, b3);
        } else {
          newBalls.push({ ...orig });
        }
      }
      p.balls = newBalls;
      break;
    }
    case 'P':
      p.lives++;
      state.eventBus.emit(GameEvent.EXTRA_LIFE_AWARDED, { totalLives: p.lives });
      break;
    case 'E':
      p.activePowerUp = type;
      p.vaus.enlarged = true;
      p.vaus.width = 48;
      break;
    case 'B':
      p.activePowerUp = type;
      p.vaus.hasBreak = true;
      break;
  }
}

function fxToFloat(f: Fx): number {
  return f / FX_ONE;
}

export class CapsuleManager {
  active: Capsule[] = [];

  spawn(type: CapsuleType, x: number, y: number): Capsule {
    const cap: Capsule = { x: fx(x), y: fx(y), type, active: true };
    this.active.push(cap);
    return cap;
  }

  update(): void {
    for (const cap of this.active) {
      if (!cap.active) continue;
      cap.y = fx(fxFloor(cap.y) + CAPSULE_FALL_SPEED);
      if (fxFloor(cap.y) > 240) {
        cap.active = false;
      }
    }
    this.active = this.active.filter(c => c.active);
  }

  checkVausCollision(vaus: Vaus): Capsule | null {
    for (const cap of this.active) {
      if (!cap.active) continue;
      const vx1 = fxFloor(vaus.x);
      const vx2 = vx1 + vaus.width;
      const vy1 = fxFloor(vaus.y);
      const vy2 = vy1 + 8;
      const cx1 = fxFloor(cap.x);
      const cx2 = cx1 + CAPSULE_WIDTH;
      const cy1 = fxFloor(cap.y);
      const cy2 = cy1 + CAPSULE_HEIGHT;
      if (vx1 < cx2 && vx2 > cx1 && vy1 < cy2 && vy2 > cy1) {
        cap.active = false;
        return cap;
      }
    }
    return null;
  }

  clear(): void {
    this.active = [];
  }
}
