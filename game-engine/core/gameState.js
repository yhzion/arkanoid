// PRD 19.3.3 Global Play Session State (S6)
export function createInitialGameState() {
    return {
        score: 0,
        lives: 3, // PRD 33.1 / Default
        roundNumber: 1,
        hasUsedContinue: false,
        scoreBeforeContinue: 0,
    };
}
//# sourceMappingURL=gameState.js.map