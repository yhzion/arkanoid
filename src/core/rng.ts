function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash = hash & hash;
  }
  return hash >>> 0;
}

export class RNG {
  private state: number;
  private nextFn: () => number;

  constructor(seed: string | number, playerIndex = 0) {
    const base = typeof seed === 'string' ? hashSeed(seed) : seed;
    this.state = (base ^ playerIndex) >>> 0;
    this.nextFn = mulberry32(this.state);
  }

  next(): number {
    return this.nextFn();
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  nextFloat(): number {
    return this.next();
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state;
    this.nextFn = mulberry32(state);
  }
}
