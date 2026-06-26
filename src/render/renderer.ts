/**
 * Canvas renderer — architecture.md §2 (`/render`), PRD §6.
 *
 * Draws the 256x240 logical canvas pixel-perfect (no smoothing). Two contexts:
 * Fidelity (licensed art) vs Clean-room (procedural fills) — both draw to the same
 * logical surface. The renderer is read-only over sim state and never mutates it.
 */
import { RoundSim } from '../game/roundSim';
import { BossSim } from '../game/bossSim';
import { GameState } from '../core/stateMachine';
import {
  HUD_X,
  LOGICAL_H,
  LOGICAL_W,
  PLAY_BOTTOM,
  PLAY_LEFT,
  PLAY_RIGHT,
  PLAY_TOP,
} from '../core/constants';
import { toInt } from '../core/fixedpoint';
import { BRICK_RGBA } from './levelPixels';
import { BrickField } from '../entities/bricks';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
}

const WALL_COLOR = '#555';
const BG = '#000';

/** Draw the full frame for the current state. */
export function render(
  rc: RenderContext,
  state: GameState,
  payload: { sim?: RoundSim; boss?: BossSim; round: number; score: number; lives: number; region: string; message?: string },
): void {
  const { ctx } = rc;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Playfield border (walls).
  ctx.fillStyle = WALL_COLOR;
  ctx.fillRect(PLAY_LEFT - 2, PLAY_TOP - 2, PLAY_RIGHT - PLAY_LEFT + 4, 2); // top
  ctx.fillRect(PLAY_LEFT - 2, PLAY_TOP, 2, PLAY_BOTTOM - PLAY_TOP); // left
  ctx.fillRect(PLAY_RIGHT, PLAY_TOP, 2, PLAY_BOTTOM - PLAY_TOP); // right

  if (state === GameState.PLAYING || state === GameState.BALL_READY || state === GameState.PAUSED || state === GameState.ROUND_INTRO || state === GameState.LIFE_LOST) {
    drawRound(ctx, payload.sim!);
  } else if (state === GameState.BOSS_PLAYING || state === GameState.BOSS_INTRO) {
    drawBoss(ctx, payload.boss!);
  }

  drawHud(ctx, payload.score, payload.lives, payload.round, payload.region);

  if (state === GameState.TITLE) drawCenterText(ctx, 'ARKANOID', 'Press Enter / Tap');
  else if (state === GameState.ROUND_INTRO) drawCenterText(ctx, `ROUND ${payload.round}`, 'Get Ready');
  else if (state === GameState.PAUSED) drawCenterText(ctx, 'PAUSED', 'Start to resume');
  else if (state === GameState.GAME_OVER) drawCenterText(ctx, 'GAME OVER', '');
  else if (state === GameState.ROUND_CLEAR) drawCenterText(ctx, 'CLEARED', '');
  else if (state === GameState.OPENING_STORY) drawCenterText(ctx, '...', 'story');
  else if (state === GameState.ENDING) drawCenterText(ctx, 'THE END', '');
  else if (state === GameState.BOSS_INTRO) drawCenterText(ctx, 'DOH', '');
}

function drawRound(ctx: CanvasRenderingContext2D, sim: RoundSim): void {
  drawBricks(ctx, sim.field);
  // Capsules.
  for (const cap of sim.capsules) {
    ctx.fillStyle = '#ff0';
    ctx.fillRect(toInt(cap.x), toInt(cap.y), cap.w, cap.h);
    ctx.fillStyle = '#000';
    ctx.fillText(cap.type, toInt(cap.x) + 3, toInt(cap.y) + 6);
  }
  // Enemies.
  for (const e of sim.enemies) {
    ctx.fillStyle = '#f0f';
    ctx.fillRect(toInt(e.x), toInt(e.y), e.w, e.h);
  }
  // Lasers.
  for (const b of sim.lasers.beams) {
    ctx.fillStyle = '#f44';
    ctx.fillRect(toInt(b.x), toInt(b.y), 1, 6);
  }
  // Balls.
  for (const ball of sim.balls) {
    if (!ball.alive) continue;
    ctx.fillStyle = '#fff';
    ctx.fillRect(toInt(ball.x), toInt(ball.y), ball.w, ball.h);
  }
  // Vaus.
  ctx.fillStyle = sim.powerups.active === 'laser' ? '#f88' : '#0f0';
  ctx.fillRect(toInt(sim.vaus.x), sim.vaus.y, toInt(sim.vaus.width), sim.vaus.h);
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: BossSim): void {
  const b = boss.bossAABB;
  ctx.fillStyle = '#a0f';
  ctx.fillRect(toInt(b.x), toInt(b.y), toInt(b.w), toInt(b.h));
  for (const p of boss.projectiles) {
    ctx.fillStyle = '#f44';
    ctx.fillRect(toInt(p.x), toInt(p.y), 4, 4);
  }
  for (const ball of boss.balls) {
    if (!ball.alive) continue;
    ctx.fillStyle = '#fff';
    ctx.fillRect(toInt(ball.x), toInt(ball.y), ball.w, ball.h);
  }
  ctx.fillStyle = '#0f0';
  ctx.fillRect(toInt(boss.vaus.x), boss.vaus.y, toInt(boss.vaus.width), boss.vaus.h);
}

function drawBricks(ctx: CanvasRenderingContext2D, field: BrickField): void {
  for (const brick of field.live()) {
    const ba = field.aabb(brick);
    const [r, g, b] = BRICK_RGBA[brick.type];
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(toInt(ba.x), toInt(ba.y), toInt(ba.w), toInt(ba.h));
  }
}

function drawHud(ctx: CanvasRenderingContext2D, score: number, lives: number, round: number, region: string): void {
  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('SCORE', HUD_X + 2, 10);
  ctx.fillText(String(score).padStart(6, '0'), HUD_X + 2, 20);
  ctx.fillText('HI', HUD_X + 2, 40);
  ctx.fillText('LIVES', HUD_X + 2, 70);
  ctx.fillText(String(lives), HUD_X + 2, 80);
  ctx.fillText('ROUND', HUD_X + 2, 100);
  ctx.fillText(String(round), HUD_X + 2, 110);
  ctx.fillText(region, HUD_X + 2, 130);
}

function drawCenterText(ctx: CanvasRenderingContext2D, line1: string, line2: string): void {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (line1) ctx.fillText(line1, PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) / 2, 100);
  ctx.font = '8px monospace';
  if (line2) ctx.fillText(line2, PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) / 2, 120);
  ctx.textAlign = 'left';
}
