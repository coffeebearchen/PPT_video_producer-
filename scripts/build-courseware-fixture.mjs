// 构建 Codex 用的 resolved-props fixture（真实截图 + 真实配音 + 5 类页）
import fs from 'node:fs';
import path from 'node:path';
import { addAsset, newRenderId, stagingDirFor, snapshotDirFor } from '../lib/courseware-project.mjs';
import { compileStoryboard } from '../lib/courseware-compile.mjs';

const root = process.cwd();
const taskId = 'vtask_fixture';
const renderId = 'cr_fixture_v2';
const shotPath = path.join(root, 'engines', 'vibemotion', 'renderer', 'public', 'screenshots', 'courseware-workbench.png');
if (!fs.existsSync(shotPath)) {
  console.error('缺少截图:', shotPath);
  process.exit(1);
}

const asset = addAsset(taskId, {
  kind: 'image',
  data: fs.readFileSync(shotPath).toString('base64'),
  mime: 'image/png',
  name: 'courseware-workbench.png'
});
console.log('asset:', asset.id, asset.fileName);

const storyboard = {
  title: '用固定地址制作一条视频',
  style: 'industrial',
  slides: [
    {
      id: 'opening', kind: 'title',
      text: '用固定地址\n制作一条视频',
      body: '从新建到检查成片',
      caption: '从工作台开始，把文案变成可以检查的成片。',
      narration: { mode: 'tts', text: '从工作台开始，把文案变成可以检查的成片。' },
      timing: { minSeconds: 4, tailSeconds: 0.4 }
    },
    {
      id: 'create', kind: 'screenshot',
      text: '先从工作台\n新建视频',
      assetId: asset.id,
      highlight: { x: 0.0756, y: 0.3886, w: 0.7983, h: 0.1091 },
      annotation: 'arrow',
      dim: 0.35,
      caption: '找到左侧的新建视频入口，点击进入制作。',
      narration: { mode: 'tts', text: '找到左侧的新建视频入口，点击进入制作。' },
      timing: { minSeconds: 5, tailSeconds: 0.4 }
    },
    {
      id: 'steps', kind: 'flow',
      text: '把制作拆成\n四个可检查的动作',
      nodes: [{ id: 'copy', label: '填入文案' }, { id: 'style', label: '选择风格' }, { id: 'render', label: '生成成片' }, { id: 'review', label: '检查导出' }],
      edgePolicy: 'sequential',
      caption: '填入文案，选择风格。生成成片后，检查画面与字幕。',
      narration: { mode: 'tts', text: '填入文案，选择风格。生成成片后，检查画面与字幕。' },
      timing: { minSeconds: 5, tailSeconds: 0.4 }
    },
    {
      id: 'channels', kind: 'bullet',
      text: '两种渠道\n同一套成片',
      bullets: ['视频号：发布包 + 封面 + 文案', '公众号：文章草稿，可内嵌视频'],
      caption: '成片既可以发视频号，也可以发公众号草稿。',
      narration: { mode: 'tts', text: '成片既可以发视频号，也可以发公众号草稿。' },
      timing: { minSeconds: 5, tailSeconds: 0.4 }
    },
    {
      id: 'closing', kind: 'quote',
      text: '先把成片看一遍\n再进入审批',
      body: '画面清楚 · 字幕准确 · 节奏合适',
      caption: '确认画面和字幕没有问题，再进入审批流程。',
      narration: { mode: 'tts', text: '确认画面和字幕没有问题，再进入审批流程。' },
      timing: { minSeconds: 4, tailSeconds: 0.4 }
    }
  ]
};

const project = { draftRevision: 1, storyboard };
const stagingDir = stagingDirFor(taskId, renderId);
const snapshotDir = snapshotDirFor(taskId, renderId);
const props = await compileStoryboard({ project, assets: [asset], renderId, taskId, stagingDir, onProgress: (m) => console.log(m) });

fs.mkdirSync(snapshotDir, { recursive: true });
fs.writeFileSync(path.join(snapshotDir, 'source-storyboard.json'), JSON.stringify(storyboard, null, 2), 'utf8');
fs.writeFileSync(path.join(snapshotDir, 'resolved-props.json'), JSON.stringify(props, null, 2), 'utf8');

const outDir = path.join(root, 'out', 'courseware-fixture');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'resolved-props.json'), JSON.stringify(props, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2), 'utf8');
console.log('OK slides:', props.slides.length, 'totalFrames:', props.totalFrames, 'total:', props.totalDurationSeconds, 's');
console.log('staging:', props.stagingDir);
console.log('props:', path.join(outDir, 'resolved-props.json'));
