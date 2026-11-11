// 课件 API 端到端测试：草稿 → 素材 → 保存 → 生成
import fs from 'node:fs';

const base = 'http://127.0.0.1:4310';
async function j(url, opts) {
  const r = await fetch(base + url, opts);
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!r.ok) throw new Error(`${url} → ${r.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
}

const health = await j('/api/health', {});
console.log('health ok:', health.ok);

const draft = await j('/api/courseware/drafts', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '课件API测试', style: 'industrial' })
});
console.log('draft:', draft.taskId, 'rev:', draft.draftRevision);

const b64 = fs.readFileSync('engines/vibemotion/renderer/public/screenshots/courseware-workbench.png').toString('base64');
const a = await j(`/api/courseware/drafts/${draft.taskId}/assets`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ kind: 'image', mime: 'image/png', name: 'workbench.png', data: b64 })
});
console.log('asset:', a.asset.id);

const storyboard = {
  title: '课件API测试', style: 'industrial',
  slides: [
    { id: 'opening', kind: 'title', text: '测试标题', body: '测试副标题', narration: { mode: 'tts', text: '这是第一页测试。' } },
    { id: 'shot', kind: 'screenshot', text: '截图页', assetId: a.asset.id, highlight: { x: 0.0756, y: 0.3886, w: 0.7983, h: 0.1091 }, annotation: 'arrow', narration: { mode: 'tts', text: '这是截图页。' } }
  ]
};
const s = await j(`/api/courseware/drafts/${draft.taskId}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ storyboard, draftRevision: 0 })
});
console.log('save rev:', s.draftRevision);

const g = await j(`/api/courseware/drafts/${draft.taskId}/generate`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
});
console.log('generate:', g.renderId, 'total:', g.totalDurationSeconds + 's');
console.log('props:', g.resolvedPropsPath);
