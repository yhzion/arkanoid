import { GameStateMachine, GameState as StateMachineState } from '../core/stateMachine';
import { GameState } from '../core/gameState';
import { RoundStateTracker } from '../core/roundState';
import { Input } from '../input/input';
import { Audio } from '../audio/audio';
import { CanvasRenderer } from '../render/renderer';
import { fetchRoundData } from '../loaders/assetLoader';
import { loadLeaderboard } from '../core/persistence';
import { toFloat } from '../core/fxMath';
import { EventBus, GameEvents } from '../core/eventBus';

const OPENING_STORY_TEXT = [
    "AFTER THE MOTHER FLAGSHIP",
    "WAS DESTROYED IN A COSMIC AMBUSH,",
    "THE ESCAPE POD 'VAUS'",
    "LAUNCHED INTO THE VOID.",
    "HOWEVER, IT WAS INSTANTLY ENSNARED",
    "IN A LOCALIZED SPACE-TIME ANOMALY,",
    "WARPED BY AN UNKNOWN ENTITY..."
];

const ENDING_STORY_TEXT = [
    "THE DIMENSIONAL FORTRESS",
    "HAS COLLAPSED AND SPACE-TIME",
    "HAS STABILIZED.",
    "THE VAUS ESCAPES THE WARP,",
    "BUT ITS COSMIC ODYSSEY IN THE",
    "GALAXY HAS ONLY BEGUN...",
    "",
    "THE END"
];

export class GameBootstrapper {
    private stateMachine: GameStateMachine;
    private sim: RoundStateTracker;
    private renderer: CanvasRenderer;
    
    // Idle/Demo tracking
    private idleTimer: number = 0;
    private storyScrollY: number = 0;
    private storyLines: string[] = [];
    private storyMaxScroll: number = 240;

    // Leaderboard/High score state
    private leaderboardEntries: any[] = [];
    private initialsInput: string = '';

    // Continue code cheat tracking
    private selectCount: number = 0;
    private isContinueCheatArmed: boolean = false;
    private deathRoundNum: number = 1;
    private deathRoundBranch: 'L' | 'R' | '' = '';
    private chosenBranch: 'L' | 'R' | '' = '';
    private isTransitioningRound: boolean = false;

    // Loop
    private frameCount: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.stateMachine = new GameStateMachine();
        this.sim = new RoundStateTracker();
        this.renderer = new CanvasRenderer(canvas);
        this.storyLines = OPENING_STORY_TEXT;

        // Initialize Input Remaps
        Input.bindEvents(canvas);

