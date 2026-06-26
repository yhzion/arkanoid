import type { Vec2 } from '../physics/collision';

export type EnemyType = 'Konerd' | 'Pyradok' | 'Tri-sphere' | 'Opopo';

export const ENEMY_W = 16;
export const ENEMY_H = 16;
export const ENEMY_POINTS = 100;
export const ENEMY_SPAWN_INTERVAL = 480;
export const MAX_ENEMIES = 3;
export const ENEMY_DESPAWN_Y = 240;

interface EnemyProfile {
  amplitude: number;
  period: number;
  descent: number;
  loopRadius: number;
}

const ENEMY_PROFILES: Record<EnemyType, EnemyProfile> = {
  Konerd: { amplitude: 24, period: 120, descent: 0.5, loopRadius: 0 },
  Pyradok: { amplitude: 16, period: 90, descent: 0.6, loopRadius: 0 },
  'Tri-sphere': { amplitude: 0, period: 150, descent: 0.5, loopRadius: 12 },
  Opopo: { amplitude: 0, period: 180, descent: 0.4, loopRadius: 16 },
};

export interface EnemyState {
  x: number;
  y: number;
  w: number;
  h: number;
  type: EnemyType;
  active: boolean;
  spawnTick: number;
  profile: EnemyProfile;
  startX: number;
}

export function createEnemy(type: EnemyType, x: number, y: number, tick: number): EnemyState {
  return {
    x: x - ENEMY_W / 2, y,
    w: ENEMY_W, h: ENEMY_H,
    type, active: true,
    spawnTick: tick,
    profile: ENEMY_PROFILES[type],
    startX: x - ENEMY_W / 2,
  };
}

export function updateEnemy(e: EnemyState, tick: number): void {
  const dt = tick - e.spawnTick;
  if (e.profile.loopRadius > 0) {
    const angle = (dt / e.profile.period) * Math.PI * 2;
    e.x = e.startX + Math.cos(angle) * e.profile.loopRadius;
    e.y += e.profile.descent;
  } else {
    e.x = e.startX + Math.sin((dt / e.profile.period) * Math.PI * 2) * e.profile.amplitude;
    e.y += e.profile.descent;
  }
}
