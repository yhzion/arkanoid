// Main game state manager
import { StateMachine } from './stateMachine';
import { RNG } from './rng';
import { Scoring, Leaderboard } from './scoring';
import { InputManager } from '../input/input';
import { Renderer } from '../render/renderer';
import { AudioEngine } from '../audio/audio';
import { FixedStep } from './fixedStep';
import { Ball } from '../entities/ball';
import { Vaus } from '../entities/vaus';
import { Brick } from '../entities/brick';
import { Capsule, selectCapsuleType, CapsuleType } from '../entities/capsule';
import { Enemy } from '../entities/enemy';
import { Boss } from '../entities/boss';
import { getLevel, type LevelData } from '../data/levels';
import { checkWallCollision, checkBallLost, checkBallVausCollision, checkBallBrickCollision, reflectBall, deflectFromPaddle } from '../physics/collision';
import { PLAYFIELD_WIDTH, WALL_THICKNESS } from '../physics/aabb';

export class GameStateManager {
  private stateMachine: StateMachine;
  private rng: RNG;
  private scoring: Scoring;
  private leaderboard: Leaderboard;
  private input: InputManager;
  private renderer: Renderer;
  private audio: AudioEngine;
  private fixedStep: FixedStep;

  // Game entities
  private vaus!: Vaus;
  private balls: Ball[] = [];
  private bricks: Brick[] = [];
  private capsules: Capsule[] = [];
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;

  // State
  private currentRound = 1;
  private currentLevel!: LevelData;
  private previousCapsuleType: CapsuleType | null = null;
  private activePowerUp: string | null = null;
  private titleSelection = 0;
  private titleIdleTimer = 0;
  private roundClearTimer = 0;
  private lifeLostTimer = 0;
  private gameOverTimer = 0;
  private continueSelectCount = 0;
  private bossRound = 36; // US NES

  constructor(
    canvas: HTMLCanvasElement,
    input: InputManager,
    audio: AudioEngine
  ) {
    this.stateMachine = new StateMachine('TITLE');
    this.rng = new RNG(12345);
    this.scoring = new Scoring();
    this.leaderboard = new Leaderboard();
    this.input = input;
    this.renderer = new Renderer(canvas);
    this.audio = audio;
    this.fixedStep = new FixedStep(
      (tick) => this.update(tick),
      (alpha) => this.render(alpha)
    );

    this.setupStateHandlers();
  }

  start(): void {
    this.fixedStep.start();
  }

  private setupStateHandlers(): void {
    this.stateMachine.onEnter('TITLE', () => {
      this.titleIdleTimer = 0;
      this.titleSelection = 0;
    });

    this.stateMachine.onEnter('ROUND_INTRO', () => {
      this.loadRound(this.currentRound);
    });

    this.stateMachine.onEnter('BALL_READY', () => {
      this.balls = [new Ball(this.vaus.getCenterX(), this.vaus.y - 5)];
    });

    this.stateMachine.onEnter('PLAYING', () => {
      // Nothing extra needed
    });

    this.stateMachine.onEnter('LIFE_LOST', () => {
      this.lifeLostTimer = 0;
      this.activePowerUp = null;
      this.vaus.resetSize();
      this.vaus.hasLaser = false;
      this.vaus.hasCatch = false;
    });

    this.stateMachine.onEnter('ROUND_CLEAR', () => {
      this.roundClearTimer = 0;
      this.audio.playSfx('round_clear');
    });

    this.stateMachine.onEnter('GAME_OVER', () => {
      this.gameOverTimer = 0;
      this.audio.playSfx('game_over');
    });
  }

  private loadRound(round: number): void {
    this.currentLevel = getLevel(round);
    this.bricks = [];
    this.capsules = [];
    this.enemies = [];
    this.boss = null;
    this.previousCapsuleType = null;

    // Create bricks from level data
    for (const cell of this.currentLevel.cells) {
      if (cell.type !== 'EMPTY') {
        this.bricks.push(new Brick({
          col: cell.col,
          row: cell.row,
          type: cell.type as any,
          hitsRemaining: cell.hitsRemaining,
          capsule: cell.capsule,
          isCapsuleCarrier: cell.isCapsuleCarrier,
          clearRequired: cell.clearRequired,
        }));
      }
    }

    // Create boss for round 36
    if (round === this.bossRound) {
      this.boss = new Boss(112, 40);
    }

    // Reset Vaus
    this.vaus = new Vaus(104, 224);
  }

