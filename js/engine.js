export const ARENA = { w: 360, h: 560 };
export const BALL_R = 6;
export const DOT_R = 17;
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

export function simulate(level, angleDeg, maxBounces, maxLen) {
  const limit = Math.floor((maxLen || 3000) / STEP);
  const r = (angleDeg * Math.PI) / 180;
  let dx = Math.cos(r), dy = -Math.sin(r);
  let x = level.start.x, y = level.start.y, b = 0;
  const pts = [{ x, y, b: 0 }];
  for (let i = 0; i < limit; i++) {
    let nx = x + dx * STEP, ny = y + dy * STEP, hit = false;
    if (nx < MIN_X || nx > MAX_X) { dx = -dx; hit = true; nx = Math.min(Math.max(nx, MIN_X), MAX_X); }
    if (ny < MIN_Y || ny > MAX_Y) { dy = -dy; hit = true; ny = Math.min(Math.max(ny, MIN_Y), MAX_Y); }
    for (const o of level.obstacles) {
      const x0 = o.x - BALL_R, x1 = o.x + o.w + BALL_R, y0 = o.y - BALL_R, y1 = o.y + o.h + BALL_R;
      if (nx > x0 && nx < x1 && ny > y0 && ny < y1) {
        const outX = x <= x0 || x >= x1, outY = y <= y0 || y >= y1;
        if (outX && !outY) dx = -dx;
        else if (outY && !outX) dy = -dy;
        else { dx = -dx; dy = -dy; }
        nx = x + dx * STEP; ny = y + dy * STEP; hit = true;
        break;
      }
    }
    if (hit) {
      b++;
      if (b > maxBounces) { pts.push({ x, y, b }); break; }
    }
    x = nx; y = ny;
    pts.push({ x, y, b });
  }
  return pts;
}

export function collectedDots(level, pts) {
  return level.dots.map((d) => pts.some((p) => Math.hypot(p.x - d.x, p.y - d.y) <= DOT_R));
}

export function isSolved(level, angleDeg) {
  const pts = simulate(level, angleDeg, level.maxBounces);
  return collectedDots(level, pts).every(Boolean);
}
