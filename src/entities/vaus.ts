export const VAUS_W = 32;
export const VAUS_H = 8;
export const VAUS_ENLARGED_W = 48;
export const VAUS_Y = 224;
export const VAUS_SPEED = 3;

export interface VausState {
  x: number;
  y: number;
  w: number;
  h: number;
  enlarged: boolean;
  hasCatch: boolean;
  hasLaser: boolean;
  hasBreak: boolean;
  hasSlow: boolean;
  hasDisruption: boolean;
  laserCooldown: number;
  caughtBalls: Array<{ offsetX: number; autoReleaseTick: number }>;
}

export function createVaus(): VausState {
  return {
    x: 112,
    y: VAUS_Y,
    w: VAUS_W,
    h: VAUS_H,
    enlarged: false,
    hasCatch: false,
    hasLaser: false,
    hasBreak: false,
    hasSlow: false,
    hasDisruption: false,
    laserCooldown: 0,
    caughtBalls: [],
  };
}

export function vausCenterX(v: VausState): number {
  return v.x + v.w / 2;
}

export function resetVausPowerups(v: VausState): void {
  v.enlarged = false;
  v.hasCatch = false;
  v.hasLaser = false;
  v.hasBreak = false;
  v.hasSlow = false;
  v.hasDisruption = false;
  v.laserCooldown = 0;
  v.w = VAUS_W;
}