  private update(tick: number): void {
    this.input.update();
    const state = this.stateMachine.getState();

    // Handle mute toggle
    if (this.input.justPressed('mute')) {
      this.audio.toggleMute();
    }

    switch (state) {
      case 'TITLE':
        this.updateTitle(tick);
        break;
      case 'PLAYING':
      case 'BOSS_PLAYING':
        this.updatePlaying(tick);
        break;
      case 'BALL_READY':
        this.updateBallReady(tick);
        break;
      case 'LIFE_LOST':
        this.updateLifeLost(tick);
        break;
      case 'ROUND_CLEAR':
        this.updateRoundClear(tick);
        break;
      case 'GAME_OVER':
        this.updateGameOver(tick);
        break;
      case 'PAUSED':
        if (this.input.justPressed('start')) {
          this.stateMachine.transition('resume');
        }
        break;
    }
  }

  private updateTitle(_tick: number): void {
    this.titleIdleTimer++;

    // PRD §8.2: Idle timeout for story
    if (this.titleIdleTimer > 600) {
      this.stateMachine.transition('idle_timeout');
      return;
    }

    // Player selection
    if (this.input.justPressed('select')) {
      this.titleSelection = (this.titleSelection + 1) % 2;
    }

    // Start game
    if (this.input.justPressed('start')) {
      this.audio.resume();
      this.currentRound = 1;
      this.scoring.reset();
      this.stateMachine.transition('start_game');
    }

    // Continue code (A+B+Select 5 times)
    if (this.input.justPressed('select')) {
      this.continueSelectCount++;
      if (this.continueSelectCount >= 5 && this.scoring.score === 0) {
        this.stateMachine.transition('continue_code');
        this.continueSelectCount = 0;
      }
    }
  }

  private updateBallReady(_tick: number): void {
    // Move Vaus
    this.updateVausMovement();

    // Update ball position to follow Vaus
    if (this.balls.length > 0) {
      this.balls[0].x = this.vaus.getCenterX() - 2;
      this.balls[0].y = this.vaus.y - 5;
    }

    // Launch ball
    if (this.input.justPressed('fire')) {
      if (this.balls.length > 0) {
        const direction = this.vaus.getCenterX() < 128 ? 1 : -1;
        this.balls[0].launch(direction);
        this.stateMachine.transition('fire');
      }
    }

    // Level skip secret (A+Start)
    if (this.input.isPressed('fire') && this.input.justPressed('start')) {
      if (this.currentRound < 16) {
        this.currentRound++;
        this.stateMachine.transition('level_skip');
      }
    }

    // Pause
    if (this.input.justPressed('start')) {
      this.stateMachine.transition('pause');
    }
  }

