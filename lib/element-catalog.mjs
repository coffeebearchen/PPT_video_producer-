// 元素目录 + 模板预设（单一数据源，供平台和导演调取）

export const ELEMENT_CATALOG = [
  // 结构类
  { id: 'flowchart', type: 'structure', componentName: 'FlowChart', label: '动态流程', props: ['title','nodes','activeStep','stepCaption'], density: { simple: {decor:false,particles:false,annotations:false}, standard: {decor:true,particles:false,annotations:true}, rich: {decor:true,particles:true,annotations:true} } },
  { id: 'cycle', type: 'structure', componentName: 'CycleFlow', label: '循环', props: ['title','nodes','activeStep','centerText'], density: { simple: {}, standard: {decor:true}, rich: {decor:true,particles:true} } },
  { id: 'branch', type: 'structure', componentName: 'BranchFlow', label: '分支决策', props: ['title','root','branches','activeStep'], density: { simple: {}, standard: {decor:true}, rich: {decor:true,annotations:true} } },
  { id: 'pipeline', type: 'structure', componentName: 'PipelineArchitecture', label: '流水线', props: ['sectionHeader','stages','focusedStageIndex'], density: { simple: {}, standard: {decor:true}, rich: {decor:true,particles:true} } },
  { id: 'diagram-flow', type: 'structure', componentName: 'Diagram', label: '流程图', props: ['layout','nodes','edges','activeStep'], layout: 'flow', density: { simple: {}, standard: {decor:true}, rich: {decor:true,annotations:true} } },
  { id: 'diagram-cycle', type: 'structure', componentName: 'Diagram', label: '循环图', layout: 'cycle', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'diagram-tree', type: 'structure', componentName: 'Diagram', label: '树形', layout: 'tree', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'diagram-network', type: 'structure', componentName: 'Diagram', label: '网络', layout: 'network', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'diagram-hub', type: 'structure', componentName: 'Diagram', label: '中心辐射', layout: 'hub', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'diagram-layers', type: 'structure', componentName: 'Diagram', label: '层叠', layout: 'layers', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'diagram-matrix', type: 'structure', componentName: 'Diagram', label: '矩阵', layout: 'matrix', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'diagram-pyramid', type: 'structure', componentName: 'Diagram', label: '金字塔', layout: 'pyramid', density: { simple: {}, standard: {}, rich: {decor:true} } },
  // 数据类
  { id: 'chart-line', type: 'data', componentName: 'Chart', label: '折线图', props: ['kind','series','xLabels'], kind: 'line', density: { simple: {}, standard: {decor:true}, rich: {decor:true,annotations:true} } },
  { id: 'chart-step', type: 'data', componentName: 'Chart', label: '阶梯图', kind: 'step', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'chart-bar', type: 'data', componentName: 'Chart', label: '柱状图', kind: 'bar', density: { simple: {}, standard: {decor:true}, rich: {decor:true,annotations:true} } },
  { id: 'chart-hbar', type: 'data', componentName: 'Chart', label: '横条图', kind: 'hbar', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'chart-area', type: 'data', componentName: 'Chart', label: '面积图', kind: 'area', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'chart-pie', type: 'data', componentName: 'Chart', label: '饼图', kind: 'pie', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'chart-donut', type: 'data', componentName: 'Chart', label: '环形图', kind: 'donut', density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'counter', type: 'data', componentName: 'Counter', label: '数字滚动', props: ['items','progress','caption'], density: { simple: {}, standard: {decor:true}, rich: {decor:true,particles:true} } },
  { id: 'gantt', type: 'data', componentName: 'GanttParallelStream', label: '甘特/并发', density: { simple: {}, standard: {decor:true}, rich: {decor:true,annotations:true} } },
  { id: 'dashboard', type: 'data', componentName: 'ConcurrentDashboard', label: '仪表盘', density: { simple: {}, standard: {}, rich: {decor:true} } },
  // 叙事类
  { id: 'timeline', type: 'narrative', componentName: 'EvolutionTimeline', label: '时间轴', props: ['sectionHeader','nodes','activeNodeIndex'], density: { simple: {}, standard: {decor:true}, rich: {decor:true,particles:true} } },
  { id: 'mythbuster', type: 'narrative', componentName: 'MythBusterStrike', label: '误区划线', props: ['beforeText','afterText','active'], density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'comparison', type: 'narrative', componentName: 'ComparisonSplitCard', label: '二元对比', props: ['headline','question','left','right'], density: { simple: {}, standard: {decor:true}, rich: {decor:true,particles:true} } },
  { id: 'spotlight', type: 'narrative', componentName: 'SpotlightPillars', label: '三支柱', props: ['sectionHeader','pillars','activePillarIndex'], density: { simple: {}, standard: {decor:true}, rich: {decor:true,annotations:true} } },
  { id: 'kinetic', type: 'narrative', componentName: 'KineticTypography', label: '金句排版', props: ['lines','highlightKeywords'], density: { simple: {}, standard: {}, rich: {decor:true} } },
  // 素材类
  { id: 'domspot', type: 'media', componentName: 'BrowserDOMSpotlight', label: '截图聚光', props: ['screenshotSrc','highlight','dim'], density: { simple: {}, standard: {}, rich: {decor:true} } },
  { id: 'dualrole', type: 'media', componentName: 'DualRoleVideoSync', label: '多角色发声', props: ['title','speakers','mediaSrc'], density: { simple: {}, standard: {}, rich: {decor:true} } },
  // 标注类
  { id: 'ann-circle', type: 'annotation', label: '手绘圈', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'ann-underline', type: 'annotation', label: '下划线', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'ann-highlight', type: 'annotation', label: '高亮', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'ann-arrow', type: 'annotation', label: '箭头', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'ann-bubble', type: 'annotation', label: '编号气泡', density: { simple: {}, standard: {}, rich: {} } },
  // 质感类
  { id: 'tex-grain', type: 'texture', label: '粉笔颗粒', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'tex-particles', type: 'texture', label: '粒子', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'tex-sweep', type: 'texture', label: '扫光', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'tex-vignette', type: 'texture', label: '暗角', density: { simple: {}, standard: {}, rich: {} } },
  { id: 'tex-hatch', type: 'texture', label: '斜纹', density: { simple: {}, standard: {}, rich: {} } }
];

