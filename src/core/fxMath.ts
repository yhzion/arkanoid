export type Fx = number;

export const FX_ONE: Fx = 65536; // 1 << 16
export const FX_ZERO: Fx = 0;
export const FX_HALF: Fx = 32768; // 1 << 15
export const TWO_FX: Fx = 131072; // 2 << 16
export const NEG_ONE_FX: Fx = -65536;

export function toFx(val: number): Fx {
    return Math.round(val * 65536);
}

export function toFloat(val: Fx): number {
    return val / 65536;
}

export function fxMul(a: Fx, b: Fx): Fx {
    // Math.floor rounds down towards negative infinity, matching arithmetic right shifts.
    return Math.floor((a * b) / 65536);
}

export function fxDiv(a: Fx, b: Fx): Fx {
    if (b === 0) return 0;
    return Math.floor((a * 65536) / b);
}

export function fxClamp(val: Fx, minVal: Fx, maxVal: Fx): Fx {
    return Math.max(minVal, Math.min(maxVal, val));
}

export function fxAbs(val: Fx): Fx {
    return Math.abs(val);
}

export function fxSqrt(val: Fx): Fx {
    if (val <= 0) return 0;
    // We want to compute sqrt(val / 65536) * 65536 = sqrt(val * 65536)
    let temp = val * 65536;
    let res = 0;
    let bit = 1125899906842624; // 2^50, highest power of 4 within 53-bit precision
    while (bit > temp) {
        bit /= 4;
    }
    while (bit >= 1) {
        if (temp >= res + bit) {
            temp -= res + bit;
            res = (res / 2) + bit;
        } else {
            res /= 2;
        }
        bit /= 4;
    }
    return Math.floor(res);
}
