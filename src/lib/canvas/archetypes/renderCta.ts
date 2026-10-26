import { CarouselData, SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { fitTextInBox, wrapTextLines } from '../textLayout.ts';
import { loadIconImage, safeDrawImage } from '../imageLoader.ts';
import { drawRoundRect } from '../background.ts';
import { drawMarrokVectorBadge } from '../../icons.ts';

/**
 * Archetype 8: Standardized Marrok Closer (CTA Slide)
 * Renders isometric emblem with authentic MARROK vector logo, domain hook,
 * high-contrast bilingual CTA button, URL, and verified attribution card.
 */
export async function drawCtaSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  carousel: CarouselData,
  theme: ThemePalette,
  _options: VisualSystemOptions,
  themeMode: string = 'engineering'
): Promise<number> {
  const emblemX = 518;
  const emblemY = 400;
  const calRadius = 138;

  // 1. Outer 45° Calibration Ring & Cardinal CAD Reticles
  ctx.save();
  ctx.beginPath();
  ctx.arc(emblemX, emblemY, calRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `${theme.accent}35`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Outer segmented dashed ring
  ctx.beginPath();
  ctx.arc(emblemX, emblemY, calRadius + 10, 0, Math.PI * 2);
  ctx.strokeStyle = `${theme.accent}22`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 8 Calibration Tick Marks at 45° intervals
  ctx.strokeStyle = `${theme.accent}80`;
  ctx.lineWidth = 2;
  for (let a = 0; a < 360; a += 45) {
    const rad = (a * Math.PI) / 180;
    const x1 = emblemX + (calRadius - 6) * Math.cos(rad);
    const y1 = emblemY + (calRadius - 6) * Math.sin(rad);
    const x2 = emblemX + (calRadius + 6) * Math.cos(rad);
    const y2 = emblemY + (calRadius + 6) * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Outer cardinal CAD reticles (+) at 0°, 90°, 180°, 270°
  const reticleOffset = calRadius + 18;
  const cardAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const ang of cardAngles) {
    const rx = emblemX + reticleOffset * Math.cos(ang);
    const ry = emblemY + reticleOffset * Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(rx - 5, ry);
    ctx.lineTo(rx + 5, ry);
    ctx.moveTo(rx, ry - 5);
    ctx.lineTo(rx, ry + 5);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Layered Isometric Cube / Diamond Geometry
  const cubeR = 76;
  const vAngles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (-5 * Math.PI) / 6];
  const pts = vAngles.map((ang) => ({
    x: emblemX + cubeR * Math.cos(ang),
    y: emblemY + cubeR * Math.sin(ang),
  }));

  // Ambient glow behind cube
  ctx.save();
  const cubeGlow = ctx.createRadialGradient(emblemX, emblemY, 10, emblemX, emblemY, 130);
  cubeGlow.addColorStop(0, `${theme.accent}26`);
  cubeGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = cubeGlow;
  ctx.fillRect(emblemX - 130, emblemY - 130, 260, 260);

  // Facet 1: Top Diamond
  ctx.beginPath();
  ctx.moveTo(emblemX, emblemY);
  ctx.lineTo(pts[5].x, pts[5].y);
  ctx.lineTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.closePath();
  ctx.fillStyle = `${theme.accent}26`;
  ctx.fill();
  ctx.strokeStyle = `${theme.accent}66`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Facet 2: Left Diamond
  ctx.beginPath();
  ctx.moveTo(emblemX, emblemY);
  ctx.lineTo(pts[5].x, pts[5].y);
  ctx.lineTo(pts[4].x, pts[4].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.fillStyle = '#0c151c';
  ctx.fill();
  ctx.strokeStyle = `${theme.accent}55`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Facet 3: Right Diamond
  ctx.beginPath();
  ctx.moveTo(emblemX, emblemY);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.fillStyle = `${theme.accent}14`;
  ctx.fill();
  ctx.strokeStyle = `${theme.accent}55`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Outer Hexagon Perimeter
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // 3. Central Core: Authentic MARROK Vector Emblem
  const coreSize = 54;
  const coreX = emblemX - coreSize / 2;
  const coreY = emblemY - coreSize / 2;

  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 14;
  drawRoundRect(ctx, coreX, coreY, coreSize, coreSize, 14, '#081216', theme.accent, 2);
  ctx.restore();

  drawMarrokVectorBadge(ctx, emblemX, emblemY, coreSize - 6, theme.accent, 'transparent');
  ctx.restore();

  // 4. Brand Wordmark & Domain Hook Badge directly below emblem
  ctx.save();
  const ctaBrand = carousel.brand || 'MARROK';
  const fitBrand = fitTextInBox(ctx, ctaBrand, 850, 52, '"Plus Jakarta Sans", sans-serif', '800', {
    minFontSize: 28,
  });
  ctx.font = `800 ${fitBrand.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitBrand.lines[0] || ctaBrand, 518, 560);

  // Accent Divider Line: 90x5 pill
  drawRoundRect(ctx, 518 - 45, 578, 90, 5, 2.5, theme.accent);

  // Micro Domain Category Badge
  const ctaCategory = (carousel.category || 'SOFTWARE ARCHITECTURE').toUpperCase();
  const fitCategory = fitTextInBox(ctx, ctaCategory, 568, 15, '"Plus Jakarta Sans", monospace', '700', {
    minFontSize: 10,
  });
  ctx.font = `700 ${fitCategory.fontSize}px "Plus Jakarta Sans", monospace`;
  const categoryLabel = fitCategory.lines[0] || ctaCategory;
  const catMetrics = ctx.measureText(categoryLabel);
  const catBadgeW = Math.min(catMetrics.width + 32, 600);
  const catBadgeH = 30;
  drawRoundRect(ctx, 518 - catBadgeW / 2, 602, catBadgeW, catBadgeH, 8, `${theme.accent}14`, `${theme.accent}45`, 1);
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(categoryLabel, 518, 602 + catBadgeH / 2);
  ctx.restore();

  // 5. Domain Question Hook (Pure Read-Only Projection of slide state)
  ctx.save();
  let curY = 685;

  const rawCtaEnTitle = (slide.enTitle || '').trim();
  if (rawCtaEnTitle) {
    const enFit = fitTextInBox(ctx, rawCtaEnTitle, 850, 56, '"Plus Jakarta Sans", sans-serif', '800', {
      maxLines: 2,
      minFontSize: 36,
      lineHeightFactor: 1.2,
    });
    ctx.font = `800 ${enFit.fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    for (const line of enFit.lines) {
      ctx.fillText(line, 518, curY);
      curY += enFit.lineHeight;
    }
  }

  const rawCtaArTitle = (slide.arTitle || '').trim();
  if (rawCtaArTitle) {
    curY += 8;
    const arFit = fitTextInBox(ctx, rawCtaArTitle, 850, 52, '"Cairo", sans-serif', '800', {
      maxLines: 2,
      minFontSize: 34,
      lineHeightFactor: 1.35,
    });
    ctx.font = `800 ${arFit.fontSize}px "Cairo", sans-serif`;
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    for (const line of arFit.lines) {
      ctx.fillText(line, 518, curY);
      curY += arFit.lineHeight;
    }
  }
  ctx.restore();

  // 6. High-Contrast Bilingual CTA Pill Button (Tightly positioned directly below question)
  const ctaOverride = slide.layoutOverrides?.ctaButton;
  const ctaDx = ctaOverride?.dx || 0;
  const ctaDy = ctaOverride?.dy || 0;
  const ctaScale = ctaOverride?.scale || 1;

  const basePillW = 656;
  const basePillH = 104;
  const pillW = basePillW * ctaScale;
  const pillH = basePillH * ctaScale;
  const pillX = 518 - pillW / 2 + ctaDx;
  // Strictly clamp pill and card so they never overflow TikTok footer safe ceiling (y <= 1710)
  const pillY = Math.min(Math.max(curY + 36 + ctaDy, 920), 1360);

  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 14;
  drawRoundRect(ctx, pillX, pillY, pillW, pillH, 52 * ctaScale, theme.accent);
  ctx.restore();

  ctx.save();
  ctx.font = `800 ${Math.round(38 * ctaScale)}px "Cairo", "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#081216';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slide.ctaText || 'DM us  •  رسالة خاصة', 518 + ctaDx, pillY + pillH / 2);
  ctx.restore();

  // 7. Verified marrok.org Attribution Card (Tightly grouped below CTA button)
  const displayUrl = carousel.brandUrl || slide.url || 'marrok.org';
  const urlY = pillY + pillH + 44;

  ctx.save();
  const fitUrl = fitTextInBox(ctx, displayUrl, 780, 32, '"JetBrains Mono", monospace', '600', {
    minFontSize: 18,
  });
  ctx.font = `600 ${fitUrl.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#E2E8EC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitUrl.lines[0] || displayUrl, 518, urlY);
  ctx.restore();

  // Bilingual Source Attribution Card container
  const cardW = 780;
  const cardH = 92;
  const cardX = 518 - cardW / 2;
  const cardY = Math.min(urlY + 28, 1710 - cardH - 10);
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20, `${theme.surface}99`, theme.surfaceBorder, 1.5);

  // 1. Miniature authentic MARROK logo badge
  const mBadgeSize = 42;
  const mBadgeX = cardX + 22;
  const mBadgeY = cardY + (cardH - mBadgeSize) / 2;
  drawRoundRect(ctx, mBadgeX, mBadgeY, mBadgeSize, mBadgeSize, 10, '#0D0D0D', `${theme.accent}55`, 1.2);
  drawMarrokVectorBadge(ctx, mBadgeX + mBadgeSize / 2, mBadgeY + mBadgeSize / 2, mBadgeSize - 6, theme.accent, 'transparent');

  // 2. Verified shield icon badge alongside MARROK badge
  const sBadgeSize = 42;
  const sBadgeX = mBadgeX + mBadgeSize + 10;
  const sBadgeY = cardY + (cardH - sBadgeSize) / 2;
  drawRoundRect(ctx, sBadgeX, sBadgeY, sBadgeSize, sBadgeSize, 10, `${theme.accent}20`, `${theme.accent}65`, 1.2);
  const shieldImg = await loadIconImage('shieldAlert', theme.accent);
  safeDrawImage(ctx, shieldImg, sBadgeX + 9, sBadgeY + 9, 24, 24);

  // 3. Attribution text tier
  const textStartX = sBadgeX + sBadgeSize + 18;
  const enCredit = slide.enCredit || `Verified Technical Analysis // ${carousel.brand || 'MARROK'}`;
  const arCredit = slide.arCredit || `تحليل تقني موثق ومعتمد من منصة ${carousel.brand || 'ماروك'}`;

  const creditMaxWidth = cardX + cardW - textStartX - 22;

  ctx.save();
  const fitEnCredit = fitTextInBox(ctx, enCredit, creditMaxWidth, 22, '"Plus Jakarta Sans", sans-serif', '500', {
    minFontSize: 11,
  });
  ctx.font = `500 ${fitEnCredit.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = theme.textMuted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitEnCredit.lines[0] || enCredit, textStartX, cardY + 40);
  ctx.restore();

  ctx.save();
  const fitArCredit = fitTextInBox(ctx, arCredit, creditMaxWidth, 22, '"Cairo", sans-serif', '500', {
    minFontSize: 11,
  });
  ctx.font = `500 ${fitArCredit.fontSize}px "Cairo", sans-serif`;
  ctx.fillStyle = theme.textMuted;
  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitArCredit.lines[0] || arCredit, textStartX, cardY + 74);
  ctx.restore();

  return cardY + cardH;
}