export const PALETTES = {
  'chalk-dark': { colors: { bg: '#282828', ink: '#FDFDFB', gold: '#E2BE5C', sage: '#8A918B', coral: '#EA3E4A', amber: '#D9A24E', muted: '#8A8A80' } },
  'cream-paper': { colors: { bg: '#F3EDE1', ink: '#101112', gold: '#C73520', sage: '#6F8F6F', coral: '#C73520', amber: '#D9A24E', muted: '#7B7468' } },
  'cool-gray': { colors: { bg: '#1F2328', ink: '#E8EAED', gold: '#7FB0A0', sage: '#8A918B', coral: '#E0604E', amber: '#E8A33C', muted: '#9AA0A6' } }
};

export const FONT_PAIRS = {
  chalk: { heading: 'ZCOOL KuaiLe', body: 'LXGW WenKai' },
  wenkai: { heading: 'LXGW WenKai', body: 'LXGW WenKai' }
};

export const TEMPLATES = [
  {
    templateId: 'explain-v1',
    name: '讲解型 · 流程为主',
    palette: 'cream-paper',
    fonts: 'chalk',
    density: 'rich',
    elements: { showDecor: true, showParticles: true, showChalkGrain: true, showKicker: true, annotations: true, doodles: true },
    sceneFlow: ['comparison', 'flowchart', 'pipeline', 'kinetic']
  },
  {
    templateId: 'data-v1',
    name: '数据型 · 图表为主',
    palette: 'cool-gray',
    fonts: 'wenkai',
    density: 'rich',
    elements: { showDecor: true, showParticles: false, showChalkGrain: true, showKicker: true, annotations: true, doodles: false },
    sceneFlow: ['counter', 'chart-bar', 'chart-line', 'dashboard', 'kinetic']
  },
  {
    templateId: 'story-v1',
    name: '故事型 · 时间轴为主',
    palette: 'chalk-dark',
    fonts: 'chalk',
    density: 'rich',
    elements: { showDecor: true, showParticles: true, showChalkGrain: true, showKicker: true, annotations: true, doodles: true },
    sceneFlow: ['timeline', 'mythbuster', 'comparison', 'spotlight', 'kinetic']
  }
];
