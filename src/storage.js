const LB_KEY = 'arkanoid_leaderboard_v1';
const SET_KEY = 'arkanoid_settings_v1';

function safeJSONParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

export class VersionedStore {
  constructor() {
    this.memory = false;
    this.lb = { schemaVersion: 1, entries: [] };
    this.settings = { schemaVersion: 1, config: {}, remaps: { keyboard: {}, gamepad: {} } };
    this._load();
  }

  _try(fn) {
    try { return fn(); } catch { this.memory = true; return null; }
  }

  _load() {
    this._try(() => {
      const lb = safeJSONParse(localStorage.getItem(LB_KEY));
      if (lb && lb.schemaVersion === 1 && Array.isArray(lb.entries)) this.lb = lb;
    });
    this._try(() => {
      const s = safeJSONParse(localStorage.getItem(SET_KEY));
      if (s && s.schemaVersion === 1) this.settings = s;
    });
    this.lb.entries = (this.lb.entries || []).slice(0, 5);
    for (const e of this.lb.entries) {
      e.score = Number(e.score) || 0;
      e.initials = String(e.initials || '').toUpperCase().slice(0, 3);
      e.round = Number(e.round) || 1;
      e.region = String(e.region || 'US');
      e.mode = String(e.mode || 'clean-room');
      e.date = String(e.date || new Date().toISOString());
    }
    this.lb.entries.sort((a, b) => b.score - a.score);
  }

  _saveLB() {
    this.lb.entries.sort((a, b) => b.score - a.score);
    this.lb.entries = this.lb.entries.slice(0, 5);
    this._try(() => localStorage.setItem(LB_KEY, JSON.stringify(this.lb)));
  }

  getLeaderboard() { return this.lb; }
  resetLeaderboard() { this.lb.entries = []; this._saveLB(); }
  qualifies(score) {
    const entries = this.lb.entries;
    if (entries.length < 5) return true;
    return score > entries[entries.length - 1].score;
  }
  addEntry(entry) {
    this.lb.entries.push(entry);
    this._saveLB();
  }

  getSettings() { return this.settings; }
  saveSettings(settings) {
    this.settings = settings;
    this._try(() => localStorage.setItem(SET_KEY, JSON.stringify(this.settings)));
  }
}
