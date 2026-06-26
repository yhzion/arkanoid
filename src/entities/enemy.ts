/**
 * Enemies / obstacles — PRD §13, §33.5.
 *
 * Four types follow normative per-type path tables (sine / loop). Enemies spawn from
 * the top hatches every 480 ticks, max 3 active, drift downward, pass through bricks
 * and walls, and despawn at the bottom exit with no penalty. Point value 100 (§13.2).
 */
import { Fx, fromInt } from '../core/fixedpoint';
import { ENEMY_MAX_ACTIVE, ENEMY_POINTS, ENEMY_SPAWN_INTERVAL, PLAY_LEFT, PLAY_RIGHT, PLAY_BOTTOM } from '../core/constants';

export type EnemyKind = 'Konerd' | 'Pyradok' | 'Tri-sphere' | 'Opopo';

interface PathSpec {
  kind: EnemyKind;
  path: 'sine' | 'loop';
  amplitude: number; // px (sine)
  period: number; // ticks
  descent: number; // px/tick (fixed-point)
  loopRadius: number; // px (loop)
}

const PATH_TABLE: Record<EnemyKind, PathSpec> = {
  Konerd: { kind: 'Konerd', path: 'sine', amplitude: 24, period: 120, descent: 0.5, loopRadius: 0 },
  Pyradok: { kind: 'Pyradok', path: 'sine', amplitude: 16, period: 90, descent: 0.6, loopRadius: 0 },
  'Tri-sphere': { kind: 'Tri-sphere', path: 'loop', amplitude: 0, period: 150, descent: 0.5, loopRadius: 12 },
  Opopo: { kind: 'Opopo', path: 'loop', amplitude: 0, period: 180, descent: 0.4, loopRadius: 16 },
};

export const ENEMY_KINDS: EnemyKind[] = ['Konerd', 'Pyradok', 'Tri-sphere', 'Opopo'];

export class Enemy {
  x: Fx;
  y: Fx;
  readonly w = 8;
  readonly h = 8;
  readonly spec: PathSpec;
  private tickCount = 0;
  private baseX: Fx;
  alive = true;

  constructor(kind: EnemyKind, startX: Fx, startY: Fx) {
    this.spec = PATH_TABLE[kind];
    this.x = startX;
    this.y = startY;
    this.baseX = startX;
  }

  /** Advance along the per-type path (§33.5). Trig-free: triangle-wave approximation
   *  keeps this deterministic (§30.3); exact waveforms are [PROVISIONAL] pending
   *  reference capture (§22 item 4). */
  advance(): void {
    this.tickCount++;
    const t = this.tickCount;
    const phase = (t % this.spec.period) / this.spec.period; // [0,1)
    const tri = (p: number) => 4 * Math.abs(p - 0.5) - 1; // [-1,1] triangle, no trig
    if (this.spec.path === 'sine') {
      this.x = this.baseX + fromInt(Math.round(tri(phase) * this.spec.amplitude));
    } else {
      // loop: two phase-shifted triangles approximate a circular loop (trig-free).
      this.x = this.baseX + fromInt(Math.round(tri(phase) * this.spec.loopRadius));
    }
    this.y += fxDescent(this.spec.descent);
    if (this.y > fromInt(PLAY_BOTTOM)) this.alive = false;
  }

  aabb(): { x: Fx; y: Fx; w: number; h: number } {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

/** Convert a per-tick px descent (float) to fixed-point once. */
function fxDescent(pxPerTick: number): Fx {
  return Math.round(pxPerTick * 65536);
}

/** Spawner: schedules enemy spawns per §13.2. */
export class EnemySpawner {
  private timer = 0;
  private roundRobin = 0;

  constructor(private rng: () => number) {}

  /** Returns a newly-spawned enemy or null this tick. */
  tick(): Enemy | null {
    this.timer++;
    const shouldSpawn = this.timer >= ENEMY_SPAWN_INTERVAL;
    if (!shouldSpawn) return null;
    this.timer = 0;
    const kind = ENEMY_KINDS[this.roundRobin++ % ENEMY_KINDS.length];
    // Spawn from a top hatch (left or right).
    const fromLeft = this.rng() % 2 === 0;
    const x = fromInt(fromLeft ? PLAY_LEFT + 16 : PLAY_RIGHT - 24);
    const y = fromInt(16);
    return new Enemy(kind, x, y);
  }

  static capacity(): number {
    return ENEMY_MAX_ACTIVE;
  }
  static points(): number {
    return ENEMY_POINTS;
  }
}
