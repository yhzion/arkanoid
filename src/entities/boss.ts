import { Fx, toFx, fxMul, fxDiv, fxSqrt, FX_ONE } from '../core/fxMath';
import { AABB, isOverlapping } from '../physics/collision';
import { EventBus, GameEvents } from '../core/eventBus';
import { GameState } from '../core/gameState';

export interface IProjectile {
    x: Fx;
    y: Fx;
    vx: Fx;
    vy: Fx;
    w: Fx;
    h: Fx;
}

export class BossDOH {
    public x: Fx = toFx(64); // Centered at top (Logical playfield width is 192)
    public y: Fx = toFx(16);
    public readonly w: Fx = toFx(64);
    public readonly h: Fx = toFx(64);

    public hitsRemaining: number = 16;
    public projectiles: IProjectile[] = [];
    public fireTimer: number = 0;
    
    // Set of ball references/identifiers currently overlapping the boss (for debounce)
    private overlappingBalls: Set<any> = new Set();

    private readonly projectileSpeed: Fx = toFx(2);
    private readonly fireInterval: number = 90; // every 90 ticks
    private readonly maxProjectiles: number = 2;
    private readonly playfieldBottom: Fx = toFx(240);

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.x = toFx(64);
        this.y = toFx(16);
        this.hitsRemaining = 16;
        this.projectiles = [];
        this.fireTimer = 0;
        this.overlappingBalls.clear();
    }

    public getAABB(): AABB {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h
        };
    }

    public update(vausX: Fx, vausWidth: Fx, vausY: Fx): void {
        this.fireTimer++;

        // Firing logic: every 90 ticks, up to 2 projectiles
        if (this.fireTimer >= this.fireInterval) {
            if (this.projectiles.length < this.maxProjectiles) {
                this.fireProjectile(vausX, vausWidth, vausY);
            }
            this.fireTimer = 0;
        }

        // Update projectile positions
        for (const proj of this.projectiles) {
            proj.x += proj.vx;
            proj.y += proj.vy;
        }

        // Filter out projectiles that exit bottom of playfield
        this.projectiles = this.projectiles.filter(proj => proj.y < this.playfieldBottom);
    }

    private fireProjectile(vausX: Fx, vausWidth: Fx, vausY: Fx): void {
        // Mouth center is approximately (x + 32, y + 48)
        const mouthX = this.x + toFx(32);
        const mouthY = this.y + toFx(48);

        // Target is Vaus center
        const targetX = vausX + vausWidth / 2;
        const targetY = vausY;

        const dx = targetX - mouthX;
        const dy = targetY - mouthY;

        // Calculate aimed vector in fixed point using fxSqrt/fxDiv/fxMul
        const dxSq = fxMul(dx, dx);
        const dySq = fxMul(dy, dy);
        const distance = fxSqrt(dxSq + dySq);

        let vx = 0;
        let vy = this.projectileSpeed; // Default straight down

        if (distance > 0) {
            vx = fxDiv(fxMul(dx, this.projectileSpeed), distance);
            vy = fxDiv(fxMul(dy, this.projectileSpeed), distance);
        }

        this.projectiles.push({
            x: mouthX - toFx(2), // Center bullet (w=4)
            y: mouthY,
            vx,
            vy,
            w: toFx(4),
            h: toFx(4)
        });

        EventBus.emit(GameEvents.BOSS_PROJECTILE_FIRED);
    }

    /**
     * Registers a ball collision.
     * Uses the debounce overlappingBalls set to ensure separate >= 1 tick rule.
     */
    public registerBallCollision(ballRef: any): boolean {
        // If ball is already in overlap set, ignore collision
        if (this.overlappingBalls.has(ballRef)) {
            return false;
        }

        // Add to overlapping set
        this.overlappingBalls.add(ballRef);

        this.hitsRemaining = Math.max(0, this.hitsRemaining - 1);
        GameState.addScore(1000);
        EventBus.emit(GameEvents.BOSS_HIT, { damage: 16 - this.hitsRemaining });

        if (this.hitsRemaining === 0) {
            GameState.addScore(50000); // 50,000 pts on defeat
            EventBus.emit(GameEvents.BOSS_DEFEATED);
        }

        return true;
    }

    /**
     * Check which balls are no longer overlapping the boss AABB and remove them from debounce.
     */
    public updateOverlaps(balls: { ref: any; aabb: AABB }[]): void {
        const bossAABB = this.getAABB();
        
        for (const ball of balls) {
            const isOver = isOverlapping(ball.aabb, bossAABB);
            if (isOver) {
                // Keep in set
                this.overlappingBalls.add(ball.ref);
            } else {
                // Remove from set (separated for >= 1 tick)
                this.overlappingBalls.delete(ball.ref);
            }
        }
    }
}
export default BossDOH;
