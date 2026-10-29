import {
  MotionBrandConfig,
  MotionSceneConfig,
  MotionTemplateConfig,
  MotionTemplateMeta,
} from '../../../types.ts';
import { drawMarrokVectorBadge } from '../../icons.ts';
import {
  DEFAULT_BRAND,
  clamp,
  spring,
  wrapHTML,
  MotionTemplateDefinition,
} from '../base.ts';
import {
  SAFE_LEFT,
  SAFE_WIDTH,
  SAFE_CENTER_X,
  hexToRgba,
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
  id: 'marrok-slides',
  name: 'MARROK Slide Deck',
  description:
    'Animates your full MARROK bilingual slides with the authentic vector logo badge, orbital hub schematics, live code terminals, metric sparklines, and spring typography.',
  category: 'Signature MARROK Format',
  tags: ['Bilingual EN/AR', 'MARROK Logo', 'Slide Schematics', 'Full Deck'],
};

function defaultConfig(brandOverride?: Partial<MotionBrandConfig>): MotionTemplateConfig {
  const brand: MotionBrandConfig = {
    ...DEFAULT_BRAND,
    ...brandOverride,
  };
  return {
    brand,
    duration: 18,
    category: 'AI + SECURITY',
    scenes: [
      {
        id: 'scene-1',
        label: 'Slide 01 · Hub Hook',
        text: 'WHY LEGACY KERNELS FAIL',
        enTitle: 'WHY LEGACY KERNELS FAIL UNDER AI WORKLOADS',
        arTitle: 'لماذا تفشل الأنظمة التقليدية أمام نماذج الذكاء الاصطناعي؟',
        enBody: 'Traditional monolithic memory spaces expose critical attack surfaces during high-throughput inference.',
        arBody: 'الذاكرة المشتركة التقليدية تفتح ثغرات خطيرة أثناء معالجة البيانات الضخمة.',
        slideType: 'hub',
        stepNumber: '01',
        nodes: ['KERNEL', 'ZERO-TRUST', 'SANDBOX', 'TELEMETRY'],
        from: 0,
        to: 3.5,
        springK: 220,
        springD: 20,
      },
      {
        id: 'scene-2',
        label: 'Slide 02 · Architecture',
        text: 'MICRO-VM ISOLATION PIPELINE',
        enTitle: 'HARDWARE-ENFORCED MICRO-VM ISOLATION',
        arTitle: 'عزل فوري عبر الحاويات المصغرة المعزولة عتادياً',
        enBody: 'Every execution context spawns inside a dedicated hypervisor boundary in under 5 milliseconds.',
        arBody: 'كل عملية تعمل داخل بيئة افتراضية معزولة تماماً خلال أجزاء من الثانية.',
        slideType: 'row',
        stepNumber: '02',
        nodes: ['INGEST', 'HYPERVISOR', 'ENCLAVE'],
        from: 3.5,
        to: 7.0,
        springK: 210,
        springD: 22,
      },
      {
        id: 'scene-3',
        label: 'Slide 03 · Live Code',
        text: 'ZERO-COPY POLICY VERIFICATION',
        enTitle: 'CRYPTOGRAPHIC ATTESTATION AT RUNTIME',
        arTitle: 'التحقق التشفيري الفوري قبل تنفيذ أي تعليمة',
        enBody: 'eBPF probes inspect syscalls at line rate without context-switching overhead.',
        arBody: 'فحص استدعاءات النظام في الوقت الفعلي دون أي تباطؤ في الأداء.',
        slideType: 'code',
        stepNumber: '03',
        codeSnippet:
          '$ marrok-ctl enclave verify --strict\n[OK] attestation_hash: 0x9f4a..e81c\n[OK] seccomp_bpf: 0 violations\n> status: ENFORCED (0.18ms)',
        from: 7.0,
        to: 10.5,
        springK: 210,
        springD: 22,
      },
      {
        id: 'scene-4',
        label: 'Slide 04 · Benchmark',
        text: '200x',
        enTitle: '200X FASTER COLD-START CONTAINMENT',
        arTitle: 'أسرع بـ 200 مرة في عزل التهديدات السيبرانية',
        enBody: 'Sub-millisecond sandbox teardown eliminates lateral movement across cluster nodes.',
        arBody: 'إغلاق فوري للبيئات المخترقة يمنع انتشار الهجوم داخل الشبكة.',
        slideType: 'metric',
        stepNumber: '04',
        metricValue: '200x',
        metricLabel: 'THROUGHPUT & ISOLATION GAIN',
        from: 10.5,
        to: 14.2,
        springK: 240,
        springD: 18,
      },
      {
        id: 'scene-5',
        label: 'Slide 05 · CTA Lockup',
        text: 'FOLLOW @MARROK',
        enTitle: 'SAVE THIS BREAKDOWN & FOLLOW FOR MORE',
        arTitle: 'احفظ المنشور وتابعنا للمزيد من التحليلات الهندسية',
        enBody: 'Deep systems architecture, cybersecurity, and AI infrastructure every week.',
        arBody: 'شروحات معمقة في هندسة الأنظمة والأمن السيبراني والذكاء الاصطناعي.',
        slideType: 'cta',
        stepNumber: '05',
        ctaText: 'FOLLOW @MARROK',
        from: 14.2,
        to: 18.0,
        springK: 220,
        springD: 20,
      },
    ],
  };
}

