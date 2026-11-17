import { ARENA, DOT_R, PORTAL_R, simulate } from './engine.js';
import { getLevel, getDaily, dayNumber, todayKey, LEVEL_COUNT, ZONES, PORTAL_FROM, GLASS_FROM, PREVIEW_OFF } from './levels.js';
import { Platform } from './platform.js';
import { Sound } from './audio.js';
import { Analytics } from './analytics.js';
import { t, setLang, applyStatic } from './i18n.js';

const W = ARENA.w, H = ARENA.h;
const $ = (id) => document.getElementById(id);
// TODO перед релизом: поставить TEST_UNLOCK_ALL = false
const TEST_UNLOCK_ALL = true;
const UNLOCK_ALL = TEST_UNLOCK_ALL || /[?&]unlock=1/.test(location.search);
const SPEED = 0.6;

const makeDefaults = () => ({ stars: [], sound: true, music: true, freeHints: 0, daily: { last: '', streak: 0, best: 0 } });
let save = makeDefaults();
const persist = () => Platform.writeSave(save);

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(c, a) { return 'rgba(' + hex(c).join(',') + ',' + a + ')'; }
function buzz(ms) { try { if (save.sound && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
function setStatus(s) { $('hud-status').textContent = s; }

let zone = ZONES[0], zoneIdx = 0, bgCache = null;
function applyZone(i) {
  zoneIdx = i; zone = ZONES[i]; bgCache = null;
  const r = document.documentElement.style;
  r.setProperty('--bg1', zone.bg1); r.setProperty('--bg2', zone.bg2); r.setProperty('--fg', zone.fg); r.setProperty('--soft', zone.soft);
  r.setProperty('--accent', zone.line); r.setProperty('--wall', zone.wall); r.setProperty('--dot', zone.dot); r.setProperty('--portal', zone.portal);
  document.querySelector('meta[name=theme-color]').setAttribute('content', zone.bg1);
  Sound.setZone(i);
}

let winTimer = 0;
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (id !== 'screen-game') { Platform.gameplay(false); clearTimeout(winTimer); $('win').classList.add('hidden'); }
  if (id === 'screen-menu') sizeMenu();
}

/* ------------------------------------------------------------------ canvas */
const cv = $('cv'), ctx = cv.getContext('2d');
let scale = 1, dpr = 1;
function resize() {
  const st = $('stage'), w = st.clientWidth, h = st.clientHeight;
  if (!w || !h) return;
  scale = Math.min(w / W, h / H); dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
  cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
  bgCache = null;
}
window.addEventListener('resize', () => { resize(); sizeMenu(); });

function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function buildBg() {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const x = c.getContext('2d'); x.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, zone.bg2); g.addColorStop(1, zone.bg1);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = zone.grid; x.lineWidth = 1;
  for (let i = 24; i < W; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let j = 24; j < H; j += 24) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
  if (zone.stars) {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 90; k++) { x.globalAlpha = 0.2 + rnd() * 0.6; x.fillStyle = '#fff'; x.beginPath(); x.arc(rnd() * W, rnd() * H, 0.4 + rnd() * 1.1, 0, 6.2832); x.fill(); }
    x.globalAlpha = 1;
  }
  g = x.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return c;
}

/* ------------------------------------------------------------------ state */
let level = null, angle = 90, mode = 'aim', flight = null, fidx = 0, hit = [], broken = [];
let attempts = 0, hintPath = null, hintUsed = false, lastPath = null, t0 = 0, finished = 0;
let particles = [], shakeUntil = 0, winAt = 0, lastTickAngle = 90;

function levelLabel() { return level.daily ? t('daily') : t('levelN', { n: level.index + 1 }); }
function hintLabel() { $('btn-hint').textContent = save.freeHints > 0 ? t('hintFree', { n: save.freeHints }) : t('hint'); }
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); }
function maxReached() { let m = 0; save.stars.forEach((s, i) => { if (s > 0) m = i + 1; }); return m; }

