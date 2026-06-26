// Minimal typed event bus used by the engine (PRD §26).
export const GameEvents = {
  APP_BOOTED: 'APP_BOOTED',
  TITLE_SHOWN: 'TITLE_SHOWN',
  PLAYER_COUNT_CHANGED: 'PLAYER_COUNT_CHANGED',
  GAME_STARTED: 'GAME_STARTED',
  ROUND_STARTED: 'ROUND_STARTED',
  BALL_LAUNCHED: 'BALL_LAUNCHED',
  BRICK_HIT: 'BRICK_HIT',
  BRICK_DESTROYED: 'BRICK_DESTROYED',
  CAPSULE_SPAWNED: 'CAPSULE_SPAWNED',
  CAPSULE_COLLECTED: 'CAPSULE_COLLECTED',
  POWERUP_ACTIVATED: 'POWERUP_ACTIVATED',
  LASER_FIRED: 'LASER_FIRED',
  ENEMY_SPAWNED: 'ENEMY_SPAWNED',
  ENEMY_DESTROYED: 'ENEMY_DESTROYED',
  BALL_LOST: 'BALL_LOST',
  LIFE_LOST: 'LIFE_LOST',
  EXTRA_LIFE_AWARDED: 'EXTRA_LIFE_AWARDED',
  ROUND_CLEARED: 'ROUND_CLEARED',
  BREAK_WARP_OPENED: 'BREAK_WARP_OPENED',
  BREAK_WARP_ENTERED: 'BREAK_WARP_ENTERED',
  BOSS_STARTED: 'BOSS_STARTED',
  BOSS_HIT: 'BOSS_HIT',
  BOSS_PROJECTILE_FIRED: 'BOSS_PROJECTILE_FIRED',
  BOSS_DEFEATED: 'BOSS_DEFEATED',
  GAME_OVER: 'GAME_OVER',
  NAME_ENTRY_STARTED: 'NAME_ENTRY_STARTED',
  ENDING_STARTED: 'ENDING_STARTED',
  RETURNED_TO_TITLE: 'RETURNED_TO_TITLE',
  SCORE_CHANGED: 'SCORE_CHANGED',
  INPUT_ACTION: 'INPUT_ACTION',
};

export class EventBus {
  constructor() { this.handlers = {}; }
  on(ev, fn) {
    (this.handlers[ev] || (this.handlers[ev] = [])).push(fn);
  }
  off(ev, fn) {
    const arr = this.handlers[ev];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  emit(ev, payload) {
    (this.handlers[ev] || []).forEach((fn) => fn(payload));
  }
}
