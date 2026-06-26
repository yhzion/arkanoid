/**
 * Laser beams — PRD §12.6, §33.4.
 *
 * Twin beams fired from the Vaus edges, travelling upward. Max 2 pairs (4 beams)
 * on screen; 15-tick cooldown between shots. Beams destroy colored bricks, decrement
 * silver (1 hit, beam consumed), and disintegrate on gold without destroying it.
 */
import { Fx, fromInt } from '../core/fixedpoint';
import { LASER_SPEED, PLAY_TOP } from '../core/constants';

export class LaserBeam {
  x: Fx;
  y: Fx;
  alive = true;

  constructor(x: Fx, y: Fx) {
    this.x = x;
    this.y = y;
  }

  /** Advance upward; despawn past the top wall. */
  advance(): void {
    this.y -= LASER_SPEED;
    if (this.y < fromInt(PLAY_TOP)) this.alive = false;
  }
}

/** Manages beam pool + fire cooldown for one player's Vaus. */
export class LaserPool {
  beams: LaserBeam[] = [];
  private cooldown = 0;

  /** Attempt to fire a twin pair from Vaus edges. Enforces max 2 pairs + cooldown. */
  tryFire(vausX: Fx, vausWidth: Fx, vausY: number, firePressed: boolean): boolean {
    if (this.cooldown > 0) this.cooldown--;
    const activePairs = Math.ceil(this.beams.filter((b) => b.alive).length / 2);
    if (!firePressed || this.cooldown > 0 || activePairs >= 2) return false;
    this.beams.push(new LaserBeam(vausX, fromInt(vausY)));
    this.beams.push(new LaserBeam(vausX + vausWidth, fromInt(vausY)));
    this.cooldown = 15; // §33.4
    return true;
  }

  /** Cull dead beams and advance live ones. */
  tick(): void {
    for (const b of this.beams) if (b.alive) b.advance();
    this.beams = this.beams.filter((b) => b.alive);
  }
}
