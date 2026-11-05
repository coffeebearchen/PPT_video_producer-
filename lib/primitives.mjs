export const PRIMITIVES = [
  { id: 'single-column', name: '单柱大字', page: 'p1', slots: ['headline', 'highlight'], maxLines: 3 },
  { id: 'compare-vertical', name: '上下对照', page: 'p2', slots: ['left', 'right', 'conclusion'], maxLines: 2 },
  { id: 'compare-horizontal', name: '左右对照', page: 'p2', slots: ['left', 'right', 'conclusion'], maxLines: 2 },
  { id: 'compare-diagonal', name: '对角对照', page: 'p2', slots: ['left', 'right', 'conclusion'], maxLines: 2 },
  { id: 'causal-chain', name: '因果链', page: 'p3', slots: ['cause', 'mechanism', 'result'] },
  { id: 'checklist', name: '清单', page: 'p3', slots: ['items'], maxItems: 5 },
  { id: 'boundary', name: '边界', page: 'p3', slots: ['fit', 'not-fit'] },
  { id: 'quote', name: '金句', page: 'p4', slots: ['line1', 'line2', 'highlight'] }
];

export function primitiveForPage(page, structureType, p2Mode = 'compare-vertical') {
  if (page === 'p1') return 'single-column';
  if (page === 'p2') return p2Mode;
  if (page === 'p4') return 'quote';
  if (structureType === 'causal') return 'causal-chain';
  if (structureType === 'checklist') return 'checklist';
  if (structureType === 'boundary') return 'boundary';
  return 'single-column';
}
