import { GameState, GameStateType, PlayerState } from './gameState';
import { GameEvent, EventBus } from './eventBus';
import { InputSnapshot } from '../input/input';
import { Vaus, VAUS_NORMAL_WIDTH, PLAYFIELD_LEFT, PLAYFIELD_RIGHT, VAUS_Y_POS } from '../entities/vaus';
import { BallState, createBall, attachBallToVaus, launchBall, deflectBall, updateBall, ballAABB, BASE_BALL_SPEED, SLOW_BALL_SPEED, MAX_BALL_SPEED, CEILING_SPEED_STEP, BRICK_HIT_SPEED_STEP, BALL_SIZE } from '../entities/ball';
import { BrickGridCell, GRID_COLS, GRID_ROWS, GRID_ORIGIN_X, GRID_ORIGIN_Y, BRICK_WIDTH, BRICK_HEIGHT } from '../entities/bricks';
import { capsuleWeightedRoll, applyCapsuleEffect } from '../entities/capsules';
import { aabbOverlap, aabbCollision, faceCollision, AABB } from '../physics/collision';
import { Fx, fx, fxAbs, fxFloor, fxMul, fxToFloat, fxClamp, FX_ONE, FX_NEG_ONE } from '../physics/fixedPoint';
import { AssetLoader } from '../loaders/assetLoader';
import { qualifiesForLeaderboard } from '../data/persistence';

const TITLE_IDLE_TICKS = 600;
const DEMO_TICKS = 600;
const CATCH_AUTO_RELEASE = 360;
const MAX_LASER_PAIRS = 2;
const LASER_COOLDOWN = 15;
const COOLDOWN_TICKS = 60;

export class StateMachine {
  private state: GameState;
  private loader: AssetLoader;
  private timers: Map<string, number> = new Map();
  private lasers: { x: number; y: number; active: boolean }[] = [];
  private loadingLevel = false;

  constructor(state: GameState) {
    this.state = state;
    this.loader = new AssetLoader();
  }

  handleTick(tick: number, input: InputSnapshot): void {
    this.state.tick = tick;
    const s = this.state.state;

    switch (s) {
      case 'BOOT':
        this.transition('TITLE');
        this.state.eventBus.emit(GameEvent.TITLE_SHOWN, {});
        this.state.eventBus.emit(GameEvent.APP_BOOTED, {});
        break;
      case 'TITLE':
        this.updateTitle(input);
        break;
      case 'OPENING_STORY':
        this.updateOpening(input);
        break;
      case 'GAMEPLAY_DEMO':
        this.updateDemo(input);
        break;
      case 'ROUND_INTRO':
        this.updateRoundIntro(input);
        break;
      case 'BALL_READY':
        this.updateBallReady(input);
        break;
      case 'PLAYING':
        this.updatePlaying(tick, input);
        break;
      case 'PAUSED':
        this.updatePaused(input);
        break;
      case 'LIFE_LOST':
        this.updateLifeLost(input);
        break;
      case 'ROUND_CLEAR':
        this.updateRoundClear(input);
        break;
      case 'BREAK_WARP':
        this.updateBreakWarp(input);
        break;
      case 'GAME_OVER':
        this.updateGameOver(input);
        break;
      case 'NAME_ENTRY':
        this.updateNameEntry(input);
        break;
      case 'BOSS_INTRO':
        this.updateBossIntro(input);
        break;
      case 'BOSS_PLAYING':
        this.updateBossPlaying(tick, input);
        break;
      case 'BOSS_DEFEATED':
        this.updateBossDefeated(input);
        break;
      case 'ENDING':
        this.updateEnding(input);
        break;
    }
  }

  private transition(target: GameStateType): void {
    this.state.setState(target);
  }

  private continueSelectCount = 0;

  private updateTitle(input: InputSnapshot): void {
    const timer = this.getTimer('titleIdle');
    if (timer >= TITLE_IDLE_TICKS) {
      this.state.storyExit = 'idle';
      this.transition('OPENING_STORY');
      this.resetTimer('titleIdle');
      return;
    }
    this.incTimer('titleIdle');

    if (input.select) {
      this.state.config.enableTwoPlayerMode = !this.state.config.enableTwoPlayerMode;
      this.state.eventBus.emit(GameEvent.PLAYER_COUNT_CHANGED, { count: this.state.config.enableTwoPlayerMode ? 2 : 1 });
    }

    if (input.start) {
      this.state.storyExit = 'newGame';
      this.state.resetPlayer();
      this.startLevelLoad();
      this.state.eventBus.emit(GameEvent.GAME_STARTED, {});
      this.resetTimer('titleIdle');
    }
  }

