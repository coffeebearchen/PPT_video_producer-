import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db.mjs';
import { MUSIC_TRACKS } from './music.mjs';

export const MUSIC_DIR = path.join(DATA_DIR, 'music');
const LIB_FILE = path.join(MUSIC_DIR, 'library.json');

function ensure() {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
  if (!fs.existsSync(LIB_FILE)) fs.writeFileSync(LIB_FILE, '[]', 'utf8');
}
function readLib() {
  ensure();
  try { return JSON.parse(fs.readFileSync(LIB_FILE, 'utf8')); } catch { return []; }
}
function writeLib(list) { ensure(); fs.writeFileSync(LIB_FILE, JSON.stringify(list, null, 2), 'utf8'); }

export function listMusic() {
  const builtins = Object.values(MUSIC_TRACKS).map(t => ({
    id: t.id, name: t.label, category: t.id === 'pulse' ? '科技' : (t.id === 'minimal' ? '叙事' : '其他'),
    tags: t.tags, bpm: t.bpm, builtin: true, file: t.file
  }));
  const uploaded = readLib().map(t => ({ ...t, builtin: false }));
  return [...builtins, ...uploaded];
}

export function addUploadedMusic(buffer, originalName, meta = {}) {
  ensure();
  const ext = path.extname(originalName || '').toLowerCase();
  if (!['.wav', '.mp3', '.m4a', '.aac'].includes(ext)) throw new Error('只支持 wav / mp3 / m4a / aac');
  const id = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const file = id + ext;
  fs.writeFileSync(path.join(MUSIC_DIR, file), buffer);
  const entry = {
    id, name: String(meta.name || originalName || id).slice(0, 40),
    category: String(meta.category || '其他').slice(0, 20),
    tags: String(meta.tags || '').split(/[,，]/).map(x => x.trim()).filter(Boolean).slice(0, 12),
    bpm: Number(meta.bpm) || 0,
    file, created_at: new Date().toISOString()
  };
  const list = readLib();
  list.push(entry);
  writeLib(list);
  return entry;
}

export function resolveMusicFile(id) {
  const track = listMusic().find(t => t.id === id);
  if (!track) return '';
  if (track.builtin) return path.join(process.cwd(), 'renderer', 'assets', track.file);
  return path.join(MUSIC_DIR, track.file);
}

export function updateUploadedMusic(id, input = {}) {
  const list = readLib();
  const idx = list.findIndex(t => t.id === id);
  if (idx < 0) throw new Error('只能编辑上传曲目');
  const entry = list[idx];
  if (input.name !== undefined) entry.name = String(input.name || entry.name).slice(0, 40);
  if (input.category !== undefined) entry.category = String(input.category || '其他').slice(0, 20);
  if (input.tags !== undefined) {
    entry.tags = (Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(/[,，]/))
      .map(x => String(x).trim()).filter(Boolean).slice(0, 12);
  }
  if (input.bpm !== undefined) entry.bpm = Number(input.bpm) || 0;
  entry.updated_at = new Date().toISOString();
  writeLib(list);
  return { ...entry, builtin: false };
}

export function recommendMusic({ text = '', category = '', limit = 3 } = {}) {
  const hay = String(text || '').toLowerCase();
  const tracks = listMusic().filter(t => t.id !== 'none');
  const scored = tracks.map(t => {
    let score = 0;
    const reasons = [];
    if (category && t.category === category) { score += 4; reasons.push(`分类匹配「${category}」`); }
    for (const tag of t.tags || []) {
      const key = String(tag).toLowerCase();
      if (key && hay.includes(key)) { score += 3; reasons.push(`命中标签「${tag}」`); }
    }
    for (const word of [t.name, t.category]) {
      const key = String(word || '').toLowerCase();
      if (key && hay.includes(key)) score += 1;
    }
    if (!reasons.length) reasons.push('通用备选');
    return { ...t, score, reasons: [...new Set(reasons)].slice(0, 3) };
  }).sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), 'zh'));
  return {
    recommended: scored[0] || null,
    alternatives: scored.slice(1, 1 + Math.max(2, limit - 1)),
    total: scored.length,
    query: { text, category }
  };
}

export function deleteUploadedMusic(id) {
  const list = readLib();
  const idx = list.findIndex(t => t.id === id);
  if (idx < 0) return false;
  const file = path.join(MUSIC_DIR, list[idx].file);
  try { fs.rmSync(file, { force: true }); } catch {}
  list.splice(idx, 1);
  writeLib(list);
  return true;
}
