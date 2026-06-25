import { Fx, toFx, fxClamp, TWO_FX } from '../core/fxMath';
import { AABB } from '../physics/collision';

export class Vaus {
    public x: Fx = toFx(80); // centered initially (logical bounds 8 to 184)
    public readonly y: Fx = toFx(224); // fixed near bottom
    public width: Fx = toFx(32); // 32 px normal, 48 px enlarged
    public readonly height: Fx = toFx(8);
    
    // Playfield boundaries
    private readonly minX: Fx = toFx(8);
    private readonly maxX: Fx = toFx(184); // 192 - 8

    // Active power-up states
    public laserActive: boolean = false;
    public catchActive: boolean = false;
    public enlargeActive: boolean = false;

    // Movement speed constants
    private readonly digitalSpeed: Fx = toFx(3); // 3 px/tick

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.width = toFx(32);
        this.x = toFx(96) - fxClamp(this.width, 0, this.width) / 2; // center in playfield: (192 - 16)/2 = 88 -> 96 - width/2
        this.laserActive = false;
        this.catchActive = false;
        this.enlargeActive = false;
    }

    public enlarge(): void {
        if (this.enlargeActive) return;
        this.enlargeActive = true;
        
        const oldWidth = this.width;
        this.width = toFx(48); // 48 px enlarged
        
        // Adjust x to preserve center position
        this.x = this.x - (this.width - oldWidth) / 2;
        this.clampBounds();
    }

    public shrink(): void {
        if (!this.enlargeActive) return;
        this.enlargeActive = false;
        
        const oldWidth = this.width;
        this.width = toFx(32);
        
        // Adjust x to preserve center position
        this.x = this.x + (oldWidth - this.width) / 2;
        this.clampBounds();
    }

    private clampBounds(): void {
        this.x = fxClamp(this.x, this.minX, this.maxX - this.width);
    }

    public getAABB(): AABB {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }

    public getCenter(): Fx {
        return this.x + this.width / 2;
    }

    public update(
        inputMode: string,
        leftPressed: boolean,
        rightPressed: boolean,
        pointerDeltaX: number,
        pointerAbsoluteX: number
    ): void {
        if (inputMode === 'relative-pointer') {
            // Relative paddle mode: Pointer delta moves Vaus
            this.x += toFx(pointerDeltaX);
        } else if (inputMode === 'absolute-pointer') {
            // Absolute drag mode: Vaus follows pointer X directly
            // pointerAbsoluteX is canvas relative X. The playfield is X=8 to X=184.
            // Center the Vaus on the mouse X
            this.x = toFx(pointerAbsoluteX) - this.width / 2;
        } else {
            // Digital keyboard, gamepad, or touch OSC
            if (leftPressed) {
                this.x -= this.digitalSpeed;
            }
            if (rightPressed) {
                this.x += this.digitalSpeed;
            }
        }

        this.clampBounds();
    }
}
export default Vaus;
