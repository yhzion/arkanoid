import { describe, it, expect } from 'vitest';
import { computeIntegerScale } from '../../src/render/renderer';

// PRD §6.1: integer scaling (1x-4x) where possible; never scale below 1x.
describe('computeIntegerScale (§6.1)', () => {
  it('returns an exact integer multiple when the container fits one', () => {
    expect(computeIntegerScale(512, 480)).toBe(2);
    expect(computeIntegerScale(1024, 960)).toBe(4);
  });

  it('floors to the largest integer that still fits both dimensions', () => {
    expect(computeIntegerScale(700, 600)).toBe(2); // min(2.73, 2.5) -> 2
  });

  it('never goes below 1x even for tiny containers', () => {
    expect(computeIntegerScale(100, 100)).toBe(1);
  });

  it('is 1x at the native logical size', () => {
    expect(computeIntegerScale(256, 240)).toBe(1);
  });
});
