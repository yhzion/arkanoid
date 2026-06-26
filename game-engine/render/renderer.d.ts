import type { GameState } from '../core/gameState.js';
import type { RoundState } from '../core/roundState.js';
export declare class Renderer {
    private ctx;
    private width;
    private height;
    constructor(canvas: HTMLCanvasElement);
    render(gameState: GameState, roundState: RoundState): void;
}
//# sourceMappingURL=renderer.d.ts.map