import { generateAllLevels } from '../src/data/levels';
import { validateLevel } from '../src/data/levelSchema';

let totalErrors = 0;

for (const region of ['US', 'JP'] as const) {
  const levels = generateAllLevels(region);
  console.log(`\n${region}: ${levels.length} levels`);
  for (const level of levels) {
    const errors = validateLevel(level);
    if (errors.length > 0) {
      console.error(`  FAIL ${level.id}: ${errors.join(', ')}`);
      totalErrors += errors.length;
    } else {
      console.log(`  OK   ${level.id} (clear=${level.clearRequiredCount})`);
    }
  }
}

if (totalErrors > 0) {
  console.error(`\n${totalErrors} error(s) found`);
  process.exit(1);
} else {
  console.log('\nAll levels valid');
}
