// 讲解式自动编排（2B）—— 从 renderer/src/explainer/compile.ts 移植到服务端纯 JS。
// 用途：在平台侧把「标题 + 文案 + 句级时间码」编译成 Explainer2B 可渲染的 timeline。
// 关系识别规则与 renderer 保持一致；改动时两边需同步。

export function splitNarration(script) {
  return (String(script || '').match(/[^。！？!?；;\r\n]+[。！？!?；;]*/gu) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

const clean = (text) => String(text || '').trim().replace(/[。！？!?；;]+$/u, '');
const list = (text) => String(text || '').split(/[、，,]/u).map(clean).filter(Boolean);

export function selectRelation(sentence) {
  const line = clean(sentence);

  const branch = line.match(/^如果(.+?)[，,](?:就|则)?(.+?)[，,](?:否则|不然)(.+)$/u);
  if (branch) return { kind: 'choice', labels: branch.slice(1).map(clean) };

  const contrast = line.match(/^(.+?(?:要分开|各有用途|各不相同))[，,](.+?)[，,](.+)$/u);
  if (contrast) return { kind: 'contrast', heading: contrast[1], labels: contrast.slice(2).map(clean) };

  const cause = line.match(/^因为(.+?)[，,](?:所以|因此)(.+)$/u);
  if (cause) return { kind: 'cause', labels: cause.slice(1).map(clean) };

  const sequence = line.match(/(?:^|[，,])先(.+?)[，,]再(.+?)(?:[，,](?:最后|然后)(.+))?$/u);
  if (sequence) return { kind: 'sequence', labels: sequence.slice(1).filter(Boolean).map(clean) };

  const enumerated = line.match(/^(.+?)[：:](.+)$/u);
  if (enumerated) {
    const heading = enumerated[1];
    const labels = list(enumerated[2]);
    if (labels.length >= 3 && labels.length <= 4 && /循环|反复/u.test(heading)) return { kind: 'cycle', heading, labels };
    if (labels.length >= 2 && labels.length <= 4 && /清单|核对|检查/u.test(heading)) return { kind: 'checklist', heading, labels };
  }

  const keyItems = line.match(/^(.*?)(?:需要的是|包含|分别是)(.+)$/u);
  if (keyItems) {
    const labels = list(keyItems[2]).flatMap((part) => part.split(/和/u)).map(clean).filter(Boolean);
    if (labels.length >= 2 && labels.length <= 4) return { kind: 'point', labels };
  }

  const clauses = list(line);
  return { kind: 'point', labels: clauses.length <= 4 ? clauses : [line] };
}

// 字数等比估算句级时间码（无真实 TTS 对齐时的兜底；不宣称精确对齐）。
// 保证：单调递增、不重叠、末句 endMs === durationMs、每句至少 500ms。
export function estimateCues(script, durationMs) {
  const sentences = splitNarration(script);
  if (!sentences.length) return [];
  const weights = sentences.map((s) => Math.max(1, s.length));
  const total = weights.reduce((a, b) => a + b, 0);
  const starts = [];
  let cursor = 0;
  for (let i = 0; i < sentences.length; i++) {
    starts.push(cursor);
    if (i < sentences.length - 1) cursor += Math.max(500, Math.round(durationMs * weights[i] / total));
  }
  return sentences.map((text, i) => ({
    text,
    startMs: starts[i],
    endMs: i < sentences.length - 1 ? starts[i + 1] : durationMs,
  }));
}

// 与 renderer 的 compileExplainer 同构，输入 {title, script, style, cues, durationMs, voiceSrc, source?}
export function compileExplainer(input) {
  const { cues, durationMs, voiceSrc, style = 'industrial' } = input;
  const title = String(input.title || '').trim();
  const sentences = splitNarration(input.script);
  if (!title || !voiceSrc || !Number.isFinite(durationMs) || durationMs <= 0) throw new Error('缺少标题、配音或有效时长。');
  if (sentences.length < 8) throw new Error('请至少提供八句可独立讲解的文案。');
  if (sentences.length !== cues.length) throw new Error('句级时间码数量与文案不匹配。');
  cues.forEach((cue, index) => {
    if (String(cue.text || '').trim() !== sentences[index] || !Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs)
      || cue.startMs < (cues[index - 1]?.endMs ?? 0) || cue.endMs <= cue.startMs || cue.endMs > durationMs) {
      throw new Error(`第 ${index + 1} 句文案或时间码无效。`);
    }
  });

  const groups = cues.map((cue) => ({ cues: [cue], relation: selectRelation(cue.text) }));
  while (groups.length > 12) {
    let joinAt = 1;
    let best = Infinity;
    for (let index = 1; index < groups.length - 2; index++) {
      const left = groups[index];
      const right = groups[index + 1];
      const score = right.cues[right.cues.length - 1].endMs - left.cues[0].startMs
        + (left.relation.kind === right.relation.kind ? 0 : 1500);
      if (score < best) { best = score; joinAt = index; }
    }
    const left = groups[joinAt];
    const right = groups[joinAt + 1];
    groups.splice(joinAt, 2, { cues: [...left.cues, ...right.cues], relation: left.relation });
  }

  const scenes = groups.map(({ cues: groupCues, relation }, index) => ({
    sceneId: `explainer-${index + 1}`,
    startMs: index === 0 ? 0 : groupCues[0].startMs,
    endMs: groups[index + 1]?.cues[0].startMs ?? durationMs,
    componentName: 'ExplainerBoard',
    transitionIn: 'fade_blur',
    initialProps: relation,
    stateSteps: groupCues.slice(1).map((cue, cueIndex) => {
      const nextRelation = selectRelation(cue.text);
      return {
        stepId: `sentence-change-${cueIndex + 1}`,
        triggerMs: cue.startMs,
        propPatches: { ...nextRelation, heading: nextRelation.heading ?? '' },
      };
    }),
  }));

  return {
    version: '1.0',
    source: input.source?.trim() || undefined,
    projectMeta: {
      title, width: 1080, height: 1920, fps: 30, durationMs, style,
      themePalette: {
        bgCanvas: '#0B1210', primaryHuman: '#AEC56B', secondaryAi: '#A4B0A6',
        accentWarning: '#D99C4A', dangerStrike: '#B96850', highlightGold: '#D99C4A',
      },
    },
    audioTracks: { masterVoiceover: { src: voiceSrc, volume: 1 }, sfxEvents: [] },
    scenes,
    subtitles: cues.map((cue, index) => ({ ...cue, id: `sentence-${index + 1}`, highlightKeywords: [] })),
  };
}
