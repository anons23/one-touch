export const ARENA = { w: 360, h: 560 };
export const BALL_R = 6;
export const DOT_R = 17;
export const PORTAL_R = 15;
const MIN_X = 14, MAX_X = ARENA.w - 14, MIN_Y = 14, MAX_Y = ARENA.h - 14;
const STEP = 2;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Path of the ball. Each point: {x, y, b} where b = bounces so far.
// Optional event fields: e = 'wall' | 'block' | 'glass' | 'portal', i = index of the glass block / portal,
// jump = true on the first point after a teleport (the trail starts a new segment there).
export function simulate(level, angleDeg, maxBounces, maxLen) {
  const limit = Math.floor((maxLen || 4500) / STEP);
  const r = (angleDeg * Math.PI) / 180;
  let dx = Math.cos(r), dy = -Math.sin(r);
  let x = level.start.x, y = level.start.y, b = 0;
  const alive = level.obstacles.map(() => true);
  const portals = level.portals || [];
  let cool = null;
  const pts = [{ x, y, b: 0 }];
  for (let k = 0; k < limit; k++) {
    let nx = x + dx * STEP, ny = y + dy * STEP, hit = null, hitIdx = -1;
    if (nx < MIN_X || nx > MAX_X) { dx = -dx; hit = 'wall'; nx = Math.min(Math.max(nx, MIN_X), MAX_X); }
    if (ny < MIN_Y || ny > MAX_Y) { dy = -dy; hit = 'wall'; ny = Math.min(Math.max(ny, MIN_Y), MAX_Y); }
    if (!hit) {
      for (let j = 0; j < level.obstacles.length; j++) {
        if (!alive[j]) continue;
        const o = level.obstacles[j];
        const x0 = o.x - BALL_R, x1 = o.x + o.w + BALL_R, y0 = o.y - BALL_R, y1 = o.y + o.h + BALL_R;
        if (nx > x0 && nx < x1 && ny > y0 && ny < y1) {
          const outX = x <= x0 || x >= x1, outY = y <= y0 || y >= y1;
          if (outX && !outY) dx = -dx;
          else if (outY && !outX) dy = -dy;
          else { dx = -dx; dy = -dy; }
          nx = x + dx * STEP; ny = y + dy * STEP;
          hit = o.glass ? 'glass' : 'block'; hitIdx = j;
          if (o.glass) alive[j] = false;
          break;
        }
      }
    }
    if (hit) {
      b++;
      if (b > maxBounces) { pts.push({ x, y, b, e: hit, i: hitIdx, end: true }); break; }
    }
    x = nx; y = ny;
    let jumped = false, pIdx = -1;
    if (cool) {
      if (Math.hypot(x - cool.x, y - cool.y) > PORTAL_R + 2) cool = null;
    } else {
      for (let j = 0; j < portals.length; j++) {
        const pa = portals[j];
        for (const [from, to] of [[pa.a, pa.b], [pa.b, pa.a]]) {
          if (Math.hypot(x - from.x, y - from.y) < PORTAL_R - 3) {
            pts.push({ x: from.x, y: from.y, b, e: 'portal', i: j });
            x = to.x + dx * (PORTAL_R + 1); y = to.y + dy * (PORTAL_R + 1);
            cool = to; jumped = true; pIdx = j;
            break;
          }
        }
        if (jumped) break;
      }
    }
    const p = { x, y, b };
    if (hit) { p.e = hit; p.i = hitIdx; }
    if (jumped) { p.jump = true; p.i = pIdx; }
    pts.push(p);
  }
  return pts;
}

export function collectedDots(level, pts) {
  return level.dots.map((d) => pts.some((p) => Math.hypot(p.x - d.x, p.y - d.y) <= DOT_R));
}

export function isSolved(level, angleDeg) {
  return collectedDots(level, simulate(level, angleDeg, level.maxBounces)).every(Boolean);
}
