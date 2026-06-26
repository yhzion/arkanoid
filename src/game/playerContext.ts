/**
 * Two-player context + turn handoff baseline — PRD §10.6.
 *
 * Each player owns an independent score, round number, lives, and (on life loss)
 * a restored board state. The full TURN_HANDOFF state machine is [DEFERRED → M3]
 * (§10.6 / §31); this module provides the per-player context and the alternation
 * rule so the controller can drive 2P once that state is wired.
 */
import { ILevelData } from '../data/schemas';

export interface PlayerContext {
  index: 0 | 1;
  score: number;
  roundNumber: number;
  lives: number;
  /** Snapshot of the player's board for restore on turn regain (§10.6). */
  boardSnapshot: ILevelData | null;
  gameOver: boolean;
}

export function createPlayer(index: 0 | 1, lives: number): PlayerContext {
  return { index, score: 0, roundNumber: 1, lives, boardSnapshot: null, gameOver: false };
}

/**
 * Turn manager: alternates on life loss; once a player is out of lives their game
 * ends and the other continues sequentially without further alternation (§10.6).
 */
export class TurnManager {
  constructor(public players: [PlayerContext, PlayerContext], public active = 0 as 0 | 1) {}

  current(): PlayerContext {
    return this.players[this.active];
  }

  /** Called when the active player loses a life (still has lives → switch; else game over). */
  onLifeLost(): 0 | 1 | null {
    const cur = this.current();
    if (cur.lives <= 0) {
      cur.gameOver = true;
      // Hand off to the other player if they still have lives.
      const other = (1 - this.active) as 0 | 1;
      if (!this.players[other].gameOver) {
        this.active = other;
        return other;
      }
      return null; // both done
    }
    // Lives remain → alternate (unless the other is already out).
    const other = (1 - this.active) as 0 | 1;
    if (!this.players[other].gameOver) {
      this.active = other;
      return other;
    }
    return this.active; // other player already out; same player continues
  }

  bothGameOver(): boolean {
    return this.players[0].gameOver && this.players[1].gameOver;
  }
}
