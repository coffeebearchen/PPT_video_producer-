import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT } from './db.mjs';

export const ENGINE_DIR = path.join(ROOT, 'engines', 'vibemotion', 'renderer');
export const DATA_JSON = path.join(ENGINE_DIR, 'src', 'data', 'timeline_dsl.json');
export const STYLE_JSON = path.join(ENGINE_DIR, 'style.settings.json');

export const CREAM_PALETTE = {
  bg: '#F3EDE1',
  ink: '#101112',
  gold: '#C73520',
  sage: '#6F8F6F',
  coral: '#C73520',
  amber: '#D9A24E',
  muted: '#7B7468'
};

export function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/[。！？!?；;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function buildTimeline(task = {}) {
  const title = String(task.title || '自动生成');
  const structure = String(task.structure_type || 'causal');
  const script = String(task.script || task.topic || '');
  const durationMs = Math.max(5000, Number(task.duration_ms) || 30000);
  const sentences = splitSentences(script).slice(0, 6);
  const subtitleText = sentences.join('。') || title;
  const nodeLabels = sentences.length
    ? sentences.slice(0, 3).map((s, i) => ({ indexLabel: String(i + 1), title: s.slice(0, 8) }))
    : [{ indexLabel: '1', title: '输入' }, { indexLabel: '2', title: '处理' }, { indexLabel: '3', title: '输出' }];

  const sceneMid = Math.floor(durationMs / 2);
  const map = {
    contrast: { componentName: 'ComparisonSplitCard', props: { headline: title, question: '区别在哪', left: { title: '看起来', sub: sentences[0] || '' }, right: { title: '其实', sub: sentences[1] || '' } } },
    misconception: { componentName: 'MythBusterStrike', props: { beforeText: sentences[0] || '误区', afterText: sentences[1] || '正解' } },
    checklist: { componentName: 'FlowChart', props: { title, nodes: nodeLabels } },
    boundary: { componentName: 'SpotlightPillars', props: { sectionHeader: title, pillars: nodeLabels.slice(0, 3).map((n, i) => ({ title: n.title })) } },
    analogy: { componentName: 'ComparisonSplitCard', props: { headline: title, question: '类比', left: { title: 'A', sub: sentences[0] || '' }, right: { title: 'B', sub: sentences[1] || '' } } },
    causal: { componentName: 'FlowChart', props: { title, nodes: nodeLabels } },
    pipeline: { componentName: 'FlowChart', props: { title, nodes: nodeLabels } },
    timeline: { componentName: 'EvolutionTimeline', props: { sectionHeader: title, nodes: nodeLabels } }
  };
  const first = map[structure] || map.causal;
  const scenes = [
    {
      sceneId: 's1', startMs: 0, endMs: sceneMid, transitionIn: 'fade_blur',
      componentName: first.componentName,
      initialProps: first.props,
      stateSteps: nodeLabels.slice(0, 3).map((n, i) => ({
        stepId: `step${i}`, triggerMs: Math.round(500 + (i * (sceneMid - 500)) / 3), propPatches: { activeStep: i + 1 }
      }))
    },
    {
      sceneId: 's2', startMs: sceneMid, endMs: durationMs, transitionIn: 'fade_blur',
      componentName: 'KineticTypography',
      initialProps: { lines: [sentences.slice(-1).join('') || '记住这一点'], highlightKeywords: [] },
      stateSteps: []
    }
  ];
  return {
    version: '1.0',
    projectMeta: { title, width: 1080, height: 1920, fps: 30, durationMs, themePalette: CREAM_PALETTE },
    audioTracks: {
      sfxEvents: [{ atMs: Math.min(600, durationMs - 500), sfxType: 'pop', volume: 0.4 }],
      ...(task.voice_path ? { masterVoiceover: { src: task.voice_path } } : {})
    },
    scenes,
    subtitles: [
      { id: 'c1', startMs: 0, endMs: durationMs, text: subtitleText, highlightKeywords: [title] }
    ]
  };
}

export function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts.cwd || ENGINE_DIR, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d.toString(); if (opts.onLog) opts.onLog(d.toString()); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('close', code => resolve({ code: code ?? 1, out, err }));
  });
}

export async function renderVibeMotion(task, outDir, onProgress = () => {}, timelineOverride = null) {
  fs.mkdirSync(outDir, { recursive: true });
  const timeline = timelineOverride || buildTimeline(task);
  fs.writeFileSync(DATA_JSON, JSON.stringify(timeline, null, 2));
  fs.writeFileSync(STYLE_JSON, JSON.stringify(CREAM_PALETTE, null, 2));
  const id = task.id;
  const videoPath = path.join(outDir, 'video.mp4');
  const coverPath = path.join(outDir, 'cover.png');
  onProgress(25, 'render_start');
  const render = await runCommand('npx', ['remotion', 'render', 'src/index.ts', 'VibeMotion', videoPath, '--codec=h264', '--overwrite'], {
    cwd: ENGINE_DIR,
    onLog: (chunk) => {
      const m = chunk.match(/Rendered\s+(\d+)\/(\d+)/);
      if (m) {
        const pct = Math.min(90, 25 + Math.round((Number(m[1]) / Number(m[2])) * 65));
        onProgress(pct, 'rendering');
      }
    }
  });
  if (render.code !== 0) throw new Error(render.err.slice(-800) || render.out.slice(-800));
  onProgress(92, 'rendered');
  const cover = await runCommand('npx', ['remotion', 'still', 'src/index.ts', 'VibeMotion', coverPath, '--frame=0', '--overwrite'], { cwd: ENGINE_DIR });
  if (cover.code !== 0) {
    const ff = await runCommand('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', videoPath, '-frames:v', '1', coverPath.replace('.png', '.jpg')]);
    if (ff.code === 0) {
      fs.renameSync(coverPath.replace('.png', '.jpg'), coverPath);
    } else {
      throw new Error(cover.err.slice(-500));
    }
  }
  onProgress(100, 'done');
  return { videoPath, coverPath, durationMs: Number(task.duration_ms) || 30000 };
}
