import { Fx, toFx, fxMul, fxDiv, fxAbs, FX_ONE, TWO_FX } from '../core/fxMath';
import { AABB } from '../physics/collision';
import { CONTINUOUS_LUT, DISCRETE_LUT, LAUNCH_RIGHT, LAUNCH_LEFT, rotateVector15 } from '../core/angleLut';
import { SeededRNG } from '../core/rng';

// Ball speed scaling constants (§10.2 / §33.1), in Q16.16 px/tick.
export const SPEED_BASE: Fx = toFx(2);
export const SPEED_SLOW: Fx = toFx(1.5);
export const SPEED_MAX: Fx = toFx(5);
const SPEED_CEILING_STEP: Fx = toFx(0.25);
const SPEED_BRICK_STEP: Fx = toFx(0.05);

/**
 * Deterministic ball speed from accumulated round state (§10.2):
 * base 2.0, +0.25 on the first ceiling hit of the round, +0.05 per full
 * group of 10 accumulated brick hits, capped at 5.0 px/tick.
 */
export function computeScaledSpeed(ceilingHit: boolean, brickHitCount: number): Fx {
    let speed = SPEED_BASE;
    if (ceilingHit) speed += SPEED_CEILING_STEP;
    speed += Math.floor(brickHitCount / 10) * SPEED_BRICK_STEP;
    return Math.min(speed, SPEED_MAX);
}

export class Ball {
    public x: Fx = 0;
    public y: Fx = 0;
    public readonly w: Fx = toFx(5);
    public readonly h: Fx = toFx(4);

    // Direction unit vector (in Q16.16)
    public ux: Fx = 0;
    public uy: Fx = 0;
    
    // Ball speed (in Q16.16 pixels per tick)
    public speed: Fx = toFx(2);
    
    // Current velocity (in Q16.16)
    public vx: Fx = 0;
    public vy: Fx = 0;

    public isHeld: boolean = true;
    public holdOffset: Fx = 0; // horizontal offset from Vaus center
    public lastCaughtTime: number = 0; // timestamp/ticks for auto-release

