import {styleTokens, type ExplanationStyle} from '../graphics/styles';

export type CoursewareStyle = ExplanationStyle | 'dynamicflow';
export const DYNAMICFLOW_TOKENS = {
  label: '手绘流动讲解', bg: '#262725', surface: '#30312D', ink: '#F0EBD4', muted: '#BDBAA8',
  primary: '#A8C9B4', accent: '#E7C85B', positive: '#C6D582', danger: '#EF8581',
  secondaryAccent: '#DBA36D', line: '#858C80', heading: 'LXGW WenKai', radius: 10, labelRadius: 6,
} as const;

/** Shared graphics styles remain three-valued; their objects and defaults are unchanged. */
export const coursewareStyleTokens = (style: CoursewareStyle = 'industrial') =>
  style === 'dynamicflow' ? DYNAMICFLOW_TOKENS : styleTokens(style);
