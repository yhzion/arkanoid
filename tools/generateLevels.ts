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

function generateRound(region: 'US' | 'JP', roundNum: number, branch: 'L' | 'R' | ''): ILevelData {
    const columns = 11;
    const rows = 28;
    const cells: IBrickCell[] = [];
    let clearRequiredCount = 0;

    // For boss rounds (Round 17 and Round 34)
    if (roundNum === 17 || roundNum === 34) {
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
            id: `${region.toLowerCase()}-round-${roundNum.toString().padStart(2, '0')}${branch}`,
            region: region,
            roundNumber: roundNum,
            type: 'boss',
            grid: { columns, rows, brickWidth: 16, brickHeight: 8 },
            clearRequiredCount: 0,
            cells,
            enemyProfile: 'boss-round',
            ballProfile: 'boss-round',
            paletteProfile: 'boss-round'
        };
    }

    if (roundNum === 1) {
        const colors: BrickType[] = ['RED', 'SILVER', 'BLUE', 'PINK', 'YELLOW', 'WHITE', 'ORANGE', 'GREEN'];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                let type: BrickType = 'EMPTY';
                let hitsRemaining = 0;
                let clearRequired = false;
                let isCapsuleCarrier = false;
                let capsule: string | null = null;

                if (r >= 4 && r < 4 + colors.length) {
                    type = colors[r - 4]!;
                    if (type === 'SILVER') {
                        hitsRemaining = 2; // Silver brick hits
                        clearRequired = true;
                    } else {
                        hitsRemaining = 1;
                        clearRequired = true;
                        // Roughly 15% carriers on colored bricks
                        const carrierHash = (r * 17 + c * 31 + roundNum * 97) % 100;
                        if (carrierHash < 15) {
                            isCapsuleCarrier = true;
                            // Pick capsule type
                            const capTypes = ['S', 'C', 'L', 'D', 'P', 'E', 'B', 'M', 'R'];
                            capsule = capTypes[(r * 7 + c * 3 + roundNum * 11) % capTypes.length]!;
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
                    capsule,
                    isCapsuleCarrier,
                    clearRequired
                });
            }
        }
    } else {
        // Procedural layout with pattern families (PRD §14.6)
        const FAMILIES = ['frame', 'pyramid', 'stripes', 'diamond', 'checker'] as const;
        const family = FAMILIES[roundNum % FAMILIES.length]!;
        
        const startRow = 4;
        const bandRows = Math.min(5 + Math.floor((roundNum - 1) / 4), 12);
        const endRow = startRow + bandRows - 1;
        const mid = 5; // center column for 11 columns (0 to 10)

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                let type: BrickType = 'EMPTY';
                let hitsRemaining = 0;
                let clearRequired = false;
                let isCapsuleCarrier = false;
                let capsule: string | null = null;

                if (r >= startRow && r <= endRow) {
                    const localRow = r - startRow;
                    let on = false;

                    switch (family) {
                        case 'frame': {
                            const edge = localRow === 0 || localRow === bandRows - 1 || c === 0 || c === columns - 1;
                            const innerEdge =
                                bandRows >= 5 &&
                                (localRow === 2 || localRow === bandRows - 3) &&
                                c >= 2 &&
                                c <= columns - 3;
                            const innerSides =
                                bandRows >= 5 &&
                                (c === 2 || c === columns - 3) &&
                                localRow >= 2 &&
                                localRow <= bandRows - 3;
                            on = edge || innerEdge || innerSides;
                            break;
                        }
                        case 'pyramid': {
                            const half = Math.floor((localRow * (columns / 2)) / Math.max(1, bandRows - 1));
                            on = Math.abs(c - mid) <= half;
                            break;
                        }
                        case 'stripes': {
                            on = ((c + (localRow % 2)) % 2) === 0;
                            break;
                        }
                        case 'diamond': {
                            const dy = Math.abs(localRow - (bandRows - 1) / 2);
                            const radius = (bandRows - 1) / 2 + 1;
                            on = Math.abs(c - mid) + dy <= radius;
                            break;
                        }
                        case 'checker': {
                            on = localRow === 0 || ((c + localRow) % 2) === 0;
                            break;
                        }
                    }

                    if (on) {
                        const hashVal = r * 13 + c * 7 + roundNum * 19;
                        const goldAllowed = roundNum > 4 && localRow > 0;
                        const isGold = goldAllowed && (hashVal % 17 === 0);
                        const isSilver = !isGold && roundNum > 1 && (hashVal % 11 === 0);

                        if (isGold) {
                            type = 'GOLD';
                            hitsRemaining = Infinity;
                            clearRequired = false;
                        } else if (isSilver) {
                            type = 'SILVER';
                            hitsRemaining = 2 + Math.floor((roundNum - 1) / 8);
                            clearRequired = true;
                        } else {
                            const typeIdx = (r + c + roundNum) % BRICK_TYPES.length;
                            type = BRICK_TYPES[typeIdx]!;
                            hitsRemaining = 1;
                            clearRequired = true;

                            // Place capsule carrier on colored bricks (approx 15% rate)
                            const carrierHash = (r * 17 + c * 31 + roundNum * 97) % 100;
                            if (carrierHash < 15) {
                                isCapsuleCarrier = true;
                                const capTypes = ['S', 'C', 'L', 'D', 'P', 'E', 'B', 'M', 'R'];
                                capsule = capTypes[(r * 7 + c * 3 + roundNum * 11) % capTypes.length]!;
                            }
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
                    capsule,
                    isCapsuleCarrier,
                    clearRequired
                });
            }
        }
    }

    return {
        id: `${region.toLowerCase()}-round-${roundNum.toString().padStart(2, '0')}${branch}`,
        region: region,
        roundNumber: roundNum,
        type: 'brick',
        grid: { columns, rows, brickWidth: 16, brickHeight: 8 },
        clearRequiredCount,
        cells,
        enemyProfile: `default-round-${roundNum}`,
        ballProfile: `default-round-${roundNum}`,
        paletteProfile: `${region.toLowerCase()}-round-${roundNum}`
    };
}

// Generate levels for US and JP regions
const regions = ['us', 'jp'] as const;
for (const region of regions) {
    const outputDir = `./public/data/levels/${region}`;
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate Arkanoid II branching rounds
    const rounds: { num: number; branch: 'L' | 'R' | '' }[] = [];
    rounds.push({ num: 1, branch: '' });
    for (let r = 2; r <= 16; r++) {
        rounds.push({ num: r, branch: 'L' });
        rounds.push({ num: r, branch: 'R' });
    }
    rounds.push({ num: 17, branch: '' });
    rounds.push({ num: 18, branch: '' });
    for (let r = 19; r <= 33; r++) {
        rounds.push({ num: r, branch: 'L' });
        rounds.push({ num: r, branch: 'R' });
    }
    rounds.push({ num: 34, branch: '' });

    // Clean up old levels (optional, but good to make sure we don't have dangling round 35/36)
    if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
            fs.unlinkSync(path.join(outputDir, file));
        }
    }

    for (const r of rounds) {
        const data = generateRound(region.toUpperCase() as 'US' | 'JP', r.num, r.branch);
        const filename = `round-${r.num.toString().padStart(2, '0')}${r.branch}.json`;
        fs.writeFileSync(
            path.join(outputDir, filename),
            JSON.stringify(data, null, 2)
        );
    }
    console.log(`Successfully generated Arkanoid II levels for region ${region.toUpperCase()}.`);
}
