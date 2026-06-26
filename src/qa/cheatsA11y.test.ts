import { describe, it, expect } from 'vitest';
import { ContinueCodeTracker } from '../game/cheats';
import { colorBlindGlyphsDistinct, meetsTouchTarget, minScaleForTouchTarget, withinFlashLimit, touchTargetCssPx } from '../ui/accessibility';
import { EventBus } from '../core/eventBus';
import { DEFAULT_CONFIG } from '../core/config';
import { GameState } from '../core/stateMachine';
import { GameController } from '../game/gameController';
import { PersistenceStore } from '../data/persistence';
import { ILevelData, IBrickCell } from '../data/schemas';
import { EMPTY_SNAPSHOT } from '../input/input';

describe('Cheats (§14.7, §34.2)', () => {
  it('continue code: A+B held + Select×5 + Start triggers', () => {
    const t = new ContinueCodeTracker();
    for (let i = 0; i < 5; i++) {
      expect(t.feed({ a: true, b: true, selectEdge: true, startEdge: false })).toBe(false);
    }
    // 6th select still false; now Start triggers.
    expect(t.feed({ a: false, b: false, selectEdge: false, startEdge: true })).toBe(true);
  });

  it('continue code ignores Start before 5 selects', () => {
    const t = new ContinueCodeTracker();
    t.feed({ a: true, b: true, selectEdge: true, startEdge: false });
    expect(t.feed({ a: false, b: false, selectEdge: false, startEdge: true })).toBe(false);
  });

  it('level-skip cheat advances the round at BALL_READY (cap 16)', () => {
    const bus = new EventBus();
    const cfg = { ...DEFAULT_CONFIG, enableManualLevelSkipSecret: true };
    const provider = (_r: 'US' | 'JP', round: number): ILevelData => ({
      id: `r${round}`, region: 'US', roundNumber: round, type: 'brick',
      grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
      clearRequiredCount: 1,
      cells: [{ col: 5, row: 5, type: 'RED', hitsRemaining: 1, capsule: null, isCapsuleCarrier: false, clearRequired: true } as IBrickCell],
      enemyProfile: 'd', ballProfile: 'd', paletteProfile: 'd',
    });
    const c = new GameController({ config: cfg, bus, store: new PersistenceStore(), levelProvider: provider });
    c.bootToTitle();
    c.tick({ ...EMPTY_SNAPSHOT, start: true }); // → story
    c.tick({ ...EMPTY_SNAPSHOT, firePressed: true }); // → round intro
    for (let i = 0; i < 65; i++) c.tick(EMPTY_SNAPSHOT); // → BALL_READY
    expect(c.sm.state).toBe(GameState.BALL_READY);
    expect(c.round).toBe(1);
    // fire + start = level skip
    c.tick({ ...EMPTY_SNAPSHOT, firePressed: true, start: true });
    expect(c.round).toBe(2);
    expect(c.sm.state).toBe(GameState.ROUND_INTRO);
  });
});

describe('Accessibility (§29, §34.3)', () => {
  it('every colored brick has a distinct, non-blank glyph', () => {
    expect(colorBlindGlyphsDistinct()).toBe(true);
  });

  it('32px Vaus meets 44px touch target only at scale ≥ 2', () => {
    expect(meetsTouchTarget(32, 1)).toBe(false); // 32 < 44
    expect(meetsTouchTarget(32, 2)).toBe(true); // 64 ≥ 44
    expect(touchTargetCssPx(32, 2)).toBe(64);
  });

  it('minScaleForTouchTarget(32) = 2', () => {
    expect(minScaleForTouchTarget(32)).toBe(2);
  });

  it('48px enlarged Vaus meets the target at scale 1', () => {
    expect(meetsTouchTarget(48, 1)).toBe(true);
  });

  it('flash-rate helper enforces WCAG 2.3.1 (≤3/s)', () => {
    expect(withinFlashLimit(10)).toBe(false); // 6 flashes/s
    expect(withinFlashLimit(20)).toBe(true); // 3/s exactly
    expect(withinFlashLimit(30)).toBe(true); // 2/s
  });
});
