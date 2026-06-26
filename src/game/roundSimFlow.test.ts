import { describe, it, expect } from 'vitest';
import { EventBus } from '../core/eventBus';
import { ScoreTracker } from './scoring';
import { RoundSim, RoundSimDeps } from './roundSim';
import { ILevelData, IBrickCell } from '../data/schemas';
import { Mulberry32, seedFromString } from '../core/rng';
import { PLAY_RIGHT } from '../core/constants';
import { createPlayer, TurnManager } from './playerContext';

function cell(col: number, row: number, type: IBrickCell['type'], over: Partial<IBrickCell> = {}): IBrickCell {
  const clearRequired = type !== 'EMPTY' && type !== 'GOLD';
  return {
    col, row, type,
    hitsRemaining: type === 'SILVER' ? 3 : type === 'GOLD' ? 0 : 1,
    capsule: null, isCapsuleCarrier: false, clearRequired,
    ...over,
  };
}
function level(cells: IBrickCell[]): ILevelData {
  return {
    id: 't', region: 'US', roundNumber: 1, type: 'brick',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: cells.filter((c) => c.clearRequired).length,
    cells, enemyProfile: 'd', ballProfile: 'd', paletteProfile: 'd',
  };
}
function makeSim(lvl: ILevelData, roundNumber = 1, finalBrickRound = 35) {
  const bus = new EventBus();
  const score = new ScoreTracker(bus, () => {});
  const capsuleRng = new Mulberry32(seedFromString('t'));
  const deps: RoundSimDeps = { bus, level: lvl, deflectionModel: 'continuous', roundNumber, score, capsuleRng, lives: 3, finalBrickRound };
  return { bus, sim: new RoundSim(deps), score };
}

describe('RoundSim flow: break, lives, multiball (§8.10 §10.5 §12.4)', () => {
  it('break warp awards 10,000 and advances the round on a non-final round', () => {
    const { sim, score } = makeSim(level([cell(5, 5, 'RED')]), 5, 35);
    sim.breakExitOpen = true;
    sim.vaus.moveToCenterX(PLAY_RIGHT - 4); // into the exit zone
    sim.tick({ left: false, right: false, firePressed: false, paddleX: null });
    expect(sim.events.some((e) => e.type === 'breakWarp' && e.roundAfter === 6)).toBe(true);
    expect(score.score).toBe(10000);
  });

  it('break exit does NOT function on the final brick round (§8.10/§12.7)', () => {
    const { sim, score } = makeSim(level([cell(5, 5, 'RED')]), 35, 35);
    sim.breakExitOpen = true;
    sim.vaus.moveToCenterX(PLAY_RIGHT - 4);
    sim.tick({ left: false, right: false, firePressed: false, paddleX: null });
    expect(sim.events.some((e) => e.type === 'breakWarp')).toBe(false);
    expect(score.score).toBe(0);
  });

  it('life loss decrements lives and resets for next life', () => {
    const { sim } = makeSim(level([cell(5, 0, 'RED')]));
    sim.tick({ left: false, right: false, firePressed: true, paddleX: null }); // launch
    let ballLost = false;
    for (let i = 0; i < 1500 && !ballLost; i++) {
      sim.tick({ left: false, right: false, firePressed: false, paddleX: null });
      const ev = sim.events.find((e) => e.type === 'ballLost') as { livesAfter: number } | undefined;
      if (ev) {
        ballLost = true;
        expect(ev.livesAfter).toBe(2);
        expect(sim.lives).toBe(2);
      }
    }
    expect(ballLost).toBe(true);
    expect(sim.isHeld).toBe(true); // reset for next life
  });

  it('eventually reaches game over after lives are exhausted', () => {
    const { sim } = makeSim(level([cell(5, 0, 'RED')]));
    let gameOver = false;
    for (let i = 0; i < 6000 && !gameOver; i++) {
      sim.tick({ left: false, right: false, firePressed: !sim.isHeld ? false : true, paddleX: null });
      if (sim.events.some((e) => e.type === 'gameOver')) gameOver = true;
    }
    expect(gameOver).toBe(true);
    expect(sim.lives).toBe(0);
  });
});

describe('2P turn alternation baseline (§10.6)', () => {
  it('alternates on life loss while both players have lives', () => {
    const tm = new TurnManager([createPlayer(0, 3), createPlayer(1, 3)], 0);
    expect(tm.active).toBe(0);
    tm.current().lives--; // P1 loses a life, still has 2
    expect(tm.onLifeLost()).toBe(1); // switch to P2
    expect(tm.active).toBe(1);
    tm.current().lives--; // P2 loses a life
    expect(tm.onLifeLost()).toBe(0); // back to P1
  });

  it('continues with the remaining player once one is game over', () => {
    const tm = new TurnManager([createPlayer(0, 1), createPlayer(1, 3)], 0);
    tm.current().lives--; // P1 drains to 0
    const next = tm.onLifeLost();
    expect(tm.players[0].gameOver).toBe(true);
    expect(next).toBe(1);
    // P2 keeps playing alone
    tm.current().lives--;
    expect(tm.onLifeLost()).toBe(1); // same player continues
    expect(tm.bothGameOver()).toBe(false);
  });
});
