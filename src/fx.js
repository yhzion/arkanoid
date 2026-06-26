// Q16.16 fixed-point helpers and pre-computed deterministic angle tables.
export const FX = 1 << 16;

export function toFx(v) { return Math.round(v * FX); }
export function f2i(v) { return Math.trunc(v / FX); }
export function f2n(v) { return v / FX; }
export function fmul(a, b) { return Math.trunc((a * b) / FX); }
export function fdiv(a, b) { return Math.trunc((a * FX) / b); }
export function fabs(a) { return Math.abs(a); }
export function fclamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export const ZERO = 0;
export const ONE = FX;
export const HALF = FX >> 1;
export const NEG_ONE = -FX;

function degToVec(deg) {
  const rad = (deg * Math.PI) / 180;
  return { vx: toFx(Math.cos(rad)), vy: toFx(-Math.sin(rad)) };
}

// Launch angles: 60° (right) and 120° (left) relative to +x, both upward.
export const LAUNCH_RIGHT = degToVec(60);
export const LAUNCH_LEFT = degToVec(120);

// Discrete 8-zone deflection angles (§10.4 / §30.3)
export const DEFL_DISCRETE_DEG = [-75, -55, -35, -15, 15, 35, 55, 75];

// Continuous deflection LUT: scalingFactor mapped to 256 slots with ±10° vertical-loop clamp.
export const DEFL_CONTINUOUS = [];
for (let i = 0; i < 256; i++) {
  let sf = (i - 127.5) / 127.5; // -1 .. 1
  let deg = sf * 75;
  if (Math.abs(deg) < 10) deg = deg >= 0 ? 10 : -10;
  DEFL_CONTINUOUS.push(degToVec(deg));
}

export function getDeflectionVector(sfFx, model, speedFx) {
  if (model === 'discrete8') {
    const t = f2n(fclamp(sfFx, NEG_ONE, ONE));
    let zone = Math.floor((t + 1) * 4);
    if (zone < 0) zone = 0;
    if (zone > 7) zone = 7;
    const u = degToVec(DEFL_DISCRETE_DEG[zone]);
    return { vx: fmul(u.vx, speedFx), vy: fmul(u.vy, speedFx) };
  }
  let idx = Math.round(f2n(sfFx) * 127.5 + 127.5);
  if (idx < 0) idx = 0;
  if (idx > 255) idx = 255;
  const u = DEFL_CONTINUOUS[idx];
  return { vx: fmul(u.vx, speedFx), vy: fmul(u.vy, speedFx) };
}

export const DISRUPT_ANGLES = [0, 15, -15];

// Fixed-point sin/cos tables for enemy paths.
export const SIN_TABLE_SIZE = 1024;
export const SIN_TABLE = new Array(SIN_TABLE_SIZE);
export const COS_TABLE = new Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  const rad = (i * 2 * Math.PI) / SIN_TABLE_SIZE;
  SIN_TABLE[i] = toFx(Math.sin(rad));
  COS_TABLE[i] = toFx(Math.cos(rad));
}
export function fsin(phase) { return SIN_TABLE[(phase >>> 0) % SIN_TABLE_SIZE]; }
export function fcos(phase) { return COS_TABLE[(phase >>> 0) % SIN_TABLE_SIZE]; }
