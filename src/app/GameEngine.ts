import { StateMachine } from '../core/stateMachine';
import { EventBus } from '../core/EventBus';
import { GameConfig, DEFAULT_CONFIG } from '../core/GameConfig';
import { FixedStepLoop } from '../core/fixedStep';
import { extraLivesAwarded, brickScore } from '../core/scoring';
import { createPlayerRng } from '../core/rng';
import { InputManager } from '../input/input';
import { AudioManager } from '../audio/audio';
import { Renderer } from '../render/renderer';
import { VausState, createVaus, resetVaus, VAUS_MOVE_STEP, VAUS_ENLARGED_WIDTH, PLAYFIELD_LEFT, PLAYFIELD_RIGHT } from '../entities/vaus';
import { BallState, createBall, BASE_SPEED, MAX_SPEED, CEILING_SPEED_STEP, BRICK_HIT_SPEED_STEP, SLOW_SPEED } from '../entities/ball';
import { CapsuleState, CAPSULE_FALL_SPEED, CAPSULE_WIDTH, CAPSULE_HEIGHT, randomCapsuleType } from '../entities/capsules';
import { EnemyState, spawnEnemy, updateEnemyPosition, ENEMY_SPAWN_INTERVAL, MAX_ENEMIES, ENEMY_POINTS } from '../entities/enemies';
import { BossState, BossProjectile, createBoss, fireProjectile, BOSS_FIRE_INTERVAL, MAX_BOSS_PROJECTILES } from '../entities/boss';
import { wallCollision, vausCollision, brickCollision, enemyCollision, bossCollision, capsuleVausCollision, projectileVausCollision, laserBrickCollision, laserEnemyCollision, vausEnemyCollision } from '../physics/collision';
import { ILevelData, IBrickCell, CapsuleType } from '../data/levelSchema';
import { generateAllLevels } from '../data/levels';
import { qualifiesForLeaderboard, insertLeaderboardEntry } from '../persistence/storage';

interface LaserBeam { x: number; y: number; active: boolean; }

export class GameEngine {
  config: GameConfig;
  sm = new StateMachine();
  bus = new EventBus();
  input: InputManager;
  audio: AudioManager;
  renderer: Renderer;
  loop: FixedStepLoop;

  vaus: VausState = createVaus();
  balls: BallState[] = [createBall()];
  capsules: CapsuleState[] = [];
  enemies: EnemyState[] = [];
  boss: BossState | null = null;
  bossProjectiles: BossProjectile[] = [];
  lasers: LaserBeam[] = [];

  score = 0;
  lives = 3;
  round = 1;
  playerCount = 1;
  activePowerUp: CapsuleType | null = null;
  breakExitOpen = false;
  breakExitX = 180;
  breakExitY = 200;

  private levels: ILevelData[] = [];
  private cells: IBrickCell[] = [];
  private clearRemaining = 0;
  private rng: () => number;
  private previousCapsule: CapsuleType | null = null;
  private enemySpawnTimer = ENEMY_SPAWN_INTERVAL;
  private stateTimer = 0;
  private titleIdleTimer = 0;
  private tick_ = 0;
  private nameEntryInitials = ['', '', ''];
  private nameEntryCursor = 0;
  private nameEntryTimer = 0;
  private player1Score = 0;
  private player2Score = 0;
  private player1Lives = 3;
  private player2Lives = 3;
  private player1Round = 1;
  private player2Round = 1;
  private currentPlayer = 1;
  private player1Cells: IBrickCell[] = [];
  private player2Cells: IBrickCell[] = [];
  private player1ClearRemaining = 0;
  private player2ClearRemaining = 0;

  constructor(canvas: HTMLCanvasElement, config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.input = new InputManager(canvas);
    this.audio = new AudioManager();
    this.renderer = new Renderer(canvas);
    this.rng = createPlayerRng(config.deterministicSeed, 0);
    this.loop = new FixedStepLoop(
      () => this.tick(),
      () => this.render(),
    );
    this.levels = generateAllLevels(config.region);
  }

  start() {
    this.sm.transition('loaded');
    this.loop.start();
  }

  stop() { this.loop.stop(); }

