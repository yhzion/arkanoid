import { test, expect } from '@playwright/test';

test.describe('Arkanoid II Power-Up Items E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Click the LAUNCH SIMULATION button to unlock audio and start the loop
    const launchBtn = page.locator('#audio-unlock-btn');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();
    
    // Wait for the overlay to disappear
    await expect(page.locator('#audio-unlock-overlay')).toHaveClass(/hidden/);
    
    // Load round 1 and set state to PLAYING
    await page.evaluate(async () => {
      await (window as any).game.loadAndPlayRound(1);
      (window as any).game.stateMachine.changeState('PLAYING');
    });
  });

  test('Vaus width increases when E (Enlarge) is collected and resets on others', async ({ page }) => {
    // Check initial width: 32px in Fx (32 * 65536 = 2097152)
    const initialWidth = await page.evaluate(() => (window as any).game.sim.vaus.width);
    expect(initialWidth).toBe(2097152);

    // Apply Enlarge capsule 'E'
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('E');
    });

    // Check enlarged width: 48px in Fx (48 * 65536 = 3145728)
    const enlargedWidth = await page.evaluate(() => (window as any).game.sim.vaus.width);
    expect(enlargedWidth).toBe(3145728);

    // Take screenshot to visually confirm
    await page.screenshot({ path: 'tests/screenshots/vaus-enlarged.png' });

    // Apply another power-up e.g. 'S' to cancel enlarge
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('S');
    });

    // Width should go back to 32px
    const resetWidth = await page.evaluate(() => (window as any).game.sim.vaus.width);
    expect(resetWidth).toBe(2097152);
  });

  test('Vaus width decreases when R (Reduce) is collected and score doubles on brick hit', async ({ page }) => {
    // Apply Reduce capsule 'R'
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('R');
    });

    // Check reduced width: 16px in Fx (16 * 65536 = 1048576)
    const reducedWidth = await page.evaluate(() => (window as any).game.sim.vaus.width);
    expect(reducedWidth).toBe(1048576);

    // Verify reduceActive is true
    const reduceActive = await page.evaluate(() => (window as any).game.sim.vaus.reduceActive);
    expect(reduceActive).toBe(true);

    // Take screenshot to visually confirm
    await page.screenshot({ path: 'tests/screenshots/vaus-reduced.png' });

    // Test doubled score logic:
    // Hitting a WHITE brick should normally give 50 points, but under R it should give 100 points.
    // Let's set a WHITE brick hitsRemaining to 1 and trigger hitBrick
    const scoreDelta = await page.evaluate(() => {
      const sim = (window as any).game.sim;
      // Put a white brick at (0, 4)
      const cell = sim.bricks.getCell(0, 4);
      cell.type = 'WHITE';
      cell.hitsRemaining = 1;
      const initialScore = (window as any).GameState.score;
      sim.bricks.hitBrick(0, 4, 1, false, sim.vaus.reduceActive);
      return (window as any).GameState.score - initialScore;
    });

    expect(scoreDelta).toBe(100); // 50 * 2 = 100 points
  });

  test('Mega Ball (M) enables penetration and destroys gold bricks', async ({ page }) => {
    // Apply Mega capsule 'M'
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('M');
    });

    // Verify megaActive is true
    const megaActive = await page.evaluate(() => (window as any).game.sim.megaActive);
    expect(megaActive).toBe(true);

    // Test gold brick destruction:
    // Gold brick should normally not be destroyed, but with forceDestroy (Mega Ball) it should.
    const isDestroyed = await page.evaluate(() => {
      const sim = (window as any).game.sim;
      const cell = sim.bricks.getCell(0, 5);
      cell.type = 'GOLD';
      cell.hitsRemaining = Infinity;
      const res = sim.bricks.hitBrick(0, 5, 1, sim.megaActive, sim.vaus.reduceActive);
      return res.destroyed;
    });

    expect(isDestroyed).toBe(true);
  });

  test('Slow (S) reduces ball speed', async ({ page }) => {
    // Release ball first so it is not held
    await page.evaluate(() => {
      (window as any).game.sim.balls[0].isHeld = false;
      (window as any).game.sim.balls[0].vx = 131072; // Q16.16 speed vectors
      (window as any).game.sim.balls[0].vy = -131072;
    });

    // Apply Slow capsule 'S'
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('S');
    });

    // Check speed: 1.5px/tick in Fx (1.5 * 65536 = 98304)
    const ballSpeed = await page.evaluate(() => (window as any).game.sim.balls[0].speed);
    expect(ballSpeed).toBe(98304);
  });

  test('Catch (C) activates catch state on Vaus', async ({ page }) => {
    // Apply Catch capsule 'C'
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('C');
    });

    // Verify catchActive is true
    const catchActive = await page.evaluate(() => (window as any).game.sim.vaus.catchActive);
    expect(catchActive).toBe(true);
  });

  test('Laser (L) activates laser shooting state on Vaus', async ({ page }) => {
    // Apply Laser capsule 'L'
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('L');
    });

    // Verify laserActive is true
    const laserActive = await page.evaluate(() => (window as any).game.sim.vaus.laserActive);
    expect(laserActive).toBe(true);
  });

  test('Disruption (D) splits ball into three', async ({ page }) => {
    // Apply Disruption capsule 'D'
    await page.evaluate(() => {
      (window as any).game.sim.applyPowerUp('D');
    });

    // Check balls count
    const ballsCount = await page.evaluate(() => (window as any).game.sim.balls.length);
    expect(ballsCount).toBe(3);
  });
});
