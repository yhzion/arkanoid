export const BOSS_REQUIRED_HITS = 16;
export const BOSS_PROJECTILE_SPEED = 2;
export const BOSS_FIRE_INTERVAL = 90;
export const BOSS_MAX_PROJECTILES = 2;
export const BOSS_W = 64;
export const BOSS_H = 80;

export interface BossState {
  x: number;
  y: number;
  w: number;
  h: number;
  hits: number;
  active: boolean;
  defeated: boolean;
  fireTimer: number;
  projectiles: ProjectileState[];
  introTimer: number;
}

export interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

export function createBoss(): BossState {
  return {
    x: 96, y: 20,
    w: BOSS_W, h: BOSS_H,
    hits: 0, active: false, defeated: false,
    fireTimer: 0,
    projectiles: [],
    introTimer: 120,
  };
}

export function fireProjectile(boss: BossState, vausX: number, vausY: number): void {
  if (boss.projectiles.filter(p => p.active).length >= BOSS_MAX_PROJECTILES) return;
  const dx = vausX - (boss.x + boss.w / 2);
  const dy = vausY - (boss.y + boss.h);
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  boss.projectiles.push({
    x: boss.x + boss.w / 2 - 2,
    y: boss.y + boss.h,
    vx: (dx / len) * BOSS_PROJECTILE_SPEED,
    vy: (dy / len) * BOSS_PROJECTILE_SPEED,
    active: true,
  });
}
