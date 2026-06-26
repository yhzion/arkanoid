import { GameConfig, LevelData, BrickCell } from '../data/levelSchema';
import { EventBus, GameEvent } from './eventBus';
import { Mulberry32 } from './rng';
import { Scoring } from './scoring';
import { Vaus } from '../entities/vaus';
import { BallState } from '../entities/ball';
import { BrickManager, BrickGridCell } from '../entities/bricks';
import { CapsuleManager } from '../entities/capsules';
import { EnemyManager } from '../entities/enemies';
import { BossManager } from '../entities/boss';

export type GameStateType =
  | 'BOOT' | 'LOADING' | 'ERROR'
  | 'TITLE' | 'OPENING_STORY' | 'GAMEPLAY_DEMO'
  | 'ROUND_INTRO' | 'BALL_READY' | 'PLAYING'
  | 'PAUSED' | 'LIFE_LOST' | 'ROUND_CLEAR'
  | 'BREAK_WARP' | 'GAME_OVER' | 'NAME_ENTRY'
  | 'BOSS_INTRO' | 'BOSS_PLAYING' | 'BOSS_DEFEATED'
  | 'ENDING';

export interface PlayerState {
  score: number;
  lives: number;
  round: number;
  balls: BallState[];
  vaus: Vaus;
  activePowerUp: string | null;
  capsulePrevious: string | null;
  tickSinceCatch: number;
  bricks: BrickManager;
  capsules: CapsuleManager;
  enemies: EnemyManager;
  boss: BossManager | null;
}

export class GameState {
  state: GameStateType = 'BOOT';
  config: GameConfig;
  eventBus: EventBus;
  scoring: Scoring;
  rng: Mulberry32;
  player: PlayerState;
  tick = 0;
  pausedFrom: GameStateType | null = null;
  storyExit: 'idle' | 'newGame' = 'idle';
  lastPlayedRound = 1;
  continueUsed = false;
  bossRound: number;
  levels: Map<string, LevelData> = new Map();

  constructor(config: GameConfig) {
    this.config = config;
    this.eventBus = new EventBus();
    this.scoring = new Scoring(this.eventBus);
    this.rng = new Mulberry32(this.seedToInt(config.deterministicSeed));
    this.bossRound = config.region === 'US' ? 36 : 33;
    this.player = this.createPlayer();
  }

  private seedToInt(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const ch = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return hash;
  }

  private createPlayer(): PlayerState {
    return {
      score: 0,
      lives: 3,
      round: 1,
      balls: [],
      vaus: new Vaus(),
      activePowerUp: null,
      capsulePrevious: null,
      tickSinceCatch: 0,
      bricks: new BrickManager(),
      capsules: new CapsuleManager(),
      enemies: new EnemyManager(),
      boss: null,
    };
  }

  resetPlayer(): void {
    this.player = this.createPlayer();
    this.scoring.reset();
  }

  setState(s: GameStateType): void {
    this.state = s;
  }
}
