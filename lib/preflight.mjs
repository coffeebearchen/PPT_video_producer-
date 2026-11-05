import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const FRAME_LABELS = [
  '第一页稳定',
  '第一页入场后',
  '第一页结论',
  '转场前',
  '转场后',
  '第二页',
  '第三页',
  '结论页',
  '最后一帧'
];

function loadDotEnv() {
  const file = path.resolve('.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', timeout: 30000 });
}

function probe(videoPath) {
  const r = run('ffprobe', [
    '-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', videoPath
  ]);
  if (r.status !== 0) throw new Error(`ffprobe 失败: ${(r.stderr || '').slice(-400)}`);
  return JSON.parse(r.stdout);
}

function extract(videoPath, framesDir, time, index) {
  const file = path.join(framesDir, `frame-${index}.png`);
  const r = run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', String(time), '-i', videoPath,
    '-frames:v', '1', '-q:v', '2', file
  ]);
  if (r.status !== 0 || !fs.existsSync(file) || fs.statSync(file).size < 1000) {
    throw new Error(`抽帧失败 @${time}s`);
  }
  return file;
}

function parseJson(text) {
  const raw = String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

async function visionCheck(frames) {
  loadDotEnv();
  const key = process.env.DASHSCOPE_API_KEY || '';
  const base = process.env.PREFLIGHT_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = process.env.PREFLIGHT_MODEL || 'qwen3-vl-plus';
  if (!key) {
    return {
      status: 'skipped',
      model,
      issues: [{ severity: 'warn', code: 'vision_not_configured', message: '视觉预检未配置：没有 DASHSCOPE_API_KEY', suggest: '在 studio/.env 配置后重新预检' }]
    };
  }

  const content = [{
    type: 'text',
    text: `你是竖屏短视频的画面质检。下面按顺序是 9 个关键帧，每帧对应秒数和页面阶段：
${frames.map((f, i) => `${i + 1}. ${f.time}s / ${f.label}`).join('\n')}

只检查画面，不判断事实。重点找：
- 文字被裁切、贴边、重叠、溢出；
- 低对比度、看不清；
- 页面缺元素、元素明显错位；
- 转场露出半张旧页面；
- 封面/标题不可读；
- 明显闪烁或黑帧。

只输出 JSON，不要解释：
{"issues":[{"frame":1,"severity":"warn","message":"具体问题","suggest":"建议"}]}
没有问题就输出 {"issues":[]}。`
  }];
  for (const f of frames) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${fs.readFileSync(f.file).toString('base64')}` }
    });
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(120000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`视觉接口 ${res.status}: ${text.slice(0, 500)}`);
  const data = JSON.parse(text);
  const parsed = parseJson(data?.choices?.[0]?.message?.content || '');
  const issues = (parsed?.issues || []).map(x => ({
    severity: 'warn',
    code: 'vision',
    frame: Math.max(1, Math.min(9, Number(x.frame) || 1)),
    message: String(x.message || '').slice(0, 240),
    suggest: String(x.suggest || '').slice(0, 240)
  })).filter(x => x.message);
  return { status: 'done', model, issues };
}

export async function runPreflight({ renderId, videoPath, outDir, duration = 18, previewCount = 3 }) {
  const framesDir = path.join(outDir, 'check');
  fs.mkdirSync(framesDir, { recursive: true });
  const issues = [];
  const technical = {};

  let info;
  try { info = probe(videoPath); } catch (e) {
    return {
      status: 'block',
      technical: { error: e.message },
      frames: [],
      issues: [{ severity: 'critical', code: 'probe_failed', message: e.message, suggest: '检查视频文件是否完整' }],
      model: '',
      checked_at: new Date().toISOString()
    };
  }

  const v = (info.streams || []).find(s => s.codec_type === 'video');
  const a = (info.streams || []).find(s => s.codec_type === 'audio');
  technical.width = v?.width || 0;
  technical.height = v?.height || 0;
  technical.duration = Number(info.format?.duration || duration);
  technical.audio = Boolean(a);
  technical.video_codec = v?.codec_name || '';

  if (!v) issues.push({ severity: 'critical', code: 'no_video', message: '没有视频流', suggest: '重新渲染' });
  if (technical.width !== 1080 || technical.height !== 1920) {
    issues.push({ severity: 'critical', code: 'bad_size', message: `分辨率 ${technical.width}×${technical.height}，不是 1080×1920`, suggest: '检查渲染尺寸' });
  }
  if (!a) issues.push({ severity: 'critical', code: 'no_audio', message: '没有音轨', suggest: '检查 BGM 混流' });
  if (technical.duration < 5) issues.push({ severity: 'critical', code: 'too_short', message: `时长 ${technical.duration}s，过短`, suggest: '检查渲染' });
  if (previewCount < 3) issues.push({ severity: 'warn', code: 'few_previews', message: `只有 ${previewCount} 张预览帧`, suggest: '检查三页模板' });

  const d = technical.duration || duration;
  const times = [0.2, 1.2, 3.2, 5.2, 5.8, 8.0, 11.0, 14.0, d >= 20 ? 19.2 : Math.max(0.5, d - 0.4)];
  const labels = d >= 20 ? [...FRAME_LABELS.slice(0, 8), '金句页'] : FRAME_LABELS;
  const frames = [];
  for (let i = 0; i < times.length; i++) {
    try {
      const file = extract(videoPath, framesDir, times[i], i + 1);
      frames.push({ index: i + 1, time: times[i], label: labels[i], file, path: `media/${renderId}/check/frame-${i + 1}.png` });
    } catch (e) {
      issues.push({ severity: 'critical', code: 'frame_failed', message: `第 ${i + 1} 帧抽取失败：${e.message}`, suggest: '检查 ffmpeg' });
    }
  }

  let vision = { status: 'skipped', model: '', issues: [] };
  if (frames.length) {
    try {
      vision = await visionCheck(frames);
      issues.push(...(vision.issues || []));
    } catch (e) {
      issues.push({ severity: 'warn', code: 'vision_error', message: `视觉预检失败：${e.message}`, suggest: '可人工看片，或稍后重新预检' });
    }
  }

  const critical = issues.some(x => x.severity === 'critical');
  const status = critical ? 'block' : (issues.length ? 'warn' : 'pass');
  return {
    status,
    technical,
    frames: frames.map(f => ({ index: f.index, time: f.time, label: f.label, path: f.path })),
    issues,
    vision: { status: vision.status, model: vision.model },
    checked_at: new Date().toISOString()
  };
}
