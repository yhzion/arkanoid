/**
 * Title / Opening / Demo idle flow — PRD §8.1, §8.2, §31.
 *
 * Drives the attract-mode cycle: TITLE (idle 600t) → OPENING_STORY →
 * GAMEPLAY_DEMO (600t or any input) → TITLE. `storyExit` selects the story exit
 * path (idle → demo; newGame → round intro). All timings are in simulation ticks.
 */
import { DEMO_TICKS, TITLE_IDLE_TICKS } from '../core/constants';

export type StoryExit = 'idle' | 'newGame';

export type TitlePhase = 'title' | 'story' | 'demo';

export interface TitleFlowEvent {
  phase: TitlePhase;
  /** Emitted when the demo should start/return, or story should advance. */
  advanceTo: TitlePhase | null;
  /** Set when a new game begins from story (storyExit=newGame). */
  startGame: boolean;
}

export class TitleFlow {
  phase: TitlePhase = 'title';
  storyExit: StoryExit = 'idle';
  private ticks = 0;

  /** Call once per tick. Any input resets the idle timer / aborts demo. */
  tick(anyInput: boolean): TitleFlowEvent {
    const event: TitleFlowEvent = { phase: this.phase, advanceTo: null, startGame: false };

    if (anyInput && this.phase === 'demo') {
      this.enter('title');
      event.advanceTo = 'title';
      return event;
    }
    if (anyInput && this.phase === 'title') {
      this.ticks = 0; // reset idle timer on activity
    }

    this.ticks++;

    if (this.phase === 'title' && this.ticks >= TITLE_IDLE_TICKS) {
      this.storyExit = 'idle';
      this.enter('story');
      event.advanceTo = 'story';
    } else if (this.phase === 'story' && this.storyExit === 'idle' && this.ticks >= TITLE_IDLE_TICKS) {
      this.enter('demo');
      event.advanceTo = 'demo';
    } else if (this.phase === 'demo' && this.ticks >= DEMO_TICKS) {
      this.enter('title');
      event.advanceTo = 'title';
    }
    return event;
  }

  /** Begin a new game: story with newGame exit (§8.2). */
  startNewGame(): TitleFlowEvent {
    this.storyExit = 'newGame';
    this.enter('story');
    return { phase: 'story', advanceTo: 'story', startGame: false };
  }

  /** Story scroll complete → route by storyExit (§31). */
  storyComplete(): TitleFlowEvent {
    if (this.storyExit === 'newGame') {
      this.enter('title');
      return { phase: 'title', advanceTo: null, startGame: true };
    }
    this.enter('demo');
    return { phase: 'demo', advanceTo: 'demo', startGame: false };
  }

  private enter(p: TitlePhase): void {
    this.phase = p;
    this.ticks = 0;
  }
}
