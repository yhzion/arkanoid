import { Fx, fx, fxFloor, fxMul, fxToFloat } from '../physics/fixedPoint';
import { AABB } from '../physics/collision';

export type EnemyType = 'Konerd' | 'Pyradok' | 'Tri-sphere' | 'Opopo';

export interface EnemyConfig {
  type: EnemyType;
  amplitude: number;
  period: number;
  descent: number;
  loopRadius: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  Konerd: { type: 'Konerd', amplitude: 24, period: 120, descent: 0.5, loopRadius: 0 },
  Pyradok: { type: 'Pyradok', amplitude: 16, period: 90, descent: 0.6, loopRadius: 0 },
  'Tri-sphere': { type: 'Tri-sphere', amplitude: 0, period: 150, descent: 0.5, loopRadius: 12 },
  Opopo: { type: 'Opopo', amplitude: 0, period: 180, descent: 0.4, loopRadius: 16 },
};

export interface Enemy {
  x: Fx;
  y: Fx;
  type: EnemyType;
  config: EnemyConfig;
  startX: number;
  startY: number;
  tick: number;
  active: boolean;
  w: number;
  h: number;
}

export const ENEMY_SPAWN_INTERVAL = 480;
export const MAX_ENEMIES = 3;
export const ENEMY_SPAWN_X1 = 16;
export const ENEMY_SPAWN_X2 = 224;
export const ENEMY_POINTS = 100;

export class EnemyManager {
  active: Enemy[] = [];
  spawnTimer = 0;

  update(tick: number): void {
    this.spawnTimer--;
    if (this.spawnTimer <= 0 && this.active.filter(e => e.active).length < MAX_ENEMIES) {
      this.spawn();
      this.spawnTimer = ENEMY_SPAWN_INTERVAL;
    }
    for (const enemy of this.active) {
      if (!enemy.active) continue;
      enemy.tick++;
      const t = enemy.tick;
      if (enemy.config.amplitude > 0) {
        const phase = (t % enemy.config.period) / enemy.config.period * Math.PI * 2;
        enemy.x = fx(enemy.startX + Math.sin(phase) * enemy.config.amplitude);
        enemy.y = fx(fxFloor(enemy.y) + enemy.config.descent);
      } else {
        const phase = (t % enemy.config.period) / enemy.config.period * Math.PI * 2;
        enemy.x = fx(enemy.startX + Math.cos(phase) * enemy.config.loopRadius);
        enemy.y = fx(fxFloor(enemy.y) + Math.sin(phase) * enemy.config.loopRadius + enemy.config.descent);
      }
      if (fxFloor(enemy.y) > 240) {
        enemy.active = false;
      }
    }
    this.active = this.active.filter(e => e.active);
  }

  private spawn(): void {
    const types: EnemyType[] = ['Konerd', 'Pyradok', 'Tri-sphere', 'Opopo'];
    const type = types[Math.floor(Math.random() * types.length)]!;
    const config = ENEMY_CONFIGS[type]!;
    const spawnX = Math.random() > 0.5 ? ENEMY_SPAWN_X1 : ENEMY_SPAWN_X2;
    this.active.push({
      x: fx(spawnX),
      y: fx(8),
      type,
      config,
      startX: spawnX,
      startY: 8,
      tick: 0,
      active: true,
      w: 16,
      h: 16,
    });
  }

  clear(): void {
    this.active = [];
    this.spawnTimer = 60;
  }
}
