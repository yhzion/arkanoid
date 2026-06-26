export class Brick {
  public x: number;
  public y: number;
  public width: number = 16;
  public height: number = 8;
  public hp: number;
  public scoreValue: number;

  constructor(x: number, y: number, hp: number, scoreValue: number) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.scoreValue = scoreValue;
  }
}
