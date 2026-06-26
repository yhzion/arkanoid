import type { GameConfig } from '../core/GameConfig';

export interface ILeaderboardEntry {
  score: number;
  initials: string;
  round: number;
  region: string;
  mode: string;
  date: string;
}

export interface ILeaderboardStorage {
  schemaVersion: number;
  entries: ILeaderboardEntry[];
}

export interface ISettingsStorage {
  schemaVersion: number;
  config: GameConfig;
  remaps: {
    keyboard: Record<string, string>;
    gamepad: Record<string, number>;
  };
}

const CURRENT_VERSION = 1;

const STORAGE_KEYS = {
  leaderboard: 'arkanoid_leaderboard',
  settings: 'arkanoid_settings',
};

function isLocalStorageAvailable(): boolean {
  try {
    const key = '__test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

class InMemoryStore {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

export class StorageManager {
  private store: Storage | InMemoryStore;

  constructor() {
    this.store = isLocalStorageAvailable() ? localStorage : new InMemoryStore();
  }

  getLeaderboard(): ILeaderboardStorage {
    try {
      const raw = this.store.getItem(STORAGE_KEYS.leaderboard);
      if (raw) {
        const parsed = JSON.parse(raw) as ILeaderboardStorage;
        if (parsed.schemaVersion === CURRENT_VERSION) {
          return {
            schemaVersion: CURRENT_VERSION,
            entries: (parsed.entries ?? []).slice(0, 5).map(e => ({
              ...e,
              initials: e.initials.slice(0, 3).padEnd(3, ' ').toUpperCase(),
            })),
          };
        }
      }
    } catch {}
    return { schemaVersion: CURRENT_VERSION, entries: [] };
  }

  saveLeaderboard(entry: ILeaderboardEntry): void {
    const lb = this.getLeaderboard();
    lb.entries.push(entry);
    lb.entries.sort((a, b) => b.score - a.score);
    lb.entries = lb.entries.slice(0, 5);
    try {
      this.store.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(lb));
    } catch {}
  }

  qualifiesForLeaderboard(score: number): boolean {
    const lb = this.getLeaderboard();
    return lb.entries.length < 5 || score > lb.entries[lb.entries.length - 1].score;
  }

  getSettings(): ISettingsStorage | null {
    try {
      const raw = this.store.getItem(STORAGE_KEYS.settings);
      if (raw) {
        const parsed = JSON.parse(raw) as ISettingsStorage;
        if (parsed.schemaVersion === CURRENT_VERSION) return parsed;
      }
    } catch {}
    return null;
  }

  saveSettings(settings: ISettingsStorage): void {
    try {
      this.store.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {}
  }

  resetLeaderboard(): void {
    try {
      this.store.removeItem(STORAGE_KEYS.leaderboard);
    } catch {}
  }
}

export const storageManager = new StorageManager();
