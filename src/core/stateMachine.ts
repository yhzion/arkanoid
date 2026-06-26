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

export type TransitionEvent =
  | 'assets_loaded'
  | 'load_failed'
  | 'idle_600t'
  | 'start_pressed'
  | 'continue_code'
  | 'story_idle_end'
  | 'story_game_start'
  | 'demo_end'
  | 'jingle_complete'
  | 'fire_pressed'
  | 'level_skip'
  | 'all_balls_lost'
  | 'round_cleared'
  | 'break_warp_entered'
  | 'pause_pressed'
  | 'quit_to_title'
  | 'lives_remaining'
  | 'no_lives'
  | 'boss_round'
  | 'next_round'
  | 'boss_intro_end'
  | 'boss_defeated'
  | 'boss_projectile_hit'
  | 'defeat_sequence_end'
  | 'qualifies_leaderboard'
  | 'no_leaderboard'
  | 'name_entry_done'
  | 'credits_end';

export interface StateTransition {
  from: GameState;
  event: TransitionEvent;
  to: GameState;
  guard?: () => boolean;
}

const transitions: StateTransition[] = [
  { from: 'BOOT', event: 'assets_loaded', to: 'TITLE' },
  { from: 'LOADING', event: 'assets_loaded', to: 'TITLE' },
  { from: 'LOADING', event: 'load_failed', to: 'ERROR' },
  { from: 'TITLE', event: 'idle_600t', to: 'OPENING_STORY' },
  { from: 'TITLE', event: 'start_pressed', to: 'OPENING_STORY' },
  { from: 'TITLE', event: 'continue_code', to: 'ROUND_INTRO' },
  { from: 'OPENING_STORY', event: 'story_idle_end', to: 'GAMEPLAY_DEMO' },
  { from: 'OPENING_STORY', event: 'story_game_start', to: 'ROUND_INTRO' },
  { from: 'GAMEPLAY_DEMO', event: 'demo_end', to: 'TITLE' },
  { from: 'ROUND_INTRO', event: 'jingle_complete', to: 'BALL_READY' },
  { from: 'ROUND_INTRO', event: 'level_skip', to: 'ROUND_INTRO' },
  { from: 'BALL_READY', event: 'fire_pressed', to: 'PLAYING' },
  { from: 'BALL_READY', event: 'level_skip', to: 'ROUND_INTRO' },
  { from: 'BALL_READY', event: 'pause_pressed', to: 'PAUSED' },
  { from: 'PLAYING', event: 'all_balls_lost', to: 'LIFE_LOST' },
  { from: 'PLAYING', event: 'round_cleared', to: 'ROUND_CLEAR' },
  { from: 'PLAYING', event: 'break_warp_entered', to: 'BREAK_WARP' },
  { from: 'PLAYING', event: 'pause_pressed', to: 'PAUSED' },
  { from: 'BOSS_PLAYING', event: 'pause_pressed', to: 'PAUSED' },
  { from: 'PAUSED', event: 'pause_pressed', to: 'PLAYING' },
  { from: 'PAUSED', event: 'quit_to_title', to: 'TITLE' },
  { from: 'LIFE_LOST', event: 'lives_remaining', to: 'BALL_READY' },
  { from: 'LIFE_LOST', event: 'no_lives', to: 'GAME_OVER' },
  { from: 'ROUND_CLEAR', event: 'boss_round', to: 'BOSS_INTRO' },
  { from: 'ROUND_CLEAR', event: 'next_round', to: 'ROUND_INTRO' },
  { from: 'BREAK_WARP', event: 'next_round', to: 'ROUND_INTRO' },
  { from: 'BOSS_INTRO', event: 'boss_intro_end', to: 'BOSS_PLAYING' },
  { from: 'BOSS_PLAYING', event: 'boss_defeated', to: 'BOSS_DEFEATED' },
  { from: 'BOSS_PLAYING', event: 'boss_projectile_hit', to: 'BOSS_PLAYING' },
  { from: 'BOSS_PLAYING', event: 'no_lives', to: 'GAME_OVER' },
  { from: 'BOSS_DEFEATED', event: 'defeat_sequence_end', to: 'ENDING' },
  { from: 'GAME_OVER', event: 'qualifies_leaderboard', to: 'NAME_ENTRY' },
  { from: 'GAME_OVER', event: 'no_leaderboard', to: 'TITLE' },
  { from: 'NAME_ENTRY', event: 'name_entry_done', to: 'TITLE' },
  { from: 'ENDING', event: 'credits_end', to: 'TITLE' },
];

export class StateMachine {
  private current: GameState = 'BOOT';
  private listeners = new Map<string, Array<(from: GameState, to: GameState) => void>>();

  getState(): GameState { return this.current; }

  setState(state: GameState): void {
    const prev = this.current;
    this.current = state;
    const fns = this.listeners.get('*') ?? [];
    const specific = this.listeners.get(state) ?? [];
    [...fns, ...specific].forEach(fn => fn(prev, state));
  }

  on(state: GameState | '*', fn: (from: GameState, to: GameState) => void): void {
    if (!this.listeners.has(state)) this.listeners.set(state, []);
    this.listeners.get(state)!.push(fn);
  }

  transition(event: TransitionEvent): boolean {
    for (const t of transitions) {
      if (t.from === this.current && t.event === event) {
        if (t.guard && !t.guard()) continue;
        const prev = this.current;
        this.current = t.to;
        const fns = this.listeners.get('*') ?? [];
        const specific = this.listeners.get(t.to) ?? [];
        [...fns, ...specific].forEach(fn => fn(prev, t.to));
        return true;
      }
    }
    return false;
  }

  canTransition(event: TransitionEvent): boolean {
    return transitions.some(t => t.from === this.current && t.event === event);
  }
}
