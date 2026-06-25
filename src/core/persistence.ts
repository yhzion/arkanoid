import { ILeaderboardStorage, ISettingsStorage, GameConfig, ILeaderboardEntry } from '../data/levelSchema';

const LEADERBOARD_KEY = 'arkanoid_leaderboard_v1';
const SETTINGS_KEY = 'arkanoid_settings_v1';
const SCHEMA_VERSION = 1;

const DEFAULT_CONFIG: GameConfig = {
    region: 'US',
    mode: 'clean-room',
    enableManualLevelSkipSecret: true,
    enableHighScoreNameEntry: true,
    enableTwoPlayerMode: false,
    inputMode: 'keyboard',
    renderScaleMode: 'integer',
    audioEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.6,
    deflectionModel: 'continuous',
    jitterEnabled: false,
    numericModel: 'q16.16-v1',
    deterministicSeed: '42'
};

const DEFAULT_SETTINGS: ISettingsStorage = {
    schemaVersion: SCHEMA_VERSION,
    config: DEFAULT_CONFIG,
    remaps: {
        keyboard: {
            left: 'ArrowLeft',
            right: 'ArrowRight',
            fire: 'Space',
            start: 'Enter',
            select: 'ShiftLeft',
            mute: 'KeyM'
        },
        gamepad: {
            left: 14,  // D-pad Left standard index
            right: 15, // D-pad Right
            fire: 0,   // South button (A)
            start: 9,  // Start button
            select: 8  // Select button
        }
    }
};

const DEFAULT_LEADERBOARD: ILeaderboardStorage = {
    schemaVersion: SCHEMA_VERSION,
    entries: [
        { score: 50000, initials: 'TAI', round: 10, region: 'US', mode: 'clean-room', date: new Date().toISOString() },
        { score: 30000, initials: 'DOH', round: 5, region: 'US', mode: 'clean-room', date: new Date().toISOString() },
        { score: 20000, initials: 'Vau', round: 3, region: 'US', mode: 'clean-room', date: new Date().toISOString() },
        { score: 10000, initials: 'ARK', round: 1, region: 'US', mode: 'clean-room', date: new Date().toISOString() },
        { score: 5000, initials: 'NES', round: 1, region: 'US', mode: 'clean-room', date: new Date().toISOString() }
    ]
};

// In-memory fallbacks when localStorage is blocked/unavailable
let isLocalStorageAvailable = true;
let inMemoryLeaderboard: ILeaderboardStorage = { ...DEFAULT_LEADERBOARD };
let inMemorySettings: ISettingsStorage = { ...DEFAULT_SETTINGS };

try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
} catch (e) {
    isLocalStorageAvailable = false;
    console.warn('localStorage is blocked or unavailable. Falling back to in-memory storage.');
}

export function loadLeaderboard(): ILeaderboardStorage {
    if (!isLocalStorageAvailable) {
        return inMemoryLeaderboard;
    }

    try {
        const raw = window.localStorage.getItem(LEADERBOARD_KEY);
        if (!raw) {
            saveLeaderboard(DEFAULT_LEADERBOARD);
            return DEFAULT_LEADERBOARD;
        }

        const data = JSON.parse(raw) as ILeaderboardStorage;
        if (data.schemaVersion !== SCHEMA_VERSION) {
            // Schema mismatch, reset to default (or migrate if possible)
            saveLeaderboard(DEFAULT_LEADERBOARD);
            return DEFAULT_LEADERBOARD;
        }

        // Validate and clamp each entry
        data.entries = data.entries.map(entry => ({
            score: Math.max(0, Number(entry.score) || 0),
            initials: (typeof entry.initials === 'string' ? entry.initials : '???').substring(0, 3).toUpperCase(),
            round: Math.max(1, Number(entry.round) || 1),
            region: entry.region === 'JP' ? 'JP' : 'US',
            mode: entry.mode === 'licensed-fidelity' ? 'licensed-fidelity' : 'clean-room',
            date: typeof entry.date === 'string' ? entry.date : new Date().toISOString()
        }));

        // Sort descending
        data.entries.sort((a, b) => b.score - a.score);
        // Retain top 5
        data.entries = data.entries.slice(0, 5);

        return data;
    } catch (e) {
        console.error('Failed to load leaderboard from localStorage', e);
        return DEFAULT_LEADERBOARD;
    }
}

export function saveLeaderboard(leaderboard: ILeaderboardStorage): void {
    // Sort and limit before saving
    leaderboard.entries.sort((a, b) => b.score - a.score);
    leaderboard.entries = leaderboard.entries.slice(0, 5);

    if (!isLocalStorageAvailable) {
        inMemoryLeaderboard = leaderboard;
        return;
    }

    try {
        window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Failed to save leaderboard to localStorage', e);
    }
}

export function loadSettings(): ISettingsStorage {
    if (!isLocalStorageAvailable) {
        return inMemorySettings;
    }

    try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (!raw) {
            saveSettings(DEFAULT_SETTINGS);
            return DEFAULT_SETTINGS;
        }

        const data = JSON.parse(raw) as ISettingsStorage;
        if (data.schemaVersion !== SCHEMA_VERSION) {
            saveSettings(DEFAULT_SETTINGS);
            return DEFAULT_SETTINGS;
        }

        // Validate and fill in missing config options with defaults
        data.config = { ...DEFAULT_CONFIG, ...data.config };
        data.remaps = {
            keyboard: { ...DEFAULT_SETTINGS.remaps.keyboard, ...data.remaps?.keyboard },
            gamepad: { ...DEFAULT_SETTINGS.remaps.gamepad, ...data.remaps?.gamepad }
        };

        return data;
    } catch (e) {
        console.error('Failed to load settings from localStorage', e);
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(settings: ISettingsStorage): void {
    if (!isLocalStorageAvailable) {
        inMemorySettings = settings;
        return;
    }

    try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings to localStorage', e);
    }
}

export function resetLeaderboard(): void {
    saveLeaderboard({
        schemaVersion: SCHEMA_VERSION,
        entries: [...DEFAULT_LEADERBOARD.entries]
    });
}
