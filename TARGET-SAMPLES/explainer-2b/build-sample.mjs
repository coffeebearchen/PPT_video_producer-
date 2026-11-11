import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileExplainer, resolveNarration, splitNarration} from '../../engines/vibemotion/renderer/src/explainer/compile.ts';

const folder = import.meta.dirname;
const read = async (file) => JSON.parse((await fs.readFile(path.join(folder, file), 'utf8')).replace(/^\uFEFF/, ''));
const input = await read('out/narration-input.json');
const timeline = compileExplainer(input);
assert(input.durationMs >= 45000 && input.durationMs <= 60000);
assert.equal(timeline.subtitles.length, splitNarration(input.script).length);
assert.equal(timeline.scenes.length, 10);
assert.equal(new Set(timeline.scenes.map((scene) => scene.initialProps.kind)).size, 7);

let writerCalls = 0;
const drafted = await resolveNarration({title: input.title, script: '  '}, async () => { writerCalls++; return input.script; });
assert.equal(drafted, input.script.trim());
assert.equal(writerCalls, 1);
const titleFallback = await resolveNarration({title: input.title, script: input.title}, async () => { writerCalls++; return input.script; });
assert.equal(titleFallback, input.script.trim());
assert.equal(writerCalls, 2);
await resolveNarration(input, async () => { throw new Error('Explicit copy must skip the writer'); });
await assert.rejects(resolveNarration({title: input.title}, async (title) => title));
assert.throws(() => compileExplainer({...input, cues: input.cues.slice(1)}));
assert.throws(() => compileExplainer({...input, cues: input.cues.map((cue, index) => index === 1 ? {...cue, startMs: 0} : cue)}));

const longSentences = Array.from({length: 15}, (_, index) => `第${index + 1}个条目有独立内容。`);
const longInput = {...input, script: longSentences.join('\n'), durationMs: 60000, cues: longSentences.map((text, index) => ({text, startMs: index * 4000, endMs: index * 4000 + 3700}))};
const longTimeline = compileExplainer(longInput);
assert.equal(longTimeline.scenes.length, 12);
assert.equal(longTimeline.subtitles.length, 15);
assert.equal(longTimeline.scenes.reduce((sum, scene) => sum + scene.stateSteps.length + 1, 0), 15);

const secondaryInput = await read('out/secondary/narration-input.json');
secondaryInput.voiceSrc = 'audio/secondary.wav';
const secondary = compileExplainer(secondaryInput);
assert.equal(secondary.scenes.length, 8);
assert.notEqual(secondary.projectMeta.title, timeline.projectMeta.title);
assert.notDeepEqual(secondary.scenes.map((scene) => scene.endMs - scene.startMs), timeline.scenes.map((scene) => scene.endMs - scene.startMs));
assert(!JSON.stringify(secondary).includes('交接'));
assert(!JSON.stringify(timeline).includes('65%'));

await fs.copyFile(path.join(folder, 'out/secondary/public/audio/narration.wav'), path.join(folder, 'out/public/audio/secondary.wav'));
await fs.writeFile(path.join(folder, 'out/project.json'), JSON.stringify({timeline, audit: true}, null, 2));
await fs.writeFile(path.join(folder, 'out/secondary-project.json'), JSON.stringify({timeline: secondary, audit: true}, null, 2));
const describe = (project) => ({title: project.projectMeta.title, durationMs: project.projectMeta.durationMs, scenes: project.scenes.length, subtitles: project.subtitles.length, kinds: [...new Set(project.scenes.map((scene) => scene.initialProps.kind))], sceneDurationsMs: project.scenes.map((scene) => scene.endMs - scene.startMs)});
await fs.writeFile(path.join(folder, 'out/compiler-check.json'), JSON.stringify({status: 'pass', main: describe(timeline), secondary: describe(secondary), emptyScriptAndTitleFallbackWriterCalls: writerCalls, longInput: {sentences: 15, scenes: 12, cuesAndVisualStates: 15}, invalidInputsRejected: ['title-only writer result', 'missing cue', 'overlapping cue']}, null, 2));
console.log(JSON.stringify({status: 'pass', main: describe(timeline), secondary: describe(secondary)}));