    // Loop prevention counters
    public wallBounceCount: number = 0;

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.isHeld = true;
        this.speed = toFx(2);
        this.ux = 0;
        this.uy = -FX_ONE; // point up initially
        this.vx = 0;
        this.vy = -this.speed;
        this.wallBounceCount = 0;
        this.holdOffset = 0;
    }

    public updateVelocity(): void {
        // Limit maximum angle to 75 degrees relative to vertical axis (i.e. min 15 degrees from horizontal)
        // This prevents the ball from moving too horizontally and getting stuck.
        // cos(75°) = sin(15°) = 16962 in Q16.16
        // sin(75°) = cos(15°) = 63302 in Q16.16
        const MIN_UY = 16962;
        const MAX_UX = 63302;
        if (fxAbs(this.uy) < MIN_UY) {
            this.uy = this.uy >= 0 ? MIN_UY : -MIN_UY;
            this.ux = this.ux >= 0 ? MAX_UX : -MAX_UX;
        }

        this.vx = fxMul(this.ux, this.speed);
        this.vy = fxMul(this.uy, this.speed);
    }

    /**
     * Set a new speed while preserving direction.
     */
    public setSpeed(newSpeed: Fx): void {
        this.speed = newSpeed;
        this.updateVelocity();
    }

    public getAABB(): AABB {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h
        };
    }

    public placeOnPaddle(vausX: Fx, vausWidth: Fx, vausY: Fx): void {
        // Positioned centered on Vaus center + offset
        const vausCenter = vausX + vausWidth / 2;
        this.x = vausCenter + this.holdOffset - this.w / 2;
        this.y = vausY - this.h;
        this.vx = 0;
        this.vy = 0;
    }

    public launch(vausX: Fx, vausWidth: Fx): void {
        this.isHeld = false;
        this.wallBounceCount = 0;
        this.speed = toFx(2);

        // Center X dividing rule (§10.3, §33.1):
        // right half -> launch left; left half -> launch right.
        // The dividing X is the playfield center, center-inclusive -> launch right,
        // so only a strictly right-of-center Vaus launches left.
        const vausCenter = vausX + vausWidth / 2;
        const playfieldCenter = toFx(96); // 192 / 2

        if (vausCenter > playfieldCenter) {
            // Launch Left
            this.ux = LAUNCH_LEFT.vx;
            this.uy = LAUNCH_LEFT.vy;
        } else {
            // Launch Right
            this.ux = LAUNCH_RIGHT.vx;
            this.uy = LAUNCH_RIGHT.vy;
        }
        
        this.updateVelocity();
    }

    public bounceX(jitterEnabled: boolean, rng?: SeededRNG): void {
        this.ux = -this.ux;
        this.wallBounceCount++;
        
        if (jitterEnabled && this.wallBounceCount > 3 && rng) {
            this.applyJitter(rng);
        } else {
            this.updateVelocity();
        }
    }

    public bounceY(jitterEnabled: boolean, rng?: SeededRNG): void {
        this.uy = -this.uy;
        
        // Jitter on Y reflections as well if wall loop detected
        if (jitterEnabled && this.wallBounceCount > 3 && rng) {
            this.applyJitter(rng);
        } else {
            this.updateVelocity();
        }
    }

    private applyJitter(rng: SeededRNG): void {
        // Micro jitter of ±1 degree
        // cos(1°) = 0.9998... -> 65527 in Q16.16
        // sin(1°) = 0.01745... -> 1143 in Q16.16
        const COS_1 = 65527;
        const SIN_1 = 1143;
        const clockwise = rng.next() > 0.5;

        // Apply rotation
        const uxOld = this.ux;
        const uyOld = this.uy;

        if (clockwise) {
            this.ux = fxMul(uxOld, COS_1) - fxMul(uyOld, SIN_1);
            this.uy = fxMul(uxOld, SIN_1) + fxMul(uyOld, COS_1);
        } else {
            this.ux = fxMul(uxOld, COS_1) + fxMul(uyOld, SIN_1);
            this.uy = -fxMul(uxOld, SIN_1) + fxMul(uyOld, COS_1);
        }

        // Normalize unit vector approximately by dividing by its magnitude if it drifts
        // (but 1 degree rotation won't cause drift since COS_1^2 + SIN_1^2 is close to 1)
        this.updateVelocity();
    }

    public deflectFromPaddle(
        ballX: Fx,
        vausX: Fx,
        vausWidth: Fx,
        deflectionModel: 'continuous' | 'discrete8'
    ): void {
        this.wallBounceCount = 0; // reset loop counter on paddle contact

        // scalingFactor = (Ball_x - Vaus_center_x) / (Vaus_width / 2)
        const vausCenter = vausX + vausWidth / 2;
        const relativeX = (ballX + this.w / 2) - vausCenter;
        
        // Division in Q16.16
        let scalingFactor = fxDiv(relativeX, vausWidth / 2);
        // Clamp to [-1.0, 1.0]
        scalingFactor = Math.max(-FX_ONE, Math.min(FX_ONE, scalingFactor));

        if (deflectionModel === 'discrete8') {
            // Divide Vaus width into 8 bands.
            // scalingFactor ranges from -1.0 to 1.0.
            // Band indices 0 to 7:
            const val = scalingFactor / FX_ONE;
            let zoneIdx = 0;
            if (val < -0.75) zoneIdx = 0;
            else if (val < -0.5) zoneIdx = 1;
            else if (val < -0.25) zoneIdx = 2;
            else if (val < 0) zoneIdx = 3;
            else if (val < 0.25) zoneIdx = 4;
            else if (val < 0.5) zoneIdx = 5;
            else if (val < 0.75) zoneIdx = 6;
            else zoneIdx = 7;

            const unit = DISCRETE_LUT[zoneIdx];
            this.ux = unit.vx;
            this.uy = unit.vy;
        } else {
            // Continuous Model
            // Quantize scalingFactor ∈ [-1, 1] to a fixed 1/256 grid
            // Grid spans -256 to 256
            const quantizedIdx = Math.round((scalingFactor / FX_ONE) * 256) + 256;
            const idx = Math.max(0, Math.min(512, quantizedIdx));
            const unit = CONTINUOUS_LUT[idx];
            this.ux = unit.vx;
            this.uy = unit.vy;
        }

        this.updateVelocity();
    }

    public split(originalBall: Ball, angleDirection: 1 | -1): void {
        this.x = originalBall.x;
        this.y = originalBall.y;
        this.speed = originalBall.speed;
        this.isHeld = false;
        this.wallBounceCount = 0;

        // Split off at +15 or -15 degrees
        const rotated = rotateVector15(originalBall.ux, originalBall.uy, angleDirection === 1);
        this.ux = rotated.vx;
        this.uy = rotated.vy;
        this.updateVelocity();
    }
}
export default Ball;
