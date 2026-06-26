import { describe, it, expect } from 'vitest';
import { validateLevel } from './levelValidator';
import { ILevelData } from './schemas';

function baseCell(over: Partial<{ col: number; row: number; type: string; clearRequired: boolean; isCapsuleCarrier: boolean; capsule: string | null }> = {}) {
  return {
    col: 0,
    row: 0,
    type: 'EMPTY',
    hitsRemaining: 0,
    capsule: null,
    isCapsuleCarrier: false,
    clearRequired: false,
    ...over,
  };
}

function baseLevel(cells: unknown[] = [], over: Record<string, unknown> = {}): ILevelData {
  return {
    id: 'us-round-01',
    region: 'US',
    roundNumber: 1,
    type: 'brick',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: cells.filter((c) => (c as { clearRequired?: boolean }).clearRequired).length,
    cells: cells as never,
    enemyProfile: 'default',
    ballProfile: 'default',
    paletteProfile: 'default',
    ...over,
  } as ILevelData;
}

describe('LevelValidator (§19.6)', () => {
  it('accepts a minimal valid level', () => {
    const r = validateLevel(baseLevel([baseCell()]));
    expect(r.ok).toBe(true);
  });

  it('rejects wrong grid dimensions', () => {
    const r = validateLevel(baseLevel([], { grid: { columns: 10, rows: 28, brickWidth: 16, brickHeight: 8 } }));
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain('columns');
  });

  it('rejects out-of-bounds cells', () => {
    const r = validateLevel(baseLevel([baseCell({ col: 99, row: 0 })]));
    expect(r.ok).toBe(false);
  });

  it('rejects gold marked clear-required', () => {
    const r = validateLevel(baseLevel([baseCell({ type: 'GOLD', clearRequired: true })]));
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain('clear-required');
  });

  it('rejects silver/gold as capsule carrier', () => {
    const r = validateLevel(baseLevel([baseCell({ type: 'SILVER', isCapsuleCarrier: true })]));
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain('carrier');
  });

  it('rejects mismatched clearRequiredCount', () => {
    const lvl = baseLevel([baseCell({ type: 'RED', clearRequired: true })]);
    lvl.clearRequiredCount = 5; // wrong
    const r = validateLevel(lvl);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain('clearRequiredCount');
  });

  it('skips cell checks for boss rounds (no brick grid requirement)', () => {
    const boss = baseLevel([], { type: 'boss', cells: [] });
    const r = validateLevel(boss);
    expect(r.ok).toBe(true);
  });

  it('rejects invalid brick / capsule types', () => {
    const r = validateLevel(baseLevel([baseCell({ type: 'PURPLE' })]));
    expect(r.ok).toBe(false);
  });
});
