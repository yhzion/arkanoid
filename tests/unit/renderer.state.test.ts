import { describe, it, expect } from 'vitest';
import { isGameplayRenderState } from '../../src/render/renderer';

// PRD §8.2: the attract-mode demo replays real gameplay on screen, so the
// GAMEPLAY_DEMO state must render the playfield (not a black screen).
describe('isGameplayRenderState (§8.2)', () => {
  it('treats GAMEPLAY_DEMO as a gameplay-render state', () => {
    expect(isGameplayRenderState('GAMEPLAY_DEMO')).toBe(true);
  });

  it('treats active play states as gameplay-render states', () => {
    expect(isGameplayRenderState('PLAYING')).toBe(true);
    expect(isGameplayRenderState('BOSS_PLAYING')).toBe(true);
  });

  it('does not treat menu states as gameplay-render states', () => {
    expect(isGameplayRenderState('TITLE')).toBe(false);
    expect(isGameplayRenderState('GAME_OVER')).toBe(false);
  });
});
