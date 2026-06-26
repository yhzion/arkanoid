import type { VausState } from '../entities/vaus';
import type { BallState } from '../entities/ball';
import type { CapsuleState } from '../entities/capsules';
import type { EnemyState } from '../entities/enemies';
import type { BossState } from '../entities/boss';
import type { ILevelData } from '../data/levelSchema';
import type { GameConfig } from './GameConfig';

export interface PlayerState {
  score: number;
  lives: number;
  round: number;
  vaus: VausState;
  balls: BallState[];
  capsules: CapsuleState[];
  enemies: EnemyState[];
  boss: BossState | null;
  level: ILevelData | null;
  previousCapsule: string | null;
  spawnTimer: number;
  bossActive: boolean;
  levelCleared: boolean;
}

export function createPlayerState(): PlayerState {
  return {
    score: 0,
    lives: 3,
    round: 1,
    vaus: null!,
    balls: [],
    capsules: [],
    enemies: [],
    boss: null,
    level: null,
    previousCapsule: null,
    spawnTimer: 0,
    bossActive: false,
    levelCleared: false,
  };
}

export interface GameStateData {
  config: GameConfig;
  player: PlayerState;
  tick: number;
  pausedFrom: string | null;
  storyExit: 'idle' | 'newGame' | null;
  playerCount: number;
  continueRound: number;
}
