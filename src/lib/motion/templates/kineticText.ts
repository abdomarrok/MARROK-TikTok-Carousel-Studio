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
  id: 'kinetic-text',
  name: 'Kinetic Slide Hook',
  description:
    'High-retention kinetic Arabic & English slide typography with MARROK vector badge, surface cards, and spring physics.',
  category: 'Typography & Hooks',
  tags: ['MARROK Chrome', 'Kinetic EN/AR', 'High Retention', '6 Scenes'],
};

function defaultConfig(brandOverride?: Partial<MotionBrandConfig>): MotionTemplateConfig {
  const brand: MotionBrandConfig = {
    ...DEFAULT_BRAND,
    ...brandOverride,
  };
  return {
    brand,
    duration: 20,
    category: 'AI + SECURITY',
    scenes: [
      {
        id: 'scene-1',
        label: 'Hook',
        text: 'لماذا تفشل الأنظمة؟',
        enTitle: 'WHY LEGACY SYSTEMS FAIL',
        arTitle: 'لماذا تفشل الأنظمة التقليدية؟',
        enBody: 'Critical architectural bottlenecks hidden inside monolithic stacks.',
        arBody: 'الاختناقات المعمارية الخفية داخل الأنظمة المركزية.',
        from: 0,
        to: 3,
        springK: 260,
        springD: 20,
      },
      {
        id: 'scene-2',
        label: 'Reveal',
        text: 'الهندسة العكسية والأمن',
        enTitle: 'DEEP ARCHITECTURAL BREAKDOWN',
        arTitle: 'الهندسة العكسية والأمن السيبراني',
        enBody: 'Zero-trust verification across every kernel boundary.',
        arBody: 'تحقق أمني صارم عبر كل طبقة من طبقات النواة.',
        from: 3,
        to: 6.5,
        springK: 220,
        springD: 22,
      },
      {
        id: 'scene-3',
        label: 'Features',
        text: 'عزل النواة | تشفير فوري | صفر ثقة',
        enTitle: 'CORE ARCHITECTURAL PILLARS',
        arTitle: 'ركائز الحماية الأساسية',
        from: 6.5,
        to: 11,
        springK: 200,
        springD: 22,
      },
      {
        id: 'scene-4',
        label: 'Brand Focus',
        text: brand.name || 'MARROK',
        enTitle: 'MARROK ENGINEERING STUDIO',
        arTitle: 'استوديو ماروك للتحليلات الهندسية',
        from: 11,
        to: 14,
        springK: 240,
        springD: 20,
      },
      {
        id: 'scene-5',
        label: 'Tagline',
        text: 'SYSTEM ARCHITECTURE',
        enTitle: 'SYSTEM ARCHITECTURE & AI',
        arTitle: 'معمارية الأنظمة والذكاء الاصطناعي',
        from: 14,
        to: 17,
        springK: 180,
        springD: 24,
      },
      {
        id: 'scene-6',
        label: 'Call to Action',
        text: 'تابع للمزيد من التحليلات',
        enTitle: 'FOLLOW FOR DEEP TECH BREAKDOWNS',
        arTitle: 'تابع للمزيد من التحليلات الهندسية',
        from: 17,
        to: 20,
        springK: 220,
        springD: 22,
      },
    ],
  };
}