function drawAnimatedSlideArchetypeCard(
  ctx: CanvasRenderingContext2D,
  scene: MotionSceneConfig,
  brand: MotionBrandConfig,
  t: number
): void {
  const accent = brand.accentColor || '#6EA0FF';
  const surface = brand.surfaceColor || '#12131C';
  const border = brand.surfaceBorder || '#252838';
  const k = scene.springK || 220;
  const d = scene.springD || 22;

  const cardX = SAFE_LEFT;
  const cardY = 216;
  const cardW = SAFE_WIDTH;
  const cardH = 468;

  const cardReveal = spring(t, 180, 22);
  const slideType = scene.slideType || 'hub';
  const stepNum = scene.stepNumber || '01';

  drawMarrokSurfaceCard(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    accent,
    surface,
    border,
    `MARROK_ARCH // ${slideType.toUpperCase()}_${stepNum}`,
    `NODE_${stepNum} // ACTIVE`,
    cardReveal
  );

  const innerCenterX = SAFE_CENTER_X;
  const innerCenterY = cardY + 258;

  ctx.save();
  ctx.direction = 'ltr';
  ctx.textBaseline = 'middle';

  if (slideType === 'hub') {
    // Orbital Hub Diagram with central MARROK Vector Badge + 4 satellite nodes
    const nodes =
      scene.nodes && scene.nodes.length >= 2
        ? scene.nodes.slice(0, 4)
        : ['KERNEL', 'ZERO-TRUST', 'SANDBOX', 'TELEMETRY'];

    // Outer & inner orbital rings
    const ringS = spring(t - 0.08, k, d);
    ctx.save();
    ctx.strokeStyle = hexToRgba(accent, 0.22);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.ellipse(innerCenterX, innerCenterY, 270 * ringS, 142 * ringS, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(accent, 0.35);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(innerCenterX, innerCenterY, 74 * ringS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const offsets = [
      { dx: -255, dy: -95 },
      { dx: 255, dy: -95 },
      { dx: -255, dy: 95 },
      { dx: 255, dy: 95 },
    ];

    // Connecting lines & animated data packets
    nodes.forEach((nodeLabel, idx) => {
      const off = offsets[idx % offsets.length];
      const ns = spring(t - 0.14 - idx * 0.07, k, d);
      const nx = innerCenterX + off.dx * ns;
      const ny = innerCenterY + off.dy * ns;

      ctx.save();
      ctx.strokeStyle = hexToRgba(accent, 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(innerCenterX, innerCenterY);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Animated data pulse traveling outward along the edge
      const pulseFrac = ((t * 0.9 + idx * 0.25) % 1 + 1) % 1;
      const px = innerCenterX + (nx - innerCenterX) * pulseFrac;
      const py = innerCenterY + (ny - innerCenterY) * pulseFrac;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Satellite Node Pill
      const pillW = 186;
      const pillH = 54;
      ctx.fillStyle = '#0D0E16';
      ctx.strokeStyle = hexToRgba(accent, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(nx - pillW / 2, ny - pillH / 2, pillW, pillH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = '800 20px "JetBrains Mono", "Plus Jakarta Sans", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(nodeLabel.slice(0, 14).toUpperCase(), nx, ny, pillW - 20);
      ctx.restore();
    });

    // Central MARROK Vector Logo Hub Core
    const coreScale = spring(t - 0.05, 240, 18);
    const coreSize = Math.max(24, 92 * coreScale);
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    drawMarrokVectorBadge(ctx, innerCenterX, innerCenterY, coreSize, accent, '#0B0C12');
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(
      innerCenterX - coreSize / 2,
      innerCenterY - coreSize / 2,
      coreSize,
      coreSize,
      coreSize * 0.22
    );
    ctx.stroke();
    ctx.restore();
  } else if (slideType === 'metric') {
    // Giant Animated Metric Counter + Sparkline Curve + Benchmark Gauge
    const rawMetric = (scene.metricValue || scene.text || '200x').trim();
    const numMatch = rawMetric.match(/^([<>~]?\s*)(\d+(?:\.\d+)?)(.*)$/);
    const s = spring(t - 0.08, k, d);

    let displayMetric = rawMetric;
    if (numMatch) {
      const prefix = numMatch[1] || '';
      const targetVal = parseFloat(numMatch[2]);
      const suffix = numMatch[3] || '';
      const hasDecimal = numMatch[2].includes('.');
      const animatedVal = targetVal * clamp(s, 0, 1);
      displayMetric = `${prefix}${hasDecimal ? animatedVal.toFixed(1) : Math.round(animatedVal)}${suffix}`;
    }

    // Background sparkline curve inside card
    ctx.save();
    const sparkPoints = [
      { x: cardX + 60, y: cardY + 370 },
      { x: cardX + 220, y: cardY + 345 },
      { x: cardX + 380, y: cardY + 310 },
      { x: cardX + 540, y: cardY + 250 },
      { x: cardX + 700, y: cardY + 175 },
      { x: cardX + 800, y: cardY + 115 },
    ];
    ctx.strokeStyle = hexToRgba(accent, 0.35);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    sparkPoints.forEach((pt, idx) => {
      const py = cardY + 390 - (cardY + 390 - pt.y) * clamp(spring(t - idx * 0.05, 180, 22), 0, 1);
      if (idx === 0) ctx.moveTo(pt.x, py);
      else ctx.lineTo(pt.x, py);
    });
    ctx.stroke();

    sparkPoints.forEach((pt, idx) => {
      const py = cardY + 390 - (cardY + 390 - pt.y) * clamp(spring(t - idx * 0.05, 180, 22), 0, 1);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(pt.x, py, 5.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Big Metric Value
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.fillStyle = accent;
    ctx.font = '900 156px "Plus Jakarta Sans", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.translate(innerCenterX, cardY + 215);
    ctx.scale(0.88 + 0.12 * s, 0.88 + 0.12 * s);
    ctx.fillText(displayMetric, 0, 0, cardW - 80);
    ctx.restore();

    // Metric Label & Progress Gauge Bar
    const metricLabel = (
      scene.metricLabel ||
      scene.enTitle ||
      'VERIFIED BENCHMARK GAIN'
    ).toUpperCase();
    ctx.font = '800 23px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(metricLabel, innerCenterX, cardY + 335, cardW - 90);

    const barW = cardW - 140;
    const barX = cardX + 70;
    const barY = cardY + 382;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 16, 8);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * clamp(s, 0.05, 0.92), 16, 8);
    ctx.fill();
  } else if (slideType === 'code') {
    // Live Terminal Code Card
    const termX = cardX + 36;
    const termY = cardY + 76;
    const termW = cardW - 72;
    const termH = 356;

    ctx.fillStyle = '#08090F';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(termX, termY, termW, termH, 16);
    ctx.fill();
    ctx.stroke();

    // macOS window dots
    const dotColors = ['#FF5F56', '#FFBD2E', '#27C93F'];
    dotColors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(termX + 26 + i * 22, termY + 24, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('bash — marrok-enclave-verifier', termX + 105, termY + 24);

    const rawCode =
      scene.codeSnippet ||
      `$ marrok-ctl verify --zero-trust\n[OK] kernel_isolation: ACTIVE\n[OK] attestation_latency: 0.14ms\n> status: VERIFIED_SAFE`;
    const codeLines = rawCode.split('\n').slice(0, 6);

    ctx.font = '600 24px "JetBrains Mono", monospace';
    codeLines.forEach((line, idx) => {
      const lt = t - 0.12 - idx * 0.14;
      if (lt <= 0) return;
      const charCount = Math.floor(clamp(lt * 2.4, 0, 1) * line.length);
      const visibleText = line.slice(0, charCount);
      const ly = termY + 84 + idx * 48;

      if (line.startsWith('$') || line.startsWith('>')) {
        ctx.fillStyle = accent;
      } else if (line.includes('[OK]') || line.includes('VERIFIED')) {
        ctx.fillStyle = '#34D399';
      } else {
        ctx.fillStyle = '#E2E8F0';
      }
      ctx.fillText(visibleText, termX + 32, ly, termW - 64);
    });
  } else if (slideType === 'cta') {
    // Signature MARROK CTA Card with large Vector Badge & Follow Lockup
    const badgeScale = spring(t - 0.06, 220, 18);
    const badgeSize = Math.max(28, 112 * badgeScale);

    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    drawMarrokVectorBadge(ctx, innerCenterX, cardY + 168, badgeSize, accent, '#0B0C12');
    ctx.restore();

    const ctaBtnS = spring(t - 0.22, 210, 20);
    const btnW = 540 * clamp(ctaBtnS, 0.2, 1);
    const btnH = 74;
    const btnX = innerCenterX - btnW / 2;
    const btnY = cardY + 268;

    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 18);
    ctx.fill();
    ctx.restore();

    ctx.font = '800 28px "Plus Jakarta Sans", "Outfit", sans-serif';
    ctx.fillStyle = '#080A12';
    ctx.textAlign = 'center';
    const ctaLabel = (scene.ctaText || `FOLLOW @${(brand.name || 'MARROK').toUpperCase()}`).toUpperCase();
    ctx.fillText(ctaLabel, innerCenterX, btnY + btnH / 2, btnW - 36);

    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('SAVE · SHARE · SYSTEM ARCHITECTURE', innerCenterX, cardY + 392);
  } else {
    // Default Body Slide ('row' | 'number' | 'compare'): 3-Stage Technical Pipeline Schematic
    const rawNodes =
      scene.nodes && scene.nodes.length >= 2
        ? scene.nodes.slice(0, 3)
        : ['INGESTION', 'ISOLATION', 'VERIFIED'];

    const boxW = 224;
    const boxH = 150;
    const gap = 46;
    const totalW = rawNodes.length * boxW + (rawNodes.length - 1) * gap;
    const startX = innerCenterX - totalW / 2;
    const boxY = innerCenterY - boxH / 2 + 12;

    rawNodes.forEach((nodeTitle, idx) => {
      const ns = spring(t - 0.1 - idx * 0.1, k, d);
      const bx = startX + idx * (boxW + gap);
      const by = boxY + (1 - ns) * 28;

      // Connector arrow to next node
      if (idx < rawNodes.length - 1) {
        const lineX1 = bx + boxW;
        const lineX2 = bx + boxW + gap;
        const lineY = boxY + boxH / 2;
        ctx.strokeStyle = hexToRgba(accent, 0.5);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lineX1, lineY);
        ctx.lineTo(lineX2, lineY);
        ctx.stroke();

        // Moving pulse dot on connector
        const pulseX = lineX1 + ((t * 1.6 + idx * 0.3) % 1) * gap;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(pulseX, lineY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.globalAlpha = clamp((t - 0.08 - idx * 0.1) * 5);
      ctx.fillStyle = idx === rawNodes.length - 1 ? hexToRgba(accent, 0.14) : '#0C0E16';
      ctx.strokeStyle = idx === rawNodes.length - 1 ? accent : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 18);
      ctx.fill();
      ctx.stroke();

      // Node step badge
      ctx.font = '800 18px "JetBrains Mono", monospace';
      ctx.fillStyle = accent;
      ctx.textAlign = 'center';
      ctx.fillText(`STAGE 0${idx + 1}`, bx + boxW / 2, by + 44);

      // Node label
      ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(nodeTitle.slice(0, 13).toUpperCase(), bx + boxW / 2, by + 96, boxW - 24);
      ctx.restore();
    });
  }

  ctx.restore();
}

export function drawMarrokSlidesFrame(
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
  // 1. Authentic MARROK Slide Background (Base + Radial Glow + 108px Grid + CAD Reticles + Camera Parallax)
  drawMarrokReelBackground(
    g,
    config,
    globalTime,
    transState.cameraPanX,
    transState.cameraZoom
  );

  // 2. Authentic MARROK Header with Vector Logo Badge + Wordmark + Category Tag
  drawMarrokReelHeader(g, config, globalTime);

  // 3. Render Active + Overlapping Transition Scene Layers
  transState.layers.forEach((layer) => {
    const activeScene = layer.scene;
    renderWithTransitionLayer(g, layer, b.accentColor, (t) => {
      // Top Graphic Card Zone (y = 216..684)
      drawAnimatedSlideArchetypeCard(g, activeScene, b, t);

      // Check if scene.text is pipe-separated staggered items without bilingual bodies
      if (
        activeScene.text &&
        activeScene.text.includes('|') &&
        !activeScene.enBody &&
        !activeScene.arBody
      ) {
        const items = activeScene.text
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3);
        const k = activeScene.springK || 210;
        const d = activeScene.springD || 22;

        items.forEach((item, idx) => {
          const st = t - 0.12 - idx * 0.14;
          const s = spring(st, k, d);
          const cardY = 740 + idx * 240;

          g.save();
          g.globalAlpha = clamp(st * 4);
          g.fillStyle = '#12131C';
          g.strokeStyle = hexToRgba(b.accentColor, 0.45);
          g.lineWidth = 2;
          g.beginPath();
          g.roundRect(SAFE_LEFT, cardY + (1 - s) * 32, SAFE_WIDTH, 195, 20);
          g.fill();
          g.stroke();

          // Left accent bar
          g.fillStyle = b.accentColor;
          g.beginPath();
          g.roundRect(SAFE_LEFT, cardY + 24 + (1 - s) * 32, 6, 147 * clamp(s, 0, 1), 3);
          g.fill();

          // Step badge
          g.direction = 'ltr';
          g.font = '800 22px "JetBrains Mono", monospace';
          g.fillStyle = b.accentColor;
          g.textAlign = 'left';
          g.fillText(`0${idx + 1} // KEY TAKEAWAY`, SAFE_LEFT + 32, cardY + 58 + (1 - s) * 32);

          // Item headline
          const isAr = /[\u0600-\u06FF]/.test(item);
          g.direction = isAr ? 'rtl' : 'ltr';
          g.textAlign = isAr ? 'right' : 'left';
          g.font = isAr
            ? '800 44px "Cairo", sans-serif'
            : '800 42px "Plus Jakarta Sans", sans-serif';
          g.fillStyle = '#FFFFFF';
          g.fillText(
            item,
            isAr ? SAFE_LEFT + SAFE_WIDTH - 32 : SAFE_LEFT + 32,
            cardY + 132 + (1 - s) * 32,
            SAFE_WIDTH - 64
          );
          g.restore();
        });
      } else {
        // Standard MARROK Bilingual Slide Copy (EN Title + AR Title + EN Body + AR Body)
        drawAnimatedBilingualSlideCopy(g, activeScene, b, t, 738);
      }
    });
  });

  // 4. Authentic MARROK Pagination & Attribution Footer at y = 1826
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
    const from = sc.from ?? i * 3.5;
    const to = sc.to ?? from + 3.5;
    const k = sc.springK || 220;
    const d = sc.springD || 22;
    const enTitle = sc.enTitle || sc.label || sc.text || '';
    const arTitle = sc.arTitle || sc.text || '';
    const enBody = sc.enBody || '';
    const arBody = sc.arBody || '';

    return `  { from: ${from}, to: ${to}, draw(t) {
    const s = spring(t - 0.08, ${k}, ${d});
    g.save();
    g.fillStyle = '#12131C';
    g.strokeStyle = '${b.accentColor}';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(82, 216 + (1 - s) * 30, 863, 450, 24);
    g.fill();
    g.stroke();
    drawMarrokVectorBadge(g, 513.5, 440, Math.max(24, 96 * s), '${b.accentColor}', '#0B0C12');

    g.direction = 'ltr';
    g.textAlign = 'left';
    g.fillStyle = '#FFFFFF';
    g.font = '800 44px "Plus Jakarta Sans", sans-serif';
    g.fillText(${JSON.stringify(enTitle.toUpperCase())}, 82, 780, 863);

    g.direction = 'rtl';
    g.textAlign = 'right';
    g.fillStyle = '${b.accentColor}';
    g.font = '800 44px "Cairo", sans-serif';
    g.fillText(${JSON.stringify(arTitle)}, 945, 860, 863);

    if (${JSON.stringify(enBody)}) {
      g.direction = 'ltr';
      g.textAlign = 'left';
      g.fillStyle = '#B8BECA';
      g.font = '500 28px "Plus Jakarta Sans", sans-serif';
      g.fillText(${JSON.stringify(enBody)}, 82, 950, 863);
    }
    if (${JSON.stringify(arBody)}) {
      g.direction = 'rtl';
      g.textAlign = 'right';
      g.fillStyle = '#DCE0EA';
      g.font = '600 30px "Cairo", sans-serif';
      g.fillText(${JSON.stringify(arBody)}, 945, 1030, 863);
    }
    g.restore();
  }}`;
  });

  return wrapHTML(config, `const SCENES = [\n${sceneBlocks.join(',\n')}\n];`);
}

export const marrokSlidesTemplate: MotionTemplateDefinition = {
  meta,
  defaultConfig,
  toHTML,
  drawFrame: drawMarrokSlidesFrame,
};
