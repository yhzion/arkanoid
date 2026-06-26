// PRD §16: Scoring system
const EXTRA_LIFE_THRESHOLDS = [20000, 80000, 140000, 200000, 260000, 320000];

export class Scoring {
  score = 0;
  lives = 3; // PRD §10.5
  private nextExtraLifeIndex = 0;

  addScore(points: number): boolean {
    const prevScore = this.score;
    this.score += points;

    // PRD §10.5: Extra life awards
    let awarded = false;
    while (
      this.nextExtraLifeIndex < EXTRA_LIFE_THRESHOLDS.length &&
      this.score >= EXTRA_LIFE_THRESHOLDS[this.nextExtraLifeIndex] &&
      prevScore < EXTRA_LIFE_THRESHOLDS[this.nextExtraLifeIndex]
    ) {
      this.lives++;
      this.nextExtraLifeIndex++;
      awarded = true;
    }
    return awarded;
  }

  loseLife(): boolean {
    this.lives--;
    return this.lives > 0;
  }

  reset(): void {
    this.score = 0;
    this.lives = 3;
    this.nextExtraLifeIndex = 0;
  }
}

// PRD §8.8: High score persistence
export class Leaderboard {
  private key = 'arkanoid_leaderboard';
  private entries: { initials: string; score: number; round: number }[] = [];

  constructor() {
    this.load();
  }

  getEntries() {
    return this.entries;
  }

  qualifies(score: number): boolean {
    if (this.entries.length < 5) return true;
    return score > this.entries[4].score;
  }

  addEntry(initials: string, score: number, round: number): void {
    this.entries.push({ initials, score, round });
    this.entries.sort((a, b) => b.score - a.score);
    if (this.entries.length > 5) {
      this.entries = this.entries.slice(0, 5);
    }
    this.save();
  }

  private load(): void {
    try {
      const data = localStorage.getItem(this.key);
      if (data) {
        this.entries = JSON.parse(data);
      }
    } catch {
      this.entries = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.entries));
    } catch {
      // Graceful fallback
    }
  }

  reset(): void {
    this.entries = [];
    this.save();
  }
}