import { ARENA } from './engine.js';

export const BONUS_SHOTS = 3;
export const PERFECT_FOR_BONUS = 3;
export const MILESTONE = 10;

export const BONUS_ZONE = {
  bg1: '#140c02', bg2: '#3d2608', grid: 'rgba(255,200,80,0.09)', wall: '#ffb300', block: '#3a2a10', edge: '#ffcf4d',
  glass: '#fff3c4', line: '#fff1b0', dot: '#ffd54a', portal: '#ff6b9d', fg: '#fff7e6', soft: '#2a1a06', stars: false,
};

function rectDist(o, x, y) { const dx = Math.max(o.x - x, 0, x - o.x - o.w), dy = Math.max(o.y - y, 0, y - o.y - o.h); return Math.hypot(dx, dy); }

// Random bonus field: a few blocks and ~55 coins, 5 big coins (x5) and a chest (+50).
export function makeBonus(rnd = Math.random) {
  const start = { x: Math.round(70 + rnd() * 220), y: 522 };
  const obstacles = [];
  for (let tries = 0; obstacles.length < 3 && tries < 60; tries++) {
    const o = { w: Math.round(60 + rnd() * 50), h: 16, x: 0, y: 0 };
    o.x = Math.round(30 + rnd() * (ARENA.w - 60 - o.w)); o.y = Math.round(150 + rnd() * 240);
    if (Math.hypot(o.x + o.w / 2 - start.x, o.y - start.y) < 120) continue;
    if (obstacles.some((q) => Math.abs(q.y - o.y) < 50 && q.x < o.x + o.w + 30 && o.x < q.x + q.w + 30)) continue;
    obstacles.push(o);
  }
  const coins = [];
  for (let tries = 0; coins.length < 55 && tries < 4000; tries++) {
    const x = Math.round(30 + rnd() * (ARENA.w - 60)), y = Math.round(36 + rnd() * 420);
    if (Math.hypot(x - start.x, y - start.y) < 70) continue;
    if (obstacles.some((o) => rectDist(o, x, y) < 14)) continue;
    if (coins.some((c) => Math.hypot(c.x - x, c.y - y) < 25)) continue;
    coins.push({ x, y, v: 1, r: 8, kind: 'coin' });
  }
  const order = coins.map((c, i) => i).sort(() => rnd() - 0.5);
  order.slice(0, 5).forEach((i) => Object.assign(coins[i], { v: 5, r: 11, kind: 'big' }));
  const top = coins.map((c, i) => [c, i]).filter(([c]) => c.y < 170 && c.kind === 'coin');
  const chest = top.length ? top[Math.floor(rnd() * top.length)][1] : order[6];
  Object.assign(coins[chest], { v: 50, r: 14, kind: 'chest' });
  return { bonus: true, index: -2, start, obstacles, portals: [], dots: [], maxBounces: 7, preview: 1, coins };
}

export function drawCoin(c, coin, now, k) {
  const { x, y } = coin, TAU = Math.PI * 2;
  if (coin.kind === 'chest') {
    const w = 26, h = 19, bob = Math.sin(now * 0.004) * 1.5;
    c.save(); c.translate(x, y + bob);
    c.fillStyle = 'rgba(255,213,74,0.25)'; c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fill();
    c.fillStyle = '#7a4a12'; c.fillRect(-w / 2, -h / 2 + 5, w, h - 5);
    c.fillStyle = '#9c5d18'; c.beginPath(); c.moveTo(-w / 2, -h / 2 + 6); c.quadraticCurveTo(0, -h / 2 - 8, w / 2, -h / 2 + 6); c.closePath(); c.fill();
    c.fillStyle = '#ffd54a'; c.fillRect(-w / 2, -1, w, 3); c.fillRect(-2.5, -4, 5, 8);
    c.strokeStyle = '#ffd54a'; c.lineWidth = 1.5; c.strokeRect(-w / 2, -h / 2 + 5, w, h - 5);
    c.restore();
    return;
  }
  const r = coin.r * (k || 1), sx = Math.abs(Math.cos(now * 0.003 + x * 0.05)) * 0.8 + 0.2;
  c.save(); c.translate(x, y); c.scale(sx, 1);
  const g = c.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r);
  g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, coin.kind === 'big' ? '#ffb300' : '#ffd54a'); g.addColorStop(1, '#a8740a');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.strokeStyle = '#7a5406'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r * 0.68, 0, TAU); c.stroke();
  if (coin.kind === 'big') { c.fillStyle = '#5a3d04'; c.font = '800 ' + Math.round(r * 1.1) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('5', 0, 1); }
  c.restore();
}
