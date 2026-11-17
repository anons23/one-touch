import { LEVELS } from './levels-data.js';
import { DAILY } from './daily-data.js';

export const LEVEL_COUNT = LEVELS.length;
export const PORTAL_FROM = 20;
export const GLASS_FROM = 40;
export const PREVIEW_OFF = 12;

export const ZONES = [
  { bg1: '#0a0614', bg2: '#1d0b33', grid: 'rgba(255,45,149,0.08)', wall: '#ff2d95', block: '#2a0f3d', edge: '#ff4fa8', glass: '#9ef0ff', line: '#00e5ff', dot: '#b6ff3b', portal: '#ffb000', fg: '#f5f0ff', soft: '#1b0f2c', stars: false },
  { bg1: '#03141c', bg2: '#073445', grid: 'rgba(64,224,208,0.08)', wall: '#2ee6d6', block: '#06394a', edge: '#3df0e0', glass: '#c8f7ff', line: '#8af6ff', dot: '#ffd166', portal: '#ff6b9d', fg: '#e6fbff', soft: '#0a2530', stars: false },
  { bg1: '#160a12', bg2: '#401436', grid: 'rgba(255,140,66,0.09)', wall: '#ff8c42', block: '#3b1530', edge: '#ff5e7e', glass: '#ffe1c4', line: '#ffd23f', dot: '#7afcff', portal: '#c77dff', fg: '#fff1e6', soft: '#2a1222', stars: false },
  { bg1: '#04040b', bg2: '#12153a', grid: 'rgba(160,170,255,0.06)', wall: '#a0a8ff', block: '#1a1d3d', edge: '#9aa1ff', glass: '#e6e9ff', line: '#ffffff', dot: '#ffcc00', portal: '#00ffa3', fg: '#eef0ff', soft: '#14162c', stars: true },
];

export function getLevel(i) { return Object.assign({ index: i }, LEVELS[i]); }

export function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function dayNumber(d = new Date()) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }

export function getDaily(dn) {
  const idx = ((dn % DAILY.length) + DAILY.length) % DAILY.length;
  return Object.assign({ index: -1, daily: true, dayIdx: idx }, DAILY[idx], { theme: ((dn % 4) + 4) % 4 });
}