        // Listen for Break Warp entry to transition the state machine
        EventBus.on(GameEvents.BREAK_WARP_ENTERED, (payload?: { branch: 'L' | 'R' }) => {
            if (this.stateMachine.getState() === 'PLAYING') {
                this.chosenBranch = payload?.branch || 'R';
                this.stateMachine.changeState('BREAK_WARP');
                this.idleTimer = 0;
            }
        });
    }

    public async boot(): Promise<void> {
        this.stateMachine.changeState('BOOT');
        
        try {
            this.stateMachine.changeState('LOADING');
            
            // Init audio engine config
            await Audio.init(GameState.config);
            
            // Sync leaderboard
            const lb = loadLeaderboard();
            this.leaderboardEntries = lb.entries;

            this.stateMachine.changeState('TITLE');
        } catch (e) {
            console.error('Failed to boot game:', e);
            this.stateMachine.changeState('ERROR');
        }
    }

    public getStateMachineState(): StateMachineState {
        return this.stateMachine.getState();
    }

    /**
     * Executes once per simulation tick (60Hz).
     * Strictly deterministic gameplay changes are computed here.
     */
    public updateTick(): void {
        this.frameCount++;
        const activeState = this.stateMachine.getState();
        const inputMode = GameState.config.inputMode;
        
        // Poll inputs
        const keys = Input.poll(inputMode);

        // --- Game Over Continue Code Check (§14.7.2) ---
        if (activeState === 'TITLE') {
            // Must hold mapped A+B (keyboard 'fire' Space + standard 'J' / 'Z' / 'X')
            const isAHeld = keys.fire;
            const isBHeld = Input.poll('keyboard').fire || keys.left || keys.right; // fallback checks

            // If Select pressed, increment count
            if (keys.select) {
                this.selectCount++;
                if (this.selectCount >= 5) {
                    this.isContinueCheatArmed = true;
                }
            }

            if (keys.start && this.isContinueCheatArmed) {
                // Trigger Continue!
                this.isContinueCheatArmed = false;
                this.selectCount = 0;
                
                // Restore death round, score 0
                GameState.resetGame();
                GameState.currentRoundNum = this.deathRoundNum;
                GameState.currentRoundBranch = this.deathRoundBranch;
                this.loadAndPlayRound(this.deathRoundNum, this.deathRoundBranch);
                return;
            }
        }

        switch (activeState) {
            case 'TITLE':
                this.idleTimer++;
                
                // Select Cycles Player count (tab/shift cycles, start plays)
                if (keys.select) {
                    // Cycles 1P/2P (Not fully implemented, 2P stubbed)
                    GameState.is2PlayerMode = !GameState.is2PlayerMode;
                    Audio.playBounceSFX();
                }

                if (keys.start) {
                    this.idleTimer = 0;
                    this.stateMachine.changeState('OPENING_STORY', { storyExit: 'newGame' });
                    this.storyLines = OPENING_STORY_TEXT;
                    this.storyScrollY = 0;
                    this.storyMaxScroll = 180;
                } else if (this.idleTimer >= 600) { // 10 seconds idle
                    this.idleTimer = 0;
                    this.stateMachine.changeState('OPENING_STORY', { storyExit: 'idle' });
                    this.storyLines = OPENING_STORY_TEXT;
                    this.storyScrollY = 0;
                    this.storyMaxScroll = 180;
                }
                break;

            case 'OPENING_STORY':
            case 'ENDING':
                this.storyScrollY += 0.4; // scroll rate
                
                // Press space/fire or start to skip scroll
                if (keys.fire || keys.start) {
                    this.idleTimer = 0;
                    this.exitStory(activeState);
                } else if (this.storyScrollY >= this.storyMaxScroll) {
                    this.exitStory(activeState);
                }
                break;

            case 'GAMEPLAY_DEMO':
                this.idleTimer++;
                
                // Auto playing loop
                // Vaus moves automatically to follow the ball
                if (this.sim.balls.length > 0) {
                    const ball = this.sim.balls[0];
                    const ballX = toFloat(ball.x);
                    const vausCenter = toFloat(this.sim.vaus.getCenter());
                    
                    const left = ballX < vausCenter - 4;
                    const right = ballX > vausCenter + 4;
                    const fire = ball.isHeld;

                    this.sim.update({ left, right, fire, pointerXDelta: 0, pointerXAbsolute: 128 }, 'keyboard');
                }

                // Any user keypress/click exits demo back to Title
                if (keys.left || keys.right || keys.fire || keys.start || keys.select) {
                    this.idleTimer = 0;
                    this.stateMachine.changeState('TITLE');
                } else if (this.idleTimer >= 600) { // 10 seconds demo cap
                    this.idleTimer = 0;
                    this.stateMachine.changeState('TITLE');
                }
                break;

            case 'ROUND_INTRO':
                this.idleTimer++;
                // Wait for jingle ticks (~90 ticks / 1.5s)
                if (this.idleTimer >= 90) {
                    this.idleTimer = 0;
                    this.stateMachine.changeState('BALL_READY');
                }
                break;

            case 'BALL_READY':
                // A+Start level skip secret (§14.7.1)
                // Hold A/Fire (Space) and press Start (Enter)
                if (keys.fire && keys.start && GameState.config.enableManualLevelSkipSecret) {
                    const nextR = Math.min(16, GameState.currentRoundNum + 1); // skip secret capped at lvl 16
                    GameState.currentRoundNum = nextR;
                    GameState.currentRoundBranch = '';
                    this.loadAndPlayRound(nextR, '');
                    return;
                }

                // Vaus digital/analog move controls still active while holding ball
                this.sim.update(keys, inputMode);

                if (keys.fire) {
                    this.stateMachine.changeState('PLAYING');
                }
                break;

            case 'PLAYING':
                // Check pause press
                if (keys.start) {
                    this.stateMachine.changeState('PAUSED');
                    return;
                }

                // Update simulation tick
                this.sim.update(keys, inputMode);
                
                // Ball lost checks
                if (this.stateMachine.getState() === 'PLAYING' && this.sim.balls.length === 0 && !this.sim.isRoundCompletedMode) {
                    this.stateMachine.changeState('LIFE_LOST');
                    this.idleTimer = 0;
                }
                break;

            case 'BOSS_PLAYING':
                if (keys.start) {
                    this.stateMachine.changeState('PAUSED');
                    return;
                }

                // Update simulation tick
                this.sim.update(keys, inputMode);

                // Defeat checks
                if (this.sim.boss.hitsRemaining === 0) {
                    this.stateMachine.changeState('BOSS_DEFEATED');
                    this.idleTimer = 0;
                    return;
                }

                // Ball lost check
                if (this.stateMachine.getState() === 'BOSS_PLAYING' && this.sim.balls.length === 0) {
                    this.stateMachine.changeState('LIFE_LOST');
                    this.idleTimer = 0;
                }
                break;

            case 'PAUSED':
                if (keys.start) {
                    // Resume state
                    this.stateMachine.changeState(this.stateMachine.getPausedFrom());
                }
                break;

            case 'LIFE_LOST':
                this.idleTimer++;
                if (this.idleTimer >= 60) { // 1 second death delay
                    this.idleTimer = 0;
                    
                    this.deathRoundNum = GameState.currentRoundNum;
                    this.deathRoundBranch = GameState.currentRoundBranch;
                    GameState.loseLife();
                    
                    if (GameState.lives > 0) {
                        this.sim.restartAfterDeath();
                        if (GameState.currentRoundNum === 17 || GameState.currentRoundNum === 34) {
                            this.stateMachine.changeState('BOSS_PLAYING'); // immediate resume on boss
                        } else {
                            this.stateMachine.changeState('BALL_READY');
                        }
                    } else {
                        this.stateMachine.changeState('GAME_OVER');
                    }
                }
                break;

            case 'ROUND_CLEAR':
            case 'BREAK_WARP':
                if (this.isTransitioningRound) {
                    break;
                }
                if (activeState === 'BREAK_WARP') {
                    // Descend Vaus down off the screen (0.5px / tick)
                    this.sim.vaus.y += 32768; 
                }
                this.idleTimer++;
                if (this.idleTimer >= 120) { // 2 seconds transition delay
                    this.idleTimer = 0;
                    
                    // Break warp gives 10,000 points
                    if (activeState === 'BREAK_WARP') {
                        GameState.addScore(10000);
                    }

                    // Advance to next round
                    const nextRound = GameState.currentRoundNum + 1;
                    
                    // Branch logic:
                    // Round 1 -> 2 (L/R)
                    // Rounds 2..16 -> 3..17 (17 is boss, branch becomes '')
                    // Round 17 -> 18 (linear)
                    // Round 18 -> 19 (L/R)
                    // Rounds 19..33 -> 20..34 (34 is final boss, branch becomes '')
                    let nextBranch: 'L' | 'R' | '' = '';
                    if (nextRound === 17 || nextRound === 18 || nextRound === 34) {
                        nextBranch = '';
                    } else {
                        nextBranch = this.chosenBranch;
                    }

                    GameState.currentRoundNum = nextRound;
                    GameState.currentRoundBranch = nextBranch;

                    if (nextRound === 17 || nextRound === 34) {
                        this.stateMachine.changeState('BOSS_INTRO');
                        this.idleTimer = 0;
                    } else if (nextRound > 34) {
                        // Beat game!
                        this.stateMachine.changeState('ENDING');
                        this.storyLines = ENDING_STORY_TEXT;
                        this.storyScrollY = 0;
                        this.storyMaxScroll = 180;
                    } else {
                        this.loadAndPlayRound(nextRound, nextBranch);
                    }
                }
                break;

            case 'BOSS_INTRO':
                this.idleTimer++;
                if (this.idleTimer >= 90) {
                    this.idleTimer = 0;
                    // Spawn boss level
                    this.loadAndPlayRound(GameState.currentRoundNum, GameState.currentRoundBranch);
                    this.stateMachine.changeState('BOSS_PLAYING');
                }
                break;

            case 'BOSS_DEFEATED':
                this.idleTimer++;
                if (this.idleTimer >= 180) { // 3 seconds explosion animation delay
                    this.idleTimer = 0;
                    if (GameState.currentRoundNum === 17) {
                        const nextRound = 18;
                        GameState.currentRoundNum = nextRound;
                        GameState.currentRoundBranch = '';
                        this.loadAndPlayRound(nextRound, '');
                    } else {
                        this.stateMachine.changeState('ENDING');
                        this.storyLines = ENDING_STORY_TEXT;
                        this.storyScrollY = 0;
                        this.storyMaxScroll = 180;
                    }
                }
                break;

            case 'GAME_OVER':
                this.idleTimer++;
                if (this.idleTimer >= 180) { // 3 seconds game over display
                    this.idleTimer = 0;
                    
                    // No continues allowed on boss level
                    if (GameState.currentRoundNum === 34) {
                        this.stateMachine.changeState('TITLE');
                        this.syncLeaderboard();
                        return;
                    }

                    if (GameState.checkNewHighScore()) {
                        this.stateMachine.changeState('NAME_ENTRY');
                        this.initialsInput = '';
                    } else {
                        this.stateMachine.changeState('TITLE');
                    }
                }
                break;

            case 'NAME_ENTRY':
                // Check initials input (A-Z keys)
                // Intercept key codes
                const rawKeys = Input.poll('keyboard'); // use raw keyboard poller
                
                // Standard name entry logic
                // Listen to keyboard letters
                // To keep it simple, we can listen to standard keydown events inside the bootstrapper directly
                break;
        }
    }

    private exitStory(activeState: string): void {
        const exitMode = this.stateMachine.getStoryExitMode();
        if (exitMode === 'newGame') {
            GameState.resetGame();
            this.loadAndPlayRound(1);
        } else {
            // Idle scroll -> transition to gameplay demo
            this.loadDemoRound();
        }
    }

    private async loadAndPlayRound(roundNum: number, branch: 'L' | 'R' | '' = ''): Promise<void> {
        if (this.isTransitioningRound) return;
        this.isTransitioningRound = true;
        
        try {
            const levelData = await fetchRoundData(GameState.config.region, roundNum, branch);
            this.sim.loadRound(levelData, GameState.config.deterministicSeed);
            
            // Only transition to intro once loaded to avoid running updates on old simulation round state
            this.stateMachine.changeState('ROUND_INTRO');
            this.idleTimer = 0;
        } catch (e) {
            console.error(`Failed to load round ${roundNum} ${branch}:`, e);
            this.stateMachine.changeState('ERROR');
        } finally {
            this.isTransitioningRound = false;
        }
    }

    private async loadDemoRound(): Promise<void> {
        if (this.isTransitioningRound) return;
        this.isTransitioningRound = true;

        try {
            // Load round 1 for demo first
            const levelData = await fetchRoundData(GameState.config.region, 1);
            this.sim.loadRound(levelData, 'demo-seed');
            
            // Auto launch ball in demo mode
            if (this.sim.balls.length > 0) {
                this.sim.balls[0].launch(this.sim.vaus.x, this.sim.vaus.width);
            }

            // Transition to demo mode state
            this.stateMachine.changeState('GAMEPLAY_DEMO');
            this.idleTimer = 0;
        } catch (e) {
            console.error('Failed to load demo round:', e);
            this.stateMachine.changeState('TITLE');
        } finally {
            this.isTransitioningRound = false;
        }
    }

    private syncLeaderboard(): void {
        const lb = loadLeaderboard();
        this.leaderboardEntries = lb.entries;
    }

    // Direct interface to handle initials input from external keydown listener
    public handleInitialsInput(char: string): void {
        if (this.stateMachine.getState() !== 'NAME_ENTRY') return;

        if (char === 'Backspace') {
            this.initialsInput = this.initialsInput.slice(0, -1);
            Audio.playBounceSFX();
        } else if (char === 'Enter') {
            if (this.initialsInput.length > 0) {
                GameState.submitHighScore(this.initialsInput);
                Audio.playWarpSFX();
                this.stateMachine.changeState('TITLE');
                this.syncLeaderboard();
            }
        } else if (/^[A-Z0-9]$/i.test(char)) {
            if (this.initialsInput.length < 3) {
                this.initialsInput += char.toUpperCase();
                Audio.playBounceSFX();
            }
        }
    }

    /**
     * Executes once per render frame.
     * Rendering canvas updates are drawn here.
     */
    public renderFrame(): void {
        this.renderer.render(
            this.sim,
            this.stateMachine.getState(),
            this.storyScrollY,
            this.storyLines,
            this.leaderboardEntries,
            this.initialsInput
        );
    }
}
export default GameBootstrapper;
