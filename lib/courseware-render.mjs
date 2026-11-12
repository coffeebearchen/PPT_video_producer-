// 课件渲染：把 resolved-props 交给 Codex 的 Courseware 入口，输出 video.mp4 + cover.png。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const RENDERER_DIR = path.join(process.cwd(), 'engines', 'vibemotion', 'renderer');

function runRemotion(args, onProgress, timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--offline', '--no-install', 'remotion', ...args], { cwd: RENDERER_DIR, shell: true, windowsHide: true });
    let stderr = '';
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { child.kill(); } catch {}
      reject(new Error('课件渲染超时（10 分钟）'));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      const s = d.toString();
      const m = s.match(/Rendered (\d+)\/(\d+)/);
      if (m && onProgress) onProgress(Math.min(95, Math.round((Number(m[1]) / Number(m[2])) * 95)));
    });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (e) => { if (done) return; done = true; clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code === 0) return resolve();
      reject(new Error('课件渲染失败：' + String(stderr || '').slice(-600)));
    });
  });
}

export async function renderCourseware(propsPath, outDir, onProgress, opts = {}) {
  const absProps = path.resolve(propsPath);
  if (!fs.existsSync(absProps)) throw new Error('resolved-props 不存在：' + absProps);
  fs.mkdirSync(outDir, { recursive: true });
  const preview = opts.preview === true;
  const video = path.join(outDir, preview ? 'preview.mp4' : 'video.mp4');
  const cover = path.join(outDir, 'cover.png');
  if (onProgress) onProgress(5);
  await runRemotion(['render', 'src/courseware/index.tsx', 'Courseware', video, ...(preview ? ['--scale=0.5', '--crf=33'] : ['--codec=h264']), '--overwrite', `--props=${absProps}`], onProgress);
  if (preview) { if (onProgress) onProgress(100); return { video, cover: null }; }
  if (onProgress) onProgress(97);
  await runRemotion(['still', 'src/courseware/index.tsx', 'CoursewareCover', cover, '--image-format=png', '--overwrite', `--props=${absProps}`], onProgress);
  if (onProgress) onProgress(100);
  return { video, cover };
}
