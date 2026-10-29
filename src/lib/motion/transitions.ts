import {
  MotionSceneConfig,
  MotionTransitionType,
  SlideType,
} from '../../types.ts';

export const TRANSITION_WINDOW = 0.42; // 420ms smooth overlap window across scene cuts

export type ConcreteTransitionMode = Exclude<MotionTransitionType, 'auto'>;

export interface SceneRenderLayer {
  scene: MotionSceneConfig;
  index: number;
  localTime: number;
  role: 'active' | 'outgoing' | 'incoming';
  alpha: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  clipProgress?: number; // [0..1] for kinetic-wipe scanline clip
  clipMode?: 'outgoing' | 'incoming';
  transitionMode: ConcreteTransitionMode;
  transitionProgress: number; // 0 when not transitioning, 0..1 during overlap
}

export interface SceneTransitionFrameState {
  activeSceneIdx: number;
  fractionalSceneIdx: number;
  inTransition: boolean;
  transitionMode: ConcreteTransitionMode;
  transitionProgress: number; // 0..1
  cameraPanX: number;
  cameraZoom: number;
  layers: SceneRenderLayer[];
}

const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));

function easeInOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function inferSlideArchetype(scene?: MotionSceneConfig, idx = 0): SlideType {
  if (!scene) return 'row';
  if (scene.slideType) return scene.slideType;
  const lbl = (scene.label || '').toLowerCase();
  if (lbl.includes('hub') || lbl.includes('hook') || lbl.includes('matrix') || idx === 0) {
    return 'hub';
  }
  if (lbl.includes('code') || lbl.includes('terminal') || scene.codeSnippet) {
    return 'code';
  }
  if (lbl.includes('metric') || lbl.includes('benchmark') || scene.metricValue) {
    return 'metric';
  }
  if (lbl.includes('cta') || lbl.includes('follow') || lbl.includes('lockup') || lbl.includes('action')) {
    return 'cta';
  }
  return 'row';
}

/**
 * Resolves the optimal concrete transition mode between `prevScene` and `nextScene`
 * when `nextScene.transition` or `defaultTransition` is set to `'auto'`.
 */
export function resolveSmartTransition(
  prevScene: MotionSceneConfig | undefined,
  nextScene: MotionSceneConfig | undefined,
  defaultTransition: MotionTransitionType = 'auto',
  sceneIndex = 1
): ConcreteTransitionMode {
  const explicit = nextScene?.transition && nextScene.transition !== 'auto'
    ? nextScene.transition
    : defaultTransition !== 'auto'
      ? defaultTransition
      : 'auto';

  if (explicit !== 'auto') {
    return explicit;
  }

  const prevType = inferSlideArchetype(prevScene, Math.max(0, sceneIndex - 1));
  const nextType = inferSlideArchetype(nextScene, sceneIndex);

  // 1. Entering a live code terminal uses a glowing laser blueprint wipe
  if (nextType === 'code') {
    return 'kinetic-wipe';
  }

  // 2. Opening hub -> first mechanism or closing CTA lockup uses 3D Z-depth zoom
  if (prevType === 'hub' && sceneIndex === 1) {
    return 'depth';
  }
  if (nextType === 'cta') {
    return 'depth';
  }

  // 3. Staggered pipe-separated takeaway lists -> next scene uses CAD whip-pan
  if ((prevScene?.text || '').includes('|') || (nextScene?.text || '').includes('|')) {
    return 'whip-pan';
  }

  // 4. Consecutive architectural/metric/row slides morph their shared surface card seamlessly
  if (
    (prevType === 'row' || prevType === 'number' || prevType === 'metric' || prevType === 'compare' || prevType === 'code') &&
    (nextType === 'row' || nextType === 'number' || nextType === 'metric' || nextType === 'compare')
  ) {
    return 'morph';
  }

  return 'morph';
}

