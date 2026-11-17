// Skins for the cannon (launcher), the charge (beam trail + head) and the target dots.
// price: coins; ads: number of rewarded ads to unlock (top skins). Names come from i18n: skin.<id>.
export const SKINS = {
  cannon: [
    { id: 'classic', price: 0 },
    { id: 'turret', price: 150 },
    { id: 'tri', price: 250 },
    { id: 'eye', price: 350 },
    { id: 'hex', price: 450 },
    { id: 'crystal', price: 600 },
    { id: 'plasma', ads: 3, top: true },
    { id: 'crown', ads: 5, top: true },
  ],
  ball: [
    { id: 'classic', price: 0 },
    { id: 'fire', price: 200 },
    { id: 'ice', price: 200 },
    { id: 'toxic', price: 300 },
    { id: 'gold', price: 500 },
    { id: 'rainbow', ads: 3, top: true },
    { id: 'lightning', ads: 4, top: true },
  ],
  dot: [
    { id: 'classic', price: 0 },
    { id: 'star', price: 150 },
    { id: 'heart', price: 200 },
    { id: 'gem', price: 300 },
    { id: 'coin', price: 400 },
    { id: 'planet', ads: 3, top: true },
  ],
};

export function findSkin(cat, id) { return SKINS[cat].find((s) => s.id === id) || SKINS[cat][0]; }

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(c, a) { return c.startsWith('hsl') ? c.replace('hsl(', 'hsla(').replace(')', ',' + a + ')') : 'rgba(' + hex(c).join(',') + ',' + a + ')'; }
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- charge */
const BALL = {
  classic: (z) => [z.line, z.line, z.line],
  fire: () => ['#ff3d00', '#ff9100', '#ffe082'],
  ice: () => ['#3fb6ff', '#bfefff', '#ffffff'],
  toxic: () => ['#1fd10f', '#7dff3a', '#eaffd0'],
  gold: () => ['#b8860b', '#ffd54a', '#fff6c8'],
  rainbow: () => ['#ff4fd8', '#7c4dff', '#ffffff'],
  lightning: () => ['#7c4dff', '#c3b5ff', '#ffffff'],
};
export function ballColor(id, zone) { return BALL[id] ? BALL[id](zone)[1] : zone.line; }

function tracePts(c, pts, upto, jitter) {
  c.beginPath();
  let started = false;
  for (let i = 0; i <= upto && i < pts.length; i++) {
    const p = pts[i];
    let x = p.x, y = p.y;
    if (jitter && i % 6 === 0 && i > 0 && i < upto) { x += jitter(i); y += jitter(i + 7); }
    if (!started || p.jump) { c.moveTo(x, y); started = true; } else if (!jitter || i % 6 === 0 || i === upto) c.lineTo(x, y);
  }
}

export function drawTrail(c, id, pts, upto, zone, now) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round';
  if (id === 'rainbow') {
    const seg = 5;
    for (const [w, a] of [[11, 0.13], [5, 0.35], [2.2, 1]]) {
      c.lineWidth = w;
      for (let i = 0; i < upto; i += seg) {
        const j = Math.min(upto, i + seg);
        if (pts[i + 1] && pts.slice(i + 1, j + 1).some((p) => p.jump)) continue;
        c.strokeStyle = `hsla(${(i * 0.9 - now * 0.12) % 360},100%,62%,${a})`;
        c.beginPath(); c.moveTo(pts[i].x, pts[i].y); c.lineTo(pts[j].x, pts[j].y); c.stroke();
      }
    }
  } else if (id === 'lightning') {
    const tick = Math.floor(now / 70);
    const jit = (i) => { const s = Math.sin(i * 12.9898 + tick * 78.233) * 43758.5453; return ((s - Math.floor(s)) - 0.5) * 9; };
    const col = BALL.lightning();
    [[12, 0.12, col[0]], [5, 0.35, col[1]], [1.8, 1, col[2]]].forEach(([w, a, cl]) => { c.lineWidth = w; c.strokeStyle = rgba(cl, a); tracePts(c, pts, upto, jit); c.stroke(); });
  } else {
    const col = (BALL[id] || BALL.classic)(zone);
    [[11, 0.12, col[0]], [5, 0.3, col[1]], [2.2, 1, col[2]]].forEach(([w, a, cl]) => { c.lineWidth = w; c.strokeStyle = rgba(cl, a); tracePts(c, pts, upto); c.stroke(); });
  }
  c.restore();
}

