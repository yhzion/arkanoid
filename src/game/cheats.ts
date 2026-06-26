/**
 * Cheat input trackers — PRD §14.7.
 *
 * 1. A+Start level skip (at BALL_READY, round < 16) — wired in GameController.
 * 2. Game-Over continue code: hold A+B, press Select 5×, release, press Start.
 *
 * These are pure input-pattern recognizers so they can be unit-tested in isolation.
 */
export class ContinueCodeTracker {
  private selectCount = 0;
  private armed = false;

  /** Feed a per-tick snapshot of the relevant held/edge states. */
  feed(held: { a: boolean; b: boolean; selectEdge: boolean; startEdge: boolean }): boolean {
    const ab = held.a && held.b;
    if (ab && held.selectEdge) {
      this.selectCount++;
      this.armed = this.selectCount >= 5;
    }
    if (!ab) {
      // Released buttons → ready to accept Start.
    }
    if (this.armed && held.startEdge) {
      this.reset();
      return true; // continue triggered
    }
    return false;
  }

  reset(): void {
    this.selectCount = 0;
    this.armed = false;
  }

  get presses(): number {
    return this.selectCount;
  }
}
