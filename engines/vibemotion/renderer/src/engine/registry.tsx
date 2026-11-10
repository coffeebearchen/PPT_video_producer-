import React from 'react';
import {ChalkBoard} from '../components/ChalkBoard';
import type {ComponentName} from '../types';
import {ComparisonSplitCard} from '../components/ComparisonSplitCard';
import {ConcurrentDashboard} from '../components/ConcurrentDashboard';
import {DualRoleVideoSync} from '../components/DualRoleVideoSync';
import {MythBusterStrike} from '../components/MythBusterStrike';
import {GanttParallelStream} from '../components/GanttParallelStream';
import {SpotlightPillars} from '../components/SpotlightPillars';
import {EvolutionTimeline} from '../components/EvolutionTimeline';
import {PipelineArchitecture} from '../components/PipelineArchitecture';
import {BrowserDOMSpotlight} from '../components/BrowserDOMSpotlight';
import {KineticTypography} from '../components/KineticTypography';
import {FlowChart} from '../components/FlowChart';
import {CycleFlow} from '../components/CycleFlow';
import {BranchFlow} from '../components/BranchFlow';
import {Diagram} from '../components/Diagram';
import {Chart} from '../components/Chart';
import {Counter} from '../components/Counter';
import {Placeholder} from '../components/Placeholder';

// 组件注册表：timeline_dsl.json 的 componentName → React 组件
export const REGISTRY: Partial<Record<ComponentName, React.FC<any>>> = {
  ChalkBoard,
  ComparisonSplitCard,
  ConcurrentDashboard,
  DualRoleVideoSync,
  MythBusterStrike,
  GanttParallelStream,
  SpotlightPillars,
  EvolutionTimeline,
  PipelineArchitecture,
  BrowserDOMSpotlight,
  KineticTypography,
  FlowChart,
  CycleFlow,
  BranchFlow,
  Diagram,
  Chart,
  Counter,
  // BentoMediaGallery / PhysicsAnalogyCanvas 尚未接入完整动效
};

export const resolveComponent = (name: ComponentName): React.FC<any> => {
  const C = REGISTRY[name];
  if (C) return C;
  return ((p: any) => <Placeholder name={name} />) as React.FC<any>;
};

