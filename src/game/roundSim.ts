/**
 * RoundSim — per-tick integration of a brick round (PRD §7, §10–§13, §19.5, §32).
 *
 * Owns Vaus, balls, brick field, capsules, lasers, enemies, power-up state, lives,
 * and the Break warp for one round. Advances one tick at a time. Tick resolution
 * follows §32: (1) capsule collection & power-up apply → (2) score & extra-life →
 * (3) warp entry / round advance → (4) ball-out / life-loss check.
 */
import { fxDiv, fxMul, fromInt, toIntRound } from '../core/fixedpoint';
import { EventBus, GameEvents } from '../core/eventBus';
import { DeflectionModel, SPEED_BRICK_STEP, SPEED_CEIL_STEP, SPEED_SLOW } from '../core/config';
import { PLAY_BOTTOM, PLAY_LEFT, PLAY_RIGHT, PLAY_TOP, CATCH_AUTO_RELEASE_TICKS, BREAK_WARP_SCORE, CAPSULE_COLLECT_SCORE, ENEMY_SCORE } from '../core/constants';
import { BRICK_SCORE, CapsuleType } from '../data/schemas';
import { Vaus } from '../entities/vaus';
import { Ball } from '../entities/ball';
import { BrickField, Brick } from '../entities/bricks';
import { Capsule, selectCapsuleType, spawnCapsule } from '../entities/capsule';
import { LaserPool } from '../entities/laser';
import { Enemy, EnemySpawner } from '../entities/enemy';
import { overlap, resolveBrickContact, ballRect } from '../physics/collision';
import { paddleDeflection } from './deflection';
import { ScoreTracker } from './scoring';
import { PowerUpManager } from './powerups';
import { Mulberry32 } from '../core/rng';
import { ROT15_COS, ROT15_SIN, UnitVec } from '../core/trigTables';
import { ILevelData } from '../data/schemas';

export interface RoundInput {
  left: boolean;
  right: boolean;
  firePressed: boolean;
  paddleX: number | null;
}

export type RoundEvent =
  | { type: 'ballLost'; livesAfter: number }
  | { type: 'roundClear' }
  | { type: 'breakWarp'; roundAfter: number }
  | { type: 'gameOver' }
  | { type: 'brickDestroyed'; col: number; row: number; brickType: string; scoreDelta: number; carrier: boolean };

export interface RoundSimDeps {
  bus: EventBus;
  level: ILevelData;
  deflectionModel: DeflectionModel;
  roundNumber: number;
  score: ScoreTracker;
  capsuleRng: Mulberry32;
  lives: number;
  /** Final brick round for the region (Break exit suppressed there, §8.10). */
  finalBrickRound: number;
}

export class RoundSim {
  readonly vaus: Vaus;
  balls: Ball[] = [];
  readonly field: BrickField;
  readonly score: ScoreTracker;
  readonly powerups = new PowerUpManager();
  readonly lasers = new LaserPool();
  enemies: Enemy[] = [];
  capsules: Capsule[] = [];
  lives: number;
  events: RoundEvent[] = [];

  private capsuleRng: Mulberry32;
  private previousCapsule: CapsuleType | null = null;
  private enemySpawner: EnemySpawner;
  private deflectionModel: DeflectionModel;
  private roundNumber: number;
  private finalBrickRound: number;

  private held = true;
  /** Caught-ball state (Catch power-up, §12.5): index into balls + auto-release timer. */
  private caughtIndex = -1;
  private catchTimer = 0;
  /** Break exit open (§8.10). */
  breakExitOpen = false;
  private bus: EventBus;

  constructor(deps: RoundSimDeps) {
    this.bus = deps.bus;
    this.field = new BrickField(deps.level);
    this.deflectionModel = deps.deflectionModel;
    this.roundNumber = deps.roundNumber;
    this.finalBrickRound = deps.finalBrickRound;
    this.score = deps.score;
    this.capsuleRng = deps.capsuleRng;
    this.lives = deps.lives;
    this.vaus = new Vaus();
    this.enemySpawner = new EnemySpawner(() => this.capsuleRng.next());
    this.score; // score handled externally; alias retained
    this.spawnReadyBall();
  }

