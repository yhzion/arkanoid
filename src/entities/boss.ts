// PRD §15: DOH Boss
export class Boss {
  x: number;
  y: number;
  w = 32;
  h = 32;
  hits = 0;
  maxHits = 16; // PRD §15.1
  active = true;
  projectiles: { x: number; y: number; vx: number; vy: number }[] = [];
  fireTimer = 0;
  fireInterval = 120; // 2 seconds at 60fps

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(): void {
    if (!this.active) return;

    // Fire projectiles
    this.fireTimer++;
    if (this.fireTimer >= this.fireInterval) {
      this.fireTimer = 0;
      this.projectiles.push({
        x: this.x + this.w / 2,
        y: this.y + this.h,
        vx: (Math.random() - 0.5) * 2,
        vy: 2,
      });
    }

    // Update projectiles
    for (const p of this.projectiles) {
      p.x += p.vx;
      p.y += p.vy;
    }

    // Remove off-screen projectiles
    this.projectiles = this.projectiles.filter((p) => p.y < 240);
  }

  hit(): boolean {
    this.hits++;
    if (this.hits >= this.maxHits) {
      this.active = false;
      return true;
    }
    return false;
  }

  // PRD §16.1: 1000 per hit, 50000 for defeat
  getHitScore(): number {
    return 1000;
  }

  getDefeatScore(): number {
    return 50000;
  }
}