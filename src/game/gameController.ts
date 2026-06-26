/**
 * GameController — integration of state machine + sim + flow + audio + persistence.
 *
 * Drives the §31 transition table for the single-player path: TITLE → ROUND_INTRO →
 * BALL_READY → PLAYING → ROUND_CLEAR → (next | BOSS) → ENDING → TITLE, with
 * LIFE_LOST / GAME_OVER / NAME_ENTRY branches. Called once per simulation tick by
 * the fixed-step loop. 2P handoff (TURN_HANDOFF) is [DEFERRED → M3] and not wired
 * here beyond the TurnManager baseline (playerContext.ts).
 */
import { EventBus, GameEvents } from '../core/eventBus';
import { StateMachine, GameState } from '../core/stateMachine';
import { GameConfig } from '../core/config';
import { Mulberry32, seedFromString } from '../core/rng';
import { bossRound, brickRounds, STARTING_LIVES } from '../core/constants';
import { ILevelData } from '../data/schemas';
import { RoundSim } from './roundSim';
import { BossSim } from './bossSim';
import { ScoreTracker } from './scoring';
import { TitleFlow } from './titleFlow';
import { NameEntry } from './nameEntry';
import { PersistenceStore } from '../data/persistence';
import { InputSnapshot } from '../input/input';

export type LevelProvider = (region: 'US' | 'JP', round: number) => ILevelData;

export interface ControllerDeps {
  config: GameConfig;
  bus: EventBus;
  store: PersistenceStore;
  levelProvider: LevelProvider;
}

export class GameController {
  readonly sm: StateMachine;
  readonly bus: EventBus;
  readonly title = new TitleFlow();
  readonly nameEntry = new NameEntry();
  config: GameConfig;
  score: ScoreTracker;
  lives = STARTING_LIVES;
  round = 1;
  region: 'US' | 'JP';

  private store: PersistenceStore;
  private levelProvider: LevelProvider;
  private capsuleRng: Mulberry32;
  private sim: RoundSim | null = null;
  private boss: BossSim | null = null;
  private timer = 0;
  /** Round-clear / intro jingle length in ticks (provisional). */
  private static ROUND_INTRO_TICKS = 60;
  private static ROUND_CLEAR_TICKS = 90;
  private static ENDING_TICKS = 240;

  constructor(deps: ControllerDeps) {
    this.config = deps.config;
    this.bus = deps.bus;
    this.store = deps.store;
    this.levelProvider = deps.levelProvider;
    this.region = deps.config.region;
    this.sm = new StateMachine();
    this.score = new ScoreTracker(this.bus, (n) => {
      this.lives += n;
    });
    this.capsuleRng = new Mulberry32(seedFromString(deps.config.deterministicSeed));
  }

  /** Boot → TITLE after audio/assets are ready. */
  bootToTitle(): void {
    this.sm.transition(GameState.LOADING);
    this.sm.transition(GameState.TITLE);
    this.bus.emit(GameEvents.TITLE_SHOWN);
  }

  /** Per-tick advance. `input` is the sampled snapshot for this tick. */
  tick(input: InputSnapshot): void {
    this.sm.tickState();
    switch (this.sm.state) {
      case GameState.TITLE:
        this.tickTitle(input);
        break;
      case GameState.ROUND_INTRO:
        this.tickRoundIntro();
        break;
      case GameState.BALL_READY:
      case GameState.PLAYING:
        this.tickPlaying(input);
        break;
      case GameState.ROUND_CLEAR:
        this.tickRoundClear();
        break;
      case GameState.LIFE_LOST:
        // RoundSim.resetForLife already ran; brief pause then BALL_READY.
        if (++this.timer >= 30) {
          this.timer = 0;
          this.sm.transition(GameState.BALL_READY);
        }
        break;
      case GameState.BOSS_INTRO:
        if (++this.timer >= 60) {
          this.timer = 0;
          this.sm.transition(GameState.BOSS_PLAYING);
        }
        break;
      case GameState.BOSS_PLAYING:
        this.tickBoss(input);
        break;
      case GameState.BOSS_DEFEATED:
        if (++this.timer >= 90) {
          this.timer = 0;
          this.sm.transition(GameState.ENDING);
          this.bus.emit(GameEvents.ENDING_STARTED);
        }
        break;
      case GameState.ENDING:
        if (++this.timer >= GameController.ENDING_TICKS) {
          this.timer = 0;
          this.sm.transition(GameState.TITLE);
          this.bus.emit(GameEvents.RETURNED_TO_TITLE);
        }
        break;
      case GameState.GAME_OVER:
        this.tickGameOver();
        break;
      case GameState.NAME_ENTRY:
        this.tickNameEntry(input);
        break;
      case GameState.OPENING_STORY:
        // Simplified: story completes immediately on first input → start game.
        if (input.firePressed || input.start) {
          const ev = this.title.storyComplete();
          if (ev.startGame) this.beginGame();
        }
        break;
      default:
        break;
    }
  }

