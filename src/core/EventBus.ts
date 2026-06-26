type Handler = (data?: any) => void;

export type GameEventType =
  | 'APP_BOOTED' | 'TITLE_SHOWN' | 'PLAYER_COUNT_CHANGED' | 'GAME_STARTED'
  | 'ROUND_STARTED' | 'BALL_LAUNCHED' | 'BRICK_HIT' | 'BRICK_DESTROYED'
  | 'CAPSULE_SPAWNED' | 'CAPSULE_COLLECTED' | 'POWERUP_ACTIVATED'
  | 'LASER_FIRED' | 'ENEMY_SPAWNED' | 'ENEMY_DESTROYED'
  | 'BALL_LOST' | 'LIFE_LOST' | 'EXTRA_LIFE_AWARDED'
  | 'ROUND_CLEARED' | 'BREAK_WARP_OPENED' | 'BREAK_WARP_ENTERED'
  | 'BOSS_STARTED' | 'BOSS_HIT' | 'BOSS_PROJECTILE_FIRED' | 'BOSS_DEFEATED'
  | 'GAME_OVER' | 'NAME_ENTRY_STARTED' | 'ENDING_STARTED' | 'RETURNED_TO_TITLE';

export class EventBus {
  private listeners = new Map<GameEventType, Set<Handler>>();
  private wildcard = new Set<(event: GameEventType, data?: any) => void>();

  on(event: GameEventType, handler: Handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  onAll(handler: (event: GameEventType, data?: any) => void) { this.wildcard.add(handler); }

  off(event: GameEventType, handler: Handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: GameEventType, data?: any) {
    this.listeners.get(event)?.forEach(h => h(data));
    this.wildcard.forEach(h => h(event, data));
  }

  clear() { this.listeners.clear(); this.wildcard.clear(); }
}
