// PRD 19.3.3 Global Play Session State (S6)

export interface GameState {
  score: number;
  lives: number;
  roundNumber: number; // 1 to 36
  hasUsedContinue: boolean;
  scoreBeforeContinue: number;
}

export function createInitialGameState(): GameState {
  return {
    score: 0,
    lives: 3, // PRD 33.1 / Default
    roundNumber: 1,
    hasUsedContinue: false,
    scoreBeforeContinue: 0,
  };
}
