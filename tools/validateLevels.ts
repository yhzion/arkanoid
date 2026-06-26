import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LEVELS_DIR = join(import.meta.dirname!, '..', 'public', 'data', 'levels', 'us');

const VALID_TYPES = ['EMPTY','WHITE','ORANGE','LIGHT_BLUE','GREEN','RED','BLUE','PINK','YELLOW','SILVER','GOLD'];
const VALID_CAPSULES = ['S','C','L','D','P','E','B'];

function validate() {
  const files = readdirSync(LEVELS_DIR).filter(f => f.endsWith('.json')).sort();
  let totalErrors = 0;

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(LEVELS_DIR, file), 'utf-8'));
    const errors: string[] = [];

    if (data.grid.columns !== 11) errors.push('grid.columns != 11');
    if (data.grid.rows !== 28) errors.push('grid.rows != 28');
    if (data.grid.brickWidth !== 16) errors.push('grid.brickWidth != 16');
    if (data.grid.brickHeight !== 8) errors.push('grid.brickHeight != 8');

    let clearCount = 0;
    for (const cell of data.cells) {
      if (cell.col < 0 || cell.col >= 11) errors.push(`cell col ${cell.col} out of range`);
      if (cell.row < 0 || cell.row >= 28) errors.push(`cell row ${cell.row} out of range`);
      if (!VALID_TYPES.includes(cell.type)) errors.push(`invalid type ${cell.type}`);
      if (cell.capsule && !VALID_CAPSULES.includes(cell.capsule)) errors.push(`invalid capsule ${cell.capsule}`);
      if (cell.type === 'GOLD' && cell.clearRequired) errors.push(`gold clearRequired at ${cell.col},${cell.row}`);
      if (cell.type === 'EMPTY' && cell.clearRequired) errors.push(`empty clearRequired at ${cell.col},${cell.row}`);
      if (cell.clearRequired) clearCount++;
    }

    if (data.type === 'boss') {
      if (data.cells.length > 0) errors.push('boss round should have no cells');
      if (data.clearRequiredCount !== 0) errors.push('boss round clearRequiredCount != 0');
    }

    if (data.clearRequiredCount !== clearCount) {
      errors.push(`clearRequiredCount mismatch: declared ${data.clearRequiredCount}, actual ${clearCount}`);
    }

    if (errors.length > 0) {
      console.error(`\n${file}: ${errors.length} error(s)`);
      errors.forEach(e => console.error(`  - ${e}`));
      totalErrors += errors.length;
    } else {
      console.log(`${file}: OK`);
    }
  }

  console.log(`\nTotal: ${files.length} files, ${totalErrors} error(s)`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

validate();