function setup() {
  applyZone(level.theme);
  angle = 90; lastTickAngle = 90; mode = 'aim'; flight = null; fidx = 0; attempts = 0;
  hit = level.dots.map(() => false); broken = level.obstacles.map(() => false);
  hintPath = null; hintUsed = false; lastPath = null; particles = []; winAt = 0; t0 = Date.now();
  clearTimeout(winTimer); $('win').classList.add('hidden');
  $('hud-level').textContent = levelLabel();
  $('hud-meta').textContent = t('bounces', { n: level.maxBounces });
  hintLabel();
  show('screen-game'); resize();
  Platform.gameplay(true);
}

function startLevel(i) {
  level = getLevel(i); setup();
  if (i === PORTAL_FROM) setStatus(t('newPortal'));
  else if (i === GLASS_FROM) setStatus(t('newGlass'));
  else if (i === PREVIEW_OFF) setStatus(t('previewOff'));
  else if (i % 15 === 0 && i > 0) setStatus(t('newZone', { name: t('zone.' + level.theme) }));
  else setStatus(t('aim'));
  Analytics.event('level_start', { level: i + 1 });
}

function startDaily() {
  level = getDaily(dayNumber()); setup();
  setStatus(t('aim'));
  Analytics.event('daily_start', { day: level.dayIdx });
}

/* ------------------------------------------------------------------ effects */
function burst(x, y, color, n, speed, life) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.2832, v = speed * (0.3 + Math.random());
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, c: color, r: 1 + Math.random() * 1.8 });
  }
}
function shards(o) {
  for (let k = 0; k < 18; k++) {
    const x = o.x + Math.random() * o.w, y = o.y + Math.random() * o.h, a = Math.random() * 6.2832, v = 0.05 + Math.random() * 0.18;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 700, max: 700, c: zone.glass, r: 1.5 + Math.random() * 2.5, shard: true, rot: Math.random() * 6 });
  }
}

/* ------------------------------------------------------------------ drawing */
function trace(pts, upto, c) {
  c.beginPath();
  let started = false;
  for (let i = 0; i <= upto && i < pts.length; i++) {
    const p = pts[i];
    if (!started || p.jump) { c.moveTo(p.x, p.y); started = true; } else c.lineTo(p.x, p.y);
  }
}

function drawArena() {
  [[12, 0.08], [6, 0.2], [2, 1]].forEach(([w, a]) => { ctx.lineWidth = w; ctx.strokeStyle = rgba(zone.wall, a); rr(ctx, 7, 7, W - 14, H - 14, 12); ctx.stroke(); });
}

function drawObstacles() {
  level.obstacles.forEach((o, j) => {
    if (broken[j]) return;
    if (o.glass) {
      ctx.fillStyle = rgba(zone.glass, 0.13); rr(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill();
      ctx.save(); rr(ctx, o.x, o.y, o.w, o.h, 3); ctx.clip();
      ctx.strokeStyle = rgba(zone.glass, 0.35); ctx.lineWidth = 1;
      for (let d = -o.h; d < o.w; d += 9) { ctx.beginPath(); ctx.moveTo(o.x + d, o.y + o.h); ctx.lineTo(o.x + d + o.h, o.y); ctx.stroke(); }
      ctx.restore();
      ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(zone.glass, 0.9); rr(ctx, o.x, o.y, o.w, o.h, 3); ctx.stroke();
    } else {
      ctx.fillStyle = zone.block; rr(ctx, o.x, o.y, o.w, o.h, 5); ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = rgba(zone.edge, 0.15); ctx.stroke();
      ctx.lineWidth = 1.8; ctx.strokeStyle = zone.edge; ctx.stroke();
    }
  });
}

function drawPortals(now) {
  (level.portals || []).forEach((p) => {
    [p.a, p.b].forEach((q, side) => {
      const g = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, PORTAL_R * 2);
      g.addColorStop(0, rgba(zone.portal, 0.5)); g.addColorStop(1, rgba(zone.portal, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, PORTAL_R * 2, 0, 6.2832); ctx.fill();
      const rot = now * 0.004 * (side ? -1 : 1);
      ctx.lineWidth = 2.2; ctx.strokeStyle = zone.portal;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(q.x, q.y, PORTAL_R, rot + k * 2.094, rot + k * 2.094 + 1.3); ctx.stroke(); }
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(zone.portal, 0.6);
      ctx.beginPath(); ctx.arc(q.x, q.y, PORTAL_R * 0.55, -rot, -rot + 4); ctx.stroke();
    });
  });
}

