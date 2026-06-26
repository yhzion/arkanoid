export interface VausState {
  x: number; y: number;
  width: number; height: number;
  speed: number;
  enlarged: boolean;
  hasLaser: boolean;
  hasCatch: boolean;
  catchTimer: number;
  laserCooldown: number;
  activeLaserPairs: number;
}

export function createVaus(): VausState {
  return {
    x: 96, y: 224, width: 32, height: 8,
    speed: 3, enlarged: false, hasLaser: false,
    hasCatch: false, catchTimer: 0, laserCooldown: 0, activeLaserPairs: 0,
  };
}

export function resetVaus(v: VausState) {
  v.x = 96; v.y = 224; v.width = 32; v.height = 8;
  v.enlarged = false; v.hasLaser = false; v.hasCatch = false;
  v.catchTimer = 0; v.laserCooldown = 0; v.activeLaserPairs = 0;
}

export const VAUS_MOVE_STEP = 3;
export const VAUS_ENLARGED_WIDTH = 48;
export const PLAYFIELD_LEFT = 8;
export const PLAYFIELD_RIGHT = 192;
