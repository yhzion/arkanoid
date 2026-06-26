export interface BossState {
  x: number; y: number;
  width: number; height: number;
  hp: number;
  fireTimer: number;
  active: boolean;
  defeated: boolean;
}

export interface BossProjectile {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  active: boolean;
}

export const BOSS_HITS_TO_DEFEAT = 16;
export const BOSS_FIRE_INTERVAL = 90;
export const BOSS_PROJECTILE_SPEED = 2;
export const MAX_BOSS_PROJECTILES = 2;
export const BOSS_WIDTH = 64;
export const BOSS_HEIGHT = 80;

export function createBoss(): BossState {
  return {
    x: 96, y: 20, width: BOSS_WIDTH, height: BOSS_HEIGHT,
    hp: BOSS_HITS_TO_DEFEAT, fireTimer: BOSS_FIRE_INTERVAL,
    active: true, defeated: false,
  };
}

export function fireProjectile(boss: BossState, vausX: number): BossProjectile | null {
  const dx = vausX + 16 - (boss.x + boss.width / 2);
  const dy = 224 - boss.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: boss.x + boss.width / 2 - 4, y: boss.y + boss.height,
    vx: (dx / dist) * BOSS_PROJECTILE_SPEED,
    vy: (dy / dist) * BOSS_PROJECTILE_SPEED,
    width: 8, height: 8, active: true,
  };
}
