import { test, expect } from '@playwright/test';

test.describe('Arkanoid II Warp Gate E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    await page.goto('/');
    
    // Click the LAUNCH SIMULATION button to unlock audio and start the loop
    const launchBtn = page.locator('#audio-unlock-btn');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();
    
    // Wait for the overlay to disappear
    await expect(page.locator('#audio-unlock-overlay')).toHaveClass(/hidden/);
  });

  test('Vaus enters right warp gate and transitions to round-02R by moving right', async ({ page }) => {
    // Load round 1 and set state to PLAYING
    await page.evaluate(async () => {
      await (window as any).game.loadAndPlayRound(1);
      (window as any).game.stateMachine.changeState('PLAYING');
    });

    // Make sure we are in PLAYING state
    let state = await page.evaluate(() => (window as any).game.getStateMachineState());
    expect(state).toBe('PLAYING');

    // Trigger Break Warp gate open
    await page.evaluate(() => {
      (window as any).game.sim.isBreakWarpOpen = true;
    });

    // Hold ArrowRight key to move Vaus to the right gate
    console.log('Holding ArrowRight key...');
    await page.keyboard.down('ArrowRight');

    // Wait for the state to transition to BREAK_WARP (wait up to 3 seconds)
    let transitioned = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(100);
      state = await page.evaluate(() => (window as any).game.getStateMachineState());
      if (state === 'BREAK_WARP') {
        transitioned = true;
        break;
      }
    }
    
    // Release key
    await page.keyboard.up('ArrowRight');
    
    expect(transitioned).toBe(true);

    // Wait for the transition delay (120 frames = 2 seconds, wait 2.5 seconds)
    console.log('Waiting for transition delay...');
    await page.waitForTimeout(2500);

    // Now verify the state transitioned to ROUND_INTRO (or BALL_READY)
    state = await page.evaluate(() => (window as any).game.getStateMachineState());
    console.log('State after warp transition:', state);
    
    // It should have loaded round 2 branch 'R'
    const currentRoundNum = await page.evaluate(() => (window as any).GameState.currentRoundNum);
    const currentRoundBranch = await page.evaluate(() => (window as any).GameState.currentRoundBranch);
    console.log(`Current Round: ${currentRoundNum}${currentRoundBranch}`);

    expect(currentRoundNum).toBe(2);
    expect(currentRoundBranch).toBe('R');
    expect(state === 'ROUND_INTRO' || state === 'BALL_READY' || state === 'PLAYING').toBe(true);
  });

  test('Vaus transitions to round-02R after clearing all bricks and moving right', async ({ page }) => {
    // Load round 1 and set state to PLAYING
    await page.evaluate(async () => {
      await (window as any).game.loadAndPlayRound(1);
      (window as any).game.stateMachine.changeState('PLAYING');
    });

    // Artificially clear all bricks in the simulation
    await page.evaluate(() => {
      const sim = (window as any).game.sim;
      // Set required clear brick count to 0
      sim.bricks.clearRequiredCount = 0;
    });

    // Wait a tick or two for stage clear check to trigger
    await page.waitForTimeout(100);

    // Verify balls are cleared and isBreakWarpOpen is true
    const ballsCount = await page.evaluate(() => (window as any).game.sim.balls.length);
    const isWarpOpen = await page.evaluate(() => (window as any).game.sim.isBreakWarpOpen);
    const isRoundCompleted = await page.evaluate(() => (window as any).game.sim.isRoundCompletedMode);

    console.log(`Before warp move: ballsCount=${ballsCount}, isWarpOpen=${isWarpOpen}, isRoundCompleted=${isRoundCompleted}`);
    expect(ballsCount).toBe(0);
    expect(isWarpOpen).toBe(true);
    expect(isRoundCompleted).toBe(true);

    // Verify we did NOT transition to LIFE_LOST (we should still be in PLAYING state)
    let state = await page.evaluate(() => (window as any).game.getStateMachineState());
    expect(state).toBe('PLAYING');

    // Hold ArrowRight key to move Vaus to the right gate
    console.log('Holding ArrowRight key...');
    await page.keyboard.down('ArrowRight');

    // Wait for the state to transition to BREAK_WARP (wait up to 3 seconds)
    let transitioned = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(100);
      state = await page.evaluate(() => (window as any).game.getStateMachineState());
      if (state === 'BREAK_WARP') {
        transitioned = true;
        break;
      }
    }
    
    // Release key
    await page.keyboard.up('ArrowRight');
    
    expect(transitioned).toBe(true);

    // Wait for the transition delay (120 frames = 2 seconds, wait 2.5 seconds)
    console.log('Waiting for transition delay...');
    await page.waitForTimeout(2500);

    // Verify the state transitioned to ROUND_INTRO (or BALL_READY)
    state = await page.evaluate(() => (window as any).game.getStateMachineState());
    console.log('State after brick clear warp transition:', state);
    
    const currentRoundNum = await page.evaluate(() => (window as any).GameState.currentRoundNum);
    const currentRoundBranch = await page.evaluate(() => (window as any).GameState.currentRoundBranch);
    console.log(`Current Round: ${currentRoundNum}${currentRoundBranch}`);

    expect(currentRoundNum).toBe(2);
    expect(currentRoundBranch).toBe('R');
    expect(state === 'ROUND_INTRO' || state === 'BALL_READY' || state === 'PLAYING').toBe(true);
  });

  test('Vaus transitions correctly even when level loading is delayed (prevents race condition)', async ({ page }) => {
    // Route mock to delay level data loading by 3.5 seconds (3500ms)
    await page.route('**/data/levels/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 3500));
      await route.continue();
    });

    // Load round 1 and set state to PLAYING
    await page.evaluate(async () => {
      await (window as any).game.loadAndPlayRound(1);
      (window as any).game.stateMachine.changeState('PLAYING');
    });

    // Make sure score is initially 0
    let initialScore = await page.evaluate(() => (window as any).GameState.score);
    expect(initialScore).toBe(0);

    // Trigger Break Warp gate open
    await page.evaluate(() => {
      (window as any).game.sim.isBreakWarpOpen = true;
    });

    // Move Vaus to the right gate
    console.log('Holding ArrowRight key...');
    await page.keyboard.down('ArrowRight');

    // Wait for the state to transition to BREAK_WARP
    let transitioned = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(100);
      let state = await page.evaluate(() => (window as any).game.getStateMachineState());
      if (state === 'BREAK_WARP') {
        transitioned = true;
        break;
      }
    }
    await page.keyboard.up('ArrowRight');
    expect(transitioned).toBe(true);

    // Now, wait 4.5 seconds.
    // The transition delay is 2 seconds (120 frames). The network fetch is delayed by 3.5 seconds.
    // Total time to complete loading should be 2.0 + 3.5 = 5.5 seconds.
    // At 4.5 seconds, fetch is still in progress (isTransitioningRound === true, state === BREAK_WARP).
    // We want to verify that during this fetch delay, score doesn't keep increasing and roundNum doesn't keep skipping.
    console.log('Waiting 4.5 seconds (during delayed fetch)...');
    await page.waitForTimeout(4500);

    // Verify state is still BREAK_WARP
    let state = await page.evaluate(() => (window as any).game.getStateMachineState());
    expect(state).toBe('BREAK_WARP');

    // Verify score is exactly 10,000 (meaning it was added only once)
    let score = await page.evaluate(() => (window as any).GameState.score);
    expect(score).toBe(10000);

    // Verify round is 2R (meaning it advanced only once)
    let roundNum = await page.evaluate(() => (window as any).GameState.currentRoundNum);
    let roundBranch = await page.evaluate(() => (window as any).GameState.currentRoundBranch);
    console.log(`At 4.5s: roundNum=${roundNum}, roundBranch=${roundBranch}, score=${score}`);
    expect(roundNum).toBe(2);
    expect(roundBranch).toBe('R');

    // Now wait another 2 seconds (total 6.5s) so the fetch finishes and state becomes ROUND_INTRO
    console.log('Waiting another 2 seconds for fetch to complete...');
    await page.waitForTimeout(2000);

    state = await page.evaluate(() => (window as any).game.getStateMachineState());
    console.log('Final state after delay:', state);
    expect(state === 'ROUND_INTRO' || state === 'BALL_READY' || state === 'PLAYING').toBe(true);
  });
});
