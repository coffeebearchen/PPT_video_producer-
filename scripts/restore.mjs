import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const yes = process.argv.includes('--yes');
if (!dir || !fs.existsSync(path.join(dir, 'studio.db'))) {
  console.error('用法: node scripts/restore.mjs backups/<name> --yes');
  process.exit(1);
}
if (!yes) {
  console.error('恢复会覆盖 data/studio.db。先停服务，再加 --yes。');
  process.exit(1);
}
const target = 'data/studio.db';
const safety = `backups/pre-restore-${Date.now()}.db`;
if (fs.existsSync(target)) fs.copyFileSync(target, safety);
fs.copyFileSync(path.join(dir, 'studio.db'), target);
for (const file of ['batches.json', 'music-library.json']) {
  const src = path.join(dir, file);
  if (!fs.existsSync(src)) continue;
  const dst = file === 'batches.json' ? 'data/batches.json' : 'data/music/library.json';
  fs.copyFileSync(src, dst);
}
console.log(JSON.stringify({ restored: target, pre_restore_backup: safety }, null, 2));
