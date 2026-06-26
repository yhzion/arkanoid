import { Fx, fx } from './fixedPoint';

interface UnitVector { vx: Fx; vy: Fx }

function buildAngleTable(): ReadonlyArray<UnitVector> {
  const table: UnitVector[] = [];
  for (let i = 0; i <= 256; i++) {
    const angleDeg = (i / 256) * 180 - 90;
    const rad = angleDeg * Math.PI / 180;
    table.push({ vx: fx(Math.sin(rad)), vy: fx(-Math.cos(rad)) });
  }
  return table;
}

export const UNIT_VECTOR_LUT: ReadonlyArray<UnitVector> = buildAngleTable();

export const DISCRETE8_INDEX: ReadonlyArray<number> = (() => {
  const zones: number[] = [];
  for (let i = 0; i < 256; i++) {
    const scale = (i / 128) - 1;
    if (scale < -0.75) zones.push(0);
    else if (scale < -0.5) zones.push(1);
    else if (scale < -0.25) zones.push(2);
    else if (scale < 0) zones.push(3);
    else if (scale < 0.25) zones.push(4);
    else if (scale < 0.5) zones.push(5);
    else if (scale < 0.75) zones.push(6);
    else zones.push(7);
  }
  return zones;
})();

export const DISCRETE8_ANGLES: ReadonlyArray<number> = [-75, -55, -35, -15, 15, 35, 55, 75];

export function angleToIndex(angleDeg: number): number {
  const normalized = ((angleDeg + 90) / 180) * 256;
  const clamped = Math.max(0, Math.min(256, Math.round(normalized)));
  return clamped > 256 ? 256 : clamped;
}
