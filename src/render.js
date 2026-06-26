import { f2i } from './fx.js';
import {
  W, H, PLAY_LEFT, PLAY_RIGHT, PLAY_TOP, PLAY_BOTTOM,
  GRID_OX, GRID_OY, COLS, ROWS, BRICK_W, BRICK_H,
  VAUS_Y, VAUS_H, COLORS, GLYPHS, CAPSULE_COLORS,
} from './data.js';

const HUD_X = PLAY_RIGHT + 4;

function drawDigit(ctx, x, y, n, color = '#fff') {
  ctx.fillStyle = color;
  const s = [
    '111101101101111', // 0
    '001001001001001',
    '111001111100111',
    '111001111001111',
    '101101111001001',
    '111100111001111',
    '111100111101111',
    '111001001001001',
    '111101111101111',
    '111101111001111',
  ][n];
  for (let i = 0; i < 15; i++) {
    if (s[i] === '1') ctx.fillRect(x + (i % 3) * 2, y + Math.floor(i / 3) * 2, 2, 2);
  }
}

function drawNumber(ctx, x, y, num, digits, color) {
  const str = String(Math.max(0, Math.floor(num))).padStart(digits, '0');
  for (let i = 0; i < str.length; i++) drawDigit(ctx, x + i * 8, y, Number(str[i]), color);
}

