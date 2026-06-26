import * as fs from 'fs';
import * as path from 'path';
import { validateLevel } from '../src/data/levelSchema';

const regions = ['us', 'jp'] as const;
let totalErrors = 0;

for (const region of regions) {
    const levelsDir = `./public/data/levels/${region}`;
    
    if (!fs.existsSync(levelsDir)) {
        console.error(`Levels directory not found: ${levelsDir}`);
        totalErrors++;
        continue;
    }

    const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const filePath = path.join(levelsDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const levelData = JSON.parse(content);
            
            const errors = validateLevel(levelData);
            if (errors.length > 0) {
                console.error(`Validation errors in [${region.toUpperCase()}] ${file}:`);
                errors.forEach(err => console.error(`  - ${err}`));
                totalErrors += errors.length;
            } else {
                console.log(`[${region.toUpperCase()}] ${file}: Valid`);
            }
        } catch (err: any) {
            console.error(`Failed to read/parse [${region.toUpperCase()}] ${file}:`, err.message);
            totalErrors++;
        }
    }
}

if (totalErrors > 0) {
    console.error(`Validation failed with ${totalErrors} errors total.`);
    process.exit(1);
} else {
    console.log('All levels validated successfully!');
}