  private updatePlaying(tick: number): void {
    // Pause
    if (this.input.justPressed('start')) {
      this.stateMachine.transition('pause');
      return;
    }

    // Move Vaus
    this.updateVausMovement();

    // Update balls
    for (const ball of this.balls) {
      if (!ball.active) continue;
      ball.update();

      // Wall collision
      if (checkWallCollision(ball)) {
        this.audio.playSfx('wall_hit');
      }

      // Ball lost
      if (checkBallLost(ball)) {
        ball.active = false;
      }

      // Vaus collision
      if (checkBallVausCollision(ball, this.vaus)) {
        if (this.vaus.hasCatch && !this.vaus.caughtBall) {
          ball.held = true;
          this.vaus.caughtBall = true;
        } else {
          deflectFromPaddle(ball, this.vaus);
          this.audio.playSfx('paddle_hit');
        }
      }

      // Brick collision
      const brickHit = checkBallBrickCollision(ball, this.bricks);
      if (brickHit) {
        const { brick, normal } = brickHit;
        reflectBall(ball, normal);

        if (brick.hit()) {
          this.scoring.addScore(brick.getScore(this.currentRound));
          this.audio.playSfx('brick_hit');

          // Spawn capsule
          if (brick.isCapsuleCarrier && this.getActiveBallCount() === 1) {
            const capsuleType = selectCapsuleType(
              () => this.rng.next(),
              this.previousCapsuleType
            );
            this.capsules.push(new Capsule(brick.x, brick.y, capsuleType));
            this.previousCapsuleType = capsuleType;
          }
        } else {
          this.audio.playSfx('ball_hit');
        }
      }

      // Boss collision
      if (this.boss && this.boss.active) {
        if (this.ballHitsAABB(ball, this.boss)) {
          if (this.boss.hit()) {
            this.scoring.addScore(this.boss.getDefeatScore());
            this.stateMachine.transition('boss_defeated');
          } else {
            this.scoring.addScore(this.boss.getHitScore());
          }
          reflectBall(ball, { x: 0, y: 1 });
          this.audio.playSfx('ball_hit');
        }
      }

      // Enemy collision
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        if (this.ballHitsAABB(ball, enemy)) {
          enemy.active = false;
          this.scoring.addScore(enemy.getScore());
          reflectBall(ball, { x: 0, y: 1 });
          this.audio.playSfx('brick_hit');
        }
      }
    }

    // Remove inactive balls
    this.balls = this.balls.filter((b) => b.active);

    // Check all balls lost
    if (this.balls.length === 0) {
      this.stateMachine.transition('all_balls_lost');
      return;
    }

