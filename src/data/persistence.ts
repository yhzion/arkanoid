/**
 * Versioned persistence store — PRD §8.8, persistence.md.
 *
 * localStorage-backed with two versioned keys (leaderboard top-5, settings).
 * Degrades to an in-memory backend when localStorage is unavailable (incognito /
 * blocked) without throwing (§34.2 blocked-localStorage fallback). Stored data is
 * untrusted: validated and clamped on load; on schemaVersion mismatch the store is
 * reset to a clean default.
 */
import {
  ILeaderboardEntry,
  ILeaderboardStorage,
  ISettingsStorage,
  LEADERBOARD_CAPACITY,
  LEADERBOARD_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
} from './schemas';

/** Minimal localStorage-like interface (so tests/jsdom/Node can stub it). */
export interface KVLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const LB_KEY = 'arkanoid.leaderboard.v1';
const SET_KEY = 'arkanoid.settings.v1';

class MemoryKV implements KVLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

/** Pick a localStorage backend, falling back to in-memory on any failure. */
function selectBackend(): KVLike {
  try {
    const g = globalThis as unknown as { localStorage?: KVLike };
    if (g.localStorage) {
      // Probe writability.
      g.localStorage.setItem('__arkanoid_probe__', '1');
      g.localStorage.removeItem('__arkanoid_probe__');
      return g.localStorage;
    }
  } catch {
    // fall through to memory
  }
  return new MemoryKV();
}

/** Clamp/validate a single leaderboard entry from untrusted storage (§8.8). */
function sanitizeEntry(raw: unknown): ILeaderboardEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const e = raw as Record<string, unknown>;
  const score = Math.max(0, Math.trunc(Number(e.score) || 0));
  let initials = typeof e.initials === 'string' ? e.initials.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  initials = initials.slice(0, 3); // max 3 chars (§8.8)
  const round = Math.max(0, Math.trunc(Number(e.round) || 0));
  const region = typeof e.region === 'string' ? e.region : 'US';
  const mode = typeof e.mode === 'string' ? e.mode : 'clean-room';
  const date = typeof e.date === 'string' ? e.date : new Date(0).toISOString();
  return { score, initials, round, region, mode, date };
}

export class PersistenceStore {
  private kv: KVLike;
  /** True when we fell back to the in-memory backend (§34.2). */
  readonly inMemoryFallback: boolean;

  constructor(backend?: KVLike) {
    if (backend) {
      this.kv = backend;
      this.inMemoryFallback = backend instanceof MemoryKV;
    } else {
      this.kv = selectBackend();
      this.inMemoryFallback = this.kv instanceof MemoryKV;
    }
  }

  // --- Leaderboard ---------------------------------------------------------

  loadLeaderboard(): ILeaderboardEntry[] {
    const raw = this.kv.getItem(LB_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as ILeaderboardStorage;
      if (parsed.schemaVersion !== LEADERBOARD_SCHEMA_VERSION) return []; // mismatch → reset
      if (!Array.isArray(parsed.entries)) return [];
      return parsed.entries
        .map(sanitizeEntry)
        .filter((e): e is ILeaderboardEntry => e !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_CAPACITY);
    } catch {
      return [];
    }
  }

  /** Submit a score; returns true if it entered the top-5. */
  submitScore(entry: ILeaderboardEntry): boolean {
    const entries = this.loadLeaderboard();
    entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    const top = entries.slice(0, LEADERBOARD_CAPACITY);
    const entered = top.some((e) => e === entry) || top.length < LEADERBOARD_CAPACITY;
    const store: ILeaderboardStorage = { schemaVersion: LEADERBOARD_SCHEMA_VERSION, entries: top };
    this.kv.setItem(LB_KEY, JSON.stringify(store));
    return entered && entries.indexOf(entry) < LEADERBOARD_CAPACITY;
  }

  /** Developer reset (§8.8 debug button). */
  resetLeaderboard(): void {
    this.kv.removeItem(LB_KEY);
  }

  /** True if `score` would qualify for the leaderboard (≥ 5th place or board not full). */
  qualifies(score: number): boolean {
    const entries = this.loadLeaderboard();
    if (entries.length < LEADERBOARD_CAPACITY) return true;
    return score > entries[entries.length - 1].score;
  }

  // --- Settings ------------------------------------------------------------

  loadSettings(): ISettingsStorage | null {
    const raw = this.kv.getItem(SET_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ISettingsStorage;
      if (parsed.schemaVersion !== SETTINGS_SCHEMA_VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  saveSettings(settings: ISettingsStorage): void {
    this.kv.setItem(SET_KEY, JSON.stringify(settings));
  }
}
