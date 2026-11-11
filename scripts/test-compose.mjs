// 文案分镜测试：建草稿 → 传 3 张截图 → 一段话 → 自动分镜 + 定位 + 渲染
import fs from 'node:fs';

const base = 'http://127.0.0.1:4310';
async function j(url, opts) {
  const r = await fetch(base + url, opts);
  const t = await r.text();
  let b; try { b = JSON.parse(t); } catch { b = t; }
  if (!r.ok) throw new Error(`${url} → ${r.status} ${JSON.stringify(b).slice(0, 400)}`);
  return b;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const draft = await j('/api/courseware/drafts', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '文案分镜测试', style: 'industrial' })
});
const tid = draft.taskId;
console.log('draft:', tid);

for (const f of ['out/shot-review.png', 'out/shot-publish.png', 'out/shot-autogen.png']) {
  const b64 = fs.readFileSync(f).toString('base64');
  const a = await j(`/api/courseware/drafts/${tid}/assets`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'image', mime: 'image/png', name: f.split('/').pop(), data: b64 })
  });
  console.log('asset:', a.asset.id);
}

const script = '先讲审批页点通过；再讲发布页点生成发布包；最后讲生成页把模式选成课件式。';
const r = await j(`/api/courseware/drafts/${tid}/compose`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ script })
});
console.log('compose:', r.taskId, 'slides:', r.slides, 'total:', r.totalDurationSeconds + 's');

const d = await j(`/api/courseware/drafts/${tid}`, {});
console.log('生成的分镜：');
for (const s of d.project.storyboard.slides) {
  console.log(`  [${s.kind}] ${s.text}${s.annotation ? ' · ' + s.annotation : ''}${s.highlight ? ' · box ' + JSON.stringify(s.highlight) : ''}`);
}

for (let i = 0; i < 50; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${tid}`, {});
  console.log(`poll ${i + 1}: ${t.status} ${t.progress}% ${t.error ? '错误=' + t.error : ''}`);
  if (t.status === 'done') { console.log('DONE', tid, t.video_path); break; }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('STOP', t.status, t.error); break; }
}
