/**
 * RoundSim — per-tick integration of a single brick round (PRD §7, §10, §11, §19.5, §32).
 *
 * Owns the Vaus, balls, and brick field for one round and advances the simulation
 * one tick at a time. Capsules/enemies/laser/boss are layered on top in M3/M4.
 *
 * Tick order follows §32 where relevant: scoring (step 2) happens during brick
 * collision, before the end-of-tick ball-out / life-loss check (step 4).
 */
import { fxDiv, fromInt, toIntRound } from '../core/fixedpoint';
import { EventBus, GameEvents } from '../core/eventBus';
import { DeflectionModel, SPEED_BRICK_STEP, SPEED_CEIL_STEP } from '../core/config';
import {
  PLAY_BOTTOM,
  PLAY_LEFT,
  PLAY_RIGHT,
  PLAY_TOP,
} from '../core/constants';
import { BRICK_SCORE } from '../data/schemas';
import { Vaus } from '../entities/vaus';
import { Ball } from '../entities/ball';
import { BrickField, Brick } from '../entities/bricks';
import { overlap, resolveBrickContact, ballRect } from '../physics/collision';
import { paddleDeflection } from './deflection';
import { ScoreTracker } from './scoring';
import { ILevelData } from '../data/schemas';

export interface RoundInput {
  left: boolean;
  right: boolean;
  firePressed: boolean;
  paddleX: number | null; // absolute pointer mode
}

export type RoundEvent =
  | { type: 'ballLost' }
  | { type: 'roundClear' }
  | { type: 'brickDestroyed'; col: number; row: number; brickType: string; scoreDelta: number; carrier: boolean };

export class RoundSim {
  readonly vaus: Vaus;
  readonly balls: Ball[] = [];
  readonly field: BrickField;
  readonly score: ScoreTracker;
  /** Lives owned by the player controller; RoundSim notifies on extra-life. */
  extraLifeCallback: (count: number) => void = () => {};
  /** Notified when a carrier brick is destroyed (capsule spawner, M3). */
  carrierDestroyed: (brick: Brick) => void = () => {};
  events: RoundEvent[] = [];

  private held = true; // ball sits on the Vaus until launched
  private deflectionModel: DeflectionModel;
  private roundNumber: number;

  constructor(
    private bus: EventBus,
    level: ILevelData,
    deflectionModel: DeflectionModel,
    roundNumber: number,
    score: ScoreTracker,
  ) {
    this.field = new BrickField(level);
    this.deflectionModel = deflectionModel;
    this.roundNumber = roundNumber;
    this.score = score;
    this.vaus = new Vaus();
    this.spawnReadyBall();
  }

  private spawnReadyBall(): void {
    const ball = new Ball(fromInt(0), fromInt(0));
    this.balls.length = 0;
    this.balls.push(ball);
    this.held = true;
    this.placeHeldBall(ball);
  }

  private placeHeldBall(ball: Ball): void {
    ball.x = this.vaus.center() - fromInt(ball.w >> 1);
    ball.y = fromInt(this.vaus.y - ball.h);
  }

  /** Reset for a new life (ball back on the Vaus, speed reset). */
  resetForLife(): void {
    this.spawnReadyBall();
  }

  /** Advance one simulation tick. */
  tick(input: RoundInput): void {
    this.events.length = 0;
    this.moveVaus(input);

    if (this.held && input.firePressed) {
      this.launchHeld();
    }

    for (const ball of this.balls) {
      if (!ball.alive) continue;
      if (this.held) {
        this.placeHeldBall(ball);
      } else {
        this.stepBall(ball);
      }
    }

    // §32 step 4: ball-out / life-loss check (after scoring during collision).
    if (this.balls.some((b) => !b.alive)) {
      // Single-ball core: any dead ball → ball lost.
      this.events.push({ type: 'ballLost' });
    }
    if (this.field.clearRemaining === 0 && !this.held) {
      this.events.push({ type: 'roundClear' });
    }
  }

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
    // §10.3: launch direction by Vaus half (left half → right, right half → left).
    const center = this.vaus.center();
    const playCenter = fromInt((PLAY_LEFT + PLAY_RIGHT) / 2);
    const toRight = center <= playCenter;
    ball.launch(toRight);
    this.bus.emit(GameEvents.BALL_LAUNCHED);
  }

  private stepBall(ball: Ball): void {
    // Sub-step so each step moves ≤ ~2 px (brick height is 8 px) to avoid tunnelling.
    const speedPx = Math.max(toIntRound(ball.vx < 0 ? -ball.vx : ball.vx), toIntRound(ball.vy < 0 ? -ball.vy : ball.vy), 1);
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
      this.bus.emit(GameEvents.BALL_LOST, { ballsRemaining: this.balls.length - 1 });
    }
  }

  private collideVaus(ball: Ball): void {
    const v = this.vaus.aabb();
    if (ball.dir.vy <= 0) return; // only when descending
    if (!overlap(ballRect(ball), { x: v.x, y: v.y, w: v.w, h: v.h })) return;
    const hSign = ball.dir.vx < 0 ? -1 : 1;
    // Outgoing velocity = unit × speed; recover the unit direction by dividing by speed.
    const vel = paddleDeflection(
      ball.centerX(),
      this.vaus.center(),
      this.vaus.halfW(),
      ball.speed,
      this.deflectionModel,
      hSign,
    );
    ball.dir = { vx: fxDiv(vel.vx, ball.speed), vy: fxDiv(vel.vy, ball.speed) };
    // Reposition above the Vaus to prevent re-collision.
    ball.y = fromInt(this.vaus.y - ball.h);
  }

  private collideBricks(ball: Ball): void {
    const contact = resolveBrickContact(ball, this.field);
    if (!contact) return;
    const brick = contact.brick;
    const ba = this.field.aabb(brick);
    // Reflect & snap to the resolved face.
    if (contact.normal === 'x') {
      if (ball.dir.vx > 0) ball.x = ba.x - ball.w;
      else ball.x = ba.x + ba.w;
      ball.reflectX();
    } else {
      if (ball.dir.vy > 0) ball.y = ba.y - ball.h;
      else ball.y = ba.y + ba.h;
      ball.reflectY();
    }
    // Apply hit (silver decrements; gold indestructible but still counts as a brick hit
    // for speed scaling per §10.2). Ball speed-up counts colored + gold hits.
    const result = this.field.hit(brick);
    ball.onBrickHit(SPEED_BRICK_STEP);
    this.bus.emit(GameEvents.BRICK_HIT, { row: brick.row, col: brick.col, type: brick.type });
    if (result === 'destroyed') {
      const pts = brick.type === 'SILVER' ? 50 * this.roundNumber : BRICK_SCORE[brick.type];
      this.score.add(pts, 'brick');
      this.bus.emit(GameEvents.BRICK_DESTROYED, {
        row: brick.row,
        col: brick.col,
        type: brick.type,
        scoreDelta: pts,
      });
      this.events.push({
        type: 'brickDestroyed',
        col: brick.col,
        row: brick.row,
        brickType: brick.type,
        scoreDelta: pts,
        carrier: brick.isCapsuleCarrier,
      });
      if (brick.isCapsuleCarrier) this.carrierDestroyed(brick);
    }
  }

  get isHeld(): boolean {
    return this.held;
  }
}
