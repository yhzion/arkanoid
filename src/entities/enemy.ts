// PRD §13: Enemies
export type EnemyType = 'Konerd' | 'Pyradok' | 'Tri-sphere' | 'Opopo';

export class Enemy {
  x: number;
  y: number;
  w = 16;
  h = 16;
  type: EnemyType;
  active = true;
  vx: number;
  vy: number;

  constructor(x: number, y: number, type: EnemyType) {
    this.x = x;
    this.y = y;
    this.type = type;
    // Simple drift pattern
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = 0.5;
  }

  update(): void {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off walls
    if (this.x <= 8 || this.x + this.w >= 200) {
      this.vx = -this.vx;
    }
  }

  // PRD §13.2: 100 points
  getScore(): number {
    return 100;
  }
}