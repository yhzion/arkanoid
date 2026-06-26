export type StateName =
  | 'BOOT' | 'LOADING' | 'ERROR' | 'TITLE' | 'OPENING_STORY' | 'GAMEPLAY_DEMO'
  | 'ROUND_INTRO' | 'BALL_READY' | 'PLAYING' | 'PAUSED' | 'LIFE_LOST'
  | 'ROUND_CLEAR' | 'BREAK_WARP' | 'TURN_HANDOFF' | 'GAME_OVER' | 'NAME_ENTRY'
  | 'BOSS_INTRO' | 'BOSS_PLAYING' | 'BOSS_DEFEATED' | 'ENDING';

type Transition = { from: StateName | '*'; event: string; to: StateName };

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
  { from: 'ROUND_CLEAR', event: 'boss_round', to: 'BOSS_INTRO' },
  { from: 'BREAK_WARP', event: 'warp_complete', to: 'ROUND_INTRO' },
  { from: 'BOSS_INTRO', event: 'intro_end', to: 'BOSS_PLAYING' },
  { from: 'BOSS_PLAYING', event: 'boss_defeated', to: 'BOSS_DEFEATED' },
  { from: 'BOSS_PLAYING', event: 'vaus_hit_lives_remain', to: 'BOSS_PLAYING' },
  { from: 'BOSS_PLAYING', event: 'vaus_hit_no_lives', to: 'GAME_OVER' },
  { from: 'BOSS_DEFEATED', event: 'defeat_end', to: 'ENDING' },
  { from: 'GAME_OVER', event: 'qualifies', to: 'NAME_ENTRY' },
  { from: 'GAME_OVER', event: 'no_qualify', to: 'TITLE' },
  { from: 'NAME_ENTRY', event: 'entry_complete', to: 'TITLE' },
  { from: 'ENDING', event: 'ending_complete', to: 'TITLE' },
];

export class StateMachine {
  current: StateName = 'BOOT';
  pausedFrom: StateName = 'PLAYING';
  private handlers = new Map<string, Set<(from: StateName, to: StateName) => void>>();

  on(event: string, handler: (from: StateName, to: StateName) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  transition(event: string): boolean {
    const t = TRANSITIONS.find(t =>
      (t.from === this.current || t.from === '*') && t.event === event
    );
    if (!t) return false;
    const from = this.current;
    if (event === 'pause') this.pausedFrom = this.current;
    if (event === 'resume') {
      this.current = this.pausedFrom;
    } else {
      this.current = t.to;
    }
    this.handlers.get(event)?.forEach(h => h(from, this.current));
    this.handlers.get('*')?.forEach(h => h(from, this.current));
    return true;
  }

  is(state: StateName): boolean { return this.current === state; }
  isPlaying(): boolean { return this.current === 'PLAYING' || this.current === 'BOSS_PLAYING'; }
  isPausable(): boolean { return ['PLAYING', 'BALL_READY', 'BOSS_PLAYING'].includes(this.current); }
}
