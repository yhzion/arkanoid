import * as fs from 'fs';
import * as path from 'path';

type BrickType =
    | 'EMPTY'
    | 'WHITE'
    | 'ORANGE'
    | 'LIGHT_BLUE'
    | 'GREEN'
    | 'RED'
    | 'BLUE'
    | 'PINK'
    | 'YELLOW'
    | 'SILVER'
    | 'GOLD';

interface IBrickCell {
    col: number;
    row: number;
    type: BrickType;
    hitsRemaining: number;
    capsule: string | null;
    isCapsuleCarrier: boolean;
    clearRequired: boolean;
}

interface ILevelData {
    id: string;
    region: 'US' | 'JP';
    roundNumber: number;
    type: 'brick' | 'boss';
    grid: {
        columns: number;
        rows: number;
        brickWidth: number;
        brickHeight: number;
    };
    clearRequiredCount: number;
    cells: IBrickCell[];
    enemyProfile: string;
    ballProfile: string;
    paletteProfile: string;
}

const BRICK_TYPES: BrickType[] = [
    'WHITE', 'ORANGE', 'LIGHT_BLUE', 'GREEN', 'RED', 'BLUE', 'PINK', 'YELLOW'
];

function generateRound(roundNum: number): ILevelData {
    const columns = 11;
    const rows = 28;
    const cells: IBrickCell[] = [];
    let clearRequiredCount = 0;

    // For boss round
    if (roundNum === 36) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                cells.push({
                    col: c,
                    row: r,
                    type: 'EMPTY',
                    hitsRemaining: 0,
                    capsule: null,
                    isCapsuleCarrier: false,
                    clearRequired: false
                });
            }
        }
        return {
            id: `us-round-36`,
            region: 'US',
            roundNumber: 36,
            type: 'boss',
            grid: { columns, rows, brickWidth: 16, brickHeight: 8 },
            clearRequiredCount: 0,
            cells,
            enemyProfile: 'boss-round',
            ballProfile: 'boss-round',
            paletteProfile: 'boss-round'
        };
    }

    // Determine row bounds for bricks: e.g. rows 4 to 12
    const startRow = 4;
    const endRow = 4 + 3 + Math.floor(roundNum / 6); // Rows expand as rounds advance

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let type: BrickType = 'EMPTY';
            let hitsRemaining = 0;
            let clearRequired = false;
            let isCapsuleCarrier = false;

            if (r >= startRow && r <= endRow) {
                // Determine brick type pattern based on round number and coordinates
                const patternIdx = (r + c + roundNum) % 15;
                if (patternIdx < 8) {
                    type = BRICK_TYPES[patternIdx];
                    hitsRemaining = 1;
                    clearRequired = true;
                } else if (patternIdx === 9 && roundNum > 3) {
                    // Gold bricks in later rounds
                    type = 'GOLD';
                    hitsRemaining = Infinity;
                    clearRequired = false;
                } else if (patternIdx === 10 && roundNum > 1) {
                    // Silver bricks
                    type = 'SILVER';
                    hitsRemaining = 2 + Math.floor((roundNum - 1) / 8);
                    clearRequired = true;
                } else {
                    // Empty spaces within layout
                    type = 'EMPTY';
                }

                // Place capsule carriers on clear-required colored bricks
                // Roughly 15% rate
                if (clearRequired && type !== 'SILVER') {
                    const hash = (r * 17 + c * 31 + roundNum * 97) % 100;
                    if (hash < 18) {
                        isCapsuleCarrier = true;
                    }
                }
            }

            if (clearRequired) {
                clearRequiredCount++;
            }

            cells.push({
                col: c,
                row: r,
                type,
                hitsRemaining,
                capsule: isCapsuleCarrier ? 'D' : null, // placeholder type
                isCapsuleCarrier,
                clearRequired
            });
        }
    }

    return {
        id: `us-round-${roundNum.toString().padStart(2, '0')}`,
        region: 'US',
        roundNumber: roundNum,
        type: 'brick',
        grid: { columns, rows, brickWidth: 16, brickHeight: 8 },
        clearRequiredCount,
        cells,
        enemyProfile: `default-round-${roundNum}`,
        ballProfile: `default-round-${roundNum}`,
        paletteProfile: `us-round-${roundNum}`
    };
}

const outputDir = './public/data/levels/us';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

for (let r = 1; r <= 36; r++) {
    const data = generateRound(r);
    fs.writeFileSync(
        path.join(outputDir, `round-${r.toString().padStart(2, '0')}.json`),
        JSON.stringify(data, null, 2)
    );
}

console.log('Successfully generated 36 level files.');
