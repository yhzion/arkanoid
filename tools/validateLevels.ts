/**
 * validateLevels tool — architecture.md §2.1 / PRD §19.6.
 *
 * Loads every level JSON under public/data/levels/<region>/ and runs the §19.6
 * validator. Exits non-zero on any invalid level. Usage: npm run validate:levels
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateLevel } from '../src/data/levelValidator';

async function scan(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await scan(p)));
    else if (entry.name.endsWith('.json') && entry.name !== 'manifest.json') out.push(p);
  }
  return out;
}

async function main(): Promise<void> {
  const root = join(process.cwd(), 'public', 'data', 'levels');
  let files: string[] = [];
  try {
    files = await scan(root);
  } catch {
    console.error(`No levels found under ${root}. Run the generator first.`);
    process.exit(1);
  }
  let bad = 0;
  for (const f of files) {
    const raw = JSON.parse(await readFile(f, 'utf8'));
    const res = validateLevel(raw);
    if (!res.ok) {
      bad++;
      console.error(`INVALID ${f}:\n  - ${res.errors.join('\n  - ')}`);
    } else {
      console.log(`OK    ${f.replace(process.cwd() + '/', '')}`);
    }
  }
  if (bad > 0) {
    console.error(`\n${bad} invalid level(s).`);
    process.exit(1);
  }
  console.log(`\nAll ${files.length} levels valid.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