  private tick() {
    this.input.poll();
    this.tick_++;
    this.stateTimer++;

    const s = this.input.state;
    const startPressed = s.startPressed;
    const firePressed = s.firePressed;
    const selectPressed = s.selectPressed;

    switch (this.sm.current) {
      case 'TITLE': this.tickTitle(startPressed, selectPressed); break;
      case 'OPENING_STORY': this.tickOpeningStory(startPressed, firePressed); break;
      case 'GAMEPLAY_DEMO': this.tickGameplayDemo(startPressed, firePressed); break;
      case 'ROUND_INTRO': this.tickRoundIntro(); break;
      case 'BALL_READY': this.tickBallReady(startPressed, firePressed); break;
      case 'PLAYING': this.tickPlaying(startPressed, firePressed); break;
      case 'PAUSED': this.tickPaused(startPressed); break;
      case 'LIFE_LOST': this.tickLifeLost(); break;
      case 'TURN_HANDOFF': this.tickTurnHandoff(); break;
      case 'ROUND_CLEAR': this.tickRoundClear(); break;
      case 'BREAK_WARP': this.tickBreakWarp(); break;
      case 'GAME_OVER': this.tickGameOver(); break;
      case 'NAME_ENTRY': this.tickNameEntry(startPressed); break;
      case 'BOSS_INTRO': this.tickBossIntro(); break;
      case 'BOSS_PLAYING': this.tickBossPlaying(startPressed); break;
      case 'BOSS_DEFEATED': this.tickBossDefeated(); break;
      case 'ENDING': this.tickEnding(startPressed); break;
    }
  }

  private tickTitle(startPressed: boolean, selectPressed: boolean) {
    this.titleIdleTimer++;
    if (selectPressed) {
      this.playerCount = this.playerCount === 1 ? 2 : 1;
    }
    if (startPressed) {
      this.titleIdleTimer = 0;
      this.score = 0;
      this.lives = 3;
      this.round = 1;
      this.sm.transition('start_game');
      return;
    }
    if (this.titleIdleTimer >= 600) {
      this.titleIdleTimer = 0;
      this.sm.transition('idle_timeout');
    }
  }

  private tickOpeningStory(startPressed: boolean, firePressed: boolean) {
    if (this.stateTimer > 600 || firePressed || startPressed) {
      this.stateTimer = 0;
      this.sm.transition('scroll_end');
    }
  }

  private tickGameplayDemo(startPressed: boolean, firePressed: boolean) {
    if (this.stateTimer > 600 || firePressed || startPressed) {
      this.stateTimer = 0;
      this.sm.transition('timeout');
    }
  }

  private tickRoundIntro() {
    if (this.stateTimer > 90) {
      this.stateTimer = 0;
      this.loadRound(this.round);
      this.sm.transition('jingle_complete');
    }
  }

  private tickBallReady(startPressed: boolean, firePressed: boolean) {
    this.moveVaus();
    const ball = this.balls[0];
    if (ball) {
      ball.x = this.vaus.x + this.vaus.width / 2 - ball.width / 2;
      ball.y = this.vaus.y - ball.height;
    }
    if (firePressed) {
      this.launchBall(ball);
      this.sm.transition('fire');
      this.audio.sfx('ball_launch');
    }
    if (startPressed && this.input.state.fire && this.config.enableManualLevelSkipSecret && this.round < 16) {
      this.round++;
      this.stateTimer = 0;
      this.sm.transition('level_skip');
    }
    if (startPressed && !this.input.state.fire) {
      this.sm.transition('pause');
      this.audio.sfx('pause');
    }
  }

  private tickPlaying(startPressed: boolean, firePressed: boolean) {
    if (startPressed) {
      this.sm.transition('pause');
      this.audio.sfx('pause');
      return;
    }

    this.moveVaus();
    this.updateBalls();
    this.updateCapsules();
    this.updateEnemies();
    this.updateLasers();
    this.checkBrickCollisions();
    this.checkRoundClear();
    this.checkBallLost();
    this.checkBreakWarp();

    if (this.vaus.laserCooldown > 0) this.vaus.laserCooldown--;
    if (firePressed && this.vaus.hasLaser && this.vaus.laserCooldown === 0 && this.vaus.activeLaserPairs < 2) {
      this.fireLaser();
    }
  }

  private tickPaused(startPressed: boolean) {
    if (startPressed) {
      this.sm.transition('resume');
      this.audio.sfx('pause');
    }
  }

