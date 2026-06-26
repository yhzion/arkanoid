import type { VausState } from '../entities/vaus';
import type { BallState } from '../entities/ball';
import type { CapsuleState } from '../entities/capsules';
import type { EnemyState } from '../entities/enemies';
import type { BossState, ProjectileState } from '../entities/boss';
import type { ILevelData, IBrickCell } from '../data/levelSchema';
import type { GameState } from '../core/stateMachine';

export const CANVAS_W = 256;
export const CANVAS_H = 240;
export const FIELD_X = 0;
export const FIELD_Y = 0;
export const FIELD_W = 192;
export const FIELD_H = 232;
export const HUD_X = 192;
export const HUD_W = 64;

const BRICK_COLORS: Record<string, string> = {
  WHITE: '#ffffff',
  ORANGE: '#ffa500',
  LIGHT_BLUE: '#87ceeb',
  GREEN: '#00ff00',
  RED: '#ff4444',
  BLUE: '#4444ff',
  PINK: '#ff69b4',
  YELLOW: '#ffff00',
  SILVER: '#c0c0c0',
  GOLD: '#ffd700',
};

export class Renderer {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private scale = 1;
  private renderScale = 2;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const sx = Math.floor(cw / CANVAS_W);
    const sy = Math.floor(ch / CANVAS_H);
    this.renderScale = Math.max(1, Math.min(sx, sy));
    const w = CANVAS_W * this.renderScale;
    const h = CANVAS_H * this.renderScale;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = CANVAS_W * this.renderScale;
    this.canvas.height = CANVAS_H * this.renderScale;
    this.ctx.imageSmoothingEnabled = false;
    this.scale = this.renderScale;
  }

  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private s(v: number): number { return v * this.scale; }

  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.s(x), this.s(y), this.s(w), this.s(h));
  }

  drawText(text: string, x: number, y: number, color = '#fff', size = 8): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${this.s(size)}px monospace`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, this.s(x), this.s(y));
  }

  drawCenteredText(text: string, y: number, color = '#fff', size = 8): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${this.s(size)}px monospace`;
    this.ctx.textBaseline = 'top';
    const m = this.ctx.measureText(text);
    this.ctx.fillText(text, this.s((CANVAS_W - m.width / this.scale) / 2), this.s(y));
  }

  renderField(): void {
    this.drawRect(0, 0, 192, 232, '#111');
    this.drawRect(0, 0, 8, 232, '#444');
    this.drawRect(184, 0, 8, 232, '#444');
  }

  renderVaus(v: VausState): void {
    this.drawRect(v.x, v.y, v.w, v.h, '#0af');
  }

  renderBall(b: BallState): void {
    if (!b.active) return;
    this.drawRect(b.x, b.y, b.w, b.h, '#fff');
  }

  renderCapsule(c: CapsuleState): void {
    if (!c.active || !c.type) return;
    const capColors: Record<string, string> = {
      S: '#ff8c00', C: '#ffd700', L: '#ff3333', D: '#87ceeb',
      P: '#888', E: '#4488ff', B: '#ff69b4',
    };
    this.drawRect(c.x, c.y, c.w, c.h, capColors[c.type] ?? '#fff');
    this.drawText(c.type, c.x + 4, c.y + 1, '#000', 6);
  }

  renderEnemy(e: EnemyState): void {
    if (!e.active) return;
    const colors: Record<string, string> = {
      Konerd: '#f44', Pyradok: '#4f4', 'Tri-sphere': '#44f', Opopo: '#ff4',
    };
    this.drawRect(e.x, e.y, e.w, e.h, colors[e.type] ?? '#fff');
  }

  renderBoss(b: BossState): void {
    if (!b.active) return;
    this.drawRect(b.x, b.y, b.w, b.h, '#f0f');
    for (let i = 0; i < b.hits; i++) {
      const bx = b.x + 4 + (i % 8) * 7;
      const by = b.y + b.h + 4 + Math.floor(i / 8) * 4;
      this.drawRect(bx, by, 5, 3, '#0f0');
    }
  }

  renderProjectile(p: ProjectileState): void {
    if (!p.active) return;
    this.drawRect(p.x, p.y, 4, 4, '#ff0');
  }

  renderBricks(level: ILevelData): void {
    const { grid } = level;
    for (const cell of level.cells) {
      if (cell.type === 'EMPTY') continue;
      const bx = 8 + cell.col * grid.brickWidth;
      const by = 8 + cell.row * grid.brickHeight;
      this.drawRect(bx, by, grid.brickWidth - 1, grid.brickHeight - 1, BRICK_COLORS[cell.type] ?? '#888');
    }
  }

  renderHUD(score: number, lives: number, round: number): void {
    this.drawText('SCORE', 196, 8, '#aaa', 6);
    this.drawText(String(score).padStart(7, '0'), 196, 18, '#fff', 6);
    this.drawText('ROUND', 196, 40, '#aaa', 6);
    this.drawText(String(round), 196, 50, '#fff', 6);
    this.drawText('LIVES', 196, 72, '#aaa', 6);
    for (let i = 0; i < Math.min(lives, 5); i++) {
      this.drawRect(196 + i * 12, 84, 8, 4, '#0af');
    }
  }

  renderTitleScreen(tick: number, playerCount: number): void {
    this.drawCenteredText('ARKANOID', 40, '#0af', 16);
    this.drawCenteredText('Clean-Room Edition', 60, '#888', 6);
    this.drawCenteredText('1 Player', 120, playerCount === 1 ? '#fff' : '#444', 8);
    this.drawCenteredText('2 Players', 134, playerCount === 2 ? '#fff' : '#444', 8);
    this.drawCenteredText('Press START', 180, '#fff', 8);
    if (Math.floor(tick / 30) % 2 === 0) {
      this.drawCenteredText('Press SELECT to change', 196, '#888', 6);
    }
    this.drawCenteredText('Taito 1987', 220, '#666', 6);
  }

  renderOpeningStory(tick: number): void {
    const scrollY = 240 - (tick % 600) * 0.3;
    this.drawText('After the mother flagship was', 16, scrollY, '#fff', 7);
    this.drawText('destroyed in a cosmic ambush,', 16, scrollY + 14, '#fff', 7);
    this.drawText("the escape pod 'Vaus' launched", 16, scrollY + 28, '#fff', 7);
    this.drawText('into the void. However, it was', 16, scrollY + 42, '#fff', 7);
    this.drawText('instantly ensnared in a localized', 16, scrollY + 56, '#fff', 7);
    this.drawText('space-time anomaly, warped by', 16, scrollY + 70, '#fff', 7);
    this.drawText('an unknown entity...', 16, scrollY + 84, '#0af', 7);
  }

  renderGameOver(): void {
    this.drawCenteredText('GAME OVER', 100, '#f44', 16);
  }

  renderPause(): void {
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawCenteredText('PAUSED', 100, '#fff', 16);
    this.drawCenteredText('Press START to resume', 130, '#888', 8);
  }

  renderEnding(tick: number): void {
    const scrollY = 240 - (tick % 900) * 0.2;
    this.drawCenteredText('CONGRATULATIONS!', scrollY, '#ff0', 12);
    this.drawCenteredText('The dimensional fortress', scrollY + 30, '#fff', 7);
    this.drawText('has collapsed and space-time', 16, scrollY + 44, '#fff', 7);
    this.drawText('has stabilized. The Vaus', 16, scrollY + 58, '#fff', 7);
    this.drawText('escapes the warp, but its', 16, scrollY + 72, '#fff', 7);
    this.drawText('cosmic odyssey in the galaxy', 16, scrollY + 86, '#fff', 7);
    this.drawText('has only begun...', 16, scrollY + 100, '#0af', 7);
    this.drawCenteredText('THE END', scrollY + 140, '#fff', 12);
  }

  renderRoundIntro(round: number, tick: number): void {
    this.drawCenteredText(`ROUND ${round}`, 100, '#0af', 16);
  }

  renderNameEntry(tick: number, initials: string, cursor: number): void {
    this.drawCenteredText('CONGRATULATIONS!', 40, '#ff0', 10);
    this.drawCenteredText('YOU HAVE A HIGH SCORE', 56, '#fff', 7);
    this.drawCenteredText('ENTER YOUR NAME', 80, '#fff', 8);
    const name = (initials + '_').padEnd(3, ' ');
    this.drawCenteredText(name, 110, '#0af', 16);
    if (Math.floor(tick / 20) % 2 === 0) {
      this.drawCenteredText('^', 130, '#fff', 8);
    }
    this.drawCenteredText('Type A-Z keys to enter initials', 160, '#888', 6);
    this.drawCenteredText('Press ENTER when done', 176, '#888', 6);
  }

  render(state: GameState, tick: number, vaus?: VausState, balls?: BallState[], level?: ILevelData,
         score?: number, lives?: number, round?: number, capsules?: CapsuleState[],
         enemies?: EnemyState[], boss?: BossState): void {
    this.clear();

    if (state === 'TITLE') {
      this.renderTitleScreen(tick, 1);
      return;
    }
    if (state === 'OPENING_STORY') {
      this.renderOpeningStory(tick);
      return;
    }
    if (state === 'GAME_OVER') {
      this.renderField();
      this.renderGameOver();
      return;
    }
    if (state === 'ENDING') {
      this.renderEnding(tick);
      return;
    }
    if (state === 'NAME_ENTRY') {
      return;
    }
    if (state === 'ROUND_INTRO') {
      this.renderField();
      if (level) this.renderBricks(level);
      this.renderRoundIntro(round ?? 1, tick);
      if (score !== undefined && lives !== undefined) this.renderHUD(score, lives, round ?? 1);
      return;
    }

    this.renderField();
    if (level && level.type === 'brick') this.renderBricks(level);
    if (vaus) this.renderVaus(vaus);
    if (balls) balls.forEach(b => this.renderBall(b));
    if (capsules) capsules.forEach(c => this.renderCapsule(c));
    if (enemies) enemies.forEach(e => this.renderEnemy(e));
    if (boss) {
      this.renderBoss(boss);
      boss.projectiles.forEach(p => this.renderProjectile(p));
    }

    if (state === 'PAUSED') {
      this.clear();
      this.renderPause();
    } else {
      if (score !== undefined && lives !== undefined) this.renderHUD(score, lives, round ?? 1);
    }
  }
}

export const renderer = new Renderer();
