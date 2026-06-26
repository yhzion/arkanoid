// PRD §19.3: GameState enum
export type GameState =
  | 'BOOT'
  | 'LOADING'
  | 'ERROR'
  | 'TITLE'
  | 'OPENING_STORY'
  | 'GAMEPLAY_DEMO'
  | 'ROUND_INTRO'
  | 'BALL_READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'LIFE_LOST'
  | 'ROUND_CLEAR'
  | 'BREAK_WARP'
  | 'TURN_HANDOFF'
  | 'GAME_OVER'
  | 'NAME_ENTRY'
  | 'BOSS_INTRO'
  | 'BOSS_PLAYING'
  | 'BOSS_DEFEATED'
  | 'ENDING';

// PRD §31: State transition table
interface Transition {
  from: GameState;
  event: string;
  to: GameState;
}

const TRANSITIONS: Transition[] = [
  { from: 'BOOT', event: 'loaded', to: 'TITLE' },
  { from: 'LOADING', event: 'loaded', to: 'TITLE' },
  { from: 'LOADING', event: 'error', to: 'ERROR' },
  { from: 'TITLE', event: 'idle_timeout', to: 'OPENING_STORY' },
  { from: 'TITLE', event: 'start_game', to: 'OPENING_STORY' },
  { from: 'TITLE', event: 'continue_code', to: 'ROUND_INTRO' },
  { from: 'OPENING_STORY', event: 'idle_timeout', to: 'GAMEPLAY_DEMO' },
  { from: 'OPENING_STORY', event: 'scroll_end', to: 'ROUND_INTRO' },
  { from: 'GAMEPLAY_DEMO', event: 'timeout', to: 'TITLE' },
  { from: 'GAMEPLAY_DEMO', event: 'any_input', to: 'TITLE' },
  { from: 'ROUND_INTRO', event: 'jingle_complete', to: 'BALL_READY' },
  { from: 'BALL_READY', event: 'fire', to: 'PLAYING' },
  { from: 'BALL_READY', event: 'level_skip', to: 'ROUND_INTRO' },
  { from: 'PLAYING', event: 'all_balls_lost', to: 'LIFE_LOST' },
  { from: 'PLAYING', event: 'round_cleared', to: 'ROUND_CLEAR' },
  { from: 'PLAYING', event: 'break_warp_entered', to: 'BREAK_WARP' },
  { from: 'PLAYING', event: 'pause', to: 'PAUSED' },
  { from: 'BOSS_PLAYING', event: 'pause', to: 'PAUSED' },
  { from: 'BALL_READY', event: 'pause', to: 'PAUSED' },
  { from: 'PAUSED', event: 'resume', to: 'PLAYING' },
  { from: 'PAUSED', event: 'quit', to: 'TITLE' },
  { from: 'LIFE_LOST', event: 'lives_remain', to: 'BALL_READY' },
  { from: 'LIFE_LOST', event: 'turn_handoff', to: 'TURN_HANDOFF' },
  { from: 'LIFE_LOST', event: 'no_lives', to: 'GAME_OVER' },
  { from: 'TURN_HANDOFF', event: 'handoff_complete', to: 'BALL_READY' },
  { from: 'ROUND_CLEAR', event: 'next_round', to: 'ROUND_INTRO' },
  { from: 'ROUND_CLEAR', event: 'boss_next', to: 'BOSS_INTRO' },
  { from: 'BREAK_WARP', event: 'warp_complete', to: 'ROUND_INTRO' },
  { from: 'BOSS_INTRO', event: 'intro_end', to: 'BOSS_PLAYING' },
  { from: 'BOSS_PLAYING', event: 'boss_defeated', to: 'BOSS_DEFEATED' },
  { from: 'BOSS_PLAYING', event: 'all_balls_lost', to: 'LIFE_LOST' },
  { from: 'BOSS_DEFEATED', event: 'defeat_end', to: 'ENDING' },
  { from: 'GAME_OVER', event: 'qualifies_leaderboard', to: 'NAME_ENTRY' },
  { from: 'GAME_OVER', event: 'timeout', to: 'TITLE' },
  { from: 'NAME_ENTRY', event: 'entry_complete', to: 'TITLE' },
  { from: 'ENDING', event: 'credits_end', to: 'TITLE' },
];

export class StateMachine {
  private state: GameState;
  private pausedFrom: GameState | null = null;
  private listeners = new Map<GameState, Set<() => void>>();

  constructor(initial: GameState = 'BOOT') {
    this.state = initial;
  }

  getState(): GameState {
    return this.state;
  }

  getPausedFrom(): GameState | null {
    return this.pausedFrom;
  }

  transition(event: string): boolean {
    const t = TRANSITIONS.find(
      (tr) => tr.from === this.state && tr.event === event
    );
    if (!t) return false;

    if (t.to === 'PAUSED') {
      this.pausedFrom = this.state;
    }
    if (t.from === 'PAUSED' && event === 'resume') {
      this.state = this.pausedFrom || t.to;
      this.pausedFrom = null;
    } else {
      this.state = t.to;
    }

    this.notify();
    return true;
  }

  onEnter(state: GameState, handler: () => void): () => void {
    let set = this.listeners.get(state);
    if (!set) {
      set = new Set();
      this.listeners.set(state, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  private notify(): void {
    const set = this.listeners.get(this.state);
    if (set) {
      for (const handler of set) handler();
    }
  }
}