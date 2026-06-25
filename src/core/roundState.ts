import { ILevelData, CapsuleType } from '../data/levelSchema';
import { Fx, toFx, fxMul, fxAbs, FX_ONE, TWO_FX } from './fxMath';
import { AABB, sweptAABB, isOverlapping } from '../physics/collision';
import { Vaus } from '../entities/vaus';
import { Ball } from '../entities/ball';
import { BrickGrid } from '../entities/bricks';
import { CapsuleManager } from '../entities/capsules';
import { EnemyManager } from '../entities/enemies';
import { BossDOH } from '../entities/boss';
import { SeededRNG, hashSeed } from './rng';
import { EventBus, GameEvents } from './eventBus';
import { GameState } from './gameState';

export class RoundStateTracker {
    public levelData: ILevelData | null = null;
    public vaus: Vaus = new Vaus();
    public balls: Ball[] = [];
    public bricks: BrickGrid = new BrickGrid();
    public capsules: CapsuleManager = new CapsuleManager();
    public enemies: EnemyManager = new EnemyManager();
    public boss: BossDOH = new BossDOH();
    public rng: SeededRNG = new SeededRNG(42);

    // Laser bullet beams
    public lasers: { x: Fx; y: Fx; w: Fx; h: Fx }[] = [];
    public laserCooldown: number = 0;

    // Simulation status
    public currentTick: number = 0;
    public brickHitsInRound: number = 0;
    public hasCeilingBeenHit: boolean = false;
    public isBreakWarpOpen: boolean = false;

    // Warp exit coordinates (lower-right side of the playfield)
    // Usable bounds: X=8 to 184. Warp exit will be on the right wall
    public readonly warpExitAABB: AABB = {
        x: toFx(180), // intersecting the right boundary
        y: toFx(200),
        w: toFx(12),
        h: toFx(24)
    };

    constructor() {}

    public loadRound(level: ILevelData, seed: string): void {
        this.levelData = level;
        this.currentTick = 0;
        this.brickHitsInRound = 0;
        this.hasCeilingBeenHit = false;
        this.isBreakWarpOpen = false;
        this.lasers = [];
        this.laserCooldown = 0;

        // Initialize RNG for this round (XORed with round number for variance)
        const baseSeedNum = hashSeed(seed);
        this.rng = new SeededRNG(baseSeedNum ^ level.roundNumber);

        // Reset entities
        this.vaus.reset();
        this.bricks.loadLevel(level);
        this.capsules.reset();
        this.enemies.reset();
        this.boss.reset();

        // Spawn starting ball
        const startBall = new Ball();
        startBall.isHeld = true;
        startBall.holdOffset = 0;
        startBall.placeOnPaddle(this.vaus.x, this.vaus.width, this.vaus.y);
        this.balls = [startBall];
    }

    /**
     * Resets the round state when a life is lost.
     */
    public restartAfterDeath(): void {
        this.isBreakWarpOpen = false;
        this.lasers = [];
        this.laserCooldown = 0;
        this.vaus.reset();
        this.capsules.reset();
        this.enemies.reset();
        
        // Spawn starting ball
        const startBall = new Ball();
        startBall.isHeld = true;
        startBall.holdOffset = 0;
        startBall.placeOnPaddle(this.vaus.x, this.vaus.width, this.vaus.y);
        this.balls = [startBall];
    }

