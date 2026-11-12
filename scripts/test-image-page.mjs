// 测试 image 页（照片/插图）：建草稿 → 传图 → 手动分镜 → 渲染
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
  body: JSON.stringify({ title: '图片页测试', style: 'industrial' })
});
const tid = draft.taskId;
console.log('draft:', tid);

const img = 'D:/AI数字资产/studio/out/shot-review.png';
const b64 = fs.readFileSync(img).toString('base64');
const asset = await j(`/api/courseware/drafts/${tid}/assets`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ kind: 'image', mime: 'image/png', name: 'photo.png', data: b64 })
});
console.log('image asset:', asset.asset.id, asset.asset.width + 'x' + asset.asset.height);

await j(`/api/courseware/drafts/${tid}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    storyboard: {
      title: '图片页测试', style: 'industrial',
      slides: [
        { id: 's1', kind: 'title', text: '这是一张照片', narration: { mode: 'tts', text: '先看一张照片。' } },
        { id: 's2', kind: 'image', text: '照片内容', assetId: asset.asset.id, kenBurns: true, narration: { mode: 'tts', text: '这是照片本身，不做任何圈注。' } },
        { id: 's3', kind: 'quote', text: '照片也能进课件', narration: { mode: 'tts', text: '照片也能进课件了。' } }
      ]
    },
    draftRevision: draft.project.draftRevision
  })
});
console.log('saved');

const gen = await j(`/api/courseware/drafts/${tid}/generate`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
});
console.log('generate:', gen.renderId, gen.totalDurationSeconds + 's');

for (let i = 0; i < 40; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${tid}`, {});
  if (t.status === 'done') { console.log('DONE', t.video_path); process.exit(0); }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('FAILED:', t.error); process.exit(1); }
  if (i % 3 === 0) console.log('poll:', t.status, t.progress + '%');
}
console.log('TIMEOUT');
process.exit(1);
