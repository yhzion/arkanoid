import { FixedStepLoop } from '../core/fixedStep';
import { StateMachine, type GameState, type TransitionEvent } from '../core/stateMachine';
import { eventBus, GameEvents } from '../core/EventBus';
import { RNG } from '../core/rng';
import { renderer, CANVAS_W, CANVAS_H, FIELD_W, FIELD_H, HUD_X } from '../render/renderer';
import { inputManager, type InputSnapshot, EMPTY_INPUT } from '../input/input';
import { audioEngine } from '../audio/audio';
import { storageManager } from '../persistence/storage';
import type { GameConfig } from '../core/GameConfig';
import { DEFAULT_CONFIG } from '../core/GameConfig';
import { createVaus, resetVausPowerups, vausCenterX, VAUS_SPEED, VAUS_ENLARGED_W, VAUS_W, VAUS_H, VAUS_Y } from '../entities/vaus';
import { createBall, launchBall, BASE_BALL_SPEED, SLOW_BALL_SPEED, CEILING_HIT_STEP, BRICK_HIT_STEP, BRICK_HIT_INTERVAL, MAX_BALL_SPEED } from '../entities/ball';
import { createCapsule, selectCapsuleType, CATCH_AUTO_RELEASE, CAPSULE_FALL_SPEED, CAPSULE_W, CAPSULE_H } from '../entities/capsules';
import { createEnemy, updateEnemy, ENEMY_SPAWN_INTERVAL, MAX_ENEMIES, ENEMY_DESPAWN_Y, type EnemyType, ENEMY_W, ENEMY_H } from '../entities/enemies';
import { createBoss, fireProjectile, BOSS_REQUIRED_HITS, BOSS_FIRE_INTERVAL, type BossState } from '../entities/boss';
import type { ILevelData, IBrickCell } from '../data/levelSchema';
import { loadLevelData, registerLevelData } from '../core/roundState';
import { generateAllLevels } from '../data/levels';
import { brickScore, extraLivesToAward, SCORE_BREAK_WARP, SCORE_CAPSULE, SCORE_ENEMY, SCORE_BOSS_HIT, SCORE_BOSS_DEFEAT, EXTRA_LIFE_FIRST } from '../core/scoring';
import { aabbOverlap, aabbCollision, reflectVelocity, deflectBall, wallBounce } from '../physics/collision';

const ENEMY_TYPES: EnemyType[] = ['Konerd', 'Pyradok', 'Tri-sphere', 'Opopo'];

export class GameEngine {
  private loop!: FixedStepLoop;
  private stateMachine = new StateMachine();
  private rng!: RNG;
  private config!: GameConfig;

  private vaus = createVaus();
  private balls: ReturnType<typeof createBall>[] = [];
  private capsules: ReturnType<typeof createCapsule>[] = [];
  private enemies: ReturnType<typeof createEnemy>[] = [];
  private boss = createBoss();
  private level: ILevelData | null = null;

  private score = 0;
  private lives = 3;
  private round = 1;
  private tick = 0;

  private storyExit: 'idle' | 'newGame' | null = null;
  private idleTimer = 0;
  private demoActive = false;
  private playerCount = 1;
  private continueRound = 0;

  private spawnTimer = 0;
  private previousCapsule: string | null = null;
  private roundCleared = false;
  private breakExitOpen = false;
  private gameOverOnBoss = false;
  private roundIntroTicks = 0;
  private lifeLostTimer = 0;
  private clearTimer = 0;
  private bossIntroTimer = 0;
  private nameEntryActive = false;
  private initials = '';
  private nameEntryTick = 0;

  private levelSkipCount = 0;
  private continueSelectCount = 0;
  private continueHeld = false;
  private prevContinueHeld = false;

  private lastInput = EMPTY_INPUT;
  private settingsPanel!: HTMLElement;

  init(canvas: HTMLCanvasElement, settingsPanel: HTMLElement): void {
    this.settingsPanel = settingsPanel;
    this.config = { ...DEFAULT_CONFIG };
    this.rng = new RNG(this.config.deterministicSeed);

    renderer.init(canvas);
    inputManager.init(canvas);
    audioEngine.init(this.config);

    this.registerAllLevels();
    this.setupStateMachine();
    this.setupInput();
    this.setupSettingsPanel();
    this.setupLeaderboardReset();
    this.setupNameEntry();

    this.loop = new FixedStepLoop({
      tick: (ms) => this.tickUpdate(ms),
      render: (interp) => this.renderFrame(interp),
    });

    this.stateMachine.setState('BOOT');
    eventBus.emit(GameEvents.APP_BOOTED);

    setTimeout(() => {
      this.stateMachine.transition('assets_loaded');
      this.loop.start();
    }, 100);
  }

