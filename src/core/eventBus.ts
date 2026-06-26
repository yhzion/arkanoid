export enum GameEvents {
    // --- Section 26 minimum event list ---
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

    // --- Engine-internal additions (not in Section 26 minimum list) ---
    SCORE_CHANGED = 'SCORE_CHANGED',
    INPUT_ACTION = 'INPUT_ACTION'
}

export type Listener<T = any> = (payload: T) => void;

class EventBusImpl {
    private listeners: Map<string, Listener[]> = new Map();

    public on<T = any>(event: GameEvents | string, listener: Listener<T>): void {
        const eventStr = event as string;
        if (!this.listeners.has(eventStr)) {
            this.listeners.set(eventStr, []);
        }
        this.listeners.get(eventStr)!.push(listener);
    }

    public off<T = any>(event: GameEvents | string, listener: Listener<T>): void {
        const eventStr = event as string;
        if (!this.listeners.has(eventStr)) return;
        const list = this.listeners.get(eventStr)!;
        const index = list.indexOf(listener);
        if (index !== -1) {
            list.splice(index, 1);
        }
    }

    public emit<T = any>(event: GameEvents | string, payload?: T): void {
        const eventStr = event as string;
        if (!this.listeners.has(eventStr)) return;
        const list = [...this.listeners.get(eventStr)!];
        for (const listener of list) {
            try {
                listener(payload);
            } catch (err) {
                console.error(`Error in event listener for ${eventStr}:`, err);
            }
        }
    }
}

export const EventBus = new EventBusImpl();
export default EventBus;
