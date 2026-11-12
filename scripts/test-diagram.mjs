// 验证 diagram 页整链路：建草稿 → 手写图解页 → 生成 → 渲染
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
  body: JSON.stringify({ title: '图解页测试', style: 'dynamicflow' })
});
const tid = draft.taskId;
console.log('draft:', tid);

await j(`/api/courseware/drafts/${tid}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    storyboard: {
      title: '图解页测试', style: 'dynamicflow', bgm: 'ambient',
      slides: [
        { id: 's1', kind: 'title', text: '图解页测试', narration: { mode: 'tts', text: '这是一条图解测试。' } },
        { id: 's2', kind: 'diagram', layout: 'D01', text: '不同方案挤在不同区域', caption: '点群把相似结果放一起。', data: { label: 'idea basin', translation: '想法盆地', counts: [8, 8, 8, 8, 8] }, narration: { mode: 'tts', text: '不同方案会挤在不同区域。' } },
        { id: 's3', kind: 'diagram', layout: 'B03', text: '越转越顺', caption: '计划、执行、检查、调整。', data: { nodes: ['计划', '执行', '检查', '调整'] }, narration: { mode: 'tts', text: '一轮接一轮。' } },
        { id: 's4', kind: 'quote', text: '图解能进视频了', narration: { mode: 'tts', text: '图解能进视频了。' } }
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
