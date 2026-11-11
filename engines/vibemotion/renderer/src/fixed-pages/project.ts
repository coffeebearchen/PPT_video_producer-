export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const PAGE_STARTS = [0, 5.15, 10.15, 17.15, 20] as const;
export const FINAL_ASK = '有问题，评论区问';

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
    context: {title: string; subtitle?: string; note: string; bottom: string};
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
  durationSeconds?: 10 | 20;
  audit?: boolean;
};

export function checkProject({spec, durationSeconds = 20}: FixedPageProps) {
  if (spec.page_count !== 4 || spec.theme !== 'archive') {
    throw new Error('阶段 2A 原型支持 Archive 四页稿。');
  }
  if (!['pulse', 'none'].includes(spec.music)) {
    throw new Error('阶段 2A 原型支持 Pulse 120 或静音。');
  }
  if (durationSeconds !== 10 && durationSeconds !== 20) {
    throw new Error('时长须为 10 秒验证版或 20 秒原稿版。');
  }
}

export function pageFrames(fps: number, durationSeconds: number) {
  return PAGE_STARTS.map((second) => Math.round(second * fps * durationSeconds / 20));
}
