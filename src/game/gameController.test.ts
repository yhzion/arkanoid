import { describe, it, expect } from 'vitest';
import { EventBus } from '../core/eventBus';
import { DEFAULT_CONFIG } from '../core/config';
import { GameState } from '../core/stateMachine';
import { GameController } from './gameController';
import { PersistenceStore } from '../data/persistence';
import { ILevelData, IBrickCell } from '../data/schemas';
import { EMPTY_SNAPSHOT } from '../input/input';

function cell(col: number, row: number, type: IBrickCell['type']): IBrickCell {
  const clearRequired = type !== 'EMPTY' && type !== 'GOLD';
  return { col, row, type, hitsRemaining: type === 'SILVER' ? 3 : 1, capsule: null, isCapsuleCarrier: false, clearRequired };
}
function makeLevel(round: number, type: 'brick' | 'boss'): ILevelData {
  const cells: IBrickCell[] = type === 'boss' ? [] : [cell(5, 5, 'RED'), cell(6, 5, 'BLUE')];
  return {
    id: `r${round}`, region: 'US', roundNumber: round, type,
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: cells.filter((c) => c.clearRequired).length,
    cells, enemyProfile: 'd', ballProfile: 'd', paletteProfile: 'd',
  };
}

function makeController() {
  const bus = new EventBus();
  const store = new PersistenceStore();
  const cfg = { ...DEFAULT_CONFIG };
  const provider = (_region: 'US' | 'JP', round: number) =>
    makeLevel(round, round === 36 ? 'boss' : 'brick');
  const c = new GameController({ config: cfg, bus, store, levelProvider: provider });
  return { c, bus };
}

const FIRE = { ...EMPTY_SNAPSHOT, firePressed: true };
const START = { ...EMPTY_SNAPSHOT, start: true };
const NONE = EMPTY_SNAPSHOT;

describe('GameController integration (§31)', () => {
  it('boots to TITLE', () => {
    const { c } = makeController();
    c.bootToTitle();
    expect(c.sm.state).toBe(GameState.TITLE);
  });

  it('start → story → round intro → ball ready → playing', () => {
    const { c } = makeController();
    c.bootToTitle();
    // Title: start input opens story.
    c.tick(START);
    expect(c.sm.state).toBe(GameState.OPENING_STORY);
    // Story: any input completes (newGame) → round intro.
    c.tick(FIRE);
    expect(c.sm.state).toBe(GameState.ROUND_INTRO);
    // Run round-intro jingle (60 ticks).
    for (let i = 0; i < 65; i++) c.tick(NONE);
    expect(c.sm.state).toBe(GameState.BALL_READY);
    // Fire launches → PLAYING.
    c.tick(FIRE);
    expect(c.sm.state).toBe(GameState.PLAYING);
    expect(c.currentSim).not.toBeNull();
  });

  it('clearing the round advances to ROUND_CLEAR then next round', () => {
    const { c } = makeController();
    c.bootToTitle();
    c.tick(START);
    c.tick(FIRE);
    for (let i = 0; i < 65; i++) c.tick(NONE); // BALL_READY
    c.tick(FIRE); // PLAYING
    // Destroy all clearable bricks out-of-band, then a tick should round-clear.
    const sim = c.currentSim!;
    for (const b of sim.field.live()) sim.field.destroy(b);
    c.tick(NONE);
    expect(c.sm.state).toBe(GameState.ROUND_CLEAR);
    // After clear timer → ROUND_INTRO (round 2)
    for (let i = 0; i < 95; i++) c.tick(NONE);
    expect(c.sm.state).toBe(GameState.ROUND_INTRO);
    expect(c.round).toBe(2);
  });
});
