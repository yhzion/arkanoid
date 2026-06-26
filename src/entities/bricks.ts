import { ILevelData, IBrickCell, BrickType } from '../data/levelSchema';
import { toFx } from '../core/fxMath';
import { AABB } from '../physics/collision';
import { EventBus, GameEvents } from '../core/eventBus';
import { GameState } from '../core/gameState';

export class BrickGrid {
    public cells: IBrickCell[] = [];
    public columns: number = 11;
    public rows: number = 28;
    public brickWidth: number = 16;
    public brickHeight: number = 8;
    public clearRequiredCount: number = 0;

    constructor() {}

    public loadLevel(level: ILevelData): void {
        this.columns = level.grid.columns;
        this.rows = level.grid.rows;
        this.brickWidth = level.grid.brickWidth;
        this.brickHeight = level.grid.brickHeight;
        this.clearRequiredCount = level.clearRequiredCount;
        
        // Deep copy cells
        this.cells = level.cells.map(cell => ({ ...cell }));
    }

    public getCell(col: number, row: number): IBrickCell | null {
        if (col < 0 || col >= this.columns || row < 0 || row >= this.rows) {
            return null;
        }
        return this.cells[row * this.columns + col] || null;
    }

    public getBrickAABB(col: number, row: number): AABB {
        return {
            x: toFx(8 + col * this.brickWidth),
            y: toFx(8 + row * this.brickHeight),
            w: toFx(this.brickWidth),
            h: toFx(this.brickHeight)
        };
    }

    public hitBrick(col: number, row: number, damage: number = 1, forceDestroy: boolean = false, doubleScore: boolean = false): { destroyed: boolean; points: number } {
        const cell = this.getCell(col, row);
        if (!cell || cell.type === 'EMPTY') return { destroyed: false, points: 0 };

        EventBus.emit(GameEvents.BRICK_HIT, { col, row, type: cell.type });

        if (cell.type === 'GOLD' && !forceDestroy) {
            return { destroyed: false, points: 0 };
        }

        let destroyed = false;
        let points = 0;

        if (cell.type === 'GOLD' && forceDestroy) {
            cell.hitsRemaining = 0;
            cell.type = 'EMPTY';
            destroyed = true;
            points = 0;
            EventBus.emit(GameEvents.BRICK_DESTROYED, {
                col,
                row,
                type: 'GOLD',
                scoreDelta: 0
            });
            return { destroyed: true, points: 0 };
        }

        cell.hitsRemaining -= damage;
        if (cell.hitsRemaining <= 0) {
            cell.hitsRemaining = 0;
            const oldType = cell.type;
            cell.type = 'EMPTY';
            destroyed = true;

            if (cell.clearRequired) {
                this.clearRequiredCount = Math.max(0, this.clearRequiredCount - 1);
            }

            points = this.getBrickScore(oldType);
            if (doubleScore) {
                points *= 2;
            }
            GameState.addScore(points);

            EventBus.emit(GameEvents.BRICK_DESTROYED, {
                col,
                row,
                type: oldType,
                scoreDelta: points
            });
        }

        return { destroyed, points };
    }

    private getBrickScore(type: BrickType): number {
        switch (type) {
            case 'WHITE': return 50;
            case 'ORANGE': return 60;
            case 'LIGHT_BLUE': return 70;
            case 'GREEN': return 80;
            case 'RED': return 90;
            case 'BLUE': return 100;
            case 'PINK': return 110;
            case 'YELLOW': return 120;
            case 'SILVER':
                // Silver brick score: 50 * current round number
                return 50 * GameState.currentRoundNum;
            default: return 0;
        }
    }
}
