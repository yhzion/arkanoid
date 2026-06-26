import { BrickType } from '../data/levelSchema';

const BRICK_SCORES: Record<string, number> = {
  WHITE: 50,
  ORANGE: 60,
  LIGHT_BLUE: 70,
  GREEN: 80,
  RED: 90,
  BLUE: 100,
  PINK: 110,
  YELLOW: 120,
};

export function brickScore(type: BrickType, round: number): number {
  if (type === 'SILVER') return 50 * round;
  return BRICK_SCORES[type] ?? 0;
}

export const SCORE_BREAK_WARP = 10000;
export const SCORE_CAPSULE = 100;
export const SCORE_ENEMY = 100;
export const SCORE_BOSS_HIT = 1000;
export const SCORE_BOSS_DEFEAT = 50000;

export const EXTRA_LIFE_FIRST = 20000;
export const EXTRA_LIFE_INTERVAL = 60000;

export function extraLivesToAward(prevScore: number, newScore: number): number {
  if (newScore < EXTRA_LIFE_FIRST) return 0;
  const prevThreshold = prevScore < EXTRA_LIFE_FIRST ? EXTRA_LIFE_FIRST - EXTRA_LIFE_INTERVAL : prevScore;
  const prevAwards = Math.max(0, Math.floor((prevThreshold - EXTRA_LIFE_FIRST) / EXTRA_LIFE_INTERVAL) + 1);
  const newAwards = Math.max(0, Math.floor((newScore - EXTRA_LIFE_FIRST) / EXTRA_LIFE_INTERVAL) + 1);
  return Math.max(0, newAwards - prevAwards);
}
