// 文案分镜：一段展示思路 + 截图 → storyboard（截图页带 AI 定位的框）
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { detectHighlightRegion } from './courseware-detect.mjs';
import { composeCourseware } from './generator.mjs';

const ENV_FILE = path.join(process.cwd(), '.env');

function visionConfig() {
  let env = {};
  try { env = parseEnv(fs.readFileSync(ENV_FILE, 'utf8').replace(/^\uFEFF/, '')); } catch {}
  const get = (k) => String(process.env[k] ?? env[k] ?? '').trim();
  return { key: get('DASHSCOPE_API_KEY'), base: get('VISION_BASE_URL'), model: get('VISION_MODEL') };
}

async function describeImage(imagePath) {
  if (/\.(mp4|mov|webm)$/i.test(imagePath)) return `视频片段：${path.basename(imagePath)}`;
  const { key, base, model } = visionConfig();
  if (!key || !base || !model) return '';
  const bytes = fs.readFileSync(imagePath);
  const mime = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature: 0.1, max_tokens: 200,
        messages: [{ role: 'user', content: [
          { type: 'text', text: '一句话描述这张截图：是什么界面、有哪些主要按钮/区域。只输出一句话，不要解释。' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${bytes.toString('base64')}` } }
        ]}]
      }),
      signal: AbortSignal.timeout(60000)
    });
    if (!res.ok) return '';
    const data = await res.json();
    return String(data?.choices?.[0]?.message?.content || '').trim().slice(0, 200);
  } catch { return ''; }
}

export async function composeStoryboard({ script, images, style = 'industrial' }) {
  const described = [];
  for (const img of images) {
    const description = await describeImage(img.path);
    described.push({ ...img, description });
  }
  const gen = await composeCourseware({ script, screenshots: described });
  const slides = [];
  let idx = 0;
  for (const s of gen.slides) {
    const id = 's' + idx++;
    const narration = String(s.narration || s.text || '').trim();
    const base = { id, caption: narration || undefined, narration: narration ? { mode: 'tts', text: narration } : { mode: 'none' }, effects: (s.effects && typeof s.effects === 'object') ? s.effects : undefined };
    if (s.kind === 'screenshot') {
      const image = described[Number(s.shot)];
      if (!image) continue;
      let box = { x: 0.2, y: 0.35, w: 0.6, h: 0.3 };
      if (s.target) {
        const det = await detectHighlightRegion(image.path, String(s.target));
        // 只接受合理大小的框（按钮/下拉，不是整列/整屏）
        if (det.ok && det.box.w <= 0.7 && det.box.h <= 0.3 && det.box.w * det.box.h <= 0.2) box = det.box;
      }
      slides.push({ ...base, kind: 'screenshot', text: String(s.text || ''), assetId: image.id, highlight: box, annotation: 'circle', dim: 0.45 });
      continue;
    }
    if (s.kind === 'video') {
      const image = described[Number(s.shot)];
      if (!image) continue;
      slides.push({ ...base, kind: 'video', text: String(s.text || ''), assetId: image.id, muted: true, fit: 'contain' });
      continue;
    }
    if (s.kind === 'flow') {
      const labels = (s.nodes || []).filter(Boolean).slice(0, 4);
      if (labels.length < 2) continue;
      slides.push({ ...base, kind: 'flow', text: String(s.text || ''), nodes: labels.map((l, j) => ({ id: 'n' + j, label: String(l) })), edgePolicy: 'sequential' });
      continue;
    }
    if (s.kind === 'bullet') {
      slides.push({ ...base, kind: 'bullet', text: String(s.text || ''), bullets: (s.bullets || []).filter(Boolean).slice(0, 5) });
      continue;
    }
    if (s.kind === 'quote') {
      slides.push({ ...base, kind: 'quote', text: String(s.text || ''), body: s.body ? String(s.body) : undefined });
      continue;
    }
    slides.push({ ...base, kind: 'title', text: String(s.text || ''), body: s.body ? String(s.body) : undefined });
  }
  return { title: String(gen.title || '课件'), slides };
}
