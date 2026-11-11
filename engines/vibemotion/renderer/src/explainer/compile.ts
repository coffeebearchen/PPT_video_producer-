import type {Scene, TimelineDSL} from '../types';

type Style = NonNullable<TimelineDSL['projectMeta']['style']>;
export type RelationKind = 'sequence' | 'contrast' | 'choice' | 'cause' | 'checklist' | 'cycle' | 'point';
export type Relation = {kind: RelationKind; labels: string[]; heading?: string};
export type Cue = {text: string; startMs: number; endMs: number};
export type ExplainerInput = {
  title: string;
  script: string;
  style?: Style;
  cues: Cue[];
  durationMs: number;
  voiceSrc: string;
  source?: string;
};

type ExplainerScene = Omit<Scene, 'componentName' | 'initialProps'> & {
  componentName: 'ExplainerBoard';
  initialProps: Relation;
};

export type ExplainerTimeline = Omit<TimelineDSL, 'scenes'> & {scenes: ExplainerScene[]; source?: string};

export async function resolveNarration(
  input: {title: string; script?: string},
  writeScript?: (title: string) => Promise<string>,
): Promise<string> {
  const title = input.title.trim();
  const script = input.script?.trim();
  if (script && script !== title) return script;
  if (!title || !writeScript) throw new Error('请提供文案，或为标题配置写稿函数。');
  const draft = (await writeScript(title)).trim();
  if (!draft || draft === title) throw new Error('自动写稿未返回完整文案。');
  return draft;
}

export function splitNarration(script: string): string[] {
  return (script.match(/[^。！？!?；;\r\n]+[。！？!?；;]*/gu) ?? []).map((sentence) => sentence.trim()).filter(Boolean);
}

const clean = (text: string) => text.trim().replace(/[。！？!?；;]+$/u, '');
const list = (text: string) => text.split(/[、，,]/u).map(clean).filter(Boolean);

export function selectRelation(sentence: string): Relation {
  const line = clean(sentence);
  const branch = line.match(/^如果(.+?)[，,](?:就|则)?(.+?)[，,](?:否则|不然)(.+)$/u);
  if (branch) return {kind: 'choice', labels: branch.slice(1).map(clean)};

  const contrast = line.match(/^(.+?(?:要分开|各有用途|各不相同))[，,](.+?)[，,](.+)$/u);
  if (contrast) return {kind: 'contrast', heading: contrast[1], labels: contrast.slice(2).map(clean)};

  const cause = line.match(/^因为(.+?)[，,](?:所以|因此)(.+)$/u);
  if (cause) return {kind: 'cause', labels: cause.slice(1).map(clean)};

  const sequence = line.match(/(?:^|[，,])先(.+?)[，,]再(.+?)(?:[，,](?:最后|然后)(.+))?$/u);
  if (sequence) return {kind: 'sequence', labels: sequence.slice(1).filter(Boolean).map(clean)};

  const enumerated = line.match(/^(.+?)[：:](.+)$/u);
  if (enumerated) {
    const heading = enumerated[1];
    const labels = list(enumerated[2]);
    if (labels.length >= 3 && labels.length <= 4 && /循环|反复/u.test(heading)) return {kind: 'cycle', heading, labels};
    if (labels.length >= 2 && labels.length <= 4 && /清单|核对|检查/u.test(heading)) return {kind: 'checklist', heading, labels};
  }

  const keyItems = line.match(/^(.*?)(?:需要的是|包含|分别是)(.+)$/u);
  if (keyItems) {
    const labels = list(keyItems[2]).flatMap((part) => part.split(/和/u)).map(clean).filter(Boolean);
    if (labels.length >= 2 && labels.length <= 4) return {kind: 'point', labels};
  }
  const clauses = list(line);
  return {kind: 'point', labels: clauses.length <= 4 ? clauses : [line]};
}

export function compileExplainer(input: ExplainerInput): ExplainerTimeline {
  const {cues, durationMs, voiceSrc, style = 'industrial'} = input;
  const title = input.title.trim();
  const sentences = splitNarration(input.script);
  if (!title || !voiceSrc || !Number.isFinite(durationMs) || durationMs <= 0) throw new Error('缺少标题、配音或有效时长。');
  if (sentences.length < 8) throw new Error('请至少提供八句可独立讲解的文案。');
  if (sentences.length !== cues.length) throw new Error('句级时间码数量与文案不匹配。');
  cues.forEach((cue, index) => {
    if (cue.text.trim() !== sentences[index] || !Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs)
      || cue.startMs < (cues[index - 1]?.endMs ?? 0) || cue.endMs <= cue.startMs || cue.endMs > durationMs) {
      throw new Error(`第 ${index + 1} 句文案或时间码无效。`);
    }
  });

  const groups = cues.map((cue) => ({cues: [cue], relation: selectRelation(cue.text)}));
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
    groups.splice(joinAt, 2, {
      cues: [...left.cues, ...right.cues], relation: left.relation,
    });
  }

  const scenes: ExplainerScene[] = groups.map(({cues: groupCues, relation}, index) => ({
    sceneId: `explainer-${index + 1}`,
    startMs: index === 0 ? 0 : groupCues[0].startMs,
    endMs: groups[index + 1]?.cues[0].startMs ?? durationMs,
    componentName: 'ExplainerBoard',
    transitionIn: 'fade_blur',
    initialProps: relation,
    stateSteps: groupCues.slice(1).map((cue, cueIndex) => {
      const nextRelation = selectRelation(cue.text);
      return {
        stepId: `sentence-change-${cueIndex + 1}`, triggerMs: cue.startMs,
        propPatches: {...nextRelation, heading: nextRelation.heading ?? ''},
      };
    }),
  }));

  return {
    version: '1.0', source: input.source?.trim() || undefined,
    projectMeta: {
      title, width: 1080, height: 1920, fps: 30, durationMs, style,
      themePalette: {
        bgCanvas: '#0B1210', primaryHuman: '#AEC56B', secondaryAi: '#A4B0A6',
        accentWarning: '#D99C4A', dangerStrike: '#B96850', highlightGold: '#D99C4A',
      },
    },
    audioTracks: {masterVoiceover: {src: voiceSrc, volume: 1}, sfxEvents: []},
    scenes,
    subtitles: cues.map((cue, index) => ({...cue, id: `sentence-${index + 1}`, highlightKeywords: []})),
  };
}
