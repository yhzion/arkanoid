// PRD 19.3.4 Round/Playfield State (S6)
import { Ball } from '../entities/ball.js';
import { Brick } from '../entities/bricks.js';
import { Vaus } from '../entities/vaus.js';
export function createInitialRoundState() {
    return {
        vaus: null,
        balls: [],
        bricks: [],
    };
}
//# sourceMappingURL=roundState.js.map