function drawDots(now) {
  level.dots.forEach((d, i) => {
    if (hit[i]) return;
    const r = DOT_R * (0.72 + 0.08 * Math.sin(now * 0.005 + i));
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(zone.dot, 0.45); ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = rgba(zone.dot, 0.22); ctx.beginPath(); ctx.arc(d.x, d.y, 11, 0, 6.2832); ctx.fill();
    ctx.fillStyle = zone.dot; ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, 6.2832); ctx.fill();
  });
}

function drawStart() {
  const s = level.start;
  ctx.lineWidth = 2; ctx.strokeStyle = rgba(zone.line, 0.55); ctx.beginPath(); ctx.arc(s.x, s.y, 15, 0, 6.2832); ctx.stroke();
  ctx.fillStyle = zone.fg; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 6.2832); ctx.fill();
  if (mode === 'aim') {
    const a = (angle * Math.PI) / 180, dx = Math.cos(a), dy = -Math.sin(a), px = -dy, py = dx;
    const tx = s.x + dx * 26, ty = s.y + dy * 26;
    ctx.fillStyle = zone.line; ctx.beginPath();
    ctx.moveTo(tx + dx * 7, ty + dy * 7); ctx.lineTo(tx + px * 5, ty + py * 5); ctx.lineTo(tx - px * 5, ty - py * 5); ctx.closePath(); ctx.fill();
  }
}

function drawAim() {
  const pts = simulate(level, angle, level.daily ? 0 : level.preview, 2600);
  const n = pts.length;
  ctx.fillStyle = zone.line;
  for (let i = 4; i < n; i += 5) {
    ctx.globalAlpha = 0.95 * (1 - i / (n + 40));
    ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 1.7, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTrail() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const upto = Math.floor(fidx);
  [[11, 0.12], [5, 0.3], [2.2, 1]].forEach(([w, a]) => { ctx.lineWidth = w; ctx.strokeStyle = rgba(zone.line, a); trace(flight, upto, ctx); ctx.stroke(); });
  ctx.restore();
  const p = flight[upto];
  const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 18);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, rgba(zone.line, 0.8)); g.addColorStop(1, rgba(zone.line, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, 6.2832); ctx.fill();
}

function draw(now) {
  if (!level) return;
  now = now || performance.now();
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  if (now < shakeUntil) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
  if (!bgCache) bgCache = buildBg();
  ctx.drawImage(bgCache, 0, 0, W, H);
  drawArena();
  if (lastPath && mode === 'aim') { ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(zone.line, 0.13); trace(lastPath, lastPath.length, ctx); ctx.stroke(); }
  if (hintPath && mode === 'aim') { ctx.setLineDash([6, 7]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(zone.dot, 0.75); trace(hintPath, hintPath.length, ctx); ctx.stroke(); ctx.setLineDash([]); }
  drawObstacles();
  drawPortals(now);
  drawDots(now);
  if (mode === 'aim') drawAim();
  if (flight && mode !== 'aim') drawTrail();
  drawStart();
  if (particles.length) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    particles.forEach((q) => {
      ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.c;
      if (q.shard) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.r, -q.r / 3, q.r * 2, q.r / 1.5); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.2832); ctx.fill(); }
    });
    ctx.restore();
  }
  if (winAt) {
    const k = Math.min(1, (now - winAt) / 700);
    ctx.fillStyle = rgba(zone.line, 0.25 * (1 - k)); ctx.fillRect(0, 0, W, H);
  }
}