  private spawnReadyBall(): void {
    const ball = new Ball(fromInt(0), fromInt(0));
    this.balls.length = 0;
    this.balls.push(ball);
    this.held = true;
    this.caughtIndex = -1;
    this.placeHeldBall(ball);
  }

  private placeHeldBall(ball: Ball): void {
    ball.x = this.vaus.center() - fromInt(ball.w >> 1);
    ball.y = fromInt(this.vaus.y - ball.h);
  }

  /** Reset for a new life: ball on Vaus, speed reset, power-ups cleared (§8.6). */
  resetForLife(): void {
    this.spawnReadyBall();
    this.vaus.setEnlarged(false);
    this.powerups.reset();
    this.capsules.length = 0;
    this.lasers.beams.length = 0;
    this.previousCapsule = null;
  }

  /** Reset transient state at round start (§8.4). */
  resetForRound(): void {
    this.previousCapsule = null;
    this.breakExitOpen = false;
  }

  /** Advance one simulation tick (§32 order). */
  tick(input: RoundInput): void {
    this.events.length = 0;
    this.moveVaus(input);

    // (1) Capsule collection & power-up apply — handled during capsule pass below,
    //     but fire-release / launch happens here.
    if (this.held && input.firePressed) this.launchHeld();
    else if (this.caughtIndex >= 0 && input.firePressed) this.releaseCaught();
    else if (this.powerups.active === 'laser') {
      this.lasers.tryFire(this.vaus.x, this.vaus.width, this.vaus.y, input.firePressed);
    }

    // Lasers advance + collide.
    this.tickLasers();

    // Capsules fall + collect (§32 step 1).
    this.tickCapsules();

    // Enemies spawn + move + collide.
    this.tickEnemies();

    // Catch auto-release timer (§12.5).
    if (this.caughtIndex >= 0) {
      this.catchTimer++;
      if (this.catchTimer >= CATCH_AUTO_RELEASE_TICKS) this.releaseCaught();
    }

    // Balls.
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (!ball.alive) continue;
      if (this.held) {
        this.placeHeldBall(ball);
      } else if (i === this.caughtIndex) {
        this.followCaught(ball);
      } else {
        this.stepBall(ball);
      }
    }

    // (3) Warp entry / round advance.
    if (this.breakExitOpen) this.checkBreakEntry();

