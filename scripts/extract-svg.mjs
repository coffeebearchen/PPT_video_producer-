// 从 gallery HTML 中抽取单个 SVG（按标题关键字），保存为独立文件
import fs from 'node:fs';

const html = fs.readFileSync('D:/AI数字资产/studio/data/media/handdrawn/index.html', 'utf8');
const re = /<svg viewBox="0 0 1080 1920"[\s\S]*?<\/svg>/g;
const all = html.match(re) || [];
const want = process.argv[2] || 'D01 点群';
const pick = all.find((s) => s.includes(want));
if (!pick) {
  console.log('not found; total=' + all.length);
  process.exit(1);
}
const name = (process.argv[3] || 'D01') + '.svg';
fs.writeFileSync('D:/AI数字资产/studio/data/media/handdrawn/' + name, pick, 'utf8');
console.log('written', name, pick.length, 'bytes');
