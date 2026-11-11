import type {PageName} from './project';

export type PagePalette = {
  background: string; surface: string; ink: string; muted: string; accent: string;
  highlight: string; coverFill: string; coverInk: string; line: string; danger: string;
};

const palettes: Record<string, PagePalette> = {
  archive: {background: '#F3EDE1', surface: '#FCF8ED', ink: '#20201D', muted: '#5F594E', accent: '#A63423', highlight: '#CDE882', coverFill: '#CDE882', coverInk: '#20201D', line: '#B5A58C', danger: '#A63423'},
  terminal: {background: '#101112', surface: '#1A1B1C', ink: '#F2EBDD', muted: '#CFC8BC', accent: '#FF8A6B', highlight: '#D9FF57', coverFill: '#D9FF57', coverInk: '#101112', line: '#6E6C66', danger: '#FF8A6B'},
  editorial: {background: '#C73520', surface: '#B8321F', ink: '#F6F1E7', muted: '#F1C9BC', accent: '#F6F1E7', highlight: '#D9FF57', coverFill: '#101112', coverInk: '#D9FF57', line: '#E5A497', danger: '#F6F1E7'},
  noir: {background: '#0B0B0B', surface: '#151515', ink: '#FFD23F', muted: '#D8B94F', accent: '#FFD23F', highlight: '#FFD23F', coverFill: '#FFD23F', coverInk: '#0B0B0B', line: '#7F6D31', danger: '#FFD23F'},
  earth: {background: '#20362C', surface: '#182A22', ink: '#F2EBDD', muted: '#C4BEAE', accent: '#E8792E', highlight: '#C9D46B', coverFill: '#E8792E', coverInk: '#20362C', line: '#73806A', danger: '#F3A46D'},
};

export function pagePalette(theme: string, page: PageName): PagePalette {
  const palette = palettes[theme];
  if (!palette) throw new Error(`未知固定页式主题：${theme}`);
  if (theme === 'archive' && !['cover', 'context'].includes(page)) {
    return {...palette, background: '#171B18', surface: '#272C26', ink: '#FAF3DC', muted: '#C8C8B9', accent: '#CDE882', line: '#7A7964', danger: '#F19B85'};
  }
  return palette;
}
