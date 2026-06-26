import { EventBus, GameEvent } from './eventBus';

export class Scoring {
  score = 0;
  highScore = 0;
  private nextExtraLifeThreshold = 20000;
  private extraLifeInterval = 60000;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  add(points: number, reason: string): void {
    const prev = this.score;
    this.score += points;
    this.eventBus.emit(GameEvent.SCORE_CHANGED, { newScore: this.score, delta: points, reason });
    this.checkExtraLife(prev);
  }

  private checkExtraLife(prevScore: number): void {
    if (this.score >= this.nextExtraLifeThreshold && prevScore < this.nextExtraLifeThreshold) {
      this.eventBus.emit(GameEvent.EXTRA_LIFE_AWARDED, { totalLives: 0 });
      this.nextExtraLifeThreshold += this.extraLifeInterval;
    }
  }

  reset(): void {
    this.score = 0;
    this.nextExtraLifeThreshold = 20000;
  }

  setHighScore(score: number): void {
    this.highScore = score;
  }
}