  private registerAllLevels(): void {
    const allLevels = generateAllLevels();
    for (const level of allLevels.values()) {
      registerLevelData(level);
    }
  }

  private setupStateMachine(): void {
    this.stateMachine.on('*', (from, to) => {
      this.onStateChange(from, to);
    });
  }

  private onStateChange(from: GameState, to: GameState): void {
    switch (to) {
      case 'TITLE':
        this.idleTimer = 0;
        this.storyExit = null;
        this.demoActive = false;
        this.continueSelectCount = 0;
        this.continueHeld = false;
        this.prevContinueHeld = false;
        this.gameOverOnBoss = false;
        eventBus.emit(GameEvents.TITLE_SHOWN);
        break;
      case 'OPENING_STORY':
        this.idleTimer = 0;
        break;
      case 'ROUND_INTRO':
        this.roundIntroTicks = 0;
        this.levelSkipCount = 0;
        this.loadRound(this.round);
        eventBus.emit(GameEvents.ROUND_STARTED);
        break;
      case 'BALL_READY':
        this.prepareBallOnVaus();
        break;
      case 'PLAYING':
        this.gameOverOnBoss = false;
        break;
      case 'PAUSED':
        break;
      case 'LIFE_LOST':
        this.lifeLostTimer = 0;
        break;
      case 'ROUND_CLEAR':
        this.clearTimer = 0;
        eventBus.emit(GameEvents.ROUND_CLEARED, { round: this.round });
        break;
      case 'BOSS_INTRO':
        this.bossIntroTimer = 120;
        break;
      case 'BOSS_PLAYING':
        this.gameOverOnBoss = true;
        this.boss.active = true;
        this.boss.fireTimer = 0;
        eventBus.emit(GameEvents.BOSS_STARTED);
        break;
      case 'GAME_OVER':
        eventBus.emit(GameEvents.GAME_OVER);
        this.idleTimer = 0;
        break;
      case 'NAME_ENTRY':
        this.initials = '';
        this.nameEntryTick = 0;
        eventBus.emit(GameEvents.NAME_ENTRY_STARTED);
        break;
      case 'ENDING':
        this.idleTimer = 0;
        eventBus.emit(GameEvents.ENDING_STARTED);
        break;
      case 'BREAK_WARP':
        eventBus.emit(GameEvents.BREAK_WARP_ENTERED);
        break;
    }
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      const state = this.stateMachine.getState();
      if (e.code === 'KeyM') {
        this.config.audioEnabled = !this.config.audioEnabled;
        audioEngine.setMuted(!this.config.audioEnabled);
      }
      if (e.code === 'KeyF') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
      if (e.code === 'Escape' && (state === 'PLAYING' || state === 'PAUSED')) {
        this.stateMachine.setState('TITLE');
      }
    });
  }

  private processInput(snap: InputSnapshot): void {
    const state = this.stateMachine.getState();
    if (snap.fullscreen) {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }

    if (state === 'TITLE') {
      if (snap.select) {
        this.playerCount = this.playerCount === 1 ? 2 : 1;
        eventBus.emit(GameEvents.PLAYER_COUNT_CHANGED);
      }
      if (snap.start) {
        this.storyExit = 'newGame';
        this.score = 0;
        this.lives = 3;
        this.round = 1;
        this.continueRound = 0;
        this.stateMachine.transition('start_pressed');
        return;
      }
      if (snap.selectHeld && snap.fireHeld) {
        if (!this.prevContinueHeld) {
          this.continueSelectCount++;
          this.prevContinueHeld = true;
          if (this.continueSelectCount >= 5 && this.continueRound > 0) {
            this.stateMachine.transition('continue_code');
            this.score = 0;
            this.round = this.continueRound;
          }
        }
      } else {
        this.prevContinueHeld = false;
      }
    }

    if (state === 'ROUND_INTRO' || state === 'BALL_READY') {
      if (this.config.enableManualLevelSkipSecret && snap.fire && snap.start) {
        this.levelSkipCount++;
        if (this.levelSkipCount <= 16) {
          this.round++;
          this.loadRound(this.round);
          this.stateMachine.transition('level_skip');
        }
      }
    }

    if (state === 'BALL_READY') {
      if (snap.fire || snap.pointerActive) {
        this.launchBalls();
        this.stateMachine.transition('fire_pressed');
      }
    }

    if ((state === 'PLAYING' || state === 'BALL_READY' || state === 'BOSS_PLAYING') && snap.start) {
      this.stateMachine.transition('pause_pressed');
    }

    if (state === 'PAUSED' && snap.start) {
      this.stateMachine.transition('pause_pressed');
    }

    this.lastInput = snap;
  }

  private nameEntryKeys = '';
  private handleNameEntryInput(_snap: InputSnapshot): void {
    this.nameEntryTick++;
    if (this.initials.length >= 3) {
      if (_snap.start) {
        this.saveHighScore();
        this.stateMachine.transition('name_entry_done');
      }
      return;
    }
    if (this.nameEntryKeys !== this.lastInputKey) {
      this.nameEntryKeys = this.lastInputKey;
    }
  }

  private lastInputKey = '';
  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.stateMachine.getState() === 'NAME_ENTRY') {
      if (e.code === 'Enter' && this.initials.length > 0) {
        this.initials = this.initials.padEnd(3, ' ').slice(0, 3).toUpperCase();
        this.saveHighScore();
        this.stateMachine.transition('name_entry_done');
        e.preventDefault();
        return;
      }
      if (e.code === 'Backspace' && this.initials.length > 0) {
        this.initials = this.initials.slice(0, -1);
        e.preventDefault();
        return;
      }
      if (this.initials.length < 3 && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        this.initials += e.key.toUpperCase();
        e.preventDefault();
      }
    }
  };

  private setupNameEntry(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  private setupSettingsPanel(): void {
    this.settingsPanel.innerHTML = `
      <h3>Settings</h3>
      <label>Master Vol <input type="range" id="master-vol" min="0" max="1" step="0.1" value="${this.config.audioEnabled ? 1 : 0}"></label>
      <label>Music Vol <input type="range" id="music-vol" min="0" max="1" step="0.1" value="${this.config.musicVolume}"></label>
      <label>SFX Vol <input type="range" id="sfx-vol" min="0" max="1" step="0.1" value="${this.config.sfxVolume}"></label>
      <button id="reset-leaderboard">Reset Leaderboard</button>
      <button id="close-settings">Close</button>
    `;

    document.getElementById('master-vol')?.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      audioEngine.setMasterVolume(v);
    });
    document.getElementById('music-vol')?.addEventListener('input', (e) => {
      audioEngine.setMusicVolume(parseFloat((e.target as HTMLInputElement).value));
    });
    document.getElementById('sfx-vol')?.addEventListener('input', (e) => {
      audioEngine.setSfxVolume(parseFloat((e.target as HTMLInputElement).value));
    });
    document.getElementById('close-settings')?.addEventListener('click', () => {
      this.settingsPanel.classList.remove('visible');
    });
  }

  private setupLeaderboardReset(): void {
    document.getElementById('reset-leaderboard')?.addEventListener('click', () => {
      storageManager.resetLeaderboard();
    });
  }

  toggleSettings(): void {
    this.settingsPanel.classList.toggle('visible');
  }

  loadRound(round: number): void {
    const isBossRound = round === 36;
    if (isBossRound) {
      this.level = {
        id: `us-round-36`,
        region: 'US',
        roundNumber: 36,
        type: 'boss',
        grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
        clearRequiredCount: 0,
        cells: [],
        enemyProfile: 'boss',
        ballProfile: 'boss',
        paletteProfile: 'boss',
      };
      this.boss = createBoss();
    } else {
      this.level = loadLevelData('US', round);
      this.boss = createBoss();
      this.boss.active = false;
    }

    this.vaus = createVaus();
    this.balls = [createBall(this.vaus.x + this.vaus.w / 2 - 2, this.vaus.y - 4)];
    this.capsules = [];
    this.enemies = [];
    this.spawnTimer = 0;
    this.previousCapsule = null;
    this.roundCleared = false;
    this.breakExitOpen = false;
  }

  private prepareBallOnVaus(): void {
    this.balls = [createBall(this.vaus.x + this.vaus.w / 2 - 2, this.vaus.y - 4)];
    this.balls[0].stuckToVaus = true;
  }

  private launchBalls(): void {
    for (const ball of this.balls) {
      if (ball.stuckToVaus) {
        const speed = this.vaus.hasSlow ? SLOW_BALL_SPEED : BASE_BALL_SPEED;
        launchBall(ball, vausCenterX(this.vaus), FIELD_W, speed);
      }
    }
    eventBus.emit(GameEvents.BALL_LAUNCHED);
  }

  private tickUpdate(_ms: number): void {
    this.tick++;
    const state = this.stateMachine.getState();
    const snap = inputManager.sample();
    this.processInput(snap);

    if (state === 'NAME_ENTRY') {
      this.nameEntryTick++;
      return;
    }

    switch (state) {
      case 'TITLE':
        this.idleTimer++;
        if (this.idleTimer >= 600) {
          this.storyExit = 'idle';
          this.idleTimer = 0;
          this.stateMachine.transition('idle_600t');
        }
        break;

      case 'OPENING_STORY':
        this.idleTimer++;
        if (this.idleTimer >= 600) {
          this.idleTimer = 0;
          if (this.storyExit === 'idle') {
            this.stateMachine.transition('story_idle_end');
          } else {
            this.stateMachine.transition('story_game_start');
          }
        }
        break;

      case 'GAMEPLAY_DEMO':
        this.idleTimer++;
        if (this.idleTimer >= 600) {
          this.stateMachine.transition('demo_end');
        }
        break;

      case 'ROUND_INTRO':
        this.roundIntroTicks++;
        if (this.roundIntroTicks >= 60) {
          this.stateMachine.transition('jingle_complete');
        }
        break;

      case 'BALL_READY':
        this.moveVaus(this.lastInput);
        this.updateStuckBall();
        break;

      case 'PLAYING':
        this.updatePlaying();
        break;

      case 'BOSS_PLAYING':
        this.updateBossPlaying();
        break;

      case 'LIFE_LOST':
        this.lifeLostTimer++;
        if (this.lifeLostTimer >= 60) {
          resetVausPowerups(this.vaus);
          this.stateMachine.transition('lives_remaining');
        }
        break;

      case 'PAUSED':
        break;

      case 'ROUND_CLEAR':
        this.clearTimer++;
        if (this.clearTimer >= 120) {
          if (this.level?.type === 'boss' || this.round >= 35) {
            this.stateMachine.transition('boss_round');
          } else {
            this.round++;
            this.loadRound(this.round);
            this.stateMachine.transition('next_round');
          }
        }
        break;

      case 'BREAK_WARP':
        this.idleTimer++;
        if (this.idleTimer >= 60) {
          this.score += SCORE_BREAK_WARP;
          eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: SCORE_BREAK_WARP, reason: 'break_warp' });
          this.round++;
          this.loadRound(this.round);
          this.stateMachine.transition('next_round');
        }
        break;

      case 'BOSS_INTRO':
        this.bossIntroTimer--;
        if (this.bossIntroTimer <= 0) {
          this.stateMachine.transition('boss_intro_end');
        }
        break;

      case 'BOSS_DEFEATED':
        this.idleTimer++;
        if (this.idleTimer >= 120) {
          this.stateMachine.transition('defeat_sequence_end');
        }
        break;

      case 'GAME_OVER':
        this.idleTimer++;
        if (this.idleTimer >= 180) {
          this.continueRound = this.round;
          if (this.gameOverOnBoss || !this.config.enableHighScoreNameEntry || !storageManager.qualifiesForLeaderboard(this.score)) {
            this.stateMachine.transition('no_leaderboard');
          } else {
            this.stateMachine.transition('qualifies_leaderboard');
          }
        }
        break;

      case 'ENDING':
        this.idleTimer++;
        if (this.idleTimer >= 900) {
          this.stateMachine.transition('credits_end');
        }
        break;
    }
  }

  private moveVaus(input: InputSnapshot): void {
    const speed = VAUS_SPEED;
    if (input.left) this.vaus.x -= speed;
    if (input.right) this.vaus.x += speed;

    if (input.pointerActive && (this.config.inputMode === 'relative-pointer' || this.config.inputMode === 'absolute-pointer' || this.config.inputMode === 'touch')) {
      if (this.config.inputMode === 'absolute-pointer') {
        this.vaus.x = input.pointerX - this.vaus.w / 2;
      }
    }

    this.vaus.x = Math.max(0, Math.min(FIELD_W - this.vaus.w, this.vaus.x));
  }

  private updateStuckBall(): void {
    for (const ball of this.balls) {
      if (ball.stuckToVaus) {
        ball.x = vausCenterX(this.vaus) - ball.w / 2;
        ball.y = this.vaus.y - ball.h;
      }
    }
  }

  private updatePlaying(): void {
    this.moveVaus(this.lastInput);
    this.updateStuckBall();

    const activeBalls = this.balls.filter(b => b.active);
    if (this.vaus.laserCooldown > 0) this.vaus.laserCooldown--;

    for (const ball of activeBalls) {
      this.updateBall(ball);
    }

    this.updateCapsules();
    this.updateEnemies();

    if (this.breakExitOpen) {
      if (aabbOverlap(
        { x: this.vaus.x, y: this.vaus.y, w: this.vaus.w, h: this.vaus.h },
        { x: FIELD_W - 12, y: 200, w: 8, h: 24 }
      )) {
        this.balls.forEach(b => { if (b.active) b.active = false; });
        this.stateMachine.transition('break_warp_entered');
        return;
      }
    }

    if (this.vaus.laserCooldown === 0 && this.lastInput.fire && this.vaus.hasLaser) {
      this.fireLaser();
      this.vaus.laserCooldown = 15;
    }

    const aliveBalls = this.balls.filter(b => b.active).length;
    if (aliveBalls === 0) {
      eventBus.emit(GameEvents.BALL_LOST, { ballsRemaining: 0 });
      eventBus.emit(GameEvents.LIFE_LOST);
      this.lives--;
      if (this.lives <= 0) {
        this.stateMachine.transition('no_lives');
      } else {
        this.stateMachine.transition('all_balls_lost');
      }
      return;
    }

    if (this.level && !this.roundCleared) {
      const remaining = this.level.cells.filter(c => c.clearRequired && c.type !== 'EMPTY' && c.hitsRemaining > 0);
      if (remaining.length === 0) {
        this.roundCleared = true;
        resetVausPowerups(this.vaus);
        this.stateMachine.transition('round_cleared');
      }
    }
  }

  private updateBall(ball: ReturnType<typeof createBall>): void {
    if (!ball.active) return;

    const newX = ball.x + ball.vx;
    const newY = ball.y + ball.vy;

    const bounce = wallBounce(ball.vx, ball.vy, newX, newY, ball.w, ball.h, FIELD_W, FIELD_H);
    ball.vx = bounce.vx;
    ball.vy = bounce.vy;

    if (bounce.ceilingHit && !ball.ceilingHitThisRound) {
      ball.ceilingHitThisRound = true;
      ball.speed = Math.min(MAX_BALL_SPEED, ball.speed + CEILING_HIT_STEP);
      normalizeSpeed(ball);
    }
    if (bounce.wallHit) ball.loopCounter++;

    ball.x = newX;
    ball.y = newY;

    if (ball.y > FIELD_H) {
      ball.active = false;
      return;
    }

    if (!ball.stuckToVaus && this.vaus.hasCatch && aabbOverlap(
      { x: ball.x, y: ball.y, w: ball.w, h: ball.h },
      { x: this.vaus.x, y: this.vaus.y, w: this.vaus.w, h: this.vaus.h }
    ) && ball.lastCollisionId !== this.tick) {
      ball.stuckToVaus = true;
      ball.vx = 0;
      ball.vy = 0;
      ball.autoReleaseTick = this.tick + CATCH_AUTO_RELEASE;
      ball.lastCollisionId = this.tick;
      eventBus.emit(GameEvents.POWERUP_ACTIVATED);
      return;
    }

    if (ball.stuckToVaus) {
      ball.x = vausCenterX(this.vaus) - ball.w / 2;
      ball.y = this.vaus.y - ball.h;
      if (this.tick >= ball.autoReleaseTick) {
        this.releaseCaughtBall(ball);
      }
      return;
    }

    const ballAABB = { x: ball.x, y: ball.y, w: ball.w, h: ball.h };

    if (aabbOverlap(ballAABB, { x: this.vaus.x, y: this.vaus.y, w: this.vaus.w, h: this.vaus.h }) && ball.lastCollisionId !== this.tick) {
      ball.loopCounter = 0;
      const deflected = deflectBall(
        ball.x + ball.w / 2,
        vausCenterX(this.vaus),
        this.vaus.w,
        ball.speed,
        this.config.deflectionModel
      );
      ball.vx = deflected.x;
      ball.vy = deflected.y;
      ball.y = this.vaus.y - ball.h;
      ball.lastCollisionId = this.tick;
      eventBus.emit(GameEvents.BRICK_HIT);
    }

    if (this.level && this.level.type === 'brick') {
      this.checkBrickCollision(ball);
    }
  }

  private checkBrickCollision(ball: ReturnType<typeof createBall>): void {
    if (!this.level) return;
    const g = this.level.grid;

    for (const cell of this.level.cells) {
      if (cell.type === 'EMPTY' || cell.hitsRemaining <= 0) continue;
      const bx = 8 + cell.col * g.brickWidth;
      const by = 8 + cell.row * g.brickHeight;
      const brickAABB = { x: bx, y: by, w: g.brickWidth, h: g.brickHeight };

      if (aabbOverlap({ x: ball.x, y: ball.y, w: ball.w, h: ball.h }, brickAABB) && ball.lastCollisionId !== this.tick) {
        const col = aabbCollision(
          { x: ball.x, y: ball.y, w: ball.w, h: ball.h },
          brickAABB
        );
        if (col.hit) {
          const reflected = reflectVelocity(ball.vx, ball.vy, col.normal, ball.speed);
          ball.vx = reflected.x;
          ball.vy = reflected.y;
          ball.lastCollisionId = this.tick;

          if (cell.type !== 'GOLD') {
            cell.hitsRemaining--;
            const score = brickScore(cell.type, this.round);
            this.score += score;
            eventBus.emit(GameEvents.BRICK_DESTROYED, { row: cell.row, col: cell.col, type: cell.type, scoreDelta: score });
            eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: score, reason: 'brick' });

            const livesBefore = this.lives;
            const extra = extraLivesToAward(this.score - score, this.score);
            for (let i = 0; i < extra; i++) {
              this.lives++;
              eventBus.emit(GameEvents.EXTRA_LIFE_AWARDED);
            }

            ball.brickHitCounter++;
            if (ball.brickHitCounter % BRICK_HIT_INTERVAL === 0) {
              ball.speed = Math.min(MAX_BALL_SPEED, ball.speed + BRICK_HIT_STEP);
              normalizeSpeed(ball);
            }

            if (cell.isCapsuleCarrier && cell.hitsRemaining <= 0 && this.balls.filter(b => b.active).length < 2) {
              this.spawnCapsule(cell);
            }

            if (cell.hitsRemaining <= 0) {
              cell.type = 'EMPTY';
            }
          } else {
            eventBus.emit(GameEvents.BRICK_HIT);
          }
          break;
        }
      }
    }
  }

  private spawnCapsule(cell: IBrickCell): void {
    const ct = selectCapsuleType(() => this.rng.next(), this.previousCapsule);
    this.previousCapsule = ct;
    const bx = 8 + cell.col * 16 + 8;
    const by = 8 + cell.row * 8 + 4;
    this.capsules.push(createCapsule(bx, by, ct));
    eventBus.emit(GameEvents.CAPSULE_SPAWNED, { row: cell.row, col: cell.col, capsuleType: ct! });
  }

  private updateCapsules(): void {
    for (const cap of this.capsules) {
      if (!cap.active) continue;
      cap.y += cap.fallSpeed;
      if (cap.y > FIELD_H) { cap.active = false; continue; }

      if (aabbOverlap(
        { x: this.vaus.x, y: this.vaus.y, w: this.vaus.w, h: this.vaus.h },
        { x: cap.x, y: cap.y, w: cap.w, h: cap.h }
      )) {
        cap.active = false;
        this.score += SCORE_CAPSULE;
        eventBus.emit(GameEvents.CAPSULE_COLLECTED, { type: cap.type ?? '' });
        eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: SCORE_CAPSULE, reason: 'capsule' });
        this.applyPowerup(cap.type);
      }
    }
    this.capsules = this.capsules.filter(c => c.active);
  }

  private applyPowerup(type: string | null): void {
    switch (type) {
      case 'S':
        this.vaus.hasSlow = true;
        this.balls.forEach(b => { if (b.active) { b.speed = SLOW_BALL_SPEED; normalizeSpeed(b); } });
        resetVausPowerups(this.vaus);
        this.vaus.hasSlow = true;
        break;
      case 'C':
        resetVausPowerups(this.vaus);
        this.vaus.hasCatch = true;
        break;
      case 'L':
        resetVausPowerups(this.vaus);
        this.vaus.hasLaser = true;
        break;
      case 'D':
        this.splitBalls();
        this.vaus.hasDisruption = true;
        break;
      case 'P':
        this.lives++;
        eventBus.emit(GameEvents.EXTRA_LIFE_AWARDED);
        return;
      case 'E':
        resetVausPowerups(this.vaus);
        this.vaus.enlarged = true;
        this.vaus.w = VAUS_ENLARGED_W;
        break;
      case 'B':
        if (this.round < 35) {
          resetVausPowerups(this.vaus);
          this.vaus.hasBreak = true;
          this.breakExitOpen = true;
          eventBus.emit(GameEvents.BREAK_WARP_OPENED);
        }
        break;
    }
    eventBus.emit(GameEvents.POWERUP_ACTIVATED);
  }

  private splitBalls(): void {
    const splitBalls = this.balls.filter(b => b.active);
    const newBalls: typeof this.balls = [];

    for (const ball of splitBalls) {
      const angleRad = 15 * (Math.PI / 180);
      const cos15 = Math.cos(angleRad);
      const sin15 = Math.sin(angleRad);

      const b1 = createBall(ball.x, ball.y);
      b1.active = true;
      b1.speed = ball.speed;
      b1.vx = ball.vx * cos15 - ball.vy * sin15;
      b1.vy = ball.vx * sin15 + ball.vy * cos15;
      normalizeSpeed(b1);

      const b2 = createBall(ball.x, ball.y);
      b2.active = true;
      b2.speed = ball.speed;
      b2.vx = ball.vx * cos15 + ball.vy * sin15;
      b2.vy = -ball.vx * sin15 + ball.vy * cos15;
      normalizeSpeed(b2);

      newBalls.push(b1, b2);
    }

    this.balls.push(...newBalls);
    eventBus.emit(GameEvents.POWERUP_ACTIVATED);
  }

  private fireLaser(): void {
    const laserW = 2;
    const laserH = 8;
    eventBus.emit(GameEvents.LASER_FIRED);
    const leftX = this.vaus.x;
    const rightX = this.vaus.x + this.vaus.w - laserW;

    if (this.level && this.level.type === 'brick') {
      const g = this.level.grid;
      for (const laserX of [leftX, rightX]) {
        for (const cell of this.level.cells) {
          if (cell.type === 'EMPTY' || cell.hitsRemaining <= 0) continue;
          const bx = 8 + cell.col * g.brickWidth;
          const by = 8 + cell.row * g.brickHeight;
          if (laserX >= bx && laserX <= bx + g.brickWidth && this.vaus.y > by + g.brickHeight) {
            if (cell.type !== 'GOLD') {
              cell.hitsRemaining--;
              const score = brickScore(cell.type, this.round);
              this.score += score;
              eventBus.emit(GameEvents.BRICK_DESTROYED, { row: cell.row, col: cell.col, type: cell.type, scoreDelta: score });
              eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: score, reason: 'laser' });
              if (cell.hitsRemaining <= 0) cell.type = 'EMPTY';
            }
            break;
          }
        }
      }
    }
  }

  private updateEnemies(): void {
    if (!this.level || this.level.type !== 'brick') return;
    this.spawnTimer++;

    const activeEnemies = this.enemies.filter(e => e.active);

    if (this.spawnTimer >= ENEMY_SPAWN_INTERVAL && activeEnemies.length < MAX_ENEMIES) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      updateEnemy(enemy, this.tick);

      if (enemy.y > ENEMY_DESPAWN_Y) { enemy.active = false; continue; }

      for (const ball of this.balls) {
        if (!ball.active) continue;
        if (aabbOverlap(
          { x: ball.x, y: ball.y, w: ball.w, h: ball.h },
          { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h }
        ) && ball.lastCollisionId !== this.tick) {
          const col = aabbCollision(
            { x: ball.x, y: ball.y, w: ball.w, h: ball.h },
            { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h }
          );
          if (col.hit) {
            const reflected = reflectVelocity(ball.vx, ball.vy, col.normal, ball.speed);
            ball.vx = reflected.x;
            ball.vy = reflected.y;
            ball.lastCollisionId = this.tick;
          }
          enemy.active = false;
          this.score += SCORE_ENEMY;
          eventBus.emit(GameEvents.ENEMY_DESTROYED);
          eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: SCORE_ENEMY, reason: 'enemy' });
        }
      }

      if (aabbOverlap(
        { x: this.vaus.x, y: this.vaus.y, w: this.vaus.w, h: this.vaus.h },
        { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h }
      )) {
        enemy.active = false;
        this.score += SCORE_ENEMY;
        eventBus.emit(GameEvents.ENEMY_DESTROYED);
        eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: SCORE_ENEMY, reason: 'enemy' });
      }
    }

    this.enemies = this.enemies.filter(e => e.active);
  }

  private spawnEnemy(): void {
    const type = ENEMY_TYPES[Math.floor(this.rng.next() * ENEMY_TYPES.length)];
    const x = this.rng.next() < 0.5 ? 16 : FIELD_W - 16;
    this.enemies.push(createEnemy(type, x, 0, this.tick));
    eventBus.emit(GameEvents.ENEMY_SPAWNED);
  }

  private updateBossPlaying(): void {
    this.moveVaus(this.lastInput);
    this.updateStuckBall();

    if (this.vaus.laserCooldown > 0) this.vaus.laserCooldown--;

    for (const ball of this.balls) {
      if (!ball.active) continue;
      const newX = ball.x + ball.vx;
      const newY = ball.y + ball.vy;
      const bounce = wallBounce(ball.vx, ball.vy, newX, newY, ball.w, ball.h, FIELD_W, FIELD_H);
      ball.vx = bounce.vx;
      ball.vy = bounce.vy;
      ball.x = newX;
      ball.y = newY;

      if (ball.y > FIELD_H) { ball.active = false; continue; }
      if (ball.stuckToVaus) { ball.x = vausCenterX(this.vaus) - ball.w / 2; ball.y = this.vaus.y - ball.h; continue; }

      if (aabbOverlap(
        { x: ball.x, y: ball.y, w: ball.w, h: ball.h },
        { x: this.vaus.x, y: this.vaus.y, w: this.vaus.w, h: this.vaus.h }
      ) && ball.lastCollisionId !== this.tick) {
        const deflected = deflectBall(ball.x + ball.w / 2, vausCenterX(this.vaus), this.vaus.w, ball.speed, this.config.deflectionModel);
        ball.vx = deflected.x; ball.vy = deflected.y;
        ball.y = this.vaus.y - ball.h;
        ball.lastCollisionId = this.tick;
      }

      if (aabbOverlap(
        { x: ball.x, y: ball.y, w: ball.w, h: ball.h },
        { x: this.boss.x, y: this.boss.y, w: this.boss.w, h: this.boss.h }
      ) && ball.lastCollisionId !== this.tick) {
        const col = aabbCollision(
          { x: ball.x, y: ball.y, w: ball.w, h: ball.h },
          { x: this.boss.x, y: this.boss.y, w: this.boss.w, h: this.boss.h }
        );
        if (col.hit) {
          const reflected = reflectVelocity(ball.vx, ball.vy, col.normal, ball.speed);
          ball.vx = reflected.x; ball.vy = reflected.y;
          ball.lastCollisionId = this.tick;
          this.boss.hits++;
          this.score += SCORE_BOSS_HIT;
          eventBus.emit(GameEvents.BOSS_HIT, { damage: this.boss.hits });
          eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: SCORE_BOSS_HIT, reason: 'boss' });

          if (this.boss.hits >= BOSS_REQUIRED_HITS) {
            this.score += SCORE_BOSS_DEFEAT;
            eventBus.emit(GameEvents.SCORE_CHANGED, { newScore: this.score, delta: SCORE_BOSS_DEFEAT, reason: 'boss_defeat' });
            eventBus.emit(GameEvents.BOSS_DEFEATED);
            this.stateMachine.transition('boss_defeated');
          }
        }
      }
    }

    this.boss.fireTimer++;
    if (this.boss.fireTimer >= BOSS_FIRE_INTERVAL) {
      this.boss.fireTimer = 0;
      fireProjectile(this.boss, vausCenterX(this.vaus), this.vaus.y);
      eventBus.emit(GameEvents.BOSS_PROJECTILE_FIRED);
    }

    for (const proj of this.boss.projectiles) {
      if (!proj.active) continue;
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.y > FIELD_H || proj.x < 0 || proj.x > FIELD_W) { proj.active = false; continue; }
      if (aabbOverlap(
        { x: this.vaus.x, y: this.vaus.y, w: this.vaus.w, h: this.vaus.h },
        { x: proj.x, y: proj.y, w: 4, h: 4 }
      )) {
        proj.active = false;
        eventBus.emit(GameEvents.LIFE_LOST);
        this.lives--;
        if (this.lives <= 0) {
          this.stateMachine.transition('no_lives');
        } else {
          this.prepareBallOnVaus();
          this.boss.fireTimer = 0;
        }
      }
    }
    this.boss.projectiles = this.boss.projectiles.filter(p => p.active);
  }

  private releaseCaughtBall(ball: ReturnType<typeof createBall>): void {
    ball.stuckToVaus = false;
    const speed = this.vaus.hasSlow ? SLOW_BALL_SPEED : BASE_BALL_SPEED;
    launchBall(ball, vausCenterX(this.vaus), FIELD_W, speed);
  }

  private saveHighScore(): void {
    storageManager.saveLeaderboard({
      score: this.score,
      initials: this.initials.padEnd(3, ' ').slice(0, 3).toUpperCase(),
      round: this.round,
      region: this.config.region,
      mode: this.config.mode,
      date: new Date().toISOString(),
    });
  }

  private renderFrame(_interpolation: number): void {
    const state = this.stateMachine.getState();

    if (state === 'NAME_ENTRY') {
      renderer.clear();
      renderer.renderNameEntry(this.nameEntryTick, this.initials, 0);
      return;
    }

    renderer.render(
      state,
      this.tick,
      state === 'PLAYING' || state === 'BALL_READY' || state === 'BOSS_PLAYING' || state === 'ROUND_INTRO' || state === 'LIFE_LOST' ? this.vaus : undefined,
      state === 'PLAYING' || state === 'BALL_READY' || state === 'BOSS_PLAYING' || state === 'ROUND_INTRO' ? this.balls : undefined,
      this.level ?? undefined,
      state !== 'TITLE' && state !== 'OPENING_STORY' && state !== 'GAMEPLAY_DEMO' ? this.score : undefined,
      state !== 'TITLE' && state !== 'OPENING_STORY' && state !== 'GAMEPLAY_DEMO' ? this.lives : undefined,
      this.round,
      state === 'PLAYING' || state === 'BALL_READY' ? this.capsules : undefined,
      state === 'PLAYING' ? this.enemies : undefined,
      state === 'BOSS_PLAYING' || state === 'BOSS_INTRO' ? this.boss : undefined,
    );
  }
}

function normalizeSpeed(ball: { vx: number; vy: number; speed: number }): void {
  const len = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (len > 0) {
    ball.vx = (ball.vx / len) * ball.speed;
    ball.vy = (ball.vy / len) * ball.speed;
  }
}
