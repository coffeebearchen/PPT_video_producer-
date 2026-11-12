// 验证：手动建（无 effects）的标题/金句页，渲染不再因 textSync 报错
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
  body: JSON.stringify({ title: '无effects测试', style: 'industrial' })
});
const tid = draft.taskId;
console.log('draft:', tid);

await j(`/api/courseware/drafts/${tid}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    storyboard: {
      title: '无effects测试', style: 'industrial',
      slides: [
        { id: 's1', kind: 'title', text: '真的能用', narration: { mode: 'tts', text: '测试一下手动建的页面。' } },
        { id: 's2', kind: 'quote', text: '没有效果也要能渲', body: '收尾', narration: { mode: 'tts', text: '这样就完成了。' } }
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
