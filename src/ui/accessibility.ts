/**
 * Accessibility helpers — PRD §29, §34.3.
 *
 * - Touch target: the logical Vaus is 32 px, but the drag/touch hit area must be
 *   ≥ 44 CSS px (§29). Compute the CSS hit width for a given canvas scale.
 * - Color-blind glyphs: a per-brick-type distinguishing glyph overlay (§29) so brick
 *   types remain distinguishable without color (red/green, blue/pink, §11.3).
 * - Flash-rate: helper to assert an effect's strobe stays under WCAG 2.3.1 (≤3/s).
 */
import { BrickType, COLORED_BRICKS } from '../data/schemas';

/** One-character glyph per colored brick for the optional color-blind overlay (§29). */
export const BRICK_GLYPH: Record<BrickType, string> = {
  EMPTY: ' ',
  WHITE: '◻',
  ORANGE: '◐',
  LIGHT_BLUE: '◇',
  GREEN: '▲',
  RED: '●',
  BLUE: '■',
  PINK: '▽',
  YELLOW: '★',
  SILVER: '▦',
  GOLD: '◆',
};

/** Every colored brick has a non-blank, mutually-distinct glyph (§34.3 glyph presence). */
export function colorBlindGlyphsDistinct(): boolean {
  const glyphs = COLORED_BRICKS.map((t) => BRICK_GLYPH[t]);
  const blank = glyphs.filter((g) => g === ' ');
  const unique = new Set(glyphs);
  return blank.length === 0 && unique.size === glyphs.length;
}

/**
 * Minimum touch target is 44 CSS px (§29). The Vaus sprite is 32 logical px; the
 * drag/touch hit area is scaled independently. Given the canvas CSS scale (logical→CSS),
 * return the CSS-pixel hit width, and whether it meets the 44 px minimum.
 */
export function touchTargetCssPx(vausLogicalWidth: number, canvasScale: number): number {
  return vausLogicalWidth * canvasScale;
}

export function meetsTouchTarget(vausLogicalWidth: number, canvasScale: number): boolean {
  return touchTargetCssPx(vausLogicalWidth, canvasScale) >= 44;
}

/** Compute the minimum integer canvas scale so the Vaus drag area ≥ 44 CSS px (§34.3). */
export function minScaleForTouchTarget(vausLogicalWidth: number): number {
  return Math.ceil(44 / vausLogicalWidth);
}

/**
 * WCAG 2.3.1 flash limit: ≤ 3 flashes/second (§34.3). Given an effect that toggles
 * every `periodTicks` ticks at 60 Hz, return whether it is within the limit.
 */
export function withinFlashLimit(periodTicks: number): boolean {
  if (periodTicks <= 0) return false;
  const flashesPerSecond = 60 / periodTicks;
  return flashesPerSecond <= 3;
}
