// PRD §10.2: Energy Ball
export class Ball {
  x: number;
  y: number;
  w = 5;
  h = 4;
  vx: number;
  vy: number;
  speed: number;
  active = true;
  held = true; // Ball sits on Vaus until launched
  bounceCount = 0;

  constructor(x: number, y: number, speed = 2.0) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.vx = 0;
    this.vy = 0;
  }

  // PRD §10.3: Launch at 60° angle
  launch(direction: 1 | -1): void {
    const angle = (60 * Math.PI) / 180;
    this.vx = Math.sin(angle) * this.speed * direction;
    this.vy = -Math.cos(angle) * this.speed;
    this.held = false;
  }

  update(): void {
    if (this.held || !this.active) return;
    this.x += this.vx;
    this.y += this.vy;
  }

  // PRD §10.2: Speed scaling
  applySpeedIncrease(): void {
    this.speed = Math.min(5.0, this.speed + 0.25);
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      const ratio = this.speed / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }
  }

  setSpeed(newSpeed: number): void {
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      const ratio = newSpeed / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }
    this.speed = newSpeed;
  }
}