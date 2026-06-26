// PRD §6: Canvas 2D renderer with pixel-perfect scaling
import { CANVAS_WIDTH, CANVAS_HEIGHT, WALL_THICKNESS, PLAYFIELD_WIDTH } from '../physics/aabb';
import { Ball } from '../entities/ball';
import { Vaus } from '../entities/vaus';
import { Brick } from '../entities/brick';
import { Capsule } from '../entities/capsule';
import { Enemy } from '../entities/enemy';
import { Boss } from '../entities/boss';

// NES-style palette
const COLORS: Record<string, string> = {
  EMPTY: '#000000',
  WHITE: '#FFFFFF',
  ORANGE: '#FF8800',
  LIGHT_BLUE: '#00CCFF',
  GREEN: '#00FF00',
  RED: '#FF0000',
  BLUE: '#0000FF',
  PINK: '#FF88FF',
  YELLOW: '#FFFF00',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  WALL: '#333333',
  BALL: '#FFFFFF',
  VAUS: '#CC0000',
  CAPSULE: '#FFFFFF',
  ENEMY: '#FF4444',
  BOSS: '#880088',
  HUD: '#FFFFFF',
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false; // PRD §6.3: Pixelated scaling
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    this.scale = Math.max(1, Math.min(
      Math.floor(maxW / CANVAS_WIDTH),
      Math.floor(maxH / CANVAS_HEIGHT)
    ));
    this.canvas.width = CANVAS_WIDTH * this.scale;
    this.canvas.height = CANVAS_HEIGHT * this.scale;
    this.ctx.scale(this.scale, this.scale);
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawWalls(): void {
    this.ctx.fillStyle = COLORS.WALL;
    // Left wall
    this.ctx.fillRect(0, 0, WALL_THICKNESS, CANVAS_HEIGHT);
    // Right wall
    this.ctx.fillRect(WALL_THICKNESS + PLAYFIELD_WIDTH, 0, WALL_THICKNESS, CANVAS_HEIGHT);
    // Top wall
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, WALL_THICKNESS);
  }

  drawBall(ball: Ball): void {
    if (!ball.active) return;
    this.ctx.fillStyle = COLORS.BALL;
    this.ctx.fillRect(Math.floor(ball.x), Math.floor(ball.y), ball.w, ball.h);
  }

  drawVaus(vaus: Vaus): void {
    this.ctx.fillStyle = COLORS.VAUS;
    this.ctx.fillRect(Math.floor(vaus.x), Math.floor(vaus.y), vaus.w, vaus.h);
  }

  drawBrick(brick: Brick): void {
    if (brick.destroyed || brick.type === 'EMPTY') return;
    this.ctx.fillStyle = COLORS[brick.type] || '#FFFFFF';
    this.ctx.fillRect(Math.floor(brick.x), Math.floor(brick.y), brick.w, brick.h);
  }

  drawCapsule(capsule: Capsule): void {
    if (!capsule.active) return;
    this.ctx.fillStyle = COLORS.CAPSULE;
    this.ctx.fillRect(Math.floor(capsule.x), Math.floor(capsule.y), capsule.w, capsule.h);
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '6px monospace';
    this.ctx.fillText(capsule.type, capsule.x + 4, capsule.y + 6);
  }

  drawEnemy(enemy: Enemy): void {
    if (!enemy.active) return;
    this.ctx.fillStyle = COLORS.ENEMY;
    this.ctx.fillRect(Math.floor(enemy.x), Math.floor(enemy.y), enemy.w, enemy.h);
  }

  drawBoss(boss: Boss): void {
    if (!boss.active) return;
    this.ctx.fillStyle = COLORS.BOSS;
    this.ctx.fillRect(Math.floor(boss.x), Math.floor(boss.y), boss.w, boss.h);
    // Draw projectiles
    this.ctx.fillStyle = '#FF0000';
    for (const p of boss.projectiles) {
      this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 4, 4);
    }
  }

  drawHUD(score: number, lives: number, round: number): void {
    this.ctx.fillStyle = COLORS.HUD;
    this.ctx.font = '8px monospace';
    // Score on right side
    this.ctx.fillText(`SCORE`, 200, 16);
    this.ctx.fillText(`${score.toString().padStart(8, '0')}`, 200, 24);
    // Round
    this.ctx.fillText(`ROUND`, 200, 40);
    this.ctx.fillText(`${round}`, 200, 48);
    // Lives as mini vaus sprites
    this.ctx.fillText(`LIVES`, 200, 64);
    for (let i = 0; i < lives; i++) {
      this.ctx.fillStyle = COLORS.VAUS;
      this.ctx.fillRect(200 + i * 12, 68, 10, 4);
    }
  }

  drawText(text: string, x: number, y: number, size = 8): void {
    this.ctx.fillStyle = COLORS.HUD;
    this.ctx.font = `${size}px monospace`;
    this.ctx.fillText(text, x, y);
  }

  drawTitleScreen(): void {
    this.clear();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('ARKANOID', 80, 80);
    this.ctx.font = '8px monospace';
    this.ctx.fillText('1 PLAYER', 100, 140);
    this.ctx.fillText('2 PLAYERS', 100, 160);
    this.ctx.fillText('PRESS ENTER TO START', 60, 200);
  }

  drawGameOver(): void {
    this.clear();
    this.ctx.fillStyle = '#FF0000';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('GAME OVER', 80, 120);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '8px monospace';
    this.ctx.fillText('PRESS ENTER TO CONTINUE', 50, 160);
  }

  drawEnding(): void {
    this.clear();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '8px monospace';
    const text = 'Fort Doh has been demolished and time is flowing reversly. Vaus has escaped from the distorted space but the real voyage of Arkanoid in the galaxy has only started......';
    const words = text.split(' ');
    let line = '';
    let y = 60;
    for (const word of words) {
      const test = line + word + ' ';
      if (this.ctx.measureText(test).width > 200) {
        this.ctx.fillText(line, 20, y);
        line = word + ' ';
        y += 12;
      } else {
        line = test;
      }
    }
    this.ctx.fillText(line, 20, y);
    this.ctx.fillText('THE END', 100, y + 40);
  }
}