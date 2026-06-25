# Physics and Collision Model

*Reference: `prd.md` Sections 10, 30, 33*

## 1. Coordinate System
- Uses deterministic fixed-point or precise integer-based logical coordinates (256x240).
- Collision is calculated based on AABB (Axis-Aligned Bounding Box).

## 2. Collision Detection Resolution Order
As per PRD Section 32, collision is resolved in the following priority during a single tick:
1. Wall/Boundary limits.
2. Vaus (Paddle) collision.
3. Brick collision (Grid-based spatial hashing for efficiency).
4. Enemy collision.

## 3. Paddle Deflection Implementation
Implementation of the continuous model (example snippet):
```typescript
function calculateDeflection(ballX: number, vausX: number, vausWidth: number): number {
    const relativeIntersectX = ballX - vausX;
    let normalizedIntersect = relativeIntersectX / (vausWidth / 2);
    normalizedIntersect = Math.max(-1.0, Math.min(1.0, normalizedIntersect));
    return normalizedIntersect * (75 * Math.PI / 180); // max 75 degrees
}
```
*Avoid duplicating constants here; pull constants directly from GameConfig or PRD Section 33.*
