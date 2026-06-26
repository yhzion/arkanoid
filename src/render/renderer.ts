import { RoundStateTracker } from '../core/roundState';
import { GameState } from '../core/gameState';
import { GameState as StateMachineState } from '../core/stateMachine';
import { toFloat } from '../core/fxMath';
import { BrickType, CapsuleType } from '../data/levelSchema';

// States that render the live playfield. GAMEPLAY_DEMO is included so the
// attract-mode demo shows real gameplay instead of a black screen (§8.2).
const GAMEPLAY_RENDER_STATES: StateMachineState[] = [
    'PLAYING', 'BALL_READY', 'ROUND_INTRO', 'PAUSED', 'LIFE_LOST',
    'ROUND_CLEAR', 'BREAK_WARP', 'BOSS_INTRO', 'BOSS_PLAYING', 'BOSS_DEFEATED',
    'GAMEPLAY_DEMO',
];

export function isGameplayRenderState(state: StateMachineState): boolean {
    return GAMEPLAY_RENDER_STATES.includes(state);
}

/**
 * Largest integer scale (>= 1) at which the logical canvas fits the given
 * container, for pixel-perfect integer scaling (§6.1).
 */
export function computeIntegerScale(
    containerW: number,
    containerH: number,
    logicalW = 256,
    logicalH = 240
): number {
    const fit = Math.min(containerW / logicalW, containerH / logicalH);
    return Math.max(1, Math.floor(fit));
}