  private tickLifeLost() {
    if (this.stateTimer > 60) {
      this.stateTimer = 0;
      if (this.playerCount === 2) {
        this.switchPlayer();
        this.sm.transition('turn_handoff');
        return;
      }
      if (this.lives > 0) {
        this.resetRound();
        this.sm.transition('lives_remain');
      } else {
        this.sm.transition('no_lives');
      }
    }
  }

  private tickTurnHandoff() {
    if (this.stateTimer > 60) {
      this.stateTimer = 0;
      this.resetRound();
      this.sm.transition('handoff_complete');
    }
  }

  private switchPlayer() {
    if (this.currentPlayer === 1) {
      this.player1Score = this.score;
      this.player1Lives = this.lives;
      this.player1Round = this.round;
      this.player1Cells = this.cells.map(c => ({ ...c }));
      this.player1ClearRemaining = this.clearRemaining;
      this.currentPlayer = 2;
      this.score = this.player2Score;
      this.lives = this.player2Lives;
      this.round = this.player2Round;
      this.cells = this.player2Cells.map(c => ({ ...c }));
      this.clearRemaining = this.player2ClearRemaining;
    } else {
      this.player2Score = this.score;
      this.player2Lives = this.lives;
      this.player2Round = this.round;
      this.player2Cells = this.cells.map(c => ({ ...c }));
      this.player2ClearRemaining = this.clearRemaining;
      this.currentPlayer = 1;
      this.score = this.player1Score;
      this.lives = this.player1Lives;
      this.round = this.player1Round;
      this.cells = this.player1Cells.map(c => ({ ...c }));
      this.clearRemaining = this.player1ClearRemaining;
    }
  }

  private tickRoundClear() {
    if (this.stateTimer > 90) {
      this.stateTimer = 0;
      this.audio.sfx('round_clear');
      const bossRound = this.config.region === 'US' ? 36 : 33;
      if (this.round >= bossRound - 1) {
        this.round++;
        this.sm.transition('boss_round');
      } else {
        this.round++;
        this.sm.transition('next_round');
      }
    }
  }

  private tickBreakWarp() {
    if (this.stateTimer > 60) {
      this.stateTimer = 0;
      this.round++;
      this.sm.transition('warp_complete');
    }
  }

  private tickGameOver() {
    if (this.stateTimer > 120) {
      this.stateTimer = 0;
      this.audio.sfx('game_over');
      if (this.config.enableHighScoreNameEntry && qualifiesForLeaderboard(this.score)) {
        this.nameEntryInitials = ['', '', ''];
        this.nameEntryCursor = 0;
        this.nameEntryTimer = 0;
        this.sm.transition('qualifies');
      } else {
        this.sm.transition('no_qualify');
      }
    }
  }

  private tickNameEntry(startPressed: boolean) {
    this.nameEntryTimer++;
    if (this.nameEntryTimer > 600 || (this.nameEntryInitials[2] !== '' && startPressed)) {
      this.submitNameEntry();
      return;
    }
    for (let code = 65; code <= 90; code++) {
      const key = `Key${String.fromCharCode(code)}`;
      if (this.input.state.firePressed || (this.input as any).keys?.has?.(key)) {
        if (this.nameEntryCursor < 3 && this.nameEntryInitials[this.nameEntryCursor] === '') {
          this.nameEntryInitials[this.nameEntryCursor] = String.fromCharCode(code);
          this.nameEntryCursor++;
          if (this.nameEntryCursor >= 3) {
            setTimeout(() => this.submitNameEntry(), 500);
          }
          break;
        }
      }
    }
  }

  private submitNameEntry() {
    const initials = this.nameEntryInitials.join('') || 'AAA';
    insertLeaderboardEntry({
      score: this.score,
      initials,
      round: this.round,
      region: this.config.region,
      mode: this.config.mode,
      date: new Date().toISOString(),
    });
    this.sm.transition('entry_complete');
  }

  private tickBossIntro() {
    if (this.stateTimer > 120) {
      this.stateTimer = 0;
      this.boss = createBoss();
      this.bossProjectiles = [];
      this.resetRoundForBoss();
      this.sm.transition('intro_end');
      this.bus.emit('BOSS_STARTED');
    }
  }

