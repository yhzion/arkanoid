import { describe, it, expect } from 'vitest';
import { Ball } from '../../src/entities/ball';
import { toFx } from '../../src/core/fxMath';

// PRD §10.3 / §33.1: dividing X = playfield center (96).
//   left half  -> launch right (ux > 0)
//   right half -> launch left  (ux < 0)
//   exactly center -> center-inclusive -> launch right
describe('Ball.launch direction (§10.3, §33.1)', () => {
  const W = toFx(32);

  it('launches right when Vaus is exactly centered (center-inclusive)', () => {
    const ball = new Ball();
    const vausX = toFx(96) - W / 2; // vausCenter == 96
    ball.launch(vausX, W);
    expect(ball.ux).toBeGreaterThan(0);
  });

  it('launches right when Vaus is in the left half', () => {
    const ball = new Ball();
    ball.launch(toFx(40), W); // vausCenter 56 < 96
    expect(ball.ux).toBeGreaterThan(0);
  });

  it('launches left when Vaus is in the right half', () => {
    const ball = new Ball();
    ball.launch(toFx(120), W); // vausCenter 136 > 96
    expect(ball.ux).toBeLessThan(0);
  });
});
