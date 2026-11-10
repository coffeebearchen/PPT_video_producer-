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
  if (d) items.push({ type: 'image', src: d, x: 0.9, y: 0.14, size: 80, anim: 'bob', opacity: 0.5 });
  if (rich) {
    const l = randomLottie();
    if (l) items.push({ type: 'lottie', src: l, x: 0.1, y: 0.87, size: 90, anim: 'static', opacity: 0.4 });
  }
  return items;
}

const KEYWORD_DOODLE = [
  ['咖啡', 'od_coffee.svg'], ['咖啡因', 'od_coffee.svg'],
  ['跑步', 'od_running.svg'], ['跑', 'od_running.svg'], ['冲刺', 'od_sprinting.svg'],
  ['跳舞', 'od_dancing.svg'], ['阅读', 'od_reading.svg'], ['看书', 'od_reading.svg'], ['读书', 'od_reading.svg'],
  ['冥想', 'od_meditating.svg'], ['静坐', 'od_meditating.svg'],
  ['休息', 'od_chilling.svg'], ['躺', 'od_laying.svg'], ['放松', 'od_chilling.svg'],
  ['滑板', 'od_roller-skating.svg'], ['冰激凌', 'od_ice-cream.svg'], ['冰淇淋', 'od_ice-cream.svg'],
  ['狗', 'od_dog-jump.svg'], ['宠物', 'od_dog-jump.svg'], ['植物', 'od_plant.svg'],
  ['自拍', 'od_selfie.svg'], ['漂浮', 'od_float.svg'], ['飞', 'od_float.svg'],
  ['爱', 'od_loving.svg'], ['喜欢', 'od_loving.svg'], ['音乐', 'od_groovy.svg'],
  ['咖啡', 'od_coffee.svg'], ['工作', 'od_sitting.svg'], ['思考', 'od_reading.svg'],
  ['滚动', 'od_rolling.svg'], ['荡秋千', 'od_swinging.svg'], ['散步', 'od_strolling.svg']
];

export function pickDecorForScript(script = '', rich = false) {
  const text = String(script || '');
  let doodle = null;
  for (const [kw, file] of KEYWORD_DOODLE) {
    if (text.includes(kw)) { doodle = `assets/${file}`; break; }
  }
  if (!doodle) doodle = randomDoodle();
  const items = [];
  if (doodle) items.push({ type: 'image', src: doodle, x: 0.9, y: 0.14, size: 80, anim: 'bob', opacity: 0.5 });
  if (rich) {
    const l = randomLottie();
    if (l) items.push({ type: 'lottie', src: l, x: 0.1, y: 0.87, size: 90, anim: 'static', opacity: 0.4 });
  }
  return items;
}
