export interface LeaderboardEntry {
  score: number;
  initials: string;
  round: number;
  region: string;
  mode: string;
  date: string;
}

interface LeaderboardStorage {
  schemaVersion: number;
  entries: LeaderboardEntry[];
}

const SCHEMA_VERSION = 1;
const LB_KEY = 'arkanoid_leaderboard';
const SETTINGS_KEY = 'arkanoid_settings';

class InMemoryStore {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

function getStore(): Storage | InMemoryStore {
  try {
    localStorage.setItem('_test', '1');
    localStorage.removeItem('_test');
    return localStorage;
  } catch {
    return new InMemoryStore();
  }
}

const store = getStore();

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = store.getItem(LB_KEY);
    if (!raw) return [];
    const parsed: LeaderboardStorage = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION) return [];
    return parsed.entries.slice(0, 5);
  } catch { return []; }
}

export function saveLeaderboard(entries: LeaderboardEntry[]) {
  const data: LeaderboardStorage = { schemaVersion: SCHEMA_VERSION, entries: entries.slice(0, 5) };
  store.setItem(LB_KEY, JSON.stringify(data));
}

export function qualifiesForLeaderboard(score: number): boolean {
  const lb = loadLeaderboard();
  if (lb.length < 5) return true;
  return score > lb[lb.length - 1].score;
}

export function insertLeaderboardEntry(entry: LeaderboardEntry) {
  const lb = loadLeaderboard();
  lb.push(entry);
  lb.sort((a, b) => b.score - a.score);
  saveLeaderboard(lb.slice(0, 5));
}

export function resetLeaderboard() {
  store.removeItem(LB_KEY);
}

export function loadSettings(): Record<string, any> {
  try {
    const raw = store.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveSettings(settings: Record<string, any>) {
  store.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
