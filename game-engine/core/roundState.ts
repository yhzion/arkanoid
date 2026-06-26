// PRD 19.3.4 Round/Playfield State (S6)

import { Ball } from '../entities/ball.js';
import { Brick } from '../entities/bricks.js';
import { Vaus } from '../entities/vaus.js';

export interface RoundState {
  vaus: Vaus | null;
  balls: Ball[];
  bricks: Brick[];
  // Other entities like enemies, capsules will be added here
  // ticksSinceRoundStart: number;
}

export function createInitialRoundState(): RoundState {
  return {
    vaus: null,
    balls: [],
    bricks: [],
  };
}
