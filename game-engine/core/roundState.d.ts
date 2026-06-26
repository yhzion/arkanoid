import { Ball } from '../entities/ball.js';
import { Brick } from '../entities/bricks.js';
import { Vaus } from '../entities/vaus.js';
export interface RoundState {
    vaus: Vaus | null;
    balls: Ball[];
    bricks: Brick[];
}
export declare function createInitialRoundState(): RoundState;
//# sourceMappingURL=roundState.d.ts.map