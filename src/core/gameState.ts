import { GameConfig } from '../data/levelSchema';
import { EventBus, GameEvents } from './eventBus';
import { loadSettings, saveSettings, loadLeaderboard, saveLeaderboard } from './persistence';

export class GameStateTracker {
    public config: GameConfig;
    public score: number = 0;
    public highHighScore: number = 50000; // Loaded from leaderboard
    public lives: number = 3;
    public currentRoundNum: number = 1;
    public currentRoundBranch: 'L' | 'R' | '' = '';
    public player1Score: number = 0;
    public player1Lives: number = 3;
    public player1RoundNum: number = 1;
    public is2PlayerMode: boolean = false;
    public activePlayer: 1 | 2 = 1;

    constructor() {
        const settings = loadSettings();
        this.config = settings.config;
        this.syncHighScore();
    }

    public syncHighScore(): void {
        const lb = loadLeaderboard();
        if (lb.entries.length > 0) {
            this.highHighScore = lb.entries[0].score;
        }
    }

    public resetGame(): void {
        this.score = 0;
        this.lives = 3;
        this.currentRoundNum = 1;
        this.currentRoundBranch = '';
        this.player1Score = 0;
        this.player1Lives = 3;
        this.player1RoundNum = 1;
        this.activePlayer = 1;
        this.syncHighScore();
    }

    /**
     * N(S) = S < 20,000 ? 0 : 1 + Math.floor((S - 20,000) / 60,000)
     */
    private countThresholdCrossings(score: number): number {
        if (score < 20000) return 0;
        return 1 + Math.floor((score - 20000) / 60000);
    }

    public addScore(points: number): void {
        if (points <= 0) return;
        const prevScore = this.score;
        this.score += points;

        if (this.score > this.highHighScore) {
            this.highHighScore = this.score;
        }

        // Emit score changed event
        EventBus.emit(GameEvents.SCORE_CHANGED, {
            newScore: this.score,
            delta: points,
            reason: 'gameplay'
        });

        // Check for extra life crossings
        const crossingsPrev = this.countThresholdCrossings(prevScore);
        const crossingsNew = this.countThresholdCrossings(this.score);
        const extraLivesEarned = crossingsNew - crossingsPrev;

        if (extraLivesEarned > 0) {
            this.lives += extraLivesEarned;
            for (let i = 0; i < extraLivesEarned; i++) {
                EventBus.emit(GameEvents.EXTRA_LIFE_AWARDED);
            }
        }
    }

    public loseLife(): void {
        this.lives = Math.max(0, this.lives - 1);
    }

    public gainLife(): void {
        this.lives++;
        EventBus.emit(GameEvents.EXTRA_LIFE_AWARDED);
    }

    public nextRound(): void {
        this.currentRoundNum++;
    }

    public checkNewHighScore(): boolean {
        const lb = loadLeaderboard();
        if (lb.entries.length < 5) return true;
        return this.score > lb.entries[lb.entries.length - 1].score;
    }

    public submitHighScore(initials: string): void {
        const lb = loadLeaderboard();
        const newEntry = {
            score: this.score,
            initials: initials.substring(0, 3).toUpperCase(),
            round: this.currentRoundNum,
            region: this.config.region,
            mode: this.config.mode,
            date: new Date().toISOString()
        };
        lb.entries.push(newEntry);
        saveLeaderboard(lb);
        this.syncHighScore();
    }
}

export const GameState = new GameStateTracker();
export default GameState;
