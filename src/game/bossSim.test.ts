import { describe, it, expect } from 'vitest';
import { EventBus } from '../core/eventBus';
import { ScoreTracker } from './scoring';
import { BossSim } from './bossSim';
import { fromInt } from '../core/fixedpoint';
import { GameState } from '../core/stateMachine';
import { NameEntry } from './nameEntry';
import { TitleFlow } from './titleFlow';

function makeBoss(lives = 3) {
  const bus = new EventBus();
  const score = new ScoreTracker(bus, () => {});
  const boss = new BossSim({ bus, deflectionModel: 'continuous', score, lives });
  return { bus, score, boss };
}

describe('BossSim (§15, §33.6)', () => {
  it('starts with zero damage and the ball held', () => {
    const { boss } = makeBoss();
    expect(boss.damage).toBe(0);
    expect(boss.isHeld).toBe(true);
  });

  it('fires projectiles at the interval, capped at 2', () => {
    const { boss } = makeBoss();
    // launch the ball so the boss round is active
    boss.tick({ left: false, right: false, firePressed: true, paddleX: null });
    for (let i = 0; i < 95; i++) boss.tick({ left: false, right: false, firePressed: false, paddleX: null });
    expect(boss.projectiles.length).toBeGreaterThanOrEqual(1);
    expect(boss.projectiles.length).toBeLessThanOrEqual(2);
  });

  it('registers a hit each time the ball separates and re-contacts, 16 → defeated', () => {
    const { boss, score } = makeBoss();
    boss.tick({ left: false, right: false, firePressed: true, paddleX: null }); // launch
    const ball = boss.balls[0];
    const b = boss.bossAABB;
    // Drive the ball into the boss 16 times: place just below boss moving up, tick.
    for (let i = 0; i < 16 && !boss.defeated; i++) {
      // (1) separation tick: ball away from boss resets the debounce (§33.6).
      ball.alive = true;
      ball.dir = { vx: 0, vy: -(1 << 16) };
      ball.speed = 2 << 16;
      ball.x = fromInt(8);
      ball.y = fromInt(200);
      boss.tick({ left: false, right: false, firePressed: false, paddleX: null });
      // (2) contact tick: place overlapping the boss moving up → registers one hit.
      ball.alive = true;
      ball.dir = { vx: 0, vy: -(1 << 16) };
      ball.x = b.x + fromInt(30);
      ball.y = b.y + b.h - fromInt(1); // overlap by 1px
      const before = boss.damage;
      boss.tick({ left: false, right: false, firePressed: false, paddleX: null });
      expect(boss.damage).toBe(before + 1);
    }
    expect(boss.defeated).toBe(true);
    // 16 hits × 1000 + 50000 defeat bonus
    expect(score.score).toBe(16 * 1000 + 50000);
    expect(boss.events.some((e) => e.type === 'bossDefeated')).toBe(true);
  });
});

describe('NameEntry (§8.8)', () => {
  it('accepts 3 letters then marks done', () => {
    const n = new NameEntry();
    expect(n.input('a')).toBe(true);
    expect(n.input('B')).toBe(true);
    expect(n.input('c')).toBe(true);
    expect(n.initials).toBe('ABC');
    expect(n.done).toBe(true);
    expect(n.input('d')).toBe(false); // full
  });
  it('rejects non-alphanumerics', () => {
    const n = new NameEntry();
    expect(n.input('!')).toBe(false);
    expect(n.input(' ')).toBe(false);
  });
  it('backspace removes the last char', () => {
    const n = new NameEntry();
    n.input('a');
    n.input('b');
    n.input('backspace');
    expect(n.initials).toBe('A');
  });
});

describe('TitleFlow (§8.1, §8.2, §31)', () => {
  it('cycles title→story→demo on idle', () => {
    const t = new TitleFlow();
    for (let i = 0; i < 600; i++) t.tick(false);
    expect(t.phase).toBe('story');
    for (let i = 0; i < 600; i++) t.tick(false);
    expect(t.phase).toBe('demo');
  });
  it('aborts demo on any input back to title', () => {
    const t = new TitleFlow();
    for (let i = 0; i < 1200; i++) t.tick(false);
    t.tick(true);
    expect(t.phase).toBe('title');
  });
  it('newGame story exit starts the game', () => {
    const t = new TitleFlow();
    t.startNewGame();
    const ev = t.storyComplete();
    expect(ev.startGame).toBe(true);
  });
});

// GameState referenced to assert the enum is exported for the controller layer.
void GameState;