  private tickBossPlaying(startPressed: boolean) {
    if (startPressed) {
      this.sm.transition('pause');
      return;
    }

    this.moveVaus();
    this.updateBalls();
    this.updateBoss();
    this.checkBallLost();
    this.checkBossDefeated();
  }

  private tickBossDefeated() {
    if (this.stateTimer > 120) {
      this.stateTimer = 0;
      this.score += 50000;
      this.sm.transition('defeat_end');
      this.bus.emit('BOSS_DEFEATED');
    }
  }

  private tickEnding(startPressed: boolean) {
    if (this.stateTimer > 900 || (this.stateTimer > 300 && startPressed)) {
      this.stateTimer = 0;
      this.sm.transition('ending_complete');
    }
  }

  private moveVaus() {
    const s = this.input.state;
    if (s.mouseActive) {
      const target = s.mouseX - this.vaus.width / 2;
      this.vaus.x = Math.max(PLAYFIELD_LEFT, Math.min(PLAYFIELD_RIGHT - this.vaus.width, target));
    } else {
      if (s.left) this.vaus.x -= VAUS_MOVE_STEP;
      if (s.right) this.vaus.x += VAUS_MOVE_STEP;
      this.vaus.x = Math.max(PLAYFIELD_LEFT, Math.min(PLAYFIELD_RIGHT - this.vaus.width, this.vaus.x));
    }
  }

  private launchBall(ball: BallState | undefined) {
    if (!ball) return;
    ball.held = false;
    ball.caught = false;
    const angle = (this.vaus.x + this.vaus.width / 2 < 100 ? 60 : 120) * Math.PI / 180;
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = -Math.sin(angle) * ball.speed;
  }

  private updateBalls() {
    for (const ball of this.balls) {
      if (!ball.active || ball.held || ball.caught) continue;

      ball.x += ball.vx;
      ball.y += ball.vy;

      wallCollision(ball);
      if (ball.ceilingHit && ball.speed < MAX_SPEED) {
        ball.speed = Math.min(ball.speed + CEILING_SPEED_STEP, MAX_SPEED);
        this.normalizeBallSpeed(ball);
        ball.ceilingHit = false;
      }

      if (vausCollision(ball, this.vaus, this.config.deflectionModel)) {
        this.audio.sfx('paddle_hit');
        ball.wallBounceCount = 0;
        if (this.vaus.hasCatch && this.balls.filter(b => b.active).length === 1) {
          ball.caught = true;
          ball.catchOffsetX = ball.x - this.vaus.x;
          this.vaus.catchTimer = 360;
          this.audio.sfx('capsule_collect');
        }
      }

      for (const enemy of this.enemies) {
        if (enemyCollision(ball, enemy)) {
          enemy.active = false;
          this.score += ENEMY_POINTS;
          this.audio.sfx('enemy_destroy');
          this.bus.emit('ENEMY_DESTROYED');
        }
      }

      if (this.boss && bossCollision(ball, this.boss)) {
        this.boss.hp--;
        this.score += 1000;
        this.audio.sfx('boss_hit');
        this.bus.emit('BOSS_HIT');
      }
    }

    for (const ball of this.balls) {
      if (ball.caught) {
        ball.x = this.vaus.x + ball.catchOffsetX;
        ball.y = this.vaus.y - ball.height;
        this.vaus.catchTimer--;
        if (this.vaus.catchTimer <= 0 || this.input.state.firePressed) {
          ball.caught = false;
          ball.vy = -ball.speed;
          ball.vx = 0;
          this.vaus.catchTimer = 0;
          this.audio.sfx('ball_launch');
        }
      }
    }
  }

  private normalizeBallSpeed(ball: BallState) {
    const mag = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
    ball.vx = (ball.vx / mag) * ball.speed;
    ball.vy = (ball.vy / mag) * ball.speed;
  }

  private updateCapsules() {
    for (const cap of this.capsules) {
      if (!cap.active) continue;
      cap.y += cap.fallSpeed;
      if (cap.y > 240) { cap.active = false; continue; }
      if (capsuleVausCollision(cap.x, cap.y, CAPSULE_WIDTH, CAPSULE_HEIGHT, this.vaus)) {
        cap.active = false;
        this.collectCapsule(cap.type);
      }
    }
    this.capsules = this.capsules.filter(c => c.active);
  }

