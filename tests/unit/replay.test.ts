import { describe, it, expect } from 'vitest';
import { ReplaySystem } from '../../src/core/replay';

function makeLog(overrides: Record<string, unknown> = {}) {
  return {
    formatVersion: ReplaySystem.FORMAT_VERSION,
    gameVersion: '0.0.0',
    region: 'US',
    mode: 'clean-room',
    seed: 's',
    startRound: 1,
    configHash: 'HASH',
    deflectionModel: 'continuous',
    jitterEnabled: false,
    numericModel: 'q16.16-v1',
    prngState: [],
    inputTicks: [
      { tick: 0, input: { left: false, right: true, fire: false, paddleX: 100 } },
      { tick: 1, input: { left: true, right: false, fire: true, paddleX: 90 } },
    ],
    ...overrides,
  } as any;
}

describe('ReplaySystem validation (§19.4.1, §30.7)', () => {
  it('rejects on formatVersion mismatch', () => {
    const rs = new ReplaySystem();
    expect(() => rs.loadReplay(makeLog({ formatVersion: 999 }), 'HASH')).toThrow();
  });

  it('rejects on configHash mismatch', () => {
    const rs = new ReplaySystem();
    expect(() => rs.loadReplay(makeLog(), 'WRONG')).toThrow();
  });

  it('rejects a non-dense log (tick !== index)', () => {
    const rs = new ReplaySystem();
    const log = makeLog({
      inputTicks: [
        { tick: 0, input: { left: false, right: false, fire: false, paddleX: 0 } },
        { tick: 5, input: { left: false, right: false, fire: false, paddleX: 0 } },
      ],
    });
    expect(() => rs.loadReplay(log, 'HASH')).toThrow();
  });

  it('accepts a matching dense log and plays it back by tick index', () => {
    const rs = new ReplaySystem();
    rs.loadReplay(makeLog(), 'HASH');
    const t0 = rs.playTick(0);
    expect(t0?.right).toBe(true);
    expect(t0?.pointerXAbsolute).toBe(100);
    const t1 = rs.playTick(1);
    expect(t1?.fire).toBe(true);
  });

  it('returns null when the replay is exhausted', () => {
    const rs = new ReplaySystem();
    rs.loadReplay(makeLog(), 'HASH');
    rs.playTick(0);
    rs.playTick(1);
    expect(rs.playTick(2)).toBeNull();
  });
});

describe('ReplaySystem record roundtrip (§30.6 paddleX)', () => {
  it('records paddleX as the quantized pointer position, dropping non-schema fields', () => {
    const rs = new ReplaySystem();
    rs.startRecording();
    rs.recordTick(0, {
      left: false,
      right: false,
      fire: true,
      start: false,
      select: false,
      pointerXDelta: 2.7,
      pointerXAbsolute: 123.6,
      pointerClicked: true,
    });
    const out = rs.stopRecording();
    expect(out[0].tick).toBe(0);
    expect(out[0].input.paddleX).toBe(124); // Math.round(123.6)
    expect(out[0].input.fire).toBe(true);
    expect((out[0].input as any).pointerXAbsolute).toBeUndefined();
    expect((out[0].input as any).select).toBeUndefined();
  });
});