export class Renderer {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, W, H);
  }

  draw(game) {
    this.clear();
    this._drawWalls();
    if (game.levelData && game.levelData.type === 'brick') this._drawBricks(game.grid);
    this._drawWarp(game);
    this._drawCapsules(game.capsules);
    this._drawLasers(game.lasers);
    this._drawEnemies(game.enemies);
    if (game.boss) this._drawBoss(game.boss);
    this._drawBalls(game.balls);
    this._drawVaus(game.vaus);
    this._drawHud(game);
    this._drawOverlay(game);
  }

  _drawWalls() {
    this.ctx.fillStyle = '#555555';
    this.ctx.fillRect(0, 0, PLAY_LEFT, H); // left
    this.ctx.fillRect(PLAY_RIGHT, 0, W - PLAY_RIGHT, H); // right
    this.ctx.fillRect(PLAY_LEFT, 0, PLAY_RIGHT - PLAY_LEFT, PLAY_TOP); // top
  }

  _drawBricks(grid) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell.type === 'EMPTY' || cell.hitsRemaining <= 0) continue;
        const x = GRID_OX + c * BRICK_W;
        const y = GRID_OY + r * BRICK_H;
        const color = COLORS[cell.type] || '#fff';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x + 1, y + 1, BRICK_W - 2, BRICK_H - 2);
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(x + 1, y + BRICK_H - 3, BRICK_W - 2, 2);
        if (cell.type === 'SILVER') {
          this.ctx.fillStyle = '#fff';
          for (let i = 0; i < cell.hitsRemaining; i++) this.ctx.fillRect(x + 3 + i * 4, y + 3, 2, 2);
        }
        // Color-blind glyph overlay
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.font = '5px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(GLYPHS[cell.type], x + BRICK_W / 2, y + BRICK_H - 1);
      }
    }
  }

  _drawVaus(vaus) {
    const x = f2i(vaus.x);
    const y = VAUS_Y;
    const w = f2i(vaus.width);
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(x, y, w, VAUS_H);
    // shading
    this.ctx.fillStyle = '#007700';
    this.ctx.fillRect(x, y + VAUS_H - 2, w, 2);
    if (vaus.powerup === 'L') {
      this.ctx.fillStyle = '#ff0000';
      this.ctx.fillRect(x, y - 3, 3, 3);
      this.ctx.fillRect(x + w - 3, y - 3, 3, 3);
    }
    if (vaus.powerup === 'C') {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.fillRect(x + w / 2 - 3, y + 2, 6, 4);
    }
  }

  _drawBalls(balls) {
    this.ctx.fillStyle = '#ffffff';
    for (const b of balls) {
      const x = f2i(b.x) - 2;
      const y = f2i(b.y) - 2;
      this.ctx.fillRect(x, y, 5, 4);
    }
  }

  _drawCapsules(capsules) {
    for (const cap of capsules) {
      const x = f2i(cap.x) - 6;
      const y = f2i(cap.y) - 3;
      this.ctx.fillStyle = CAPSULE_COLORS[cap.type] || '#fff';
      this.ctx.fillRect(x, y, 12, 6);
      this.ctx.fillStyle = '#000';
      this.ctx.font = '6px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(cap.type, x + 6, y + 5);
    }
  }

  _drawLasers(lasers) {
    this.ctx.fillStyle = '#ff3333';
    for (const l of lasers) {
      const x = f2i(l.x);
      const y = f2i(l.y);
      this.ctx.fillRect(x - 1, y, 2, 8);
    }
  }

  _drawEnemies(enemies) {
    for (const e of enemies) {
      const x = f2i(e.x) - 5;
      const y = f2i(e.y) - 4;
      this.ctx.fillStyle = '#ff66cc';
      this.ctx.fillRect(x, y, 10, 8);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(x + 2, y + 2, 2, 2);
      this.ctx.fillRect(x + 6, y + 2, 2, 2);
    }
  }

  _drawBoss(boss) {
    const x = f2i(boss.x) - f2i(boss.w) / 2;
    const y = f2i(boss.y) - f2i(boss.h) / 2;
    const w = f2i(boss.w);
    const h = f2i(boss.h);
    this.ctx.fillStyle = '#8833cc';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(x + w / 2 - 4, y + 8, 8, 6); // mouth
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(x + 10, y + 10, 6, 6);
    this.ctx.fillRect(x + w - 16, y + 10, 6, 6);
    // damage indicator
    this.ctx.fillStyle = '#00ff00';
    const dmgW = (w * boss.damage) / 16;
    this.ctx.fillRect(x, y - 4, dmgW, 2);
  }

  _drawWarp(game) {
    if (!game.warpOpen) return;
    const x = PLAY_RIGHT - 18;
    const y = PLAY_BOTTOM - 40;
    this.ctx.fillStyle = '#00ffff';
    this.ctx.fillRect(x, y, 10, 24);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(x + 2, y + 2 + ((game.tick >> 3) % 4) * 5, 6, 4);
  }

  _drawHud(game) {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('SCORE', HUD_X, 16);
    drawNumber(this.ctx, HUD_X, 20, game.score, 7, '#0f0');
    this.ctx.fillText('HIGH', HUD_X, 44);
    drawNumber(this.ctx, HUD_X, 48, game.highScore, 7, '#ff0');
    this.ctx.fillText('ROUND', HUD_X, 72);
    drawNumber(this.ctx, HUD_X, 76, game.round, 2, '#fff');
    this.ctx.fillText('LIVES', HUD_X, 100);
    for (let i = 0; i < game.lives; i++) {
      this.ctx.fillStyle = '#0f0';
      this.ctx.fillRect(HUD_X + i * 10, 104, 8, 3);
    }
    if (game.vaus.powerup) {
      this.ctx.fillStyle = CAPSULE_COLORS[game.vaus.powerup] || '#fff';
      this.ctx.fillRect(HUD_X, 124, 16, 8);
      this.ctx.fillStyle = '#000';
      this.ctx.fillText(game.vaus.powerup, HUD_X + 4, 131);
    }
  }

  _drawOverlay(game) {
    const ctx = this.ctx;
    const cx = W / 2;
    const cy = H / 2;
    if (game.state === 'TITLE') {
      this._centerText('ARKANOID', cy - 40, '#0ff', 16);
      this._centerText(game.mode === 'licensed-fidelity' ? 'LICENSED FIDELITY' : 'CLEAN-ROOM HOMAGE', cy - 20, '#aaa', 8);
      this._centerText(`${game.playerCount}-PLAYER`, cy + 10, '#ff0', 10);
      this._centerText('PRESS START', cy + 30, game.tick % 60 < 30 ? '#fff' : '#555', 10);
      this._centerText('SELECT: 1P/2P', cy + 50, '#aaa', 8);
    } else if (game.state === 'OPENING_STORY') {
      const y = H - ((game.stateTick * 0.5) % (H + 60)) + 20;
      this._centerText(game.mode === 'licensed-fidelity'
        ? "After the mothership 'Arkanoid' was destroyed..."
        : "After the mother flagship was destroyed in a cosmic ambush...", y, '#fff', 8);
    } else if (game.state === 'GAMEPLAY_DEMO') {
      this._centerText('DEMO', 20, '#fff', 10);
    } else if (game.state === 'ROUND_INTRO' || game.state === 'BOSS_INTRO') {
      this._centerText(`ROUND ${game.round}`, cy, '#0ff', 12);
    } else if (game.state === 'BALL_READY') {
      this._centerText('READY', cy, '#ff0', 10);
    } else if (game.state === 'PAUSED') {
      this._centerText('PAUSED', cy, '#ff0', 12);
      this._centerText('START to resume / SELECT to quit', cy + 16, '#aaa', 8);
    } else if (game.state === 'LIFE_LOST') {
      this._centerText('VAUS LOST', cy, '#f00', 10);
    } else if (game.state === 'ROUND_CLEAR') {
      this._centerText('ROUND CLEAR', cy, '#0f0', 12);
    } else if (game.state === 'BREAK_WARP') {
      this._centerText('WARP!', cy, '#0ff', 12);
    } else if (game.state === 'GAME_OVER') {
      this._centerText('GAME OVER', cy, '#f00', 14);
    } else if (game.state === 'BOSS_DEFEATED') {
      this._centerText('DOH DEFEATED', cy, '#0f0', 12);
    } else if (game.state === 'ENDING') {
      const y = H - ((game.stateTick * 0.4) % (H + 100));
      this._centerText(game.mode === 'licensed-fidelity'
        ? "Fort Doh has been demolished and time is flowing reversly..."
        : "The dimensional fortress has collapsed and space-time has stabilized...", y, '#fff', 8);
      this._centerText('THE END', cy + 60, '#0ff', 12);
    }
  }

  _centerText(text, y, color, size) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, W / 2, y);
  }
}