  private collectCapsule(type: CapsuleType) {
    this.score += 100;
    this.audio.sfx('capsule_collect');
    this.bus.emit('CAPSULE_COLLECTED');

    if (type === 'P') {
      this.lives++;
      this.audio.sfx('extra_life');
      this.bus.emit('EXTRA_LIFE_AWARDED');
      return;
    }

    this.activePowerUp = type;
    this.vaus.hasLaser = false;
    this.vaus.hasCatch = false;
    if (!this.vaus.enlarged || type !== 'E') {
      this.vaus.enlarged = false;
      this.vaus.width = 32;
    }

    switch (type) {
      case 'S':
        for (const b of this.balls) { b.speed = SLOW_SPEED; this.normalizeBallSpeed(b); }
        break;
      case 'C':
        this.vaus.hasCatch = true;
        break;
      case 'L':
        this.vaus.hasLaser = true;
        break;
      case 'D':
        this.splitBalls();
        break;
      case 'E':
        this.vaus.enlarged = true;
        this.vaus.width = VAUS_ENLARGED_WIDTH;
        break;
      case 'B': {
        const bossRound = this.config.region === 'US' ? 36 : 33;
        if (this.round < bossRound - 1) {
          this.breakExitOpen = true;
          this.audio.sfx('warp');
          this.bus.emit('BREAK_WARP_OPENED');
        }
        break;
      }
    }
    this.bus.emit('POWERUP_ACTIVATED');
  }

