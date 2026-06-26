/**
 * compareReferenceImage tool — architecture.md §2.1 / PRD §14.6.
 * Compares an actual level against a reference at cell granularity (parity check).
 * Usage: npx tsx tools/compareReferenceImage.ts <actual.json> <reference.json>
 */
import { readFile } from 'node:fs/promises';
import { compareLevelCells } from '../src/render/levelPixels';
import { sanitizeLevel } from '../src/data/levelValidator';

async function main(): Promise<void> {
  const [, , actualPath, refPath] = process.argv;
  if (!actualPath || !refPath) {
    console.error('Usage: compareReferenceImage <actual.json> <reference.json>');
    process.exit(1);
  }
  const actual = sanitizeLevel(JSON.parse(await readFile(actualPath, 'utf8')));
  const ref = sanitizeLevel(JSON.parse(await readFile(refPath, 'utf8')));
  const diff = compareLevelCells(ref, actual);
  if (diff.differingCells === 0) {
    console.log(`PARITY OK: all ${diff.totalCells} cells match.`);
    return;
  }
  console.error(`PARITY FAIL: ${diff.differingCells}/${diff.totalCells} cells differ.`);
  for (const c of diff.cells.slice(0, 20)) {
    console.error(`  cell(col=${c.col},row=${c.row}) expected=${c.expected} actual=${c.actual}`);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
