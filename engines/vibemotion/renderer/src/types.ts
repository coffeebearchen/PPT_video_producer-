// TimelineDSL v1.0 协议 —— 与《技术开发总规范》第五章一致
import type {AvatarOption} from './avatar/AvatarOverlay';
export type SpringPreset = 'snappy' | 'smooth_camera' | 'bouncy_emphasis';

export type SfxType =
  | 'pop'
  | 'whoosh'
  | 'strike_red'
  | 'chime_success'
  | 'tick'
  | 'camera_zoom';

export type ComponentName =
  | 'ChalkBoard'
  | 'GraphicScene'
  | 'ComparisonSplitCard'
  | 'ConcurrentDashboard'
  | 'DualRoleVideoSync'
  | 'MythBusterStrike'
  | 'GanttParallelStream'
  | 'SpotlightPillars'
  | 'EvolutionTimeline'
  | 'PipelineArchitecture'
  | 'BrowserDOMSpotlight'
  | 'BentoMediaGallery'
  | 'PhysicsAnalogyCanvas'
  | 'KineticTypography'
  | 'FlowChart'
  | 'CycleFlow'
  | 'BranchFlow'
  | 'Diagram'
  | 'Chart'
  | 'Counter';

export interface CameraKeyframe {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotateX?: number;
  rotateY?: number;
  springPreset?: SpringPreset;
}

export interface StateStep {
  stepId: string;
  triggerMs: number;
  triggerWord?: string;
  propPatches: Record<string, unknown>;
  cameraKeyframe?: CameraKeyframe;
}

export interface Scene {
  sceneId: string;
  startMs: number;
  endMs: number;
  transitionIn: 'fade_blur' | 'zoom_through' | 'slide_up' | 'morph_shared_layout';
  componentName: ComponentName;
  initialProps: Record<string, unknown>;
  stateSteps: StateStep[];
}

export interface Subtitle {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  highlightKeywords: string[];
}

export interface ThemePalette {
  bgCanvas: string;
  primaryHuman: string;
  secondaryAi: string;
  accentWarning: string;
  dangerStrike: string;
  highlightGold: string;
}

export interface TimelineDSL {
  avatar?: AvatarOption;
  version: '1.0';
  projectMeta: {
    style?: 'industrial' | 'clean' | 'dynamic';
    title: string;
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    themePalette: ThemePalette;
  };
  audioTracks: {
    masterVoiceover?: {src: string; volume: number};
    backgroundMusic?: {src: string; baseVolume: number};
    sfxEvents: {atMs: number; sfxType: SfxType; volume: number}[];
  };
  scenes: Scene[];
  subtitles: Subtitle[];
}