/* ------------------------------------------------------------------ flight */
function step(dt) {
  particles = particles.filter((q) => (q.life -= dt) > 0);
  particles.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.985; q.vy *= 0.985; if (q.shard) { q.vy += 0.0004 * dt; q.rot += 0.01 * dt; } });
  if (mode !== 'fly') return;
  const prev = Math.floor(fidx);
  fidx = Math.min(flight.length - 1, fidx + dt * SPEED * (1 + fidx / 2500));
  const cur = Math.floor(fidx);
  for (let k = prev + 1; k <= cur; k++) {
    const p = flight[k];
    if (p.e === 'portal') {
      const pr = level.portals[p.i];
      [pr.a, pr.b].forEach((q) => burst(q.x, q.y, zone.portal, 12, 0.12, 450));
      Sound.portal();
    } else if (p.e === 'glass') {
      broken[p.i] = true; shards(level.obstacles[p.i]); Sound.glass(); shakeUntil = performance.now() + 140; buzz(15);
    } else if (p.e) {
      burst(p.x, p.y, zone.line, 7, 0.1, 320); Sound.bounce(p.b, p.e);
    }
    level.dots.forEach((d, i) => {
      if (!hit[i] && Math.hypot(p.x - d.x, p.y - d.y) <= DOT_R) {
        hit[i] = true; burst(d.x, d.y, zone.dot, 18, 0.16, 600);
        Sound.dot(hit.filter(Boolean).length - 1); buzz(10);
      }
    });
    if (hit.every(Boolean)) { fidx = k; win(); return; }
  }
  if (fidx >= flight.length - 1) miss();
}

function fire() {
  if (mode !== 'aim' || !level) return;
  mode = 'fly'; hintPath = null;
  flight = simulate(level, angle, level.maxBounces);
  fidx = 0; hit = level.dots.map(() => false); broken = level.obstacles.map(() => false);
  burst(level.start.x, level.start.y, zone.line, 10, 0.12, 300);
  Sound.launch();
  setStatus(t('flying'));
}

function miss() {
  mode = 'done'; attempts++;
  const n = hit.filter(Boolean).length;
  Sound.fail();
  setStatus(t('missed', { n, m: level.dots.length }));
  lastPath = flight;
  setTimeout(() => {
    if (mode !== 'done') return;
    mode = 'aim'; flight = null; hit = level.dots.map(() => false); broken = level.obstacles.map(() => false);
    setStatus(t('aim'));
  }, 900);
}

function win() {
  mode = 'won'; attempts++; winAt = performance.now();
  burst(W / 2, H / 2, zone.line, 40, 0.3, 900); burst(W / 2, H / 2, zone.dot, 30, 0.25, 900);
  Sound.win(); buzz([20, 40, 30]);
  Platform.gameplay(false);
  const secs = Math.round((Date.now() - t0) / 1000);
  if (level.daily) winDaily(secs); else winLevel(secs);
  persist(); finished++;
  Analytics.progress(maxReached(), save.daily.streak);
  setStatus(t('allDone'));
  const lvl = level;
  winTimer = setTimeout(async () => {
    if (finished % 3 === 0 && await withAd(() => Platform.showInterstitial())) Analytics.event('ad_interstitial');
    if (level === lvl && mode === 'won') $('win').classList.remove('hidden');
  }, 1000);
}

