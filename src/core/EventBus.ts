export enum GameEvents {
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

export interface ScoreChangedPayload { newScore: number; delta: number; reason: string; }
export interface BrickDestroyedPayload { row: number; col: number; type: string; scoreDelta: number; }
export interface CapsuleCollectedPayload { type: string; }
export interface RoundClearedPayload { round: number; }
export interface BallLostPayload { ballsRemaining: number; }
export interface BossHitPayload { damage: number; }
export interface CapsuleSpawnedPayload { row: number; col: number; capsuleType: string; }

export type EventPayloads = {
  [GameEvents.SCORE_CHANGED]: ScoreChangedPayload;
  [GameEvents.BRICK_DESTROYED]: BrickDestroyedPayload;
  [GameEvents.CAPSULE_COLLECTED]: CapsuleCollectedPayload;
  [GameEvents.ROUND_CLEARED]: RoundClearedPayload;
  [GameEvents.BALL_LOST]: BallLostPayload;
  [GameEvents.BOSS_HIT]: BossHitPayload;
  [GameEvents.CAPSULE_SPAWNED]: CapsuleSpawnedPayload;
};

type Listener<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on<T>(event: GameEvents, fn: Listener<T>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn as Listener);
  }

  off<T>(event: GameEvents, fn: Listener<T>): void {
    this.listeners.get(event)?.delete(fn as Listener);
  }

  emit<T>(event: GameEvents, payload?: T): void {
    this.listeners.get(event)?.forEach(fn => fn(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
