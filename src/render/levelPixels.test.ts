import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderLevelPixels, compareLevelCells, toPPM } from './levelPixels';
import { sanitizeLevel } from '../data/levelValidator';
import { ILevelData } from '../data/schemas';
import { computeLevelManifestDigest } from '../data/assetManifest';

async function loadRound(r: number): Promise<ILevelData> {
  const raw = JSON.parse(await readFile(join(process.cwd(), 'public/data/levels/us', `round-${String(r).padStart(2, '0')}.json`), 'utf8'));
  return sanitizeLevel(raw);
}

describe('level pixels + manifest (M2 tools)', () => {
  it('renders a level to an RGBA buffer of grid pixel size', async () => {
    const lvl = await loadRound(1);
    const img = renderLevelPixels(lvl);
    expect(img.width).toBe(11 * 16);
    expect(img.height).toBe(28 * 8);
    expect(img.data.length).toBe(img.width * img.height * 4);
    // At least one non-black pixel (there are bricks).
    let anyColor = false;
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i] || img.data[i + 1] || img.data[i + 2]) {
        anyColor = true;
        break;
      }
    }
    expect(anyColor).toBe(true);
  });

  it('PPM header is well-formed', async () => {
    const lvl = await loadRound(1);
    const ppm = toPPM(renderLevelPixels(lvl));
    const header = new TextDecoder().decode(ppm.slice(0, 15));
    expect(header.startsWith('P6\n')).toBe(true);
  });

  it('compareLevelCells reports zero diff for identical levels', async () => {
    const lvl = await loadRound(1);
    const diff = compareLevelCells(lvl, lvl);
    expect(diff.differingCells).toBe(0);
  });

  it('compareLevelCells detects a single changed cell', async () => {
    const lvl = await loadRound(1);
    const mutated: ILevelData = JSON.parse(JSON.stringify(lvl));
    // flip the first non-empty cell
    const c = mutated.cells.find((x) => x.type !== 'EMPTY')!;
    const orig = c.type;
    c.type = 'GOLD';
    const diff = compareLevelCells(lvl, mutated);
    expect(diff.differingCells).toBeGreaterThanOrEqual(1);
    expect(diff.cells.some((d) => d.expected === orig && d.actual === 'GOLD')).toBe(true);
  });

  it('manifest digest is stable and changes when a level changes', async () => {
    const levels = await Promise.all([1, 2, 3].map(loadRound));
    const d1 = await computeLevelManifestDigest(levels);
    const d2 = await computeLevelManifestDigest(levels);
    expect(d1).toBe(d2);
    const mutated: ILevelData = JSON.parse(JSON.stringify(levels[0]));
    mutated.cells.find((x) => x.type !== 'EMPTY')!.type = 'GOLD';
    const d3 = await computeLevelManifestDigest([mutated, levels[1], levels[2]]);
    expect(d3).not.toBe(d1);
  });
});
