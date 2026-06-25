# Physics and Collision Model

*Reference: `prd.md` Sections 10.4, 19.5, 30.2, 30.3, 32, 33*

## 1. Coordinate System
- Logical space is 256x240. All simulation position and velocity values use signed **16.16 fixed-point** (Q16.16) per PRD §30.2 (D1).
- No IEEE-754 float appears in the simulation path. Multiply uses a 64-bit intermediate then `>>16`; divide uses `(a<<16)/b`.
- Collision is calculated based on AABB (Axis-Aligned Bounding Box).
- Collision tests use simulation (fixed-point) coordinates, never render-rounded ones (§30.2).

## 2. Collision Detection Resolution Order
Per PRD §19.5, resolve **one collision at a time in a deterministic order**. The entity scan order below is a doc-local design decision grounded in §19.5:

1. Wall/Boundary limits.
2. Vaus (Paddle) collision.
3. Brick collision (Grid-based spatial hashing for efficiency).
4. Enemy collision.

**Brick-overlap resolution** (§19.5): if the swept ball intersects multiple bricks on one tick, pick the brick whose face the swept ball center crosses first; break ties by smaller penetration depth, then by lowest cell index. Destroy exactly **one** brick per resolved contact and reflect along that face's normal (for a corner, the normal is the axis of smaller penetration).

> **Note:** The order above governs *collision detection within a tick*. PRD §32 separately defines the **tick event-resolution order** the sim must also respect: 1. capsule collection & power-up apply → 2. score & extra-life awards → 3. warp entry / round advance → 4. ball-out / life-loss check.

## 3. Paddle Deflection Implementation
Float-free, table-driven skeleton per PRD §10.4, §30.2, §30.3. No runtime trigonometry; outgoing angles come from a build-time LUT of Q16.16 unit vectors.

```typescript
type DeflectionModel = 'continuous' | 'discrete8';

// Q16.16 fixed-point alias; helpers fxMul/fxDiv/fxClamp implement §30.2 arithmetic.
type Fx = number;

// Build-time LUT of Q16.16 unit vectors, indexed on the quantized 1/256 grid (§30.3).
// discrete8 maps the 8 zones to the fixed angle classes ±75, ±55, ±35, ±15 (§10.4/§30.3).
declare const UNIT_VECTOR_LUT: ReadonlyArray<{ vx: Fx; vy: Fx }>;

function calculateDeflection(
    ballX: Fx, vausX: Fx, vausWidth: Fx, speed: Fx, model: DeflectionModel,
): { vx: Fx; vy: Fx } {
    // scalingFactor = (ballX - vausCenter) / (vausWidth / 2), in Q16.16, range [-1, 1].
    const relative = ballX - vausX;
    let scalingFactor: Fx = fxDiv(relative, fxDiv(vausWidth, TWO_FX));
    scalingFactor = fxClamp(scalingFactor, NEG_ONE_FX, ONE_FX);

    // Quantize to the fixed 1/256 grid, then index the LUT (table-driven, deterministic).
    const index =
        model === 'discrete8'
            ? zoneIndex(scalingFactor)               // 8 zones -> ±75/±55/±35/±15
            : quantizeToGrid(scalingFactor, GRID_256); // continuous, 1/256 grid

    // ±10° vertical-loop clamp applies to the continuous model only (§10.4); discrete8 zones never breach it.
    const unit = model === 'continuous' ? applyVerticalLoopClamp(UNIT_VECTOR_LUT[index]) : UNIT_VECTOR_LUT[index];

    // Outgoing velocity = unit vector * speed via fixed-point multiply (§30.2).
    return { vx: fxMul(unit.vx, speed), vy: fxMul(unit.vy, speed) };
}
```

*Avoid duplicating constants here; pull constants (max deflection angle §33.1, grid/zone definitions) directly from GameConfig or PRD §33. `deflectionModel` is a GameConfig/replay-header field (§30.7).*
