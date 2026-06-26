// PRD §12.2: Capsule types
export type CapsuleType = 'S' | 'C' | 'L' | 'D' | 'P' | 'E' | 'B';

export class Capsule {
  x: number;
  y: number;
  w = 16;
  h = 7;
  type: CapsuleType;
  active = true;
  fallSpeed = 1; // §33.3

  constructor(x: number, y: number, type: CapsuleType) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  update(): void {
    if (!this.active) return;
    this.y += this.fallSpeed;
  }

  // PRD §12.1: 100 points for collecting
  getScore(): number {
    return 100;
  }
}

// PRD §12.3: Capsule type randomizer
export function selectCapsuleType(
  random: () => number,
  previousType: CapsuleType | null
): CapsuleType {
  const types: { type: CapsuleType; weight: number }[] = [
    { type: 'S', weight: 2 },
    { type: 'C', weight: 2 },
    { type: 'L', weight: 2 },
    { type: 'D', weight: 2 },
    { type: 'E', weight: 2 },
    { type: 'P', weight: 1 },
    { type: 'B', weight: 1 },
  ];

  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
  let r = random() * totalWeight;
  let selected: CapsuleType = 'D';

  for (const t of types) {
    r -= t.weight;
    if (r <= 0) {
      selected = t.type;
      break;
    }
  }

  // PRD §12.3: Duplicate prevention
  if (selected === previousType && selected !== 'D') {
    selected = 'D';
  }

  return selected;
}