export class Ball {
    x;
    y;
    vx;
    vy;
    radius = 2; // Assuming 4x4 square or circle
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
}
//# sourceMappingURL=ball.js.map