  // --- TITLE ---------------------------------------------------------------

  private tickTitle(input: InputSnapshot): void {
    const any = input.firePressed || input.start || input.left || input.right;
    this.title.tick(any);
    if (input.start || input.firePressed) {
      // Begin new game via story (newGame exit).
      this.sm.transition(GameState.OPENING_STORY);
      this.title.startNewGame();
    }
  }

  private beginGame(): void {
    this.round = 1;
    this.lives = STARTING_LIVES;
    this.score.score = 0;
    this.capsuleRng = new Mulberry32(seedFromString(this.config.deterministicSeed));
    this.bus.emit(GameEvents.GAME_STARTED);
    this.enterRoundIntro();
  }

  private enterRoundIntro(): void {
    if (this.round === bossRound(this.region)) {
      this.sm.state = GameState.ROUND_CLEAR; // route to boss via clear path
      this.advanceFromClear();
      return;
    }
    this.sim = null;
    this.sm.transition(GameState.ROUND_INTRO);
    this.timer = 0;
  }

  private tickRoundIntro(): void {
    if (++this.timer >= GameController.ROUND_INTRO_TICKS) {
      this.timer = 0;
      this.startRound();
    }
  }

  private startRound(): void {
    const level = this.levelProvider(this.region, this.round);
    this.sim = new RoundSim({
      bus: this.bus,
      level,
      deflectionModel: this.config.deflectionModel,
      roundNumber: this.round,
      score: this.score,
      capsuleRng: this.capsuleRng,
      lives: this.lives,
      finalBrickRound: brickRounds(this.region),
    });
    this.sim.resetForRound();
    this.bus.emit(GameEvents.ROUND_STARTED, { round: this.round });
    this.sm.transition(GameState.BALL_READY);
  }

  // --- PLAYING -------------------------------------------------------------

  private tickPlaying(input: InputSnapshot): void {
    const sim = this.sim;
    if (!sim) return;
    if (this.sm.state === GameState.BALL_READY) {
      // A+Start level-skip cheat (§14.7): fire(A) + start, cap round 16.
      if (this.config.enableManualLevelSkipSecret && input.firePressed && input.start && this.round < 16) {
        this.round++;
        this.enterRoundIntro();
        return;
      }
      if (input.firePressed) {
        this.sm.transition(GameState.PLAYING);
      }
    }
    if (input.start && this.sm.isPausableState()) {
      this.sm.transition(GameState.PAUSED);
      return;
    }
    sim.tick(toRoundInput(input));
    this.lives = sim.lives; // keep controller lives in sync (extra-life awards etc.)

    for (const e of sim.events) {
      if (e.type === 'roundClear') {
        this.bus.emit(GameEvents.ROUND_CLEARED, { round: this.round });
        this.sm.transition(GameState.ROUND_CLEAR);
        this.timer = 0;
        return;
      }
      if (e.type === 'breakWarp') {
        this.round = e.roundAfter;
        this.bus.emit(GameEvents.ROUND_CLEARED, { round: this.round - 1 });
        this.sm.transition(GameState.ROUND_CLEAR);
        this.timer = 0;
        return;
      }
      if (e.type === 'ballLost') {
        this.sm.transition(GameState.LIFE_LOST);
        this.bus.emit(GameEvents.LIFE_LOST);
        this.timer = 0;
        return;
      }
      if (e.type === 'gameOver') {
        this.enterGameOver();
        return;
      }
    }
  }