  private updateOpening(input: InputSnapshot): void {
    const timer = this.getTimer('opening');
    if (this.state.storyExit === 'idle') {
      if (timer >= TITLE_IDLE_TICKS || input.fire || input.start || input.left || input.right) {
        if (timer >= TITLE_IDLE_TICKS && !input.fire && !input.start && !input.left && !input.right) {
          this.transition('GAMEPLAY_DEMO');
        } else {
          this.transition('TITLE');
        }
        this.resetTimer('opening');
        return;
      }
      this.incTimer('opening');
    } else {
      if (timer >= TITLE_IDLE_TICKS || input.fire || input.start) {
        this.startLevelLoad();
        this.resetTimer('opening');
        return;
      }
      this.incTimer('opening');
    }
  }

  private updateDemo(input: InputSnapshot): void {
    const timer = this.getTimer('demo');
    if (timer >= DEMO_TICKS || input.fire || input.start || input.left || input.right) {
      this.transition('TITLE');
      this.resetTimer('demo');
      return;
    }
    this.incTimer('demo');
  }

  private updateRoundIntro(input: InputSnapshot): void {
    if (this.loadingLevel) return;
    const timer = this.getTimer('roundIntro');
    if (timer >= COOLDOWN_TICKS) {
      this.transition('BALL_READY');
      this.state.eventBus.emit(GameEvent.ROUND_STARTED, { round: this.state.player.round });
      this.resetTimer('roundIntro');
      return;
    }
    if (this.state.config.enableManualLevelSkipSecret && input.start && this.state.player.round < 16) {
      if (input.fire) {
        this.state.player.round = Math.min(this.state.player.round + 1, 16);
        this.resetTimer('roundIntro');
        return;
      }
    }
    this.incTimer('roundIntro');
  }

  private updateBallReady(input: InputSnapshot): void {
    const p = this.state.player;
    if (p.balls.length === 0) {
      const ball = createBall();
      attachBallToVaus(ball, p.vaus);
      p.balls = [ball];
    }
    this.moveVaus(input);
    for (const b of p.balls) {
      if (b.caught) attachBallToVaus(b, p.vaus);
    }
    if (input.fire) {
      for (const b of p.balls) {
        if (b.caught) {
          launchBall(b, p.vaus);
          this.state.eventBus.emit(GameEvent.BALL_LAUNCHED, {});
        }
      }
      this.transition('PLAYING');
    }
    if (this.state.config.enableManualLevelSkipSecret && input.start && input.fire) {
      this.skipLevel();
    }
  }

  private updatePlaying(tick: number, input: InputSnapshot): void {
    this.moveVaus(input);
    this.handleLaser(input);
    this.state.player.enemies.update(tick);
    this.handleBallMovement();
    this.handleCapsules();
    this.state.player.tickSinceCatch++;
    if (this.state.player.activePowerUp === 'C') {
      for (const b of this.state.player.balls) {
        if (b.caught && this.state.player.tickSinceCatch >= CATCH_AUTO_RELEASE) {
          launchBall(b, this.state.player.vaus);
          this.state.player.tickSinceCatch = 0;
        }
      }
    }
    if (this.state.player.bricks.checkClear()) {
      this.transition('ROUND_CLEAR');
      this.state.eventBus.emit(GameEvent.ROUND_CLEARED, { round: this.state.player.round });
      return;
    }
    this.checkBreakWarp();
  }

  private checkBreakWarp(): void {
    const p = this.state.player;
    if (!p.vaus.hasBreak) return;
    if (p.round >= this.state.bossRound) return;
    const vausRight = fxFloor(p.vaus.x) + p.vaus.width;
    if (vausRight >= 248) {
      this.state.scoring.add(10000, 'break-warp');
      this.transition('BREAK_WARP');
      this.state.eventBus.emit(GameEvent.BREAK_WARP_ENTERED, {});
    }
  }

  private handleBallMovement(): void {
    const p = this.state.player;
    const balls = p.balls;
    let activeCount = 0;

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i]!;
      if (!b.active) continue;
      activeCount++;

      updateBall(b);
      this.handleBallWallCollision(b);
      this.handleBallVausCollision(b);