    // Update capsules
    for (const capsule of this.capsules) {
      capsule.update();

      // Collect capsule
      if (this.ballHitsAABB(capsule as any, this.vaus)) {
        this.applyCapsule(capsule.type);
        this.scoring.addScore(capsule.getScore());
        capsule.active = false;
        this.audio.playSfx('capsule');
      }

      // Despawn at bottom
      if (capsule.y > 240) {
        capsule.active = false;
      }
    }
    this.capsules = this.capsules.filter((c) => c.active);

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update();
    }

    // Spawn enemies
    if (this.enemies.length < 3 && tick % 480 === 0) {
      const x = Math.random() > 0.5 ? 8 : 184;
      this.enemies.push(new Enemy(x, 8, 'Konerd'));
    }

    // Update boss
    if (this.boss) {
      this.boss.update();

      // Check boss projectiles vs Vaus
      for (const p of this.boss.projectiles) {
        if (this.pointHitsAABB(p.x, p.y, this.vaus)) {
          this.boss.projectiles = this.boss.projectiles.filter((pp) => pp !== p);
          this.stateMachine.transition('all_balls_lost');
          break;
        }
      }
    }

    // Check round clear
    if (this.isRoundCleared()) {
      this.stateMachine.transition('round_cleared');
    }

    // Check break warp
    if (this.activePowerUp === 'B' && this.vaus.x + this.vaus.w >= WALL_THICKNESS + PLAYFIELD_WIDTH - 8) {
      this.scoring.addScore(10000);
      this.stateMachine.transition('break_warp_entered');
    }
  }

  private updateLifeLost(_tick: number): void {
    this.lifeLostTimer++;
    if (this.lifeLostTimer > 120) { // 2 seconds
      if (this.scoring.loseLife()) {
        this.stateMachine.transition('lives_remain');
      } else {
        this.stateMachine.transition('no_lives');
      }
    }
  }

  private updateRoundClear(_tick: number): void {
    this.roundClearTimer++;
    if (this.roundClearTimer > 120) { // 2 seconds
      this.currentRound++;
      if (this.currentRound === this.bossRound) {
        this.stateMachine.transition('boss_next');
      } else {
        this.stateMachine.transition('next_round');
      }
    }
  }

  private updateGameOver(_tick: number): void {
    this.gameOverTimer++;
    if (this.gameOverTimer > 300) { // 5 seconds
      if (this.leaderboard.qualifies(this.scoring.score)) {
        this.stateMachine.transition('qualifies_leaderboard');
      } else {
        this.stateMachine.transition('timeout');
      }
    }
  }

  private updateVausMovement(): void {
    const speed = 2;
    if (this.input.isPressed('left')) {
      this.vaus.update(-speed);
    }
    if (this.input.isPressed('right')) {
      this.vaus.update(speed);
    }

    // Mouse/pointer control
    const pointerX = this.input.getPointerX();
    const canvasRect = (this.renderer as any).canvas.getBoundingClientRect();
    const relativeX = (pointerX - canvasRect.left) / canvasRect.width * 256;
    this.vaus.x = Math.max(8, Math.min(192 - this.vaus.w, relativeX - this.vaus.w / 2));
  }

  private applyCapsule(type: CapsuleType): void {
    // PRD §12.1: P capsule preserves current effect
    if (type === 'P') {
      this.scoring.lives++;
      return;
    }

    // Cancel previous effect
    this.vaus.resetSize();
    this.vaus.hasLaser = false;
    this.vaus.hasCatch = false;
    this.activePowerUp = null;

    switch (type) {
      case 'S': // Slow
        for (const ball of this.balls) {
          ball.setSpeed(1.5);
        }
        break;
      case 'C': // Catch
        this.vaus.hasCatch = true;
        break;
      case 'L': // Laser
        this.vaus.hasLaser = true;
        break;
      case 'D': // Disruption
        if (this.balls.length === 1) {
          const ball = this.balls[0];
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          const angle = Math.atan2(ball.vy, ball.vx);
          this.balls.push(
            new Ball(ball.x, ball.y, speed),
            new Ball(ball.x, ball.y, speed)
          );
          this.balls[1].vx = Math.cos(angle + 0.26) * speed;
          this.balls[1].vy = Math.sin(angle + 0.26) * speed;
          this.balls[2].vx = Math.cos(angle - 0.26) * speed;
          this.balls[2].vy = Math.sin(angle - 0.26) * speed;
          this.balls[1].held = false;
          this.balls[2].held = false;
        }
        break;
      case 'E': // Enlarge
        this.vaus.enlarge();
        break;
      case 'B': // Break
        this.activePowerUp = 'B';
        break;
    }
  }

  private isRoundCleared(): boolean {
    return this.bricks.every((b) => !b.clearRequired || b.destroyed);
  }

  private getActiveBallCount(): number {
    return this.balls.filter((b) => b.active).length;
  }

  private ballHitsAABB(ball: Ball, target: { x: number; y: number; w: number; h: number }): boolean {
    return (
      ball.x < target.x + target.w &&
      ball.x + ball.w > target.x &&
      ball.y < target.y + target.h &&
      ball.y + ball.h > target.y
    );
  }

  private pointHitsAABB(px: number, py: number, target: { x: number; y: number; w: number; h: number }): boolean {
    return px >= target.x && px < target.x + target.w && py >= target.y && py < target.y + target.h;
  }

  private render(_alpha: number): void {
    this.renderer.clear();
    this.renderer.drawWalls();

    const state = this.stateMachine.getState();

    switch (state) {
      case 'TITLE':
        this.renderer.drawTitleScreen();
        break;
      case 'PLAYING':
      case 'BALL_READY':
      case 'BOSS_PLAYING':
        this.renderGameplay();
        break;
      case 'PAUSED':
        this.renderGameplay();
        this.renderer.drawText('PAUSED', 100, 120);
        break;
      case 'GAME_OVER':
        this.renderer.drawGameOver();
        break;
      case 'ENDING':
        this.renderer.drawEnding();
        break;
    }
  }

  private renderGameplay(): void {
    // Draw bricks
    for (const brick of this.bricks) {
      this.renderer.drawBrick(brick);
    }

    // Draw capsules
    for (const capsule of this.capsules) {
      this.renderer.drawCapsule(capsule);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.renderer.drawEnemy(enemy);
    }

    // Draw boss
    if (this.boss) {
      this.renderer.drawBoss(this.boss);
    }

    // Draw Vaus
    this.renderer.drawVaus(this.vaus);

    // Draw balls
    for (const ball of this.balls) {
      this.renderer.drawBall(ball);
    }

    // Draw HUD
    this.renderer.drawHUD(this.scoring.score, this.scoring.lives, this.currentRound);
  }
}