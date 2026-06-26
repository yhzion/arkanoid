import type { InputState } from '../input/input.js';

export class Vaus {
  public x: number;
  public y: number;
  public width: number = 32; // Default width
  public height: number = 8;
  public speed: number = 3; // PRD 33.2 Digital move step

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(input: InputState) {
    if (input.left) {
      this.x -= this.speed;
    }
    if (input.right) {
      this.x += this.speed;
    }

    // Boundary constraints (Assuming PRD 10.1 playfield width 224, margins 16)
    // Left wall: x=16. Right wall: x=208 (224-16)
    // Vaus x is top-left.
    const PLAYFIELD_MIN_X = 16;
    const PLAYFIELD_MAX_X = 224 - 16;

    if (this.x < PLAYFIELD_MIN_X) {
      this.x = PLAYFIELD_MIN_X;
    }
    if (this.x + this.width > PLAYFIELD_MAX_X) {
      this.x = PLAYFIELD_MAX_X - this.width;
    }
  }
}
