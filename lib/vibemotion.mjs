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

export const CREAM_STYLE = { colors: CREAM_PALETTE };

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
  const sentences = splitSentences(script).slice(0, 8);
  const s0 = sentences[0] || '第一步';
  const s1 = sentences[1] || '第二步';
  const s2 = sentences[2] || '第三步';
  const sLast = sentences.slice(-1).join('') || '记住这一点';
  const flowNodes = [s0, s1, s2].map((label, i) => ({ id: `n${i + 1}`, label: label.slice(0, 9), sub: `第 ${i + 1} 步` }));
  const stages = flowNodes.map((n, i) => ({ code: `0${i + 1}`, title: n.label, themeColor: i === 2 ? '#C73520' : '#6F8F6F' }));
  const timelineNodes = flowNodes.map((n, i) => ({ title: n.label, metaTag: `阶段 ${i + 1}`, accentColor: i === 2 ? '#C73520' : '#D9A24E' }));

  const mid1 = Math.round(durationMs * 0.38);
  const mid2 = Math.round(durationMs * 0.72);

  const scene = (id, start, end, componentName, initialProps, steps) => ({
    sceneId: id, startMs: start, endMs: end, transitionIn: 'fade_blur', componentName, initialProps, stateSteps: steps
  });

  const mainScenes = {
    causal: [
      scene('s1', 0, mid1, 'FlowChart', { title, kicker: '动 态 流 程', nodes: flowNodes, activeStep: 0 }, flowNodes.map((n, i) => ({ stepId: `a${i}`, triggerMs: Math.round(400 + i * (mid1 - 600) / 3), propPatches: { activeStep: i + 1 } }))),
      scene('s2', mid1, mid2, 'PipelineArchitecture', { sectionHeader: title, kicker: '系 统 图 解', stages, focusedStageIndex: 0 }, stages.map((s, i) => ({ stepId: `b${i}`, triggerMs: Math.round(300 + i * (mid2 - mid1 - 500) / 3), propPatches: { focusedStageIndex: i } })))
    ],
    pipeline: [
      scene('s1', 0, mid1, 'PipelineArchitecture', { sectionHeader: title, kicker: '系 统 图 解', stages, focusedStageIndex: 0 }, stages.map((s, i) => ({ stepId: `a${i}`, triggerMs: Math.round(300 + i * (mid1 - 500) / 3), propPatches: { focusedStageIndex: i } }))),
      scene('s2', mid1, mid2, 'FlowChart', { title, kicker: '动 态 流 程', nodes: flowNodes, activeStep: 0 }, flowNodes.map((n, i) => ({ stepId: `b${i}`, triggerMs: Math.round(400 + i * (mid2 - mid1 - 600) / 3), propPatches: { activeStep: i + 1 } })))
    ],
    contrast: [
      scene('s1', 0, mid1, 'ComparisonSplitCard', { headline: title, question: '?', left: { title: '看起来', sub: s0, tone: 'waiting' }, right: { title: '其实', sub: s1, tone: 'active' } }, [])
    ],
    misconception: [
      scene('s1', 0, mid1, 'MythBusterStrike', { badgeLabel: '误区', beforeText: s0, afterText: s1, active: false }, [{ stepId: 'a', triggerMs: Math.round(mid1 * 0.6), propPatches: { active: true } }])
    ],
    checklist: [
      scene('s1', 0, mid1, 'FlowChart', { title, kicker: '清 单 流 程', nodes: flowNodes, activeStep: 0 }, flowNodes.map((n, i) => ({ stepId: `a${i}`, triggerMs: Math.round(400 + i * (mid1 - 600) / 3), propPatches: { activeStep: i + 1 } })))
    ],
    boundary: [
      scene('s1', 0, mid1, 'SpotlightPillars', { sectionHeader: title, pillars: flowNodes.map((n, i) => ({ indexLabel: String(i + 1), title: n.label, topFloatingBadge: { type: i === 2 ? 'text_badge' : 'waveform', content: '1' }, bottomTakeawayText: `第 ${i + 1} 步` })), activePillarIndex: null }, flowNodes.map((n, i) => ({ stepId: `a${i}`, triggerMs: Math.round(400 + i * (mid1 - 600) / 3), propPatches: { activePillarIndex: i } }))),
      scene('s2', mid1, mid2, 'ComparisonSplitCard', { headline: title, question: '?', left: { title: '边界内', sub: s0, tone: 'active' }, right: { title: '边界外', sub: s1, tone: 'waiting' } }, [])
    ],
    analogy: [
      scene('s1', 0, mid1, 'ComparisonSplitCard', { headline: title, question: '≈', left: { title: 'A', sub: s0, tone: 'active' }, right: { title: 'B', sub: s1, tone: 'waiting' } }, [])
    ],
    timeline: [
      scene('s1', 0, mid1, 'EvolutionTimeline', { sectionHeader: title, nodes: timelineNodes, activeNodeIndex: 0 }, timelineNodes.map((n, i) => ({ stepId: `a${i}`, triggerMs: Math.round(400 + i * (mid1 - 600) / 3), propPatches: { activeNodeIndex: i } })))
    ]
  };
  const chosen = mainScenes[structure] || mainScenes.causal;
  const scenes = [
    ...chosen,
    scene('end', mid2, durationMs, 'KineticTypography', { lines: [sLast.slice(0, 12), '记住这一点'], highlightKeywords: [sLast.slice(0, 4)] }, [])
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
      { id: 'c1', startMs: 0, endMs: durationMs, text: script || title, highlightKeywords: [title] }
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
  fs.writeFileSync(STYLE_JSON, JSON.stringify(CREAM_STYLE, null, 2));
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
