/**
 * renderLevelPreview tool — architecture.md §2.1.
 * Renders a level JSON to a PPM image (dependency-free preview).
 * Usage: npx tsx tools/renderLevelPreview.ts <level.json> [out.ppm]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { renderLevelPixels, toPPM } from '../src/render/levelPixels';
import { sanitizeLevel } from '../src/data/levelValidator';

async function main(): Promise<void> {
  const [, , levelPath, outPath] = process.argv;
  if (!levelPath) {
    console.error('Usage: renderLevelPreview <level.json> [out.ppm]');
    process.exit(1);
  }
  const raw = JSON.parse(await readFile(levelPath, 'utf8'));
  const level = sanitizeLevel(raw);
  const img = renderLevelPixels(level);
  const ppm = toPPM(img);
  const dest = outPath ?? levelPath.replace(/\.json$/, '.ppm');
  await writeFile(dest, ppm);
  console.log(`Wrote ${dest} (${img.width}x${img.height})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
