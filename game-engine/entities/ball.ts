export class Ball {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number = 2; // Assuming 4x4 square or circle

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  public update() {
    this.x += this.vx;
    this.y += this.vy;
  }
}
