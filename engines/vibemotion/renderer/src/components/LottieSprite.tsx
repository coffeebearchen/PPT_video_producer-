import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Lottie} from '@remotion/lottie';
import type {DoodleItem} from './Doodle';

// Lottie 动画配件：真正的逐帧角色动画（挥手/走路/表情），随视频时间轴确定性播放
export const LottieSprite: React.FC<{item: DoodleItem; index: number; scale: number}> = ({item, index, scale}) => {
  const frame = useCurrentFrame();
  const size = (item.size ?? 320) * scale;
  const [data, setData] = useState<any>(null);
  const [handle] = useState(() => delayRender('Loading Lottie JSON'));

  useEffect(() => {
    let alive = true;
    fetch(staticFile(item.src ?? ''))
      .then((r) => r.json())
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => undefined)
      .finally(() => continueRender(handle));
    return () => {
      alive = false;
    };
  }, [handle, item.src]);

  const appear = Math.max(0, Math.min(1, (frame - (item.delay ?? 0)) / 12));
  const bobY = item.anim === 'bob' ? Math.sin((frame + index * 13) / 18) * 6 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        width: size,
        transform: `translate(-50%, -50%) translateY(${bobY}px)`,
        opacity: appear,
        pointerEvents: 'none',
        filter: item.filter,
      }}
    >
      {data ? <Lottie animationData={data} loop style={{width: '100%', height: 'auto'}} /> : null}
    </div>
  );
};

