/**
 * EventBus — event_bus.md / PRD §26 (minimum event list).
 *
 * Decouples simulation from rendering, audio, and UI. The bus is synchronous:
 * emit dispatches to all listeners before returning, so HUD/audio see state
 * updates within the same tick. `SCORE_CHANGED` and `INPUT_ACTION` are
 * engine-internal additions (not in the §26 minimum list).
 */
import { BrickType, CapsuleType } from '../data/schemas';

export enum GameEvents {
  // --- §26 minimum event list ---
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
  // --- engine-internal additions ---
  SCORE_CHANGED = 'SCORE_CHANGED',
  INPUT_ACTION = 'INPUT_ACTION',
}

export interface ScoreChangedPayload {
  newScore: number;
  delta: number;
  reason: string;
}
export interface BrickDestroyedPayload {
  row: number;
  col: number;
  type: BrickType;
  scoreDelta: number;
}
export interface BrickHitPayload {
  row: number;
  col: number;
  type: BrickType;
}
export interface CapsuleCollectedPayload {
  type: CapsuleType;
}
export interface CapsuleSpawnedPayload {
  type: CapsuleType;
}
export interface PowerupActivatedPayload {
  type: CapsuleType;
}
export interface RoundClearedPayload {
  round: number;
}
export interface BallLostPayload {
  ballsRemaining: number;
}
export interface BossHitPayload {
  damage: number;
}
export interface PlayerCountChangedPayload {
  count: 1 | 2;
}
export interface RoundStartedPayload {
  round: number;
}
export interface ExtraLifePayload {
  lives: number;
}
export interface EnemyDestroyedPayload {
  points: number;
}
export interface InputActionPayload {
  action: string;
}

/** Payload map: every event → its payload type (void if none). */
export interface EventPayloadMap {
  [GameEvents.APP_BOOTED]: void;
  [GameEvents.TITLE_SHOWN]: void;
  [GameEvents.PLAYER_COUNT_CHANGED]: PlayerCountChangedPayload;
  [GameEvents.GAME_STARTED]: void;
  [GameEvents.ROUND_STARTED]: RoundStartedPayload;
  [GameEvents.BALL_LAUNCHED]: void;
  [GameEvents.BRICK_HIT]: BrickHitPayload;
  [GameEvents.BRICK_DESTROYED]: BrickDestroyedPayload;
  [GameEvents.CAPSULE_SPAWNED]: CapsuleSpawnedPayload;
  [GameEvents.CAPSULE_COLLECTED]: CapsuleCollectedPayload;
  [GameEvents.POWERUP_ACTIVATED]: PowerupActivatedPayload;
  [GameEvents.LASER_FIRED]: void;
  [GameEvents.ENEMY_SPAWNED]: void;
  [GameEvents.ENEMY_DESTROYED]: EnemyDestroyedPayload;
  [GameEvents.BALL_LOST]: BallLostPayload;
  [GameEvents.LIFE_LOST]: void;
  [GameEvents.EXTRA_LIFE_AWARDED]: ExtraLifePayload;
  [GameEvents.ROUND_CLEARED]: RoundClearedPayload;
  [GameEvents.BREAK_WARP_OPENED]: void;
  [GameEvents.BREAK_WARP_ENTERED]: void;
  [GameEvents.BOSS_STARTED]: void;
  [GameEvents.BOSS_HIT]: BossHitPayload;
  [GameEvents.BOSS_PROJECTILE_FIRED]: void;
  [GameEvents.BOSS_DEFEATED]: void;
  [GameEvents.GAME_OVER]: void;
  [GameEvents.NAME_ENTRY_STARTED]: void;
  [GameEvents.ENDING_STARTED]: void;
  [GameEvents.RETURNED_TO_TITLE]: void;
  [GameEvents.SCORE_CHANGED]: ScoreChangedPayload;
  [GameEvents.INPUT_ACTION]: InputActionPayload;
}

export type GameEvent = keyof EventPayloadMap;
export type Listener<E extends GameEvent> = (payload: EventPayloadMap[E]) => void;

export class EventBus {
  private listeners = new Map<GameEvent, Set<Function>>();

  on<E extends GameEvent>(event: E, fn: Listener<E>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Function);
    return () => {
      set!.delete(fn as Function);
    };
  }

  emit<E extends GameEvent>(event: E, payload?: EventPayloadMap[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      (fn as (p?: unknown) => void)(payload);
    }
  }

  /** Remove all listeners (used by tests / teardown). */
  clear(): void {
    this.listeners.clear();
  }
}
