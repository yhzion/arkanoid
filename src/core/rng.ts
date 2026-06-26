export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  next(): number {
    let s = this.state;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    this.state = ((t ^ (t >>> 14)) >>> 0);
    return this.state;
  }

  nextFloat(): number {
    return this.next() / 4294967296;
  }

  getState(): number {
    return this.state;
  }

  setState(s: number): void {
    this.state = s;
  }
}
