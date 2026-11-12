import {styleTokens, type ExplanationStyle} from '../graphics/styles';

export type CoursewareStyle = ExplanationStyle | 'dynamicflow';
export const DYNAMICFLOW_TOKENS = {
  label: '手绘流动讲解', bg: '#282828', surface: '#2E2E2E', ink: '#EDE6D6', muted: '#8A8A80',
  primary: '#90C380', accent: '#DCBC62', positive: '#90C380', danger: '#E06B6B',
  secondaryAccent: '#F08419', line: '#6E6E68', heading: 'LXGW WenKai', radius: 10, labelRadius: 6,
} as const;

/** Shared graphics styles remain three-valued; their objects and defaults are unchanged. */
export const coursewareStyleTokens = (style: CoursewareStyle = 'industrial') =>
  style === 'dynamicflow' ? DYNAMICFLOW_TOKENS : styleTokens(style);