/**
 * Computes the active and overlapping transition layers for any timestamp `globalTime`.
 * Eliminates 0ms hard cuts by creating a smooth cross-choreographed overlap window (`±TRANSITION_WINDOW / 2`)
 * around each scene boundary.
 */
export function computeSceneTransitionState(
  scenes: MotionSceneConfig[],
  globalTime: number,
  defaultTransition: MotionTransitionType = 'auto',
  direction: 'rtl' | 'ltr' = 'rtl'
): SceneTransitionFrameState {
  if (!scenes || scenes.length === 0) {
    return {
      activeSceneIdx: 0,
      fractionalSceneIdx: 0,
      inTransition: false,
      transitionMode: 'morph',
      transitionProgress: 0,
      cameraPanX: 0,
      cameraZoom: 1,
      layers: [],
    };
  }

  // Locate primary scene index
  let activeIdx = scenes.length - 1;
  for (let i = 0; i < scenes.length; i++) {
    const from = scenes[i].from ?? i * 3.5;
    const to = scenes[i].to ?? from + 3.5;
    if (globalTime >= from && globalTime < to) {
      activeIdx = i;
      break;
    }
  }
  if (globalTime < (scenes[0].from ?? 0)) {
    activeIdx = 0;
  }

  const currentScene = scenes[activeIdx];
  const curFrom = currentScene.from ?? activeIdx * 3.5;
  const curTo = currentScene.to ?? curFrom + 3.5;
  const curDur = Math.max(0.8, curTo - curFrom);
  const halfWin = Math.min(TRANSITION_WINDOW / 2, curDur * 0.25);

  const dirSign = direction === 'rtl' ? -1 : 1;

  // Check if we are in the overlap window with the NEXT scene (near curTo)
  if (activeIdx < scenes.length - 1 && globalTime >= curTo - halfWin) {
    const nextScene = scenes[activeIdx + 1];
    const nextFrom = nextScene.from ?? curTo;
    const mode = resolveSmartTransition(currentScene, nextScene, defaultTransition, activeIdx + 1);
    // Raw progress across [curTo - halfWin .. curTo + halfWin] -> here we are in the first half [0 .. 0.5]
    const rawP = clamp((globalTime - (curTo - halfWin)) / (halfWin * 2), 0, 1);
    const p = easeInOutCubic(rawP);

    return buildOverlapState(
      currentScene,
      activeIdx,
      Math.max(0, globalTime - curFrom),
      nextScene,
      activeIdx + 1,
      Math.max(0.02, globalTime - nextFrom + halfWin),
      mode,
      p,
      dirSign,
      activeIdx
    );
  }

  // Check if we are in the second half of the overlap window with the PREVIOUS scene (just after curFrom)
  if (activeIdx > 0 && globalTime < curFrom + halfWin) {
    const prevScene = scenes[activeIdx - 1];
    const prevFrom = prevScene.from ?? (activeIdx - 1) * 3.5;
    const mode = resolveSmartTransition(prevScene, currentScene, defaultTransition, activeIdx);
    const rawP = clamp((globalTime - (curFrom - halfWin)) / (halfWin * 2), 0, 1);
    const p = easeInOutCubic(rawP);

    return buildOverlapState(
      prevScene,
      activeIdx - 1,
      Math.max(0, globalTime - prevFrom),
      currentScene,
      activeIdx,
      Math.max(0.02, globalTime - curFrom + halfWin),
      mode,
      p,
      dirSign,
      activeIdx
    );
  }

  // Standard steady-state single scene
  return {
    activeSceneIdx: activeIdx,
    fractionalSceneIdx: activeIdx,
    inTransition: false,
    transitionMode: resolveSmartTransition(
      activeIdx > 0 ? scenes[activeIdx - 1] : undefined,
      currentScene,
      defaultTransition,
      activeIdx
    ),
    transitionProgress: 0,
    cameraPanX: 0,
    cameraZoom: 1,
    layers: [
      {
        scene: currentScene,
        index: activeIdx,
        localTime: Math.max(0, globalTime - curFrom),
        role: 'active',
        alpha: 1,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        transitionMode: 'morph',
        transitionProgress: 0,
      },
    ],
  };
}

