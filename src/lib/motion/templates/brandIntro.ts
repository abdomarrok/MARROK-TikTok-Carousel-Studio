import {
  MotionBrandConfig,
  MotionTemplateConfig,
  MotionTemplateMeta,
} from '../../../types.ts';
import { drawMarrokVectorBadge } from '../../icons.ts';
import {
  DEFAULT_BRAND,
  clamp,
  spring,
  rng,
  wrapHTML,
  MotionTemplateDefinition,
} from '../base.ts';
import {
  SAFE_LEFT,
  SAFE_WIDTH,
  SAFE_CENTER_X,
  drawMarrokReelBackground,
  drawMarrokReelHeader,
  drawMarrokReelFooter,
  drawMarrokSurfaceCard,
  drawAnimatedBilingualSlideCopy,
} from '../marrokSlideChrome.ts';
import {
  computeSceneTransitionState,
  renderWithTransitionLayer,
} from '../transitions.ts';

const meta: MotionTemplateMeta = {
  id: 'brand-intro',
  name: 'MARROK Brand Intro',
  description:
    'Staggered geometric matrix build, radial scatter reveal of the MARROK vector logo mark, and bilingual slide lockup.',
  category: 'Identity & Openers',
  tags: ['MARROK Vector Logo', 'Geometric Build', 'Scatter Reveal', '4 Scenes'],
};

function defaultConfig(brandOverride?: Partial<MotionBrandConfig>): MotionTemplateConfig {
  const brand: MotionBrandConfig = {
    ...DEFAULT_BRAND,
    ...brandOverride,
  };
  return {
    brand,
    duration: 12,
    category: 'AI + SECURITY',
    scenes: [
      {
        id: 'scene-1',
        label: 'Geometric Build',
        text: 'SYSTEM MATRIX INITIALIZATION',
        enTitle: 'INITIALIZING ZERO-TRUST ARCHITECTURE',
        arTitle: 'تهيئة مصفوفة الهندسة والأمن السيبراني',
        from: 0,
        to: 3,
        springK: 180,
        springD: 22,
      },
      {
        id: 'scene-2',
        label: 'Logo Reveal',
        text: brand.name || 'MARROK',
        enTitle: 'MARROK SYSTEMS & AI RESEARCH',
        arTitle: 'ماروك لأبحاث الأنظمة والذكاء الاصطناعي',
        from: 3,
        to: 6,
        springK: 200,
        springD: 20,
      },
      {
        id: 'scene-3',
        label: 'Tagline Sweep',
        text: 'هندسة الأنظمة والأمن السيبراني',
        enTitle: 'DEEP ARCHITECTURAL BREAKDOWNS',
        arTitle: 'هندسة الأنظمة والأمن السيبراني المتقدم',
        from: 6,
        to: 9,
        springK: 180,
        springD: 22,
      },
      {
        id: 'scene-4',
        label: 'End Card Lockup',
        text: brand.name || 'MARROK',
        enTitle: 'SAVE & FOLLOW @MARROK',
        arTitle: 'احفظ المنشور وتابعنا للمزيد',
        from: 9,
        to: 12,
        springK: 190,
        springD: 22,
      },
    ],
  };
}

