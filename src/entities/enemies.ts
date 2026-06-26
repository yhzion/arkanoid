export type EnemyType = 'konerd' | 'pyradok' | 'trisph' | 'opopo';

export interface EnemyState {
  x: number; y: number;
  type: EnemyType;
  active: boolean;
  width: number; height: number;
  spawnTick: number;
  baseX: number;
}

export const ENEMY_SPAWN_INTERVAL = 480;
export const MAX_ENEMIES = 3;
export const ENEMY_WIDTH = 16;
export const ENEMY_HEIGHT = 16;
export const ENEMY_POINTS = 100;

const PROFILES: Record<EnemyType, { amplitude: number; period: number; descent: number; loopRadius: number }> = {
  konerd: { amplitude: 24, period: 120, descent: 0.5, loopRadius: 0 },
  pyradok: { amplitude: 16, period: 90, descent: 0.6, loopRadius: 0 },
  trisph: { amplitude: 0, period: 150, descent: 0.5, loopRadius: 12 },
  opopo: { amplitude: 0, period: 180, descent: 0.4, loopRadius: 16 },
};

export function updateEnemyPosition(e: EnemyState, tick: number) {
  const p = PROFILES[e.type];
  const elapsed = tick - e.spawnTick;
  if (p.loopRadius > 0) {
    const angle = (elapsed / p.period) * Math.PI * 2;
    e.x = e.baseX + Math.cos(angle) * p.loopRadius;
    e.y = 8 + elapsed * p.descent + Math.sin(angle) * p.loopRadius;
  } else {
    e.x = e.baseX + Math.sin((elapsed / p.period) * Math.PI * 2) * p.amplitude;
    e.y = 8 + elapsed * p.descent;
  }
}

const TYPES: EnemyType[] = ['konerd', 'pyradok', 'trisph', 'opopo'];

export function spawnEnemy(tick: number, rng: () => number): EnemyState {
  const type = TYPES[Math.floor(rng() * TYPES.length)];
  const hatchX = rng() < 0.5 ? 16 : 176;
  return {
    x: hatchX, y: 8, type, active: true,
    width: ENEMY_WIDTH, height: ENEMY_HEIGHT,
    spawnTick: tick, baseX: hatchX,
  };
}
