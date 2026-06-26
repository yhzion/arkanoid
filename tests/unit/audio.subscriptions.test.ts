import { describe, it, expect } from 'vitest';
import '../../src/audio/audio'; // module-level `new AudioEngine()` registers EventBus handlers
import { EventBus, GameEvents } from '../../src/core/eventBus';

// PRD §17.3: these gameplay events previously had no SFX cue subscribed.
describe('Audio SFX subscriptions (§17.3)', () => {
  it('subscribes handlers for previously-silent gameplay events', () => {
    const listeners = (EventBus as unknown as { listeners: Map<string, unknown[]> }).listeners;
    const required = [
      GameEvents.ENEMY_DESTROYED,
      GameEvents.CAPSULE_SPAWNED,
      GameEvents.POWERUP_ACTIVATED,
      GameEvents.BOSS_DEFEATED,
      GameEvents.BOSS_PROJECTILE_FIRED,
      GameEvents.BREAK_WARP_OPENED,
    ];
    for (const evt of required) {
      expect(listeners.get(evt)?.length ?? 0, `no listener for ${evt}`).toBeGreaterThan(0);
    }
  });
});
