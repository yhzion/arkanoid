import { GameConfig } from './levelSchema';

export interface LeaderboardEntry {
  score: number;
  initials: string;
  round: number;
  region: string;
  mode: string;
  date: string;
}

export interface LeaderboardStorage {
  schemaVersion: number;
  entries: LeaderboardEntry[];
}

export interface SettingsStorage {
  schemaVersion: number;
  config: GameConfig;
  remaps: {
    keyboard: Record<string, string>;
    gamepad: Record<string, number>;
  };
}

const CURRENT_SCHEMA_VERSION = 1;
const LEADERBOARD_KEY = 'arkanoid_leaderboard';
const SETTINGS_KEY = 'arkanoid_settings';

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
  }
  return null;
}

function getInMemoryBackup(): Map<string, string> {
  if (!(globalThis as any).__arkanoid_storage) {
    (globalThis as any).__arkanoid_storage = new Map<string, string>();
  }
  return (globalThis as any).__arkanoid_storage;
}

function getItem(key: string): string | null {
  const store = getStorage();
  if (store) {
    try { return store.getItem(key); } catch {}
  }
  return getInMemoryBackup().get(key) ?? null;
}

function setItem(key: string, value: string): void {
  const store = getStorage();
  if (store) {
    try { store.setItem(key, value); } catch {}
    return;
  }
  getInMemoryBackup().set(key, value);
}

function removeItem(key: string): void {
  const store = getStorage();
  if (store) {
    try { store.removeItem(key); } catch {}
    return;
  }
  getInMemoryBackup().delete(key);
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as LeaderboardStorage;
    if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) return [];
    return (data.entries || []).slice(0, 5).map(e => ({
      ...e,
      initials: (e.initials || 'AAA').slice(0, 3),
      score: Math.max(0, Math.floor(e.score)),
    }));
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  const data: LeaderboardStorage = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: entries.slice(0, 5),
  };
  setItem(LEADERBOARD_KEY, JSON.stringify(data));
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const entries = loadLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const top5 = entries.slice(0, 5);
  saveLeaderboard(top5);
  return top5;
}

export function qualifiesForLeaderboard(score: number): boolean {
  const entries = loadLeaderboard();
  if (entries.length < 5) return true;
  return score > entries[entries.length - 1]!.score;
}

export function loadSettings(): SettingsStorage | null {
  try {
    const raw = getItem(SETTINGS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SettingsStorage;
    if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSettings(settings: SettingsStorage): void {
  setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function resetLeaderboard(): void {
  removeItem(LEADERBOARD_KEY);
}