    // (4) Ball-out / life-loss check.
    this.cullDeadBalls();
  }

  // --- Vaus / launch / catch ----------------------------------------------

  private moveVaus(input: RoundInput): void {
    if (input.paddleX !== null) {
      this.vaus.moveToCenterX(input.paddleX);
    } else {
      const dir = input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
      if (dir !== 0) this.vaus.moveDigital(dir as -1 | 1);
    }
  }

  private launchHeld(): void {
    const ball = this.balls[0];
    if (!ball) return;
    this.held = false;
    const center = this.vaus.center();
    const playCenter = fromInt((PLAY_LEFT + PLAY_RIGHT) / 2);
    ball.launch(center <= playCenter);
    this.bus.emit(GameEvents.BALL_LAUNCHED);
  }

  private followCaught(ball: Ball): void {
    ball.x = this.vaus.center() - fromInt(ball.w >> 1);
    ball.y = fromInt(this.vaus.y - ball.h);
  }

  private releaseCaught(): void {
    if (this.caughtIndex < 0) return;
    const ball = this.balls[this.caughtIndex];
    this.caughtIndex = -1;
    this.catchTimer = 0;
    if (ball) {
      const hSign = 1; // release straight up by default
      const vel = paddleDeflection(ball.centerX(), this.vaus.center(), this.vaus.halfW(), ball.speed, this.deflectionModel, hSign);
      ball.dir = { vx: fxDiv(vel.vx, ball.speed), vy: fxDiv(vel.vy, ball.speed) };
      ball.y = fromInt(this.vaus.y - ball.h);
      this.bus.emit(GameEvents.BALL_LAUNCHED);
    }
  }

  // --- Ball physics --------------------------------------------------------

  private stepBall(ball: Ball): void {
    const ax = ball.vx < 0 ? -ball.vx : ball.vx;
    const ay = ball.vy < 0 ? -ball.vy : ball.vy;
    const speedPx = Math.max(toIntRound(ax), toIntRound(ay), 1);
    const n = Math.max(1, Math.ceil(speedPx / 2));
    const stepX = ball.vx / n;
    const stepY = ball.vy / n;
    for (let s = 0; s < n; s++) {
      ball.x += stepX;
      ball.y += stepY;
      this.collideWalls(ball);
      if (!ball.alive) return;
      this.collideVaus(ball);
      this.collideBricks(ball);
    }
  }

  private collideWalls(ball: Ball): void {
    if (ball.x < fromInt(PLAY_LEFT)) {
      ball.x = fromInt(PLAY_LEFT);
      if (ball.dir.vx < 0) ball.reflectX();
    } else if (ball.x + ball.w > fromInt(PLAY_RIGHT)) {
      ball.x = fromInt(PLAY_RIGHT - ball.w);
      if (ball.dir.vx > 0) ball.reflectX();
    }
    if (ball.y < fromInt(PLAY_TOP)) {
      ball.y = fromInt(PLAY_TOP);
      if (ball.dir.vy < 0) {
        ball.reflectY();
        ball.onCeilingHit(SPEED_CEIL_STEP);
      }
    }
    if (ball.y + ball.h > fromInt(PLAY_BOTTOM)) {
      ball.alive = false;
    }
  }

  private collideVaus(ball: Ball): void {
    const v = this.vaus.aabb();
    if (ball.dir.vy <= 0) return;
    if (!overlap(ballRect(ball), { x: v.x, y: v.y, w: v.w, h: v.h })) return;

    // Catch: stick the first ball only (§12.5).
    if (this.powerups.active === 'catch' && this.caughtIndex < 0) {
      this.caughtIndex = this.balls.indexOf(ball);
      this.catchTimer = 0;
      ball.dir = { vx: 0, vy: 0 }; // held in place by followCaught
      ball.y = fromInt(this.vaus.y - ball.h);
      return;
    }

    const hSign = ball.dir.vx < 0 ? -1 : 1;
    const vel = paddleDeflection(ball.centerX(), this.vaus.center(), this.vaus.halfW(), ball.speed, this.deflectionModel, hSign);
    ball.dir = { vx: fxDiv(vel.vx, ball.speed), vy: fxDiv(vel.vy, ball.speed) };
    ball.y = fromInt(this.vaus.y - ball.h);
  }

  private collideBricks(ball: Ball): void {
    const contact = resolveBrickContact(ball, this.field);
    if (!contact) return;
    const brick = contact.brick;
    const ba = this.field.aabb(brick);
    if (contact.normal === 'x') {
      if (ball.dir.vx > 0) ball.x = ba.x - ball.w;
      else ball.x = ba.x + ba.w;
      ball.reflectX();
    } else {
      if (ball.dir.vy > 0) ball.y = ba.y - ball.h;
      else ball.y = ba.y + ba.h;
      ball.reflectY();
    }
    const result = this.field.hit(brick);
    ball.onBrickHit(SPEED_BRICK_STEP); // colored + gold both count (§10.2)
    this.bus.emit(GameEvents.BRICK_HIT, { row: brick.row, col: brick.col, type: brick.type });
    if (result === 'destroyed') this.onBrickDestroyed(brick);
  }

  private onBrickDestroyed(brick: Brick): void {
    const pts = brick.type === 'SILVER' ? 50 * this.roundNumber : BRICK_SCORE[brick.type];
    // (2) Score & extra-life award (§32 step 2) — ScoreTracker handles thresholds.
    this.score.add(pts, 'brick');
    this.bus.emit(GameEvents.BRICK_DESTROYED, { row: brick.row, col: brick.col, type: brick.type, scoreDelta: pts });
    this.events.push({ type: 'brickDestroyed', col: brick.col, row: brick.row, brickType: brick.type, scoreDelta: pts, carrier: brick.isCapsuleCarrier });

    // Capsule drop: carrier + exactly one ball active (§30.5). No drop during multi-ball.
    const liveBalls = this.balls.filter((b) => b.alive).length;
    if (brick.isCapsuleCarrier && liveBalls === 1 && this.capsules.length === 0) {
      const type = selectCapsuleType(this.capsuleRng, this.previousCapsule);
      this.previousCapsule = type;
      const ba = this.field.aabb(brick);
      const cap = spawnCapsule(ba.x + fromInt(8), ba.y, type);
      this.capsules.push(cap);
      this.bus.emit(GameEvents.CAPSULE_SPAWNED, { type });
    }
  }

  // --- Capsules ------------------------------------------------------------

  private tickCapsules(): void {
    for (const cap of this.capsules) {
      if (!cap.alive) continue;
      cap.fall();
      if (cap.y + cap.h > fromInt(PLAY_BOTTOM)) {
        cap.alive = false; // despawn, no penalty (§33.3)
        continue;
      }
      const v = this.vaus.aabb();
      if (overlap({ x: cap.x, y: cap.y, w: cap.w, h: cap.h }, { x: v.x, y: v.y, w: v.w, h: v.h })) {
        cap.alive = false;
        this.collectCapsule(cap.type);
      }
    }
    this.capsules = this.capsules.filter((c) => c.alive);
  }

  private collectCapsule(type: CapsuleType): void {
    // (§32 step 1) apply power-up, then (step 2) collect score.
    const fx = this.powerups.apply(type);
    if (fx.extraLife) {
      this.lives++;
      this.bus.emit(GameEvents.EXTRA_LIFE_AWARDED, { lives: this.lives });
    }
    if (fx.shrink) this.vaus.setEnlarged(false);
    if (fx.enlarge) this.vaus.setEnlarged(true);
    if (fx.setSpeedSlow) for (const b of this.balls) if (b.alive) b.speed = SPEED_SLOW;
    if (fx.split) this.splitBalls();
    if (fx.breakOpen && this.roundNumber < this.finalBrickRound) {
      this.breakExitOpen = true;
      this.bus.emit(GameEvents.BREAK_WARP_OPENED);
    }
    this.bus.emit(GameEvents.POWERUP_ACTIVATED, { type });
    this.bus.emit(GameEvents.CAPSULE_COLLECTED, { type });
    // Capsule collect score (§16.1) — step 2.
    this.score.add(CAPSULE_COLLECT_SCORE, 'capsule');
  }

  /** Disruption: split the active ball into 3 (±15°, §12.4). */
  private splitBalls(): void {
    const src = this.balls.find((b) => b.alive && b !== this.balls[this.caughtIndex]);
    if (!src) return;
    const d = src.dir;
    const plus: UnitVec = { vx: fxMul(d.vx, ROT15_COS) - fxMul(d.vy, ROT15_SIN), vy: fxMul(d.vx, ROT15_SIN) + fxMul(d.vy, ROT15_COS) };
    const minus: UnitVec = { vx: fxMul(d.vx, ROT15_COS) + fxMul(d.vy, ROT15_SIN), vy: -fxMul(d.vx, ROT15_SIN) + fxMul(d.vy, ROT15_COS) };
    for (const u of [plus, minus]) {
      const b = new Ball(src.x, src.y);
      b.speed = src.speed;
      b.dir = u;
      b.ceilingHitThisRound = src.ceilingHitThisRound;
      b.brickHitsThisRound = src.brickHitsThisRound;
      this.balls.push(b);
    }
    this.bus.emit(GameEvents.BALL_LAUNCHED);
  }

  // --- Break entry (§8.10) -------------------------------------------------

  private checkBreakEntry(): void {
    // Defense-in-depth: the exit must not function on the final brick round (§8.10/§12.7).
    if (this.roundNumber >= this.finalBrickRound) return;
    const exitX = fromInt(PLAY_RIGHT - 16);
    const vausCenter = this.vaus.center();
    if (vausCenter >= exitX) {
      // Award 10,000, despawn all balls, advance round.
      this.score.add(BREAK_WARP_SCORE, 'break');
      this.bus.emit(GameEvents.BREAK_WARP_ENTERED);
      for (const b of this.balls) b.alive = false;
      this.events.push({ type: 'breakWarp', roundAfter: this.roundNumber + 1 });
    }
  }

  // --- Lasers (§12.6) ------------------------------------------------------

  private tickLasers(): void {
    this.lasers.tick();
    for (const beam of this.lasers.beams) {
      if (!beam.alive) continue;
      // Laser vs bricks: destroy colored, decrement silver (beam consumed), gold blocks.
      for (const brick of this.field.live()) {
        const ba = this.field.aabb(brick);
        if (beam.x >= ba.x && beam.x <= ba.x + ba.w && beam.y >= ba.y && beam.y <= ba.y + ba.h) {
          beam.alive = false;
          if (brick.type === 'GOLD') break; // disintegrates, no destroy
          const r = this.field.hit(brick);
          if (r === 'destroyed') this.onBrickDestroyed(brick);
          break;
        }
      }
      if (!beam.alive) continue;
      // Laser vs enemies.
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const a = e.aabb();
        if (beam.x >= a.x && beam.x <= a.x + a.w && beam.y >= a.y && beam.y <= a.y + a.h) {
          beam.alive = false;
          e.alive = false;
          this.score.add(ENEMY_SCORE, 'enemy');
          this.bus.emit(GameEvents.ENEMY_DESTROYED, { points: ENEMY_SCORE });
          break;
        }
      }
    }
    this.lasers.beams = this.lasers.beams.filter((b) => b.alive);
  }

  // --- Enemies (§13) -------------------------------------------------------

  private tickEnemies(): void {
    if (this.enemies.length < EnemySpawner.capacity()) {
      const e = this.enemySpawner.tick();
      if (e) {
        this.enemies.push(e);
        this.bus.emit(GameEvents.ENEMY_SPAWNED);
      }
    } else {
      this.enemySpawner.tick(); // keep timer warm
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.advance();
      // Enemy vs Vaus: harmless to Vaus, destroys enemy (§13.2).
      const a = e.aabb();
      const v = this.vaus.aabb();
      if (overlap({ x: a.x, y: a.y, w: a.w, h: a.h }, { x: v.x, y: v.y, w: v.w, h: v.h })) {
        e.alive = false;
        this.score.add(ENEMY_SCORE, 'enemy');
        this.bus.emit(GameEvents.ENEMY_DESTROYED, { points: ENEMY_SCORE });
        continue;
      }
      // Enemy vs balls: AABB nearest-face reflect, enemy destroyed, speed unchanged.
      for (const ball of this.balls) {
        if (!ball.alive) continue;
        if (overlap(ballRect(ball), { x: a.x, y: a.y, w: a.w, h: a.h })) {
          const bcx = ball.centerX();
          const ecx = a.x + fromInt(a.w >> 1);
          // nearest face: reflect X if |dx|>|dy| else Y
          const dx = bcx < ecx ? ecx - bcx : bcx - ecx;
          const dy = ball.centerY() < a.y ? a.y - ball.centerY() : ball.centerY() - a.y;
          if (dx > dy) ball.reflectX();
          else ball.reflectY();
          e.alive = false;
          this.score.add(ENEMY_SCORE, 'enemy');
          this.bus.emit(GameEvents.ENEMY_DESTROYED, { points: ENEMY_SCORE });
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  // --- Life loss (§32 step 4) ---------------------------------------------

  private cullDeadBalls(): void {
    const aliveBefore = this.balls.length;
    this.balls = this.balls.filter((b) => b.alive);
    if (this.balls.length === 0 && !this.held) {
      // All balls lost → life lost.
      this.lives--;
      this.bus.emit(GameEvents.BALL_LOST, { ballsRemaining: 0 });
      if (this.lives > 0) {
        this.resetForLife();
        this.events.push({ type: 'ballLost', livesAfter: this.lives });
      } else {
        this.bus.emit(GameEvents.GAME_OVER);
        this.events.push({ type: 'gameOver' });
      }
    } else if (this.balls.length < aliveBefore) {
      // Multi-ball: a ball drained but others remain — no life lost (§12.4).
      this.bus.emit(GameEvents.BALL_LOST, { ballsRemaining: this.balls.length });
    }

    // Round clear check (after scoring during collision).
    if (this.field.clearRemaining === 0 && !this.held) {
      this.events.push({ type: 'roundClear' });
    }
  }

  get isHeld(): boolean {
    return this.held;
  }
}