  private tickRoundClear(): void {
    if (++this.timer >= GameController.ROUND_CLEAR_TICKS) {
      this.timer = 0;
      this.advanceFromClear();
    }
  }

  private advanceFromClear(): void {
    this.round++;
    if (this.round >= bossRound(this.region)) {
      this.round = bossRound(this.region);
      this.sm.state = GameState.ROUND_CLEAR;
      this.sm.transition(GameState.BOSS_INTRO);
      this.timer = 0;
      this.startBoss();
    } else {
      this.enterRoundIntro();
    }
  }

  private startBoss(): void {
    this.boss = new BossSim({
      bus: this.bus,
      deflectionModel: this.config.deflectionModel,
      score: this.score,
      lives: this.lives,
    });
    this.bus.emit(GameEvents.BOSS_STARTED);
  }

  private tickBoss(input: InputSnapshot): void {
    const boss = this.boss;
    if (!boss) return;
    if (input.start) {
      this.sm.transition(GameState.PAUSED);
      return;
    }
    boss.tick(toRoundInput(input));
    this.lives = boss.lives;
    for (const e of boss.events) {
      if (e.type === 'bossDefeated') {
        this.sm.transition(GameState.BOSS_DEFEATED);
        this.timer = 0;
        return;
      }
      if (e.type === 'gameOver') {
        // §15.3: no continue after final boss failure; skip NAME_ENTRY.
        this.sm.state = GameState.GAME_OVER;
        this.bus.emit(GameEvents.GAME_OVER);
        return;
      }
    }
  }

  // --- GAME OVER / NAME ENTRY ---------------------------------------------

  private enterGameOver(): void {
    this.bus.emit(GameEvents.GAME_OVER);
    if (this.config.enableHighScoreNameEntry && this.store.qualifies(this.score.score)) {
      this.sm.transition(GameState.NAME_ENTRY);
      this.nameEntry.reset();
      this.bus.emit(GameEvents.NAME_ENTRY_STARTED);
    } else {
      this.sm.transition(GameState.TITLE);
      this.bus.emit(GameEvents.RETURNED_TO_TITLE);
    }
  }

  private tickGameOver(): void {
    // Brief pause then route.
    if (++this.timer >= 60) {
      this.timer = 0;
      if (this.config.enableHighScoreNameEntry && this.store.qualifies(this.score.score)) {
        this.sm.transition(GameState.NAME_ENTRY);
        this.nameEntry.reset();
      } else {
        this.sm.transition(GameState.TITLE);
      }
    }
  }

  private tickNameEntry(_input: InputSnapshot): void {
    // Keyboard letter input is handled by the app layer calling nameEntry.input()
    // directly on key events; here we only finalize on completion/timeout.
    if (this.nameEntry.done || ++this.timer >= 600) {
      const initials = this.nameEntry.finalize() || 'AAA';
      this.store.submitScore({
        score: this.score.score,
        initials,
        round: this.round,
        region: this.region,
        mode: this.config.mode,
        date: new Date().toISOString(),
      });
      this.sm.transition(GameState.TITLE);
      this.bus.emit(GameEvents.RETURNED_TO_TITLE);
    }
  }

  /** Current sim (for rendering). */
  get currentSim(): RoundSim | null {
    return this.sim;
  }
  get currentBoss(): BossSim | null {
    return this.boss;
  }
}

function toRoundInput(input: InputSnapshot): {
  left: boolean;
  right: boolean;
  firePressed: boolean;
  paddleX: number | null;
} {
  return { left: input.left, right: input.right, firePressed: input.firePressed, paddleX: input.paddleX };
}
