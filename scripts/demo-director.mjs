// 导演手册验证：带流程页 + 截图页的课件，看手册的流程/颜色/元素约束是否生效
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
  body: JSON.stringify({ title: '如何自动发布公众号', style: 'industrial' })
});
const tid = draft.taskId;
console.log('draft:', tid);

const b64 = fs.readFileSync('out/shot-review.png').toString('base64');
await j(`/api/courseware/drafts/${tid}/assets`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ kind: 'image', mime: 'image/png', name: 'shot-review.png', data: b64 })
});

const script = '先看审批页怎么点通过；然后整个发布就是四步：审批、打包、选渠道、发草稿。';
const r = await j(`/api/courseware/drafts/${tid}/compose`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ script })
});
console.log('compose:', r.slides, 'pages /', r.totalDurationSeconds + 's');

const d = await j(`/api/courseware/drafts/${tid}`, {});
for (const s of d.project.storyboard.slides) {
  const eff = s.effects ? Object.keys(s.effects).join('+') : '-';
  console.log(`  [${s.kind}] ${s.text} ｜ effects:${eff}｜旁白:${s.narration?.text?.slice(0, 30)}`);
}

for (let i = 0; i < 50; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${tid}`, {});
  if (t.status === 'done') { console.log('DONE', tid, t.video_path); break; }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('STOP', t.status, t.error); break; }
}
