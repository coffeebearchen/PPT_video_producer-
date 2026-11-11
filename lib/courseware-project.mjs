// 课件项目层：本主题素材 manifest + 任务目录。不含渲染、不碰共用素材库。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const COURSEWARE_ROOT = path.join(process.cwd(), 'data', 'media', 'courseware');

export function safeTaskId(taskId) {
  const s = String(taskId || '');
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('taskId 不合法');
  return s;
}

export function taskDir(taskId) {
  return path.join(COURSEWARE_ROOT, safeTaskId(taskId));
}

export function manifestPath(taskId) {
  return path.join(taskDir(taskId), 'manifest.json');
}

export function readManifest(taskId) {
  const p = manifestPath(taskId);
  if (!fs.existsSync(p)) return { taskId: safeTaskId(taskId), revision: 0, assets: [] };
  try {
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { taskId: safeTaskId(taskId), revision: Number(m.revision) || 0, assets: Array.isArray(m.assets) ? m.assets : [] };
  } catch {
    return { taskId: safeTaskId(taskId), revision: 0, assets: [] };
  }
}

export function writeManifest(taskId, manifest) {
  fs.mkdirSync(taskDir(taskId), { recursive: true });
  fs.writeFileSync(manifestPath(taskId), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export function addAsset(taskId, { kind, data, mime, name }) {
  const id = 'a_' + crypto.randomBytes(6).toString('hex');
  const mimeStr = String(mime || '');
  const ext = kind === 'video'
    ? 'mp4'
    : mimeStr.includes('png') ? 'png'
    : mimeStr.includes('gif') ? 'gif'
    : mimeStr.includes('wav') ? 'wav'
    : 'jpg';
  const fileName = `${id}.${ext}`;
  const dir = path.join(taskDir(taskId), 'assets');
  fs.mkdirSync(dir, { recursive: true });
  const buf = Buffer.from(String(data || '').replace(/^data:[^;]+;base64,/, ''), 'base64');
  if (!buf.length) throw new Error('素材为空');
  fs.writeFileSync(path.join(dir, fileName), buf);
  const m = readManifest(taskId);
  const asset = {
    id,
    kind: kind === 'video' ? 'video' : 'image',
    fileName,
    name: String(name || fileName),
    mime: mimeStr,
    createdAt: new Date().toISOString()
  };
  m.assets.push(asset);
  m.revision = (m.revision || 0) + 1;
  writeManifest(taskId, m);
  return asset;
}

export function listAssets(taskId) {
  return readManifest(taskId).assets;
}

export function removeAsset(taskId, assetId) {
  const m = readManifest(taskId);
  const idx = m.assets.findIndex((a) => a.id === assetId);
  if (idx === -1) throw new Error('素材不存在');
  const [asset] = m.assets.splice(idx, 1);
  try { fs.rmSync(path.join(taskDir(taskId), 'assets', asset.fileName), { force: true }); } catch {}
  m.revision = (m.revision || 0) + 1;
  writeManifest(taskId, m);
  return asset;
}

export function newRenderId() {
  return 'cr_' + crypto.randomBytes(6).toString('hex');
}

export function stagingDirFor(taskId, renderId) {
  return path.join(process.cwd(), 'engines', 'vibemotion', 'renderer', 'public', 'courseware', safeTaskId(taskId), String(renderId));
}

export function snapshotDirFor(taskId, renderId) {
  return path.join(process.cwd(), 'data', 'media', 'video-tasks', safeTaskId(taskId), 'courseware', String(renderId));
}
