/**
 * Name entry — PRD §8.8.
 *
 * 3-character initials input. Desktop: intercept A–Z keystrokes; mobile: native
 * keyboard (caller wires). Backspace deletes; submit finalizes. Initials are
 * clamped to 3 uppercase A–Z/0–9 chars on persistence (see persistence.ts).
 */
export class NameEntry {
  initials = '';
  done = false;

  /** Accept a typed character (A–Z, 0–9) or 'backspace'. Returns true if accepted. */
  input(ch: string): boolean {
    if (this.done) return false;
    if (ch === 'backspace') {
      this.initials = this.initials.slice(0, -1);
      return true;
    }
    const upper = ch.toUpperCase();
    if (!/^[A-Z0-9]$/.test(upper)) return false;
    if (this.initials.length >= 3) return false;
    this.initials += upper;
    if (this.initials.length === 3) this.done = true;
    return true;
  }

  /** Finalize (e.g., on timeout) — pads/locks the entry. */
  finalize(): string {
    this.done = true;
    return this.initials;
  }

  reset(): void {
    this.initials = '';
    this.done = false;
  }
}
