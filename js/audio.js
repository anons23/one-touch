// All sound is synthesised with Web Audio: no files. Synthwave pulse per zone + game effects.
const ZONES = [
  { root: 45, prog: [0, -4, -2, -5], scale: [0, 3, 5, 7, 10, 12], tempo: 96, lead: 'square', cut: 1800 },
  { root: 43, prog: [0, 5, 3, -2], scale: [0, 2, 4, 7, 9, 12], tempo: 88, lead: 'triangle', cut: 2400 },
  { root: 48, prog: [0, -3, -5, -1], scale: [0, 3, 5, 7, 10, 12], tempo: 104, lead: 'sawtooth', cut: 1400 },
  { root: 41, prog: [0, 3, -4, 5], scale: [0, 2, 3, 7, 8, 12], tempo: 80, lead: 'sine', cut: 3000 },
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

let ac = null, master, sfxBus, musicBus, delay, noise;
let sfxOn = true, musicOn = true, zone = 0, paused = false, timer = 0;
let nextStep = 0, stepIdx = 0;

function makeNoise(seconds) {
  const b = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function init() {
  if (ac) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ac = new AC();
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
  master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination);
  delay = ac.createDelay(1); delay.delayTime.value = 0.28;
  const fb = ac.createGain(); fb.gain.value = 0.32; const wet = ac.createGain(); wet.gain.value = 0.35;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0; sfxBus.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = musicOn ? 0.3 : 0; musicBus.connect(master); musicBus.connect(delay);
  noise = makeNoise(2);
  nextStep = ac.currentTime + 0.2;
  timer = setInterval(schedule, 100);
  return true;
}

function env(g, t, peak, a, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function voice(t, freq, type, vol, a, d, dest, cut) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  env(g, t, vol, a, d);
  if (cut) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; o.connect(f); f.connect(g); }
  else o.connect(g);
  g.connect(dest); o.start(t); o.stop(t + a + d + 0.05);
}

function schedule() {
  if (!ac || ac.state !== 'running' || !musicOn) { if (ac) nextStep = Math.max(nextStep, ac.currentTime + 0.1); return; }
  const Z = ZONES[zone], sixteenth = 60 / Z.tempo / 4;
  while (nextStep < ac.currentTime + 0.3) {
    const t = nextStep, bar = Math.floor(stepIdx / 16) % 4, s = stepIdx % 16;
    const root = Z.root + Z.prog[bar];
    if (s % 2 === 0) voice(t, hz(root), 'sawtooth', s % 4 === 0 ? 0.09 : 0.05, 0.005, sixteenth * 1.6, musicBus, 420);
    if (s % 4 === 0 || (s % 2 === 1 && Math.random() < 0.25)) {
      const n = root + 24 + Z.scale[(s / 2 + bar * 3) % Z.scale.length | 0];
      voice(t, hz(n), Z.lead, 0.035, 0.004, sixteenth * 2.4, musicBus, Z.cut);
    }
    if (s === 0) [0, 7, 12].forEach((iv) => voice(t, hz(root + 12 + iv), 'triangle', 0.025, 0.6, sixteenth * 14, musicBus, 1200));
    stepIdx++; nextStep += sixteenth;
  }
}

function sfxOk() { return ac && sfxOn && !paused; }

function noiseHit(t, vol, type, freq, dur, q) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  env(g, t, vol, 0.002, dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random(), dur + 0.05);
}

export const Sound = {
  unlock() { if (init() && !paused && ac.state !== 'running') ac.resume(); },
  setSfx(on) { sfxOn = on; if (ac) sfxBus.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, 0.05); },
  setMusic(on) { musicOn = on; if (ac) musicBus.gain.setTargetAtTime(on ? 0.3 : 0, ac.currentTime, 0.2); },
  setZone(i) { i = ((i % ZONES.length) + ZONES.length) % ZONES.length; if (i !== zone) { zone = i; stepIdx = 0; } },
  launch() {
    if (!sfxOk()) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.18);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    env(g, t, 0.12, 0.01, 0.22); o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.3);
    noiseHit(t, 0.08, 'bandpass', 2500, 0.18, 0.8);
  },
  bounce(n, kind) {
    if (!sfxOk()) return;
    const t = ac.currentTime, base = kind === 'wall' ? 260 : 340;
    voice(t, base * Math.pow(1.122, Math.min(n, 12)), 'triangle', 0.13, 0.002, 0.12, sfxBus);
    voice(t, base * 2 * Math.pow(1.122, Math.min(n, 12)), 'sine', 0.04, 0.002, 0.08, sfxBus);
  },
  glass() {
    if (!sfxOk()) return;
    const t = ac.currentTime;
    noiseHit(t, 0.22, 'highpass', 3500, 0.25);
    for (let k = 0; k < 6; k++) voice(t + k * 0.03 + Math.random() * 0.02, 2200 + Math.random() * 2800, 'sine', 0.035, 0.001, 0.25, sfxBus);
  },
  portal() {
    if (!sfxOk()) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.16);
    o.frequency.exponentialRampToValueAtTime(1600, t + 0.32);
    env(g, t, 0.12, 0.01, 0.34); o.connect(g); g.connect(sfxBus); g.connect(delay); o.start(t); o.stop(t + 0.4);
  },
  dot(k) {
    if (!sfxOk()) return;
    const Z = ZONES[zone], n = Z.root + 36 + Z.scale[k % Z.scale.length] + 12 * Math.floor(k / Z.scale.length);
    const t = ac.currentTime;
    voice(t, hz(n), 'sine', 0.14, 0.003, 0.5, sfxBus);
    voice(t, hz(n) * 2.01, 'sine', 0.05, 0.003, 0.3, sfxBus);
    voice(t, hz(n), 'sine', 0.05, 0.003, 0.4, delay);
  },
  win() {
    if (!sfxOk()) return;
    const Z = ZONES[zone], t = ac.currentTime;
    [0, 3, 4, 5, 6].forEach((k, j) => {
      const n = Z.root + 36 + Z.scale[k % Z.scale.length] + (k >= Z.scale.length ? 12 : 0);
      voice(t + j * 0.08, hz(n), Z.lead, 0.07, 0.004, 0.5, sfxBus, 3000);
      voice(t + j * 0.08, hz(n), 'sine', 0.06, 0.004, 0.6, delay);
    });
    noiseHit(t, 0.06, 'bandpass', 6000, 0.6, 0.5);
  },
  fail() {
    if (!sfxOk()) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.4);
    env(g, t, 0.12, 0.01, 0.45); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.5);
  },
  tick() { if (sfxOk()) voice(ac.currentTime, 2400, 'sine', 0.025, 0.001, 0.02, sfxBus); },
  ui() { if (sfxOk()) { voice(ac.currentTime, 880, 'square', 0.04, 0.002, 0.05, sfxBus, 2500); } },
  hint() {
    if (!sfxOk()) return;
    const t = ac.currentTime;
    [0, 4, 7, 12, 16].forEach((n, k) => voice(t + k * 0.05, hz(72 + n), 'sine', 0.05, 0.003, 0.35, delay));
  },
  pauseAll() { paused = true; if (ac && ac.state === 'running') ac.suspend(); },
  resumeAll() { paused = false; if (ac && ac.state !== 'running') ac.resume(); },
  get ctx() { return ac; },
  get master() { return master; },
};
