import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db.mjs';

const ASSETS_DIR = path.join(ROOT, 'engines', 'vibemotion', 'renderer', 'public', 'assets');

export function listElementAssets() {
  const files = fs.existsSync(ASSETS_DIR) ? fs.readdirSync(ASSETS_DIR) : [];
  const doodles = files.filter(f => /^od_.*\.svg$/i.test(f));
  const lotties = files.filter(f => /^lottie_.*\.json$/i.test(f));
  return { doodles, lotties };
}

export function randomDoodle() {
  const { doodles } = listElementAssets();
  if (!doodles.length) return null;
  return `assets/${doodles[Math.floor(Math.random() * doodles.length)]}`;
}

export function randomLottie() {
  const { lotties } = listElementAssets();
  if (!lotties.length) return null;
  return `assets/${lotties[Math.floor(Math.random() * lotties.length)]}`;
}

export function randomDecor(rich = false) {
  const items = [];
  const d = randomDoodle();
  if (d) items.push({ type: 'image', src: d, x: 0.85, y: 0.22, size: 90, anim: 'bob', opacity: 0.9 });
  if (rich) {
    const l = randomLottie();
    if (l) items.push({ type: 'lottie', src: l, x: 0.14, y: 0.8, size: 120, anim: 'static', opacity: 0.85 });
  }
  return items;
}
