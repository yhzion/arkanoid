import { Fx, fx, fxFloor, fxMul, fxToFloat } from '../physics/fixedPoint';
import { AABB } from '../physics/collision';
import { Vaus } from './vaus';

export const DOH_HITS_REQUIRED = 16;
export const DOH_PROJECTILE_SPEED = 2;
export const DOH_FIRE_INTERVAL = 90;
export const DOH_MAX_PROJECTILES = 2;

export interface BossProjectile {
  x: Fx;
  y: Fx;
  vx: Fx;
  vy: Fx;
  active: boolean;
}

export class BossManager {
  x: Fx = fx(80);
  y: Fx = fx(24);
  width = 96;
  height = 80;
  damage = 0;
  defeated = false;
  fireTimer = 0;
  projectiles: BossProjectile[] = [];
  hitCooldown = 0;

  reset(): void {
    this.damage = 0;
    this.defeated = false;
    this.fireTimer = 0;
    this.projectiles = [];
    this.hitCooldown = 0;
  }

  get aabb(): AABB {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  update(vaus: Vaus): void {
    if (this.defeated) return;
    if (this.hitCooldown > 0) this.hitCooldown--;

    this.fireTimer--;
    if (this.fireTimer <= 0 && this.projectiles.filter(p => p.active).length < DOH_MAX_PROJECTILES) {
      this.fireProjectile(vaus);
      this.fireTimer = DOH_FIRE_INTERVAL;
    }

    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.x = fx(fxFloor(p.x) + fxFloor(fxMul(p.vx, fx(DOH_PROJECTILE_SPEED))));
      p.y = fx(fxFloor(p.y) + fxFloor(fxMul(p.vy, fx(DOH_PROJECTILE_SPEED))));
      if (fxFloor(p.y) > 240 || fxFloor(p.x) < 0 || fxFloor(p.x) > 256) {
        p.active = false;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.active);
  }

  private fireProjectile(vaus: Vaus): void {
    const vausCenter = fxFloor(vaus.centerX());
    const dx = vausCenter - fxFloor(this.x) - this.width / 2;
    const dy = fxFloor(vaus.y) - fxFloor(this.y) - this.height;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    this.projectiles.push({
      x: fx(fxFloor(this.x) + this.width / 2),
      y: fx(fxFloor(this.y) + this.height),
      vx: fx(dx / len),
      vy: fx(dy / len),
      active: true,
    });
  }

  registerHit(): boolean {
    if (this.hitCooldown > 0) return false;
    this.damage++;
    this.hitCooldown = 10;
    if (this.damage >= DOH_HITS_REQUIRED) {
      this.defeated = true;
    }
    return true;
  }
}
