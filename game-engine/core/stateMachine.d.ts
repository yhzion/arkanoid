export declare enum GamePhase {
    BOOT = "BOOT",
    TITLE = "TITLE",
    PLAYING = "PLAYING",
    GAME_OVER = "GAME_OVER"
}
export declare class StateMachine {
    private currentState;
    getState(): GamePhase;
    transitionTo(newState: GamePhase): void;
}
//# sourceMappingURL=stateMachine.d.ts.map