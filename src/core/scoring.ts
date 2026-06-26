import { BrickType } from '../data/levelSchema';

const BRICK_SCORES: Record<string, number> = {
  WHITE: 50, ORANGE: 60, LIGHT_BLUE: 70, GREEN: 80,
  RED: 90, BLUE: 100, PINK: 110, YELLOW: 120,
};

export function brickScore(type: BrickType, round: number): number {
  if (type === 'SILVER') return 50 * round;
  return BRICK_SCORES[type] ?? 0;
}

const FIRST_EXTRA_LIFE = 20000;
const EXTRA_LIFE_INTERVAL = 60000;

export function extraLivesAwarded(prevScore: number, newScore: number): number {
  let count = 0;
  let threshold = FIRST_EXTRA_LIFE;
  while (threshold <= newScore) {
    if (prevScore < threshold) count++;
    threshold += EXTRA_LIFE_INTERVAL;
  }
  return count;
}
