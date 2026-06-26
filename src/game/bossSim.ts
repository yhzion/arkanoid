/**
 * DOH boss round — PRD §15, §33.6.
 *
 * No brick-clear objective. The player must hit DOH 16 times with the energy ball.
 * DOH fires up to 2 projectiles (every 90 ticks) aimed at the Vaus; a projectile
 * hit destroys the Vaus (life lost). Ball–DOH uses AABB nearest-face reflection;
 * a ball cannot re-register a hit until it has separated from DOH for ≥1 tick, and
 * simultaneous multi-ball hits each count once (§33.6). No continue after final
 * failure (§15.3) — enforced by the controller.
 */
import { Fx, fxDiv, fxMul, fromInt, toIntRound } from '../core/fixedpoint';
import { EventBus, GameEvents } from '../core/eventBus';
import { DeflectionModel, SPEED_BRICK_STEP } from '../core/config';
import {
  BOSS_DEFEAT_SCORE,
  BOSS_FIRE_INTERVAL,
  BOSS_HIT_SCORE,
  BOSS_HITS_TO_DEFEAT,
  BOSS_MAX_PROJECTILES,
  BOSS_PROJECTILE_SPEED,
  PLAY_BOTTOM,
  PLAY_LEFT,
  PLAY_RIGHT,
  PLAY_TOP,
} from '../core/constants';
import { Vaus } from '../entities/vaus';
import { Ball } from '../entities/ball';
import { overlap, ballRect } from '../physics/collision';
import { paddleDeflection } from './deflection';
import { ScoreTracker } from './scoring';

export class Projectile {
  x: Fx;
  y: Fx;
  vx: Fx;
  vy: Fx;
  alive = true;
  constructor(x: Fx, y: Fx, vx: Fx, vy: Fx) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }
}

export interface BossAABB {
  x: Fx;
  y: Fx;
  w: Fx;
  h: Fx;
}

export type BossEvent =
  | { type: 'bossDefeated' }
  | { type: 'lifeLost'; livesAfter: number }
  | { type: 'gameOver' };

export class BossSim {
  readonly vaus: Vaus;
  balls: Ball[] = [];
  projectiles: Projectile[] = [];
  damage = 0;
  defeated = false;
  lives: number;
  events: BossEvent[] = [];

  private boss: BossAABB;
  private fireTimer = 0;
  private deflectionModel: DeflectionModel;
  private score: ScoreTracker;
  private bus: EventBus;
  private held = true;
  /** Per-ball: has separated from DOH since last registered hit (§33.6 debounce). */
  private separatedFromBoss = new WeakMap<Ball, boolean>();

  constructor(deps: {
    bus: EventBus;
    deflectionModel: DeflectionModel;
    score: ScoreTracker;
    lives: number;
  }) {
    this.bus = deps.bus;
    this.deflectionModel = deps.deflectionModel;
    this.score = deps.score;
    this.lives = deps.lives;
    this.vaus = new Vaus();
    // DOH occupies the upper-center of the playfield.
    this.boss = { x: fromInt(60), y: fromInt(24), w: fromInt(64), h: fromInt(48) };
    this.spawnBall();
  }

  private spawnBall(): void {
    const ball = new Ball(fromInt(0), fromInt(0));
    this.balls.length = 0;
    this.balls.push(ball);
    this.held = true;
    this.placeHeld(ball);
  }

  private placeHeld(ball: Ball): void {
    ball.x = this.vaus.center() - fromInt(ball.w >> 1);
    ball.y = fromInt(this.vaus.y - ball.h);
  }

  resetForLife(): void {
    this.spawnBall();
  }

  get bossAABB(): BossAABB {
    return this.boss;
  }

  tick(input: { left: boolean; right: boolean; firePressed: boolean; paddleX: number | null }): void {
    this.events.length = 0;
    // Vaus move.
    if (input.paddleX !== null) this.vaus.moveToCenterX(input.paddleX);
    else {
      const dir = input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
      if (dir !== 0) this.vaus.moveDigital(dir as -1 | 1);
    }
    if (this.held && input.firePressed) {
      this.held = false;
      const ball = this.balls[0];
      ball.launch(this.vaus.center() <= fromInt((PLAY_LEFT + PLAY_RIGHT) / 2));
      this.bus.emit(GameEvents.BALL_LAUNCHED);
    }

    if (!this.defeated) this.tickBossFire();

    // Projectiles advance + collide with Vaus.
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > fromInt(PLAY_BOTTOM)) p.alive = false;
      const v = this.vaus.aabb();
      if (overlap({ x: p.x, y: p.y, w: fromInt(4), h: fromInt(4) }, { x: v.x, y: v.y, w: v.w, h: v.h })) {
        p.alive = false;
        this.onVausDestroyed();
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);