export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    // Logical dimensions
    public readonly width = 256;
    public readonly height = 240;

    // Color definitions
    private readonly colors: Record<BrickType, string> = {
        'EMPTY': 'transparent',
        'WHITE': '#f8f8f8',
        'ORANGE': '#f8b800',
        'LIGHT_BLUE': '#3cbcfc',
        'GREEN': '#00a800',
        'RED': '#f83800',
        'BLUE': '#0058f8',
        'PINK': '#f878f8',
        'YELLOW': '#f8f800',
        'SILVER': '#b8b8b8',
        'GOLD': '#fc9838'
    };

    private readonly capsuleColors: Record<Exclude<CapsuleType, null>, string> = {
        'S': '#f8b800', // Orange
        'C': '#f8f800', // Yellow
        'L': '#f83800', // Red
        'D': '#3cbcfc', // Light Blue
        'P': '#b8b8b8', // Gray
        'E': '#0058f8', // Blue
        'B': '#f878f8', // Pink
        'M': '#b800f8', // Purple
        'R': '#000000'  // Black
    };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to obtain 2D canvas context');
        this.ctx = context;
        
        // Ensure pixelated scaling
        this.ctx.imageSmoothingEnabled = false;
    }

    public clear(): void {
        this.ctx.fillStyle = '#080808';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    public render(
        sim: RoundStateTracker,
        activeState: StateMachineState,
        storyScrollY: number = 0,
        storyText: string[] = [],
        leaderboardEntries: any[] = [],
        initialsInput: string = ''
    ): void {
        this.clear();

        // Render gameplay elements for states where the action happens
        const isGameplayState = isGameplayRenderState(activeState);

        if (isGameplayState) {
            this.renderPlayfieldBackground();
            this.renderBricks(sim);
            this.renderEnemies(sim);
            this.renderLasers(sim);
            this.renderBoss(sim);
            this.renderWarpExit(sim);
            this.renderVaus(sim);
            this.renderBalls(sim);
            this.renderCapsules(sim);
            this.renderHUD(sim);
        }

        // Render screen-specific overlays
        this.renderOverlays(
            activeState, 
            sim, 
            storyScrollY, 
            storyText, 
            leaderboardEntries, 
            initialsInput
        );
    }

    private renderPlayfieldBackground(): void {
        // Usable playfield: X=8 to 184, Y=8 to 240
        this.ctx.fillStyle = '#101018';
        this.ctx.fillRect(8, 8, 176, 232);

        // Draw boundaries/walls
        this.ctx.fillStyle = '#7c7c7c';
        // Left wall
        this.ctx.fillRect(0, 0, 8, 240);
        // Right wall dividing HUD
        this.ctx.fillRect(184, 0, 8, 240);
        // Top wall
        this.ctx.fillRect(0, 0, 192, 8);

        // Add visual texture to walls (stripes/bricks effect)
        this.ctx.strokeStyle = '#c0c0c0';
        this.ctx.lineWidth = 1;
        
        // Left wall lines
        for (let y = 8; y < 240; y += 8) {
            this.ctx.strokeRect(0, y, 8, 8);
        }
        // Right wall lines
        for (let y = 8; y < 240; y += 8) {
            this.ctx.strokeRect(184, y, 8, 8);
        }
        // Top wall lines
        for (let x = 8; x < 184; x += 16) {
            this.ctx.strokeRect(x, 0, 16, 8);
        }
    }

    private renderBricks(sim: RoundStateTracker): void {
        for (let r = 0; r < sim.bricks.rows; r++) {
            for (let c = 0; c < sim.bricks.columns; c++) {
                const cell = sim.bricks.getCell(c, r);
                if (!cell || cell.type === 'EMPTY') continue;

                const x = 8 + c * sim.bricks.brickWidth;
                const y = 8 + r * sim.bricks.brickHeight;
                const w = sim.bricks.brickWidth;
                const h = sim.bricks.brickHeight;

                // Fill brick color
                this.ctx.fillStyle = this.colors[cell.type];
                this.ctx.fillRect(x, y, w, h);

                // Add 3D borders/shading
                this.ctx.strokeStyle = cell.type === 'WHITE' ? '#d0d0d0' : 'rgba(255,255,255,0.4)';
                this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
                this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                this.ctx.fillRect(x + 1, y + h - 1.5, w - 2, 1.5);
                this.ctx.fillRect(x + w - 1.5, y + 1, 1.5, h - 2);

                // Color-blind support glyphs if enabled
                // (Letters drawn in an overlay on bricks to signify type/score differences)
                // Enabled by default in clean-room mode
                if (GameState.config.mode === 'clean-room') {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    this.ctx.font = '6px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    let label = '';
                    if (cell.type === 'GOLD') label = 'G';
                    else if (cell.type === 'SILVER') label = 'S';
                    else if (cell.isCapsuleCarrier) label = '*';
                    
                    if (label) {
                        this.ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
                    }
                }
            }
        }
    }

    private renderVaus(sim: RoundStateTracker): void {
        const x = toFloat(sim.vaus.x);
        const y = toFloat(sim.vaus.y);
        const w = toFloat(sim.vaus.width);
        const h = toFloat(sim.vaus.height);

        // Core Vaus body (gray metal metallic block)
        this.ctx.fillStyle = '#b8b8b8';
        this.ctx.fillRect(x + 2, y, w - 4, h);
        
        // Draw round caps on left/right ends
        this.ctx.fillStyle = '#f83800'; // red ends
        this.ctx.fillRect(x, y + 1, 2, h - 2);
        this.ctx.fillRect(x + w - 2, y + 1, 2, h - 2);

        // Core stripes
        this.ctx.fillStyle = '#3cbcfc'; // cyan stripes
        this.ctx.fillRect(x + 6, y + 2, w - 12, 2);

        // Laser indicator glows
        if (sim.vaus.laserActive) {
            this.ctx.fillStyle = '#f83800';
            this.ctx.fillRect(x + 1, y, 3, 2);
            this.ctx.fillRect(x + w - 4, y, 3, 2);
        } else if (sim.vaus.catchActive) {
            // Catch glow (yellow)
            this.ctx.fillStyle = '#f8f800';
            this.ctx.fillRect(x + 3, y + 1, 2, 2);
            this.ctx.fillRect(x + w - 5, y + 1, 2, 2);
        }
    }

    private renderBalls(sim: RoundStateTracker): void {
        for (const ball of sim.balls) {
            const x = toFloat(ball.x);
            const y = toFloat(ball.y);
            const w = toFloat(ball.w);
            const h = toFloat(ball.h);

            // Ball is drawn as a small rounded rectangle
            if (sim.megaActive) {
                this.ctx.fillStyle = '#f80000';
                this.ctx.fillRect(x, y, w, h);
                this.ctx.fillStyle = '#ff8080';
                this.ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
            } else {
                this.ctx.fillStyle = '#f8f8f8';
                this.ctx.fillRect(x, y, w, h);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
            }
        }
    }

    private renderCapsules(sim: RoundStateTracker): void {
        for (const cap of sim.capsules.activeCapsules) {
            const x = toFloat(cap.x);
            const y = toFloat(cap.y);
            const w = toFloat(cap.w);
            const h = toFloat(cap.h);

            const color = this.capsuleColors[cap.type as Exclude<CapsuleType, null>] || '#ffffff';

            // Draw pill shape
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, w, h, 3.5);
            this.ctx.fill();

            // Highlight border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 0.75;
            this.ctx.stroke();

            // Draw letter inside the capsule for readability and accessibility
            this.ctx.fillStyle = cap.type === 'R' ? '#ffffff' : '#000000';
            this.ctx.font = 'bold 6px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(cap.type || '', x + w / 2, y + h / 2 + 0.5);
        }
    }

    private renderLasers(sim: RoundStateTracker): void {
        this.ctx.fillStyle = '#f83800'; // red beams
        for (const laser of sim.lasers) {
            const x = toFloat(laser.x);
            const y = toFloat(laser.y);
            const w = toFloat(laser.w);
            const h = toFloat(laser.h);
            this.ctx.fillRect(x, y, w, h);
            
            // Core white glow
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x + 0.5, y, w - 1, h);
        }
    }

    private renderEnemies(sim: RoundStateTracker): void {
        for (const enemy of sim.enemies.activeEnemies) {
            const x = toFloat(enemy.x);
            const y = toFloat(enemy.y);
            const w = toFloat(enemy.w);
            const h = toFloat(enemy.h);

            // Render neat retro geometric models
            this.ctx.lineWidth = 1;
            const pulseFrame = Math.floor(enemy.ticksActive / 8) % 2;

            if (enemy.type === 'Konerd') {
                // Triangle ship
                this.ctx.fillStyle = pulseFrame === 0 ? '#f878f8' : '#0058f8';
                this.ctx.beginPath();
                this.ctx.moveTo(x + w / 2, y);
                this.ctx.lineTo(x + w, y + h);
                this.ctx.lineTo(x, y + h);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (enemy.type === 'Pyradok') {
                // Diamond
                this.ctx.fillStyle = pulseFrame === 0 ? '#f8f800' : '#f83800';
                this.ctx.beginPath();
                this.ctx.moveTo(x + w / 2, y);
                this.ctx.lineTo(x + w, y + h / 2);
                this.ctx.lineTo(x + w / 2, y + h);
                this.ctx.lineTo(x, y + h / 2);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (enemy.type === 'Tri-sphere') {
                // 3 dots inside a boundary
                this.ctx.fillStyle = '#3cbcfc';
                this.ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(x + 3, y + 3, 2, 2);
                this.ctx.fillRect(x + w - 5, y + 3, 2, 2);
                this.ctx.fillRect(x + w / 2 - 1, y + h - 5, 2, 2);
            } else {
                // Opopo: round bubble
                this.ctx.fillStyle = pulseFrame === 0 ? '#00a800' : '#f8b800';
                this.ctx.beginPath();
                this.ctx.arc(x + w / 2, y + h / 2, w / 2 - 1, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Glow core
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 4);
        }
    }

    private renderWarpExit(sim: RoundStateTracker): void {
        if (!sim.isBreakWarpOpen) return;

        this.drawGate(sim.warpLeftExitAABB, 'L');
        this.drawGate(sim.warpRightExitAABB, 'R');
    }

    private drawGate(aabb: any, label: string): void {
        const x = toFloat(aabb.x);
        const y = toFloat(aabb.y);
        const w = toFloat(aabb.w);
        const h = toFloat(aabb.h);

        // Pulsing animation
        const pulse = (Math.sin(performance.now() / 150) + 1) / 2;
        
        // Inner gateway (glowing cyan door)
        this.ctx.fillStyle = `rgba(60, 188, 252, ${0.4 + pulse * 0.4})`;
        this.ctx.fillRect(x, y, w, h);

        // Frame
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);

        // Text indicator
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 8px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x + w / 2, y + h / 2);
    }

    private renderBoss(sim: RoundStateTracker): void {
        if (!sim.levelData || sim.levelData.type !== 'boss') return;

        const x = toFloat(sim.boss.x);
        const y = toFloat(sim.boss.y);
        const w = toFloat(sim.boss.w);
        const h = toFloat(sim.boss.h);

        // Draw DOH face outline
        this.ctx.fillStyle = '#303038'; // Dark metallic head
        this.ctx.fillRect(x, y, w, h);

        // Red grid eyes
        this.ctx.fillStyle = '#f83800';
        this.ctx.fillRect(x + 12, y + 20, 12, 6);
        this.ctx.fillRect(x + w - 24, y + 20, 12, 6);
        
        // Glowing red pupil
        const pulse = (Math.sin(performance.now() / 80) + 1) / 2;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
        this.ctx.fillRect(x + 16, y + 21, 4, 4);
        this.ctx.fillRect(x + w - 20, y + 21, 4, 4);

        // Geometric nose/mouth
        this.ctx.fillStyle = '#505058';
        this.ctx.fillRect(x + w / 2 - 8, y + 36, 16, 16);

        // Mouth hatch (open glow when firing)
        if (sim.boss.fireTimer > 80) {
            this.ctx.fillStyle = '#f83800';
            this.ctx.fillRect(x + w / 2 - 4, y + 42, 8, 6);
        } else {
            this.ctx.fillStyle = '#080808';
            this.ctx.fillRect(x + w / 2 - 4, y + 44, 8, 4);
        }

        // Shading/Frame lines
        this.ctx.strokeStyle = '#7c7c7c';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);

        // Render boss projectiles
        this.ctx.fillStyle = '#f83800';
        for (const proj of sim.boss.projectiles) {
            const px = toFloat(proj.x);
            const py = toFloat(proj.y);
            const pw = toFloat(proj.w);
            const ph = toFloat(proj.h);

            this.ctx.fillRect(px, py, pw, ph);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
        }
    }

    private renderHUD(sim: RoundStateTracker): void {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(192, 0, 64, 240);

        this.ctx.fillStyle = '#f83800'; // Retro red
        this.ctx.font = 'bold 8px monospace';
        this.ctx.textAlign = 'left';

        // 1UP Score
        this.ctx.fillText('1UP', 200, 20);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(GameState.score.toString().padStart(6, '0'), 200, 32);

        // HIGH SCORE
        this.ctx.fillStyle = '#f83800';
        this.ctx.fillText('HIGH', 200, 52);
        this.ctx.fillText('SCORE', 200, 62);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(GameState.highHighScore.toString().padStart(6, '0'), 200, 74);

        // ROUND
        this.ctx.fillStyle = '#f83800';
        this.ctx.fillText('ROUND', 200, 100);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(GameState.currentRoundNum.toString().padStart(2, '0'), 200, 112);

        // LIVES
        this.ctx.fillStyle = '#f83800';
        this.ctx.fillText('LIVES', 200, 140);
        
        // Miniature Vaus sprites for lives
        const maxDrawLives = Math.min(8, GameState.lives);
        for (let i = 0; i < maxDrawLives; i++) {
            const rx = 200 + (i % 3) * 16;
            const ry = 150 + Math.floor(i / 3) * 8;
            
            // Miniature Vaus (12x4)
            this.ctx.fillStyle = '#b8b8b8';
            this.ctx.fillRect(rx + 2, ry, 8, 4);
            this.ctx.fillStyle = '#f83800';
            this.ctx.fillRect(rx, ry + 1, 2, 2);
            this.ctx.fillRect(rx + 10, ry + 1, 2, 2);
        }
    }

    private renderOverlays(
        state: StateMachineState,
        sim: RoundStateTracker,
        storyScrollY: number,
        storyText: string[],
        leaderboardEntries: any[],
        initialsInput: string
    ): void {
        switch (state) {
            case 'TITLE':
                this.renderTitleScreen();
                break;
            case 'OPENING_STORY':
            case 'ENDING':
                this.renderTextScroll(storyScrollY, storyText);
                break;
            case 'ROUND_INTRO':
                this.renderRoundIntro();
                break;
            case 'PAUSED':
                this.renderPausedOverlay();
                break;
            case 'GAME_OVER':
                this.renderGameOver();
                break;
            case 'NAME_ENTRY':
                this.renderNameEntry(initialsInput);
                break;
        }
    }

    private renderTitleScreen(): void {
        // Full screen cover
        this.ctx.fillStyle = '#080810';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Animated neon star field background
        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 20; i++) {
            const sx = (Math.sin(i * 123 + performance.now() / 1000) * 0.5 + 0.5) * this.width;
            const sy = ((i * 456 + performance.now() / 500) % 240);
            this.ctx.fillRect(sx, sy, 1, 1);
        }

        // Title text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        
        // Outline text effect
        this.ctx.strokeStyle = '#0058f8';
        this.ctx.lineWidth = 4;
        this.ctx.strokeText('ARKANOID', this.width / 2, 70);
        this.ctx.fillText('ARKANOID', this.width / 2, 70);

        // Clean-room watermark
        this.ctx.fillStyle = '#7c7c7c';
        this.ctx.font = '8px monospace';
        this.ctx.fillText('CLEAN-ROOM HOMAGE', this.width / 2, 85);

        // High score preview
        this.ctx.fillStyle = '#f8b800';
        this.ctx.font = '9px monospace';
        this.ctx.fillText(`HIGH SCORE: ${GameState.highHighScore.toString().padStart(6, '0')}`, this.width / 2, 115);

        // Instructions
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '9px monospace';
        const blink = Math.floor(performance.now() / 400) % 2 === 0;
        if (blink) {
            this.ctx.fillText('PRESS ENTER TO PLAY', this.width / 2, 150);
        }

        // Controls summary
        this.ctx.fillStyle = '#3cbcfc';
        this.ctx.font = '7px monospace';
        this.ctx.fillText('KEYS: A/D OR ARROWS = MOVE', this.width / 2, 185);
        this.ctx.fillText('SPACE = LAUNCH / LASER', this.width / 2, 197);
        this.ctx.fillText('CLICK OVERLAY FOR SETTINGS', this.width / 2, 215);
    }

    private renderRoundIntro(): void {
        this.ctx.fillStyle = '#0058f8'; // blue bar
        this.ctx.fillRect(20, 100, 152, 40);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(20, 100, 152, 40);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`ROUND ${GameState.currentRoundNum.toString().padStart(2, '0')}`, 96, 120);
    }

    private renderPausedOverlay(): void {
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(8, 8, 176, 232);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PAUSED', 96, 120);
    }

    private renderGameOver(): void {
        this.ctx.fillStyle = '#f83800'; // red bar
        this.ctx.fillRect(20, 100, 152, 40);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(20, 100, 152, 40);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GAME OVER', 96, 120);
    }

    private renderNameEntry(initials: string): void {
        this.ctx.fillStyle = '#080810';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#f8b800';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('NEW HIGH SCORE!', this.width / 2, 60);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '9px monospace';
        this.ctx.fillText(`SCORE: ${GameState.score}`, this.width / 2, 85);
        this.ctx.fillText('ENTER INITIALS:', this.width / 2, 115);

        // Blinking underline for initials
        const displayInitials = initials.padEnd(3, '_');
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillStyle = '#3cbcfc';
        this.ctx.fillText(displayInitials.split('').join(' '), this.width / 2, 145);

        this.ctx.fillStyle = '#7c7c7c';
        this.ctx.font = '7px monospace';
        this.ctx.fillText('TYPE LETTERS A-Z AND PRESS ENTER', this.width / 2, 190);
    }

    private renderTextScroll(scrollY: number, lines: string[]): void {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#3cbcfc'; // cyan scroll text
        this.ctx.font = 'bold 8px monospace';
        this.ctx.textAlign = 'center';

        const startY = 160 - scrollY;
        const lineSpacing = 16;

        for (let i = 0; i < lines.length; i++) {
            const y = startY + i * lineSpacing;
            if (y > 20 && y < 220) {
                this.ctx.fillText(lines[i], this.width / 2, y);
            }
        }

        // Top/Bottom gradient fade borders
        const gradTop = this.ctx.createLinearGradient(0, 0, 0, 30);
        gradTop.addColorStop(0, '#000000');
        gradTop.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradTop;
        this.ctx.fillRect(0, 0, this.width, 30);

        const gradBottom = this.ctx.createLinearGradient(0, 210, 0, 240);
        gradBottom.addColorStop(0, 'transparent');
        gradBottom.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradBottom;
        this.ctx.fillRect(0, 210, this.width, 30);
        
        // Skip notice
        this.ctx.fillStyle = '#7c7c7c';
        this.ctx.font = '7px monospace';
        this.ctx.fillText('PRESS SPACE TO SKIP', this.width / 2, 230);
    }
}
export default CanvasRenderer;
