import * as fs from 'fs';
import * as path from 'path';
import { validateLevel } from '../src/data/levelSchema';

const levelsDir = './public/data/levels/us';

if (!fs.existsSync(levelsDir)) {
    console.error(`Levels directory not found: ${levelsDir}`);
    process.exit(1);
}

const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));

let totalErrors = 0;

for (const file of files) {
    const filePath = path.join(levelsDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const levelData = JSON.parse(content);
        
        const errors = validateLevel(levelData);
        if (errors.length > 0) {
            console.error(`Validation errors in ${file}:`);
            errors.forEach(err => console.error(`  - ${err}`));
            totalErrors += errors.length;
        } else {
            console.log(`${file}: Valid`);
        }
    } catch (err: any) {
        console.error(`Failed to read/parse ${file}:`, err.message);
        totalErrors++;
    }
}

if (totalErrors > 0) {
    console.error(`Validation failed with ${totalErrors} errors total.`);
    process.exit(1);
} else {
    console.log('All levels validated successfully!');
}
