import { describe, it, expect } from 'vitest';
import { StateMachine, GameState } from './stateMachine';

describe('StateMachine (§31)', () => {
  function sm(state = GameState.BOOT) {
    const m = new StateMachine();
    m.state = state;
    return m;
  }

  it('allows the boot→title happy path', () => {
    const m = sm();
    m.transition(GameState.LOADING);
    m.transition(GameState.TITLE);
    expect(m.state).toBe(GameState.TITLE);
  });

  it('records pausedFrom and returns to it', () => {
    const m = sm(GameState.PLAYING);
    m.transition(GameState.PAUSED);
    expect(m.pausedFrom).toBe(GameState.PLAYING);
    m.transition(GameState.PLAYING);
    expect(m.state).toBe(GameState.PLAYING);
    expect(m.pausedFrom).toBeNull();
  });

  it('rejects illegal transitions', () => {
    const m = sm(GameState.TITLE);
    expect(() => m.transition(GameState.PLAYING)).toThrow();
  });

  it('tracks ticksInState and resets on transition', () => {
    const m = sm(GameState.BALL_READY);
    m.tickState();
    m.tickState();
    expect(m.ticksInState).toBe(2);
    m.transition(GameState.PLAYING);
    expect(m.ticksInState).toBe(0);
  });

  it('round clear routes to boss on the boss round, else next round', () => {
    // adjacency only — routing decision is the controller's job
    const m = sm(GameState.ROUND_CLEAR);
    expect(m.canTransition(GameState.BOSS_INTRO)).toBe(true);
    expect(m.canTransition(GameState.ROUND_INTRO)).toBe(true);
  });

  it('cannot pause from a non-pausable state', () => {
    const m = sm(GameState.TITLE);
    expect(m.canTransition(GameState.PAUSED)).toBe(false);
  });
});