    public update(input: { left: boolean; right: boolean; fire: boolean; pointerXDelta: number; pointerXAbsolute: number }, inputMode: string): void {
        this.currentTick++;

        // Laser cooldown
        if (this.laserCooldown > 0) {
            this.laserCooldown--;
        }

        // --- TICK ORDER S16 (§32) ---
        // 1. Capsule collection & power-up apply
        this.resolveCapsuleCollection();

        // 2. Score & extra-life awards (handled in gameState.ts dynamically on score increase)

        // 3. Warp entry / round advance
        if (this.isBreakWarpOpen) {
            const vausAABB = this.vaus.getAABB();
            if (isOverlapping(vausAABB, this.warpExitAABB)) {
                // Enter Break Warp!
                EventBus.emit(GameEvents.BREAK_WARP_ENTERED);
                return;
            }
        }

        // 4. Ball-out / life-loss check
        if (this.balls.length === 0) {
            // Trigger life loss
            EventBus.emit(GameEvents.BALL_LOST, { ballsRemaining: 0 });
            return;
        }

        // --- UPDATE SIMULATION ENTITIES ---

        // A. Vaus update
        this.vaus.update(
            inputMode,
            input.left,
            input.right,
            input.pointerXDelta,
            input.pointerXAbsolute
        );

        // B. Held balls update position along with Vaus
        for (const ball of this.balls) {
            if (ball.isHeld) {
                ball.placeOnPaddle(this.vaus.x, this.vaus.width, this.vaus.y);

                // Check for manual fire / launch
                if (input.fire) {
                    ball.launch(this.vaus.x, this.vaus.width);
                } else if (this.vaus.catchActive && this.currentTick - ball.lastCaughtTime >= 360) {
                    // Auto release after 360 ticks
                    ball.launch(this.vaus.x, this.vaus.width);
                }
            }
        }

        // C. Lasers firing and movement
        if (this.vaus.laserActive && input.fire && this.laserCooldown === 0 && this.lasers.length < 4) {
            const beamW = toFx(2);
            const beamH = toFx(6);
            // Spawn twin lasers
            this.lasers.push({
                x: this.vaus.x,
                y: this.vaus.y - beamH,
                w: beamW,
                h: beamH
            });
            this.lasers.push({
                x: this.vaus.x + this.vaus.width - beamW,
                y: this.vaus.y - beamH,
                w: beamW,
                h: beamH
            });
            this.laserCooldown = 15;
            EventBus.emit(GameEvents.LASER_FIRED);
        }

        // Move lasers
        const laserSpeed = toFx(4);
        for (const laser of this.lasers) {
            laser.y -= laserSpeed;
        }

        // D. Boss update
        if (this.levelData && this.levelData.type === 'boss') {
            this.boss.update(this.vaus.x, this.vaus.width, this.vaus.y);
            
            // Check projectile collisions with Vaus
            const vausAABB = this.vaus.getAABB();
            for (const proj of this.boss.projectiles) {
                const projAABB = { x: proj.x, y: proj.y, w: proj.w, h: proj.h };
                if (isOverlapping(projAABB, vausAABB)) {
                    // Destroy Vaus!
                    this.balls = []; // Force death
                    return;
                }
            }
        }

        // E. Enemies update
        this.enemies.update(this.rng);
        
        // Harmless enemy-Vaus collision
        const vausAABB = this.vaus.getAABB();
        for (const enemy of [...this.enemies.activeEnemies]) {
            if (isOverlapping(this.enemies.getAABB(enemy), vausAABB)) {
                this.enemies.destroyEnemy(enemy);
            }
        }

        // F. Moving balls & physics collisions
        this.resolveBallPhysics();

        // G. Laser-brick and laser-enemy collisions
        this.resolveLaserCollisions();

        // H. Update capsules falling
        this.capsules.update();
    }

    private resolveCapsuleCollection(): void {
        const vausAABB = this.vaus.getAABB();
        const capsToCollect = this.capsules.activeCapsules.filter(cap =>
            isOverlapping(this.capsules.getAABB(cap), vausAABB)
        );

        for (const cap of capsToCollect) {
            this.capsules.remove(cap);
            GameState.addScore(100);
            EventBus.emit(GameEvents.CAPSULE_COLLECTED, { type: cap.type });
            this.applyPowerUp(cap.type);
        }
    }

    private applyPowerUp(type: CapsuleType): void {
        if (type === 'P') {
            GameState.gainLife();
            return;
        }

        // Cancel previous power-ups
        this.vaus.laserActive = false;
        this.vaus.catchActive = false;
        this.vaus.shrink();
        this.isBreakWarpOpen = false;

        // Apply new power-up
        switch (type) {
            case 'S':
                // Slow: set speed of all balls to 1.5 px/tick
                for (const ball of this.balls) {
                    ball.setSpeed(toFx(1.5));
                }
                break;
            case 'C':
                this.vaus.catchActive = true;
                break;
            case 'L':
                this.vaus.laserActive = true;
                break;
            case 'E':
                this.vaus.enlarge();
                break;
            case 'B':
                // Break Exit does not open on final Round 35 or boss Round 36
                if (GameState.currentRoundNum < 35) {
                    this.isBreakWarpOpen = true;
                    EventBus.emit(GameEvents.BREAK_WARP_OPENED);
                }
                break;
            case 'D':
                // Disruption split
                if (this.balls.length === 1) {
                    const b1 = this.balls[0];
                    const b2 = new Ball();
                    const b3 = new Ball();
                    b2.split(b1, 1);
                    b3.split(b1, -1);
                    this.balls.push(b2, b3);
                    EventBus.emit(GameEvents.POWERUP_ACTIVATED, { type: 'D' });
                }
                break;
        }
    }

