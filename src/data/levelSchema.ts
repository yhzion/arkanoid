// Exact codes per PRD §14.5.
export type BrickType =
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

export type CapsuleType = 'S' | 'C' | 'L' | 'D' | 'P' | 'E' | 'B' | null;

export interface IBrickCell {
    col: number; // 0 to 10
    row: number; // 0 to 27
    type: BrickType;
    hitsRemaining: number;
    capsule: CapsuleType;
    isCapsuleCarrier: boolean;
    clearRequired: boolean;
}

export interface ILevelData {
    id: string;
    region: 'US' | 'JP';
    roundNumber: number;
    type: 'brick' | 'boss';
    grid: {
        columns: number; // usually 11
        rows: number;    // usually 28
        brickWidth: number;  // 16
        brickHeight: number; // 8
    };
    clearRequiredCount: number; // derived: MUST equal count of cells with clearRequired === true
    cells: IBrickCell[];
    enemyProfile: string;
    ballProfile: string;
    paletteProfile: string;
}

export interface ILeaderboardEntry {
    score: number;
    initials: string; // max 3 chars
    round: number;
    region: string;
    mode: string;
    date: string; // ISO string
}

export interface ILeaderboardStorage {
    schemaVersion: number;
    entries: ILeaderboardEntry[];
}

export interface GameConfig {
    region: 'US' | 'JP';
    mode: 'licensed-fidelity' | 'clean-room';
    enableManualLevelSkipSecret: boolean;
    enableHighScoreNameEntry: boolean;
    enableTwoPlayerMode: boolean;
    inputMode: 'keyboard' | 'gamepad' | 'relative-pointer' | 'absolute-pointer' | 'touch';
    renderScaleMode: 'integer' | 'fit';
    audioEnabled: boolean;
    musicVolume: number;
    sfxVolume: number;
    deflectionModel: 'continuous' | 'discrete8';
    jitterEnabled: boolean;
    numericModel: string;
    deterministicSeed: string;
}

export interface ISettingsStorage {
    schemaVersion: number;
    config: GameConfig;
    remaps: {
        keyboard: Record<string, string>; // Action -> KeyboardEvent.code
        gamepad: Record<string, number>;  // Action -> Gamepad button index
    };
}

/**
 * Validates a level data object against PRD criteria.
 * Returns an array of error messages. If empty, the level is valid.
 */
export function validateLevel(level: any): string[] {
    const errors: string[] = [];

    if (!level || typeof level !== 'object') {
        errors.push("Level data must be a valid JSON object.");
        return errors;
    }

    if (typeof level.id !== 'string' || !level.id) {
        errors.push("Missing or invalid 'id'.");
    }

    if (level.region !== 'US' && level.region !== 'JP') {
        errors.push("Region must be either 'US' or 'JP'.");
    }

    if (typeof level.roundNumber !== 'number' || level.roundNumber <= 0) {
        errors.push("Invalid 'roundNumber'.");
    }

    if (level.type !== 'brick' && level.type !== 'boss') {
        errors.push("Type must be either 'brick' or 'boss'.");
    }

    if (!level.grid || typeof level.grid !== 'object') {
        errors.push("Missing or invalid 'grid' configuration.");
    } else {
        if (level.grid.columns !== 11) {
            errors.push(`Grid columns must be exactly 11, got ${level.grid.columns}.`);
        }
        if (level.grid.rows !== 28) {
            errors.push(`Grid rows must be exactly 28, got ${level.grid.rows}.`);
        }
    }

    if (!Array.isArray(level.cells)) {
        errors.push("Cells must be a valid array.");
        return errors;
    }

    const cellsCount = level.cells.length;
    // Expected grid cells count is 11 * 28 = 308 cells
    const expectedCells = (level.grid?.columns || 11) * (level.grid?.rows || 28);
    if (cellsCount !== expectedCells) {
        errors.push(`Expected exactly ${expectedCells} cells in the grid, got ${cellsCount}.`);
    }

    let actualClearRequired = 0;
    const validBrickTypes = new Set<BrickType>([
        'EMPTY', 'WHITE', 'ORANGE', 'LIGHT_BLUE', 'GREEN',
        'RED', 'BLUE', 'PINK', 'YELLOW', 'SILVER', 'GOLD'
    ]);
    const validCapsules = new Set<CapsuleType>([
        'S', 'C', 'L', 'D', 'P', 'E', 'B', null
    ]);

    const cellPositions = new Set<string>();

    for (let i = 0; i < level.cells.length; i++) {
        const cell = level.cells[i];
        if (!cell || typeof cell !== 'object') {
            errors.push(`Cell at index ${i} is not a valid object.`);
            continue;
        }

        const posKey = `${cell.col},${cell.row}`;
        if (cellPositions.has(posKey)) {
            errors.push(`Duplicate cell position detected at col ${cell.col}, row ${cell.row}.`);
        }
        cellPositions.add(posKey);

        if (cell.col < 0 || cell.col >= 11) {
            errors.push(`Cell at index ${i} has column out of bounds: ${cell.col}.`);
        }
        if (cell.row < 0 || cell.row >= 28) {
            errors.push(`Cell at index ${i} has row out of bounds: ${cell.row}.`);
        }

        if (!validBrickTypes.has(cell.type)) {
            errors.push(`Cell at (${cell.col}, ${cell.row}) has invalid type: ${cell.type}.`);
        }

        if (!validCapsules.has(cell.capsule)) {
            errors.push(`Cell at (${cell.col}, ${cell.row}) has invalid capsule type: ${cell.capsule}.`);
        }

        if (cell.clearRequired) {
            actualClearRequired++;
            if (cell.type === 'EMPTY') {
                errors.push(`Cell at (${cell.col}, ${cell.row}) cannot be clearRequired because it is EMPTY.`);
            }
            if (cell.type === 'GOLD') {
                errors.push(`Cell at (${cell.col}, ${cell.row}) cannot be clearRequired because it is GOLD.`);
            }
        }

        if (cell.isCapsuleCarrier) {
            if (cell.type === 'EMPTY' || cell.type === 'SILVER' || cell.type === 'GOLD') {
                errors.push(`Cell at (${cell.col}, ${cell.row}) cannot be capsule carrier because it is ${cell.type}.`);
            }
            if (cell.capsule === null) {
                errors.push(`Cell at (${cell.col}, ${cell.row}) is capsule carrier but has null capsule type.`);
            }
        }
    }

    if (level.clearRequiredCount !== actualClearRequired) {
        errors.push(`clearRequiredCount (${level.clearRequiredCount}) does not match the actual number of clearRequired cells (${actualClearRequired}).`);
    }

    if (level.type === 'boss' && level.clearRequiredCount > 0) {
        errors.push("Boss level should not have clearRequired bricks.");
    }

    return errors;
}