export function drawHead(c, id, x, y, zone, now, size) {
  const k = size || 1, col = (BALL[id] || BALL.classic)(zone);
  let mid = col[1];
  if (id === 'rainbow') mid = `hsl(${(-now * 0.12) % 360},100%,62%)`;
  const r = (id === 'fire' ? 22 : 18) * k;
  const g = c.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, rgba(mid, 0.85)); g.addColorStop(1, rgba(mid, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  if (id === 'ice' || id === 'lightning') {
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.2 * k;
    const a = now * 0.004;
    for (let i = 0; i < 4; i++) { const t = a + (i * Math.PI) / 4; c.beginPath(); c.moveTo(x - Math.cos(t) * 8 * k, y - Math.sin(t) * 8 * k); c.lineTo(x + Math.cos(t) * 8 * k, y + Math.sin(t) * 8 * k); c.stroke(); }
  }
}

/* ---------------------------------------------------------------- dots */
const DOT_COL = { star: '#ffe14d', heart: '#ff4d8d', gem: '#5ef2ff', coin: '#ffd54a', planet: '#c58bff' };
export function dotColor(id, zone) { return DOT_COL[id] || zone.dot; }

function starPath(c, x, y, r1, r2, n, rot) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n - Math.PI / 2; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}

export function drawDot(c, id, x, y, zone, now, i, size) {
  const k = size || 1, col = dotColor(id, zone), pulse = 1 + 0.08 * Math.sin(now * 0.005 + i);
  c.fillStyle = rgba(col, 0.2); c.beginPath(); c.arc(x, y, 13 * k * pulse, 0, TAU); c.fill();
  if (id === 'star') {
    starPath(c, x, y, 10 * k * pulse, 4.5 * k, 5, Math.sin(now * 0.002 + i) * 0.3);
    c.fillStyle = col; c.fill(); c.strokeStyle = '#fff7c0'; c.lineWidth = 1; c.stroke();
  } else if (id === 'heart') {
    const s = 9 * k * pulse;
    c.beginPath(); c.moveTo(x, y + s * 0.9);
    c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
    c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    c.fillStyle = col; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x - s * 0.45, y - s * 0.35, s * 0.2, 0, TAU); c.fill();
  } else if (id === 'gem') {
    const s = 10 * k * pulse;
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y - s * 0.25); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y - s * 0.25); c.closePath();
    c.fillStyle = col; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x - s * 0.8, y - s * 0.25); c.lineTo(x + s * 0.8, y - s * 0.25); c.moveTo(x, y - s); c.lineTo(x - s * 0.3, y - s * 0.25); c.lineTo(x, y + s); c.lineTo(x + s * 0.3, y - s * 0.25); c.closePath(); c.stroke();
  } else if (id === 'coin') {
    const sx = Math.abs(Math.cos(now * 0.003 + i)) * 0.85 + 0.15, s = 9 * k;
    c.save(); c.translate(x, y); c.scale(sx, 1);
    const g = c.createRadialGradient(-3, -3, 1, 0, 0, s); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffd54a'); g.addColorStop(1, '#b8860b');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
    c.strokeStyle = '#8a6508'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, s * 0.68, 0, TAU); c.stroke();
    c.restore();
  } else if (id === 'planet') {
    const s = 8 * k * pulse, tilt = 0.35;
    const g = c.createRadialGradient(x - 3, y - 3, 1, x, y, s); g.addColorStop(0, '#f1e0ff'); g.addColorStop(1, col);
    c.save(); c.translate(x, y); c.rotate(-tilt);
    c.strokeStyle = '#ffd59a'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, 0, s * 1.8, s * 0.55, 0, Math.PI, TAU); c.stroke();
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, 0, s * 1.8, s * 0.55, 0, 0, Math.PI); c.stroke();
    const m = now * 0.002 + i;
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(Math.cos(m) * s * 2.2, Math.sin(m) * s * 0.7, 1.6, 0, TAU); c.fill();
    c.restore();
  } else {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, 6 * k, 0, TAU); c.fill();
    c.strokeStyle = rgba(col, 0.45); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 12 * k * pulse, 0, TAU); c.stroke();
  }
}

