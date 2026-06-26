# Arkanoid — Self-Contained Clean-Room Implementation

A browser-playable Arkanoid homage built from the PRD and design docs in this repo.

This is a **clean-room** build: level layouts, art, audio, names, and story text are original/procedural, not the copyrighted NES originals. The engine supports the `licensed-fidelity` / `clean-room` mode switch so a licensed asset pack can be dropped in later.

## Run

```bash
npm run dev
```

Then open the printed local URL. The game is served by Vite so ES modules load correctly.

## Build

```bash
npm run build
npm run preview
```

## Implemented

- Fixed-step 60 Hz simulation loop with fixed-point (Q16.16) physics
- Deterministic mulberry32 RNG for capsule drops
- State machine: title, story, demo, round intro, ball ready, playing, pause, life lost, round clear, break warp, boss, ending, name entry
- Keyboard / mouse / touch / gamepad input with remappable key skeleton
- Vaus movement, ball launch, continuous & discrete 8-zone paddle deflection, vertical-loop clamp
- Colored / silver / gold bricks, capsule power-ups (S/C/L/D/P/E/B), multi-ball, catch, laser, enlarge, break warp
- Enemy spawner with sine/loop paths, boss DOH with 16-hit defeat and aimed projectiles
- Score, extra lives, local high-score persistence with blocked-localStorage fallback
- Synthesized NES-style audio fallback via Web Audio API
- Settings panel (mode, deflection model, jitter, audio, CRT filter)

## Notes

- Level layouts are procedural clean-room patterns, not the NES reference maps.
- Two-player turn handoff is stubbed (player count can be selected on the title screen).
- Fully deterministic for the simulation path; render/audio are not part of the deterministic contract.
