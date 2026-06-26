import { Fx, toFx, fxMul } from './fxMath';

// Precomputed Unit Vector LUT for continuous deflection model.
// scalingFactor goes from -1.0 to +1.0. We quantize it to a 1/256 grid.
// There are 513 grid points: index 0 is -1.0, 256 is 0.0, 512 is 1.0.
export const CONTINUOUS_LUT: Array<{ vx: Fx; vy: Fx }> = [];

const MAX_DEFLECTION_RAD = (75 * Math.PI) / 180;
const LOOP_LIMIT_RAD = (10 * Math.PI) / 180;

// Initialize continuous deflection table
for (let i = 0; i <= 512; i++) {
    const scalingFactor = (i - 256) / 256;
    let angle = scalingFactor * MAX_DEFLECTION_RAD;

    // Apply minimum deflection angle of 10° relative to vertical axis to prevent loops
    if (Math.abs(angle) < LOOP_LIMIT_RAD) {
        angle = angle >= 0 ? LOOP_LIMIT_RAD : -LOOP_LIMIT_RAD;
    }

    // vx = sin(angle), vy = -cos(angle) (moving upwards, so vy is negative)
    CONTINUOUS_LUT.push({
        vx: toFx(Math.sin(angle)),
        vy: toFx(-Math.cos(angle))
    });
}

// 8 Discrete zones corresponding to ±75°, ±55°, ±35°, ±15°
const DISCRETE_ANGLES = [
    -75 * Math.PI / 180, // Zone 1
    -55 * Math.PI / 180, // Zone 2
    -35 * Math.PI / 180, // Zone 3
    -15 * Math.PI / 180, // Zone 4
    15 * Math.PI / 180,  // Zone 5
    35 * Math.PI / 180,  // Zone 6
    55 * Math.PI / 180,  // Zone 7
    75 * Math.PI / 180   // Zone 8
];

export const DISCRETE_LUT = DISCRETE_ANGLES.map(angle => ({
    vx: toFx(Math.sin(angle)),
    vy: toFx(-Math.cos(angle))
}));

// Fixed launch unit vectors for 60° and 120° relative to horizontal
// 60°: vx > 0 (launches right), 120°: vx < 0 (launches left)
export const LAUNCH_RIGHT = {
    vx: toFx(Math.cos(60 * Math.PI / 180)),
    vy: toFx(-Math.sin(60 * Math.PI / 180))
};

export const LAUNCH_LEFT = {
    vx: toFx(Math.cos(120 * Math.PI / 180)),
    vy: toFx(-Math.sin(120 * Math.PI / 180))
};

// Rotations constants for ±15° (used in Disruption split)
// cos(15°) = 0.965925826... -> 63302 in Q16.16
// sin(15°) = 0.258819045... -> 16962 in Q16.16
const COS_15: Fx = 63302;
const SIN_15: Fx = 16962;

export function rotateVector15(vx: Fx, vy: Fx, clockwise: boolean): { vx: Fx; vy: Fx } {
    if (clockwise) {
        // Rotate by +15°
        return {
            vx: fxMul(vx, COS_15) - fxMul(vy, SIN_15),
            vy: fxMul(vx, SIN_15) + fxMul(vy, COS_15)
        };
    } else {
        // Rotate by -15°
        return {
            vx: fxMul(vx, COS_15) + fxMul(vy, SIN_15),
            vy: -fxMul(vx, SIN_15) + fxMul(vy, COS_15)
        };
    }
}
