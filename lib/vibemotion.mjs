import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT } from './db.mjs';
import { TEMPLATES, PALETTES } from './element-catalog.mjs';
import { randomDecor, pickDecorForScript } from './element-assets.mjs';

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

  const style = String(task.style || 'industrial');
  if (['industrial', 'clean', 'dynamic'].includes(style)) {
    const labels = sentences.slice(0, 4).map(s => s.slice(0, 9));
    const kindMap = { causal: 'causal', contrast: 'branch', misconception: 'causal', checklist: 'layers', timeline: 'flow', pipeline: 'flow', boundary: 'branch', analogy: 'branch' };
    const kind = kindMap[structure] || 'flow';
    const gscene = (id, start, end, props, steps) => scene(id, start, end, 'GraphicScene', props, steps);
    const scenes = [
      gscene('s1', 0, mid2, {
        family: 'process', kind, title, claim: s0, labels: labels.length ? labels : ['第一步', '第二步', '第三步'],
        source: '来源：AI 生成 · 示意数据', progress: 0, active: 0, style
      }, [{ stepId: 'a', triggerMs: Math.round(mid2 * 0.4), propPatches: { progress: 1 } }, { stepId: 'b', triggerMs: Math.round(mid2 * 0.75), propPatches: { active: 1 } }]),
      gscene('s2', mid2, durationMs, {
        family: 'chart', kind: 'ring', title, claim: sLast, labels: labels.slice(0, 3), values: [65, 82, 54],
        source: '来源：AI 生成 · 示意数据', progress: 0, active: 0, style
      }, [{ stepId: 'a', triggerMs: Math.round(mid2 + (durationMs - mid2) * 0.4), propPatches: { progress: 1 } }])
    ];
    return {
      version: '1.0',
      projectMeta: { title, width: 1080, height: 1920, fps: 30, durationMs, style, themePalette: CREAM_PALETTE },
      audioTracks: {
        sfxEvents: [{ atMs: Math.min(600, durationMs - 500), sfxType: 'pop', volume: 0.4 }],
        ...(task.voice_path ? { masterVoiceover: { src: task.voice_path } } : {})
      },
      scenes,
      subtitles: [{ id: 'c1', startMs: 0, endMs: durationMs, text: script || title, highlightKeywords: [title] }]
    };
  }

  const tpl = TEMPLATES.find(t => t.templateId === task.template);
  if (tpl && Array.isArray(tpl.sceneFlow) && tpl.sceneFlow.length) {
    const ids = tpl.sceneFlow;
    const seg = Math.floor(durationMs / ids.length);
    const buildScene = (id, start, end, i) => {
      const label = sentences[i] || sLast;
      const short = label.slice(0, 9);
      switch (id) {
        case 'flowchart': return scene(`sc${i}`, start, end, 'FlowChart', { title, kicker: '动 态 流 程', nodes: flowNodes, activeStep: 0 }, flowNodes.map((n, j) => ({ stepId: `a${j}`, triggerMs: Math.round(start + 400 + j * (end - start - 600) / 3), propPatches: { activeStep: j + 1 } })));
        case 'pipeline': return scene(`sc${i}`, start, end, 'PipelineArchitecture', { sectionHeader: title, kicker: '系 统 图 解', stages, focusedStageIndex: 0 }, stages.map((s, j) => ({ stepId: `a${j}`, triggerMs: Math.round(start + 300 + j * (end - start - 500) / 3), propPatches: { focusedStageIndex: j } })));
        case 'comparison': return scene(`sc${i}`, start, end, 'ComparisonSplitCard', { headline: title, question: '?', left: { title: '看起来', sub: sentences[i] || s0, tone: 'waiting' }, right: { title: '其实', sub: sentences[i + 1] || s1, tone: 'active' } }, []);
        case 'mythbuster': return scene(`sc${i}`, start, end, 'MythBusterStrike', { badgeLabel: '误区', beforeText: sentences[i] || s0, afterText: sentences[i + 1] || s1, active: false }, [{ stepId: 'a', triggerMs: Math.round(start + (end - start) * 0.6), propPatches: { active: true } }]);
        case 'spotlight': return scene(`sc${i}`, start, end, 'SpotlightPillars', { sectionHeader: title, pillars: flowNodes.map((n, j) => ({ indexLabel: String(j + 1), title: n.label, topFloatingBadge: { type: j === 2 ? 'text_badge' : 'waveform' }, bottomTakeawayText: `第 ${j + 1} 步` })), activePillarIndex: null }, flowNodes.map((n, j) => ({ stepId: `a${j}`, triggerMs: Math.round(start + 400 + j * (end - start - 600) / 3), propPatches: { activePillarIndex: j } })));
        case 'timeline': return scene(`sc${i}`, start, end, 'EvolutionTimeline', { sectionHeader: title, nodes: timelineNodes, activeNodeIndex: 0 }, timelineNodes.map((n, j) => ({ stepId: `a${j}`, triggerMs: Math.round(start + 400 + j * (end - start - 600) / 3), propPatches: { activeNodeIndex: j } })));
        case 'counter': return scene(`sc${i}`, start, end, 'Counter', { title: '关键数字', items: [{ label: '指标 A', value: 96, suffix: '%', color: 'gold' }, { label: '指标 B', value: 18, suffix: 's', color: 'sage' }], progress: 1 }, []);
        case 'chart-bar': return scene(`sc${i}`, start, end, 'Chart', { title: short, kicker: '数 据 图 表', kind: 'bar', series: [{ name: '增长', values: [3, 5, 4, 7], color: 'gold' }], xLabels: ['1', '2', '3', '4'] }, []);
        case 'chart-line': return scene(`sc${i}`, start, end, 'Chart', { title: short, kind: 'line', series: [{ name: '趋势', values: [2, 4, 3, 6], color: 'gold' }], xLabels: ['1', '2', '3', '4'] }, []);
        case 'dashboard': return scene(`sc${i}`, start, end, 'ConcurrentDashboard', { caption: short, orbState: { mode: 'speaking_wave', label: '通过', subBadge: '可用', colorHex: '#C73520' }, tasks: [{ title: '生成', progress: 1, status: 'completed' }, { title: '校验', progress: 0.7, status: 'running' }], contextBanner: { icon: '▸', text: '执行与校验同步', active: true } }, []);
        default: return scene(`sc${i}`, start, end, 'KineticTypography', { lines: [short, sentences[i + 1] || ''], highlightKeywords: [short] }, []);
      }
    };
    const scenes = ids.map((id, i) => buildScene(id, i * seg, Math.min((i + 1) * seg, durationMs), i));
    scenes.forEach(s => { if (!s.initialProps.decor) s.initialProps.decor = pickDecorForScript(script, tpl.elements?.doodles === true); });
    const palette = PALETTES[tpl.palette] || CREAM_STYLE;
    return {
      version: '1.0',
      projectMeta: { title, width: 1080, height: 1920, fps: 30, durationMs, themePalette: palette.colors },
      audioTracks: {
        sfxEvents: [{ atMs: Math.min(600, durationMs - 500), sfxType: 'pop', volume: 0.4 }],
        ...(task.voice_path ? { masterVoiceover: { src: task.voice_path } } : {})
      },
      scenes,
      subtitles: [{ id: 'c1', startMs: 0, endMs: durationMs, text: script || title, highlightKeywords: [title] }]
    };
  }

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
  scenes.forEach(s => { if (!s.initialProps.decor) s.initialProps.decor = pickDecorForScript(script, false); });

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

export async function renderVibeMotion(task, outDir, onProgress = () => {}, timelineOverride = null, styleOverride = null) {
  fs.mkdirSync(outDir, { recursive: true });
  const timeline = timelineOverride || buildTimeline(task);
  const style = styleOverride || CREAM_STYLE;
  fs.writeFileSync(DATA_JSON, JSON.stringify(timeline, null, 2));
  fs.writeFileSync(STYLE_JSON, JSON.stringify(style, null, 2));
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
