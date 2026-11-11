// 课件端到端：建草稿 → 传图 → 存 storyboard → 生成 → 轮询到 done
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

const health = await j('/api/health', {});
console.log('health:', health.ok);

const draft = await j('/api/courseware/drafts', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '端到端课件测试', style: 'industrial' })
});
const tid = draft.taskId;
console.log('draft:', tid);

const b64 = fs.readFileSync('engines/vibemotion/renderer/public/screenshots/courseware-workbench.png').toString('base64');
const a = await j(`/api/courseware/drafts/${tid}/assets`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ kind: 'image', mime: 'image/png', name: 'workbench.png', data: b64 })
});
console.log('asset:', a.asset.id);

const storyboard = {
  title: '端到端课件测试', style: 'industrial',
  slides: [
    { id: 'opening', kind: 'title', text: '端到端测试', body: '从建草稿到出片', caption: '这是一次端到端测试。', narration: { mode: 'tts', text: '这是一次从建草稿到出片的端到端测试。' } },
    { id: 'shot', kind: 'screenshot', text: '截图页', assetId: a.asset.id, highlight: { x: 0.0756, y: 0.3886, w: 0.7983, h: 0.1091 }, annotation: 'arrow', dim: 0.35, caption: '圈出左侧的新建视频入口。', narration: { mode: 'tts', text: '圈出左侧的新建视频入口。' } },
    { id: 'steps', kind: 'flow', text: '三个步骤', nodes: [{ id: 'n1', label: '建草稿' }, { id: 'n2', label: '填页面' }, { id: 'n3', label: '出成片' }], edgePolicy: 'sequential', caption: '建草稿、填页面、出成片。', narration: { mode: 'tts', text: '建草稿，填页面，出成片。' } },
    { id: 'closing', kind: 'quote', text: '就这三步', body: '剩下的交给软件', caption: '剩下的交给软件。', narration: { mode: 'tts', text: '剩下的交给软件。' } }
  ]
};
const saved = await j(`/api/courseware/drafts/${tid}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ storyboard, draftRevision: draft.draftRevision })
});
console.log('saved rev:', saved.draftRevision);

const gen = await j(`/api/courseware/drafts/${tid}/generate`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
});
console.log('generate:', gen.renderId, 'total:', gen.totalDurationSeconds + 's');

for (let i = 0; i < 40; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${tid}`, {});
  console.log(`poll ${i + 1}: ${t.status} ${t.progress}% ${t.error ? '错误=' + t.error : ''}`);
  if (t.status === 'done') { console.log('DONE video:', t.video_path, 'cover:', t.cover_path); break; }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('STOP:', t.status, t.error); break; }
}
