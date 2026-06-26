export class Vaus {
    x;
    y;
    width = 32; // Default width
    height = 8;
    speed = 3; // PRD 33.2 Digital move step
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    update(input) {
        if (input.left) {
            this.x -= this.speed;
        }
        if (input.right) {
            this.x += this.speed;
        }
        // Boundary constraints (Assuming PRD 10.1 playfield width 224, margins 16)
        // Left wall: x=16. Right wall: x=208 (224-16)
        // Vaus x is top-left.
        const PLAYFIELD_MIN_X = 16;
        const PLAYFIELD_MAX_X = 224 - 16;
        if (this.x < PLAYFIELD_MIN_X) {
            this.x = PLAYFIELD_MIN_X;
        }
        if (this.x + this.width > PLAYFIELD_MAX_X) {
            this.x = PLAYFIELD_MAX_X - this.width;
        }
    }
}
//# sourceMappingURL=vaus.js.map