import { GameState, PlayerState, GameStateType } from '../core/gameState';
import { Vaus, VAUS_NORMAL_WIDTH, VAUS_ENLARGED_WIDTH, VAUS_HEIGHT, PLAYFIELD_LEFT } from '../entities/vaus';
import { BALL_SIZE } from '../entities/ball';
import { BrickManager, BRICK_WIDTH, BRICK_HEIGHT, GRID_ORIGIN_X, GRID_ORIGIN_Y } from '../entities/bricks';
import { Capsule, CAPSULE_WIDTH, CAPSULE_HEIGHT } from '../entities/capsules';
import { Enemy } from '../entities/enemies';
import { BossManager } from '../entities/boss';
import { fxFloor } from '../physics/fixedPoint';

const COLORS: Record<string, string> = {
  WHITE: '#f0f0f0',
  ORANGE: '#f0a040',
  LIGHT_BLUE: '#60b0f0',
  GREEN: '#40c040',
  RED: '#e04040',
  BLUE: '#4040f0',
  PINK: '#f060c0',
  YELLOW: '#f0f040',
  SILVER: '#a0a0a0',
  GOLD: '#d0a020',
  EMPTY: '#000',
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  resize(): void {
    const parent = this.canvas.parentElement!;
    const scale = Math.min(
      Math.floor(parent.clientWidth / 256),
      Math.floor(parent.clientHeight / 240),
    );
    const w = scale * 256;
    const h = scale * 240;
    this.canvas.width = 256;
    this.canvas.height = 240;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, 256, 240);
  }

  render(state: GameState): void {
    this.clear();
    this.drawPlayfield();
    this.drawWarpExit(state);
    this.drawBricks(state.player.bricks);
    this.drawVaus(state.player.vaus);
    this.drawBalls(state.player.balls);
    this.drawCapsules(state.player.capsules.active);
    this.drawEnemies(state.player.enemies.active);
    if (state.player.boss) this.drawBoss(state.player.boss);
    this.drawHUD(state);
    this.drawUIOverlay(state);
  }

  private drawWarpExit(state: GameState): void {
    if (state.player.vaus.hasBreak && state.player.round < state.bossRound) {
      this.ctx.fillStyle = '#ff00ff';
      this.ctx.fillRect(240, 200, 8, 24);
      this.ctx.fillStyle = '#ff88ff';
      this.ctx.fillRect(241, 202, 6, 20);
    }
  }

  private drawPlayfield(): void {
    this.ctx.strokeStyle = '#444';
    this.ctx.strokeRect(8, 8, 240, 224);
  }

  private drawBricks(bm: BrickManager): void {
    for (let row = 0; row < 28; row++) {
      for (let col = 0; col < 11; col++) {
        const cell = bm.grid[row]?.[col];
        if (!cell || cell.type === 'EMPTY') continue;
        const x = GRID_ORIGIN_X + col * BRICK_WIDTH;
        const y = GRID_ORIGIN_Y + row * BRICK_HEIGHT;
        const color = COLORS[cell.type] ?? '#888';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, BRICK_WIDTH, BRICK_HEIGHT);
        if (cell.type === 'SILVER') {
          this.ctx.fillStyle = '#fff';
          this.ctx.font = '5px monospace';
          this.ctx.fillText(`${cell.hitsRemaining}`, x + 2, y + 7);
        }
        this.ctx.strokeStyle = '#111';
        this.ctx.strokeRect(x, y, BRICK_WIDTH, BRICK_HEIGHT);
      }
    }
  }

  private drawVaus(vaus: Vaus): void {
    const x = fxFloor(vaus.x);
    const y = fxFloor(vaus.y);
    this.ctx.fillStyle = '#00e0ff';
    this.ctx.fillRect(x, y, vaus.width, VAUS_HEIGHT);
    this.ctx.fillStyle = '#0088cc';
    this.ctx.fillRect(x + 4, y + 1, vaus.width - 8, VAUS_HEIGHT - 2);
  }

  private drawBalls(balls: any[]): void {
    for (const ball of balls) {
      if (!ball.active) continue;
      const x = fxFloor(ball.x);
      const y = fxFloor(ball.y);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(x, y, BALL_SIZE, BALL_SIZE);
    }
  }

  private drawCapsules(capsules: Capsule[]): void {
    const capColors: Record<string, string> = {
      S: '#f0a040', C: '#f0f040', L: '#e04040',
      D: '#60b0f0', P: '#888888', E: '#4040f0', B: '#f060c0',
    };
    for (const cap of capsules) {
      if (!cap.active) continue;
      const x = fxFloor(cap.x);
      const y = fxFloor(cap.y);
      this.ctx.fillStyle = capColors[cap.type] ?? '#fff';
      this.ctx.fillRect(x, y, CAPSULE_WIDTH, CAPSULE_HEIGHT);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '5px monospace';
      this.ctx.fillText(cap.type, x + 5, y + 6);
    }
  }

  private drawEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const x = fxFloor(enemy.x);
      const y = fxFloor(enemy.y);
      this.ctx.fillStyle = '#ff4040';
      this.ctx.fillRect(x, y, enemy.w, enemy.h);
      this.ctx.fillStyle = '#cc0000';
      this.ctx.fillRect(x + 2, y + 2, enemy.w - 4, enemy.h - 4);
    }
  }

  private drawBoss(boss: BossManager): void {
    const x = fxFloor(boss.x);
    const y = fxFloor(boss.y);
    this.ctx.fillStyle = '#ff00ff';
    this.ctx.fillRect(x, y, boss.width, boss.height);
    this.ctx.fillStyle = '#cc00cc';
    this.ctx.fillRect(x + 8, y + 8, boss.width - 16, boss.height - 16);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(x + boss.width / 2 - 4, y + boss.height / 2, 8, 20);

    for (const p of boss.projectiles) {
      if (!p.active) continue;
      this.ctx.fillStyle = '#ff0000';
      this.ctx.fillRect(fxFloor(p.x) - 2, fxFloor(p.y) - 2, 4, 4);
    }
  }

  private drawHUD(state: GameState): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px monospace';
    this.ctx.fillText(`SCORE: ${state.scoring.score}`, 8, 8);
    this.ctx.fillText(`HIGH: ${state.scoring.highScore}`, 130, 8);
    this.ctx.fillText(`LIVES: ${state.player.lives}`, 8, 236);
    this.ctx.fillText(`ROUND: ${state.player.round}`, 180, 236);
  }

  private drawUIOverlay(state: GameState): void {
    const s = state.state;
    if (s === 'TITLE') this.drawTitle();
    else if (s === 'OPENING_STORY') this.drawStory(state);
    else if (s === 'ROUND_INTRO') this.drawRoundIntro(state);
    else if (s === 'BALL_READY') this.drawBallReady();
    else if (s === 'PAUSED') this.drawPause();
    else if (s === 'GAME_OVER') this.drawGameOver();
    else if (s === 'NAME_ENTRY') this.drawNameEntry(state);
    else if (s === 'ENDING') this.drawEnding(state);
    else if (s === 'BOSS_INTRO') this.drawBossIntro();
    else if (s === 'BOSS_DEFEATED') this.drawBossDefeated();
    else if (s === 'LIFE_LOST') this.drawLifeLost();
    else if (s === 'ROUND_CLEAR') this.drawRoundClear();
    else if (s === 'BREAK_WARP') this.drawBreakWarp();
  }

  private drawTitle(): void {
    this.ctx.fillStyle = '#00e0ff';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('ARKANOID', 64, 80);
    this.ctx.fillStyle = '#888';
    this.ctx.font = '8px monospace';
    this.ctx.fillText('1 PLAYER', 80, 140);
    this.ctx.fillText('2 PLAYERS', 80, 155);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '7px monospace';
    this.ctx.fillText('PRESS START', 72, 200);
  }

  private drawStory(state: GameState): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '7px monospace';
    const text = state.config.mode === 'licensed-fidelity'
      ? "After the mothership 'Arkanoid' was destroyed, a spacecraft 'Vaus' scrambled away from it. But only to be trapped in space, warped by someone..."
      : "After the mother flagship was destroyed in a cosmic ambush, the escape pod 'Vaus' launched into the void. However, it was instantly ensnared in a localized space-time anomaly, warped by an unknown entity...";
    const lines = this.wrapText(text, 34);
    const startY = 120 - lines.length * 4;
    lines.forEach((line, i) => this.ctx.fillText(line, 16, startY + i * 9));
  }

  private wrapText(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  private drawRoundIntro(state: GameState): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`ROUND ${state.player.round}`, 80, 120);
  }

  private drawBallReady(): void {
    this.ctx.fillStyle = '#888';
    this.ctx.font = '7px monospace';
    this.ctx.fillText('PRESS FIRE', 72, 120);
  }

  private drawPause(): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText('PAUSE', 100, 120);
  }

  private drawGameOver(): void {
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = '12px monospace';
    this.ctx.fillText('GAME OVER', 72, 120);
  }

  private drawNameEntry(state: GameState): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px monospace';
    this.ctx.fillText('ENTER NAME', 72, 100);
    this.ctx.fillStyle = '#ff0';
    this.ctx.fillText('AAA', 104, 130);
  }

  private drawEnding(state: GameState): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '7px monospace';
    const text = state.config.mode === 'licensed-fidelity'
      ? "Fort Doh has been demolished and time is flowing reversly. Vaus has escaped from the distorted space but the real voyage of 'Arkanoid' in the galaxy has only started......"
      : "The dimensional fortress has collapsed and space-time has stabilized. The Vaus escapes the warp, but its cosmic odyssey in the galaxy has only begun...";
    const lines = this.wrapText(text, 34);
    const startY = 120 - lines.length * 4;
    lines.forEach((line, i) => this.ctx.fillText(line, 16, startY + i * 9));
  }

  private drawBossIntro(): void {
    this.ctx.fillStyle = '#ff00ff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('DOH', 104, 120);
  }

  private drawBossDefeated(): void {
    this.ctx.fillStyle = '#ff0';
    this.ctx.font = '8px monospace';
    this.ctx.fillText('DOH DEFEATED!', 72, 120);
  }

  private drawLifeLost(): void {
    this.ctx.fillStyle = '#ff0';
    this.ctx.font = '7px monospace';
    this.ctx.fillText('LIFE LOST', 80, 120);
  }

  private drawRoundClear(): void {
    this.ctx.fillStyle = '#0f0';
    this.ctx.font = '8px monospace';
    this.ctx.fillText('ROUND CLEAR!', 72, 120);
  }

  private drawBreakWarp(): void {
    this.ctx.fillStyle = '#f0f';
    this.ctx.font = '8px monospace';
    this.ctx.fillText('WARP!', 104, 120);
  }
}