function buildOverlapState(
  outScene: MotionSceneConfig,
  outIdx: number,
  outLocalTime: number,
  inScene: MotionSceneConfig,
  inIdx: number,
  inLocalTime: number,
  mode: ConcreteTransitionMode,
  p: number,
  dirSign: number,
  primaryIdx: number
): SceneTransitionFrameState {
  let outLayer: SceneRenderLayer;
  let inLayer: SceneRenderLayer;
  let cameraPanX = 0;
  let cameraZoom = 1;

  if (mode === 'depth') {
    // Outgoing scene recedes into Z-depth while incoming scene emerges from foreground
    outLayer = {
      scene: outScene,
      index: outIdx,
      localTime: outLocalTime,
      role: 'outgoing',
      alpha: clamp(1 - p * 1.15, 0, 1),
      scale: 1 - p * 0.12,
      offsetX: 0,
      offsetY: -p * 36,
      transitionMode: mode,
      transitionProgress: p,
    };
    inLayer = {
      scene: inScene,
      index: inIdx,
      localTime: inLocalTime,
      role: 'incoming',
      alpha: clamp((p - 0.08) * 1.15, 0, 1),
      scale: 1.08 - (1 - p) * 0.08,
      offsetX: 0,
      offsetY: (1 - p) * 44,
      transitionMode: mode,
      transitionProgress: p,
    };
    cameraZoom = 1 + Math.sin(p * Math.PI) * 0.025;
  } else if (mode === 'whip-pan') {
    // Continuous CAD blueprint whip-pan across horizontal axis
    const panDist = 920 * dirSign;
    outLayer = {
      scene: outScene,
      index: outIdx,
      localTime: outLocalTime,
      role: 'outgoing',
      alpha: clamp(1 - p * 1.1, 0, 1),
      scale: 1 - Math.sin(p * Math.PI) * 0.04,
      offsetX: -p * panDist,
      offsetY: 0,
      transitionMode: mode,
      transitionProgress: p,
    };
    inLayer = {
      scene: inScene,
      index: inIdx,
      localTime: inLocalTime,
      role: 'incoming',
      alpha: clamp(p * 1.15, 0, 1),
      scale: 1 - Math.sin(p * Math.PI) * 0.04,
      offsetX: (1 - p) * panDist,
      offsetY: 0,
      transitionMode: mode,
      transitionProgress: p,
    };
    cameraPanX = -p * 108 * dirSign;
  } else if (mode === 'kinetic-wipe') {
    // Glowing blueprint laser scanline wipe from top to bottom of the safe zone
    outLayer = {
      scene: outScene,
      index: outIdx,
      localTime: outLocalTime,
      role: 'outgoing',
      alpha: clamp(1 - p * 0.35, 0, 1),
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      clipProgress: p,
      clipMode: 'outgoing',
      transitionMode: mode,
      transitionProgress: p,
    };
    inLayer = {
      scene: inScene,
      index: inIdx,
      localTime: inLocalTime,
      role: 'incoming',
      alpha: 1,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      clipProgress: p,
      clipMode: 'incoming',
      transitionMode: mode,
      transitionProgress: p,
    };
  } else {
    // 'morph': Shared surface card morphs seamlessly while inner schematic & copy cross-dissolve with gentle vertical drift
    outLayer = {
      scene: outScene,
      index: outIdx,
      localTime: outLocalTime,
      role: 'outgoing',
      alpha: clamp(1 - p * 1.18, 0, 1),
      scale: 1 - p * 0.03,
      offsetX: 0,
      offsetY: -p * 24,
      transitionMode: 'morph',
      transitionProgress: p,
    };
    inLayer = {
      scene: inScene,
      index: inIdx,
      localTime: inLocalTime,
      role: 'incoming',
      alpha: clamp((p - 0.05) * 1.12, 0, 1),
      scale: 0.97 + p * 0.03,
      offsetX: 0,
      offsetY: (1 - p) * 24,
      transitionMode: 'morph',
      transitionProgress: p,
    };
  }

  return {
    activeSceneIdx: primaryIdx,
    fractionalSceneIdx: outIdx + p,
    inTransition: true,
    transitionMode: mode,
    transitionProgress: p,
    cameraPanX,
    cameraZoom,
    layers: [outLayer, inLayer],
  };
}

