export class Renderer {
    ctx;
    width;
    height;
    constructor(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error("Could not get 2d context");
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;
    }
    render(gameState, roundState) {
        // Clear screen
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        // Draw Vaus
        if (roundState.vaus) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillRect(roundState.vaus.x, roundState.vaus.y, roundState.vaus.width, roundState.vaus.height);
        }
        // Draw Balls
        this.ctx.fillStyle = '#fff';
        for (const ball of roundState.balls) {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        // Draw Bricks
        for (const brick of roundState.bricks) {
            if (brick.hp > 0) {
                this.ctx.fillStyle = '#f00'; // Hardcode red for now
                this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            }
        }
        // Draw Score
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`SCORE: ${gameState.score}`, 10, 10);
    }
}
//# sourceMappingURL=renderer.js.map