import { describe, it, expect, vi } from 'vitest';
import { AudioEngine } from '../../src/audio/audio';

// PRD §17.3: a paddle/Vaus hit has its own bounce cue, not the brick thud.
describe('paddle hit SFX (§17.3)', () => {
  it('plays the bounce cue on a VAUS (paddle) hit', () => {
    const engine = new AudioEngine();
    const spy = vi.spyOn(engine, 'playBounceSFX');
    engine.playBrickHitSFX('VAUS');
    expect(spy).toHaveBeenCalled();
  });
});
