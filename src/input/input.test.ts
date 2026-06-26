import { describe, it, expect } from 'vitest';
import { InputSource, KeyboardBackend, Action, DEFAULT_KEYBOARD_REMAP } from './input';

describe('InputSource (§30.6 per-tick sampling)', () => {
  it('detects press edges (rising) and held state', () => {
    const kb = new KeyboardBackend(fakeTarget(), DEFAULT_KEYBOARD_REMAP);
    const src = new InputSource(kb);

    kb.setHeld([Action.FIRE]);
    const s1 = src.sample();
    expect(s1.fire).toBe(true);
    expect(s1.firePressed).toBe(true); // edge

    const s2 = src.sample();
    expect(s2.fire).toBe(true);
    expect(s2.firePressed).toBe(false); // no new edge while held
  });

  it('left/right are held levels', () => {
    const kb = new KeyboardBackend(fakeTarget());
    const src = new InputSource(kb);
    kb.setHeld([Action.LEFT]);
    expect(src.sample().left).toBe(true);
    kb.setHeld([]);
    expect(src.sample().left).toBe(false);
  });

  it('quantizes and clamps pointer paddleX to integer playfield px', () => {
    const src = new InputSource({
      poll: () => ({ held: new Set(), paddleX: 999.7 }),
    });
    expect(src.sample().paddleX).toBe(184); // clamped to PLAY_RIGHT
    const src2 = new InputSource({ poll: () => ({ held: new Set(), paddleX: -5 }) });
    expect(src2.sample().paddleX).toBe(8); // PLAY_LEFT
    const src3 = new InputSource({ poll: () => ({ held: new Set(), paddleX: 100.9 }) });
    expect(src3.sample().paddleX).toBe(100);
  });
});

function fakeTarget() {
  const handlers: Record<string, ((e: { code: string }) => void)[]> = {};
  return {
    addEventListener: (t: string, cb: (e: { code: string }) => void) => {
      (handlers[t] ||= []).push(cb);
    },
    fire: (t: string, code: string) => handlers[t]?.forEach((cb) => cb({ code })),
  };
}
