import { Fx, toFx } from '../core/fxMath';
import { AABB } from '../physics/collision';
import { CapsuleType } from '../data/levelSchema';
import { SeededRNG } from '../core/rng';
import { EventBus, GameEvents } from '../core/eventBus';

export interface ICapsule {
    x: Fx;
    y: Fx;
    w: Fx;
    h: Fx;
    type: CapsuleType;
}

export class CapsuleManager {
    public activeCapsules: ICapsule[] = [];
    public previousCapsule: CapsuleType = null;
    
    // Bounds parameters
    private readonly playfieldBottom: Fx = toFx(240);
    private readonly capsuleFallSpeed: Fx = toFx(1); // 1.0 px/tick constant

    constructor() {}

    public reset(): void {
        this.activeCapsules = [];
        this.previousCapsule = null;
    }

    public spawn(
        brickX: Fx,
        brickWidth: Fx,
        brickY: Fx,
        brickHeight: Fx,
        rng: SeededRNG,
        explicitType?: CapsuleType
    ): void {
        // Only one falling capsule may be active at a time (§12.1). Skip the drop
        // before drawing the RNG so the capsule PRNG stream is not advanced (§30.5).
        if (this.activeCapsules.length > 0) return;

        // Level-data placement (§12.3): when the carrier cell carries an explicit
        // capsule (including M/R), spawn it directly without drawing the RNG. A
        // null/undefined capsule falls back to the random table of 7 standard types.
        let type: CapsuleType;
        if (explicitType != null) {
            type = explicitType;
        } else {
            type = this.getRandomCapsuleType(rng);
        }
        this.previousCapsule = type;

        const capW = toFx(16);
        const capH = toFx(7);

        // Centered on the destroyed brick
        const capX = brickX + brickWidth / 2 - capW / 2;
        const capY = brickY + brickHeight / 2 - capH / 2;

        this.activeCapsules.push({
            x: capX,
            y: capY,
            w: capW,
            h: capH,
            type
        });

        // Announce the spawn so its SFX cue can fire (§17.3).
        EventBus.emit(GameEvents.CAPSULE_SPAWNED, { type });
    }

    private getRandomCapsuleType(rng: SeededRNG): CapsuleType {
        // Standard power-ups (S, C, L, D, E) have weight 2, special (P, B) have weight 1
        const weights: { type: CapsuleType; weight: number }[] = [
            { type: 'S', weight: 2 },
            { type: 'C', weight: 2 },
            { type: 'L', weight: 2 },
            { type: 'D', weight: 2 },
            { type: 'E', weight: 2 },
            { type: 'P', weight: 1 },
            { type: 'B', weight: 1 }
        ];

        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0); // 12
        const roll = rng.next() * totalWeight;

        let accumulated = 0;
        let selectedType: CapsuleType = 'D';

        for (const w of weights) {
            accumulated += w.weight;
            if (roll < accumulated) {
                selectedType = w.type;
                break;
            }
        }

        // Duplicate prevention:
        // If chosen type matches previous capsule on this round, replace with 'D' (Disruption)
        if (selectedType === this.previousCapsule) {
            selectedType = 'D';
        }

        return selectedType;
    }

    public getAABB(capsule: ICapsule): AABB {
        return {
            x: capsule.x,
            y: capsule.y,
            w: capsule.w,
            h: capsule.h
        };
    }

    public update(): void {
        // Move capsules down
        for (const cap of this.activeCapsules) {
            cap.y += this.capsuleFallSpeed;
        }

        // Filter out capsules that fall below the playfield bottom
        this.activeCapsules = this.activeCapsules.filter(cap => cap.y < this.playfieldBottom);
    }

    public remove(capsule: ICapsule): void {
        const idx = this.activeCapsules.indexOf(capsule);
        if (idx !== -1) {
            this.activeCapsules.splice(idx, 1);
        }
    }
}
