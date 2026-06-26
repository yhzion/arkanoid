import { test, expect } from '@playwright/test';
test('game loads and renders canvas', async ({ page }) => {
    await page.goto('/');
    // Check if title is correct
    await expect(page).toHaveTitle('NES Arkanoid Web');
    // Check if canvas exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    // Wait a bit for the game loop to run
    await page.waitForTimeout(100);
    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/game-loaded.png' });
});
test('vaus moves with input', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(100);
    // Take screenshot before move
    await page.screenshot({ path: 'tests/screenshots/before-move.png' });
    // Press right arrow
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200); // Wait enough ticks (60Hz -> ~12 ticks)
    await page.keyboard.up('ArrowRight');
    // Take screenshot after move
    await page.screenshot({ path: 'tests/screenshots/after-move.png' });
    // At this point we are just visually verifying, but a more robust test
    // could involve exposing the game state to the window object or using
    // pixel match tools to compare the screenshots.
});
//# sourceMappingURL=game.spec.js.map