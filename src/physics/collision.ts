import { BallState } from '../entities/ball';
import { VausState } from '../entities/vaus';
import { EnemyState } from '../entities/enemies';
import { BossState } from '../entities/boss';
import { IBrickCell } from '../data/levelSchema';

const BW = 16;
const BH = 8;
const GRID_ORIGIN_X = 16;
const GRID_ORIGIN_Y = 16;
const PF_LEFT = 8;
const PF_RIGHT = 192;
const PF_TOP = 8;

export function wallCollision(ball: BallState): void {
  if (ball.x <= PF_LEFT) {
    ball.x = PF_LEFT;
    ball.vx = Math.abs(ball.vx);
    ball.wallBounceCount++;
  } else if (ball.x + ball.width >= PF_RIGHT) {
    ball.x = PF_RIGHT - ball.width;
    ball.vx = -Math.abs(ball.vx);
    ball.wallBounceCount++;
  }
  if (ball.y <= PF_TOP) {
    ball.y = PF_TOP;
    ball.vy = Math.abs(ball.vy);
    ball.ceilingHit = true;
  }
}

export function vausCollision(ball: BallState, vaus: VausState, model: 'continuous' | 'discrete8'): boolean {
  if (ball.vy <= 0) return false;
  if (ball.x + ball.width <= vaus.x || ball.x >= vaus.x + vaus.width) return false;
  if (ball.y + ball.height <= vaus.y || ball.y >= vaus.y + vaus.height + 4) return false;

  const vausCenter = vaus.x + vaus.width / 2;
  const ballCenter = ball.x + ball.width / 2;
  let scalingFactor = (ballCenter - vausCenter) / (vaus.width / 2);
  scalingFactor = Math.max(-1, Math.min(1, scalingFactor));

  let angleDeg: number;
  if (model === 'discrete8') {
    const zone = Math.floor((scalingFactor + 1) * 4);
    const angles = [75, 55, 35, 15, -15, -35, -55, -75];
    angleDeg = angles[Math.max(0, Math.min(7, zone))];
  } else {
    angleDeg = scalingFactor * 75;
    if (Math.abs(angleDeg) < 10) angleDeg = angleDeg >= 0 ? 10 : -10;
  }

  const rad = (angleDeg * Math.PI) / 180;
  ball.vx = Math.sin(rad) * ball.speed;
  ball.vy = -Math.cos(rad) * ball.speed;
  ball.y = vaus.y - ball.height;
  return true;
}

export function brickCollision(
  ball: BallState,
  cells: IBrickCell[],
  _originX: number, _originY: number,
  _bw: number, _bh: number,
): { cell: IBrickCell; faceX: boolean } | null {
  for (const cell of cells) {
    if (cell.type === 'EMPTY') continue;
    const cx = GRID_ORIGIN_X + cell.col * BW;
    const cy = GRID_ORIGIN_Y + cell.row * BH;
    const overlapX = Math.min(ball.x + ball.width, cx + BW) - Math.max(ball.x, cx);
    const overlapY = Math.min(ball.y + ball.height, cy + BH) - Math.max(ball.y, cy);
    if (overlapX > 0 && overlapY > 0) {
      if (cell.type === 'GOLD') {
        if (overlapX < overlapY) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        return { cell, faceX: overlapX < overlapY };
      }
      if (overlapX < overlapY) ball.vx = -ball.vx;
      else ball.vy = -ball.vy;
      return { cell, faceX: overlapX < overlapY };
    }
  }
  return null;
}

export function enemyCollision(ball: BallState, enemy: EnemyState): boolean {
  if (!enemy.active) return false;
  if (ball.x < enemy.x + enemy.width && ball.x + ball.width > enemy.x &&
      ball.y < enemy.y + enemy.height && ball.y + ball.height > enemy.y) {
    const dx = (ball.x + ball.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (ball.y + ball.height / 2) - (enemy.y + enemy.height / 2);
    if (Math.abs(dx) / enemy.width > Math.abs(dy) / enemy.height) {
      ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
    } else {
      ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
    }
    return true;
  }
  return false;
}

export function bossCollision(ball: BallState, boss: BossState): boolean {
  if (!boss.active || boss.defeated) return false;
  if (ball.x < boss.x + boss.width && ball.x + ball.width > boss.x &&
      ball.y < boss.y + boss.height && ball.y + ball.height > boss.y) {
    const dx = (ball.x + ball.width / 2) - (boss.x + boss.width / 2);
    const dy = (ball.y + ball.height / 2) - (boss.y + boss.height / 2);
    if (Math.abs(dx) / boss.width > Math.abs(dy) / boss.height) {
      ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
    } else {
      ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
    }
    return true;
  }
  return false;
}

export function capsuleVausCollision(
  cx: number, cy: number, cw: number, ch: number, vaus: VausState,
): boolean {
  return cx < vaus.x + vaus.width && cx + cw > vaus.x &&
         cy < vaus.y + vaus.height && cy + ch > vaus.y;
}

export function projectileVausCollision(
  px: number, py: number, pw: number, ph: number, vaus: VausState,
): boolean {
  return px < vaus.x + vaus.width && px + pw > vaus.x &&
         py < vaus.y + vaus.height && py + ph > vaus.y;
}

export function vausEnemyCollision(vaus: VausState, enemy: EnemyState): boolean {
  if (!enemy.active) return false;
  return vaus.x < enemy.x + enemy.width && vaus.x + vaus.width > enemy.x &&
         vaus.y < enemy.y + enemy.height && vaus.y + vaus.height > enemy.y;
}

export function laserBrickCollision(
  bx: number, by: number, bw: number, bh: number,
  cells: IBrickCell[], _ox: number, _oy: number, _cw: number, _ch: number,
): IBrickCell | null {
  for (const cell of cells) {
    if (cell.type === 'EMPTY') continue;
    const cx = GRID_ORIGIN_X + cell.col * BW;
    const cy = GRID_ORIGIN_Y + cell.row * BH;
    if (bx < cx + BW && bx + bw > cx && by < cy + BH && by + bh > cy) {
      return cell;
    }
  }
  return null;
}

export function laserEnemyCollision(
  bx: number, by: number, bw: number, bh: number, enemy: EnemyState,
): boolean {
  if (!enemy.active) return false;
  return bx < enemy.x + enemy.width && bx + bw > enemy.x &&
         by < enemy.y + enemy.height && by + bh > enemy.y;
}