/* ---------------------------------------------------------------- cannon */
export function drawCannon(c, id, x, y, angleDeg, zone, now, aiming, size) {
  const k = size || 1, a = (-angleDeg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  c.save(); c.translate(x, y); c.scale(k, k);
  if (id === 'turret') {
    c.rotate(a);
    c.fillStyle = '#2a2f45'; c.strokeStyle = zone.line; c.lineWidth = 2;
    c.fillRect(2, -4, 20, 8); c.strokeRect(2, -4, 20, 8);
    c.fillStyle = zone.line; c.fillRect(19, -5, 4, 10);
    c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fillStyle = '#1b1f30'; c.fill(); c.stroke();
    c.fillStyle = zone.line; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill();
  } else if (id === 'tri') {
    c.rotate(a);
    const g = c.createLinearGradient(-10, 0, 18, 0); g.addColorStop(0, zone.line); g.addColorStop(1, '#ffffff');
    c.beginPath(); c.moveTo(18, 0); c.lineTo(-9, 10); c.lineTo(-4, 0); c.lineTo(-9, -10); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.stroke();
    if (aiming) { c.fillStyle = rgba('#ff9100', 0.6 + 0.3 * Math.sin(now * 0.03)); c.beginPath(); c.moveTo(-5, 0); c.lineTo(-14 - 3 * Math.sin(now * 0.05), 4); c.lineTo(-14 - 3 * Math.sin(now * 0.05), -4); c.closePath(); c.fill(); }
  } else if (id === 'eye') {
    c.fillStyle = '#f4f4ff'; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill();
    c.strokeStyle = zone.line; c.lineWidth = 2; c.stroke();
    c.fillStyle = zone.line; c.beginPath(); c.arc(dx * 5, dy * 5, 5.5, 0, TAU); c.fill();
    c.fillStyle = '#05050a'; c.beginPath(); c.arc(dx * 6, dy * 6, 2.6, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(dx * 6 - 1.5, dy * 6 - 1.5, 1, 0, TAU); c.fill();
  } else if (id === 'hex') {
    c.save(); c.rotate(now * 0.0015);
    c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(Math.cos((i * TAU) / 6) * 13, Math.sin((i * TAU) / 6) * 13); c.closePath();
    c.fillStyle = '#141a2e'; c.fill(); c.strokeStyle = zone.line; c.lineWidth = 2; c.stroke();
    c.restore();
    c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(dx * 4, dy * 4); c.lineTo(dx * 18, dy * 18); c.stroke();
    c.fillStyle = zone.line; c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.fill();
  } else if (id === 'crystal') {
    c.rotate(a);
    const g = c.createLinearGradient(-12, -8, 18, 8); g.addColorStop(0, '#4fd1ff'); g.addColorStop(0.5, '#e8fbff'); g.addColorStop(1, '#9e7bff');
    c.beginPath(); c.moveTo(19, 0); c.lineTo(2, 9); c.lineTo(-11, 0); c.lineTo(2, -9); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(-11, 0); c.lineTo(19, 0); c.moveTo(2, -9); c.lineTo(6, 0); c.lineTo(2, 9); c.stroke();
  } else if (id === 'plasma') {
    const p = 1 + 0.12 * Math.sin(now * 0.008);
    const g = c.createRadialGradient(0, 0, 1, 0, 0, 16 * p); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ff4fd8'); g.addColorStop(1, 'rgba(0,229,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 16 * p, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) {
      const t = now * 0.004 + (i * TAU) / 3;
      c.save(); c.rotate((i * Math.PI) / 3);
      c.strokeStyle = 'rgba(0,229,255,0.45)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 15, 6, 0, 0, TAU); c.stroke();
      c.fillStyle = '#00e5ff'; c.beginPath(); c.arc(Math.cos(t) * 15, Math.sin(t) * 6, 2, 0, TAU); c.fill();
      c.restore();
    }
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(dx * 8, dy * 8); c.lineTo(dx * 16, dy * 16); c.stroke();
  } else if (id === 'crown') {
    c.save(); c.rotate(now * 0.001);
    for (let i = 0; i < 8; i++) { const t = (i * TAU) / 8; c.strokeStyle = rgba('#ffd54a', 0.35); c.lineWidth = 1.5; c.beginPath(); c.moveTo(Math.cos(t) * 14, Math.sin(t) * 14); c.lineTo(Math.cos(t) * 20, Math.sin(t) * 20); c.stroke(); }
    starPath(c, 0, 0, 14, 7, 8, 0);
    const g = c.createRadialGradient(-3, -3, 1, 0, 0, 14); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.6, '#ffd54a'); g.addColorStop(1, '#b8860b');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#fff1b0'; c.lineWidth = 1; c.stroke();
    c.restore();
    c.fillStyle = '#ff2d55'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(dx * 9, dy * 9); c.lineTo(dx * 19, dy * 19); c.stroke();
  } else {
    c.lineWidth = 2; c.strokeStyle = rgba(zone.line, 0.55); c.beginPath(); c.arc(0, 0, 15, 0, TAU); c.stroke();
    c.fillStyle = zone.fg; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill();
    if (aiming) {
      const px = -dy, py = dx, tx = dx * 26, ty = dy * 26;
      c.fillStyle = zone.line; c.beginPath();
      c.moveTo(tx + dx * 7, ty + dy * 7); c.lineTo(tx + px * 5, ty + py * 5); c.lineTo(tx - px * 5, ty - py * 5); c.closePath(); c.fill();
    }
  }
  c.restore();
}