function winLevel(secs) {
  const i = level.index;
  const stars = hintUsed ? 1 : attempts <= 1 ? 3 : attempts <= 3 ? 2 : 1;
  save.stars[i] = Math.max(save.stars[i] || 0, stars);
  $('win-title').textContent = t('winTitle');
  $('win-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('win-info').textContent = t('winInfo', { n: attempts });
  $('win-next').textContent = i + 1 < LEVEL_COUNT ? t('next') : t('toLevels');
  Analytics.event('level_win', { level: i + 1, tries: attempts, sec: secs, hint: hintUsed, stars });
}

function winDaily(secs) {
  const d = save.daily, today = todayKey(), first = d.last !== today;
  if (first) {
    d.streak = d.last === yesterdayKey() ? d.streak + 1 : 1;
    d.best = Math.max(d.best || 0, d.streak); d.last = today;
    save.freeHints = Math.min(5, (save.freeHints || 0) + 1);
  }
  $('win-title').textContent = t('dailyDone');
  $('win-stars').textContent = t('streak', { n: d.streak });
  $('win-info').textContent = (first ? t('dailyReward') : t('dailyAgain')) + ' · ' + t('winInfo', { n: attempts });
  $('win-next').textContent = t('toMenu');
  if (first) Analytics.event('daily_win', { day: level.dayIdx, streak: d.streak, tries: attempts, sec: secs, hint: hintUsed });
}

async function withAd(fn) {
  const wasPlaying = $('screen-game').classList.contains('active') && mode === 'aim';
  Platform.gameplay(false); Sound.pauseAll();
  let r = false;
  try { r = await fn(); } catch (e) { r = false; }
  Sound.resumeAll();
  if (wasPlaying && mode === 'aim') Platform.gameplay(true);
  return r;
}

/* ------------------------------------------------------------------ input */
function aimFrom(e) {
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  const dx = x - level.start.x, dy = level.start.y - y;
  if (Math.hypot(dx, dy) < 12) return;
  setAngle((Math.atan2(dy, dx) * 180) / Math.PI);
}
function setAngle(a) {
  angle = a;
  if (Math.abs(angle - lastTickAngle) >= 3) { lastTickAngle = angle; Sound.tick(); }
}
let dragging = false;
cv.addEventListener('pointerdown', (e) => { if (mode !== 'aim') return; dragging = true; cv.setPointerCapture(e.pointerId); aimFrom(e); });
cv.addEventListener('pointermove', (e) => { if (dragging && mode === 'aim') aimFrom(e); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

function holdRepeat(btn, fn) {
  let timer = 0, rep = 0;
  const stop = () => { clearTimeout(timer); clearInterval(rep); };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); stop(); timer = setTimeout(() => { rep = setInterval(fn, 60); }, 350); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
}
const nudge = (d) => { if (mode === 'aim') { angle += d; Sound.tick(); } };
holdRepeat($('btn-minus'), () => nudge(0.3));
holdRepeat($('btn-plus'), () => nudge(-0.3));
$('btn-fire').onclick = fire;

$('btn-hint').onclick = async () => {
  if (mode !== 'aim' || hintPath) return;
  const free = save.freeHints > 0;
  if (free) { save.freeHints--; persist(); hintLabel(); }
  else {
    const ok = await withAd(() => Platform.showRewarded());
    if (!ok) { setStatus(t('noReward')); return; }
    Analytics.event('ad_rewarded');
  }
  Analytics.event('hint', { level: level.daily ? 'daily' : level.index + 1, free });
  hintUsed = true; angle = level.secret;
  hintPath = simulate(level, level.secret, level.maxBounces);
  Sound.hint(); setStatus(t('hintOn'));
};

document.addEventListener('keydown', (e) => {
  if (!$('screen-game').classList.contains('active') || !level) return;
  const k = e.key;
  if (k === 'ArrowLeft') nudge(e.shiftKey ? 2 : 0.3);
  else if (k === 'ArrowRight') nudge(e.shiftKey ? -2 : -0.3);
  else if (k === 'ArrowUp') nudge(0.05);
  else if (k === 'ArrowDown') nudge(-0.05);
  else if (k === ' ' || k === 'Enter') { if (!$('win').classList.contains('hidden')) $('win-next').click(); else fire(); }
  else return;
  e.preventDefault();
});

$('win-next').onclick = () => {
  if (level.daily) { goMenu(); return; }
  const i = level.index;
  if (i + 1 < LEVEL_COUNT) startLevel(i + 1); else openLevels();
};
$('win-retry').onclick = () => (level.daily ? startDaily() : startLevel(level.index));

/* ------------------------------------------------------------------ menu */
const mc = $('menu-bg'), mx = mc.getContext('2d');
let mw = 0, mh = 0;
const demo = { x: 60, y: 120, vx: 0.21, vy: 0.17, trail: [], dots: [] };
function sizeMenu() {
  if (!$('screen-menu').classList.contains('active')) return;
  const d = Math.min(window.devicePixelRatio || 1, 2);
  mw = window.innerWidth; mh = window.innerHeight; mc.width = Math.round(mw * d); mc.height = Math.round(mh * d);
  mx.setTransform(d, 0, 0, d, 0, 0);
  demo.dots = [0, 1, 2, 3].map(() => ({ x: 30 + Math.random() * (mw - 60), y: 60 + Math.random() * (mh - 120) }));
  demo.trail = [];
}
let menuParticles = [];
function stepMenu(dt) {
  demo.x += demo.vx * dt; demo.y += demo.vy * dt;
  if (demo.x < 8 || demo.x > mw - 8) { demo.vx = -demo.vx; demo.x = Math.max(8, Math.min(mw - 8, demo.x)); }
  if (demo.y < 8 || demo.y > mh - 8) { demo.vy = -demo.vy; demo.y = Math.max(8, Math.min(mh - 8, demo.y)); }
  demo.trail.push({ x: demo.x, y: demo.y }); if (demo.trail.length > 90) demo.trail.shift();
  demo.dots.forEach((d) => {
    if (Math.hypot(d.x - demo.x, d.y - demo.y) < 16) {
      for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28, v = 0.05 + Math.random() * 0.12; menuParticles.push({ x: d.x, y: d.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 600 }); }
      d.x = 30 + Math.random() * (mw - 60); d.y = 60 + Math.random() * (mh - 120);
    }
  });
  menuParticles = menuParticles.filter((q) => (q.life -= dt) > 0);
  menuParticles.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; });
}
function drawMenu(now) {
  mx.clearRect(0, 0, mw, mh);
  mx.strokeStyle = zone.grid; mx.lineWidth = 1;
  for (let i = 28; i < mw; i += 28) { mx.beginPath(); mx.moveTo(i, 0); mx.lineTo(i, mh); mx.stroke(); }
  for (let j = 28; j < mh; j += 28) { mx.beginPath(); mx.moveTo(0, j); mx.lineTo(mw, j); mx.stroke(); }
  mx.save(); mx.globalCompositeOperation = 'lighter'; mx.lineCap = 'round';
  for (let i = 1; i < demo.trail.length; i++) {
    const a = i / demo.trail.length;
    mx.strokeStyle = rgba(zone.line, 0.5 * a); mx.lineWidth = 1 + 3 * a;
    mx.beginPath(); mx.moveTo(demo.trail[i - 1].x, demo.trail[i - 1].y); mx.lineTo(demo.trail[i].x, demo.trail[i].y); mx.stroke();
  }
  demo.dots.forEach((d, i) => {
    mx.fillStyle = rgba(zone.dot, 0.25 + 0.15 * Math.sin(now * 0.004 + i)); mx.beginPath(); mx.arc(d.x, d.y, 10, 0, 6.28); mx.fill();
    mx.fillStyle = zone.dot; mx.beginPath(); mx.arc(d.x, d.y, 4, 0, 6.28); mx.fill();
  });
  menuParticles.forEach((q) => { mx.globalAlpha = q.life / 600; mx.fillStyle = zone.dot; mx.beginPath(); mx.arc(q.x, q.y, 1.6, 0, 6.28); mx.fill(); });
  mx.globalAlpha = 1;
  const g = mx.createRadialGradient(demo.x, demo.y, 1, demo.x, demo.y, 16);
  g.addColorStop(0, '#fff'); g.addColorStop(0.35, rgba(zone.line, 0.8)); g.addColorStop(1, rgba(zone.line, 0));
  mx.fillStyle = g; mx.beginPath(); mx.arc(demo.x, demo.y, 16, 0, 6.28); mx.fill();
  mx.restore();
}

