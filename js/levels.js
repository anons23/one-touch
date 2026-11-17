import { ARENA, BALL_R, DOT_R, mulberry32, simulate, collectedDots, isSolved } from './engine.js';

export const LEVEL_COUNT = 20;

export const THEMES = [
  { name: 'Бумага', bg: '#f4efe3', fg: '#2b2a26', wall: '#2b2a26', obstacle: '#2b2a26', line: '#d9482b', dot: '#1f6f8b', soft: '#e3dccb' },
  { name: 'Ночь', bg: '#12141f', fg: '#e8ecff', wall: '#3b4268', obstacle: '#3b4268', line: '#5eead4', dot: '#fbbf24', soft: '#1d2133' },
  { name: 'Неон', bg: '#0b0b10', fg: '#f5f5ff', wall: '#ff2d95', obstacle: '#ff2d95', line: '#00e5ff', dot: '#b6ff3b', soft: '#171722' },
  { name: 'Лёд', bg: '#e8f3fb', fg: '#14304a', wall: '#5b86a8', obstacle: '#8fb4cf', line: '#1d4ed8', dot: '#0ea5a4', soft: '#d3e6f3' },
];

function params(i) {
  return {
    dots: 3 + Math.floor(i / 5),
    obstacles: Math.min(Math.floor(i / 3), 4),
    maxBounces: 4 + Math.floor(i / 4),
    minBounces: 2 + Math.floor(i / 6),
  };
}

function overlaps(a, b, m) {
  return a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y;
}

function solutionWidth(level, secret) {
  let lo = 0, hi = 0;
  for (let d = 0.1; d <= 8; d += 0.1) { if (isSolved(level, secret + d)) hi = d; else break; }
  for (let d = 0.1; d <= 8; d += 0.1) { if (isSolved(level, secret - d)) lo = d; else break; }
  return lo + hi;
}

const cache = new Map();

export function getLevel(index) {
  if (cache.has(index)) return cache.get(index);
  const p = params(index);
  let best = null;
  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = mulberry32(index * 1009 + attempt * 7 + 11);
    const start = { x: 50 + rng() * 260, y: 450 + rng() * 80 };
    const obstacles = [];
    for (let k = 0, tries = 0; k < p.obstacles && tries < 60; tries++) {
      const horizontal = rng() < 0.6;
      const o = horizontal
        ? { w: 70 + rng() * 60, h: 22 + rng() * 14 }
        : { w: 22 + rng() * 14, h: 70 + rng() * 60 };
      o.x = 30 + rng() * (ARENA.w - 60 - o.w);
      o.y = 90 + rng() * (340 - o.h);
      if (Math.hypot(o.x + o.w / 2 - start.x, o.y + o.h / 2 - start.y) < 120) continue;
      if (obstacles.some((q) => overlaps(o, q, 40))) continue;
      obstacles.push(o); k++;
    }
    const secret = 25 + rng() * 130;
    const base = { index, start, obstacles, dots: [], maxBounces: p.maxBounces, secret, theme: Math.floor(index / 5) % THEMES.length };
    const path = simulate(base, secret, p.maxBounces);
    const finalB = path[path.length - 1].b;
    if (finalB < p.minBounces || path.length < 220) continue;
    const dots = [];
    let ok = true;
    for (let k = 0; k < p.dots; k++) {
      const f = 0.16 + ((k + 0.15 + rng() * 0.7) / p.dots) * 0.62;
      const q = path[Math.floor(f * (path.length - 1))];
      const d = { x: Math.round(q.x), y: Math.round(q.y) };
      if (Math.hypot(d.x - start.x, d.y - start.y) < 55 || dots.some((e) => Math.hypot(e.x - d.x, e.y - d.y) < DOT_R * 2.2)) { ok = false; break; }
      dots.push(d);
    }
    if (!ok) continue;
    base.dots = dots;
    if (!collectedDots(base, path).every(Boolean)) continue;
    const width = solutionWidth(base, secret);
    base.width = width;
    const target = index < 5 ? 4 : index < 10 ? 3 : index < 15 ? 2.4 : 2;
    const need = attempt < 250 ? target : attempt < 400 ? target * 0.6 : 0.3;
    if (!best || width > best.width) best = base;
    if (width >= need) { best = base; break; }
  }
  cache.set(index, best);
  return best;
}
