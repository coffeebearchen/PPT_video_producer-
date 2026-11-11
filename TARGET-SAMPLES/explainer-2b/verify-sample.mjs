import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const out = path.join(import.meta.dirname, 'out');
const read = async (name) => JSON.parse(await fs.readFile(path.join(out, name), 'utf8'));
const {timeline} = await read('project.json');
const compiler = await read('compiler-check.json');
const probe = (name) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(out, name)], {encoding: 'utf8'}));
const video = probe('explainer-2b.mp4');
const stream = video.streams.find((item) => item.codec_type === 'video');
assert.equal(stream.width, 1080);
assert.equal(stream.height, 1920);
assert.equal(stream.codec_name, 'h264');
assert(video.streams.some((item) => item.codec_type === 'audio' && item.codec_name === 'aac'));
assert(Number(video.format.duration) >= 45 && Number(video.format.duration) <= 60);
execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', path.join(out, 'explainer-2b.mp4'), '-f', 'null', '-'], {stdio: ['ignore', 'ignore', 'pipe']});

const covers = {};
for (const [name, height] of [['cover.png', 1920], ['cover_3x4.png', 1440], ['secondary-cover.png', 1920]]) {
  const cover = probe(name).streams[0];
  assert.equal(cover.codec_name, 'png');
  assert.equal(cover.width, 1080);
  assert.equal(cover.height, height);
  covers[name] = {width: cover.width, height: cover.height, codec: cover.codec_name};
}

const checks = new Map();
for (const name of ['render.log', 'cover.log', 'cover_3x4.log', 'secondary-cover.log']) {
  const raw = await fs.readFile(path.join(out, name));
  const log = raw[0] === 0xff && raw[1] === 0xfe ? raw.subarray(2).toString('utf16le') : raw.toString('utf8');
  for (const match of log.matchAll(/EXPLAINER_AUDIT (\{[\s\S]*?\})/g)) {
    const check = JSON.parse(match[1].replace(/\r?\n/g, ''));
    assert.deepEqual(check.issues, []);
    assert(check.minimumFont >= 24);
    checks.set(`${name}:${check.key}`, check);
  }
}
assert(checks.size >= timeline.scenes.length + 3);

const frames = timeline.scenes.map((scene) => Math.round((scene.startMs + scene.endMs) / 2 * timeline.projectMeta.fps / 1000));
const select = frames.map((frame) => `eq(n,${frame})`).join('+');
execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(out, 'explainer-2b.mp4'), '-vf', `select='${select}',scale=216:384,tile=5x2`, '-frames:v', '1', path.join(out, 'contact-sheet.png')]);

const result = {
  status: 'pass', main: compiler.main, secondary: compiler.secondary,
  durationSeconds: Number(video.format.duration), video: {codec: stream.codec_name, width: stream.width, height: stream.height, audio: 'aac'},
  covers, sampledFrames: frames, layoutChecks: [...checks.values()], compilerChecks: compiler,
  verificationScope: 'Main video decoded, main scene layouts and three covers measured; secondary topic compiled with measured speech and rendered as a semantic cover.',
};
await fs.writeFile(path.join(out, 'validation.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({status: result.status, durationSeconds: result.durationSeconds, sampledFrames: frames, layoutChecks: checks.size}));
