export enum GameEvent {
  APP_BOOTED = 'APP_BOOTED',
  TITLE_SHOWN = 'TITLE_SHOWN',
  PLAYER_COUNT_CHANGED = 'PLAYER_COUNT_CHANGED',
  GAME_STARTED = 'GAME_STARTED',
  ROUND_STARTED = 'ROUND_STARTED',
  BALL_LAUNCHED = 'BALL_LAUNCHED',
  BRICK_HIT = 'BRICK_HIT',
  BRICK_DESTROYED = 'BRICK_DESTROYED',
  CAPSULE_SPAWNED = 'CAPSULE_SPAWNED',
  CAPSULE_COLLECTED = 'CAPSULE_COLLECTED',
  POWERUP_ACTIVATED = 'POWERUP_ACTIVATED',
  LASER_FIRED = 'LASER_FIRED',
  ENEMY_SPAWNED = 'ENEMY_SPAWNED',
  ENEMY_DESTROYED = 'ENEMY_DESTROYED',
  BALL_LOST = 'BALL_LOST',
  LIFE_LOST = 'LIFE_LOST',
  EXTRA_LIFE_AWARDED = 'EXTRA_LIFE_AWARDED',
  ROUND_CLEARED = 'ROUND_CLEARED',
  BREAK_WARP_OPENED = 'BREAK_WARP_OPENED',
  BREAK_WARP_ENTERED = 'BREAK_WARP_ENTERED',
  BOSS_STARTED = 'BOSS_STARTED',
  BOSS_HIT = 'BOSS_HIT',
  BOSS_PROJECTILE_FIRED = 'BOSS_PROJECTILE_FIRED',
  BOSS_DEFEATED = 'BOSS_DEFEATED',
  GAME_OVER = 'GAME_OVER',
  NAME_ENTRY_STARTED = 'NAME_ENTRY_STARTED',
  ENDING_STARTED = 'ENDING_STARTED',
  RETURNED_TO_TITLE = 'RETURNED_TO_TITLE',
  SCORE_CHANGED = 'SCORE_CHANGED',
  INPUT_ACTION = 'INPUT_ACTION',
}

export type PayloadMap = {
  [GameEvent.SCORE_CHANGED]: { newScore: number; delta: number; reason: string };
  [GameEvent.BRICK_DESTROYED]: { row: number; col: number; type: string; scoreDelta: number };
  [GameEvent.CAPSULE_COLLECTED]: { type: string };
  [GameEvent.ROUND_CLEARED]: { round: number };
  [GameEvent.BALL_LOST]: { ballsRemaining: number };
  [GameEvent.BOSS_HIT]: { damage: number };
  [GameEvent.PLAYER_COUNT_CHANGED]: { count: number };
  [GameEvent.LIFE_LOST]: { livesRemaining: number };
  [GameEvent.EXTRA_LIFE_AWARDED]: { totalLives: number };
  [GameEvent.ENEMY_DESTROYED]: { points: number };
  [GameEvent.CAPSULE_SPAWNED]: { type: string };
  [GameEvent.POWERUP_ACTIVATED]: { type: string };
  [GameEvent.BREAK_WARP_OPENED]: {};
  [GameEvent.BREAK_WARP_ENTERED]: {};
  [GameEvent.ROUND_STARTED]: { round: number };
  [GameEvent.BALL_LAUNCHED]: {};
  [GameEvent.LASER_FIRED]: {};
  [GameEvent.ENEMY_SPAWNED]: { type: string };
  [GameEvent.BOSS_PROJECTILE_FIRED]: {};
  [GameEvent.GAME_OVER]: {};
  [GameEvent.NAME_ENTRY_STARTED]: {};
  [GameEvent.ENDING_STARTED]: {};
  [GameEvent.RETURNED_TO_TITLE]: {};
  [GameEvent.APP_BOOTED]: {};
  [GameEvent.TITLE_SHOWN]: {};
  [GameEvent.GAME_STARTED]: {};
  [GameEvent.BRICK_HIT]: {};
  [GameEvent.BOSS_STARTED]: {};
  [GameEvent.BOSS_DEFEATED]: {};
  [GameEvent.INPUT_ACTION]: {};
};

export type EventHandler<E extends GameEvent> = (payload: PayloadMap[E]) => void;

export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on<E extends GameEvent>(event: E, handler: EventHandler<E>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off<E extends GameEvent>(event: E, handler: EventHandler<E>): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<E extends GameEvent>(event: E, payload: PayloadMap[E]): void {
    this.listeners.get(event)?.forEach(fn => fn(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