    // Ball physics (walls + Vaus + DOH).
    for (const ball of this.balls) {
      if (!ball.alive) continue;
      if (this.held) {
        this.placeHeld(ball);
        continue;
      }
      this.stepBall(ball);
    }
    this.cullBalls();
  }

  private tickBossFire(): void {
    this.fireTimer++;
    if (this.fireTimer < BOSS_FIRE_INTERVAL) return;
    if (this.projectiles.length >= BOSS_MAX_PROJECTILES) return;
    this.fireTimer = 0;
    // Aim at Vaus X at fire time (§33.6). Direction normalized via Manhattan length
    // (trig-free, deterministic); velocity = unit × speed.
    const sx = this.boss.x + fromInt(32);
    const sy = this.boss.y + fromInt(40);
    const dx = this.vaus.center() - sx;
    const dy = fromInt(this.vaus.y) - sy;
    const len = Math.max(fromInt(1), (dx < 0 ? -dx : dx) + (dy < 0 ? -dy : dy));
    const ux = fxDiv(dx, len);
    const uy = fxDiv(dy, len);
    this.projectiles.push(new Projectile(sx, sy, fxMul(ux, BOSS_PROJECTILE_SPEED), fxMul(uy, BOSS_PROJECTILE_SPEED)));
    this.bus.emit(GameEvents.BOSS_PROJECTILE_FIRED);
  }

  private stepBall(ball: Ball): void {
    const ax = ball.vx < 0 ? -ball.vx : ball.vx;
    const ay = ball.vy < 0 ? -ball.vy : ball.vy;
    const n = Math.max(1, Math.ceil(Math.max(toIntRound(ax), toIntRound(ay)) / 2));
    for (let s = 0; s < n; s++) {
      ball.x += ball.vx / n;
      ball.y += ball.vy / n;
      // Walls.
      if (ball.x < fromInt(PLAY_LEFT)) {
        ball.x = fromInt(PLAY_LEFT);
        if (ball.dir.vx < 0) ball.reflectX();
      } else if (ball.x + ball.w > fromInt(PLAY_RIGHT)) {
        ball.x = fromInt(PLAY_RIGHT - ball.w);
        if (ball.dir.vx > 0) ball.reflectX();
      }
      if (ball.y < fromInt(PLAY_TOP)) {
        ball.y = fromInt(PLAY_TOP);
        if (ball.dir.vy < 0) ball.reflectY();
      }
      if (ball.y + ball.h > fromInt(PLAY_BOTTOM)) {
        ball.alive = false;
        return;
      }
      this.collideVaus(ball);
      this.collideBoss(ball);
    }
  }

  private collideVaus(ball: Ball): void {
    if (ball.dir.vy <= 0) return;
    const v = this.vaus.aabb();
    if (!overlap(ballRect(ball), { x: v.x, y: v.y, w: v.w, h: v.h })) return;
    const hSign = ball.dir.vx < 0 ? -1 : 1;
    const vel = paddleDeflection(ball.centerX(), this.vaus.center(), this.vaus.halfW(), ball.speed, this.deflectionModel, hSign);
    ball.dir = { vx: fxDiv(vel.vx, ball.speed), vy: fxDiv(vel.vy, ball.speed) };
    ball.y = fromInt(this.vaus.y - ball.h);
  }

  private collideBoss(ball: Ball): void {
    const b = this.boss;
    if (!overlap(ballRect(ball), { x: b.x, y: b.y, w: b.w, h: b.h })) {
      this.separatedFromBoss.set(ball, true);
      return;
    }
    // Reflect along nearest face.
    const bcx = ball.centerX();
    const bcy = ball.centerY();
    const cx = b.x + (b.w >> 1);
    const cy = b.y + (b.h >> 1);
    const dx = bcx < cx ? cx - bcx : bcx - cx;
    const dy = bcy < cy ? cy - bcy : bcy - cy;
    if (dx > dy) ball.reflectX();
    else ball.reflectY();

    // Register a hit only if the ball had separated since the last hit (§33.6).
    if (this.separatedFromBoss.get(ball) !== false && !this.defeated) {
      this.separatedFromBoss.set(ball, false);
      this.damage++;
      this.score.add(BOSS_HIT_SCORE, 'bossHit');
      this.bus.emit(GameEvents.BOSS_HIT, { damage: this.damage });
      ball.onBrickHit(SPEED_BRICK_STEP); // boss hits also accumulate speed scaling
      if (this.damage >= BOSS_HITS_TO_DEFEAT) {
        this.defeated = true;
        this.score.add(BOSS_DEFEAT_SCORE, 'bossDefeat');
        this.bus.emit(GameEvents.BOSS_DEFEATED);
        this.events.push({ type: 'bossDefeated' });
      }
    }
  }

  private onVausDestroyed(): void {
    this.lives--;
    if (this.lives > 0) {
      this.resetForLife();
      this.events.push({ type: 'lifeLost', livesAfter: this.lives });
    } else {
      this.bus.emit(GameEvents.GAME_OVER);
      this.events.push({ type: 'gameOver' });
    }
  }

  private cullBalls(): void {
    this.balls = this.balls.filter((b) => b.alive);
    if (this.balls.length === 0 && !this.held && !this.defeated) {
      // Ball drained on boss round → life lost.
      this.onVausDestroyed();
    }
  }

  get isHeld(): boolean {
    return this.held;
  }
}

/** Integer length approximation for projectile aim normalization (trig-free). */
export {}
