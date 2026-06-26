import {
  toFx, f2i, f2n, fmul, fdiv, fabs, fclamp, ZERO, ONE, NEG_ONE,
  LAUNCH_RIGHT, LAUNCH_LEFT, getDeflectionVector, DISRUPT_ANGLES, fsin, fcos,
} from './fx.js';
import { GameEvents } from './events.js';
import { mulberry32, randChoice } from './rng.js';
import {
  W, H, PLAY_LEFT, PLAY_RIGHT, PLAY_TOP, PLAY_BOTTOM,
  GRID_OX, GRID_OY, COLS, ROWS, BRICK_W, BRICK_H,
  VAUS_Y, VAUS_H, VAUS_W, VAUS_W_E,
  BASE_SPEED, SLOW_SPEED, MAX_SPEED, CEILING_STEP, BRICK_STEP,
  CAPSULE_FALL, LASER_SPEED, ENEMY_TYPES, ENEMY_SPEED_Y,
  generateRound, generateBossRound, defaultConfig, SCORES, CAPSULES,
} from './data.js';

const BALL_RADIUS = toFx(2);
const V2 = { x: 0, y: 0 };

export class Game {
  constructor(config, bus, input, audio, storage) {
    this.config = { ...defaultConfig(), ...config };
    this.bus = bus;
    this.input = input;
    this.audio = audio;
    this.storage = storage;
    this.rng = mulberry32(this.config.deterministicSeed);
    this.tick = 0;
    this.state = 'BOOT';
    this.stateTick = 0;
    this.playerCount = 1;
    this.mode = this.config.mode;
    this.region = this.config.region;
    this.finalBrickRound = this.region === 'US' ? 35 : 32;
    this.bossRound = this.region === 'US' ? 36 : 33;
    this.score = 0;
    this.lives = 3;
    this.round = 1;
    this.highScore = this._loadHighScore();
    this.lastPlayedRound = 1;
    this.storyExit = 'idle';
    this.pausedFrom = null;
    this.warpOpen = false;
    this.demo = { x: toFx(100), y: toFx(100), vx: toFx(2), vy: toFx(-1.5) };

    this.vaus = this._makeVaus();
    this.balls = [];
    this.capsules = [];
    this.lasers = [];
    this.enemies = [];
    this.boss = null;
    this.projectiles = [];
    this.grid = [];
    this.levelData = null;
    this.brickHitsThisRound = 0;
    this.ceilingHitDone = false;
    this.ballSpeed = BASE_SPEED;
    this.previousCapsule = null;
    this.enemySpawnTimer = 0;
    this.nameEntryPending = false;
  }

  _makeVaus() {
    return {
      x: toFx((PLAY_LEFT + PLAY_RIGHT - VAUS_W) / 2),
      width: toFx(VAUS_W),
      powerup: null,
      catchTimer: 0,
      caughtBallId: null,
      laserCooldown: 0,
    };
  }

  _loadHighScore() {
    const lb = this.storage.getLeaderboard().entries;
    return lb.length ? lb[0].score : 0;
  }

  start() {
    this.setState('TITLE');
    this.bus.emit(GameEvents.APP_BOOTED, {});
  }

  setState(s) {
    this.state = s;
    this.stateTick = 0;
    if (s === 'TITLE') this.bus.emit(GameEvents.TITLE_SHOWN, {});
  }

  fixedStep() {
    const input = this.input.getSnapshot(this.vaus.x, this.vaus.width);
    this._handleGlobalInput(input);
    switch (this.state) {
      case 'TITLE': this._title(input); break;
      case 'OPENING_STORY': this._story(input); break;
      case 'GAMEPLAY_DEMO': this._demo(input); break;
      case 'ROUND_INTRO': this._roundIntro(input); break;
      case 'BOSS_INTRO': this._bossIntro(input); break;
      case 'BALL_READY': this._ballReady(input); break;
      case 'PLAYING': this._playing(input); break;
      case 'BOSS_PLAYING': this._bossPlaying(input); break;
      case 'PAUSED': this._paused(input); break;
      case 'LIFE_LOST': this._lifeLost(input); break;
      case 'ROUND_CLEAR': this._roundClear(input); break;
      case 'BREAK_WARP': this._breakWarp(input); break;
      case 'BOSS_DEFEATED': this._bossDefeated(input); break;
      case 'GAME_OVER': this._gameOver(input); break;
      case 'ENDING': this._ending(input); break;
    }
    this.tick++;
    this.stateTick++;
  }