  private splitBalls() {
    const active = this.balls.filter(b => b.active && !b.held);
    if (active.length === 0) return;
    const orig = active[0];
    for (const offset of [-15, 15]) {
      const angle = (offset * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const newBall = createBall();
      newBall.x = orig.x;
      newBall.y = orig.y;
      newBall.vx = orig.vx * cos - orig.vy * sin;
      newBall.vy = orig.vx * sin + orig.vy * cos;
      newBall.speed = orig.speed;
      newBall.held = false;
      newBall.active = true;
      this.balls.push(newBall);
    }
  }

  private updateEnemies() {
    this.enemySpawnTimer--;
    const activeEnemies = this.enemies.filter(e => e.active);
    if (this.enemySpawnTimer <= 0 || activeEnemies.length === 0) {
      if (activeEnemies.length < MAX_ENEMIES) {
        const enemy = spawnEnemy(this.tick_, this.rng);
        this.enemies.push(enemy);
        this.bus.emit('ENEMY_SPAWNED');
      }
      this.enemySpawnTimer = ENEMY_SPAWN_INTERVAL;
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      updateEnemyPosition(enemy, this.tick_);
      if (enemy.y > 240) { enemy.active = false; continue; }
      if (vausEnemyCollision(this.vaus, enemy)) {
        enemy.active = false;
        this.score += ENEMY_POINTS;
        this.audio.sfx('enemy_destroy');
      }
    }
    this.enemies = this.enemies.filter(e => e.active);
  }

  private updateLasers() {
    for (const beam of this.lasers) {
      if (!beam.active) continue;
      beam.y -= 6;
      if (beam.y < 0) { beam.active = false; continue; }

      const hit = laserBrickCollision(beam.x, beam.y, 2, 8, this.cells, 16, 16, 16, 8);
      if (hit) {
        beam.active = false;
        if (hit.type === 'GOLD') {
          this.audio.sfx('gold_hit');
        } else {
          hit.hitsRemaining--;
          if (hit.hitsRemaining <= 0) {
            const prevType = hit.type;
            hit.type = 'EMPTY';
            if (hit.clearRequired) this.clearRemaining--;
            this.score += brickScore(prevType, this.round);
            this.audio.sfx('brick_destroy');
          } else {
            this.audio.sfx('silver_hit');
          }
        }
      }

      for (const enemy of this.enemies) {
        if (laserEnemyCollision(beam.x, beam.y, 2, 8, enemy)) {
          beam.active = false;
          enemy.active = false;
          this.score += ENEMY_POINTS;
          this.audio.sfx('enemy_destroy');
        }
      }
    }
    this.lasers = this.lasers.filter(l => l.active);
    this.vaus.activeLaserPairs = Math.floor(this.lasers.length / 2);
  }

  private fireLaser() {
    this.lasers.push({ x: this.vaus.x, y: this.vaus.y - 8, active: true });
    this.lasers.push({ x: this.vaus.x + this.vaus.width - 2, y: this.vaus.y - 8, active: true });
    this.vaus.laserCooldown = 15;
    this.vaus.activeLaserPairs++;
    this.audio.sfx('laser_fire');
    this.bus.emit('LASER_FIRED');
  }

  private checkBrickCollisions() {
    for (const ball of this.balls) {
      if (!ball.active || ball.held || ball.caught) continue;
      const hit = brickCollision(ball, this.cells, 16, 16, 16, 8);
      if (!hit) continue;

      const cell = hit.cell;
      if (cell.type === 'GOLD') {
        this.audio.sfx('gold_hit');
        ball.hitCount++;
      } else {
        cell.hitsRemaining--;
        ball.hitCount++;
        if (cell.hitsRemaining <= 0) {
          const prevScore = this.score;
          this.score += brickScore(cell.type, this.round);
          const extraLives = extraLivesAwarded(prevScore, this.score);
          if (extraLives > 0) {
            this.lives += extraLives;
            this.audio.sfx('extra_life');
            this.bus.emit('EXTRA_LIFE_AWARDED');
          }
          cell.type = 'EMPTY';
          if (cell.clearRequired) this.clearRemaining--;
          this.audio.sfx('brick_destroy');
          this.bus.emit('BRICK_DESTROYED');

          if (cell.isCapsuleCarrier && this.balls.filter(b => b.active).length === 1) {
            const capType = randomCapsuleType(this.rng, this.previousCapsule);
            this.previousCapsule = capType;
            this.capsules.push({
              x: 16 + cell.col * 16, y: 16 + cell.row * 8,
              type: capType, active: true, fallSpeed: CAPSULE_FALL_SPEED,
            });
            this.bus.emit('CAPSULE_SPAWNED');
          }
        } else {
          this.audio.sfx('silver_hit');
          this.bus.emit('BRICK_HIT');
        }

        if (ball.hitCount % 10 === 0 && ball.speed < MAX_SPEED) {
          ball.speed = Math.min(ball.speed + BRICK_HIT_SPEED_STEP, MAX_SPEED);
          this.normalizeBallSpeed(ball);
        }
      }
    }
  }

  private checkRoundClear() {
    if (this.clearRemaining <= 0 && this.cells.length > 0) {
      this.sm.transition('round_cleared');
      this.bus.emit('ROUND_CLEARED');
    }
  }

  private checkBallLost() {
    const activeBalls = this.balls.filter(b => b.active && b.y < 240);
    if (activeBalls.length === 0 && !this.balls.some(b => b.held || b.caught)) {
      this.lives--;
      this.bus.emit('BALL_LOST');
      this.bus.emit('LIFE_LOST');
      this.audio.sfx('vaus_destroy');
      this.sm.transition('all_balls_lost');
    }
  }

  private checkBreakWarp() {
    if (!this.breakExitOpen) return;
    if (this.vaus.x + this.vaus.width >= this.breakExitX && this.vaus.y >= this.breakExitY - 24) {
      this.score += 10000;
      this.breakExitOpen = false;
      this.bus.emit('BREAK_WARP_ENTERED');
      this.sm.transition('break_warp_entered');
    }
  }

  private updateBoss() {
    if (!this.boss || !this.boss.active) return;

    this.boss.fireTimer--;
    if (this.boss.fireTimer <= 0 && this.bossProjectiles.filter(p => p.active).length < MAX_BOSS_PROJECTILES) {
      const proj = fireProjectile(this.boss, this.vaus.x);
      if (proj) {
        this.bossProjectiles.push(proj);
        this.boss.fireTimer = BOSS_FIRE_INTERVAL;
        this.bus.emit('BOSS_PROJECTILE_FIRED');
      }
    }

    for (const proj of this.bossProjectiles) {
      if (!proj.active) continue;
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.y > 240 || proj.x < 0 || proj.x > 200) { proj.active = false; continue; }
      if (projectileVausCollision(proj.x, proj.y, proj.width, proj.height, this.vaus)) {
        proj.active = false;
        this.lives--;
        this.audio.sfx('vaus_destroy');
        this.bus.emit('LIFE_LOST');
        if (this.lives <= 0) {
          this.sm.transition('vaus_hit_no_lives');
        } else {
          this.resetRoundForBoss();
          this.sm.transition('vaus_hit_lives_remain');
        }
      }
    }
    this.bossProjectiles = this.bossProjectiles.filter(p => p.active);
  }