    private resolveBallPhysics(): void {
        const jitterEnabled = this.vaus.laserActive === false && GameState.config.jitterEnabled;

        for (const ball of [...this.balls]) {
            if (ball.isHeld) continue;

            // Move ball
            ball.x += ball.vx;
            ball.y += ball.vy;

            // 1. Boundary / Wall collisions
            // Left Wall boundary (X = 8)
            if (ball.x <= toFx(8)) {
                ball.x = toFx(8);
                ball.bounceX(jitterEnabled, this.rng);
                EventBus.emit(GameEvents.BRICK_HIT, { col: -1, row: -1, type: 'WALL' });
            }
            // Right Wall boundary (X = 184 - w = 179)
            else if (ball.x + ball.w >= toFx(184)) {
                ball.x = toFx(184) - ball.w;
                ball.bounceX(jitterEnabled, this.rng);
                EventBus.emit(GameEvents.BRICK_HIT, { col: -1, row: -1, type: 'WALL' });
            }

            // Top Wall boundary (Y = 8)
            if (ball.y <= toFx(8)) {
                ball.y = toFx(8);
                ball.bounceY(jitterEnabled, this.rng);
                EventBus.emit(GameEvents.BRICK_HIT, { col: -1, row: -1, type: 'WALL' });

                if (!this.hasCeilingBeenHit) {
                    this.hasCeilingBeenHit = true;
                    // Speed step ceiling hit: +0.25 px/tick
                    ball.setSpeed(ball.speed + toFx(0.25));
                }
            }

            // Bottom Boundary: Lost check
            if (ball.y + ball.h >= toFx(240)) {
                const idx = this.balls.indexOf(ball);
                if (idx !== -1) {
                    this.balls.splice(idx, 1);
                }
                continue;
            }

            // 2. Vaus collision
            const vausAABB = this.vaus.getAABB();
            const ballAABB = ball.getAABB();
            
            if (isOverlapping(ballAABB, vausAABB)) {
                if (this.vaus.catchActive) {
                    // Stick ball to Vaus
                    ball.isHeld = true;
                    ball.holdOffset = (ball.x + ball.w / 2) - (this.vaus.x + this.vaus.width / 2);
                    ball.lastCaughtTime = this.currentTick;
                    ball.vx = 0;
                    ball.vy = 0;
                    EventBus.emit(GameEvents.BRICK_HIT, { col: -1, row: -1, type: 'CATCH' });
                } else {
                    // Standard paddle deflection
                    ball.y = this.vaus.y - ball.h; // snap on top of Vaus
                    ball.deflectFromPaddle(ball.x, this.vaus.x, this.vaus.width, GameState.config.deflectionModel);
                    EventBus.emit(GameEvents.BRICK_HIT, { col: -1, row: -1, type: 'VAUS' });
                }
                continue;
            }

            // 3. Enemy collisions
            let enemyCollided = false;
            for (const enemy of [...this.enemies.activeEnemies]) {
                const enemyAABB = this.enemies.getAABB(enemy);
                if (isOverlapping(ballAABB, enemyAABB)) {
                    // Reflect ball along nearest face
                    const colResult = sweptAABB(ballAABB, ball.vx, ball.vy, enemyAABB);
                    if (colResult) {
                        if (colResult.nx !== 0) ball.bounceX(jitterEnabled, this.rng);
                        if (colResult.ny !== 0) ball.bounceY(jitterEnabled, this.rng);
                    } else {
                        ball.bounceY(jitterEnabled, this.rng);
                    }
                    this.enemies.destroyEnemy(enemy);
                    enemyCollided = true;
                    break;
                }
            }
            if (enemyCollided) continue;

            // 4. Boss collision
            if (this.levelData && this.levelData.type === 'boss') {
                const bossAABB = this.boss.getAABB();
                if (isOverlapping(ballAABB, bossAABB)) {
                    const colResult = sweptAABB(ballAABB, ball.vx, ball.vy, bossAABB);
                    if (colResult) {
                        if (colResult.nx !== 0) ball.bounceX(jitterEnabled, this.rng);
                        if (colResult.ny !== 0) ball.bounceY(jitterEnabled, this.rng);
                    } else {
                        ball.bounceY(jitterEnabled, this.rng);
                    }
                    this.boss.registerBallCollision(ball);
                    continue;
                }
            }

            // 5. Brick Grid swept collisions
            let brickCollided = false;
            const candidates: { col: number; row: number; t: number; nx: number; ny: number }[] = [];

            // Check non-empty cells
            for (let r = 0; r < this.bricks.rows; r++) {
                for (let c = 0; c < this.bricks.columns; c++) {
                    const cell = this.bricks.getCell(c, r);
                    if (!cell || cell.type === 'EMPTY') continue;

                    const brickAABB = this.bricks.getBrickAABB(c, r);
                    const colResult = sweptAABB(ballAABB, ball.vx, ball.vy, brickAABB);

                    if (colResult) {
                        candidates.push({
                            col: c,
                            row: r,
                            t: colResult.t,
                            nx: colResult.nx,
                            ny: colResult.ny
                        });
                    }
                }
            }

            if (candidates.length > 0) {
                // Sorting per PRD §19.5:
                // 1. entry time t (ascending)
                // 2. penetration depth (represented by smaller t entry, or we can treat as same if t is close)
                // 3. lowest cell index (row * 11 + col)
                candidates.sort((a, b) => {
                    if (Math.abs(a.t - b.t) > 1e-4) {
                        return a.t - b.t;
                    }
                    const idxA = a.row * this.bricks.columns + a.col;
                    const idxB = b.row * this.bricks.columns + b.col;
                    return idxA - idxB;
                });

                // Pick first candidate
                const hit = candidates[0];
                const brickAABB = this.bricks.getBrickAABB(hit.col, hit.row);
                
                // Reflect velocity
                if (hit.nx !== 0) ball.bounceX(jitterEnabled, this.rng);
                if (hit.ny !== 0) ball.bounceY(jitterEnabled, this.rng);

                // Perform hit logic
                const cell = this.bricks.getCell(hit.col, hit.row);
                const isCarrier = cell?.isCapsuleCarrier;
                const { destroyed } = this.bricks.hitBrick(hit.col, hit.row, 1);
                
                // Spawn capsule if only 1 ball is active
                if (destroyed && isCarrier && this.balls.length === 1) {
                    this.capsules.spawn(brickAABB.x, brickAABB.w, brickAABB.y, brickAABB.h, this.rng);
                }

                this.brickHitsInRound++;
                if (this.brickHitsInRound % 10 === 0) {
                    // Speed increase step: +0.05 px/tick, capped at 5.0
                    ball.setSpeed(Math.min(toFx(5.0), ball.speed + toFx(0.05)));
                }

                brickCollided = true;
            }

            if (brickCollided) continue;
        }

        // Update Boss debounce overlapping sets
        if (this.levelData && this.levelData.type === 'boss') {
            this.boss.updateOverlaps(this.balls.map(b => ({ ref: b, aabb: b.getAABB() })));
        }
    }