function firstOpen() { for (let i = 0; i < LEVEL_COUNT; i++) if (!(save.stars[i] > 0)) return i; return LEVEL_COUNT - 1; }
function renderMenu() {
  const next = firstOpen();
  applyZone(getLevel(next).theme);
  $('play-level').textContent = t('levelN', { n: next + 1 });
  $('chip-stars').textContent = t('stars', { n: save.stars.reduce((a, b) => a + (b || 0), 0) });
  $('chip-prog').textContent = t('progress', { n: save.stars.filter((s) => s > 0).length, m: LEVEL_COUNT });
  const d = save.daily, done = d.last === todayKey(), alive = d.last === yesterdayKey() && d.streak > 0;
  $('daily-sub').textContent = done ? t('dailyDoneSub', { n: d.streak }) : alive ? t('dailyKeep', { n: d.streak }) : t('dailyNew');
  $('btn-daily').classList.toggle('fresh', !done);
  $('btn-sound').classList.toggle('off', !save.sound);
  $('btn-music').classList.toggle('off', !save.music);
}
function goMenu() { renderMenu(); show('screen-menu'); }

function openLevels() {
  const box = $('level-grid');
  box.innerHTML = '';
  for (let z = 0; z * 15 < LEVEL_COUNT; z++) {
    const head = document.createElement('div'); head.className = 'zone-head';
    head.textContent = t('zone.' + z) + ' · ' + (z * 15 + 1) + '–' + Math.min(LEVEL_COUNT, z * 15 + 15);
    head.style.color = ZONES[z].line;
    const grid = document.createElement('div'); grid.className = 'zone-grid';
    grid.style.setProperty('--zc', ZONES[z].line);
    for (let i = z * 15; i < Math.min(LEVEL_COUNT, z * 15 + 15); i++) {
      const open = UNLOCK_ALL || i === 0 || save.stars[i - 1] > 0;
      const b = document.createElement('button');
      b.className = 'cell' + (open ? '' : ' locked');
      const s = save.stars[i] || 0;
      b.innerHTML = (i + 1) + '<small>' + (open ? '★'.repeat(s) + '☆'.repeat(3 - s) : '') + '</small>';
      if (open) b.onclick = () => startLevel(i);
      grid.appendChild(b);
    }
    box.appendChild(head); box.appendChild(grid);
  }
  show('screen-levels');
}

