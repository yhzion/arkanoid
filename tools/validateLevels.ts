import { generateAllLevels } from '../src/data/levels';
import { validateLevel } from '../src/data/levelSchema';

const levels = generateAllLevels();
let hasErrors = false;
for (const [id, level] of levels) {
  const errors = validateLevel(level);
  if (errors.length > 0) {
    console.error(`Level ${id}:`);
    errors.forEach(e => console.error(`  - ${e}`));
    hasErrors = true;
  } else {
    console.log(`Level ${id}: OK`);
  }
}
if (hasErrors) {
  console.error('Level validation FAILED');
  process.exit(1);
} else {
  console.log(`All ${levels.size} levels validated OK`);
}
