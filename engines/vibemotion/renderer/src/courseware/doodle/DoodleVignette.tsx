import React, {useId} from 'react';
/** Director manual 2.1.3: transparent center, 28% black at the outer stop. */
export const DoodleVignette: React.FC = () => {
  const id = 'doodle-vignette-' + useId().replace(/\W/g, '');
  return <g data-doodle-vignette pointerEvents="none">
    <defs><radialGradient id={id} cx="50%" cy="45%" r="75%">
      <stop offset="0%" stopColor="#000" stopOpacity={0}/>
      <stop offset="100%" stopColor="#000" stopOpacity={.28}/>
    </radialGradient></defs>
    <rect width={1080} height={1920} fill={`url(#${id})`}/>
  </g>;
};
