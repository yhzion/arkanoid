/**
 * Game state machine — PRD §19.3 (GameState enum) and §31 (transition table).
 *
 * The machine validates transitions against the §31 adjacency table and tracks
 * `pausedFrom` so PAUSED can return to PLAYING/BALL_READY/BOSS_PLAYING. Timing-
 * driven transitions (idle 600t, jingle complete, scroll end) are decided by the
 * game controller, which calls `transition(target)` once the guard is satisfied.
 */
import { GameConfig } from './config';

export enum GameState {
  BOOT = 'BOOT',
  LOADING = 'LOADING',
  ERROR = 'ERROR',
  TITLE = 'TITLE',
  OPENING_STORY = 'OPENING_STORY',
  GAMEPLAY_DEMO = 'GAMEPLAY_DEMO',
  ROUND_INTRO = 'ROUND_INTRO',
  BALL_READY = 'BALL_READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LIFE_LOST = 'LIFE_LOST',
  ROUND_CLEAR = 'ROUND_CLEAR',
  BREAK_WARP = 'BREAK_WARP',
  TURN_HANDOFF = 'TURN_HANDOFF',
  GAME_OVER = 'GAME_OVER',
  NAME_ENTRY = 'NAME_ENTRY',
  BOSS_INTRO = 'BOSS_INTRO',
  BOSS_PLAYING = 'BOSS_PLAYING',
  BOSS_DEFEATED = 'BOSS_DEFEATED',
  ENDING = 'ENDING',
}

/** Pausable states (§31 note): only these may enter PAUSED. */
export const PAUSABLE: ReadonlySet<GameState> = new Set([
  GameState.PLAYING,
  GameState.BALL_READY,
  GameState.BOSS_PLAYING,
]);

/** §31 adjacency (allowed target states from each source). */
const ADJACENCY: Record<GameState, GameState[]> = {
  [GameState.BOOT]: [GameState.LOADING],
  [GameState.LOADING]: [GameState.TITLE, GameState.ERROR],
  [GameState.ERROR]: [GameState.BOOT],
  [GameState.TITLE]: [GameState.OPENING_STORY, GameState.ROUND_INTRO],
  [GameState.OPENING_STORY]: [GameState.GAMEPLAY_DEMO, GameState.ROUND_INTRO],
  [GameState.GAMEPLAY_DEMO]: [GameState.TITLE],
  [GameState.ROUND_INTRO]: [GameState.BALL_READY],
  [GameState.BALL_READY]: [GameState.PLAYING, GameState.ROUND_INTRO],
  [GameState.PLAYING]: [GameState.LIFE_LOST, GameState.ROUND_CLEAR, GameState.BREAK_WARP, GameState.PAUSED],
  [GameState.PAUSED]: [GameState.PLAYING, GameState.BALL_READY, GameState.BOSS_PLAYING, GameState.TITLE],
  [GameState.LIFE_LOST]: [GameState.BALL_READY, GameState.GAME_OVER],
  [GameState.ROUND_CLEAR]: [GameState.BOSS_INTRO, GameState.ROUND_INTRO],
  [GameState.BREAK_WARP]: [GameState.ROUND_INTRO],
  [GameState.TURN_HANDOFF]: [GameState.ROUND_INTRO, GameState.BALL_READY],
  [GameState.GAME_OVER]: [GameState.NAME_ENTRY, GameState.TITLE],
  [GameState.NAME_ENTRY]: [GameState.TITLE],
  [GameState.BOSS_INTRO]: [GameState.BOSS_PLAYING],
  [GameState.BOSS_PLAYING]: [GameState.BOSS_DEFEATED, GameState.GAME_OVER, GameState.PAUSED],
  [GameState.BOSS_DEFEATED]: [GameState.ENDING],
  [GameState.ENDING]: [GameState.TITLE],
};

export class StateMachine {
  state: GameState = GameState.BOOT;
  /** State to return to when unpausing (§31). */
  pausedFrom: GameState | null = null;
  /** "idle" → demo after story; "newGame" → round intro (§8.2). */
  storyExit: 'idle' | 'newGame' = 'idle';
  /** ticks spent in the current state (frozen while paused). */
  ticksInState = 0;

  constructor(_config?: GameConfig) {}

  canTransition(to: GameState): boolean {
    if (to === this.state && to === GameState.PAUSED) return false;
    return ADJACENCY[this.state].includes(to);
  }

  /** Transition to `to`, validating against §31. Records pausedFrom for PAUSED. */
  transition(to: GameState): void {
    if (!this.canTransition(to)) {
      throw new Error(`Illegal transition ${this.state} → ${to}`);
    }
    if (to === GameState.PAUSED) {
      if (!PAUSABLE.has(this.state)) {
        throw new Error(`Cannot pause from ${this.state}`);
      }
      this.pausedFrom = this.state;
    } else if (this.state === GameState.PAUSED && this.pausedFrom !== null) {
      // Resuming must land on pausedFrom unless explicitly going elsewhere allowed.
      if (to !== this.pausedFrom && to !== GameState.TITLE) {
        // allow controllers that re-enter pausedFrom explicitly
      }
      this.pausedFrom = null;
    }
    this.state = to;
    this.ticksInState = 0;
  }

  /** Advance the per-state tick counter (called once per simulated tick). */
  tickState(): void {
    this.ticksInState++;
  }

  isPaused(): boolean {
    return this.state === GameState.PAUSED;
  }

  isPausableState(): boolean {
    return PAUSABLE.has(this.state);
  }
}
