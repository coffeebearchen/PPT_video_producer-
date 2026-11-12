import React from 'react';
import {coursewareStyleTokens as styleTokens} from './styles';
import {DEFAULT_AI_LABEL, DEFAULT_BRAND} from './model';
import type {ResolvedProps} from './model';

/** Same top-left chrome as V13; hiding it removes its separator as well. */
export const BrandName: React.FC<{project: ResolvedProps}> = ({project}) => {
  const brand = {...DEFAULT_BRAND, ...project.brand}; const t = styleTokens(project.style);
  if (!brand.show) return null;
  return <div data-cw-content data-cw-text="brand" style={{position: 'absolute', left: 108, top: 204, width: 864, fontSize: 28, color: t.muted, borderBottom: `1px solid ${t.line}`, paddingBottom: 20, whiteSpace: 'nowrap', textAlign: 'left'}}>{brand.text}</div>;
};

/** Global, static disclosure: unaffected by page fades, hook or camera motion. */
export const AiLabel: React.FC<{project: ResolvedProps}> = ({project}) => {
  const ai = {...DEFAULT_AI_LABEL, ...project.aiLabel}; const t = styleTokens(project.style);
  if (!ai.show) return null;
  return <div data-cw-ai-label data-cw-content data-cw-text="aiLabel" style={{position: 'absolute', left: 112, bottom: 204, width: 432, fontSize: 26, lineHeight: 1.4, whiteSpace: 'nowrap', textAlign: 'left', color: t.muted, opacity: .9, pointerEvents: 'none'}}>{ai.text}</div>;
};