$('btn-play').onclick = () => startLevel(firstOpen());
$('btn-daily').onclick = startDaily;
$('btn-levels').onclick = openLevels;
$('levels-back').onclick = goMenu;
$('game-back').onclick = () => {
  if (level && (mode === 'aim' || mode === 'fly' || mode === 'done')) {
    Analytics.event(level.daily ? 'daily_quit' : 'level_quit', { level: level.daily ? 'daily' : level.index + 1, tries: attempts, sec: Math.round((Date.now() - t0) / 1000) });
  }
  mode = 'aim'; goMenu();
};
$('btn-sound').onclick = () => { save.sound = !save.sound; persist(); Sound.setSfx(save.sound); renderMenu(); };
$('btn-music').onclick = () => { save.music = !save.music; persist(); Sound.setMusic(save.music); renderMenu(); };

document.addEventListener('pointerdown', () => Sound.unlock(), true);
document.addEventListener('click', (e) => {
  const b = e.target.closest('.ctl, .round, .cell, .icon, .play-orb, .daily-card');
  if (b && !['btn-fire', 'btn-minus', 'btn-plus'].includes(b.id)) Sound.ui();
}, true);
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { Sound.pauseAll(); Platform.gameplay(false); return; }
  Sound.resumeAll();
  if ($('screen-game').classList.contains('active') && (mode === 'aim' || mode === 'fly')) Platform.gameplay(true);
});

/* ------------------------------------------------------------------ loop */
let last = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - last || 16); last = now;
  if (document.hidden) return;
  if ($('screen-game').classList.contains('active')) { step(dt); draw(now); }
  else if ($('screen-menu').classList.contains('active') && mw) { stepMenu(dt); drawMenu(now); }
}
requestAnimationFrame(loop);

async function boot() {
  const lang = await Platform.init();
  setLang(lang); applyStatic();
  save = await Platform.loadSave(makeDefaults());
  if (!save.daily || typeof save.daily !== 'object') save.daily = makeDefaults().daily;
  if (typeof save.freeHints !== 'number') save.freeHints = 0;
  Sound.setSfx(save.sound); Sound.setMusic(save.music);
  renderMenu(); sizeMenu();
  Analytics.init(Platform.name);
  if (/[?&]stats=1/.test(location.search)) {
    const el = document.createElement('pre'); el.className = 'stats';
    el.textContent = JSON.stringify(Analytics.localStats(), null, 1);
    document.body.appendChild(el);
  }
  Platform.ready();
}
boot();

window.__ot = {
  Sound, Platform, Analytics, startLevel, startDaily, fire,
  setAngle(a) { angle = a; },
  get state() { return { mode, angle, hit, attempts, level, fidx }; },
  get save() { return save; },
};
