import { VausState } from '../entities/vaus';
import { BallState } from '../entities/ball';
import { IBrickCell, BrickType } from '../data/levelSchema';
import { CapsuleState, CAPSULE_WIDTH, CAPSULE_HEIGHT } from '../entities/capsules';
import { EnemyState } from '../entities/enemies';
import { BossState, BossProjectile } from '../entities/boss';

const BRICK_COLORS: Record<BrickType, string> = {
  EMPTY: 'transparent', WHITE: '#ffffff', ORANGE: '#ff8800', LIGHT_BLUE: '#88ccff',
  GREEN: '#00cc00', RED: '#ff0000', BLUE: '#0044ff', PINK: '#ff88cc',
  YELLOW: '#ffff00', SILVER: '#aaaaaa', GOLD: '#ffcc00',
};

const CAPSULE_COLORS: Record<string, string> = {
  S: '#ff8800', C: '#ffff00', L: '#ff0000', D: '#88ccff',
  P: '#888888', E: '#0044ff', B: '#ff88cc',
};

const BW = 16;
const BH = 8;
const GRID_ORIGIN_X = 16;
const GRID_ORIGIN_Y = 16;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private w = 256;
  private h = 240;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() { this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.w, this.h); }

  drawWalls() {
    this.ctx.fillStyle = '#444';
    this.ctx.fillRect(0, 0, 8, 240);
    this.ctx.fillRect(192, 0, 8, 240);
    this.ctx.fillRect(0, 0, 200, 8);
  }

  drawBricks(cells: IBrickCell[]) {
    for (const cell of cells) {
      if (cell.type === 'EMPTY') continue;
      this.ctx.fillStyle = BRICK_COLORS[cell.type];
      const x = GRID_ORIGIN_X + cell.col * BW;
      const y = GRID_ORIGIN_Y + cell.row * BH;
      this.ctx.fillRect(x, y, BW - 1, BH - 1);
      if (cell.type === 'SILVER' && cell.hitsRemaining > 1) {
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(x + 2, y + 1, 2, 2);
      }
    }
  }

  drawVaus(v: VausState) {
    this.ctx.fillStyle = v.hasLaser ? '#ff4444' : v.hasCatch ? '#ffff44' : v.enlarged ? '#44ff44' : '#4488ff';
    this.ctx.fillRect(v.x, v.y, v.width, v.height);
  }

  drawBall(b: BallState) {
    if (!b.active) return;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  drawCapsule(c: CapsuleState) {
    if (!c.active) return;
    this.ctx.fillStyle = CAPSULE_COLORS[c.type] || '#fff';
    this.ctx.fillRect(c.x, c.y, CAPSULE_WIDTH, CAPSULE_HEIGHT);
    this.ctx.fillStyle = '#000';
    this.ctx.font = '6px monospace';
    this.ctx.fillText(c.type, c.x + 5, c.y + 6);
  }

  drawEnemy(e: EnemyState) {
    if (!e.active) return;
    const colors: Record<string, string> = { konerd: '#ff00ff', pyradok: '#00ffff', trisph: '#ff8800', opopo: '#88ff00' };
    this.ctx.fillStyle = colors[e.type] || '#fff';
    this.ctx.fillRect(e.x, e.y, e.width, e.height);
  }

  drawBoss(b: BossState) {
    if (!b.active) return;
    this.ctx.fillStyle = b.defeated ? '#ff0000' : '#884400';
    this.ctx.fillRect(b.x, b.y, b.width, b.height);
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(b.x + 20, b.y + 30, 24, 12);
  }

  drawBossProjectile(p: BossProjectile) {
    if (!p.active) return;
    this.ctx.fillStyle = '#ff4400';
    this.ctx.fillRect(p.x, p.y, p.width, p.height);
  }

  drawLaser(x: number, y: number) {
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(x, y, 2, 8);
  }

  drawBreakExit(x: number, y: number) {
    this.ctx.fillStyle = '#ff00ff';
    this.ctx.fillRect(x, y, 8, 24);
  }

  drawHUD(score: number, lives: number, round: number) {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px monospace';
    this.ctx.fillText(`SCORE`, 204, 20);
    this.ctx.fillText(`${score}`, 204, 32);
    this.ctx.fillText(`ROUND`, 204, 56);
    this.ctx.fillText(`${round}`, 216, 68);
    this.ctx.fillText(`LIVES`, 204, 92);
    for (let i = 0; i < lives; i++) {
      this.ctx.fillStyle = '#4488ff';
      this.ctx.fillRect(204 + i * 10, 98, 8, 4);
    }
  }

  drawTitle(playerCount: number, idleTick: number) {
    this.clear();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('ARKANOID', 80, 60);
    this.ctx.font = '8px monospace';
    this.ctx.fillText('CLEAN-ROOM HOMAGE', 64, 80);
    this.ctx.fillStyle = playerCount === 1 ? '#ffff00' : '#888';
    this.ctx.fillText('> 1 PLAYER', 88, 130);
    this.ctx.fillStyle = playerCount === 2 ? '#ffff00' : '#888';
    this.ctx.fillText('> 2 PLAYERS', 84, 145);
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText('PRESS ENTER TO START', 64, 190);
    this.ctx.fillText('SHIFT TO SELECT', 80, 205);
    if (idleTick > 300) {
      this.ctx.fillStyle = '#666';
      this.ctx.fillText('DEMO INCOMING...', 80, 230);
    }
  }

  drawOpeningStory(tick: number) {
    this.clear();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '7px monospace';
    const lines = [
      'After the mother flagship was',
      'destroyed in a cosmic ambush,',
      'the escape pod "Vaus" launched',
      'into the void.',
      '',
      'However, it was instantly',
      'ensnared in a localized',
      'space-time anomaly, warped',
      'by an unknown entity...',
    ];
    const visibleLines = Math.min(lines.length, Math.floor(tick / 60));
    for (let i = 0; i < visibleLines; i++) {
      this.ctx.fillText(lines[i], 20, 40 + i * 16);
    }
  }

  drawRoundIntro(round: number) {
    this.clear();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`ROUND ${round}`, 88, 120);
  }

  drawPaused() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('PAUSED', 96, 120);
    this.ctx.font = '8px monospace';
    this.ctx.fillText('ENTER TO RESUME', 72, 145);
  }

  drawLifeLost() {
    this.ctx.fillStyle = 'rgba(255,0,0,0.3)';
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  drawRoundClear(round: number) {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText(`ROUND ${round} CLEAR!`, 68, 120);
  }

  drawGameOver(score: number) {
    this.clear();
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('GAME OVER', 76, 100);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px monospace';
    this.ctx.fillText(`FINAL SCORE: ${score}`, 64, 130);
  }

  drawNameEntry(initials: string[], cursorPos: number, score: number) {
    this.clear();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('HIGH SCORE!', 84, 60);
    this.ctx.fillText(`${score}`, 100, 80);
    this.ctx.font = '16px monospace';
    for (let i = 0; i < 3; i++) {
      this.ctx.fillStyle = i === cursorPos ? '#ffff00' : '#fff';
      this.ctx.fillText(initials[i] || '_', 100 + i * 20, 130);
    }
    this.ctx.fillStyle = '#888';
    this.ctx.font = '7px monospace';
    this.ctx.fillText('TYPE A-Z, ENTER TO CONFIRM', 48, 170);
  }

  drawBossIntro() {
    this.clear();
    this.ctx.fillStyle = '#ff4400';
    this.ctx.font = '12px monospace';
    this.ctx.fillText('DIMENSIONAL FORTRESS', 40, 100);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px monospace';
    this.ctx.fillText('DESTROY DOH!', 80, 130);
  }

  drawBossDefeated(tick: number) {
    this.ctx.fillStyle = `rgba(255,${Math.floor(tick * 3) % 256},0,0.4)`;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('DOH DEFEATED!', 72, 120);
  }

  drawEnding(tick: number) {
    this.clear();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '7px monospace';
    const lines = [
      'The dimensional fortress has',
      'collapsed and space-time has',
      'stabilized.',
      '',
      'The Vaus escapes the warp,',
      'but its cosmic odyssey in',
      'the galaxy has only begun...',
    ];
    const visible = Math.min(lines.length, Math.floor(tick / 90));
    for (let i = 0; i < visible; i++) {
      this.ctx.fillText(lines[i], 20, 50 + i * 16);
    }
    if (tick > 600) {
      this.ctx.font = '12px monospace';
      this.ctx.fillText('THE END', 92, 200);
    }
  }

  drawGameplayDemo() {
    this.clear();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('GAMEPLAY DEMO', 68, 120);
    this.ctx.font = '7px monospace';
    this.ctx.fillText('PRESS ANY KEY', 80, 150);
  }

  drawTurnHandoff(player: number) {
    this.clear();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`PLAYER ${player}`, 88, 120);
  }

  drawBreakWarp() {
    this.ctx.fillStyle = 'rgba(128,0,255,0.3)';
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('WARP!', 104, 120);
  }
}