  _handleGlobalInput(input) {
    if (input.mute) {
      this.config.audioEnabled = !this.config.audioEnabled;
      this.audio.setEnabled(this.config.audioEnabled);
    }
    if (input.fullscreen) {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
    if (input.startEdge && (this.state === 'PLAYING' || this.state === 'BALL_READY' || this.state === 'BOSS_PLAYING')) {
      this.pausedFrom = this.state;
      this.setState('PAUSED');
      return;
    }
  }

  _title(input) {
    if (input.selectEdge) {
      this.playerCount = this.playerCount === 1 ? 2 : 1;
      this.bus.emit(GameEvents.PLAYER_COUNT_CHANGED, { count: this.playerCount });
    }
    if (input.startEdge) {
      this.storyExit = 'newGame';
      this._resetGame();
      this.setState('OPENING_STORY');
      return;
    }
    // Continue cheat: hold A+B + Select 5 times + Start
    if (input.fire && this.input.raw.cheatB) {
      if (input.selectEdge) this.continueSelectCount = (this.continueSelectCount || 0) + 1;
      if (this.continueSelectCount >= 5 && input.startEdge) {
        this.score = 0;
        this._loadRound(this.lastPlayedRound);
        this.setState('ROUND_INTRO');
        this.continueSelectCount = 0;
        return;
      }
    } else {
      this.continueSelectCount = 0;
    }
    if (this.stateTick >= 600) {
      this.storyExit = 'idle';
      this.setState('OPENING_STORY');
    }
  }

  _story(input) {
    if (input.startEdge || input.fireEdge) {
      if (this.storyExit === 'idle') { this.setState('TITLE'); return; }
    }
    if (this.storyExit === 'newGame' && this.stateTick >= 240) {
      this.setState('ROUND_INTRO');
      return;
    }
    if (this.storyExit === 'idle' && this.stateTick >= 600) {
      this.setState('GAMEPLAY_DEMO');
    }
  }

  _demo(input) {
    // Simple attract-mode ball animation.
    this.demo.x += this.demo.vx;
    this.demo.y += this.demo.vy;
    if (f2i(this.demo.x) < PLAY_LEFT || f2i(this.demo.x) > PLAY_RIGHT) this.demo.vx = -this.demo.vx;
    if (f2i(this.demo.y) < PLAY_TOP) this.demo.vy = -this.demo.vy;
    if (f2i(this.demo.y) > H) { this.demo.x = toFx(100); this.demo.y = toFx(100); }
    if (this.stateTick >= 600 || input.fireEdge || input.startEdge) {
      this.setState('TITLE');
    }
  }

  _roundIntro(input) {
    if (input.startEdge && this.stateTick > 30) { /* pause handled globally */ }
    if (this.stateTick >= 120) {
      this.setState('BALL_READY');
    }
  }

  _bossIntro(input) {
    if (this.stateTick >= 180) {
      this.setState('BOSS_PLAYING');
      this.bus.emit(GameEvents.BOSS_STARTED, {});
    }
  }

  _ballReady(input) {
    this._moveVaus(input);
    if (this.balls.length === 0) this._spawnHeldBall();
    const ball = this.balls[0];
    ball.x = this.vaus.x + this.vaus.width / 2;
    ball.y = toFx(VAUS_Y) - BALL_RADIUS - toFx(1);
    if (this.config.enableManualLevelSkipSecret && input.fire && input.startEdge && this.round < 16) {
      this.round++;
      this.setState('ROUND_INTRO');
      return;
    }
    if (input.fireEdge) {
      this._launchBall(ball);
      this.bus.emit(GameEvents.BALL_LAUNCHED, {});
      this.setState('PLAYING');
    }
  }

  _playing(input) {
    this._moveVaus(input);
    this._updateSimulation(input);
    if (this._allBallsLost()) {
      this._lifeLostTransition();
      return;
    }
    if (this.levelData.type === 'brick' && this._clearRequiredLeft() === 0) {
      this.setState('ROUND_CLEAR');
      this.bus.emit(GameEvents.ROUND_CLEARED, { round: this.round });
      return;
    }
    if (this.warpOpen && this._vausInWarp()) {
      this.setState('BREAK_WARP');
      this.bus.emit(GameEvents.BREAK_WARP_ENTERED, {});
      return;
    }
  }

  _bossPlaying(input) {
    this._moveVaus(input);
    this._updateBoss(input);
    this._updateProjectiles();
    this._updateLasers();
    this._updateBalls(input);
    this._updatePowerupTimers();
    if (input.fireEdge) this._fireInput();
    if (this._allBallsLost()) {
      this._lifeLostTransition();
      return;
    }
  }

  _paused(input) {
    if (input.startEdge) {
      this.state = this.pausedFrom || 'PLAYING';
      this.stateTick = 0;
    } else if (input.selectEdge) {
      this.setState('TITLE');
    }
  }

  _lifeLost(input) {
    if (this.stateTick >= 120) {
      if (this.lives > 0) {
        if (this.levelData && this.levelData.type === 'boss') {
          this._resetBossAttempt();
        } else {
          this._loadRound(this.round);
        }
        this.setState('BALL_READY');
      } else {
        this._enterGameOver();
      }
    }
  }

  _resetBossAttempt() {
    this.vaus = this._makeVaus();
    this.balls = [];
    this.projectiles = [];
    this.capsules = [];
    this.lasers = [];
    this.enemies = [];
    this.warpOpen = false;
    this.brickHitsThisRound = 0;
    this.ceilingHitDone = false;
    this.ballSpeed = BASE_SPEED;
    this.previousCapsule = null;
    this.enemySpawnTimer = 0;
  }

  _roundClear(input) {
    if (this.stateTick >= 180) {
      if (this.round === this.finalBrickRound) {
        this._loadBossRound();
        this.setState('BOSS_INTRO');
      } else {
        this.round++;
        this._loadRound(this.round);
        this.setState('ROUND_INTRO');
      }
    }
  }

  _breakWarp(input) {
    if (this.stateTick === 1) {
      this._addScore(10000, 'break-warp');
    }
    if (this.stateTick >= 120) {
      this.round++;
      this._loadRound(this.round);
      this.setState('ROUND_INTRO');
    }
  }

  _bossDefeated(input) {
    if (this.stateTick >= 240) {
      this.setState('ENDING');
      this.bus.emit(GameEvents.ENDING_STARTED, {});
    }
  }

  _gameOver(input) {
    if (this.stateTick >= 180) {
      if (this.nameEntryPending && this.config.enableHighScoreNameEntry) {
        this.setState('NAME_ENTRY');
        this.bus.emit(GameEvents.NAME_ENTRY_STARTED, {});
      } else {
        this.setState('TITLE');
      }
    }
  }

  _ending(input) {
    if (this.stateTick >= 900 || input.startEdge || input.fireEdge) {
      this.setState('TITLE');
      this.bus.emit(GameEvents.RETURNED_TO_TITLE, {});
    }
  }

  _resetGame() {
    this.score = 0;
    this.lives = 3;
    this.round = 1;
    this.brickHitsThisRound = 0;
    this.ceilingHitDone = false;
    this.previousCapsule = null;
    this._loadRound(1);
    this.bus.emit(GameEvents.GAME_STARTED, {});
  }

  _loadRound(r) {
    this.round = r;
    this.lastPlayedRound = r;
    this.levelData = generateRound(r, this.region);
    this._buildGrid(this.levelData);
    this.vaus = this._makeVaus();
    this.balls = [];
    this.capsules = [];
    this.lasers = [];
    this.enemies = [];
    this.projectiles = [];
    this.boss = null;
    this.warpOpen = false;
    this.brickHitsThisRound = 0;
    this.ceilingHitDone = false;
    this.ballSpeed = BASE_SPEED;
    this.previousCapsule = null;
    this.enemySpawnTimer = 480;
    this.bus.emit(GameEvents.ROUND_STARTED, { round: r });
  }

  _loadBossRound() {
    this.round = this.bossRound;
    this.lastPlayedRound = this.round;
    this.levelData = generateBossRound(this.region);
    this.grid = [];
    this.vaus = this._makeVaus();
    this.balls = [];
    this.capsules = [];
    this.lasers = [];
    this.enemies = [];
    this.projectiles = [];
    this.warpOpen = false;
    this.brickHitsThisRound = 0;
    this.ceilingHitDone = false;
    this.ballSpeed = BASE_SPEED;
    this.previousCapsule = null;
    this.enemySpawnTimer = 0;
    this.boss = {
      x: toFx((PLAY_LEFT + PLAY_RIGHT) / 2),
      y: toFx(60),
      w: toFx(64),
      h: toFx(48),
      damage: 0,
      fireTimer: 90,
      cooldown: 0,
    };
  }

  _buildGrid(level) {
    this.grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
    for (const cell of level.cells) {
      this.grid[cell.row][cell.col] = { ...cell };
    }
  }

  _spawnHeldBall() {
    this.balls = [{
      id: this.tick,
      x: this.vaus.x + this.vaus.width / 2,
      y: toFx(VAUS_Y) - BALL_RADIUS - toFx(1),
      vx: ZERO,
      vy: ZERO,
      held: true,
      loopCount: 0,
      bossCooldown: 0,
    }];
  }

  _launchBall(ball) {
    ball.held = false;
    const right = ball.x >= toFx((PLAY_LEFT + PLAY_RIGHT) / 2);
    const unit = right ? LAUNCH_RIGHT : LAUNCH_LEFT;
    ball.vx = fmul(unit.vx, this.ballSpeed);
    ball.vy = fmul(unit.vy, this.ballSpeed);
    this.vaus.caughtBallId = null;
  }

  _moveVaus(input) {
    let target = input.paddleXFx;
    const minX = toFx(PLAY_LEFT);
    const maxX = toFx(PLAY_RIGHT) - this.vaus.width;
    if (target < minX) target = minX;
    if (target > maxX) target = maxX;
    this.vaus.x = target;
  }

  _updateSimulation(input) {
    this._updateEnemies();
    this._updateLasers();
    this._updateCapsules();
    this._updateBalls(input);
    this._updatePowerupTimers();
    if (input.fireEdge) this._fireInput();
    this.enemySpawnTimer--;
  }

  _updateBalls(input) {
    for (const ball of this.balls) {
      if (ball.held) {
        ball.x = this.vaus.x + this.vaus.width / 2;
        ball.y = toFx(VAUS_Y) - BALL_RADIUS - toFx(1);
        continue;
      }
      const prevX = ball.x;
      const prevY = ball.y;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Walls
      if (ball.x < toFx(PLAY_LEFT) + BALL_RADIUS) {
        ball.x = toFx(PLAY_LEFT) + BALL_RADIUS;
        ball.vx = -ball.vx;
        ball.loopCount++;
      } else if (ball.x > toFx(PLAY_RIGHT) - BALL_RADIUS) {
        ball.x = toFx(PLAY_RIGHT) - BALL_RADIUS;
        ball.vx = -ball.vx;
        ball.loopCount++;
      }
      if (ball.y < toFx(PLAY_TOP) + BALL_RADIUS) {
        ball.y = toFx(PLAY_TOP) + BALL_RADIUS;
        ball.vy = -ball.vy;
        ball.loopCount++;
        if (!this.ceilingHitDone) {
          this.ballSpeed = fclamp(this.ballSpeed + CEILING_STEP, BASE_SPEED, MAX_SPEED);
          this.ceilingHitDone = true;
        }
      }

      // Vaus collision
      if (ball.vy > 0 && f2i(prevY) + 2 < VAUS_Y && f2i(ball.y) + 2 >= VAUS_Y) {
        const cx = f2i(ball.x);
        const vx = f2i(this.vaus.x);
        const vw = f2i(this.vaus.width);
        if (cx >= vx - 2 && cx <= vx + vw + 2) {
          if (this.vaus.powerup === 'C' && this.vaus.caughtBallId === null) {
            this.vaus.caughtBallId = ball.id;
            ball.held = true;
            ball.x = this.vaus.x + this.vaus.width / 2;
            ball.y = toFx(VAUS_Y) - BALL_RADIUS - toFx(1);
            this.vaus.catchTimer = 360;
            this.bus.emit(GameEvents.BALL_LAUNCHED, {}); // reuse as catch
          } else {
            ball.y = toFx(VAUS_Y) - BALL_RADIUS - toFx(1);
            this._deflectOffVaus(ball);
            ball.loopCount = 0;
          }
        }
      }

      // Bricks
      if (this.levelData.type === 'brick') {
        const hit = this._findBrickCollision(ball);
        if (hit) {
          this._resolveBrickCollision(ball, hit);
        }
      }

      // Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (this._aabbOverlap(ball.x, ball.y, BALL_RADIUS * 2, BALL_RADIUS * 2, e.x, e.y, toFx(10), toFx(8))) {
          ball.vx = -ball.vx;
          ball.vy = -ball.vy;
          this._addScore(100, 'enemy');
          this.enemies.splice(i, 1);
          this.bus.emit(GameEvents.ENEMY_DESTROYED, { type: e.type });
          break;
        }
      }

      // Boss
      if (this.boss) {
        if (this._aabbOverlap(ball.x, ball.y, BALL_RADIUS * 2, BALL_RADIUS * 2, this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
          if (ball.bossCooldown <= 0) {
            ball.bossCooldown = 2;
            this.boss.damage++;
            this._addScore(1000, 'boss');
            this.bus.emit(GameEvents.BOSS_HIT, { damage: this.boss.damage });
            if (this.boss.damage >= 16) {
              this.setState('BOSS_DEFEATED');
              this._addScore(50000, 'boss');
              this.bus.emit(GameEvents.BOSS_DEFEATED, {});
            }
          }
          ball.vy = -ball.vy;
        }
        if (ball.bossCooldown > 0) ball.bossCooldown--;
      }

      // Lost
      if (ball.y > toFx(H) + BALL_RADIUS * 2) {
        ball.dead = true;
      }
    }
    this.balls = this.balls.filter((b) => !b.dead);
  }

