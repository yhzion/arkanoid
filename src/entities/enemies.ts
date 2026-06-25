import { Fx, toFx, fxMul, toFloat } from '../core/fxMath';
import { AABB } from '../physics/collision';
import { SeededRNG } from '../core/rng';
import { EventBus, GameEvents } from '../core/eventBus';
import { GameState } from '../core/gameState';

export type EnemyType = 'Konerd' | 'Pyradok' | 'Tri-sphere' | 'Opopo';

export interface IEnemy {
    x: Fx;
    y: Fx;
    w: Fx;
    h: Fx;
    type: EnemyType;
    spawnX: Fx;
    spawnY: Fx;
    ticksActive: number;
    spawnHatch: 'left' | 'right';
}

// Precompute sine/cosine tables for each enemy type to avoid runtime floating-point trig
const SIN_TABLES: Record<EnemyType, Fx[]> = {
    'Konerd': Array.from({ length: 120 }, (_, i) => Math.round(Math.sin((2 * Math.PI * i) / 120) * 65536)),
    'Pyradok': Array.from({ length: 90 }, (_, i) => Math.round(Math.sin((2 * Math.PI * i) / 90) * 65536)),
    'Tri-sphere': Array.from({ length: 150 }, (_, i) => Math.round(Math.sin((2 * Math.PI * i) / 150) * 65536)),
    'Opopo': Array.from({ length: 180 }, (_, i) => Math.round(Math.sin((2 * Math.PI * i) / 180) * 65536))
};

const COS_TABLES: Record<EnemyType, Fx[]> = {
    'Konerd': [],
    'Pyradok': [],
    'Tri-sphere': Array.from({ length: 150 }, (_, i) => Math.round(Math.cos((2 * Math.PI * i) / 150) * 65536)),
    'Opopo': Array.from({ length: 180 }, (_, i) => Math.round(Math.cos((2 * Math.PI * i) / 180) * 65536))
};

export class EnemyManager {
    public activeEnemies: IEnemy[] = [];
    public spawnTimer: number = 0;
    
    private readonly playfieldBottom: Fx = toFx(240);
    private readonly spawnInterval: number = 480; // 8 seconds

    constructor() {}

    public reset(): void {
        this.activeEnemies = [];
        this.spawnTimer = 0;
    }

    public update(rng: SeededRNG): void {
        this.spawnTimer++;

        // Spawn logic: every 480 ticks, or immediately if 0 enemies are on screen
        if (this.activeEnemies.length === 0 || this.spawnTimer >= this.spawnInterval) {
            if (this.activeEnemies.length < 3) {
                this.spawnEnemy(rng);
            }
            this.spawnTimer = 0;
        }

        // Update enemy positions
        for (const enemy of this.activeEnemies) {
            enemy.ticksActive++;
            const t = enemy.ticksActive;

            switch (enemy.type) {
                case 'Konerd': {
                    // sine path: amplitude 24px, period 120t, descent 0.5px/t
                    const sinIdx = t % 120;
                    const sinVal = SIN_TABLES['Konerd'][sinIdx];
                    enemy.x = enemy.spawnX + fxMul(toFx(24), sinVal);
                    enemy.y = enemy.spawnY + fxMul(toFx(0.5), toFx(t));
                    break;
                }
                case 'Pyradok': {
                    // sine path: amplitude 16px, period 90t, descent 0.6px/t
                    const sinIdx = t % 90;
                    const sinVal = SIN_TABLES['Pyradok'][sinIdx];
                    enemy.x = enemy.spawnX + fxMul(toFx(16), sinVal);
                    enemy.y = enemy.spawnY + fxMul(toFx(0.6), toFx(t));
                    break;
                }
                case 'Tri-sphere': {
                    // loop path: radius 12px, period 150t, descent 0.5px/t
                    const loopIdx = t % 150;
                    const sinVal = SIN_TABLES['Tri-sphere'][loopIdx];
                    const cosVal = COS_TABLES['Tri-sphere'][loopIdx];
                    enemy.x = enemy.spawnX + fxMul(toFx(12), cosVal);
                    enemy.y = enemy.spawnY + fxMul(toFx(0.5), toFx(t)) + fxMul(toFx(12), sinVal);
                    break;
                }
                case 'Opopo': {
                    // loop path: radius 16px, period 180t, descent 0.4px/t
                    const loopIdx = t % 180;
                    const sinVal = SIN_TABLES['Opopo'][loopIdx];
                    const cosVal = COS_TABLES['Opopo'][loopIdx];
                    enemy.x = enemy.spawnX + fxMul(toFx(16), cosVal);
                    enemy.y = enemy.spawnY + fxMul(toFx(0.4), toFx(t)) + fxMul(toFx(16), sinVal);
                    break;
                }
            }
        }

        // Filter out enemies that exited bottom of screen
        this.activeEnemies = this.activeEnemies.filter(enemy => enemy.y < this.playfieldBottom);
    }

    private spawnEnemy(rng: SeededRNG): void {
        const types: EnemyType[] = ['Konerd', 'Pyradok', 'Tri-sphere', 'Opopo'];
        const typeRoll = Math.floor(rng.next() * 4);
        const type = types[typeRoll];

        // Spawns from top-left (X=24) or top-right (X=168) hatch
        const hatchLeft = rng.next() > 0.5;
        const spawnX = hatchLeft ? toFx(24) : toFx(152); // width is 16, so 168 - 16 = 152
        const spawnY = toFx(8);

        this.activeEnemies.push({
            x: spawnX,
            y: spawnY,
            w: toFx(16),
            h: toFx(16),
            type,
            spawnX,
            spawnY,
            ticksActive: 0,
            spawnHatch: hatchLeft ? 'left' : 'right'
        });

        EventBus.emit(GameEvents.ENEMY_SPAWNED, { type, hatch: hatchLeft ? 'left' : 'right' });
    }

    public getAABB(enemy: IEnemy): AABB {
        return {
            x: enemy.x,
            y: enemy.y,
            w: enemy.w,
            h: enemy.h
        };
    }

    public destroyEnemy(enemy: IEnemy): void {
        const idx = this.activeEnemies.indexOf(enemy);
        if (idx !== -1) {
            this.activeEnemies.splice(idx, 1);
            GameState.addScore(100);
            EventBus.emit(GameEvents.ENEMY_DESTROYED, { type: enemy.type, scoreDelta: 100 });
        }
    }
}
