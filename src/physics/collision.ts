import { Fx, fxDiv, fxMul, FX_ONE } from '../core/fxMath';

export interface AABB {
    x: Fx;
    y: Fx;
    w: Fx;
    h: Fx;
}

export interface CollisionResult {
    t: Fx;       // entry time, where 0 is start of tick and 65536 is end of tick
    nx: number;  // x normal (-1, 0, or 1)
    ny: number;  // y normal (-1, 0, or 1)
}

export function isOverlapping(boxA: AABB, boxB: AABB): boolean {
    return (
        boxA.x < boxB.x + boxB.w &&
        boxA.x + boxA.w > boxB.x &&
        boxA.y < boxB.y + boxB.h &&
        boxA.y + boxA.h > boxB.y
    );
}

/**
 * Perform swept AABB collision detection.
 */
export function sweptAABB(
    boxA: AABB,
    vx: Fx,
    vy: Fx,
    boxB: AABB
): CollisionResult | null {
    // If they already overlap at the start of the tick
    if (isOverlapping(boxA, boxB)) {
        // Resolve immediately at t = 0
        // Find direction of minimum penetration
        const penLeft = (boxA.x + boxA.w) - boxB.x;
        const penRight = (boxB.x + boxB.w) - boxA.x;
        const penTop = (boxA.y + boxA.h) - boxB.y;
        const penBottom = (boxB.y + boxB.h) - boxA.y;

        const minPen = Math.min(penLeft, penRight, penTop, penBottom);
        if (minPen === penLeft) return { t: 0, nx: -1, ny: 0 };
        if (minPen === penRight) return { t: 0, nx: 1, ny: 0 };
        if (minPen === penTop) return { t: 0, nx: 0, ny: -1 };
        return { t: 0, nx: 0, ny: 1 };
    }

    let xEntryDist: Fx = 0;
    let xExitDist: Fx = 0;
    let yEntryDist: Fx = 0;
    let yExitDist: Fx = 0;

    // Entry and exit distances
    if (vx > 0) {
        xEntryDist = boxB.x - (boxA.x + boxA.w);
        xExitDist = (boxB.x + boxB.w) - boxA.x;
    } else if (vx < 0) {
        xEntryDist = (boxB.x + boxB.w) - boxA.x;
        xExitDist = boxB.x - (boxA.x + boxA.w);
    }

    if (vy > 0) {
        yEntryDist = boxB.y - (boxA.y + boxA.h);
        yExitDist = (boxB.y + boxB.h) - boxA.y;
    } else if (vy < 0) {
        yEntryDist = (boxB.y + boxB.h) - boxA.y;
        yExitDist = boxB.y - (boxA.y + boxA.h);
    }

    // Time entry / exit along X and Y axes
    // In fixed-point, division gives t value in Q16.16 (where 65536 = 1.0)
    let xEntry = vx !== 0 ? fxDiv(xEntryDist, vx) : -Infinity;
    let xExit = vx !== 0 ? fxDiv(xExitDist, vx) : Infinity;
    let yEntry = vy !== 0 ? fxDiv(yEntryDist, vy) : -Infinity;
    let yExit = vy !== 0 ? fxDiv(yExitDist, vy) : Infinity;

    if (vx === 0) {
        if (boxA.x + boxA.w <= boxB.x || boxA.x >= boxB.x + boxB.w) return null;
        xEntry = -Infinity;
        xExit = Infinity;
    }
    if (vy === 0) {
        if (boxA.y + boxA.h <= boxB.y || boxA.y >= boxB.y + boxB.h) return null;
        yEntry = -Infinity;
        yExit = Infinity;
    }

    const entryTime = Math.max(xEntry, yEntry);
    const exitTime = Math.min(xExit, yExit);

    // No collision condition
    if (
        entryTime > exitTime ||
        (xEntry < 0 && yEntry < 0) ||
        xEntry > FX_ONE ||
        yEntry > FX_ONE
    ) {
        return null;
    }

    let nx = 0;
    let ny = 0;

    if (xEntry > yEntry) {
        nx = vx > 0 ? -1 : 1;
    } else if (xEntry < yEntry) {
        ny = vy > 0 ? -1 : 1;
    } else {
        // Corner hit, resolve by smaller penetration depth at time of entry
        const penX = vx > 0 ? (boxA.x + boxA.w - boxB.x) : (boxB.x + boxB.w - boxA.x);
        const penY = vy > 0 ? (boxA.y + boxA.h - boxB.y) : (boxB.y + boxB.h - boxA.y);
        if (penX < penY) {
            nx = vx > 0 ? -1 : 1;
        } else {
            ny = vy > 0 ? -1 : 1;
        }
    }

    return {
        t: entryTime,
        nx,
        ny
    };
}