  _deflectOffVaus(ball) {
    const center = this.vaus.x + this.vaus.width / 2;
    const half = this.vaus.width / 2;
    let sf = fdiv(ball.x - center, half);
    sf = fclamp(sf, NEG_ONE, ONE);
    const vec = getDeflectionVector(sf, this.config.deflectionModel, this.ballSpeed);
    ball.vx = vec.vx;
    ball.vy = vec.vy;
    if (this.config.jitterEnabled && ball.loopCount > 3) {
      // micro jitter of ±1° using deterministic PRNG draw
      const sign = (this.rng() & 1) ? 1 : -1;
      // not implemented: would rotate vector by 1°
      ball.loopCount = 0;
    }
  }

  _findBrickCollision(ball) {
    const bx = f2i(ball.x);
    const by = f2i(ball.y);
    const r = Math.floor((by - GRID_OY) / BRICK_H);
    const c = Math.floor((bx - GRID_OX) / BRICK_W);
    let best = null;
    let bestPen = Infinity;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        const cell = this.grid[rr][cc];
        if (!cell || cell.type === 'EMPTY' || cell.hitsRemaining <= 0) continue;
        const cx = GRID_OX + cc * BRICK_W + BRICK_W / 2;
        const cy = GRID_OY + rr * BRICK_H + BRICK_H / 2;
        const dx = bx - cx;
        const dy = by - cy;
        const ox = (BRICK_W / 2 + f2i(BALL_RADIUS)) - Math.abs(dx);
        const oy = (BRICK_H / 2 + f2i(BALL_RADIUS)) - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          const pen = Math.min(ox, oy);
          if (pen < bestPen || (pen === bestPen && rr * COLS + cc < best?.idx)) {
            best = { cell, row: rr, col: cc, ox, oy, idx: rr * COLS + cc };
            bestPen = pen;
          }
        }
      }
    }
    return best;
  }

  _resolveBrickCollision(ball, hit) {
    const axis = hit.ox < hit.oy ? 'x' : 'y';
    if (axis === 'x') ball.vx = -ball.vx; else ball.vy = -ball.vy;
    const cell = hit.cell;
    this.bus.emit(GameEvents.BRICK_HIT, { row: hit.row, col: hit.col, type: cell.type });
    this.brickHitsThisRound++;
    this._adjustBallSpeed();
    if (cell.type === 'GOLD') return;
    cell.hitsRemaining--;
    if (cell.hitsRemaining <= 0) {
      const pts = SCORES[cell.type] || (cell.type === 'SILVER' ? 50 * this.round : 0);
      this._addScore(pts, 'brick');
      this.bus.emit(GameEvents.BRICK_DESTROYED, { row: hit.row, col: hit.col, type: cell.type, scoreDelta: pts });
      if (cell.isCapsuleCarrier && this.balls.length === 1 && cell.type !== 'SILVER' && cell.type !== 'GOLD') {
        this._spawnCapsule(GRID_OX + cell.col * BRICK_W + BRICK_W / 2, GRID_OY + cell.row * BRICK_H + BRICK_H / 2);
      }
    }
  }

  _adjustBallSpeed() {
    if (this.brickHitsThisRound % 10 === 0) {
      this.ballSpeed = fclamp(this.ballSpeed + BRICK_STEP, BASE_SPEED, MAX_SPEED);
    }
    if (this.vaus.powerup === 'S') this.ballSpeed = fclamp(this.ballSpeed, ZERO, SLOW_SPEED);
  }

  _spawnCapsule(x, y) {
    const weights = [2, 2, 2, 2, 2, 1, 1]; // S,C,L,D,E,P,B
    let idx = randChoice(this.rng, weights);
    let type = CAPSULES[idx];
    if (type === this.previousCapsule) type = 'D';
    this.previousCapsule = type;
    this.capsules.push({ x: toFx(x), y: toFx(y), type });
    this.bus.emit(GameEvents.CAPSULE_SPAWNED, { type });
  }

  _updateCapsules() {
    for (let i = this.capsules.length - 1; i >= 0; i--) {
      const cap = this.capsules[i];
      cap.y += CAPSULE_FALL;
      const cx = f2i(cap.x), cy = f2i(cap.y);
      const vx = f2i(this.vaus.x), vy = VAUS_Y, vw = f2i(this.vaus.width), vh = VAUS_H;
      if (cx >= vx - 6 && cx <= vx + vw + 6 && cy >= vy - 6 && cy <= vy + vh + 6) {
        this._collectCapsule(cap);
        this.capsules.splice(i, 1);
      } else if (cy > H + 10) {
        this.capsules.splice(i, 1);
      }
    }
  }

  _collectCapsule(cap) {
    this._addScore(100, 'capsule');
    this.bus.emit(GameEvents.CAPSULE_COLLECTED, { type: cap.type });
    if (cap.type === 'P') {
      this.lives++;
      this.bus.emit(GameEvents.EXTRA_LIFE_AWARDED, {});
      return;
    }
    this._applyPowerup(cap.type);
  }

  _applyPowerup(type) {
    if (type === 'S') {
      this.vaus.powerup = 'S';
      this.ballSpeed = SLOW_SPEED;
    } else if (type === 'C') {
      this.vaus.powerup = 'C';
      this.vaus.caughtBallId = null;
    } else if (type === 'L') {
      this.vaus.powerup = 'L';
    } else if (type === 'E') {
      this.vaus.powerup = 'E';
      this.vaus.width = toFx(VAUS_W_E);
    } else if (type === 'B') {
      this.vaus.powerup = 'B';
      if (this.round !== this.finalBrickRound) {
        this.warpOpen = true;
        this.bus.emit(GameEvents.BREAK_WARP_OPENED, {});
      }
    } else if (type === 'D') {
      // If a ball is currently caught, release it before splitting.
      if (this.vaus.caughtBallId !== null) {
        const ball = this.balls.find((b) => b.id === this.vaus.caughtBallId);
        if (ball) {
          ball.held = false;
          this._launchBall(ball);
          this.vaus.caughtBallId = null;
        }
      }
      this._disruptBalls();
    }
    this.bus.emit(GameEvents.POWERUP_ACTIVATED, { type });
  }

  _disruptBalls() {
    const orig = this.balls.filter((b) => !b.held);
    const held = this.balls.filter((b) => b.held);
    const newBalls = [];
    for (const b of orig) {
      const speed = Math.round(Math.sqrt(f2n(fmul(b.vx, b.vx) + fmul(b.vy, b.vy))) * 65536);
      for (const deg of DISRUPT_ANGLES) {
        const rad = (deg * Math.PI) / 180;
        const u = { vx: toFx(Math.cos(rad)), vy: toFx(-Math.sin(rad)) };
        const ball = {
          id: this.tick + newBalls.length,
          x: b.x, y: b.y,
          vx: fmul(b.vx, u.vx) - fmul(b.vy, u.vy),
          vy: fmul(b.vx, u.vy) + fmul(b.vy, u.vx),
          held: false, loopCount: 0, bossCooldown: 0,
        };
        // re-normalize to current speed
        const curSpeed = Math.sqrt(f2n(fmul(ball.vx, ball.vx) + fmul(ball.vy, ball.vy)));
        if (curSpeed > 0) {
          ball.vx = Math.round(f2n(ball.vx) / curSpeed * speed);
          ball.vy = Math.round(f2n(ball.vy) / curSpeed * speed);
        }
        newBalls.push(ball);
      }
    }
    this.balls = [...held, ...newBalls];
  }

  _fireInput() {
    if (this.vaus.powerup === 'L') {
      if (this.vaus.laserCooldown <= 0 && this.lasers.length < 4) {
        const x1 = this.vaus.x + toFx(2);
        const x2 = this.vaus.x + this.vaus.width - toFx(2);
        const y = toFx(VAUS_Y) - toFx(4);
        this.lasers.push({ x: x1, y });
        this.lasers.push({ x: x2, y });
        this.vaus.laserCooldown = 15;
        this.bus.emit(GameEvents.LASER_FIRED, {});
      }
    } else if (this.vaus.powerup === 'C' && this.vaus.caughtBallId !== null) {
      const ball = this.balls.find((b) => b.id === this.vaus.caughtBallId);
      if (ball) {
        ball.held = false;
        this._launchBall(ball);
        this.vaus.caughtBallId = null;
      }
    }
  }

  _updateLasers() {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y -= LASER_SPEED;
      if (f2i(l.y) < PLAY_TOP) { this.lasers.splice(i, 1); continue; }
      let hit = false;
      if (this.levelData.type === 'brick') {
        const c = Math.floor((f2i(l.x) - GRID_OX) / BRICK_W);
        const r = Math.floor((f2i(l.y) - GRID_OY) / BRICK_H);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          const cell = this.grid[r][c];
          if (cell && cell.type !== 'EMPTY' && cell.hitsRemaining > 0) {
            if (cell.type !== 'GOLD') {
              cell.hitsRemaining--;
              if (cell.hitsRemaining <= 0) {
                const pts = SCORES[cell.type] || 50 * this.round;
                this._addScore(pts, 'brick');
                this.bus.emit(GameEvents.BRICK_DESTROYED, { row: r, col: c, type: cell.type, scoreDelta: pts });
              }
            }
            hit = true;
          }
        }
      }
      if (this.boss && this._aabbOverlap(l.x, l.y, toFx(2), toFx(8), this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
        this.boss.damage++;
        this._addScore(1000, 'boss');
        this.bus.emit(GameEvents.BOSS_HIT, { damage: this.boss.damage });
        if (this.boss.damage >= 16) {
          this.setState('BOSS_DEFEATED');
          this._addScore(50000, 'boss');
          this.bus.emit(GameEvents.BOSS_DEFEATED, {});
        }
        hit = true;
      }
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this._aabbOverlap(l.x, l.y, toFx(2), toFx(8), e.x, e.y, toFx(10), toFx(8))) {
          this._addScore(100, 'enemy');
          this.enemies.splice(j, 1);
          hit = true;
          break;
        }
      }
      if (hit) this.lasers.splice(i, 1);
    }
    if (this.vaus.laserCooldown > 0) this.vaus.laserCooldown--;
  }

  _updateEnemies() {
    if (this.enemySpawnTimer <= 0 && this.enemies.length < 3) {
      const type = ENEMY_TYPES[this.tick % ENEMY_TYPES.length];
      const left = (this.tick & 1) === 0;
      this.enemies.push({
        x: toFx(left ? PLAY_LEFT + 12 : PLAY_RIGHT - 12),
        y: toFx(PLAY_TOP + 12),
        type,
        phase: 0,
      });
      this.enemySpawnTimer = 480;
      this.bus.emit(GameEvents.ENEMY_SPAWNED, { type });
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.phase++;
      const desc = f2i(ENEMY_SPEED_Y[e.type]);
      if (e.type === 'Konerd' || e.type === 'Pyradok') {
        const amp = e.type === 'Konerd' ? 24 : 16;
        const period = e.type === 'Konerd' ? 120 : 90;
        e.x = toFx((PLAY_LEFT + PLAY_RIGHT) / 2) + fmul(toFx(amp), fsin(Math.floor(e.phase * 1024 / period)));
        e.y += ENEMY_SPEED_Y[e.type];
      } else {
        const radius = e.type === 'Tri_sphere' ? 12 : 16;
        const period = e.type === 'Tri_sphere' ? 150 : 180;
        e.x += fmul(toFx(radius / period * 2 * Math.PI), fcos(Math.floor(e.phase * 1024 / period)));
        e.y += ENEMY_SPEED_Y[e.type];
      }
      // Vaus contact destroys enemy harmlessly
      if (this._aabbOverlap(e.x, e.y, toFx(10), toFx(8), this.vaus.x, toFx(VAUS_Y), this.vaus.width, toFx(VAUS_H))) {
        this._addScore(100, 'enemy');
        this.enemies.splice(i, 1);
        continue;
      }
      if (f2i(e.y) > H + 10) this.enemies.splice(i, 1);
    }
  }

  _updateBoss(input) {
    if (!this.boss) return;
    if (this.boss.cooldown > 0) this.boss.cooldown--;
    this.boss.fireTimer--;
    if (this.boss.fireTimer <= 0 && this.projectiles.length < 2) {
      const dx = this.vaus.x - this.boss.x;
      const dy = toFx(VAUS_Y) - this.boss.y;
      const dist = Math.sqrt(f2n(fmul(dx, dx) + fmul(dy, dy)));
      const speed = toFx(2.0);
      this.projectiles.push({
        x: this.boss.x,
        y: this.boss.y + this.boss.h / 2,
        vx: dist > 0 ? fdiv(fmul(dx, speed), toFx(dist)) : ZERO,
        vy: fmul(speed, toFx(1)),
      });
      this.boss.fireTimer = 90;
      this.bus.emit(GameEvents.BOSS_PROJECTILE_FIRED, {});
    }
  }

  _updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (this._aabbOverlap(p.x, p.y, toFx(4), toFx(4), this.vaus.x, toFx(VAUS_Y), this.vaus.width, toFx(VAUS_H))) {
        this.projectiles.splice(i, 1);
        this._lifeLostTransition();
        return;
      }
      if (f2i(p.y) > H + 10) this.projectiles.splice(i, 1);
    }
  }

  _updatePowerupTimers() {
    if (this.vaus.powerup === 'C' && this.vaus.caughtBallId !== null) {
      this.vaus.catchTimer--;
      if (this.vaus.catchTimer <= 0) {
        const ball = this.balls.find((b) => b.id === this.vaus.caughtBallId);
        if (ball) {
          ball.held = false;
          this._launchBall(ball);
          this.vaus.caughtBallId = null;
        }
      }
    }
  }

  _allBallsLost() {
    return this.balls.length === 0;
  }

  _clearRequiredLeft() {
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = this.grid[r][c];
      if (cell && cell.clearRequired && cell.hitsRemaining > 0) n++;
    }
    return n;
  }

  _vausInWarp() {
    const x = f2i(this.vaus.x) + f2i(this.vaus.width) / 2;
    const y = VAUS_Y + VAUS_H / 2;
    const wx = PLAY_RIGHT - 18, wy = PLAY_BOTTOM - 40;
    return x >= wx - 8 && x <= wx + 18 && y >= wy && y <= wy + 24;
  }

  _lifeLostTransition() {
    this.lives--;
    this.bus.emit(GameEvents.LIFE_LOST, { lives: this.lives });
    if (this.lives <= 0) this._enterGameOver();
    else this.setState('LIFE_LOST');
  }

  _enterGameOver() {
    this.setState('GAME_OVER');
    this.bus.emit(GameEvents.GAME_OVER, { score: this.score });
    if (this.score > this.highScore) this.highScore = this.score;
    this.nameEntryPending = this.storage.qualifies(this.score);
  }

  _addScore(delta, reason) {
    const prev = this.score;
    this.score += delta;
    if (this.score > this.highScore) this.highScore = this.score;
    this.bus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta, reason });
    // Extra lives: 20k first, then every 60k
    const thresholds = [];
    thresholds.push(20000);
    for (let t = 80000; t <= this.score + delta; t += 60000) thresholds.push(t);
    for (const t of thresholds) {
      if (prev < t && this.score >= t) {
        this.lives++;
        this.bus.emit(GameEvents.EXTRA_LIFE_AWARDED, {});
      }
    }
  }

  _aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    const ahw = aw / 2, ahh = ah / 2;
    const bhw = bw / 2, bhh = bh / 2;
    return fabs(ax - bx) < ahw + bhw && fabs(ay - by) < ahh + bhh;
  }

  // Public helpers for UI
  submitName(initials) {
    initials = String(initials || '').toUpperCase().slice(0, 3);
    this.storage.addEntry({
      score: this.score,
      initials,
      round: this.round,
      region: this.region,
      mode: this.mode,
      date: new Date().toISOString(),
    });
    this.nameEntryPending = false;
    this.setState('TITLE');
  }
}
