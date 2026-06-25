# Asset Pipeline

*Reference: `prd.md` Section 4 (Legal/Rights) and 18 (Visual Assets)*

## 1. Goal
Separate licensed assets from clean-room assets at build time to prevent accidental copyright infringement in public repositories.

## 2. Build Tooling
- We will use environment variables (e.g., `VITE_ASSET_MODE=licensed` or `VITE_ASSET_MODE=clean-room`).
- The build script will conditionally copy files from `/game-data-licensed/` or `/game-data-clean-room/` to the final `dist/assets/` directory.

## 3. Fallback Logic
The asset loader module should throw a fatal error if `GameConfig.mode` is set to `licensed` but the files are missing.

```typescript
export async function loadAsset(assetName: string, mode: 'licensed' | 'clean-room') {
    const basePath = mode === 'licensed' ? '/assets/licensed/' : '/assets/clean-room/';
    return await fetch(`${basePath}${assetName}`);
}
```
