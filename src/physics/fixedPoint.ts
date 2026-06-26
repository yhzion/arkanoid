export type Fx = number;
export const FX_SHIFT = 16;
export const FX_ONE = 1 << FX_SHIFT;
export const FX_HALF = FX_ONE >> 1;
export const FX_TWO = FX_ONE * 2;
export const FX_NEG_ONE = -FX_ONE;

export function fx(val: number): Fx {
  return Math.round(val * FX_ONE) | 0;
}

export function fxFloor(f: Fx): number {
  return f >> FX_SHIFT;
}

export function fxToFloat(f: Fx): number {
  return f / FX_ONE;
}

export function fxMul(a: Fx, b: Fx): Fx {
  return Math.round((a / FX_ONE) * b) | 0;
}

export function fxDiv(a: Fx, b: Fx): Fx {
  return Math.round((a / b) * FX_ONE) | 0;
}

export function fxClamp(val: Fx, min: Fx, max: Fx): Fx {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

export function fxAbs(val: Fx): Fx {
  return val < 0 ? -val : val;
}

export function fxSign(val: Fx): number {
  if (val > 0) return 1;
  if (val < 0) return -1;
  return 0;
}
