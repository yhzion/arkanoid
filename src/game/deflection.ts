/**
 * Paddle deflection model — PRD §10.4 / §30.3 / §33.1.
 *
 * Both models are table-driven: outgoing velocity = unit vector × speed, so speed
 * is preserved exactly. The continuous model quantizes scalingFactor to a 1/256
 * grid before LUT lookup and applies the ±10° vertical-loop clamp; discrete8 maps
 * the hit offset to one of 8 fixed zones (±15/±35/±55/±75).
 */
import { Fx, fxDiv, fxClamp, fxMul, fxSign, NEG_ONE, ONE } from '../core/fixedpoint';
import {
  DISCRETE8,
  UnitVec,
  applyVerticalLoopClamp,
  continuousUnit,
} from '../core/trigTables';
import { DeflectionModel } from '../core/config';

export interface Velocity {
  vx: Fx;
  vy: Fx;
}

/**
 * Compute outgoing velocity after a paddle hit.
 * @param ballX      ball center X (fixed-point)
 * @param vausCenter Vaus center X (fixed-point)
 * @param vausHalfW  half the active Vaus collision width (fixed-point)
 * @param speed      current ball speed (fixed-point)
 * @param model      'continuous' | 'discrete8'
 * @param hSign      incoming horizontal sign (fxSign of pre-hit vx), for the 10° clamp
 */
export function paddleDeflection(
  ballX: Fx,
  vausCenter: Fx,
  vausHalfW: Fx,
  speed: Fx,
  model: DeflectionModel,
  hSign: Fx,
): Velocity {
  const relative = ballX - vausCenter;
  // scalingFactor = relative / vausHalfW, clamped to [-1, 1].
  const scalingFactor = fxClamp(fxDiv(relative, vausHalfW), NEG_ONE, ONE);

  let unit: UnitVec;
  if (model === 'discrete8') {
    // 8 equal bands over [-1,1]; index 0..7 → ±75/±55/±35/±15.
    const t = fxDiv(scalingFactor + ONE, ONE * 2); // [0,1] in fx
    let idx = Math.trunc(fxMul(t, 8 * ONE) / ONE); // floor(t*8)
    if (idx < 0) idx = 0;
    if (idx > 7) idx = 7;
    unit = DISCRETE8[idx];
  } else {
    unit = continuousUnit(scalingFactor);
    unit = applyVerticalLoopClamp(unit, hSign);
  }

  return { vx: fxMul(unit.vx, speed), vy: fxMul(unit.vy, speed) };
}

/** Map a discrete8 zone index (0..7) to its angle for assertions. */
export function discrete8Angle(idx: number): number {
  return [-75, -55, -35, -15, 15, 35, 55, 75][idx] ?? 0;
}

export { fxSign };
