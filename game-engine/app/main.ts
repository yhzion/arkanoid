import { setupCanvas } from './boot.js';
import { Renderer } from '../render/renderer.js';
import { FixedStepEngine } from '../core/fixedStep.js';
import { StateMachine, GamePhase } from '../core/stateMachine.js';
import { createInitialGameState } from '../core/gameState.js';
import { createInitialRoundState } from '../core/roundState.js';
import { InputManager } from '../input/input.js';
import { Vaus } from '../entities/vaus.js';

// Boot process
const canvas = setupCanvas('game-container');
const renderer = new Renderer(canvas);
const stateMachine = new StateMachine();
const inputManager = new InputManager();

const gameState = createInitialGameState();
const roundState = createInitialRoundState();

// Initialize some test state
roundState.vaus = new Vaus(100, 240);
stateMachine.transitionTo(GamePhase.PLAYING);

// Game loop functions
function tick() {
  const currentPhase = stateMachine.getState();

  if (currentPhase === GamePhase.PLAYING) {
    const input = inputManager.sample();
    if (roundState.vaus) {
      roundState.vaus.update(input);
    }
  }
}

function render() {
  renderer.render(gameState, roundState);
}

const engine = new FixedStepEngine(tick, render);
engine.start();

console.log("NES Arkanoid Web Engine started.");
