// PRD Appendix 31: State Transition Table

export enum GamePhase {
  BOOT = 'BOOT',
  TITLE = 'TITLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  // ROUND_INTRO, BALL_READY, etc. will be added
}

export class StateMachine {
  private currentState: GamePhase = GamePhase.BOOT;

  public getState(): GamePhase {
    return this.currentState;
  }

  public transitionTo(newState: GamePhase) {
    // Basic transition for now
    this.currentState = newState;
    console.log(`Transitioned to: ${newState}`);
  }
}
