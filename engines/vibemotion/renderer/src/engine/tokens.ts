import type {ThemePalette} from '../types';
import styleCfg from '../../style.settings.json';

const C = (styleCfg as {colors?: Record<string, string>}).colors ?? {};
const pick = (k: string, d: string) => C[k] ?? d;

// ── 手绘讲解风 Token（颜色由 style.settings.json 控制，可用 style-editor.html 可视化调）──
export const BG = pick('bg', '#282828');
export const INK = pick('ink', '#FDFDFB');
export const GOLD = pick('gold', '#E2BE5C');
export const SAGE = pick('sage', '#8A918B');
export const CORAL = pick('coral', '#EA3E4A');
export const AMBER = pick('amber', '#D9A24E');
export const MUTED = pick('muted', '#8A8A80');

export const DEFAULT_PALETTE: ThemePalette = {
  bgCanvas: BG,
  primaryHuman: GOLD,
  secondaryAi: SAGE,
  accentWarning: AMBER,
  dangerStrike: CORAL,
  highlightGold: GOLD,
};

// 手写风：霞鹜文楷（柔和楷体手写）+ 站酷快乐体兜底
export const FONT = '"LXGW WenKai", "ZCOOL KuaiLe", "Microsoft YaHei", "微软雅黑", sans-serif';

export const SURFACE = {
  card: 'rgba(255,252,245,0.72)',
  cardBorder: `${SAGE}9e`,
  glassBlur: 0,
};

// 手绘卡片：奶油纸底 + 彩色墨线描边 + 轻微不规整圆角
export const glassCard = (
  radius = 18,
  stroke = `${SAGE}9e`,
  fill = 'rgba(40,40,40,0.5)',
): React.CSSProperties => ({
  background: fill.startsWith('rgba(40,40,40') ? SURFACE.card : fill,
  border: `2px solid ${stroke}`,
  borderRadius: `${radius}px ${Math.round(radius * 0.7)}px ${Math.round(radius * 1.15)}px ${Math.round(radius * 0.85)}px`,
  boxSizing: 'border-box',
});

// 手绘斜线填充（参考图里斜纹圆点）
export const hatch = (color: string): React.CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(45deg, ${color} 0px, ${color} 2.5px, transparent 2.5px, transparent 7px)`,
});
