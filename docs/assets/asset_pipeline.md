# Asset Pipeline

*Reference: `prd.md` Section 4.2 (Repository Separation), 4.3 (Public Release Gate), 17.1 (Audio Rights), 18 (Visual Assets), and 25 (`GameConfig.mode`)*

## 1. Goal
Separate licensed assets from clean-room assets at build time to prevent accidental copyright infringement in public repositories. The pipeline is asset-type-agnostic and also covers audio packs (PRD 17.1), not just visual assets.

## 2. Build Tooling
- We will use environment variables (e.g., `VITE_ASSET_MODE=licensed-fidelity` or `VITE_ASSET_MODE=clean-room`).
- The build script will conditionally copy files for the single active mode from `/game-data-licensed/` or `/game-data-clean-room/` into the final `dist/assets/` directory (only the selected mode is copied — there are no mode-specific subpaths in the output).
- `/game-data-licensed` is excluded from the public repo unless rights are secured (PRD 4.2).

## 3. Asset Classification & Fallback Logic

A per-asset licensed/clean-room manifest, tied to `GameConfig.mode` (PRD 4.3), classifies each asset and selects the source tree for the active build mode.

A CI gate MUST fail any public/clean-room build that references anything under `/game-data-licensed`, per PRD 4.3 (gate implementation `[DEFERRED → M6]`).

The asset loader module should throw a fatal error if `GameConfig.mode` is set to `licensed-fidelity` but the files are missing. Because the build has already selected and copied the single active mode into `dist/assets/`, the loader fetches from one flat location (no mode-specific subpath).

```typescript
export async function loadAsset(assetName: string, mode: 'licensed-fidelity' | 'clean-room') {
    // The build copied the active-mode assets into a single /assets/ location.
    return await fetch(`/assets/${assetName}`);
}
```
