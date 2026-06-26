const ONE = 1 << 16;

export function toFx(v: number): number { return (v * ONE) | 0; }
export function fromFx(v: number): number { return v / ONE; }
export function fxMul(a: number, b: number): number { return ((BigInt(a) * BigInt(b)) >> 16n) as unknown as number; }
export function fxDiv(a: number, b: number): number { return ((BigInt(a) << 16n) / BigInt(b)) as unknown as number; }
export function fxClamp(v: number, min: number, max: number): number { return v < min ? min : v > max ? max : v; }
export function fxFromInt(v: number): number { return v << 16; }
export function fxToInt(v: number): number { return v >> 16; }
