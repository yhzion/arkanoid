import { overlaps, nearestFace, WALL_THICKNESS, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT } from './aabb';
import { Ball } from '../entities/ball';
import { Vaus } from '../entities/vaus';
import { Brick } from '../entities/brick';

// PRD §10.4: Deflection angles
const MAX_DEFLECTION_ANGLE = (75 * Math.PI) / 180;
const MIN_DEFLECTION_ANGLE = (10 * Math.PI) / 180;

export function reflectBall(ball: Ball, normal: { x: number; y: number }): void {
  const dot = ball.vx * normal.x + ball.vy * normal.y;
  ball.vx -= 2 * dot * normal.x;
  ball.vy -= 2 * dot * normal.y;
}

// PRD §10.4: Paddle deflection model
export function deflectFromPaddle(ball: Ball, vaus: Vaus): void {
  const ballCenter = ball.x + ball.w / 2;
  const vausCenter = vaus.x + vaus.w / 2;
  const halfWidth = vaus.w / 2;

  let scalingFactor = (ballCenter - vausCenter) / halfWidth;
  scalingFactor = Math.max(-1, Math.min(1, scalingFactor));

  let angle = scalingFactor * MAX_DEFLECTION_ANGLE;

  // PRD §10.4.3: Minimum deflection angle
  if (Math.abs(angle) < MIN_DEFLECTION_ANGLE) {
    angle = Math.sign(angle || 1) * MIN_DEFLECTION_ANGLE;
  }

  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
}

export function checkWallCollision(ball: Ball): boolean {
  const playfieldLeft = WALL_THICKNESS;
  const playfieldRight = WALL_THICKNESS + PLAYFIELD_WIDTH;

  // Left wall
  if (ball.x <= playfieldLeft) {
    ball.x = playfieldLeft;
    ball.vx = Math.abs(ball.vx);
    return true;
  }
  // Right wall
  if (ball.x + ball.w >= playfieldRight) {
    ball.x = playfieldRight - ball.w;
    ball.vx = -Math.abs(ball.vx);
    return true;
  }
  // Top wall
  if (ball.y <= WALL_THICKNESS) {
    ball.y = WALL_THICKNESS;
    ball.vy = Math.abs(ball.vy);
    return true;
  }
  return false;
}

export function checkBallLost(ball: Ball): boolean {
  return ball.y + ball.h >= PLAYFIELD_HEIGHT + WALL_THICKNESS;
}

export function checkBallVausCollision(ball: Ball, vaus: Vaus): boolean {
  return overlaps(ball, vaus);
}

// PRD §19.5: Brick overlap resolution priority
export function checkBallBrickCollision(
  ball: Ball,
  bricks: Brick[]
): { brick: Brick; normal: { x: number; y: number } } | null {
  let best: { brick: Brick; normal: { x: number; y: number }; penetration: number } | null = null;

  for (const brick of bricks) {
    if (brick.type === 'EMPTY' || brick.destroyed) continue;
    if (!overlaps(ball, brick)) continue;

    const result = nearestFace(ball, brick);
    if (!best || result.penetration < best.penetration) {
      best = { brick, normal: result.normal, penetration: result.penetration };
    }
  }

  return best ? { brick: best.brick, normal: best.normal } : null;
}