    private resolveLaserCollisions(): void {
        const lasersToKeep: typeof this.lasers = [];

        for (const laser of this.lasers) {
            // Check off screen
            if (laser.y < toFx(8)) {
                continue; // despawn
            }

            let laserConsumed = false;

            // Check collision with bricks
            for (let r = 0; r < this.bricks.rows; r++) {
                if (laserConsumed) break;
                for (let c = 0; c < this.bricks.columns; c++) {
                    const cell = this.bricks.getCell(c, r);
                    if (!cell || cell.type === 'EMPTY') continue;

                    const brickAABB = this.bricks.getBrickAABB(c, r);
                    if (isOverlapping(laser, brickAABB)) {
                        // Laser consumes
                        laserConsumed = true;
                        
                        const isCarrier = cell.isCapsuleCarrier;
                        const { destroyed } = this.bricks.hitBrick(c, r, 1);
                        
                        if (destroyed && isCarrier && this.balls.length === 1) {
                            this.capsules.spawn(brickAABB.x, brickAABB.w, brickAABB.y, brickAABB.h, this.rng);
                        }
                        break;
                    }
                }
            }

            // Check collision with enemies
            if (!laserConsumed) {
                for (const enemy of [...this.enemies.activeEnemies]) {
                    const enemyAABB = this.enemies.getAABB(enemy);
                    if (isOverlapping(laser, enemyAABB)) {
                        laserConsumed = true;
                        this.enemies.destroyEnemy(enemy);
                        break;
                    }
                }
            }

            if (!laserConsumed) {
                lasersToKeep.push(laser);
            }
        }

        this.lasers = lasersToKeep;
    }
}
export default RoundStateTracker;
