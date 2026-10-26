import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { fitTextInBox } from '../textLayout.ts';
import { loadIconImage, safeDrawImage } from '../imageLoader.ts';
import { drawRoundRect } from '../background.ts';

/**
 * Visual Variant 1: Multi-Node Architecture Topology Flow
 * Replaces static icon boxes with a 3-node connected protocol dataflow sequence
 * 100% topic-driven by slide.diagramNodes, slide.diagramEdges, and slide.diagramFooter.
 */
export async function drawMultiNodeTopologyFlow(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions,
  topY: number = 240
): Promise<number> {
  const cardX = 100;
  const cardW = 880;
  const cardH = 430;
  const radius = 28;

  // 1. Ambient Glow & Deep Glassmorphic Container
  ctx.save();
  const glow = ctx.createRadialGradient(cardX + cardW / 2, topY + cardH / 2, 40, cardX + cardW / 2, topY + cardH / 2, cardW / 1.8);
  glow.addColorStop(0, `${theme.accent}18`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(cardX - 30, topY - 30, cardW + 60, cardH + 60);
  ctx.restore();

  drawRoundRect(ctx, cardX, topY, cardW, cardH, radius, '#060a0d', `${theme.accent}45`, 2);

  // Top Neon Accent Line
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  ctx.moveTo(cardX + radius + 10, topY);
  ctx.lineTo(cardX + cardW - radius - 10, topY);
  ctx.stroke();
  ctx.restore();

  // Top Header Tag
  drawRoundRect(ctx, cardX + 32, topY + 22, 310, 36, 10, `${theme.accent}18`, `${theme.accent}50`, 1.2);
  ctx.save();
  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOPOLOGY // PROTOCOL DATAFLOW', cardX + 32 + 155, topY + 40);
  ctx.restore();

  // 2. 3 Connected Component Node Cards
  const nodeW = 236;
  const nodeH = 220;
  const nodeY = topY + 74;
  const gap = 54;
  const nx1 = cardX + 32;
  const nx2 = nx1 + nodeW + gap;
  const nx3 = nx2 + nodeW + gap;

  // Extract dynamic topic-driven nodes from slide
  const dNodes = slide.diagramNodes || [];
  const icons = slide.icons || [];
  const titleWords = (slide.enTitle || '').replace(/[.?!]$/, '').split(/\s+/).filter((w) => w.length > 2);

  const raw1 = dNodes[0];
  const raw2 = dNodes[1];
  const raw3 = dNodes[2];

  const n1IconName = raw1?.icon || icons[0]?.icon || 'server';
  const n1Label = raw1?.label || icons[0]?.label || 'Client Ingress';
  const n1Sub = raw1?.sublabel || 'Port 443 / Ingress';
  const n1Status = raw1?.status || 'CLIENT';

  const n2IconName = raw2?.icon || icons[1]?.icon || 'cpu';
  const n2Label = raw2?.label || icons[1]?.label || (titleWords[0] ? `${titleWords[0]} Engine` : 'Processing Core');
  const n2Sub = raw2?.sublabel || 'Active Execution';
  const n2Status = raw2?.status || 'ROUTED';

  const n3IconName = raw3?.icon || icons[2]?.icon || 'database';
  const n3Label = raw3?.label || icons[2]?.label || 'Storage / Output';
  const n3Sub = raw3?.sublabel || 'State Verified';
  const n3Status = raw3?.status || 'COMMITTED';

  const nodes = [
    { x: nx1, icon: n1IconName, title: n1Label, role: 'INGRESS', sub: n1Sub, status: n1Status, statusColor: theme.accent },
    { x: nx2, icon: n2IconName, title: n2Label, role: 'PROCESSING', sub: n2Sub, status: n2Status, statusColor: '#10B981' },
    { x: nx3, icon: n3IconName, title: n3Label, role: 'TARGET', sub: n3Sub, status: n3Status, statusColor: theme.accent },
  ];

  for (const n of nodes) {
    drawRoundRect(ctx, n.x, nodeY, nodeW, nodeH, 18, '#0b1319', `${theme.accent}65`, 1.8);

    // Inner icon badge
    drawRoundRect(ctx, n.x + 18, nodeY + 18, 46, 46, 12, `${theme.accent}20`, `${theme.accent}70`, 1.2);
    const nImg = await loadIconImage(n.icon, theme.accent);
    safeDrawImage(ctx, nImg, n.x + 27, nodeY + 27, 28, 28);

    // Role Micro-Badge
    ctx.save();
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.microLabel;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(n.role, n.x + 72, nodeY + 38);

    // Primary Title with self-healing 1-or-2 line auto-fit (22px down to 16px)
    const fitTitle = fitTextInBox(ctx, n.title, nodeW - 32, 22, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 16, maxLines: 2 });
    ctx.font = `800 ${fitTitle.fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    if (fitTitle.lines.length <= 1) {
      ctx.fillText(fitTitle.lines[0] || n.title, n.x + 18, nodeY + 102);
    } else {
      ctx.fillText(fitTitle.lines[0], n.x + 18, nodeY + 92);
      ctx.fillText(fitTitle.lines[1], n.x + 18, nodeY + 92 + fitTitle.lineHeight);
    }

    // High-Contrast Sublabel (15px-16px in #E2E8F0)
    const fitSub = fitTextInBox(ctx, n.sub, nodeW - 32, 15, '"Plus Jakarta Sans", "JetBrains Mono", sans-serif', '600', { minFontSize: 13, maxLines: 2 });
    ctx.font = `600 ${fitSub.fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
    ctx.fillStyle = '#E2E8F0';
    const subY = fitTitle.lines.length <= 1 ? nodeY + 134 : nodeY + 144;
    ctx.fillText(fitSub.lines[0] || n.sub, n.x + 18, subY);

    // Bottom Status Pill
    const pillW = 108;
    const pillH = 28;
    drawRoundRect(ctx, n.x + 18, nodeY + nodeH - 38, pillW, pillH, 8, `${n.statusColor}20`, `${n.statusColor}60`, 1);
    const fitStatus = fitTextInBox(ctx, `[ ${n.status} ]`, pillW - 8, 12, '"JetBrains Mono", monospace', '700', { minFontSize: 9.5 });
    ctx.font = `700 ${fitStatus.fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = n.statusColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitStatus.lines[0] || `[ ${n.status} ]`, n.x + 18 + pillW / 2, nodeY + nodeH - 24);
    ctx.restore();
  }

  // 3. Inter-Node Protocol Flow Arrows & Protocol Badges
  const midY = nodeY + 110;
  const edge1 = slide.diagramEdges?.[0] || 'FLOW';
  ctx.save();
  ctx.strokeStyle = `${theme.accent}80`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nx1 + nodeW, midY);
  ctx.lineTo(nx2, midY);
  ctx.stroke();

  // Protocol pill 1
  drawRoundRect(ctx, nx1 + nodeW + 2, midY - 14, 50, 28, 6, '#060a0d', `${theme.accent}80`, 1);
  const fitEdge1 = fitTextInBox(ctx, edge1, 46, 11, '"JetBrains Mono", monospace', '700', { minFontSize: 8 });
  ctx.font = `700 ${fitEdge1.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitEdge1.lines[0] || edge1, nx1 + nodeW + 27, midY);

  // Arrow 1 Tip
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.moveTo(nx2 - 2, midY);
  ctx.lineTo(nx2 - 8, midY - 5);
  ctx.lineTo(nx2 - 8, midY + 5);
  ctx.closePath();
  ctx.fill();

  // Arrow 2: Node 2 -> Node 3
  const edge2 = slide.diagramEdges?.[1] || 'EXEC';
  ctx.beginPath();
  ctx.moveTo(nx2 + nodeW, midY);
  ctx.lineTo(nx3, midY);
  ctx.stroke();

  // Protocol pill 2
  drawRoundRect(ctx, nx2 + nodeW + 2, midY - 14, 50, 28, 6, '#060a0d', `${theme.accent}80`, 1);
  const fitEdge2 = fitTextInBox(ctx, edge2, 46, 11, '"JetBrains Mono", monospace', '700', { minFontSize: 8 });
  ctx.font = `700 ${fitEdge2.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillText(fitEdge2.lines[0] || edge2, nx2 + nodeW + 27, midY);

  // Arrow 2 Tip
  ctx.beginPath();
  ctx.moveTo(nx3 - 2, midY);
  ctx.lineTo(nx3 - 8, midY - 5);
  ctx.lineTo(nx3 - 8, midY + 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Bottom Telemetry Bar
  const barY = nodeY + nodeH + 20;
  drawRoundRect(ctx, nx1, barY, cardW - 64, 46, 12, '#091116', `${theme.accent}33`, 1.2);
  ctx.save();
  const footerText = slide.diagramFooter || 'LATENCY: P99 < 1.0ms  •  PROTOCOL: ACTIVE  •  PIPELINE: DETERMINISTIC';
  const fitFooter = fitTextInBox(ctx, footerText, cardW - 80, 13, '"JetBrains Mono", monospace', '700', { minFontSize: 9.5 });
  ctx.font = `700 ${fitFooter.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = theme.textMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitFooter.lines[0] || footerText, cardX + cardW / 2, barY + 23);
  ctx.restore();

  return cardX + cardH > 0 ? topY + cardH : 670;
}

/**
 * Visual Variant 2: Fault Boundary & Isolation Grid
 * Replaces static icon boxes with a 3-cell segmented boundary
 * 100% topic-driven by slide.diagramNodes, slide.diagramEdges, and slide.diagramFooter.
 */
export async function drawBlastRadiusIsolationGrid(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions,
  topY: number = 240
): Promise<number> {
  const cardX = 100;
  const cardW = 880;
  const cardH = 430;
  const radius = 28;

  drawRoundRect(ctx, cardX, topY, cardW, cardH, radius, '#060a0d', `${theme.accent}45`, 2);

  // Top Neon Line
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  ctx.moveTo(cardX + radius + 10, topY);
  ctx.lineTo(cardX + cardW - radius - 10, topY);
  ctx.stroke();

  // Header Tag
  drawRoundRect(ctx, cardX + 32, topY + 22, 380, 36, 10, `${theme.accent}18`, `${theme.accent}50`, 1.2);
  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FAULT ISOLATION // COMPONENT BOUNDARY', cardX + 32 + 190, topY + 40);
  ctx.restore();

  // 3 Workload Cells
  const cellW = 236;
  const cellH = 220;
  const cellY = topY + 74;
  const gap = 54;
  const cx1 = cardX + 32;
  const cx2 = cx1 + cellW + gap;
  const cx3 = cx2 + cellW + gap;

  const dNodes = slide.diagramNodes || [];
  const raw1 = dNodes[0];
  const raw2 = dNodes[1];
  const raw3 = dNodes[2];

  const c1Icon = raw1?.icon || 'shieldAlert';
  const c1Title = raw1?.label || 'Boundary Limit';
  const c1Role = 'RESTRICTED';
  const c1Sub = raw1?.sublabel || 'Contained Path';
  const c1Status = raw1?.status || 'DENIED';

  const c2Icon = raw2?.icon || 'lock';
  const c2Title = raw2?.label || 'Isolated Boundary';
  const c2Role = 'BOUNDARY MESH';
  const c2Sub = raw2?.sublabel || 'Zero Implicit Access';
  const c2Status = raw2?.status || 'ISOLATED';

  const c3Icon = raw3?.icon || 'database';
  const c3Title = raw3?.label || 'Core Storage';
  const c3Role = 'PERSISTENT CORE';
  const c3Sub = raw3?.sublabel || 'Hardened State';
  const c3Status = raw3?.status || 'SECURED';

  const barrierTag = slide.diagramEdges?.[0] || 'ISOLATE';
  const footerText = slide.diagramFooter || '✔ FAULT DOMAIN ISOLATED: ZERO ESCAPE TO ADJACENT RUNTIMES';

  // Cell 1: Restricted Workload (Crimson)
  drawRoundRect(ctx, cx1, cellY, cellW, cellH, 18, 'rgba(244, 63, 94, 0.08)', 'rgba(244, 63, 94, 0.65)', 2);
  drawRoundRect(ctx, cx1 + 18, cellY + 18, 46, 46, 12, 'rgba(244, 63, 94, 0.20)', 'rgba(244, 63, 94, 0.70)', 1.2);
  const alertImg = await loadIconImage(c1Icon, '#F43F5E');
  safeDrawImage(ctx, alertImg, cx1 + 27, cellY + 27, 28, 28);

  ctx.save();
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#FDA4AF';
  ctx.textAlign = 'left';
  ctx.fillText(c1Role, cx1 + 72, cellY + 38);

  // Self-healing title: 22px bold down to 16px
  const fitC1Title = fitTextInBox(ctx, c1Title, cellW - 32, 22, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 16, maxLines: 2 });
  ctx.font = `800 ${fitC1Title.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  if (fitC1Title.lines.length <= 1) {
    ctx.fillText(fitC1Title.lines[0] || c1Title, cx1 + 18, cellY + 102);
  } else {
    ctx.fillText(fitC1Title.lines[0], cx1 + 18, cellY + 92);
    ctx.fillText(fitC1Title.lines[1], cx1 + 18, cellY + 92 + fitC1Title.lineHeight);
  }

  // High-Contrast Sublabel (15px-16px in #E2E8F0)
  const fitC1Sub = fitTextInBox(ctx, c1Sub, cellW - 32, 15, '"Plus Jakarta Sans", "JetBrains Mono", sans-serif', '600', { minFontSize: 13, maxLines: 2 });
  ctx.font = `600 ${fitC1Sub.fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
  ctx.fillStyle = '#E2E8F0';
  const c1SubY = fitC1Title.lines.length <= 1 ? cellY + 134 : cellY + 144;
  ctx.fillText(fitC1Sub.lines[0] || c1Sub, cx1 + 18, c1SubY);

  const pillW1 = 110;
  drawRoundRect(ctx, cx1 + 18, cellY + cellH - 38, pillW1, 28, 8, 'rgba(244, 63, 94, 0.25)', 'rgba(244, 63, 94, 0.75)', 1);
  const fitC1Status = fitTextInBox(ctx, `[ ${c1Status} ]`, pillW1 - 10, 12, '"JetBrains Mono", monospace', '700', { minFontSize: 9.5 });
  ctx.font = `700 ${fitC1Status.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#FDA4AF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitC1Status.lines[0] || `[ ${c1Status} ]`, cx1 + 18 + pillW1 / 2, cellY + cellH - 24);
  ctx.restore();

  // Vertical Air-Gap Firewall Barrier between Cell 1 and Cell 2
  ctx.save();
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.60)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx1 + cellW + gap / 2, cellY + 10);
  ctx.lineTo(cx1 + cellW + gap / 2, cellY + cellH - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  drawRoundRect(ctx, cx1 + cellW + gap / 2 - 28, cellY + cellH / 2 - 15, 56, 30, 8, '#060a0d', 'rgba(244, 63, 94, 0.70)', 1.2);
  const fitBarrier = fitTextInBox(ctx, barrierTag, 50, 11, '"JetBrains Mono", monospace', '700', { minFontSize: 8.5 });
  ctx.font = `700 ${fitBarrier.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#F43F5E';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitBarrier.lines[0] || barrierTag, cx1 + cellW + gap / 2, cellY + cellH / 2);
  ctx.restore();

  // Cell 2: Isolated Service Pod (Accent)
  drawRoundRect(ctx, cx2, cellY, cellW, cellH, 18, '#0b1319', `${theme.accent}65`, 1.8);
  drawRoundRect(ctx, cx2 + 18, cellY + 18, 46, 46, 12, `${theme.accent}20`, `${theme.accent}70`, 1.2);
  const lockImg = await loadIconImage(c2Icon, theme.accent);
  safeDrawImage(ctx, lockImg, cx2 + 27, cellY + 27, 28, 28);

  ctx.save();
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.microLabel;
  ctx.textAlign = 'left';
  ctx.fillText(c2Role, cx2 + 72, cellY + 38);

  // Self-healing title: 22px bold down to 16px
  const fitC2Title = fitTextInBox(ctx, c2Title, cellW - 32, 22, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 16, maxLines: 2 });
  ctx.font = `800 ${fitC2Title.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  if (fitC2Title.lines.length <= 1) {
    ctx.fillText(fitC2Title.lines[0] || c2Title, cx2 + 18, cellY + 102);
  } else {
    ctx.fillText(fitC2Title.lines[0], cx2 + 18, cellY + 92);
    ctx.fillText(fitC2Title.lines[1], cx2 + 18, cellY + 92 + fitC2Title.lineHeight);
  }

  // High-Contrast Sublabel (15px-16px in #E2E8F0)
  const fitC2Sub = fitTextInBox(ctx, c2Sub, cellW - 32, 15, '"Plus Jakarta Sans", "JetBrains Mono", sans-serif', '600', { minFontSize: 13, maxLines: 2 });
  ctx.font = `600 ${fitC2Sub.fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
  ctx.fillStyle = '#E2E8F0';
  const c2SubY = fitC2Title.lines.length <= 1 ? cellY + 134 : cellY + 144;
  ctx.fillText(fitC2Sub.lines[0] || c2Sub, cx2 + 18, c2SubY);

  const pillW2 = 108;
  drawRoundRect(ctx, cx2 + 18, cellY + cellH - 38, pillW2, 28, 8, `${theme.accent}20`, `${theme.accent}60`, 1);
  const fitC2Status = fitTextInBox(ctx, `[ ${c2Status} ]`, pillW2 - 10, 12, '"JetBrains Mono", monospace', '700', { minFontSize: 9.5 });
  ctx.font = `700 ${fitC2Status.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitC2Status.lines[0] || `[ ${c2Status} ]`, cx2 + 18 + pillW2 / 2, cellY + cellH - 24);
  ctx.restore();

  // Cell 3: Production Vault / Storage (Emerald)
  drawRoundRect(ctx, cx3, cellY, cellW, cellH, 18, '#0b1319', 'rgba(16, 185, 129, 0.65)', 1.8);
  drawRoundRect(ctx, cx3 + 18, cellY + 18, 46, 46, 12, 'rgba(16, 185, 129, 0.20)', 'rgba(16, 185, 129, 0.70)', 1.2);
  const dbImg = await loadIconImage(c3Icon, '#10B981');
  safeDrawImage(ctx, dbImg, cx3 + 27, cellY + 27, 28, 28);

  ctx.save();
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#6EE7B7';
  ctx.textAlign = 'left';
  ctx.fillText(c3Role, cx3 + 72, cellY + 38);

  // Self-healing title: 22px bold down to 16px
  const fitC3Title = fitTextInBox(ctx, c3Title, cellW - 32, 22, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 16, maxLines: 2 });
  ctx.font = `800 ${fitC3Title.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  if (fitC3Title.lines.length <= 1) {
    ctx.fillText(fitC3Title.lines[0] || c3Title, cx3 + 18, cellY + 102);
  } else {
    ctx.fillText(fitC3Title.lines[0], cx3 + 18, cellY + 92);
    ctx.fillText(fitC3Title.lines[1], cx3 + 18, cellY + 92 + fitC3Title.lineHeight);
  }

  // High-Contrast Sublabel (15px-16px in #E2E8F0)
  const fitC3Sub = fitTextInBox(ctx, c3Sub, cellW - 32, 15, '"Plus Jakarta Sans", "JetBrains Mono", sans-serif', '600', { minFontSize: 13, maxLines: 2 });
  ctx.font = `600 ${fitC3Sub.fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
  ctx.fillStyle = '#E2E8F0';
  const c3SubY = fitC3Title.lines.length <= 1 ? cellY + 134 : cellY + 144;
  ctx.fillText(fitC3Sub.lines[0] || c3Sub, cx3 + 18, c3SubY);

  const pillW3 = 108;
  drawRoundRect(ctx, cx3 + 18, cellY + cellH - 38, pillW3, 28, 8, 'rgba(16, 185, 129, 0.20)', 'rgba(16, 185, 129, 0.60)', 1);
  const fitC3Status = fitTextInBox(ctx, `[ ${c3Status} ]`, pillW3 - 10, 12, '"JetBrains Mono", monospace', '700', { minFontSize: 9.5 });
  ctx.font = `700 ${fitC3Status.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#10B981';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitC3Status.lines[0] || `[ ${c3Status} ]`, cx3 + 18 + pillW3 / 2, cellY + cellH - 24);
  ctx.restore();
  ctx.restore();

  // Bottom Benchmark Banner
  const barY = cellY + cellH + 20;
  drawRoundRect(ctx, cx1, barY, cardW - 64, 46, 12, 'rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.45)', 1.2);
  ctx.save();
  const fitFooter = fitTextInBox(ctx, footerText, cardW - 80, 14, '"Plus Jakarta Sans", sans-serif', '700', { minFontSize: 10 });
  ctx.font = `700 ${fitFooter.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#34D399';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitFooter.lines[0] || footerText, cardX + cardW / 2, barY + 23);
  ctx.restore();

  return cardX + cardH > 0 ? topY + cardH : 670;
}

/**
 * Visual Variant 3: Layered Architecture Stack & Pipeline
 * Replaces static icon boxes with a 3-tier horizontal architecture stack
 * 100% topic-driven by slide.diagramNodes and slide.diagramFooter.
 */
export async function drawLayeredArchitectureStack(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions,
  topY: number = 240
): Promise<number> {
  const cardX = 100;
  const cardW = 880;
  const cardH = 430;
  const radius = 28;

  drawRoundRect(ctx, cardX, topY, cardW, cardH, radius, '#060a0d', `${theme.accent}45`, 2);

  // Top Neon Line
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  ctx.moveTo(cardX + radius + 10, topY);
  ctx.lineTo(cardX + cardW - radius - 10, topY);
  ctx.stroke();

  // Header Tag
  drawRoundRect(ctx, cardX + 32, topY + 22, 340, 36, 10, `${theme.accent}18`, `${theme.accent}50`, 1.2);
  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARCHITECTURE // PIPELINE STACK', cardX + 32 + 170, topY + 40);
  ctx.restore();

  // 3 Stacked Horizontal Tier Cards
  const tierW = cardW - 64;
  const tierH = 92;
  const tierX = cardX + 32;
  const gap = 14;
  const startTierY = topY + 70;

  const dNodes = slide.diagramNodes || [];
  const raw1 = dNodes[0];
  const raw2 = dNodes[1];
  const raw3 = dNodes[2];

  const tiers = [
    {
      y: startTierY,
      layer: 'LAYER 01',
      title: (raw1?.label || 'INGRESS & CLIENT CONNECTION TIER').toUpperCase(),
      sub: raw1?.sublabel || 'Protocol Ingress • Traffic Routing • Client Session Pool',
      pill: raw1?.status || 'INGRESS',
      icon: raw1?.icon || 'network',
    },
    {
      y: startTierY + tierH + gap,
      layer: 'LAYER 02',
      title: (raw2?.label || 'CORE LOGIC & EXECUTION PIPELINE').toUpperCase(),
      sub: raw2?.sublabel || 'Processing Engine • High-Throughput Execution • Internal State',
      pill: raw2?.status || 'CORE ENGINE',
      icon: raw2?.icon || 'cpu',
    },
    {
      y: startTierY + (tierH + gap) * 2,
      layer: 'LAYER 03',
      title: (raw3?.label || 'PERSISTENCE ENGINE & STORAGE LAYER').toUpperCase(),
      sub: raw3?.sublabel || 'Durable Write Ahead Log • State Storage • Audit Verification',
      pill: raw3?.status || 'PERSISTENCE',
      icon: raw3?.icon || 'database',
    },
  ];

  for (const t of tiers) {
    drawRoundRect(ctx, tierX, t.y, tierW, tierH, 14, '#0b1319', `${theme.accent}55`, 1.5);

    // Left neon accent strip
    drawRoundRect(ctx, tierX, t.y, 6, tierH, 3, theme.accent);

    // Icon badge
    drawRoundRect(ctx, tierX + 18, t.y + 18, 48, 48, 12, `${theme.accent}20`, `${theme.accent}65`, 1.2);
    const tImg = await loadIconImage(t.icon, theme.accent);
    safeDrawImage(ctx, tImg, tierX + 28, t.y + 28, 28, 28);

    // Typography
    ctx.save();
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(t.layer, tierX + 80, t.y + 36);

    // Right status pill
    const pW = 124;
    drawRoundRect(ctx, tierX + tierW - pW - 18, t.y + 26, pW, 30, 8, `${theme.accent}20`, `${theme.accent}65`, 1.2);
    const fitPill = fitTextInBox(ctx, t.pill, pW - 12, 12, '"JetBrains Mono", monospace', '700', { minFontSize: 9.5 });
    ctx.font = `700 ${fitPill.fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitPill.lines[0] || t.pill, tierX + tierW - pW / 2 - 18, t.y + 41);

    // Tier Title: 21px bold (auto fits down to 15px)
    const maxTitleW = tierW - 165 - pW - 24;
    const fitTitle = fitTextInBox(ctx, t.title, maxTitleW, 21, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 15 });
    ctx.font = `800 ${fitTitle.fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(fitTitle.lines[0] || t.title, tierX + 165, t.y + 36);

    // Tier Sublabel: 15px high contrast in #E2E8F0
    const fitSub = fitTextInBox(ctx, t.sub, tierW - 100, 15, '"Plus Jakarta Sans", "JetBrains Mono", sans-serif', '600', { minFontSize: 13 });
    ctx.font = `600 ${fitSub.fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(fitSub.lines[0] || t.sub, tierX + 80, t.y + 66);
    ctx.restore();
  }

  // Bottom Traceability Line
  const footY = startTierY + (tierH + gap) * 3 + 12;
  ctx.save();
  const footerText = slide.diagramFooter || 'END-TO-END PIPELINE TRACEABILITY ACROSS ALL TIERS';
  const fitFooter = fitTextInBox(ctx, footerText, cardW - 80, 13, '"JetBrains Mono", monospace', '700', { minFontSize: 9.5 });
  ctx.font = `700 ${fitFooter.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = theme.textMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitFooter.lines[0] || footerText, cardX + cardW / 2, footY);
  ctx.restore();

  return cardX + cardH > 0 ? topY + cardH : 670;
}

/**
 * Visual Variant 4: Key Architectural Takeaway Card
 * Replaces lonely single-icon boxes with a high-impact architectural principle card
 * 100% topic-driven by slide.diagramNodes, slide.enTitle, slide.enBody, and slide.diagramFooter.
 */
export async function drawKeyTakeawayCard(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions,
  topY: number = 240
): Promise<number> {
  const cardX = 100;
  const cardW = 880;
  const cardH = 430;
  const radius = 28;

  drawRoundRect(ctx, cardX, topY, cardW, cardH, radius, '#060a0d', `${theme.accent}45`, 2);

  // Top Neon Line
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  ctx.moveTo(cardX + radius + 10, topY);
  ctx.lineTo(cardX + cardW - radius - 10, topY);
  ctx.stroke();

  // Header Tag
  drawRoundRect(ctx, cardX + 32, topY + 22, 360, 36, 10, `${theme.accent}18`, `${theme.accent}50`, 1.2);
  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARCHITECTURAL PRINCIPLE // RULE', cardX + 32 + 180, topY + 40);
  ctx.restore();

  // Highlighted Principle Block
  const blockW = cardW - 64;
  const blockH = 150;
  const blockX = cardX + 32;
  const blockY = topY + 74;

  drawRoundRect(ctx, blockX, blockY, blockW, blockH, 16, '#0b1319', `${theme.accent}65`, 1.5);
  drawRoundRect(ctx, blockX, blockY, 6, blockH, 3, theme.accent);

  const iconName = slide.diagramNodes?.[0]?.icon || slide.icons?.[0]?.icon || 'shieldAlert';
  const iconImg = await loadIconImage(iconName, theme.accent);
  drawRoundRect(ctx, blockX + 22, blockY + 22, 54, 54, 14, `${theme.accent}20`, `${theme.accent}70`, 1.2);
  safeDrawImage(ctx, iconImg, blockX + 34, blockY + 34, 30, 30);

  ctx.save();
  const cleanTitle = (slide.enTitle || 'Core Architectural Principle.').replace(/[.?!]$/, '');
  const fitTitle = fitTextInBox(ctx, cleanTitle, blockW - 110, 26, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 16, maxLines: 2 });
  ctx.font = `800 ${fitTitle.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (fitTitle.lines.length <= 1) {
    ctx.fillText(fitTitle.lines[0] || cleanTitle, blockX + 96, blockY + 56);
  } else {
    ctx.fillText(fitTitle.lines[0], blockX + 96, blockY + 44);
    ctx.fillText(fitTitle.lines[1], blockX + 96, blockY + 44 + fitTitle.lineHeight);
  }

  const subHeadline =
    slide.diagramFooter ||
    (slide.diagramNodes?.[0] ? `${slide.diagramNodes[0].label} • Production Architecture` : 'Core Architectural Principle • High Reliability');
  const fitSubHead = fitTextInBox(ctx, subHeadline, blockW - 110, 17, '"JetBrains Mono", monospace', '500', { minFontSize: 11 });
  ctx.font = `500 ${fitSubHead.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = theme.accent;
  ctx.fillText(fitSubHead.lines[0] || subHeadline, blockX + 96, blockY + 92);

  const cleanBody = (slide.enBody || 'Decoupled architectural components eliminate system bottlenecks and lock-in.');
  const fitBody = fitTextInBox(ctx, cleanBody, blockW - 110, 16, '"Plus Jakarta Sans", sans-serif', '400', { minFontSize: 12 });
  ctx.font = `400 ${fitBody.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(fitBody.lines[0] || cleanBody, blockX + 96, blockY + 124);
  ctx.restore();

  // 2 Comparative Proof Sub-Cards at bottom
  const subW = (blockW - 20) / 2;
  const subH = 135;
  const subY = blockY + blockH + 20;

  // Sub-card 1: Critical Constraint
  drawRoundRect(ctx, blockX, subY, subW, subH, 14, 'rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.40)', 1.2);
  ctx.save();
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#FBBF24';
  ctx.textAlign = 'left';
  ctx.fillText('⚠️ CRITICAL CONSTRAINT', blockX + 18, subY + 32);

  const c1Text1 = slide.diagramNodes?.[1]?.label ? `Avoid unmonitored ${slide.diagramNodes[1].label.toLowerCase()}` : 'Profile production load and avoid premature';
  const c1Text2 = slide.diagramNodes?.[1]?.sublabel || 'abstractions that bloat system memory.';
  const fitC1Text1 = fitTextInBox(ctx, c1Text1, subW - 36, 16, '"Plus Jakarta Sans", sans-serif', '400', { minFontSize: 11 });
  const fitC1Text2 = fitTextInBox(ctx, c1Text2, subW - 36, 15, '"Plus Jakarta Sans", sans-serif', '400', { minFontSize: 11 });

  ctx.font = `400 ${fitC1Text1.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(fitC1Text1.lines[0] || c1Text1, blockX + 18, subY + 65);
  ctx.font = `400 ${fitC1Text2.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(fitC1Text2.lines[0] || c1Text2, blockX + 18, subY + 92);
  ctx.restore();

  // Sub-card 2: Production Best Practice
  drawRoundRect(ctx, blockX + subW + 20, subY, subW, subH, 14, 'rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.40)', 1.2);
  ctx.save();
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#34D399';
  ctx.textAlign = 'left';
  ctx.fillText('✔ PRODUCTION STANDARD', blockX + subW + 38, subY + 32);

  const c2Text1 = slide.diagramNodes?.[2]?.label ? `Enforce strict ${slide.diagramNodes[2].label.toLowerCase()}` : 'Decouple core processing from storage';
  const c2Text2 = slide.diagramNodes?.[2]?.sublabel || 'to maintain predictable sub-second p99.';
  const fitC2Text1 = fitTextInBox(ctx, c2Text1, subW - 36, 16, '"Plus Jakarta Sans", sans-serif', '400', { minFontSize: 11 });
  const fitC2Text2 = fitTextInBox(ctx, c2Text2, subW - 36, 15, '"Plus Jakarta Sans", sans-serif', '400', { minFontSize: 11 });

  ctx.font = `400 ${fitC2Text1.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(fitC2Text1.lines[0] || c2Text1, blockX + subW + 38, subY + 65);
  ctx.font = `400 ${fitC2Text2.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(fitC2Text2.lines[0] || c2Text2, blockX + subW + 38, subY + 92);
  ctx.restore();

  return cardX + cardH > 0 ? topY + cardH : 670;
}
