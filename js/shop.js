import { SKINS, findSkin, drawCannon, drawTrail, drawHead, drawDot, dotColor } from './skins.js';

export const COINS_PER_AD = 40;
export const COIN_ADS_PER_DAY = 5;

// api: { $, t, save(), persist, withAd, Analytics, zone(), show, todayKey, onChange }
export function createShop(api) {
  const { $, t } = api;
  let tab = 'cannon', selected = {}, previewT = 0, burstPts = [];
  const pv = $('shop-preview'), px = pv.getContext('2d');
  const PW = 360, PH = 170;
  let pScale = 1;

  function sizePreview() {
    const w = pv.clientWidth || 340, d = Math.min(window.devicePixelRatio || 1, 2);
    pScale = w / PW; pv.height = Math.round(PH * pScale * d); pv.width = Math.round(w * d);
    pv.style.height = PH * pScale + 'px';
    px.setTransform(pScale * d, 0, 0, pScale * d, 0, 0);
  }

  // A fixed demo path inside the preview box.
  const path = (() => {
    const pts = []; let x = 52, y = 140, a = (-38 * Math.PI) / 180, dx = Math.cos(a) * 3, dy = Math.sin(a) * 3;
    for (let i = 0; i < 330; i++) {
      x += dx; y += dy;
      if (x < 12 || x > PW - 12) dx = -dx;
      if (y < 12 || y > PH - 12) dy = -dy;
      pts.push({ x, y });
    }
    return pts;
  })();
  const DOTS = [path[60], path[150], path[255]].map((p) => ({ x: p.x, y: p.y }));

  const cur = (cat) => selected[cat] || api.save().equip[cat];

  function frame(now, dt) {
    if (!pv.width) sizePreview();
    const z = api.zone();
    previewT = (previewT + dt) % 3400;
    const prog = Math.min(1, previewT / 2400), upto = Math.floor(prog * (path.length - 1));
    px.clearRect(0, 0, PW, PH);
    px.strokeStyle = z.grid; px.lineWidth = 1;
    for (let i = 20; i < PW; i += 20) { px.beginPath(); px.moveTo(i, 0); px.lineTo(i, PH); px.stroke(); }
    for (let j = 20; j < PH; j += 20) { px.beginPath(); px.moveTo(0, j); px.lineTo(PW, j); px.stroke(); }
    px.strokeStyle = z.wall; px.lineWidth = 2; px.strokeRect(5, 5, PW - 10, PH - 10);
    DOTS.forEach((d, i) => {
      const hitAt = path.findIndex((p) => Math.hypot(p.x - d.x, p.y - d.y) < 4);
      if (upto >= hitAt && previewT < 2400) {
        if (!burstPts[i]) { burstPts[i] = true; for (let k = 0; k < 12; k++) { const a = Math.random() * 6.28, v = 0.04 + Math.random() * 0.1; sparks.push({ x: d.x, y: d.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 500, c: dotColor(cur('dot'), z) }); } }
        return;
      }
      if (previewT >= 2400) burstPts[i] = false;
      drawDot(px, cur('dot'), d.x, d.y, z, now, i);
    });
    if (previewT < 2400 && upto > 0) {
      drawTrail(px, cur('ball'), path, upto, z, now);
      drawHead(px, cur('ball'), path[upto].x, path[upto].y, z, now);
    }
    sparks = sparks.filter((s) => (s.life -= dt) > 0);
    px.save(); px.globalCompositeOperation = 'lighter';
    sparks.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; px.globalAlpha = s.life / 500; px.fillStyle = s.c; px.beginPath(); px.arc(s.x, s.y, 1.6, 0, 6.28); px.fill(); });
    px.restore();
    drawCannon(px, cur('cannon'), 40, 150, 38, z, now, previewT > 2400 || previewT < 80);
  }
  let sparks = [];

  function thumb(canvas, cat, id) {
    const d = Math.min(window.devicePixelRatio || 1, 2), w = 96, h = 72;
    canvas.width = w * d; canvas.height = h * d;
    const c = canvas.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    const z = api.zone(), now = 1200;
    if (cat === 'cannon') drawCannon(c, id, 46, 40, 40, z, now, true, 1.45);
    else if (cat === 'dot') drawDot(c, id, 48, 36, z, now, 0, 1.7);
    else {
      const pts = [];
      for (let i = 0; i <= 40; i++) pts.push({ x: 10 + i * 1.7, y: 52 - Math.sin(i / 40 * Math.PI) * 30 });
      drawTrail(c, id, pts, 40, z, now); drawHead(c, id, pts[40].x, pts[40].y, z, now, 0.8);
    }
  }

  function state(cat, skin) {
    const s = api.save();
    if (s.equip[cat] === skin.id) return 'equipped';
    if (s.owned[cat].includes(skin.id)) return 'owned';
    return skin.ads ? 'ads' : 'price';
  }

  function render() {
    const s = api.save();
    $('shop-coins').textContent = s.coins;
    document.querySelectorAll('.shop-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const grid = $('shop-grid'); grid.innerHTML = '';
    SKINS[tab].forEach((skin) => {
      const st = state(tab, skin);
      const b = document.createElement('button');
      b.className = 'skin-card ' + st + (cur(tab) === skin.id ? ' selected' : '');
      const cv = document.createElement('canvas'); cv.className = 'skin-thumb';
      const name = document.createElement('span'); name.className = 'skin-name'; name.textContent = t('skin.' + skin.id);
      const tag = document.createElement('span'); tag.className = 'skin-tag';
      if (st === 'equipped') tag.textContent = t('equipped');
      else if (st === 'owned') tag.textContent = t('owned');
      else if (st === 'ads') tag.textContent = '▶ ' + (s.adProg[tab + ':' + skin.id] || 0) + '/' + skin.ads;
      else { tag.innerHTML = '<i class="coin"></i>' + skin.price; }
      b.append(cv, name, tag);
      if (skin.top) { const top = document.createElement('span'); top.className = 'skin-top'; top.textContent = t('top'); b.append(top); }
      b.onclick = () => { selected[tab] = skin.id; previewT = 0; burstPts = []; render(); };
      grid.append(b);
      thumb(cv, tab, skin.id);
    });
    const skin = findSkin(tab, cur(tab)), st = state(tab, skin), act = $('shop-action');
    act.classList.remove('dim');
    if (st === 'equipped') { act.textContent = t('equipped'); act.classList.add('dim'); }
    else if (st === 'owned') act.textContent = t('equip');
    else if (st === 'ads') act.textContent = t('watchAd', { n: s.adProg[tab + ':' + skin.id] || 0, m: skin.ads });
    else if (s.coins >= skin.price) act.innerHTML = t('buy') + ' <i class="coin"></i>' + skin.price;
    else { act.textContent = t('notEnough', { n: skin.price - s.coins }); act.classList.add('dim'); }
    const day = api.todayKey(), used = s.coinAds.day === day ? s.coinAds.n : 0, left = COIN_ADS_PER_DAY - used;
    const ca = $('shop-coins-ad');
    ca.innerHTML = left > 0 ? '▶ ' + t('coinsAd', { n: COINS_PER_AD }) + ' · ' + t('coinsAdLeft', { n: left }) : t('coinsAdNone');
    ca.classList.toggle('dim', left <= 0);
  }

  async function action() {
    const s = api.save(), skin = findSkin(tab, cur(tab)), st = state(tab, skin), key = tab + ':' + skin.id;
    if (st === 'equipped') return;
    if (st === 'owned') { s.equip[tab] = skin.id; api.Analytics.event('skin_equip', { skin: key }); }
    else if (st === 'ads') {
      const ok = await api.withAd(() => api.showRewarded());
      if (!ok) return;
      s.adProg[key] = (s.adProg[key] || 0) + 1;
      api.Analytics.event('skin_ad', { skin: key, n: s.adProg[key] });
      if (s.adProg[key] >= skin.ads) { s.owned[tab].push(skin.id); s.equip[tab] = skin.id; api.Analytics.event('skin_unlock', { skin: key }); api.Sound.win(); }
    } else {
      if (s.coins < skin.price) { api.Sound.fail(); return; }
      s.coins -= skin.price; s.owned[tab].push(skin.id); s.equip[tab] = skin.id;
      api.Analytics.event('skin_buy', { skin: key, price: skin.price });
      api.Sound.win();
    }
    api.persist(); render(); api.onChange();
  }

  async function coinsAd() {
    const s = api.save(), day = api.todayKey();
    if (s.coinAds.day !== day) s.coinAds = { day, n: 0 };
    if (s.coinAds.n >= COIN_ADS_PER_DAY) return;
    const ok = await api.withAd(() => api.showRewarded());
    if (!ok) return;
    s.coinAds.n++; s.coins += COINS_PER_AD;
    api.Analytics.event('coins_ad', { n: s.coinAds.n });
    api.Sound.dot(4);
    api.persist(); render(); api.onChange();
  }

  document.querySelectorAll('.shop-tab').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
  $('shop-action').onclick = action;
  $('shop-coins-ad').onclick = coinsAd;
  window.addEventListener('resize', () => { if (pv.offsetParent) sizePreview(); });

  return {
    open() { selected = {}; previewT = 0; burstPts = []; api.show('screen-shop'); sizePreview(); render(); api.Analytics.event('shop_open'); },
    frame,
    render,
  };
}