export function drawBrandIntroFrame(
  g: CanvasRenderingContext2D,
  config: MotionTemplateConfig,
  globalTime: number
): void {
  const b: MotionBrandConfig = { ...DEFAULT_BRAND, ...(config?.brand || {}) };
  const scenes = config?.scenes?.length ? config.scenes : defaultConfig(b).scenes;

  const transState = computeSceneTransitionState(
    scenes,
    globalTime,
    config?.defaultTransition || 'auto',
    b.direction || 'rtl'
  );

  g.save();
  // 1. Authentic MARROK Slide Background + Radial Glow + 108px Grid + CAD Reticles
  drawMarrokReelBackground(
    g,
    config,
    globalTime,
    transState.cameraPanX,
    transState.cameraZoom
  );
  // 2. Authentic MARROK Header with Vector Logo Badge + Wordmark + Category Tag
  drawMarrokReelHeader(g, config, globalTime);

  g.direction = b.direction || 'rtl';
  g.textBaseline = 'alphabetic';

  transState.layers.forEach((layer) => {
    const sc = layer.scene;
    const i = layer.index;

    renderWithTransitionLayer(g, layer, b.accentColor, (t) => {
      const k = sc.springK || 180;
      const d = sc.springD || 22;
      const text = sc.text || '';

      if (i === 0) {
        // Scene 1: Staggered 6x5 Geometric Matrix inside MARROK Surface Card
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          220,
          SAFE_WIDTH,
          460,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'GEOMETRIC_MATRIX // 01',
          'SYS_BOOT',
          spring(t, 180, 22)
        );

        const r = rng(99);
        const cols = 6;
        const rows = 4;
        const gridW = SAFE_WIDTH - 80;
        const gridH = 340;
        const cellW = gridW / cols;
        const cellH = gridH / rows;

        for (let idx = 0; idx < cols * rows; idx++) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const delay = (col + row) * 0.04 + r() * 0.06;
          const s = spring(t - delay, k, d);
          if (s <= 0) continue;
          const cx = SAFE_LEFT + 40 + col * cellW + cellW / 2;
          const cy = 295 + row * cellH + cellH / 2;
          const sz = Math.min(cellW, cellH) * 0.55 * s;

          g.save();
          if ((col + row) % 4 === 0) {
            g.fillStyle = b.accentColor;
            g.globalAlpha = clamp((t - delay) * 4);
          } else {
            g.fillStyle = b.textColor;
            g.globalAlpha = 0.14 * clamp((t - delay) * 4);
          }
          const shape = r();
          if (shape > 0.6) {
            g.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
          } else if (shape > 0.3) {
            g.beginPath();
            g.arc(cx, cy, sz / 2, 0, Math.PI * 2);
            g.fill();
          } else {
            g.translate(cx, cy);
            g.rotate(Math.PI / 4);
            g.fillRect(-sz / 2.8, -sz / 2.8, sz / 1.4, sz / 1.4);
          }
          g.restore();
        }

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 745);
      } else if (i === 1) {
        // Scene 2: Particle Scatter + Large Authentic MARROK Vector Logo Reveal
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          220,
          SAFE_WIDTH,
          490,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'BRAND_REVEAL // 02',
          b.name || 'MARROK',
          spring(t, 180, 22)
        );

        const logoS = spring(t - 0.08, k, d);
        g.save();
        g.shadowColor = b.accentColor;
        g.shadowBlur = 36;
        drawMarrokVectorBadge(
          g,
          SAFE_CENTER_X,
          405,
          Math.max(32, 164 * logoS),
          b.accentColor,
          '#0B0C12'
        );
        g.restore();

        const ls = spring(t - 0.22, k, d);
        g.save();
        g.direction = 'ltr';
        g.globalAlpha = clamp((t - 0.18) * 4);
        g.fillStyle = b.textColor;
        g.font = `800 84px "Plus Jakarta Sans", "${b.font}", sans-serif`;
        g.textAlign = 'center';
        g.translate(SAFE_CENTER_X, 625);
        g.scale(0.95 + 0.05 * ls, 0.95 + 0.05 * ls);
        g.fillText(text || b.name, 0, 0, SAFE_WIDTH - 80);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 775);
      } else if (i === 2) {
        // Scene 3: Topic Tagline Sweep Card
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          220,
          SAFE_WIDTH,
          450,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'DOMAIN_FOCUS // 03',
          'VERIFIED',
          spring(t, 180, 22)
        );

        const bar = spring(t - 0.05, 160, 22);
        g.save();
        g.fillStyle = b.accentColor;
        g.fillRect(SAFE_LEFT + 60, 515, (SAFE_WIDTH - 120) * bar, 8);
        g.restore();

        const ts = spring(t - 0.15, k, d);
        g.save();
        g.direction = b.direction;
        g.globalAlpha = clamp((t - 0.15) * 5);
        g.fillStyle = b.textColor;
        g.font = `800 64px "${b.font}", "Cairo", sans-serif`;
        g.textAlign = 'center';
        g.translate(SAFE_CENTER_X, 455 + 60 * (1 - ts));
        g.fillText(text, 0, 0, SAFE_WIDTH - 90);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 740);
      } else {
        // Scene 4: End Card Lockup with MARROK Vector Badge
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          220,
          SAFE_WIDTH,
          500,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'END_LOCKUP // 04',
          `@${(b.name || 'MARROK').toUpperCase()}`,
          spring(t, 180, 22)
        );

        const s = spring(t - 0.08, k, d);
        g.save();
        g.shadowColor = b.accentColor;
        g.shadowBlur = 32;
        drawMarrokVectorBadge(
          g,
          SAFE_CENTER_X,
          395,
          Math.max(30, 140 * s),
          b.accentColor,
          '#0B0C12'
        );
        g.restore();

        g.save();
        g.direction = 'ltr';
        g.globalAlpha = clamp((t - 0.15) * 4);
        g.fillStyle = b.textColor;
        g.font = `800 82px "Plus Jakarta Sans", "${b.font}", sans-serif`;
        g.textAlign = 'center';
        g.fillText(text || b.name, SAFE_CENTER_X, 605, SAFE_WIDTH - 80);

        const bar = spring(t - 0.25, 160, 22);
        g.fillStyle = b.accentColor;
        g.fillRect(SAFE_CENTER_X - 200 * bar, 645, 400 * bar, 6);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 785);
      }
    });
  });

  // 3. Authentic MARROK Pagination & Attribution Footer
  drawMarrokReelFooter(
    g,
    config,
    globalTime,
    transState.activeSceneIdx,
    scenes.length,
    transState.fractionalSceneIdx
  );

  g.restore();
}

function toHTML(config: MotionTemplateConfig): string {
  const b: MotionBrandConfig = { ...DEFAULT_BRAND, ...(config?.brand || {}) };
  const scenes = config?.scenes?.length ? config.scenes : defaultConfig(b).scenes;
  const sceneBlocks = scenes.map((sc, i) => {
    const from = sc.from ?? i * 3;
    const to = sc.to ?? from + 3;
    const k = sc.springK || 180;
    const d = sc.springD || 22;
    const text = sc.text || b.name;
    return `  { from: ${from}, to: ${to}, draw(t) {
    const s = spring(t - 0.1, ${k}, ${d});
    g.save();
    g.fillStyle = '#12131C';
    g.strokeStyle = '${b.accentColor}';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(82, 220, 863, 480, 24);
    g.fill();
    g.stroke();
    drawMarrokVectorBadge(g, 513.5, 400, Math.max(28, 130 * s), '${b.accentColor}', '#0B0C12');
    g.direction = '${b.direction}'; g.globalAlpha = clamp(t * 5);
    g.fillStyle = '${b.textColor}';
    g.font = '800 72px "${b.font}", sans-serif';
    g.textAlign = 'center';
    g.fillText(${JSON.stringify(text)}, 513.5, 610, 780);
    g.restore();
  }}`;
  });
  return wrapHTML(config, `const SCENES = [\n${sceneBlocks.join(',\n')}\n];`);
}

export const brandIntroTemplate: MotionTemplateDefinition = {
  meta,
  defaultConfig,
  toHTML,
  drawFrame: drawBrandIntroFrame,
};