  private checkBossDefeated() {
    if (this.boss && this.boss.hp <= 0 && !this.boss.defeated) {
      this.boss.defeated = true;
      this.boss.active = false;
      this.audio.sfx('boss_defeated');
      this.sm.transition('boss_defeated');
    }
  }

  private loadRound(round: number) {
    const level = this.levels.find(l => l.roundNumber === round);
    if (!level) return;
    this.cells = level.cells.map(c => ({ ...c }));
    this.clearRemaining = level.clearRequiredCount;
    this.resetRound();
    this.previousCapsule = null;
    this.breakExitOpen = false;
    this.enemies = [];
    this.enemySpawnTimer = ENEMY_SPAWN_INTERVAL;
    this.bus.emit('ROUND_STARTED');
  }

  private resetRound() {
    resetVaus(this.vaus);
    this.balls = [createBall()];
    this.capsules = [];
    this.lasers = [];
    this.activePowerUp = null;
    this.vaus.catchTimer = 0;
  }

  private resetRoundForBoss() {
    resetVaus(this.vaus);
    this.balls = [createBall()];
    this.capsules = [];
    this.lasers = [];
    this.activePowerUp = null;
  }

  private render() {
    const r = this.renderer;
    switch (this.sm.current) {
      case 'TITLE':
        r.drawTitle(this.playerCount, this.titleIdleTimer);
        break;
      case 'OPENING_STORY':
        r.drawOpeningStory(this.stateTimer);
        break;
      case 'GAMEPLAY_DEMO':
        r.drawGameplayDemo();
        break;
      case 'ROUND_INTRO':
        r.drawRoundIntro(this.round);
        break;
      case 'BALL_READY':
      case 'PLAYING':
        r.clear();
        r.drawWalls();
        r.drawBricks(this.cells);
        r.drawVaus(this.vaus);
        for (const b of this.balls) r.drawBall(b);
        for (const c of this.capsules) r.drawCapsule(c);
        for (const e of this.enemies) r.drawEnemy(e);
        for (const l of this.lasers) r.drawLaser(l.x, l.y);
        if (this.breakExitOpen) r.drawBreakExit(this.breakExitX, this.breakExitY);
        r.drawHUD(this.score, this.lives, this.round);
        break;
      case 'PAUSED':
        r.clear();
        r.drawWalls();
        r.drawBricks(this.cells);
        r.drawVaus(this.vaus);
        for (const b of this.balls) r.drawBall(b);
        r.drawHUD(this.score, this.lives, this.round);
        r.drawPaused();
        break;
      case 'LIFE_LOST':
        r.clear();
        r.drawWalls();
        r.drawBricks(this.cells);
        r.drawHUD(this.score, this.lives, this.round);
        r.drawLifeLost();
        break;
      case 'TURN_HANDOFF':
        r.drawTurnHandoff(this.currentPlayer);
        break;
      case 'ROUND_CLEAR':
        r.clear();
        r.drawWalls();
        r.drawRoundClear(this.round);
        break;
      case 'BREAK_WARP':
        r.clear();
        r.drawWalls();
        r.drawBreakWarp();
        break;
      case 'GAME_OVER':
        r.drawGameOver(this.score);
        break;
      case 'NAME_ENTRY':
        r.drawNameEntry(this.nameEntryInitials, this.nameEntryCursor, this.score);
        break;
      case 'BOSS_INTRO':
        r.drawBossIntro();
        break;
      case 'BOSS_PLAYING':
        r.clear();
        r.drawWalls();
        if (this.boss) r.drawBoss(this.boss);
        for (const p of this.bossProjectiles) r.drawBossProjectile(p);
        r.drawVaus(this.vaus);
        for (const b of this.balls) r.drawBall(b);
        r.drawHUD(this.score, this.lives, this.round);
        break;
      case 'BOSS_DEFEATED':
        r.clear();
        r.drawBossDefeated(this.stateTimer);
        break;
      case 'ENDING':
        r.drawEnding(this.stateTimer);
        break;
      default:
        r.clear();
        break;
    }
  }
}
