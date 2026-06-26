import { describe, it, expect } from 'vitest';
import { PersistenceStore } from './persistence';
import { ILeaderboardEntry } from './schemas';

function entry(score: number, initials = 'ABC'): ILeaderboardEntry {
  return { score, initials, round: 5, region: 'US', mode: 'clean-room', date: '2026-01-01T00:00:00.000Z' };
}

describe('PersistenceStore (§8.8, §34.2)', () => {
  it('submits and ranks top-5', () => {
    const s = new PersistenceStore(new MapStore());
    s.submitScore(entry(100));
    s.submitScore(entry(500));
    s.submitScore(entry(300));
    const lb = s.loadLeaderboard();
    expect(lb.map((e) => e.score)).toEqual([500, 300, 100]);
  });

  it('caps at 5 entries', () => {
    const s = new PersistenceStore(new MapStore());
    for (const sc of [100, 200, 300, 400, 500, 600]) s.submitScore(entry(sc));
    const lb = s.loadLeaderboard();
    expect(lb.length).toBe(5);
    expect(lb[0].score).toBe(600);
    expect(lb[4].score).toBe(200);
  });

  it('qualifies() reflects top-5 threshold', () => {
    const s = new PersistenceStore(new MapStore());
    expect(s.qualifies(100)).toBe(true); // empty board
    for (const sc of [100, 200, 300, 400, 500]) s.submitScore(entry(sc));
    expect(s.qualifies(50)).toBe(false);
    expect(s.qualifies(600)).toBe(true);
  });

  it('clamps initials to 3 uppercase chars from untrusted storage', () => {
    const store = new MapStore();
    store.set('arkanoid.leaderboard.v1', JSON.stringify({
      schemaVersion: 1,
      entries: [{ score: 999, initials: 'abcdefghi!@#', round: 1, region: 'US', mode: 'x', date: 'd' }],
    }));
    const s = new PersistenceStore(store);
    const lb = s.loadLeaderboard();
    expect(lb[0].initials).toBe('ABC');
  });

  it('resets on schemaVersion mismatch', () => {
    const store = new MapStore();
    store.set('arkanoid.leaderboard.v1', JSON.stringify({ schemaVersion: 99, entries: [] }));
    const s = new PersistenceStore(store);
    expect(s.loadLeaderboard()).toEqual([]);
  });

  it('falls back to in-memory backend when localStorage throws', () => {
    const s = new PersistenceStore(); // no DOM localStorage in node → memory
    expect(s.inMemoryFallback).toBe(true);
    s.submitScore(entry(123));
    expect(s.loadLeaderboard().length).toBe(1);
  });

  it('resetLeaderboard clears the board (§8.8 debug)', () => {
    const s = new PersistenceStore(new MapStore());
    s.submitScore(entry(100));
    s.resetLeaderboard();
    expect(s.loadLeaderboard()).toEqual([]);
  });

  it('round-trips settings', () => {
    const s = new PersistenceStore(new MapStore());
    s.saveSettings({ schemaVersion: 1, config: { region: 'JP' } as never, remaps: { keyboard: { LEFT: 'KeyA' }, gamepad: {} } });
    const loaded = s.loadSettings();
    expect(loaded?.remaps.keyboard.LEFT).toBe('KeyA');
  });
});

/** Simple KV stub backed by a Map (throws-free, like a working localStorage). */
class MapStore {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  set(k: string, v: string): void {
    this.m.set(k, v);
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}
