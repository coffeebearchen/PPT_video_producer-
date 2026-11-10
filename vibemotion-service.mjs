import http from 'node:http';
import path from 'node:path';
import { renderVibeMotion } from './lib/vibemotion.mjs';

const PORT = Number(process.env.VIBEMOTION_PORT || 5001);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', d => data += d);
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  if (req.method === 'GET' && req.url === '/health') {
    res.end(JSON.stringify({ ok: true, service: 'vibemotion' }));
    return;
  }
  if (req.method === 'POST' && req.url === '/render') {
    try {
      const body = await readBody(req);
      const outDir = path.resolve(body.outDir || 'out/task');
      const result = await renderVibeMotion({ ...body, id: body.id || 'task' }, outDir, () => {});
      res.end(JSON.stringify({ ok: true, video: result.videoPath, cover: result.coverPath, durationMs: result.durationMs }));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[vibemotion] http://127.0.0.1:${PORT}`);
});
