export const FX_SHIFT = 16;
export const FX_ONE = 1 << FX_SHIFT;
export const FX_HALF = 1 << (FX_SHIFT - 1);
export const FX_TWO = FX_ONE * 2;

export function toFx(n: number): number { return Math.round(n * FX_ONE); }
export function fromFx(n: number): number { return n / FX_ONE; }
export function fxMul(a: number, b: number): number { return ((a * b) + FX_HALF) >> FX_SHIFT; }
export function fxDiv(a: number, b: number): number { if (b === 0) return 0; return ((a << FX_SHIFT) + (b >> 1)) / b; }
export function fxClamp(v: number, min: number, max: number): number { return v < min ? min : v > max ? max : v; }
export function fxAbs(v: number): number { return v < 0 ? -v : v; }
