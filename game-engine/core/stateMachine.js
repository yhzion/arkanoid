// PRD Appendix 31: State Transition Table
export var GamePhase;
(function (GamePhase) {
    GamePhase["BOOT"] = "BOOT";
    GamePhase["TITLE"] = "TITLE";
    GamePhase["PLAYING"] = "PLAYING";
    GamePhase["GAME_OVER"] = "GAME_OVER";
    // ROUND_INTRO, BALL_READY, etc. will be added
})(GamePhase || (GamePhase = {}));
export class StateMachine {
    currentState = GamePhase.BOOT;
    getState() {
        return this.currentState;
    }
    transitionTo(newState) {
        // Basic transition for now
        this.currentState = newState;
        console.log(`Transitioned to: ${newState}`);
    }
}
//# sourceMappingURL=stateMachine.js.map