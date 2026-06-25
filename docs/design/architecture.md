# System Architecture

*Reference: `prd.md` Section 19 (Technical Architecture)*

This document focuses on the implementation details of the game engine architecture.

## 1. Engine Paradigm
To maintain strict determinism, the engine separates logic updates from rendering:
- **Simulation Loop:** Runs at a fixed 60Hz. Updates game state based on inputs.
- **Rendering Loop:** Runs on `requestAnimationFrame`. Interpolates state for smooth rendering (optional) or snaps to integer coordinates for pixel-perfect fidelity.

## 2. Directory Structure (/game-engine)
- `/core`: Main game loop, state management, event bus.
- `/entities`: Vaus, Ball, Brick, Enemy, PowerUp logic.
- `/physics`: Collision detection, AABB, response math.
- `/render`: Canvas rendering contexts (Fidelity vs Clean-room).
- `/input`: Keyboard, Mouse, Gamepad polling and abstraction.
- `/loaders`: Asset, Level JSON, and Storage loaders.
