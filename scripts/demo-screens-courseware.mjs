// 强演示：3 张真实截图 + AI 自动框 + 不同强调（圆圈/高亮带/箭头）+ 流程 + 金句
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
console.log('draft:', tid);

async function upload(file, name) {
  const b64 = fs.readFileSync(file).toString('base64');
  const r = await j(`/api/courseware/drafts/${tid}/assets`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'image', mime: 'image/png', name, data: b64 })
  });
  return r.asset.id;
}
async function detect(assetId, description) {
  const r = await j(`/api/courseware/drafts/${tid}/assets/${assetId}/detect`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ description })
  });
  if (!r.ok) throw new Error('detect 失败: ' + r.error);
  console.log('  detect:', description, '→', JSON.stringify(r.box), 'conf', r.confidence);
  return r.box;
}

const review = await upload('out/shot-review.png', 'shot-review.png');
const publish = await upload('out/shot-publish.png', 'shot-publish.png');
const autogen = await upload('out/shot-autogen.png', 'shot-autogen.png');

const reviewBox = await detect(review, '第一行的「通过」按钮');
const publishBox = await detect(publish, '「生成发布包」按钮');
const autogenBox = await detect(autogen, '「模式」下拉框');

const storyboard = {
  title: '如何自动发布公众号',
  style: 'industrial',
  slides: [
    { id: 'opening', kind: 'title', text: '如何自动发布公众号', body: '从审批到草稿，四步走',
      caption: '这条视频讲：怎么把公众号发布做成一条流水线。',
      narration: { mode: 'tts', text: '这条视频讲，怎么把公众号发布做成一条流水线。' }, timing: { minSeconds: 4, tailSeconds: 0.4 } },
    { id: 'review', kind: 'screenshot', text: '第一步：点「通过」', assetId: review, highlight: reviewBox, annotation: 'circle', dim: 0.5,
      caption: '在审批页，点第一行的通过。',
      narration: { mode: 'tts', text: '在审批页，点第一行的通过。' }, timing: { minSeconds: 5, tailSeconds: 0.4 } },
    { id: 'publish', kind: 'screenshot', text: '第二步：打开发布', assetId: publish, highlight: publishBox, annotation: 'highlight', dim: 0.5,
      caption: '在发布页，点生成发布包。',
      narration: { mode: 'tts', text: '在发布页，点生成发布包。' }, timing: { minSeconds: 5, tailSeconds: 0.4 } },
    { id: 'mode', kind: 'screenshot', text: '第三步：选公众号', assetId: autogen, highlight: autogenBox, annotation: 'arrow', dim: 0.45,
      caption: '在生成页，把模式选成课件式。',
      narration: { mode: 'tts', text: '在生成页，把模式选成课件式。' }, timing: { minSeconds: 5, tailSeconds: 0.4 } },
    { id: 'steps', kind: 'flow', text: '四步完成发布',
      nodes: [{ id: 'n1', label: '审批通过' }, { id: 'n2', label: '打开发布' }, { id: 'n3', label: '选公众号' }, { id: 'n4', label: '生成草稿' }],
      edgePolicy: 'sequential', caption: '审批、发布、选渠道、生成草稿。',
      narration: { mode: 'tts', text: '审批、发布、选渠道、生成草稿。' }, timing: { minSeconds: 5, tailSeconds: 0.4 } },
    { id: 'closing', kind: 'quote', text: '人只做关键决策', body: '其余交给软件',
      caption: '人只做关键决策，其余交给软件。',
      narration: { mode: 'tts', text: '人只做关键决策，其余交给软件。' }, timing: { minSeconds: 4, tailSeconds: 0.4 } }
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
console.log('generate:', gen.renderId, gen.totalDurationSeconds + 's');

for (let i = 0; i < 60; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${tid}`, {});
  console.log(`poll ${i + 1}: ${t.status} ${t.progress}% ${t.error ? '错误=' + t.error : ''}`);
  if (t.status === 'done') { console.log('DONE', tid, t.video_path); break; }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('STOP', t.status, t.error); break; }
}
