import { EventBus, GameEvents } from './eventBus';

export type GameState =
    | 'BOOT'
    | 'LOADING'
    | 'ERROR'
    | 'TITLE'
    | 'OPENING_STORY'
    | 'GAMEPLAY_DEMO'
    | 'ROUND_INTRO'
    | 'BALL_READY'
    | 'PLAYING'
    | 'PAUSED'
    | 'LIFE_LOST'
    | 'ROUND_CLEAR'
    | 'BREAK_WARP'
    | 'TURN_HANDOFF' // stub
    | 'GAME_OVER'
    | 'NAME_ENTRY'
    | 'BOSS_INTRO'
    | 'BOSS_PLAYING'
    | 'BOSS_DEFEATED'
    | 'ENDING';

export class GameStateMachine {
    private currentState: GameState = 'BOOT';
    private pausedFrom: GameState = 'PLAYING';
    private storyExitMode: 'idle' | 'newGame' = 'idle';

    constructor() {}

    public getState(): GameState {
        return this.currentState;
    }

    public getPausedFrom(): GameState {
        return this.pausedFrom;
    }

    public getStoryExitMode(): 'idle' | 'newGame' {
        return this.storyExitMode;
    }

    public changeState(newState: GameState, payload?: any): void {
        const oldState = this.currentState;
        if (oldState === newState) return;

        // Perform transition logic
        if (newState === 'PAUSED') {
            // Can only pause from PLAYING, BALL_READY, BOSS_PLAYING
            if (oldState === 'PLAYING' || oldState === 'BALL_READY' || oldState === 'BOSS_PLAYING') {
                this.pausedFrom = oldState;
            } else {
                console.warn(`Attempted to pause from invalid state: ${oldState}`);
                return;
            }
        }

        if (newState === 'OPENING_STORY' && payload && (payload.storyExit === 'newGame' || payload.storyExit === 'idle')) {
            this.storyExitMode = payload.storyExit;
        }

        this.currentState = newState;
        // console.log(`State transition: ${oldState} -> ${newState}`);

        // Emit corresponding events per PRD Section 26
        switch (newState) {
            case 'TITLE':
                EventBus.emit(GameEvents.TITLE_SHOWN);
                break;
            case 'ROUND_INTRO':
                EventBus.emit(GameEvents.ROUND_STARTED, payload);
                break;
            case 'PLAYING':
                if (oldState === 'BALL_READY') {
                    EventBus.emit(GameEvents.BALL_LAUNCHED);
                }
                break;
            case 'LIFE_LOST':
                EventBus.emit(GameEvents.LIFE_LOST);
                break;
            case 'ROUND_CLEAR':
                EventBus.emit(GameEvents.ROUND_CLEARED, payload);
                break;
            case 'BREAK_WARP':
                EventBus.emit(GameEvents.BREAK_WARP_OPENED);
                break;
            case 'BOSS_INTRO':
                EventBus.emit(GameEvents.BOSS_STARTED);
                break;
            case 'BOSS_DEFEATED':
                EventBus.emit(GameEvents.BOSS_DEFEATED);
                break;
            case 'GAME_OVER':
                EventBus.emit(GameEvents.GAME_OVER);
                break;
            case 'NAME_ENTRY':
                EventBus.emit(GameEvents.NAME_ENTRY_STARTED);
                break;
            case 'ENDING':
                EventBus.emit(GameEvents.ENDING_STARTED);
                break;
        }
    }
}