/**
 * Applies the transition layer's alpha, 2D/depth transform, and optional scanline clip region
 * around a scene draw callback.
 */
export function renderWithTransitionLayer(
  ctx: CanvasRenderingContext2D,
  layer: SceneRenderLayer,
  accentColor: string,
  drawCallback: (localTime: number, layer: SceneRenderLayer) => void
): void {
  if (layer.alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha *= clamp(layer.alpha, 0, 1);

  // Optional vertical scanline clip for 'kinetic-wipe'
  const wipeTop = 195;
  const wipeBottom = 1740;
  const wipeSpan = wipeBottom - wipeTop;
  const scanY = wipeTop + wipeSpan * clamp(layer.clipProgress ?? 0, 0, 1);

  if (layer.transitionMode === 'kinetic-wipe' && layer.clipProgress !== undefined && typeof ctx.clip === 'function') {
    ctx.beginPath();
    if (layer.clipMode === 'incoming') {
      ctx.rect(0, 0, 1080, scanY);
    } else {
      ctx.rect(0, scanY, 1080, 1920 - scanY);
    }
    ctx.clip();
  }

  // Apply center-pivoted scale and translation
  if (layer.offsetX !== 0 || layer.offsetY !== 0 || Math.abs(layer.scale - 1) > 0.001) {
    const pivotX = 540;
    const pivotY = 860;
    ctx.translate(pivotX + layer.offsetX, pivotY + layer.offsetY);
    ctx.scale(layer.scale, layer.scale);
    ctx.translate(-pivotX, -pivotY);
  }

  drawCallback(layer.localTime, layer);
  ctx.restore();

  // Draw glowing blueprint laser scanline on incoming kinetic-wipe layer
  if (
    layer.transitionMode === 'kinetic-wipe' &&
    layer.role === 'incoming' &&
    layer.clipProgress !== undefined &&
    layer.clipProgress > 0.02 &&
    layer.clipProgress < 0.98
  ) {
    drawScanlineBeam(ctx, scanY, accentColor, layer.clipProgress);
  }
}

function drawScanlineBeam(
  ctx: CanvasRenderingContext2D,
  y: number,
  accent: string,
  progress: number
): void {
  const envelope = Math.sin(progress * Math.PI);
  ctx.save();
  ctx.globalAlpha = 0.85 * envelope;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, y);
  ctx.lineTo(955, y);
  ctx.stroke();

  // Diamond CAD reticles on both ends of the laser scanline
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(72 - 4, y - 4, 8, 8);
  ctx.fillRect(955 - 4, y - 4, 8, 8);
  ctx.restore();
}

export const TRANSITION_OPTIONS: Array<{ id: MotionTransitionType; label: string; badge: string }> = [
  { id: 'auto', label: 'Smart Auto (Archetype-Aware)', badge: 'AUTO' },
  { id: 'morph', label: 'Shared Surface Card Morph', badge: 'MORPH' },
  { id: 'depth', label: '3D Depth Zoom-Through', badge: 'DEPTH' },
  { id: 'kinetic-wipe', label: 'Blueprint Laser Scanline Wipe', badge: 'WIPE' },
  { id: 'whip-pan', label: 'Continuous CAD Whip-Pan', badge: 'PAN' },
];
