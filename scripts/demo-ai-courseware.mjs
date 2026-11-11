// 全程只用软件 API：建草稿 → 传图 → AI 找位置 → 存 storyboard → 生成 → 渲染
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
  body: JSON.stringify({ title: '如何自动发布公众号', style: 'industrial' })
});
const tid = draft.taskId;
console.log('1) 建草稿:', tid);

const b64 = fs.readFileSync('out/shot-review.png').toString('base64');
const asset = await j(`/api/courseware/drafts/${tid}/assets`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ kind: 'image', mime: 'image/png', name: 'shot-review.png', data: b64 })
});
console.log('2) 传截图:', asset.asset.id);

const det = await j(`/api/courseware/drafts/${tid}/assets/${asset.asset.id}/detect`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ description: '第一行的「通过」按钮' })
});
if (!det.ok) throw new Error('AI 找位置失败: ' + det.error);
console.log('3) AI 找位置:', JSON.stringify(det.box), '置信度', det.confidence);

const storyboard = {
  title: '如何自动发布公众号',
  style: 'industrial',
  slides: [
    {
      id: 'opening', kind: 'title',
      text: '如何自动发布公众号',
      body: '从审批到草稿，四步走',
      caption: '审批通过之后，这条内容就进入发布流程。',
      narration: { mode: 'tts', text: '审批通过之后，这条内容就进入发布流程。' },
      timing: { minSeconds: 4, tailSeconds: 0.4 }
    },
    {
      id: 'approve', kind: 'screenshot',
      text: '先点「通过」',
      assetId: asset.asset.id,
      highlight: det.box,
      annotation: 'circle',
      dim: 0.45,
      caption: '在这里点通过，确认这条内容可以发。',
      narration: { mode: 'tts', text: '在这里点通过，确认这条内容可以发。' },
      timing: { minSeconds: 5, tailSeconds: 0.4 }
    },
    {
      id: 'steps', kind: 'flow',
      text: '四步完成发布',
      nodes: [{ id: 'n1', label: '审批通过' }, { id: 'n2', label: '打开发布' }, { id: 'n3', label: '选公众号' }, { id: 'n4', label: '生成草稿' }],
      edgePolicy: 'sequential',
      caption: '审批通过，打开发布，选择公众号，生成文章草稿。',
      narration: { mode: 'tts', text: '审批通过，打开发布，选择公众号，生成文章草稿。' },
      timing: { minSeconds: 5, tailSeconds: 0.4 }
    },
    {
      id: 'channels', kind: 'bullet',
      text: '两种渠道',
      bullets: ['视频号：发布包 + 封面 + 文案', '公众号：文章草稿，可内嵌视频'],
      caption: '视频号发发布包，公众号发文章草稿。',
      narration: { mode: 'tts', text: '视频号发发布包，公众号发文章草稿。' },
      timing: { minSeconds: 5, tailSeconds: 0.4 }
    },
    {
      id: 'closing', kind: 'quote',
      text: '人只做关键决策',
      body: '其余交给软件',
      caption: '人只做关键决策，其余交给软件。',
      narration: { mode: 'tts', text: '人只做关键决策，其余交给软件。' },
      timing: { minSeconds: 4, tailSeconds: 0.4 }
    }
  ]
};
const saved = await j(`/api/courseware/drafts/${tid}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ storyboard, draftRevision: draft.draftRevision })
});
console.log('4) 存 storyboard: rev', saved.draftRevision);

const gen = await j(`/api/courseware/drafts/${tid}/generate`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
});
console.log('5) 编译:', gen.renderId, gen.totalDurationSeconds + 's');

for (let i = 0; i < 40; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${tid}`, {});
  console.log(`   渲染 ${t.status} ${t.progress}% ${t.error ? '错误=' + t.error : ''}`);
  if (t.status === 'done') { console.log('6) DONE', tid, t.video_path); break; }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('STOP', t.status, t.error); break; }
}
