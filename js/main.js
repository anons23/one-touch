import { ARENA, DOT_R, simulate, collectedDots } from './engine.js';
import { getLevel, LEVEL_COUNT, THEMES } from './levels.js';
import { Ads } from './ads.js';

const $ = (id) => document.getElementById(id);
const KEY = 'onetouch.v1';
let save = { stars: [], sound: true, done: 0 };
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

let actx = null;
function tone(freq, dur, type, vol) {
  if (!save.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.value = vol || 0.08;
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  } catch (e) {}
}
function buzz(ms) { try { if (save.sound && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

const cv = $('cv'), ctx = cv.getContext('2d');
let scale = 1, dpr = 1;
function resize() {
  const st = $('stage');
  const w = st.clientWidth, h = st.clientHeight;
  if (!w || !h) return;
  scale = Math.min(w / ARENA.w, h / ARENA.h);
  dpr = window.devicePixelRatio || 1;
  cv.style.width = ARENA.w * scale + 'px';
  cv.style.height = ARENA.h * scale + 'px';
  cv.width = Math.round(ARENA.w * scale * dpr);
  cv.height = Math.round(ARENA.h * scale * dpr);
}
window.addEventListener('resize', () => { resize(); draw(); });

let level = null, theme = THEMES[0];
let angle = 90, mode = 'aim', flight = null, idx = 0, hit = [], attempts = 0, hintPath = null, hintUsed = false;
let finished = 0, lastB = 0;

function applyTheme(t) {
  theme = t;
  const r = document.documentElement.style;
  r.setProperty('--bg', t.bg); r.setProperty('--fg', t.fg); r.setProperty('--soft', t.soft);
  r.setProperty('--accent', t.line); r.setProperty('--dot', t.dot);
  document.querySelector('meta[name=theme-color]').setAttribute('content', t.bg);
}

function setStatus(t) { $('hud-status').textContent = t; }
function updateMeta() { $('hud-meta').textContent = 'Попытка ' + (attempts + 1); }

function startLevel(i) {
  level = getLevel(i);
  applyTheme(THEMES[level.theme]);
  angle = 90; mode = 'aim'; flight = null; idx = 0; attempts = 0; hintPath = null; hintUsed = false;
  hit = level.dots.map(() => false);
  $('hud-level').textContent = 'Уровень ' + (i + 1);
  $('win').classList.add('hidden');
  updateMeta();
  setStatus('Проведи пальцем, чтобы выбрать направление');
  show('screen-game');
  resize(); draw();
}

function drawRoundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function trace(pts, upto) {
  ctx.beginPath();
  for (let i = 0; i <= upto && i < pts.length; i++) { if (i) ctx.lineTo(pts[i].x, pts[i].y); else ctx.moveTo(pts[i].x, pts[i].y); }
}

function draw() {
  if (!level) return;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  ctx.fillStyle = theme.soft; drawRoundRect(5, 5, ARENA.w - 10, ARENA.h - 10, 14); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = theme.wall; drawRoundRect(7, 7, ARENA.w - 14, ARENA.h - 14, 12); ctx.stroke();
  ctx.fillStyle = theme.obstacle;
  level.obstacles.forEach((o) => { drawRoundRect(o.x, o.y, o.w, o.h, 5); ctx.fill(); });
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (hintPath) {
    ctx.setLineDash([6, 8]); ctx.lineWidth = 2.5; ctx.globalAlpha = 0.55; ctx.strokeStyle = theme.dot;
    trace(hintPath, hintPath.length); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (mode === 'fly' || mode === 'done') {
    ctx.lineWidth = 3.5; ctx.strokeStyle = theme.line; trace(flight, idx); ctx.stroke();
  } else {
    const g = simulate(level, angle, 0, 3000);
    ctx.setLineDash([3, 7]); ctx.lineWidth = 3; ctx.strokeStyle = theme.line; ctx.globalAlpha = 0.9;
    trace(g, g.length); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  level.dots.forEach((d, i) => {
    ctx.beginPath(); ctx.arc(d.x, d.y, DOT_R, 0, 6.2832); ctx.fillStyle = theme.dot; ctx.globalAlpha = hit[i] ? 0.18 : 0.28; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(d.x, d.y, hit[i] ? 6 : 8.5, 0, 6.2832); ctx.fillStyle = theme.dot; ctx.fill();
    if (hit[i]) { ctx.lineWidth = 2.5; ctx.strokeStyle = theme.bg; ctx.beginPath(); ctx.moveTo(d.x - 3, d.y); ctx.lineTo(d.x - 0.5, d.y + 3); ctx.lineTo(d.x + 3.5, d.y - 3); ctx.stroke(); }
  });
  ctx.beginPath(); ctx.arc(level.start.x, level.start.y, 9, 0, 6.2832); ctx.fillStyle = theme.fg; ctx.fill();
  if ((mode === 'fly' || mode === 'done') && flight) {
    const p = flight[Math.min(idx, flight.length - 1)];
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 6.2832); ctx.fillStyle = theme.line; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = theme.bg; ctx.stroke();
  }
}

function toLogical(e) {
  const r = cv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * ARENA.w, y: ((e.clientY - r.top) / r.height) * ARENA.h };
}
function aimFrom(e) {
  const p = toLogical(e);
  const dx = p.x - level.start.x, dy = level.start.y - p.y;
  if (Math.hypot(dx, dy) < 12) return;
  angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  draw();
}
let dragging = false;
cv.addEventListener('pointerdown', (e) => { if (mode !== 'aim') return; dragging = true; cv.setPointerCapture(e.pointerId); aimFrom(e); });
cv.addEventListener('pointermove', (e) => { if (dragging && mode === 'aim') aimFrom(e); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

function nudge(d) { if (mode !== 'aim') return; angle += d; draw(); }
$('btn-minus').onclick = () => nudge(0.3);
$('btn-plus').onclick = () => nudge(-0.3);

function fire() {
  if (mode !== 'aim') return;
  mode = 'fly'; hintPath = null;
  flight = simulate(level, angle, level.maxBounces, 3000);
  idx = 0; lastB = 0; hit = level.dots.map(() => false);
  setStatus('Летит…');
  tone(300, 0.1, 'triangle');
  requestAnimationFrame(tick);
}
$('btn-fire').onclick = fire;

function tick() {
  if (mode !== 'fly') return;
  idx = Math.min(idx + 9, flight.length - 1);
  const p = flight[idx];
  level.dots.forEach((d, i) => {
    if (!hit[i] && Math.hypot(p.x - d.x, p.y - d.y) <= DOT_R) { hit[i] = true; tone(520 + 90 * hit.filter(Boolean).length, 0.18, 'sine', 0.1); buzz(12); }
  });
  if (p.b !== lastB) { lastB = p.b; tone(180, 0.05, 'square', 0.04); }
  draw();
  if (idx >= flight.length - 1) { finish(); return; }
  requestAnimationFrame(tick);
}

function finish() {
  mode = 'done';
  const got = collectedDots(level, flight);
  hit = got;
  draw();
  const n = got.filter(Boolean).length;
  attempts++;
  if (n === level.dots.length) { win(); return; }
  tone(130, 0.35, 'sawtooth', 0.06);
  setStatus('Собрано ' + n + ' из ' + level.dots.length + '. Попробуй ещё');
  setTimeout(() => {
    if (mode !== 'done') return;
    mode = 'aim'; flight = null; lastB = 0;
    hit = level.dots.map(() => false);
    updateMeta(); draw();
  }, 1100);
}

function win() {
  const stars = hintUsed ? Math.min(2, attempts <= 2 ? 2 : 1) : attempts <= 1 ? 3 : attempts <= 3 ? 2 : 1;
  const i = level.index;
  save.stars[i] = Math.max(save.stars[i] || 0, stars);
  persist();
  finished++;
  [523, 659, 784].forEach((f, k) => setTimeout(() => tone(f, 0.25, 'sine', 0.1), k * 130));
  $('win-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('win-info').textContent = 'Попыток: ' + attempts;
  $('win-next').textContent = i + 1 < LEVEL_COUNT ? 'Дальше' : 'К списку уровней';
  setStatus('Все точки собраны');
  $('win').classList.remove('hidden');
}

$('win-next').onclick = async () => {
  const i = level.index;
  if (finished % 3 === 0) await Ads.showInterstitial();
  if (i + 1 < LEVEL_COUNT) startLevel(i + 1); else openLevels();
};
$('win-retry').onclick = () => startLevel(level.index);

$('btn-hint').onclick = async () => {
  if (mode !== 'aim') return;
  const ok = await Ads.showRewarded();
  if (!ok) { setStatus('Награда не получена'); return; }
  hintUsed = true;
  hintPath = simulate(level, level.secret, level.maxBounces, 3000);
  setStatus('Пунктир показывает путь. Нажми Пуск');
  angle = level.secret;
  draw();
};

function openLevels() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  for (let i = 0; i < LEVEL_COUNT; i++) {
    const open = i === 0 || save.stars[i - 1] > 0;
    const b = document.createElement('button');
    b.className = 'cell' + (open ? '' : ' locked');
    const s = save.stars[i] || 0;
    b.innerHTML = (i + 1) + '<small>' + (open ? '★'.repeat(s) + '☆'.repeat(3 - s) : '—') + '</small>';
    if (open) b.onclick = () => startLevel(i);
    grid.appendChild(b);
  }
  applyTheme(THEMES[1]);
  show('screen-levels');
}

function firstOpen() {
  for (let i = 0; i < LEVEL_COUNT; i++) if (!(save.stars[i] > 0)) return i;
  return LEVEL_COUNT - 1;
}

$('btn-play').onclick = () => startLevel(firstOpen());
$('btn-levels').onclick = openLevels;
$('levels-back').onclick = () => { applyTheme(THEMES[1]); show('screen-menu'); };
$('game-back').onclick = () => { mode = 'aim'; flight = null; applyTheme(THEMES[1]); show('screen-menu'); };
function soundLabel() { $('btn-sound').textContent = 'Звук: ' + (save.sound ? 'вкл' : 'выкл'); }
$('btn-sound').onclick = () => { save.sound = !save.sound; persist(); soundLabel(); tone(440, 0.1); };
soundLabel();
applyTheme(THEMES[1]);

window.__ot = { startLevel, fire, get state() { return { mode, angle, hit, attempts, level }; }, setAngle(a) { angle = a; draw(); } };