      const brickResult = this.handleBallBrickCollision(b);
      if (brickResult) {
        this.state.scoring.add(brickResult.points, 'brick');
        this.state.eventBus.emit(GameEvent.BRICK_HIT, {});
        if (brickResult.destroyed) {
          this.state.eventBus.emit(GameEvent.BRICK_DESTROYED, {
            row: brickResult.row, col: brickResult.col,
            type: brickResult.type, scoreDelta: brickResult.points,
          });
        }
      }

      this.handleBallEnemyCollision(b);

      if (fxFloor(b.y) > 240) {
        b.active = false;
        activeCount--;
        this.state.eventBus.emit(GameEvent.BALL_LOST, { ballsRemaining: activeCount });
      }
    }

    const stillActive = balls.filter(b => b.active);
    if (stillActive.length === 0) {
      p.lives--;
      this.state.eventBus.emit(GameEvent.LIFE_LOST, { livesRemaining: p.lives });
      if (p.lives <= 0) {
        this.transition('GAME_OVER');
        this.state.eventBus.emit(GameEvent.GAME_OVER, {});
      } else {
        this.transition('LIFE_LOST');
      }
    }
  }

  private handleBallWallCollision(b: BallState): void {
    const x = fxFloor(b.x);
    const y = fxFloor(b.y);
    if (x <= 8) {
      b.x = fx(9);
      b.vx = fxAbs(b.vx);
    } else if (x + BALL_SIZE >= 248) {
      b.x = fx(247 - BALL_SIZE);
      b.vx = -fxAbs(b.vx);
    }
    if (y <= 8) {
      b.y = fx(9);
      b.vy = fxAbs(b.vy);
      if (!b.ceilingHitUsed) {
        b.speed = fx(fxToFloat(b.speed) + CEILING_SPEED_STEP);
        if (fxToFloat(b.speed) >= MAX_BALL_SPEED) b.speed = fx(MAX_BALL_SPEED);
        const speed = fxToFloat(b.speed);
        const vx = fxToFloat(b.vx);
        const vy = fxToFloat(b.vy);
        const len = Math.sqrt(vx * vx + vy * vy);
        if (len > 0) {
          b.vx = fx(vx / len * speed);
          b.vy = fx(vy / len * speed);
        }
        b.ceilingHitUsed = true;
      }
    }
  }

  private handleBallVausCollision(b: BallState): void {
    const p = this.state.player;
    const bAABB: AABB = { x: b.x, y: b.y, w: BALL_SIZE, h: BALL_SIZE };
    const vAABB = p.vaus.aabb;

    if (aabbOverlap(bAABB, vAABB) && b.vy > 0) {
      if (p.activePowerUp === 'C') {
        b.vx = fx(0);
        b.vy = fx(0);
        b.caught = true;
        b.active = false;
        p.tickSinceCatch = 0;
        return;
      }
      deflectBall(b, p.vaus, this.state.config.deflectionModel);
    }
  }

  private handleBallBrickCollision(b: BallState): { destroyed: boolean; points: number; row: number; col: number; type: string } | null {
    const bAABB: AABB = { x: b.x, y: b.y, w: BALL_SIZE, h: BALL_SIZE };
    const bm = this.state.player.bricks;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = bm.grid[row]![col]!;
        if (cell.type === 'EMPTY') continue;
        const brickAABB = bm.getAABB(col, row);
        const result = faceCollision(bAABB, brickAABB);
        if (result.collided) {
          const hitResult = bm.hit(col, row);
          if (hitResult.destroyed) {
            const points = hitResult.points;
            let totalPoints = points;
            if (cell.type === 'SILVER') {
              totalPoints = 50 * this.state.player.round;
            }
            this.state.scoring.add(totalPoints, 'brick');
            if (cell.isCapsuleCarrier) {
              this.spawnCapsule(col, row);
            }
            if (cell.type !== 'SILVER' && cell.type !== 'GOLD' && cell.clearRequired) {
              b.speedHits++;
              if (b.speedHits % 10 === 0) {
                b.speed = fx(fxToFloat(b.speed) + BRICK_HIT_SPEED_STEP);
                if (fxToFloat(b.speed) >= MAX_BALL_SPEED) b.speed = fx(MAX_BALL_SPEED);
              }
            }
          }
          this.reflectBall(b, result.face);
          return { destroyed: hitResult.destroyed, points: hitResult.points, row, col, type: cell.type };
        }
      }
    }
    return null;
  }

  private reflectBall(b: BallState, face: string): void {
    if (face === 'top' || face === 'bottom') {
      b.vy = -b.vy;
    } else if (face === 'left' || face === 'right') {
      b.vx = -b.vx;
    } else {
      b.vy = -b.vy;
      b.vx = -b.vx;
    }
  }

  private handleBallEnemyCollision(b: BallState): void {
    for (const enemy of this.state.player.enemies.active) {
      if (!enemy.active) continue;
      const eAABB: AABB = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      const bAABB: AABB = { x: b.x, y: b.y, w: BALL_SIZE, h: BALL_SIZE };
      if (aabbOverlap(bAABB, eAABB)) {
        enemy.active = false;
        this.state.scoring.add(100, 'enemy');
        this.state.eventBus.emit(GameEvent.ENEMY_DESTROYED, { points: 100 });
        const cr = faceCollision(bAABB, eAABB);
        if (cr.collided) this.reflectBall(b, cr.face);
        break;
      }
    }
  }

  private handleLaser(input: InputSnapshot): void {
    if (this.state.player.activePowerUp !== 'L') return;
    if (!input.fire) return;
    if (this.state.player.vaus.fireCooldown > 0) {
      this.state.player.vaus.fireCooldown--;
      return;
    }
    const activeLasers = this.lasers.filter(l => l.active).length;
    if (activeLasers >= MAX_LASER_PAIRS * 2) return;

    const vx = fxFloor(this.state.player.vaus.x);
    const vy = fxFloor(this.state.player.vaus.y);
    this.lasers.push({ x: vx + 4, y: vy, active: true });
    this.lasers.push({ x: vx + this.state.player.vaus.width - 4, y: vy, active: true });
    this.state.player.vaus.fireCooldown = LASER_COOLDOWN;
    this.state.eventBus.emit(GameEvent.LASER_FIRED, {});
  }

  private updateLasers(): void {
    for (const laser of this.lasers) {
      if (!laser.active) continue;
      laser.y -= 4;
      if (laser.y < 8) {
        laser.active = false;
        continue;
      }
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const cell = this.state.player.bricks.grid[row]![col]!;
          if (cell.type === 'EMPTY' || cell.type === 'GOLD') continue;
          const bx = GRID_ORIGIN_X + col * BRICK_WIDTH;
          const by = GRID_ORIGIN_Y + row * BRICK_HEIGHT;
          if (laser.x >= bx && laser.x <= bx + BRICK_WIDTH && laser.y >= by && laser.y <= by + BRICK_HEIGHT) {
            const hit = this.state.player.bricks.hit(col, row);
            if (hit.destroyed) {
              this.state.scoring.add(hit.points, 'laser');
              this.state.eventBus.emit(GameEvent.BRICK_DESTROYED, {
                row, col, type: cell.type, scoreDelta: hit.points,
              });
            }
            laser.active = false;
            break;
          }
        }
        if (!laser.active) break;
      }
    }
    this.lasers = this.lasers.filter(l => l.active);
  }

  private spawnCapsule(col: number, row: number): void {
    const p = this.state.player;
    const multiBallActive = p.balls.filter(b => b.active).length > 1;
    if (multiBallActive) return;

    const type = capsuleWeightedRoll(
      p.capsulePrevious,
      () => Math.floor(this.state.rng.next() / (4294967296 / 7)),
    );
    p.capsulePrevious = type;
    const x = GRID_ORIGIN_X + col * BRICK_WIDTH;
    const y = GRID_ORIGIN_Y + row * BRICK_HEIGHT;
    p.capsules.spawn(type, x, y);
    this.state.eventBus.emit(GameEvent.CAPSULE_SPAWNED, { type });
  }

  private handleCapsules(): void {
    const p = this.state.player;
    p.capsules.update();
    const collected = p.capsules.checkVausCollision(p.vaus);
    if (collected) {
      this.state.scoring.add(100, 'capsule');
      this.state.eventBus.emit(GameEvent.CAPSULE_COLLECTED, { type: collected.type });
      applyCapsuleEffect(collected.type, this.state);
      this.state.eventBus.emit(GameEvent.POWERUP_ACTIVATED, { type: collected.type });
    }
    this.updateLasers();
  }

  private updatePaused(input: InputSnapshot): void {
    if (input.start) {
      this.transition(this.state.pausedFrom || 'PLAYING');
      this.state.pausedFrom = null;
    }
  }

  private updateLifeLost(input: InputSnapshot): void {
    const timer = this.getTimer('lifeLost');
    if (timer >= COOLDOWN_TICKS) {
      this.state.player.balls = [];
      this.state.player.vaus.reset();
      this.transition('BALL_READY');
      this.resetTimer('lifeLost');
      return;
    }
    this.incTimer('lifeLost');
  }

  private updateRoundClear(input: InputSnapshot): void {
    const timer = this.getTimer('roundClear');
    if (timer >= COOLDOWN_TICKS) {
      this.state.player.round++;
      this.state.player.vaus.resetPowerups();
      this.state.player.activePowerUp = null;
      this.state.player.capsulePrevious = null;
      if (this.state.player.round === this.state.bossRound) {
        this.transition('BOSS_INTRO');
      } else {
        this.startLevelLoad();
      }
      this.resetTimer('roundClear');
      return;
    }
    this.incTimer('roundClear');
  }

  private updateBreakWarp(input: InputSnapshot): void {
    const timer = this.getTimer('breakWarp');
    if (timer >= COOLDOWN_TICKS) {
      this.state.player.round++;
      this.state.player.vaus.resetPowerups();
      this.state.player.activePowerUp = null;
      this.state.player.boss = null;
      if (this.state.player.round === this.state.bossRound) {
        this.transition('BOSS_INTRO');
      } else {
        this.startLevelLoad();
      }
      this.resetTimer('breakWarp');
      return;
    }
    this.incTimer('breakWarp');
  }

  private updateGameOver(input: InputSnapshot): void {
    const timer = this.getTimer('gameOver');

    if (input.fire && input.select && this.state.player.round < this.state.bossRound) {
      this.continueSelectCount++;
      if (this.continueSelectCount >= 5) {
        this.continueSelectCount = 0;
        this.state.scoring.reset();
        this.state.scoring.setHighScore(Math.max(this.state.scoring.highScore, 0));
        this.startLevelLoad();
        this.resetTimer('gameOver');
        return;
      }
    } else if (!input.fire) {
      this.continueSelectCount = 0;
    }

    if (timer >= COOLDOWN_TICKS * 2) {
      this.state.scoring.setHighScore(Math.max(this.state.scoring.highScore, this.state.scoring.score));
      if (this.state.config.enableHighScoreNameEntry && qualifiesForLeaderboard(this.state.scoring.score)) {
        this.transition('NAME_ENTRY');
        this.state.eventBus.emit(GameEvent.NAME_ENTRY_STARTED, {});
      } else {
        this.transition('TITLE');
        this.state.eventBus.emit(GameEvent.RETURNED_TO_TITLE, {});
      }
      this.resetTimer('gameOver');
      return;
    }
    this.incTimer('gameOver');
  }

  private updateNameEntry(input: InputSnapshot): void {
    const timer = this.getTimer('nameEntry');
    if (timer >= COOLDOWN_TICKS * 4 || input.start) {
      this.transition('TITLE');
      this.state.eventBus.emit(GameEvent.RETURNED_TO_TITLE, {});
      this.resetTimer('nameEntry');
      return;
    }
    this.incTimer('nameEntry');
  }

  private updateBossIntro(input: InputSnapshot): void {
    const timer = this.getTimer('bossIntro');
    if (timer >= COOLDOWN_TICKS * 2) {
      const boss = this.state.player.boss;
      if (boss) boss.reset();
      this.transition('BOSS_PLAYING');
      this.state.eventBus.emit(GameEvent.BOSS_STARTED, {});
      this.resetTimer('bossIntro');
      return;
    }
    this.incTimer('bossIntro');
  }

  private updateBossPlaying(tick: number, input: InputSnapshot): void {
    this.moveVaus(input);
    const boss = this.state.player.boss;
    if (!boss) return;
    boss.update(this.state.player.vaus);
    this.checkBossProjectileCollision();

    for (const b of this.state.player.balls) {
      if (!b.active) continue;
      updateBall(b);
      this.handleBallWallCollision(b);
      this.handleBallVausCollision(b);

      const bAABB: AABB = { x: b.x, y: b.y, w: BALL_SIZE, h: BALL_SIZE };
      if (aabbOverlap(bAABB, boss.aabb)) {
        if (b.vy > 0) {
          const hit = boss.registerHit();
          if (hit) {
            this.state.scoring.add(1000, 'boss');
            this.state.eventBus.emit(GameEvent.BOSS_HIT, { damage: boss.damage });
          }
          b.vy = -fxAbs(b.vy);
        }
      }

      if (fxFloor(b.y) > 240) {
        b.active = false;
      }
    }

    if (boss.defeated) {
      this.state.scoring.add(50000, 'boss-defeat');
      this.transition('BOSS_DEFEATED');
      this.state.eventBus.emit(GameEvent.BOSS_DEFEATED, {});
      return;
    }

    const stillActive = this.state.player.balls.filter(b => b.active);
    if (stillActive.length === 0) {
      this.state.player.lives--;
      this.state.eventBus.emit(GameEvent.LIFE_LOST, { livesRemaining: this.state.player.lives });
      if (this.state.player.lives <= 0) {
        this.transition('GAME_OVER');
        this.state.eventBus.emit(GameEvent.GAME_OVER, {});
      } else {
        const ball = createBall();
        attachBallToVaus(ball, this.state.player.vaus);
        this.state.player.balls = [ball];
        this.state.player.vaus.reset();
      }
    }
  }

  private checkBossProjectileCollision(): void {
    const boss = this.state.player.boss;
    if (!boss) return;
    for (const p of boss.projectiles) {
      if (!p.active) continue;
      const vAABB = this.state.player.vaus.aabb;
      const pAABB: AABB = { x: p.x, y: p.y, w: 4, h: 4 };
      if (aabbOverlap(pAABB, vAABB)) {
        p.active = false;
        this.state.player.lives--;
        this.state.eventBus.emit(GameEvent.LIFE_LOST, { livesRemaining: this.state.player.lives });
        if (this.state.player.lives <= 0) {
          this.transition('GAME_OVER');
          this.state.eventBus.emit(GameEvent.GAME_OVER, {});
        }
      }
    }
  }

  private updateBossDefeated(input: InputSnapshot): void {
    const timer = this.getTimer('bossDefeated');
    if (timer >= COOLDOWN_TICKS * 3) {
      this.transition('ENDING');
      this.state.eventBus.emit(GameEvent.ENDING_STARTED, {});
      this.resetTimer('bossDefeated');
      return;
    }
    this.incTimer('bossDefeated');
  }

  private updateEnding(input: InputSnapshot): void {
    const timer = this.getTimer('ending');
    if (timer >= COOLDOWN_TICKS * 8 || input.start || input.fire) {
      this.state.scoring.setHighScore(Math.max(this.state.scoring.highScore, this.state.scoring.score));
      this.transition('TITLE');
      this.state.eventBus.emit(GameEvent.RETURNED_TO_TITLE, {});
      this.resetTimer('ending');
      return;
    }
    this.incTimer('ending');
  }

  private moveVaus(input: InputSnapshot): void {
    const vaus = this.state.player.vaus;
    if (input.left) vaus.moveLeft();
    if (input.right) vaus.moveRight();
    if (input.pointerX !== null) {
      vaus.setX(input.pointerX - vaus.width / 2);
    }
  }

  private async loadAndStartRound(): Promise<void> {
    this.loadingLevel = true;
    try {
      const level = await this.loader.loadLevel(
        this.state.config.region,
        this.state.player.round,
      );
      this.state.player.bricks.loadFromLevel(level);
      this.state.player.vaus.reset();
      this.state.player.capsules.clear();
      this.state.player.enemies.clear();
      this.state.player.balls = [];
      this.state.player.boss = null;
      this.lasers = [];
      if (level.type === 'boss') {
        const { BossManager } = await import('../entities/boss');
        this.state.player.boss = new BossManager();
      }
      this.loadingLevel = false;
      this.transition('ROUND_INTRO');
    } catch {
      this.loadingLevel = false;
      this.transition('ERROR');
    }
  }

  private skipLevel(): void {
    this.state.player.round = Math.min(this.state.player.round + 1, 16);
    this.startLevelLoad();
  }

  private startLevelLoad(): void {
    this.loadAndStartRound();
  }

  private getTimer(name: string): number {
    return this.timers.get(name) ?? 0;
  }

  private incTimer(name: string): void {
    this.timers.set(name, (this.timers.get(name) ?? 0) + 1);
  }

  private resetTimer(name: string): void {
    this.timers.set(name, 0);
  }
}
