import {registerRoot, delayRender, continueRender, staticFile} from 'remotion';
import {RemotionRoot} from './Root';

// 运行时加载手写字体：霞鹜文楷（主）+ 站酷快乐体（兜底）
const handle = delayRender('Loading fonts');
const faces: {family: string; file: string}[] = [
  {family: 'LXGW WenKai', file: 'fonts/LXGWWenKai-Regular.ttf'},
  {family: 'ZCOOL KuaiLe', file: 'fonts/ZCOOLKuaiLe-Regular.ttf'},
];
Promise.all(
  faces.map(async (f) => {
    try {
      const face = new FontFace(f.family, `url("${staticFile(f.file)}")`);
      const loaded = await face.load();
      document.fonts.add(loaded);
    } catch (e) {
      // 字体缺失时继续，用系统字体兜底
    }
  }),
)
  .catch(() => undefined)
  .finally(() => continueRender(handle));

registerRoot(RemotionRoot);
