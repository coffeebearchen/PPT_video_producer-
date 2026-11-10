import {createContext, useContext} from 'react';

// 当前场景起始帧，供组件计算「本地时间」做入场/呼吸动效
export const SceneStartContext = createContext(0);

export const useSceneStart = () => useContext(SceneStartContext);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

