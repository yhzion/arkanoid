// PRD §10.1: Vaus player object
export class Vaus {
  x: number;
  y: number;
  w = 32;
  h = 8;
  speed = 2;
  enlarged = false;
  hasLaser = false;
  hasCatch = false;
  caughtBall: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dx: number): void {
    this.x += dx;
    // Clamp to playfield
    const minX = 8;
    const maxX = 8 + 192 - this.w;
    this.x = Math.max(minX, Math.min(maxX, this.x));
  }

  enlarge(): void {
    this.w = 48;
    this.enlarged = true;
  }

  resetSize(): void {
    this.w = 32;
    this.enlarged = false;
  }

  getCenterX(): number {
    return this.x + this.w / 2;
  }
}