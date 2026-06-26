import { describe, it, expect } from 'vitest';
import { EventBus, GameEvents } from './eventBus';

describe('EventBus (§26)', () => {
  it('delivers typed payloads synchronously', () => {
    const bus = new EventBus();
    let received: number | undefined;
    bus.on(GameEvents.SCORE_CHANGED, (p) => {
      received = p.newScore;
    });
    bus.emit(GameEvents.SCORE_CHANGED, { newScore: 500, delta: 50, reason: 'brick' });
    expect(received).toBe(500);
  });

  it('unsubscribe stops delivery', () => {
    const bus = new EventBus();
    let count = 0;
    const off = bus.on(GameEvents.BRICK_DESTROYED, () => count++);
    bus.emit(GameEvents.BRICK_DESTROYED, { row: 0, col: 0, type: 'RED', scoreDelta: 90 });
    off();
    bus.emit(GameEvents.BRICK_DESTROYED, { row: 1, col: 1, type: 'RED', scoreDelta: 90 });
    expect(count).toBe(1);
  });

  it('supports void-payload events', () => {
    const bus = new EventBus();
    let seen = false;
    bus.on(GameEvents.BALL_LAUNCHED, () => {
      seen = true;
    });
    bus.emit(GameEvents.BALL_LAUNCHED);
    expect(seen).toBe(true);
  });
});
