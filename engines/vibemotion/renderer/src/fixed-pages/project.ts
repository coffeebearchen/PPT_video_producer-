export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const PAGE_STARTS = [0, 5.15, 10.15, 17.15, 20] as const;
export const PAGE_TIMELINES = {
  4: PAGE_STARTS,
  5: [0, 5.15, 10.15, 16.15, 21.15, 24],
  6: [0, 5.15, 10.15, 14.15, 20.15, 25.15, 28],
} as const;
export const PAGE_ORDERS = {
  4: ['cover', 'context', 'compare', 'quote'],
  5: ['cover', 'context', 'compare', 'evidence', 'quote'],
  6: ['cover', 'context', 'objection', 'compare', 'evidence', 'quote'],
} as const;
export const THEMES = ['archive', 'terminal', 'editorial', 'noir', 'earth'] as const;
export type PageCount = keyof typeof PAGE_ORDERS;
export type PageName = (typeof PAGE_ORDERS)[PageCount][number];
export type TextPage = {title: string; subtitle?: string; note: string; bottom: string; highlight?: string};
export const FINAL_ASK = '有问题，评论区问';
export const INTERNAL_LABEL = /^(?:背景|证据|反例|金句|结构对照|CONTEXT)(?:$|\s*[/｜|：])|^0[1-6]\s*[/｜|]|^第(?:几|\d+|[一二三四五六])页|先把背景说清楚|先把场景、角色和限制讲清楚|背景不是铺垫/u;

export type FixedPageProps = {
  spec: {
    page_count: number;
    brand: string;
    theme: string;
    page1: {
      kicker: string;
      kicker_accent?: string;
      lines: string[];
      highlight: string;
      en?: string;
      footnote: string;
      cover?: {lead: string; punch: string};
    };
    context: TextPage;
    evidence?: TextPage;
    objection?: TextPage;
    page2: {
      kicker: string;
      kicker_accent?: string;
      left_tag: string;
      left_thin?: string;
      left_line1_rest: string;
      left_line2: string;
      left_stamp?: string;
      right_tag: string;
      right_prefix: string;
      right_highlight: string;
      right_badge?: string;
      conclusion_small?: string;
      conclusion_prefix: string;
      conclusion_highlight: string;
      footnote: string;
    };
    quote: {line1: string; line2: string; highlight: string; note: string; stamp?: string};
    music: string;
    motion?: {transition?: {duration?: number}};
  };
  durationSeconds?: number;
  audit?: boolean;
};

export function checkProject({spec, durationSeconds}: FixedPageProps) {
  if (![4, 5, 6].includes(spec.page_count) || !THEMES.includes(spec.theme as (typeof THEMES)[number])) {
    throw new Error('固定页式支持 4/5/6 页及 Archive、Terminal、Editorial、Noir、Earth 五主题。');
  }
  if (!['pulse', 'none'].includes(spec.music)) {
    throw new Error('阶段 2A 原型支持 Pulse 120 或静音。');
  }
  if (durationSeconds !== undefined && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
    throw new Error('自定义验证时长必须为正数。');
  }
  const sections = [spec.context];
  if (spec.page_count >= 5) sections.push(spec.evidence!);
  if (spec.page_count === 6) sections.push(spec.objection!);
  if (sections.some((section) => !section || !section.title?.trim() || !section.note?.trim() || !section.bottom?.trim())) {
    throw new Error('旧稿缺少页面的 title / note / bottom，请补齐原字段并确认页结构。');
  }
}

export function projectDuration({spec, durationSeconds}: FixedPageProps) {
  return durationSeconds ?? PAGE_TIMELINES[spec.page_count as PageCount].at(-1)!;
}

export function pageFrames(fps: number, durationSeconds: number, pageCount: number = 4) {
  const starts = PAGE_TIMELINES[pageCount as PageCount];
  const nativeDurationMs = Math.round(starts.at(-1)! * 1000);
  return starts.map((second) => Math.round(Math.round(second * 1000) * fps * durationSeconds / nativeDurationMs));
}