export function drawKineticTextFrame(
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
      const k = sc.springK || 220;
      const d = sc.springD || 22;
      const text = sc.text || '';

      if (i === 0) {
        // Scene 1: Kinetic Hook Card + Bilingual Slide Copy
        const r = rng(12);
        for (let j = 0; j < 6; j++) {
          const bx = SAFE_LEFT + r() * (SAFE_WIDTH - 140);
          const by = 220 + r() * 420;
          const bw = 40 + r() * 140;
          const bh = 2 + r() * 3;
          const bs = spring(t - j * 0.04, 180, 24);
          g.save();
          g.globalAlpha = 0.08 * clamp((t - j * 0.04) * 4);
          g.fillStyle = b.accentColor;
          g.fillRect(bx, by, bw * bs, bh);
          g.restore();
        }

        const cardS = spring(t, 180, 22);
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          220,
          SAFE_WIDTH,
          440,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'KINETIC_HOOK // 01',
          'HIGH_PRIORITY',
          cardS
        );

        // Central MARROK Vector Badge + Kinetic Headline inside top card
        drawMarrokVectorBadge(
          g,
          SAFE_CENTER_X,
          355,
          Math.max(24, 78 * spring(t - 0.06, 220, 18)),
          b.accentColor,
          '#0B0C12'
        );

        const s = spring(t - 0.1, k, d);
        g.save();
        g.direction = b.direction;
        g.globalAlpha = clamp(t * 5);
        g.fillStyle = b.textColor;
        g.font = `800 68px "${b.font}", "Cairo", "Plus Jakarta Sans", sans-serif`;
        g.textAlign = 'center';
        g.translate(SAFE_CENTER_X, 515);
        g.scale(0.94 + 0.06 * s, 0.94 + 0.06 * s);
        g.fillText(text, 0, 0, SAFE_WIDTH - 80);
        g.restore();

        g.save();
        g.fillStyle = b.accentColor;
        const bar = spring(t - 0.12, 200, 22);
        g.fillRect(SAFE_CENTER_X - 260 * bar, 560, 520 * bar, 10);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 735);
      } else if (i === 1) {
        // Scene 2: Architectural Reveal Card + Bilingual Slide Copy
        const cardS = spring(t - 0.05, 160, 24);
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          220,
          SAFE_WIDTH,
          440,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'ARCH_REVEAL // 02',
          'VERIFIED',
          cardS
        );

        const s = spring(t - 0.15, k, d);
        g.save();
        g.direction = b.direction;
        g.globalAlpha = clamp((t - 0.15) * 5);
        g.fillStyle = b.textColor;
        g.font = `800 64px "${b.font}", "Cairo", sans-serif`;
        g.textAlign = 'center';
        g.translate(SAFE_CENTER_X, 455);
        g.scale(0.96 + 0.04 * s, 0.96 + 0.04 * s);
        g.fillText(text, 0, 0, SAFE_WIDTH - 90);
        g.restore();

        g.save();
        g.fillStyle = b.accentColor;
        const bar = spring(t - 0.18, 180, 24);
        g.fillRect(SAFE_LEFT + 70, 530, (SAFE_WIDTH - 140) * bar, 8);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 735);
      } else if (i === 2) {
        // Scene 3: Staggered MARROK Takeaway Cards (pipe-separated)
        const items = text.split('|');
        items.forEach((txt, idx) => {
          const st = t - idx * 0.15;
          const s = spring(st, k, d);
          const cardY = 250 + idx * 290;

          drawMarrokSurfaceCard(
            g,
            SAFE_LEFT,
            cardY,
            SAFE_WIDTH,
            245,
            b.accentColor,
            b.surfaceColor || '#12131C',
            b.surfaceBorder || '#252838',
            `PILLAR // 0${idx + 1}`,
            `STAGE_${idx + 1}`,
            clamp(s, 0, 1)
          );

          g.save();
          g.direction = b.direction;
          g.globalAlpha = clamp(st * 4);
          g.translate(SAFE_CENTER_X, cardY + 145);
          g.scale(0.92 + 0.08 * s, 0.92 + 0.08 * s);
          g.fillStyle = b.textColor;
          g.font = `800 62px "${b.font}", "Cairo", sans-serif`;
          g.textAlign = 'center';
          g.fillText(txt.trim(), 0, 0, SAFE_WIDTH - 90);

          g.fillStyle = b.accentColor;
          g.fillRect(-180 * s, 38, 360 * s, 7);
          g.restore();
        });

        if (sc.enTitle || sc.arTitle) {
          drawAnimatedBilingualSlideCopy(g, sc, b, t, 1160);
        }
      } else if (i === 3) {
        // Scene 4: Authentic MARROK Vector Brand Focus Lockup
        const cardS = spring(t, 180, 22);
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          240,
          SAFE_WIDTH,
          660,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'BRAND_IDENTITY // MARROK',
          'CORE_ENGINE',
          cardS
        );

        const logoScale = spring(t - 0.08, 220, 18);
        g.save();
        g.shadowColor = b.accentColor;
        g.shadowBlur = 32;
        drawMarrokVectorBadge(
          g,
          SAFE_CENTER_X,
          460,
          Math.max(32, 168 * logoScale),
          b.accentColor,
          '#0B0C12'
        );
        g.restore();

        const s = spring(t - 0.14, k, d);
        g.save();
        g.direction = 'ltr';
        g.globalAlpha = clamp((t - 0.1) * 5);
        g.fillStyle = b.textColor;
        g.font = `800 112px "Plus Jakarta Sans", "${b.font}", sans-serif`;
        g.textAlign = 'center';
        g.translate(SAFE_CENTER_X, 710);
        g.scale(0.96 + 0.04 * s, 0.96 + 0.04 * s);
        g.fillText(text || b.name, 0, 0, SAFE_WIDTH - 80);
        g.fillStyle = b.accentColor;
        g.fillRect(-240 * s, 42, 480 * s, 10);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 960);
      } else if (i === 4) {
        // Scene 5: Domain Tagline Card + Bilingual Copy
        const cardS = spring(t, 180, 22);
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          240,
          SAFE_WIDTH,
          440,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'DOMAIN_SPEC // 05',
          b.name || 'MARROK',
          cardS
        );

        const s = spring(t - 0.1, k, d);
        g.save();
        g.direction = 'ltr';
        g.globalAlpha = clamp((t - 0.1) * 5);
        g.fillStyle = b.textColor;
        g.font = `800 72px "Plus Jakarta Sans", "${b.font}", sans-serif`;
        g.textAlign = 'center';
        g.translate(SAFE_CENTER_X, 445);
        g.scale(0.96 + 0.04 * s, 0.96 + 0.04 * s);
        g.fillText(text, 0, 0, SAFE_WIDTH - 80);
        g.restore();

        g.save();
        g.fillStyle = b.accentColor;
        const bar = spring(t - 0.2, 180, 22);
        g.fillRect(SAFE_CENTER_X - 300 * bar, 505, 600 * bar, 8);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 745);
      } else {
        // Scene 6: Call to Action Slide Lockup with MARROK Vector Badge
        const cardS = spring(t, 180, 22);
        drawMarrokSurfaceCard(
          g,
          SAFE_LEFT,
          230,
          SAFE_WIDTH,
          520,
          b.accentColor,
          b.surfaceColor || '#12131C',
          b.surfaceBorder || '#252838',
          'CTA_LOCKUP // FOLLOW',
          `@${(b.name || 'MARROK').toUpperCase()}`,
          cardS
        );

        drawMarrokVectorBadge(
          g,
          SAFE_CENTER_X,
          375,
          Math.max(24, 104 * spring(t - 0.08, 220, 18)),
          b.accentColor,
          '#0B0C12'
        );

        const s1 = spring(t - 0.12, k, d);
        g.save();
        g.direction = b.direction;
        g.globalAlpha = clamp((t - 0.1) * 5);
        g.fillStyle = b.textColor;
        g.font = `800 62px "${b.font}", "Cairo", sans-serif`;
        g.textAlign = 'center';
        g.translate(SAFE_CENTER_X, 535);
        g.scale(0.96 + 0.04 * s1, 0.96 + 0.04 * s1);
        g.fillText(text, 0, 0, SAFE_WIDTH - 80);
        g.restore();

        const btnS = spring(t - 0.35, 200, 22);
        g.save();
        g.globalAlpha = clamp((t - 0.35) * 4);
        g.fillStyle = b.accentColor;
        const bw = 480 * clamp(btnS, 0.2, 1);
        const bh = 72;
        g.beginPath();
        g.roundRect(SAFE_CENTER_X - bw / 2, 595, bw, bh, 16);
        g.fill();
        g.fillStyle = b.bgColor || '#080A12';
        g.direction = 'ltr';
        g.font = '800 30px "Plus Jakarta Sans", sans-serif';
        g.textAlign = 'center';
        g.fillText(`FOLLOW @${(b.name || 'MARROK').toUpperCase()} →`, SAFE_CENTER_X, 642, bw - 32);
        g.restore();

        drawAnimatedBilingualSlideCopy(g, sc, b, t, 810);
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
  const sceneBlocks: string[] = [];

  scenes.forEach((sc, i) => {
    const from = sc.from ?? i * 3;
    const to = sc.to ?? from + 3;
    const k = sc.springK || 220;
    const d = sc.springD || 22;
    const text = sc.text || '';

    if (i === 2 && text.includes('|')) {
      sceneBlocks.push(`  { from: ${from}, to: ${to}, draw(t) {
    g.save(); g.direction = '${b.direction}';
    const items = ${JSON.stringify(text)}.split('|');
    items.forEach((txt, idx) => {
      const st = t - idx * 0.15;
      const s = spring(st, ${k}, ${d});
      const y = 300 + idx * 290;
      g.save();
      g.globalAlpha = clamp(st * 4);
      g.fillStyle = '#12131C';
      g.strokeStyle = '${b.accentColor}';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(82, y, 863, 230, 20);
      g.fill();
      g.stroke();
      g.fillStyle = '${b.textColor}';
      g.font = '800 62px "${b.font}", sans-serif';
      g.textAlign = 'center';
      g.fillText(txt.trim(), 513.5, y + 135, 760);
      g.restore();
    });
    g.restore();
  }}`);
    } else {
      sceneBlocks.push(`  { from: ${from}, to: ${to}, draw(t) {
    const s = spring(t - 0.1, ${k}, ${d});
    g.save();
    g.fillStyle = '#12131C';
    g.strokeStyle = '${b.accentColor}';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(82, 220, 863, 440, 24);
    g.fill();
    g.stroke();
    drawMarrokVectorBadge(g, 513.5, 365, Math.max(24, 88 * s), '${b.accentColor}', '#0B0C12');
    g.direction = '${b.direction}';
    g.globalAlpha = clamp(t * 5);
    g.fillStyle = '${b.textColor}';
    g.font = '800 68px "${b.font}", sans-serif';
    g.textAlign = 'center';
    g.fillText(${JSON.stringify(text)}, 513.5, 535, 780);
    g.restore();
  }}`);
    }
  });

  const scenesCode = `const SCENES = [\n${sceneBlocks.join(',\n')}\n];`;
  return wrapHTML(config, scenesCode);
}

export const kineticTextTemplate: MotionTemplateDefinition = {
  meta,
  defaultConfig,
  toHTML,
  drawFrame: drawKineticTextFrame,
};
