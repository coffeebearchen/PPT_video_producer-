// 一键生成课件：POST /api/courseware/auto { topic } → 轮询到 done
const base = 'http://127.0.0.1:4310';
async function j(url, opts) {
  const r = await fetch(base + url, opts);
  const t = await r.text();
  let b; try { b = JSON.parse(t); } catch { b = t; }
  if (!r.ok) throw new Error(`${url} → ${r.status} ${JSON.stringify(b).slice(0, 400)}`);
  return b;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const topic = process.argv[2] || '如何自动发布公众号';
console.log('topic:', topic);
const r = await j('/api/courseware/auto', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ topic })
});
console.log('taskId:', r.taskId, 'slides:', r.slides, 'renderId:', r.renderId, 'total:', r.totalDurationSeconds + 's');

for (let i = 0; i < 60; i++) {
  await sleep(5000);
  const t = await j(`/api/video-tasks/${r.taskId}`, {});
  console.log(`poll ${i + 1}: ${t.status} ${t.progress}% ${t.error ? '错误=' + t.error : ''}`);
  if (t.status === 'done') { console.log('DONE', t.video_path); break; }
  if (['failed', 'blocked', 'canceled'].includes(t.status)) { console.log('STOP', t.status, t.error); break; }
}
