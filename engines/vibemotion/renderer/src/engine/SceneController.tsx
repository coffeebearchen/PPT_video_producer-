import {useCurrentFrame, useVideoConfig, spring} from 'remotion';
import type {StateStep, CameraKeyframe} from '../types';
import {SPRING_CONFIGS} from './spring';

type UnknownObj = Record<string, unknown>;

const isNum = (v: unknown): v is number => typeof v === 'number';
const isObj = (v: unknown): v is UnknownObj => !!v && typeof v === 'object' && !Array.isArray(v);

// 深度合并 + 数值弹簧插值：数组按 index、对象按 key 递归，数字线性过渡到目标值
function merge(prev: unknown, target: unknown, t: number): unknown {
  if (target === undefined) return prev;
  if (isNum(target) && isNum(prev)) return prev + (target - prev) * t;
  if (Array.isArray(target) && Array.isArray(prev)) {
    const len = Math.max(target.length, prev.length);
    return Array.from({length: len}, (_, i) => merge(prev[i], target[i], t));
  }
  if (isObj(target) && isObj(prev)) {
    const out: UnknownObj = {...prev};
    for (const k of Object.keys(target)) out[k] = merge(prev[k], target[k], t);
    return out;
  }
  return target;
}

export interface CameraState {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotateX: number;
  rotateY: number;
}

export interface SceneState {
  props: UnknownObj;
  camera: CameraState;
}

/**
 * 《规范》6.2 节：把 JSON 里的 stateSteps 自动归约为当前帧的 props + 2.5D 镜头。
 * 每个 step 在 triggerMs 之后，用弹簧把 propPatches 深合并进 initialProps（数字平滑过渡），
 * 并叠加 cameraKeyframe 的丝滑运镜。
 */
export function useInterpolatedSceneState(
  initialProps: UnknownObj,
  stateSteps: StateStep[],
): SceneState {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  let props: UnknownObj = JSON.parse(JSON.stringify(initialProps));
  let cam: CameraState = {scale: 1, offsetX: 0, offsetY: 0, rotateX: 0, rotateY: 0};

  for (const step of stateSteps) {
    const stepFrame = Math.round((step.triggerMs / 1000) * fps);
    if (frame < stepFrame) continue;

    const p = spring({frame: frame - stepFrame, fps, config: SPRING_CONFIGS.snappy});

    for (const [k, tv] of Object.entries(step.propPatches)) {
      props[k] = merge(props[k], tv, p);
    }

    if (step.cameraKeyframe) {
      const kf: CameraKeyframe = step.cameraKeyframe;
      const cp = spring({frame: frame - stepFrame, fps, config: SPRING_CONFIGS.smooth_camera});
      cam.scale = cam.scale + (kf.scale - cam.scale) * cp;
      cam.offsetX = cam.offsetX + (kf.offsetX - cam.offsetX) * cp;
      cam.offsetY = cam.offsetY + (kf.offsetY - cam.offsetY) * cp;
      cam.rotateX = cam.rotateX + ((kf.rotateX ?? 0) - cam.rotateX) * cp;
      cam.rotateY = cam.rotateY + ((kf.rotateY ?? 0) - cam.rotateY) * cp;
    }
  }

  return {props, camera: cam};
}

