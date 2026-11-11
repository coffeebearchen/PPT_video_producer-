// 视频页测试：建草稿 → 传视频 → 文案分镜 → 渲染
import fs from 'node:fs';

const base = 'http://127.0.0.1:4310';
async function j(url, opts) {
  const r = await fetch(base + url, opts);
  const t = await r.text();
  let b; try { b = JSON.parse(t); } catch { b = t; }
  if (!r.ok) throw new Error(`${url} → ${r.status} ${JSON.stringify(b).slice(0, 300)}`);
  return b;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const draft = await j('/api/courseware/drafts', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '视频页测试', style: 'industrial' })
});
const tid = draft.taskId;
console.log('draft:', tid);

const b64 = fs.readFileSync('reference-video/videos/VibeMotion-charts-9x16.mp4').toString('base64');
const asset = await j(`/api/courseware/drafts/${tid}/assets`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ kind: 'video', mime: 'video/mp4', name: 'charts-demo.mp4', data: b64 })
});
console.log('video asset:', asset.asset.id);

const r = await j(`/api/courseware/drafts/${tid}/compose`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ script: '先看一段图表动画的演示，再讲讲这个演示说明了什么。' })
});
console.log('compose:', r.slides, 'pages /', r.totalDurationSeconds + 's');

const d = await j(`/api/courseware/drafts/${tid}`, {});
for (const s of d.project.storyboard.slides) console.log(`  [${s.kind}] ${s.text}`);

for (let i = 0; i < 50; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${tid}`, {});
  console.log(`poll ${i + 1}: ${t.status} ${t.progress}% ${t.error ? '错误=' + t.error : ''}`);
  if (t.status === 'done') { console.log('DONE', tid, t.video_path); break; }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('STOP', t.status, t.error); break; }
}
