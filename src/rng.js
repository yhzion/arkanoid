// Deterministic mulberry32 PRNG (PRD §30.4).
export function mulberry32(seedStr) {
  let state = 0;
  const s = String(seedStr);
  for (let i = 0; i < s.length; i++) {
    state = (Math.imul(31, state) + s.charCodeAt(i)) >>> 0;
  }
  if (state === 0) state = 0xffffffff;
  return function rng() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0);
  };
}

export function randInt(rng, max) {
  return rng() % max;
}

export function randChoice(rng, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() % total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
