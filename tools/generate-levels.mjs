import { writeFileSync } from 'node:fs';
import { ARENA, DOT_R, PORTAL_R, mulberry32, simulate, collectedDots, isSolved } from '../js/engine.js';

// node tools/generate-levels.mjs          -> js/levels-data.js (60 levels)
// node tools/generate-levels.mjs --daily  -> js/daily-data.js  (365 daily levels)
const DAILY = process.argv.includes('--daily');

export function params(i) {
  return {
    dots: Math.min(7, 3 + Math.floor(i / 12)),
    obstacles: i < 2 ? i : Math.min(5, 1 + Math.floor(i / 6)),
    glass: i >= 40 ? 1 + (i >= 50 ? 1 : 0) : 0,
    portals: i >= 20 ? 1 : 0,
    maxBounces: Math.min(10, 4 + Math.floor(i / 8)),
    minBounces: Math.min(6, 2 + Math.floor(i / 10)),
    width: i < 5 ? 5 : i < 15 ? 3.6 : i < 30 ? 2.8 : i < 45 ? 2.2 : 1.8,
    preview: i < 5 ? 2 : i < 12 ? 1 : 0,
    theme: Math.floor(i / 15) % 4,
  };
}

function dailyParams(day) {
  return {
    dots: 5, obstacles: 3, glass: day % 3 === 0 ? 1 : 0, portals: day % 2 === 0 ? 1 : 0,
    maxBounces: 8, minBounces: 4, width: 2.4, preview: 0, theme: day % 4,
  };
}

function overlaps(a, b, m) { return a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y; }
function rectDist(o, x, y) { const dx = Math.max(o.x - x, 0, x - o.x - o.w), dy = Math.max(o.y - y, 0, y - o.y - o.h); return Math.hypot(dx, dy); }

function width(level, secret) {
  let lo = 0, hi = 0;
  for (let d = 0.1; d <= 10; d += 0.1) { if (isSolved(level, secret + d)) hi = d; else break; }
  for (let d = 0.1; d <= 10; d += 0.1) { if (isSolved(level, secret - d)) lo = d; else break; }
  return lo + hi;
}

export function makeLevel(seed, p) {
  let best = null;
  for (let attempt = 0; attempt < 4000; attempt++) {
    const rng = mulberry32(seed * 1009 + attempt * 7 + 11);
    const start = { x: Math.round(50 + rng() * 260), y: Math.round(470 + rng() * 60) };
    const obstacles = [];
    for (let k = 0, tries = 0; k < p.obstacles && tries < 80; tries++) {
      const glass = k < p.glass;
      const horizontal = rng() < 0.6;
      const o = horizontal ? { w: 70 + rng() * 60, h: glass ? 16 : 22 + rng() * 14 } : { w: glass ? 16 : 22 + rng() * 14, h: 70 + rng() * 60 };
      o.x = 30 + rng() * (ARENA.w - 60 - o.w); o.y = 80 + rng() * (350 - o.h);
      if (Math.hypot(o.x + o.w / 2 - start.x, o.y + o.h / 2 - start.y) < 120) continue;
      if (obstacles.some((q) => overlaps(o, q, 36))) continue;
      for (const key of ['x', 'y', 'w', 'h']) o[key] = Math.round(o[key]);
      if (glass) o.glass = true;
      obstacles.push(o); k++;
    }
    if (obstacles.length < p.obstacles) continue;
    const portals = [];
    for (let k = 0, tries = 0; k < p.portals && tries < 80; tries++) {
      const a = { x: Math.round(40 + rng() * 280), y: Math.round(70 + rng() * 360) };
      const b = { x: Math.round(40 + rng() * 280), y: Math.round(70 + rng() * 360) };
      if (Math.hypot(a.x - b.x, a.y - b.y) < 150) continue;
      if ([a, b].some((q) => Math.hypot(q.x - start.x, q.y - start.y) < 100 || obstacles.some((o) => rectDist(o, q.x, q.y) < PORTAL_R + 18))) continue;
      portals.push({ a, b }); k++;
    }
    if (portals.length < p.portals) continue;
    const secret = +(20 + rng() * 140).toFixed(2);
    const L = { start, obstacles, portals, dots: [], maxBounces: p.maxBounces, preview: p.preview, theme: p.theme, secret };
    const path = simulate(L, secret, p.maxBounces);
    const last = path[path.length - 1];
    if (last.b < p.minBounces || path.length < 260) continue;
    const portalAt = path.findIndex((q) => q.jump), glassAt = path.findIndex((q) => q.e === 'glass');
    if (p.portals && portalAt < 0) continue;
    if (p.glass && glassAt < 0) continue;
    const dots = [];
    let ok = true;
    for (let k = 0; k < p.dots; k++) {
      const f = 0.15 + ((k + 0.2 + rng() * 0.6) / p.dots) * 0.8;
      const q = path[Math.floor(f * (path.length - 1))];
      const d = { x: Math.round(q.x), y: Math.round(q.y) };
      if (Math.hypot(d.x - start.x, d.y - start.y) < 60 || dots.some((e) => Math.hypot(e.x - d.x, e.y - d.y) < DOT_R * 2.2)
        || portals.some((pp) => [pp.a, pp.b].some((c) => Math.hypot(c.x - d.x, c.y - d.y) < PORTAL_R + DOT_R + 4))
        || obstacles.some((o) => rectDist(o, d.x, d.y) < DOT_R - 4)) { ok = false; break; }
      dots.push(d);
    }
    if (!ok) continue;
    const idxOf = (d) => path.findIndex((q) => Math.hypot(q.x - d.x, q.y - d.y) <= DOT_R);
    if (p.portals && !dots.some((d) => idxOf(d) > portalAt)) continue;
    if (p.glass && !dots.some((d) => idxOf(d) > glassAt)) continue;
    L.dots = dots;
    if (!collectedDots(L, path).every(Boolean)) continue;
    const w = width(L, secret);
    const need = attempt < 3000 ? p.width : attempt < 3600 ? p.width * 0.8 : 1;
    L.width = +w.toFixed(1);
    if (!best || w > best.width) best = L;
    if (w >= need) { best = L; break; }
  }
  return best;
}

const out = [];
const count = DAILY ? 365 : 60;
const t0 = Date.now();
for (let i = 0; i < count; i++) {
  const p = DAILY ? dailyParams(i) : params(i);
  const L = makeLevel(DAILY ? 50000 + i * 17 : i * 31 + 3, p);
  if (!L) throw new Error('no level ' + i);
  out.push(L);
  if (!DAILY || i % 50 === 0) console.log(`#${i + 1} dots=${L.dots.length} obst=${L.obstacles.length} glass=${p.glass} portals=${L.portals.length} maxB=${L.maxBounces} width=${L.width} ${Math.round((Date.now() - t0) / 1000)}s`);
}
const name = DAILY ? 'daily-data.js' : 'levels-data.js', varName = DAILY ? 'DAILY' : 'LEVELS';
writeFileSync(new URL('../js/' + name, import.meta.url), `export const ${varName} = ` + JSON.stringify(out) + ';\n');
console.log('written', out.length, name, 'min width', Math.min(...out.map((l) => l.width)));
