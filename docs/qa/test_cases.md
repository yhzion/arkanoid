# QA Test Cases

*Reference: `prd.md` Section 20 (QA and Acceptance Criteria) & 34 (Acceptance Tolerances)*

This document defines the test case structure for automated (Playwright/Jest) and manual testing.

## 1. Core Simulation Tests (Unit Tests)
- `test('Ball angle calculation returns expected values within +/- 1 degree tolerance')`
- `test('Multiple threshold crosses in one tick awards correct number of lives')`

## 2. State Transition Tests (Integration)
- `test('Game transitions to STAGE_CLEAR when last clearable brick is destroyed')`
- `test('Entering break exit triggers Next Round without boss skip unless round 35')`

## 3. UI/Visual Tests (E2E)
- Verify integer scaling and canvas aspect ratio on different viewport sizes.
- Verify HUD updates synchronously with `SCORE_CHANGED` events.

*Note: For exact criteria and expected values, rely solely on `prd.md`.*
