import {registerRoot, delayRender, continueRender, staticFile} from 'remotion';
import {RemotionRoot} from './Root';
import fontManifest from '../fonts.json';

// 运行时加载 fonts.json 中登记的所有字体
const handle = delayRender('Loading fonts');
const faces = Object.entries(fontManifest as Record<string, string>).map(([family, file]) => ({ family, file }));
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
