import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {FPS} from './data';
import {SceneV4} from './v4/SceneV4';
import {OverlayV4} from './v4/OverlayV4';
import {TOTAL_F} from './v4/timing';

const W = 1920;
const H = 1080;

// 日历一镜到底：钩子 → 开场 → 6 幕 → 成绩单 / 11 月 / 揭秘
const Launch: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#07080b'}}>
    <ThreeCanvas
      width={W}
      height={H}
      dpr={1}
      shadows="soft"
      gl={{antialias: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping}}
      camera={{fov: 36, near: 0.1, far: 80, position: [0, 17, 3]}}
    >
      <SceneV4 />
    </ThreeCanvas>
    <OverlayV4 />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <Composition id="Launch" component={Launch} durationInFrames={TOTAL_F} fps={FPS} width={W} height={H} />
);
