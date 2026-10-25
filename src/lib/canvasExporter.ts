import { CarouselData, DEFAULT_PALETTES, SlideData, THEME_CONFIGS, ThemePalette, VisualSystemOptions } from '../types.ts';
import { getIconDataUrl, getIconSvg, drawMarrokVectorBadge } from './icons.ts';
import { sanitizeArabicSlideText, sanitizeEnglishSlideText } from './textSanitizer.ts';
import JSZip from 'jszip';

// Helper to wrap text with max width, handle manual newlines, and prevent splitting metrics
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number
): string[] {
  if (!rawText) return [];

  // Protect units and metrics from being split across lines (e.g. "510 GB", "10 ms")
  let textWithNbsp = rawText
    .replace(/\b(\d+(?:\.\d+)?)\s+(GB|TB|MB|KB|ms|s|μs|req|rps|x|X)\b/gi, '$1\u00A0$2')
    .replace(/\b(\d+(?:\.\d+)?)\s+(جيجابايت|تيرابايت|ميجابايت|مللي ثانية|ثواني|ضعفاً)\b/g, '$1\u00A0$2');

  // Prevent isolated Latin technical terms from wrapping as orphans in Arabic text (e.g. "منظومة Zero-Trust")
  textWithNbsp = textWithNbsp.replace(/([\u0600-\u06FF]+)\s+([A-Za-z0-9_\-]+)\b/g, '$1\u00A0$2');

  const paragraphs = textWithNbsp.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const rawWords = para.split(' ');
    const safeWords: string[] = [];

    // Safety check: if an NBSP-bound chunk exceeds maxWidth, unbind \u00A0 back to spaces
    for (const w of rawWords) {
      if (w.includes('\u00A0') && ctx.measureText(w).width > maxWidth) {
        safeWords.push(...w.split('\u00A0'));
      } else {
        safeWords.push(w);
      }
    }

    // Secondary safety: if any single word still exceeds maxWidth, split characters so it cannot overflow canvas
    const expandedWords: string[] = [];
    for (const w of safeWords) {
      if (ctx.measureText(w).width > maxWidth) {
        let chunk = '';
        for (const char of w) {
          if (ctx.measureText(chunk + char).width > maxWidth) {
            if (chunk) expandedWords.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        if (chunk) expandedWords.push(chunk);
      } else {
        expandedWords.push(w);
      }
    }

    let currentLine = '';

    for (const word of expandedWords) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  // Typographic orphan prevention:
  // If the last line has only 1 word and the preceding line has 3+ words, reflow the last word of the preceding line
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1].trim();
    const prevLine = lines[lines.length - 2].trim();
    const lastWords = lastLine.split(/\s+/);
    const prevWords = prevLine.split(/\s+/);

    if (lastWords.length === 1 && prevWords.length >= 3) {
      const movedWord = prevWords.pop()!;
      lines[lines.length - 2] = prevWords.join(' ');
      lines[lines.length - 1] = `${movedWord} ${lastLine}`;
    }
  }

  return lines;
}

// In-memory image cache for fast re-renders without repeated network round-trips
const CANVAS_IMAGE_CACHE = new Map<string, HTMLImageElement>();

/**
 * Creates a guaranteed valid fallback SVG image so canvas operations never crash
 */
function createFallbackIcon(strokeColor: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const fallbackSvg = getIconSvg('gitMerge', strokeColor);
    const fallbackUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
    const fb = new Image();
    fb.onload = () => resolve(fb);
    fb.onerror = () => resolve(fb);
    fb.src = fallbackUrl;
  });
}

// Helper to load an SVG, custom image icon, or web image as an HTMLImageElement
function loadIconImage(iconName: string, strokeColor: string): Promise<HTMLImageElement> {
  const url = getIconDataUrl(iconName, strokeColor);
  if (CANVAS_IMAGE_CACHE.has(url)) {
    const cached = CANVAS_IMAGE_CACHE.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();
    // Only set crossOrigin for remote http(s) URLs, never for data: or blob:
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    // Safety timeout: never block canvas render for more than 1000ms
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      console.warn(`Timeout loading icon/image: ${iconName}, falling back to SVG`);
      const fb = await createFallbackIcon(strokeColor);
      CANVAS_IMAGE_CACHE.set(url, fb);
      resolve(fb);
    }, 1000);

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(url, img);
      resolve(img);
    };

    img.onerror = async () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn(`Failed to load icon/image: ${iconName}, falling back to SVG`);
      const fb = await createFallbackIcon(strokeColor);
      CANVAS_IMAGE_CACHE.set(url, fb);
      resolve(fb);
    };

    img.src = url;
    if (img.complete && img.naturalWidth > 0 && !settled) {
      settled = true;
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(url, img);
      resolve(img);
    }
  });
}

// Helper to load full web images / diagrams via CORS proxy with theme recoloring
function loadWebImage(imageUrl: string, color?: string): Promise<HTMLImageElement> {
  const isSvg = imageUrl.toLowerCase().includes('.svg') || imageUrl.includes('simple-icons');
  let safeUrl = imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const colorParam = isSvg && color ? `&color=${encodeURIComponent(color)}` : '';
    safeUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}${colorParam}`;
  }

  if (CANVAS_IMAGE_CACHE.has(safeUrl)) {
    return Promise.resolve(CANVAS_IMAGE_CACHE.get(safeUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!safeUrl.startsWith('data:') && !safeUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    const timer = setTimeout(() => {
      resolve(img);
    }, 1500);

    img.onload = () => {
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(safeUrl, img);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      console.warn(`Failed to load web image: ${imageUrl}`);
      resolve(img);
    };
    img.src = safeUrl;
  });
}

// Draw rounded rectangle helper
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth?: number
) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    // Fallback if roundRect is not supported
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && lineWidth) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Safely draws an image to canvas without throwing InvalidStateError on broken images
 */
function safeDrawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 || w <= 0 || h <= 0) {
    return;
  }
  try {
    ctx.drawImage(img, x, y, w, h);
  } catch (err) {
    console.warn('safeDrawImage caught error:', err);
  }
}

// Tinted image drawer helper (replaces non-transparent pixels with theme color via source-in)
function drawTintedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  tintColor?: string
) {
  // Never attempt to draw if image is incomplete or broken (naturalWidth is 0)
  if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 || w <= 0 || h <= 0) {
    return;
  }
  if (!tintColor) {
    safeDrawImage(ctx, img, x, y, w, h);
    return;
  }
  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = Math.max(1, Math.round(w));
    offCanvas.height = Math.max(1, Math.round(h));
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) {
      safeDrawImage(ctx, img, x, y, w, h);
      return;
    }
    offCtx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = tintColor;
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

    ctx.drawImage(offCanvas, x, y, w, h);
  } catch (_err) {
    safeDrawImage(ctx, img, x, y, w, h);
  }
}

/**
 * Visual Variant 1: Multi-Node Architecture Topology Flow
 * Replaces static icon boxes with a 3-node connected protocol handshake sequence
 * (e.g. Client Node -> mTLS Envoy Proxy -> Isolated Workload Pod).
 */
async function drawMultiNodeTopologyFlow(
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
  ctx.fillText('TOPOLOGY // PROTOCOL HANDSHAKE', cardX + 32 + 155, topY + 40);
  ctx.restore();

  // 2. 3 Connected Component Node Cards
  const nodeW = 236;
  const nodeH = 220;
  const nodeY = topY + 74;
  const gap = 54;
  const nx1 = cardX + 32;
  const nx2 = nx1 + nodeW + gap;
  const nx3 = nx2 + nodeW + gap;

  // Extract labels and icons from slide
  const icons = slide.icons || [];
  const n1IconName = icons[0]?.icon || 'server';
  const n1Label = icons[0]?.label || 'Client Node';
  const n2IconName = icons[1]?.icon || 'shieldAlert';
  const n2Label = icons[1]?.label || 'Envoy Proxy';
  const n3IconName = icons[2]?.icon || 'lock';
  const n3Label = icons[2]?.label || 'Target Workload';

  const nodes = [
    { x: nx1, icon: n1IconName, title: n1Label, role: 'CLIENT NODE', sub: '10.0.1.4:8443', status: 'INITIATOR', statusColor: theme.accent },
    { x: nx2, icon: n2IconName, title: n2Label, role: 'mTLS PROXY', sub: 'SPIFFE ID Valid', status: 'VERIFIED', statusColor: '#10B981' },
    { x: nx3, icon: n3IconName, title: n3Label, role: 'SECURE POD', sub: 'Zero-Trust Policy', status: 'ISOLATED', statusColor: theme.accent },
  ];

  for (const n of nodes) {
    drawRoundRect(ctx, n.x, nodeY, nodeW, nodeH, 18, '#0b1319', `${theme.accent}65`, 1.8);

    // Inner icon badge
    drawRoundRect(ctx, n.x + 18, nodeY + 18, 42, 42, 12, `${theme.accent}20`, `${theme.accent}70`, 1.2);
    const nImg = await loadIconImage(n.icon, theme.accent);
    safeDrawImage(ctx, nImg, n.x + 27, nodeY + 27, 24, 24);

    // Role Micro-Badge
    ctx.save();
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.microLabel;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(n.role, n.x + 68, nodeY + 36);

    // Sub-title
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.textMuted;
    ctx.fillText(n.sub, n.x + 68, nodeY + 52);

    // Primary Title
    ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(n.title.length > 14 ? `${n.title.slice(0, 13)}…` : n.title, n.x + 18, nodeY + 115);

    // Detail spec lines
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('• Cryptographic Auth', n.x + 18, nodeY + 145);
    ctx.fillText('• Strict Port 8443', n.x + 18, nodeY + 168);

    // Bottom Status Pill
    const pillW = 100;
    const pillH = 24;
    drawRoundRect(ctx, n.x + 18, nodeY + nodeH - 34, pillW, pillH, 8, `${n.statusColor}20`, `${n.statusColor}60`, 1);
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = n.statusColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[ ${n.status} ]`, n.x + 18 + pillW / 2, nodeY + nodeH - 22);
    ctx.restore();
  }

  // 3. Inter-Node Protocol Flow Arrows & Protocol Badges
  // Arrow 1: Node 1 -> Node 2
  const midY = nodeY + 110;
  ctx.save();
  ctx.strokeStyle = `${theme.accent}80`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nx1 + nodeW, midY);
  ctx.lineTo(nx2, midY);
  ctx.stroke();

  // Protocol pill 1
  drawRoundRect(ctx, nx1 + nodeW + 6, midY - 14, 42, 28, 6, '#060a0d', `${theme.accent}80`, 1);
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('mTLS', nx1 + nodeW + 27, midY);

  // Arrow 1 Tip
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.moveTo(nx2 - 2, midY);
  ctx.lineTo(nx2 - 8, midY - 5);
  ctx.lineTo(nx2 - 8, midY + 5);
  ctx.closePath();
  ctx.fill();

  // Arrow 2: Node 2 -> Node 3
  ctx.beginPath();
  ctx.moveTo(nx2 + nodeW, midY);
  ctx.lineTo(nx3, midY);
  ctx.stroke();

  // Protocol pill 2
  drawRoundRect(ctx, nx2 + nodeW + 6, midY - 14, 42, 28, 6, '#060a0d', `${theme.accent}80`, 1);
  ctx.fillText('ALLOW', nx2 + nodeW + 27, midY);

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
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.textMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HANDSHAKE: 0.4ms P99  •  CIPHER: TLS_AES_256_GCM_SHA384  •  EGRESS: ENFORCED', cardX + cardW / 2, barY + 23);
  ctx.restore();

  return 745;
}

/**
 * Visual Variant 2: Blast Radius & Network Isolation Grid
 * Replaces static icon boxes with a multi-cell segmented firewall boundary
 */
async function drawBlastRadiusIsolationGrid(
  ctx: CanvasRenderingContext2D,
  _slide: SlideData,
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
  ctx.fillText('MICROSEGMENTATION // BLAST RADIUS CONFINED', cardX + 32 + 190, topY + 40);
  ctx.restore();

  // 3 Workload Cells: Breached Pod (Left) || Divider || Protected Mesh (Mid) || DB Vault (Right)
  const cellW = 236;
  const cellH = 220;
  const cellY = topY + 74;
  const gap = 54;
  const cx1 = cardX + 32;
  const cx2 = cx1 + cellW + gap;
  const cx3 = cx2 + cellW + gap;

  // Cell 1: Breached Workload (Crimson)
  drawRoundRect(ctx, cx1, cellY, cellW, cellH, 18, 'rgba(244, 63, 94, 0.08)', 'rgba(244, 63, 94, 0.65)', 2);
  drawRoundRect(ctx, cx1 + 18, cellY + 18, 42, 42, 12, 'rgba(244, 63, 94, 0.20)', 'rgba(244, 63, 94, 0.70)', 1.2);
  const alertImg = await loadIconImage('shieldAlert', '#F43F5E');
  safeDrawImage(ctx, alertImg, cx1 + 27, cellY + 27, 24, 24);

  ctx.save();
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#FDA4AF';
  ctx.textAlign = 'left';
  ctx.fillText('ATTACK SURFACE', cx1 + 68, cellY + 36);
  ctx.fillStyle = '#F87171';
  ctx.fillText('Exploit Active', cx1 + 68, cellY + 52);

  ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Compromised Pod', cx1 + 18, cellY + 115);

  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('• Egress: BLOCKED', cx1 + 18, cellY + 145);
  ctx.fillText('• Spiffe: REVOKED', cx1 + 18, cellY + 168);

  drawRoundRect(ctx, cx1 + 18, cellY + cellH - 34, 110, 24, 8, 'rgba(244, 63, 94, 0.25)', 'rgba(244, 63, 94, 0.75)', 1);
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#FDA4AF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[ QUARANTINED ]', cx1 + 18 + 55, cellY + cellH - 22);
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

  drawRoundRect(ctx, cx1 + cellW + gap / 2 - 24, cellY + cellH / 2 - 14, 48, 28, 6, '#060a0d', 'rgba(244, 63, 94, 0.70)', 1);
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#F43F5E';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DENY', cx1 + cellW + gap / 2, cellY + cellH / 2);
  ctx.restore();

  // Cell 2: Isolated Service Pod (Accent)
  drawRoundRect(ctx, cx2, cellY, cellW, cellH, 18, '#0b1319', `${theme.accent}65`, 1.8);
  drawRoundRect(ctx, cx2 + 18, cellY + 18, 42, 42, 12, `${theme.accent}20`, `${theme.accent}70`, 1.2);
  const lockImg = await loadIconImage('lock', theme.accent);
  safeDrawImage(ctx, lockImg, cx2 + 27, cellY + 27, 24, 24);

  ctx.save();
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.microLabel;
  ctx.textAlign = 'left';
  ctx.fillText('PROTECTED MESH', cx2 + 68, cellY + 36);
  ctx.fillStyle = theme.textMuted;
  ctx.fillText('Zero Implicit Trust', cx2 + 68, cellY + 52);

  ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Internal Service', cx2 + 18, cellY + 115);

  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('• Strict Ingress Only', cx2 + 18, cellY + 145);
  ctx.fillText('• 0 Lateral Ingress', cx2 + 18, cellY + 168);

  drawRoundRect(ctx, cx2 + 18, cellY + cellH - 34, 100, 24, 8, `${theme.accent}20`, `${theme.accent}60`, 1);
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[ ISOLATED ]', cx2 + 18 + 50, cellY + cellH - 22);
  ctx.restore();

  // Cell 3: Database Vault (Emerald)
  drawRoundRect(ctx, cx3, cellY, cellW, cellH, 18, '#0b1319', 'rgba(16, 185, 129, 0.65)', 1.8);
  drawRoundRect(ctx, cx3 + 18, cellY + 18, 42, 42, 12, 'rgba(16, 185, 129, 0.20)', 'rgba(16, 185, 129, 0.70)', 1.2);
  const dbImg = await loadIconImage('database', '#10B981');
  safeDrawImage(ctx, dbImg, cx3 + 27, cellY + 27, 24, 24);

  ctx.save();
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#6EE7B7';
  ctx.textAlign = 'left';
  ctx.fillText('AIR-GAPPED DB', cx3 + 68, cellY + 36);
  ctx.fillStyle = '#10B981';
  ctx.fillText('Mutual Auth Only', cx3 + 68, cellY + 52);

  ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Production Vault', cx3 + 18, cellY + 115);

  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('• Encrypted at Rest', cx3 + 18, cellY + 145);
  ctx.fillText('• Audit Logged', cx3 + 18, cellY + 168);

  drawRoundRect(ctx, cx3 + 18, cellY + cellH - 34, 100, 24, 8, 'rgba(16, 185, 129, 0.20)', 'rgba(16, 185, 129, 0.60)', 1);
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#10B981';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[ AIR-GAPPED ]', cx3 + 18 + 50, cellY + cellH - 22);
  ctx.restore();

  // Bottom Security Benchmark Banner
  const barY = cellY + cellH + 20;
  drawRoundRect(ctx, cx1, barY, cardW - 64, 46, 12, 'rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.45)', 1.2);
  ctx.save();
  ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#34D399';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✔ BLAST RADIUS CONFINED: 0 LATERAL ACCESS TO ADJACENT PODS OR STORAGE', cardX + cardW / 2, barY + 23);
  ctx.restore();

  return 745;
}

/**
 * Visual Variant 3: Layered Architecture Stack & Request Pipeline
 * Replaces static icon boxes with a 3-tier horizontal architecture stack
 */
async function drawLayeredArchitectureStack(
  ctx: CanvasRenderingContext2D,
  _slide: SlideData,
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
  const tierH = 82;
  const tierX = cardX + 32;
  const gap = 16;
  const startTierY = topY + 74;

  const tiers = [
    {
      y: startTierY,
      layer: 'LAYER 01',
      title: 'EDGE INGRESS & AUTHENTICATION TIER',
      sub: 'TLS 1.3 Termination • Token Validation • Rate Limiting',
      pill: '10K REQ/S',
      icon: 'network',
    },
    {
      y: startTierY + tierH + gap,
      layer: 'LAYER 02',
      title: 'SERVICE MESH & ROUTING CONTROL PLANE',
      sub: 'Envoy Sidecars • Dynamic Routing • Cryptographic Identity',
      pill: 'LEAST PRIVILEGE',
      icon: 'gitMerge',
    },
    {
      y: startTierY + (tierH + gap) * 2,
      layer: 'LAYER 03',
      title: 'HARDENED WORKLOADS & SECURE STORAGE',
      sub: 'Encrypted at Rest • Mutual Authentication • Audit Trail',
      pill: 'SECURED',
      icon: 'database',
    },
  ];

  for (const t of tiers) {
    drawRoundRect(ctx, tierX, t.y, tierW, tierH, 14, '#0b1319', `${theme.accent}55`, 1.5);

    // Left neon accent strip
    drawRoundRect(ctx, tierX, t.y, 6, tierH, 3, theme.accent);

    // Icon badge
    drawRoundRect(ctx, tierX + 18, t.y + 18, 44, 44, 10, `${theme.accent}20`, `${theme.accent}65`, 1);
    const tImg = await loadIconImage(t.icon, theme.accent);
    safeDrawImage(ctx, tImg, tierX + 27, t.y + 27, 26, 26);

    // Typography
    ctx.save();
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(t.layer, tierX + 76, t.y + 35);

    ctx.font = '800 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(t.title, tierX + 155, t.y + 35);

    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(t.sub, tierX + 76, t.y + 60);

    // Right status pill
    const pW = 120;
    drawRoundRect(ctx, tierX + tierW - pW - 18, t.y + 26, pW, 28, 8, `${theme.accent}20`, `${theme.accent}65`, 1);
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.pill, tierX + tierW - pW / 2 - 18, t.y + 40);
    ctx.restore();
  }

  // Bottom Traceability Line
  const footY = startTierY + (tierH + gap) * 3 + 12;
  ctx.save();
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.textMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('END-TO-END CRYPTOGRAPHIC TRACEABILITY ACROSS ALL TIERS', cardX + cardW / 2, footY);
  ctx.restore();

  return 745;
}

/**
 * Visual Variant 4: Key Architectural Takeaway Card
 * Replaces lonely single-icon boxes with a high-impact architectural principle card
 */
async function drawKeyTakeawayCard(
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

  const iconName = slide.icons?.[0]?.icon || 'shieldAlert';
  const iconImg = await loadIconImage(iconName, theme.accent);
  drawRoundRect(ctx, blockX + 22, blockY + 22, 54, 54, 14, `${theme.accent}20`, `${theme.accent}70`, 1.2);
  safeDrawImage(ctx, iconImg, blockX + 34, blockY + 34, 30, 30);

  ctx.save();
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const cleanTitle = (slide.enTitle || 'Never trust, always verify.').replace(/[.?!]$/, '');
  ctx.fillText(cleanTitle, blockX + 96, blockY + 56);

  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.fillText('Zero Implicit Trust • Continuous Cryptographic Identity', blockX + 96, blockY + 92);

  ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Treat every internal packet as untrusted public network traffic.', blockX + 96, blockY + 124);
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
  ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText('Short-lived certificates require automated', blockX + 18, subY + 65);
  ctx.fillText('control planes to prevent service outages.', blockX + 18, subY + 92);
  ctx.restore();

  // Sub-card 2: Production Best Practice
  drawRoundRect(ctx, blockX + subW + 20, subY, subW, subH, 14, 'rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.40)', 1.2);
  ctx.save();
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#34D399';
  ctx.textAlign = 'left';
  ctx.fillText('✔ PRODUCTION DEFENSE', blockX + subW + 38, subY + 32);
  ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText('Fix reachable attack paths first to eliminate', blockX + subW + 38, subY + 65);
  ctx.fillText('95% of real-world exploitation risks.', blockX + subW + 38, subY + 92);
  ctx.restore();

  return 745;
}

/**
 * Render a single MARROK slide at 1080x1920 to an offscreen or provided canvas
 */
export async function renderSlideToCanvas(
  carousel: CarouselData,
  slideIndex: number,
  targetCanvas?: HTMLCanvasElement,
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<HTMLCanvasElement> {
  // Ensure custom webfonts are loaded
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = targetCanvas || document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const slide = carousel.slides[slideIndex];
  const themeMode = carousel.theme || 'engineering';
  const theme: ThemePalette =
    customPalette ||
    DEFAULT_PALETTES[themeMode] ||
    THEME_CONFIGS[themeMode] ||
    DEFAULT_PALETTES.teal;
  const categoryTag = carousel.category || (themeMode === 'security' ? 'AI + SECURITY' : 'AI + ENGINEERING');
  const totalSlides = carousel.slides.length;

  // Resolve visual system toggles (defaulting to subtle true)
  const options: VisualSystemOptions = {
    showCadReticles: visualOptions?.showCadReticles ?? carousel.visualOptions?.showCadReticles ?? customPalette?.showCadReticles ?? true,
    showSparklines: visualOptions?.showSparklines ?? carousel.visualOptions?.showSparklines ?? customPalette?.showSparklines ?? true,
    terminalScanlines: visualOptions?.terminalScanlines ?? carousel.visualOptions?.terminalScanlines ?? customPalette?.terminalScanlines ?? true,
  };

  // Preload authentic MARROK vector logo for header, CTA core emblem, and attribution card
  const marrokLogoImg = await loadIconImage('marrok', theme.accent);

  // 1. Solid Base Background
  ctx.fillStyle = theme.baseBg;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Radial Gradient Glow at (540, 690) with radius 720px
  const glow = ctx.createRadialGradient(540, 690, 0, 540, 690, 720);
  glow.addColorStop(0, theme.radialGlow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Engineering Grid Lines (108px spacing, 2px stroke)
  ctx.save();
  ctx.strokeStyle = theme.gridLine;
  ctx.lineWidth = 2;
  for (let x = 0; x <= 1080; x += 108) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1920);
    ctx.stroke();
  }
  for (let y = 0; y <= 1920; y += 108) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1080, y);
    ctx.stroke();
  }
  ctx.restore();

  // 3b. Canvas Background CAD Reticles & Safe-Zone Tick Marks ("Precision Silicon & Terminal Brutalism")
  if (options.showCadReticles) {
    ctx.save();
    ctx.strokeStyle = `${theme.accent}4D`;
    ctx.lineWidth = 1.5;

    // CAD Crosshairs (+) at key structural intersections:
    // Top safe corners (90, 200), (945, 200)
    // Mid-tier transitions (90, 930), (945, 930)
    // Bottom safe boundary (90, 1720), (945, 1720)
    const cadCrosshairPoints = [
      { x: 90, y: 200 },
      { x: 945, y: 200 },
      { x: 90, y: 930 },
      { x: 945, y: 930 },
      { x: 90, y: 1720 },
      { x: 945, y: 1720 },
    ];
    const arm = 10;
    for (const pt of cadCrosshairPoints) {
      ctx.beginPath();
      ctx.moveTo(pt.x - arm, pt.y);
      ctx.lineTo(pt.x + arm, pt.y);
      ctx.moveTo(pt.x, pt.y - arm);
      ctx.lineTo(pt.x, pt.y + arm);
      ctx.stroke();
    }

    // Safe-zone vertical coordinate tick marks (6px notch inwards along boundaries)
    const vTickYs = [360, 520, 680, 840, 1080, 1260, 1440, 1620];
    for (const ty of vTickYs) {
      // Left boundary (x = 90) ticks rightward
      ctx.beginPath();
      ctx.moveTo(90, ty);
      ctx.lineTo(96, ty);
      ctx.stroke();

      // Right safe boundary (x = 945) ticks leftward
      ctx.beginPath();
      ctx.moveTo(945, ty);
      ctx.lineTo(939, ty);
      ctx.stroke();
    }

    // Technical coordinate reference stamp (JetBrains Mono)
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillStyle = `${theme.accent}66`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SYS_REF // 1080x1920.CAD_SAFE', 106, 196);
    ctx.restore();
  }

  // 4. Header: Top-Left Authentic MARROK Vector Badge + Full Wordmark "MARROK" + Pulsing Accent Dot
  ctx.save();
  const displayBrandText = (carousel.brand || 'MARROK').trim();

  // Crisp compact authentic MARROK vector logo badge (32x32px)
  const logoBadgeSize = 32;
  const logoBadgeX = 82;
  const logoBadgeY = 112;

  // Ambient badge glow matching studio header
  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 8;
  drawRoundRect(ctx, logoBadgeX, logoBadgeY, logoBadgeSize, logoBadgeSize, 8, '#0D0D0D', `${theme.accent}66`, 1.2);
  ctx.restore();

  // Render authentic SVG vector mark inside badge using Path2D
  drawMarrokVectorBadge(ctx, logoBadgeX + logoBadgeSize / 2, logoBadgeY + logoBadgeSize / 2, logoBadgeSize - 4, theme.accent, 'transparent');

  // Brand Wordmark: clean 12px gap between the badge and full MARROK wordmark
  const brandTextX = logoBadgeX + logoBadgeSize + 12;
  ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(displayBrandText, brandTextX, 142);

  // Pulsing Accent Dot next to Brand wordmark
  const brandWidth = ctx.measureText(displayBrandText).width;
  const dotX = brandTextX + brandWidth + 12;
  ctx.beginPath();
  ctx.arc(dotX, 129, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = theme.accent;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Top-Right Category Tag (aligned to right safe CAD boundary x = 945)
  ctx.font = '400 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = theme.categoryTag;
  ctx.textAlign = 'right';
  ctx.fillText(categoryTag, 945, 140);
  ctx.restore();

  // 5. Render Archetype Specific Graphics & Layouts
  let textZoneStartY = 755;

  if (slide.type === 'hub') {
    // Archetype 1: Hub (Exclusively on Slide 1)
    const cx = 540;
    const cy = 600;
    const r = 325;

    // 1. Outer orbital circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = theme.accent + '4D'; // rgba(accent, 0.3)
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3 intersecting spoke lines through center at angles -90°, -30°, 30°
    const spokeAngles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6];
    for (const angle of spokeAngles) {
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx - r * Math.cos(angle);
      const y2 = cy - r * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = theme.accent + '4D';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Coordinate crosshairs (+) at the orbital ring tangents
    const tangentCoords = [
      { x: cx + r, y: cy },
      { x: cx - r, y: cy },
      { x: cx, y: cy + r },
      { x: cx, y: cy - r },
    ];
    ctx.strokeStyle = `${theme.accent}80`;
    ctx.lineWidth = 1.5;
    const tArm = 8;
    for (const tc of tangentCoords) {
      ctx.beginPath();
      ctx.moveTo(tc.x - tArm, tc.y);
      ctx.lineTo(tc.x + tArm, tc.y);
      ctx.moveTo(tc.x, tc.y - tArm);
      ctx.lineTo(tc.x, tc.y + tArm);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Clean concentric calibration ring around the 280x280 Center Hero Badge
    ctx.save();
    const calR = 192;
    // Ambient pulse glow behind center hub
    const centerGlow = ctx.createRadialGradient(cx, cy, 60, cx, cy, 230);
    centerGlow.addColorStop(0, `${theme.accent}2E`);
    centerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(cx - 230, cy - 230, 460, 460);

    // Inner calibration circle
    ctx.beginPath();
    ctx.arc(cx, cy, calR, 0, Math.PI * 2);
    ctx.strokeStyle = `${theme.accent}3D`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Outer segmented dashed ring
    ctx.beginPath();
    ctx.arc(cx, cy, calR + 10, 0, Math.PI * 2);
    ctx.strokeStyle = `${theme.accent}26`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 12 calibration tick marks at 30° intervals
    ctx.strokeStyle = `${theme.accent}70`;
    ctx.lineWidth = 1.5;
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const x1 = cx + (calR - 5) * Math.cos(rad);
      const y1 = cy + (calR - 5) * Math.sin(rad);
      const x2 = cx + (calR + 5) * Math.cos(rad);
      const y2 = cy + (calR + 5) * Math.sin(rad);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // Center Hub Box: 280x280 rounded rect (radius 48) with dark glassmorphic styling
    const centerBoxW = 280;
    const centerBoxH = 280;
    const centerBoxX = cx - centerBoxW / 2;
    const centerBoxY = cy - centerBoxH / 2;
    ctx.save();
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 14;
    drawRoundRect(ctx, centerBoxX, centerBoxY, centerBoxW, centerBoxH, 48, '#081216', theme.accent, 2.5);
    ctx.restore();

    // Center Hub Icon: 130x130 in theme.accent
    const centerIconName = slide.centerIcon || 'gitMerge';
    const centerImg = await loadIconImage(centerIconName, theme.accent);
    const iconSize = 130;
    drawTintedImage(ctx, centerImg, cx - iconSize / 2, cy - iconSize / 2 - 14, iconSize, iconSize, theme.accent);

    // Center Core Tag Pill at bottom of center box
    drawRoundRect(ctx, cx - 85, centerBoxY + centerBoxH - 42, 170, 26, 8, `${theme.accent}20`, `${theme.accent}70`, 1.2);
    ctx.save();
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SYSTEM CORE', cx, centerBoxY + centerBoxH - 29);
    ctx.restore();

    // 6 Satellite Badges with crisp technical label pills and spoke flow indicators
    const satAngles = [-90, -30, 30, 90, 150, 210];
    const satIcons = slide.satIcons || ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
    const satLabels = slide.satLabels || [];
    const satW = 138;
    const satH = 104;
    const satIconSize = 48;

    // Default technical labels mapping if not explicitly provided
    const DEFAULT_ICON_LABELS: Record<string, string> = {
      server: 'SERVICE POD',
      database: 'STORAGE',
      gauge: 'TELEMETRY',
      users: 'IAM IDENTITY',
      robot: 'AI AGENT',
      gitMerge: 'VCS ENGINE',
      cpu: 'EXEC ENGINE',
      box: 'CONTAINER',
      activity: 'HEALTH P99',
      shieldAlert: 'POLICY GATE',
      lock: 'CRYPTO MESH',
      network: 'mTLS PROXY',
      key: 'x509 CERTS',
      code: 'VIRTUAL FS',
      terminal: 'CLI GATEWAY',
      cloud: 'K8s CLUSTER',
      zap: 'LOW LATENCY',
    };

    for (let i = 0; i < satAngles.length; i++) {
      try {
        const rad = (satAngles[i] * Math.PI) / 180;
        const sx = cx + r * Math.cos(rad);
        const sy = cy + r * Math.sin(rad);

        // Glowing connection node at intersection
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, 70, 0, Math.PI * 2);
        ctx.strokeStyle = `${theme.accent}30`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fillStyle = theme.accent;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#081216';
        ctx.fill();
        ctx.restore();

        // Directional spoke arrow chevrons radiating from center to satellite
        const arrowDist = r * 0.58;
        const ax = cx + arrowDist * Math.cos(rad);
        const ay = cy + arrowDist * Math.sin(rad);
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(rad);
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Dark Glassmorphic Satellite Box (NOT solid neon)
        drawRoundRect(ctx, sx - satW / 2, sy - satH / 2, satW, satH, 20, '#091319', `${theme.accent}80`, 2);

        // CAD Corner marks on satellite
        ctx.save();
        ctx.strokeStyle = `${theme.accent}60`;
        ctx.lineWidth = 1.2;
        const sm = 6;
        ctx.beginPath();
        ctx.moveTo(sx - satW / 2 + 5, sy - satH / 2 + 5 + sm);
        ctx.lineTo(sx - satW / 2 + 5, sy - satH / 2 + 5);
        ctx.lineTo(sx - satW / 2 + 5 + sm, sy - satH / 2 + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + satW / 2 - 5 - sm, sy + satH / 2 - 5);
        ctx.lineTo(sx + satW / 2 - 5, sy + satH / 2 - 5);
        ctx.lineTo(sx + satW / 2 - 5, sy + satH / 2 - 5 - sm);
        ctx.stroke();
        ctx.restore();

        // Satellite Icon (centered in upper portion)
        const sIconName = satIcons[i % satIcons.length] || 'gitMerge';
        const sImg = await loadIconImage(sIconName, theme.accent);
        drawTintedImage(ctx, sImg, sx - satIconSize / 2, sy - satH / 2 + 12, satIconSize, satIconSize, theme.accent);

        // Crisp Technical Label Pill (attached to lower portion of satellite)
        const labelText = satLabels[i] || DEFAULT_ICON_LABELS[sIconName] || sIconName.toUpperCase();
        const pillW = Math.min(satW - 14, 126);
        const pillH = 24;
        const pillX = sx - pillW / 2;
        const pillY = sy + satH / 2 - 32;

        drawRoundRect(ctx, pillX, pillY, pillW, pillH, 6, '#060a0d', `${theme.accent}90`, 1.2);
        ctx.save();
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayLabel = labelText.length > 12 ? labelText.slice(0, 11) + '…' : labelText;
        ctx.fillText(displayLabel, sx, pillY + pillH / 2);
        ctx.restore();
      } catch (satErr) {
        console.warn(`Error rendering satellite ${i}:`, satErr);
      }
    }

    textZoneStartY = 1120;
  } else if (slide.type === 'row' || (slide.type === 'cta' && slideIndex !== totalSlides - 1)) {
    // Dynamic Technical Schematics: Dispatch to bespoke labeled diagrams instead of rigid flat boxes
    const slideText = `${slide.enTitle || ''} ${slide.enBody || ''} ${slide.arTitle || ''}`.toLowerCase();
    const iconCount = slide.icons?.length || 0;

    if (
      slideText.includes('blast radius') ||
      slideText.includes('microsegment') ||
      slideText.includes('isolation') ||
      slideText.includes('isolate') ||
      slideText.includes('perimeter') ||
      slideText.includes('firewall') ||
      slideText.includes('quarantine') ||
      slideText.includes('sandbox')
    ) {
      textZoneStartY = await drawBlastRadiusIsolationGrid(ctx, slide, theme, options, 240);
    } else if (
      slideText.includes('stack') ||
      slideText.includes('layer') ||
      slideText.includes('pipeline') ||
      slideText.includes('server-side') ||
      slideText.includes('engine') ||
      slideText.includes('tier') ||
      slideText.includes('virtual mount') ||
      slideText.includes('object store') ||
      slideText.includes('hierarchy') ||
      slideIndex === 4
    ) {
      textZoneStartY = await drawLayeredArchitectureStack(ctx, slide, theme, options, 240);
    } else if (iconCount === 1) {
      textZoneStartY = await drawKeyTakeawayCard(ctx, slide, theme, options, 240);
    } else {
      textZoneStartY = await drawMultiNodeTopologyFlow(ctx, slide, theme, options, 240);
    }
  } else if (slide.type === 'number') {
    // Spec §9.4 Number Archetype: Big accent numeral (e.g. "01", "02") at y=330, text block at y=700
    const stepStr = slide.stepNumber || String(slideIndex + 1).padStart(2, '0');
    const labelStr = slide.stepLabel || `STEP ${stepStr}`;

    // Micro step badge above big number
    ctx.save();
    ctx.font = '700 24px "Plus Jakarta Sans", monospace';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '2px';
    ctx.fillText(labelStr.toUpperCase(), 540, 240);
    ctx.restore();

    // Giant accent numeral centered at y = 470 (baseline)
    ctx.save();
    ctx.font = '800 220px "Plus Jakarta Sans", "Cairo", sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = `${theme.accent}40`;
    ctx.shadowBlur = 28;
    ctx.fillText(stepStr, 540, 470);
    ctx.restore();

    // Subtle horizontal divider under number
    ctx.save();
    ctx.strokeStyle = `${theme.accent}33`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(420, 520);
    ctx.lineTo(660, 520);
    ctx.stroke();
    ctx.restore();

    textZoneStartY = 660;
  } else if (slide.type === 'metric') {
    // Archetype 3: Metric Card (Benchmark, Speedup, Resource ROI)
    const cardX = 100;
    const cardY = 240;
    const cardW = 880;
    const cardH = 430;
    const radius = 32;

    // 1. Soft ambient glow behind metric card (restrained: 12px blur max)
    ctx.save();
    const metricGlow = ctx.createRadialGradient(
      cardX + cardW / 2,
      cardY + cardH / 2,
      30,
      cardX + cardW / 2,
      cardY + cardH / 2,
      cardW / 1.8
    );
    metricGlow.addColorStop(0, `${theme.accent}1A`);
    metricGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = metricGlow;
    ctx.fillRect(cardX - 30, cardY - 30, cardW + 60, cardH + 60);
    ctx.restore();

    // 2. Card background & crisp 2px border
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius, theme.surface, theme.surfaceBorder, 2);

    // 3. Top accent neon line along upper card border
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.moveTo(cardX + radius + 10, cardY);
    ctx.lineTo(cardX + cardW - radius - 10, cardY);
    ctx.stroke();
    ctx.restore();

    // 4. Header Row: Metric Icon Badge + Category Label
    const iconBadgeSize = 48;
    const iconBadgeX = cardX + 36;
    const iconBadgeY = cardY + 28;
    drawRoundRect(ctx, iconBadgeX, iconBadgeY, iconBadgeSize, iconBadgeSize, 14, `${theme.accent}22`, `${theme.accent}55`, 1.5);

    const mIcon = slide.metricIcon || 'zap';
    const iconImg = await loadIconImage(mIcon, theme.accent);
    drawTintedImage(ctx, iconImg, iconBadgeX + 10, iconBadgeY + 10, 28, 28, theme.accent);

    const metricLabel = (slide.metricLabel || 'KEY PERFORMANCE METRIC').toUpperCase();
    ctx.save();
    ctx.font = '700 20px "Plus Jakarta Sans", monospace';
    ctx.fillStyle = theme.microLabel;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '1px';
    ctx.fillText(metricLabel, iconBadgeX + iconBadgeSize + 16, iconBadgeY + iconBadgeSize / 2);
    ctx.restore();

    // 5. Giant Hero Metric Value with restrained glow (0px text blur rule)
    const metricVal = slide.metricValue || '10x';
    ctx.save();
    const valFontSize = metricVal.length > 8 ? 86 : metricVal.length > 5 ? 104 : 124;
    ctx.font = `900 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = theme.textWhite;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = `${theme.accent}50`;
    ctx.shadowBlur = 12; // Restrained glow: 8-16px max
    const heroY = cardY + 175;
    ctx.fillText(metricVal, 540, heroY);
    // Explicitly reset shadowBlur to 0
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.restore();

    // 6. SVG/Canvas Acceleration Sparkline Curve & Gauge Meter directly below hero stat
    if (options.showSparklines) {
      const meterStartX = cardX + 50;
      const meterEndX = cardX + cardW - 50;
      const meterW = meterEndX - meterStartX;
      const baseY = cardY + 305;
      const peakY = cardY + 230;

      ctx.save();
      // Subtle gradient fill under sparkline curve
      const curveGrad = ctx.createLinearGradient(0, peakY, 0, baseY);
      curveGrad.addColorStop(0, `${theme.accent}26`);
      curveGrad.addColorStop(1, `${theme.accent}00`);

      ctx.beginPath();
      ctx.moveTo(meterStartX, baseY);
      ctx.bezierCurveTo(
        meterStartX + meterW * 0.45,
        baseY - 4,
        meterStartX + meterW * 0.7,
        peakY + 18,
        meterEndX,
        peakY
      );
      ctx.lineTo(meterEndX, baseY);
      ctx.closePath();
      ctx.fillStyle = curveGrad;
      ctx.fill();

      // Sparkline Stroke with restrained glow
      ctx.beginPath();
      ctx.moveTo(meterStartX, baseY);
      ctx.bezierCurveTo(
        meterStartX + meterW * 0.45,
        baseY - 4,
        meterStartX + meterW * 0.7,
        peakY + 18,
        meterEndX,
        peakY
      );
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Focal peak node circle
      ctx.beginPath();
      ctx.arc(meterEndX, peakY, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(meterEndX, peakY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#081216';
      ctx.fill();

      // Gauge Baseline Axis
      ctx.beginPath();
      ctx.strokeStyle = `${theme.accent}40`;
      ctx.lineWidth = 1.5;
      ctx.moveTo(meterStartX, baseY);
      ctx.lineTo(meterEndX, baseY);
      ctx.stroke();

      // 11 Gauge Tick Marks (0% to 100% in 10% steps)
      const tickCount = 11;
      ctx.strokeStyle = `${theme.accent}55`;
      ctx.lineWidth = 1.5;
      for (let t = 0; t < tickCount; t++) {
        const tx = meterStartX + (meterW / (tickCount - 1)) * t;
        const isMajor = t === 0 || t === 5 || t === 10;
        const tLen = isMajor ? 8 : 4;
        ctx.beginPath();
        ctx.moveTo(tx, baseY);
        ctx.lineTo(tx, baseY + tLen);
        ctx.stroke();
      }

      // Gauge Micro Labels
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'left';
      ctx.fillText('BASELINE', meterStartX, baseY + 20);
      ctx.textAlign = 'center';
      ctx.fillText('50%', meterStartX + meterW * 0.5, baseY + 20);
      ctx.textAlign = 'right';
      ctx.fillText('PEAK // P99', meterEndX, baseY + 20);
      ctx.restore();
    }

    // 7. Paired Delta Pill (▲ Emerald / ▼ Crimson / Accent)
    const diffText = slide.metricDiff || '▲ Measurable architectural speedup';
    const isPositive = /[▲+]|faster|speedup|drop|gain|reduction|boost/i.test(diffText);
    const isNegative = /[▼-]|latency spike|bottleneck|regression|exploit/i.test(diffText) && !isPositive;

    const deltaAccent = isPositive ? '#10B981' : isNegative ? '#F43F5E' : theme.accent;
    const deltaBg = isPositive ? 'rgba(16, 185, 129, 0.14)' : isNegative ? 'rgba(244, 63, 94, 0.14)' : `${theme.accent}20`;
    const deltaBorder = isPositive ? 'rgba(16, 185, 129, 0.50)' : isNegative ? 'rgba(244, 63, 94, 0.50)' : `${theme.accent}60`;

    ctx.save();
    ctx.font = '700 23px "Plus Jakarta Sans", monospace';
    const diffMetrics = ctx.measureText(diffText);
    const pillW = Math.min(diffMetrics.width + 48, 760);
    const pillH = 46;
    const pillX = 540 - pillW / 2;
    const pillY = cardY + cardH - 62;
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 23, deltaBg, deltaBorder, 1.5);

    ctx.fillStyle = deltaAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(diffText, 540, pillY + pillH / 2);
    ctx.restore();

    textZoneStartY = 745;
  } else if (slide.type === 'code') {
    // Archetype 4: Precision Silicon & Terminal Window
    const winX = 100;
    const winY = 240;
    const winW = 880;
    const winH = 430;
    const winRadius = 28;

    // 1. Ambient glow behind terminal window (restrained)
    ctx.save();
    const termGlow = ctx.createRadialGradient(
      winX + winW / 2,
      winY + winH / 2,
      40,
      winX + winW / 2,
      winY + winH / 2,
      winW / 1.8
    );
    termGlow.addColorStop(0, `${theme.accent}14`);
    termGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = termGlow;
    ctx.fillRect(winX - 30, winY - 30, winW + 60, winH + 60);
    ctx.restore();

    // 2. Window container: deep OLED background
    drawRoundRect(ctx, winX, winY, winW, winH, winRadius, '#060a0d', theme.surfaceBorder, 2);

    // 3. Clip interior for header, CRT scanlines, and code gutter
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(winX, winY, winW, winH, winRadius);
    } else {
      ctx.rect(winX, winY, winW, winH);
    }
    ctx.clip();

    // Subtle CRT scanline texture (strictly 3%-5% opacity max for razor-sharp code)
    if (options.terminalScanlines) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      for (let sy = winY; sy <= winY + winH; sy += 4) {
        ctx.fillRect(winX, sy, winW, 1.5);
      }
    }

    // Title Bar
    const titleBarH = 56;
    ctx.fillStyle = '#0d151c';
    ctx.fillRect(winX, winY, winW, titleBarH);
    // Title bar bottom divider
    ctx.strokeStyle = theme.surfaceBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(winX, winY + titleBarH);
    ctx.lineTo(winX + winW, winY + titleBarH);
    ctx.stroke();

    // macOS window traffic dots
    const dotY = winY + titleBarH / 2;
    ctx.beginPath();
    ctx.arc(winX + 32, dotY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FF5F56';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(winX + 54, dotY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFBD2E';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(winX + 76, dotY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#27C93F';
    ctx.fill();

    // Breadcrumb / File Name
    const fileName = slide.codeFileName || (slide.codeLanguage ? `source.${slide.codeLanguage}` : 'terminal.sh');
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#8B9DA8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fileName, winX + winW / 2, dotY);

    // Top-Right Syntax Language Badge (BASH, RUST, TS, SQL, YAML)
    let lang = (slide.codeLanguage || '').toUpperCase();
    if (!lang) {
      if (fileName.endsWith('.sh') || fileName.includes('terminal')) lang = 'BASH';
      else if (fileName.endsWith('.rs')) lang = 'RUST';
      else if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) lang = 'TS';
      else if (fileName.endsWith('.sql')) lang = 'SQL';
      else if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) lang = 'YAML';
      else if (fileName.endsWith('.py')) lang = 'PYTHON';
      else if (fileName.endsWith('.go')) lang = 'GO';
      else lang = 'BASH';
    }
    const badgePad = 12;
    ctx.font = '700 13px "JetBrains Mono", monospace';
    const langMetrics = ctx.measureText(lang);
    const badgeW = langMetrics.width + badgePad * 2;
    const badgeH = 26;
    const badgeX = winX + winW - badgeW - 20;
    const badgeY = dotY - badgeH / 2;
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, `${theme.accent}1C`, `${theme.accent}55`, 1);

    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lang, badgeX + badgeW / 2, dotY);

    // Left Gutter for line numbers
    const gutterW = 64;
    ctx.fillStyle = '#080f14';
    ctx.fillRect(winX, winY + titleBarH, gutterW, winH - titleBarH);
    // Gutter divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(winX + gutterW, winY + titleBarH);
    ctx.lineTo(winX + gutterW, winY + winH);
    ctx.stroke();

    // Code lines rendering with line-level diff highlights
    const snippet = slide.codeSnippet || '$ git fetch --depth=1\n> Initializing lazy checkout...\n+ Fetched 100GB repository in 1.2s\n✔ Zero local disk stalls';
    const lines = snippet.split('\n').slice(0, 7);
    const lineSpacing = 48;
    let lineBaselineY = winY + titleBarH + 38;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTop = lineBaselineY - 30;
      const lineH = 42;

      // Subtle line-level background diff highlights
      if (line.startsWith('+') || line.startsWith('✔')) {
        // Emerald addition highlight
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.fillRect(winX + gutterW + 1, lineTop, winW - gutterW - 1, lineH);
        // Left accent bar
        ctx.fillStyle = '#10B981';
        ctx.fillRect(winX + gutterW + 1, lineTop, 3, lineH);
      } else if (line.startsWith('-') || line.startsWith('✖')) {
        // Crimson deletion highlight
        ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
        ctx.fillRect(winX + gutterW + 1, lineTop, winW - gutterW - 1, lineH);
        // Left accent bar
        ctx.fillStyle = '#F43F5E';
        ctx.fillRect(winX + gutterW + 1, lineTop, 3, lineH);
      } else if (line.startsWith('$') || line.startsWith('>')) {
        // Subtle command prompt tint
        ctx.fillStyle = `${theme.accent}0A`;
        ctx.fillRect(winX + gutterW + 1, lineTop, winW - gutterW - 1, lineH);
      }

      // Line number in gutter (muted, right-aligned)
      ctx.font = '500 19px "JetBrains Mono", monospace';
      ctx.fillStyle = '#455964';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(i + 1), winX + gutterW - 16, lineBaselineY);

      // Monospace code line (strictly 0px blur)
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.font = '500 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      if (line.startsWith('$') || line.startsWith('>')) {
        ctx.fillStyle = theme.accent;
      } else if (line.startsWith('+') || line.startsWith('✔')) {
        ctx.fillStyle = '#34D399'; // Emerald
      } else if (line.startsWith('-') || line.startsWith('✖')) {
        ctx.fillStyle = '#F87171'; // Red
      } else if (line.startsWith('#') || line.startsWith('//')) {
        ctx.fillStyle = '#677E8C'; // Comment muted
      } else {
        ctx.fillStyle = '#E2E8EC'; // Default code
      }

      ctx.fillText(line, winX + gutterW + 20, lineBaselineY);
      lineBaselineY += lineSpacing;
    }

    ctx.restore(); // End clipping

    textZoneStartY = 745;
  } else if (slide.type === 'compare') {
    // Archetype 5: Side-by-Side Comparison (Legacy vs Modern)
    const cardY = 240;
    const cardH = 430;
    const cardW = 420;
    const leftX = 100;
    const rightX = 560;
    const radius = 28;

    // 1. Left Card: The Legacy / Bottleneck (Crimson 10% contrast tint)
    drawRoundRect(ctx, leftX, cardY, cardW, cardH, radius, '#11171d', 'rgba(244, 63, 94, 0.40)', 2);
    // Subtle internal crimson wash
    ctx.save();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(leftX, cardY, cardW, cardH, radius);
    } else {
      ctx.rect(leftX, cardY, cardW, cardH);
    }
    ctx.fill();

    // Top Crimson Accent line
    ctx.beginPath();
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 2.5;
    ctx.moveTo(leftX + radius, cardY);
    ctx.lineTo(leftX + cardW - radius, cardY);
    ctx.stroke();
    ctx.restore();

    // Left Header Badge (BEFORE · LEGACY)
    drawRoundRect(ctx, leftX + 20, cardY + 22, cardW - 40, 50, 14, 'rgba(244, 63, 94, 0.16)', 'rgba(244, 63, 94, 0.35)', 1);
    const xImg = await loadIconImage('xCircle', '#F43F5E');
    safeDrawImage(ctx, xImg, leftX + 34, cardY + 33, 26, 26);

    const leftTitle = slide.compareLeftTitle || 'Legacy Method';
    ctx.save();
    ctx.font = '800 23px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FDA4AF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`BEFORE · ${leftTitle}`.toUpperCase(), leftX + 72, cardY + 47);
    ctx.restore();

    // Left Body Lines with crisp red ✖ bullets
    const leftText = slide.compareLeftBody || '• Full repository clone\n• High disk footprint\n• Stalls CI pipelines';
    const leftLines = leftText.split('\n').slice(0, 5);
    ctx.save();
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.textBaseline = 'alphabetic';
    let lY = cardY + 120;
    for (const rawLine of leftLines) {
      const cleanLine = rawLine.replace(/^[•\-\*✖\s]+/, '').trim();
      // Draw red cross bullet
      ctx.fillStyle = '#F87171';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText('✖', leftX + 28, lY);

      // Line text
      ctx.fillStyle = '#CDD5D9';
      ctx.font = '400 23px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(cleanLine, leftX + 58, lY);
      lY += 48;
    }
    ctx.restore();

    // 2. Right Card: The Modern Approach (Theme Accent contrast tint)
    drawRoundRect(ctx, rightX, cardY, cardW, cardH, radius, '#11171d', `${theme.accent}65`, 2);
    // Subtle internal theme accent wash
    ctx.save();
    ctx.fillStyle = `${theme.accent}12`;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(rightX, cardY, cardW, cardH, radius);
    } else {
      ctx.rect(rightX, cardY, cardW, cardH);
    }
    ctx.fill();

    // Top Neon Accent line
    ctx.beginPath();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.moveTo(rightX + radius, cardY);
    ctx.lineTo(rightX + cardW - radius, cardY);
    ctx.stroke();
    ctx.restore();

    // Right Header Badge (AFTER · OPTIMIZED)
    drawRoundRect(ctx, rightX + 20, cardY + 22, cardW - 40, 50, 14, `${theme.accent}20`, `${theme.accent}45`, 1);
    const checkImg = await loadIconImage('checkCircle', theme.accent);
    safeDrawImage(ctx, checkImg, rightX + 34, cardY + 33, 26, 26);

    const rightTitle = slide.compareRightTitle || 'Modern Approach';
    ctx.save();
    ctx.font = '800 23px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`AFTER · ${rightTitle}`.toUpperCase(), rightX + 72, cardY + 47);
    ctx.restore();

    // Right Body Lines with crisp green ✔ bullets
    const rightText = slide.compareRightBody || '• Virtualized file system\n• Instant sparse checkout\n• Zero local developer wait';
    const rightLines = rightText.split('\n').slice(0, 5);
    ctx.save();
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.textBaseline = 'alphabetic';
    let rY = cardY + 120;
    for (const rawLine of rightLines) {
      const cleanLine = rawLine.replace(/^[•\-\*✔\s]+/, '').trim();
      // Draw emerald check bullet
      ctx.fillStyle = '#34D399';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText('✔', rightX + 28, rY);

      // Line text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '400 23px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(cleanLine, rightX + 58, rY);
      rY += 48;
    }
    ctx.restore();

    // 3. Centered 48px Circular "VS" Badge at x = 540
    const vsX = 540;
    const vsY = cardY + cardH / 2;
    const vsRadius = 24; // 48px diameter

    // Horizontal bridge line connecting left and right cards behind the badge
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = `${theme.accent}40`;
    ctx.lineWidth = 2;
    ctx.moveTo(leftX + cardW, vsY);
    ctx.lineTo(rightX, vsY);
    ctx.stroke();

    // VS Circle badge background with restrained glow
    ctx.beginPath();
    ctx.arc(vsX, vsY, vsRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#081216';
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 12; // Restrained glow: 8-16px max
    ctx.fill();

    // Outer border ring
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner typography: strictly 0px blur
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.font = '900 18px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '1px';
    ctx.fillText('VS', vsX, vsY);
    ctx.restore();

    textZoneStartY = 745;
  } else if (slide.type === 'image') {
    // Archetype: Image / Web Visual Card (Architecture Diagram, Hero Illustration, or Web Photo)
    const cardX = 100;
    const cardY = 240;
    const cardW = 880;
    const cardH = 430;
    const radius = 32;

    // 1. Soft ambient theme glow behind the card matching active post theme
    ctx.save();
    const glowGrad = ctx.createRadialGradient(
      cardX + cardW / 2,
      cardY + cardH / 2,
      40,
      cardX + cardW / 2,
      cardY + cardH / 2,
      cardW / 1.5
    );
    glowGrad.addColorStop(0, `${theme.accent}20`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(cardX - 40, cardY - 40, cardW + 80, cardH + 80);
    ctx.restore();

    // 2. Card surface strictly inherits active post theme surface & border
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius, theme.surface, theme.surfaceBorder, 2.5);

    // 3. Clip inside card for blueprint grid and visual rendering
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.clip();

    // Technical blueprint grid aligned with post theme
    ctx.strokeStyle = `${theme.accent}0A`;
    ctx.lineWidth = 1;
    const gridStep = 32;
    for (let gx = cardX; gx <= cardX + cardW; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, cardY);
      ctx.lineTo(gx, cardY + cardH);
      ctx.stroke();
    }
    for (let gy = cardY; gy <= cardY + cardH; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(cardX, gy);
      ctx.lineTo(cardX + cardW, gy);
      ctx.stroke();
    }

    // Technical corner HUD brackets in theme accent
    const brk = 18;
    ctx.strokeStyle = `${theme.accent}45`;
    ctx.lineWidth = 2;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(cardX + 22, cardY + 22 + brk);
    ctx.lineTo(cardX + 22, cardY + 22);
    ctx.lineTo(cardX + 22 + brk, cardY + 22);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - 22 - brk, cardY + 22);
    ctx.lineTo(cardX + cardW - 22, cardY + 22);
    ctx.lineTo(cardX + cardW - 22, cardY + 22 + brk);
    ctx.stroke();

    if (slide.imageUrl) {
      const filterMode = slide.imageFilter || 'hud';
      // If SVG or logo, colorize with theme.accent in hud/tint mode
      const isSvg = slide.imageUrl.toLowerCase().includes('.svg') || slide.imageUrl.includes('simple-icons');
      const svgColor = filterMode === 'clean' ? undefined : theme.accent;
      const img = await loadWebImage(slide.imageUrl, svgColor);

      if (img.width > 0 && img.height > 0) {
        // Calculate aspect fit inside card
        const imgAspect = img.width / img.height;
        const cardAspect = cardW / cardH;
        let dw = cardW;
        let dh = cardH;
        let dx = cardX;
        let dy = cardY;

        if (slide.imageFit === 'cover') {
          if (imgAspect > cardAspect) {
            dh = cardH;
            dw = cardH * imgAspect;
            dx = cardX + (cardW - dw) / 2;
          } else {
            dw = cardW;
            dh = cardW / imgAspect;
            dy = cardY + (cardH - dh) / 2;
          }
        } else {
          // Contain with 24px padding
          const pad = 24;
          const availW = cardW - pad * 2;
          const availH = cardH - pad * 2;
          const availAspect = availW / availH;

          if (imgAspect > availAspect) {
            dw = availW;
            dh = availW / imgAspect;
          } else {
            dh = availH;
            dw = availH * imgAspect;
          }
          dx = cardX + (cardW - dw) / 2;
          dy = cardY + (cardH - dh) / 2;
        }

        // Apply theme harmonization filter to image
        ctx.save();
        if (filterMode === 'invert') {
          // Invert white background diagrams into dark terminal mode
          ctx.filter = 'invert(0.92) hue-rotate(180deg) contrast(1.2) brightness(0.95)';
          safeDrawImage(ctx, img, dx, dy, dw, dh);
        } else if ((filterMode === 'hud' || filterMode === 'tint') && isSvg) {
          // In HUD / Tint mode, colorize SVG logo/graphic directly with active post theme accent!
          drawTintedImage(ctx, img, dx, dy, dw, dh, theme.accent);
        } else if (filterMode === 'tint') {
          drawTintedImage(ctx, img, dx, dy, dw, dh, theme.accent);
        } else if (filterMode === 'hud') {
          // Subtle high-contrast terminal blend for raster diagrams
          ctx.filter = 'contrast(1.1) brightness(1.02)';
          safeDrawImage(ctx, img, dx, dy, dw, dh);
        } else {
          safeDrawImage(ctx, img, dx, dy, dw, dh);
        }
        ctx.restore();
      }
    } else {
      // Sleek placeholder if no image URL yet
      ctx.save();
      const pIcon = await loadIconImage('codeFile', theme.accent);
      safeDrawImage(ctx, pIcon, 540 - 36, cardY + 140, 72, 72);
      ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'center';
      ctx.fillText('Select or search an image from the web in the Slide Editor', 540, cardY + 260);
      ctx.restore();
    }
    ctx.restore(); // End clipping

    // 4. Top border neon accent line (indicates active theme)
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.moveTo(cardX + 60, cardY);
    ctx.lineTo(cardX + cardW - 60, cardY);
    ctx.stroke();
    ctx.restore();

    // 5. Optional Image Caption / Micro-badge matching theme
    if (slide.imageCaption) {
      ctx.save();
      const badgeText = slide.imageCaption.toUpperCase();
      ctx.font = '700 20px "Plus Jakarta Sans", monospace';
      const bMetrics = ctx.measureText(badgeText);
      const bW = Math.min(bMetrics.width + 36, 760);
      const bH = 40;
      const bX = cardX + 24;
      const bY = cardY + cardH - 54;
      drawRoundRect(ctx, bX, bY, bW, bH, 12, theme.baseBg, theme.surfaceBorder, 1.5);

      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bX + 18, bY + bH / 2);
      ctx.restore();
    }

    textZoneStartY = 745;
  } else if (slide.type === 'cta' && slideIndex === totalSlides - 1) {
    // Archetype 8: Standardized Marrok Closer (Isometric Core, Domain Hook, Bilingual CTA Pill, Verified Card)
    const emblemX = 518;
    const emblemY = 440;
    const calRadius = 145;

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
    const cubeR = 82; // radius of isometric hexagon vertices
    const vAngles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (-5 * Math.PI) / 6];
    const pts = vAngles.map(ang => ({
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

    // Facet 1: Top Diamond (Center -> pts[5] -> pts[0] -> pts[1] -> Center)
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

    // Facet 2: Left Diamond (Center -> pts[5] -> pts[4] -> pts[3] -> Center)
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

    // Facet 3: Right Diamond (Center -> pts[1] -> pts[2] -> pts[3] -> Center)
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

    // Outer Hexagon Perimeter with restrained glow
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 12; // Restrained glow rule
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // 3. Central Core: Authentic MARROK Vector Emblem
    const coreSize = 58;
    const coreX = emblemX - coreSize / 2;
    const coreY = emblemY - coreSize / 2;

    // Glowing core perimeter backplate
    ctx.save();
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 14;
    drawRoundRect(ctx, coreX, coreY, coreSize, coreSize, 14, '#081216', theme.accent, 2);
    ctx.restore();

    // Render authentic MARROK vector logo inside core badge using Path2D
    drawMarrokVectorBadge(ctx, emblemX, emblemY, coreSize - 6, theme.accent, 'transparent');
    ctx.restore();

    // 4. Brand Wordmark & Domain Hook Badge directly below emblem
    ctx.save();
    const ctaBrand = carousel.brand || 'MARROK';
    ctx.font = '800 56px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ctaBrand, 518, 625);

    // Accent Divider Line: 100x6 pill
    drawRoundRect(ctx, 518 - 50, 646, 100, 6, 3, theme.accent);

    // Micro Domain Category Badge
    const ctaCategory = (carousel.category || 'AI + SOFTWARE ARCHITECTURE').toUpperCase();
    ctx.font = '700 16px "Plus Jakarta Sans", monospace';
    const catMetrics = ctx.measureText(ctaCategory);
    const catBadgeW = Math.min(catMetrics.width + 32, 600);
    const catBadgeH = 32;
    drawRoundRect(ctx, 518 - catBadgeW / 2, 672, catBadgeW, catBadgeH, 8, `${theme.accent}14`, `${theme.accent}45`, 1);
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaCategory, 518, 672 + catBadgeH / 2);
    ctx.restore();

    // 5. Domain Question Hook (starts at curY = 750)
    ctx.save();
    ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    const rawCtaEnTitle = slide.enTitle || (themeMode === 'security' ? 'Building secure software?' : 'Building with AI agents at scale?');
    const ctaEnTitle = sanitizeEnglishSlideText(rawCtaEnTitle, { isTitle: true });
    const enCtaLines = wrapTextLines(ctx, ctaEnTitle, 850);
    let curY = 755;
    for (const line of enCtaLines) {
      ctx.fillText(line, 518, curY);
      curY += 76;
    }

    curY += 8;
    ctx.font = '800 60px "Cairo", sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.direction = 'rtl';
    const rawCtaArTitle = slide.arTitle || (themeMode === 'security' ? 'تبني برمجيات آمنة؟' : 'تبني بوكلاء الذكاء الاصطناعي؟');
    const ctaArTitle = sanitizeArabicSlideText(rawCtaArTitle, { isTitle: true });
    const arCtaLines = wrapTextLines(ctx, ctaArTitle, 850);
    for (const line of arCtaLines) {
      ctx.fillText(line, 518, curY);
      curY += 78;
    }
    ctx.restore();

    // 6. High-Contrast Bilingual CTA Pill Button (at y = 1380)
    const pillW = 656;
    const pillH = 110;
    const pillX = 518 - pillW / 2;
    const pillY = 1380;
    ctx.save();
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 14;
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 55, theme.accent);
    ctx.restore();

    ctx.save();
    ctx.font = '800 40px "Cairo", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#081216';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.ctaText || 'DM us  •  رسالة خاصة', 518, pillY + pillH / 2);
    ctx.restore();

    // 7. Verified marrok.org Attribution Card (Safe from bottom y <= 1840)
    const displayUrl = carousel.brandUrl || slide.url || 'marrok.org';
    ctx.save();
    ctx.font = '600 36px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E2E8EC';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayUrl, 518, pillY + pillH + 75);
    ctx.restore();

    // Bilingual Source Attribution Card container (y = 1595 to 1705)
    const cardW = 780;
    const cardH = 96;
    const cardX = 518 - cardW / 2;
    const cardY = 1595;
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

    ctx.save();
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = theme.textMuted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(enCredit, textStartX, cardY + 42);
    ctx.restore();

    ctx.save();
    ctx.font = '500 22px "Cairo", sans-serif';
    ctx.fillStyle = theme.textMuted;
    ctx.textAlign = 'left';
    ctx.direction = 'rtl';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(arCredit, textStartX, cardY + 76);
    ctx.restore();
  }

  // 6. Text Zone Rendering (for hub, row, metric, code, and compare slides)
  // Strict Safe-Zone Rule: Center at x = 518 with maxWidth 850 (titles) and 820 (body)
  // to enforce right safe margin >= 135px (x <= 945) clearing TikTok native right-side action buttons
  if (slide.type !== 'cta' || slideIndex !== totalSlides - 1) {
    let currentY = textZoneStartY;

    // English Headline: 74px, line-height 86px, 800 weight, #FFFFFF
    if (slide.enTitle) {
      ctx.save();
      ctx.font = '800 74px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const cleanEnTitle = sanitizeEnglishSlideText(slide.enTitle, { isTitle: true });
      const enLines = wrapTextLines(ctx, cleanEnTitle, 850);
      for (const line of enLines) {
        ctx.fillText(line, 518, currentY);
        currentY += 86;
      }
      ctx.restore();
    }

    // Arabic Headline: 70px, line-height 88px, 800 weight, var(--accent)
    if (slide.arTitle) {
      currentY += 6;
      ctx.save();
      ctx.font = '800 70px "Cairo", sans-serif';
      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      const cleanArTitle = sanitizeArabicSlideText(slide.arTitle, { isTitle: true });
      const arLines = wrapTextLines(ctx, cleanArTitle, 850);
      for (const line of arLines) {
        ctx.fillText(line, 518, currentY);
        currentY += 88;
      }
      ctx.restore();
    }

    // English Body Copy: 38px, line-height 54px, 400 weight, #CDD5D9
    if (slide.enBody) {
      currentY += 34;
      ctx.save();
      ctx.font = '400 38px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textEnBody;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const cleanEnBody = sanitizeEnglishSlideText(slide.enBody, { isTitle: false });
      const enBodyLines = wrapTextLines(ctx, cleanEnBody, 820);
      for (const line of enBodyLines) {
        ctx.fillText(line, 518, currentY);
        currentY += 54;
      }
      ctx.restore();
    }

    // Arabic Body Copy: 38px, line-height 56px, 400 weight, #9BA5AB
    if (slide.arBody) {
      currentY += 18;
      ctx.save();
      ctx.font = '400 38px "Cairo", sans-serif';
      ctx.fillStyle = theme.textArBody;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      const cleanArBody = sanitizeArabicSlideText(slide.arBody, { isTitle: false });
      const arBodyLines = wrapTextLines(ctx, cleanArBody, 820);
      for (const line of arBodyLines) {
        ctx.fillText(line, 518, currentY);
        currentY += 56;
      }
      ctx.restore();
    }
  }

  // 7. Pagination Footer (Present on EVERY slide at y = 1826, centered at x = 518)
  const dotRadius = 8;
  const dotDiameter = 16;
  const dotGap = 16;
  const step = dotDiameter + dotGap;
  const totalDotsWidth = totalSlides * dotDiameter + (totalSlides - 1) * dotGap;
  const startDotX = 518 - totalDotsWidth / 2 + dotRadius;
  const dotY = 1826;

  ctx.save();
  for (let i = 0; i < totalSlides; i++) {
    const dx = startDotX + i * step;
    ctx.beginPath();
    ctx.arc(dx, dotY, dotRadius, 0, Math.PI * 2);
    if (i === slideIndex) {
      ctx.fillStyle = theme.accent;
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    }
    ctx.fill();
  }
  ctx.restore();

  return canvas;
}

/**
 * Direct Browser Copy: Copy 1080x1920 slide image directly to system clipboard
 */
export async function copySlideToClipboard(
  carousel: CarouselData,
  slideIndex: number,
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<void> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette, visualOptions);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob from canvas'));
        return;
      }
      try {
        if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
          const item = new (window as any).ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve();
        } else {
          // Fallback: download if clipboard API image/png not permitted
          downloadSingleSlidePng(carousel, slideIndex, undefined, customPalette, visualOptions);
          resolve();
        }
      } catch (err) {
        console.warn('Clipboard write failed, triggering single download fallback:', err);
        downloadSingleSlidePng(carousel, slideIndex, undefined, customPalette, visualOptions);
        resolve();
      }
    }, 'image/png');
  });
}

/**
 * Web Share API: Share slide image directly on mobile (TikTok, Instagram, WhatsApp, etc.)
 */
export async function shareSlide(
  carousel: CarouselData,
  slideIndex: number,
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<boolean> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette, visualOptions);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        const file = new File([blob], `MARROK_Slide_${slideIndex + 1}.jpg`, { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `MARROK Slide ${slideIndex + 1}`,
            text: carousel.caption.substring(0, 100),
          });
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        console.warn('Web Share failed:', err);
        resolve(false);
      }
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Trigger immediate download of single slide as JPG (TikTok requires JPG, not PNG)
 */
export async function downloadSingleSlidePng(
  carousel: CarouselData,
  slideIndex: number,
  filename?: string,
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<void> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette, visualOptions);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename || `MARROK_Slide_${slideIndex + 1}_${carousel.theme}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 1-click Download All Slides as ZIP containing high-resolution 1080x1920 JPGs
 * Spec §9.8: JPG only, quality 95, ~250-300 KB per slide. TikTok rejects PNG.
 */
export async function downloadAllSlidesZip(
  carousel: CarouselData,
  customPalette?: ThemePalette,
  onProgress?: (current: number, total: number) => void,
  visualOptions?: VisualSystemOptions
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(`MARROK_Carousel_${carousel.theme}`);
  const total = carousel.slides.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);
    const canvas = await renderSlideToCanvas(carousel, i, undefined, customPalette, visualOptions);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64 = dataUrl.split(',')[1];
    folder?.file(`slide${i + 1}.jpg`, base64, { base64: true });
  }

  // Spec §18 Complete Deliverables: Caption, Pinned First Comment, Short Caption, Metadata, and Claims Citations
  // 1. Formatted Bilingual Caption
  let fullCaptionText = carousel.caption || '';
  if (carousel.facts && carousel.facts.length > 0 && !fullCaptionText.includes('Verified Facts:')) {
    const factsBlock = carousel.facts
      .map(
        (f) =>
          `• [${f.verified.toUpperCase()}] ${f.text}${f.sourceTitle ? ` (Ref: ${f.sourceTitle})` : ''}${f.sourceUrl ? `\n  Link: ${f.sourceUrl}` : ''}`
      )
      .join('\n');
    fullCaptionText += `\n\n═════════════════════════════════════\n🔍 Verified Claims & Citations:\n${factsBlock}`;
  }
  folder?.file('caption.txt', fullCaptionText.replace(/\u00A0/g, ' '));

  // ── Metricool Publishing Bundle ──
  // 1. Ready-to-paste bilingual TikTok caption, hook, standardized Marrok closing line/CTA, and hashtags
  const mainCaption = carousel.captionVariants?.[0]?.caption || carousel.caption || '';
  const ctaLine = carousel.slides[carousel.slides.length - 1]?.ctaText || 'DM us  •  رسالة خاصة';
  const metricoolCaption = `${mainCaption}

═════════════════════════════════════
🔗 Reference & Documentation: https://${carousel.brandUrl || 'marrok.org'}
💬 Action: [ ${ctaLine} ]
`.trim();

  const cleanBilingualCaption = metricoolCaption.replace(/\u00A0/g, ' ');
  folder?.file('caption-bilingual.txt', cleanBilingualCaption);
  zip.file('caption-bilingual.txt', cleanBilingualCaption);

  // 2. Serialized CarouselData + active theme and visualOptions for reloading and auditing
  const carouselManifest = {
    ...carousel,
    activePalette: customPalette || DEFAULT_PALETTES[carousel.theme] || null,
    visualOptions: visualOptions || carousel.visualOptions || {
      showCadReticles: true,
      showSparklines: true,
      terminalScanlines: true,
    },
    exportedAt: new Date().toISOString(),
    generator: 'MARROK TikTok Carousel Studio',
    targetPlatform: 'Metricool / TikTok 9:16',
    format: '1080x1920',
  };
  const manifestJson = JSON.stringify(carouselManifest, null, 2);
  folder?.file('carousel-manifest.json', manifestJson);
  zip.file('carousel-manifest.json', manifestJson);

  // 2. Separate dedicated claims & citations verification file
  if (carousel.facts && carousel.facts.length > 0) {
    const claimsReport = `MARROK VERIFIED CLAIMS & GROUNDING REPORT
══════════════════════════════════════════════
Topic: ${carousel.category}
Brand/Source: ${carousel.brand || 'Engineering Source'} (${carousel.brandUrl || 'marrok.org'})
Search Grounded: ${carousel.sourceMeta?.isSearchGrounded ? 'YES (Google Search Grounding)' : 'Synthesizer Intelligence'}
Generated: ${new Date().toISOString()}

EXTRACTED & VERIFIED CLAIMS:
${carousel.facts
  .map(
    (f, idx) =>
      `[#${idx + 1}] ${f.type.toUpperCase()} · Status: ${f.verified.toUpperCase()}
Claim: ${f.text}
Evidence: ${f.evidence || 'Attributed to source documentation'}
${f.sourceTitle ? `Source: ${f.sourceTitle}` : ''}
${f.sourceUrl ? `URL: ${f.sourceUrl}` : ''}
`
  )
  .join('\n')}

GROUNDING QUERIES EXECUTED:
${(carousel.sourceMeta?.groundingQueries || []).map((q) => `• ${q}`).join('\n') || '• Direct contextual extraction'}

AUTHORITATIVE SOURCES & DOCUMENTATION:
${(carousel.sourceMeta?.groundingSources || []).map((s) => `• ${s.title}: ${s.url}`).join('\n') || `• https://${carousel.brandUrl || 'marrok.org'}`}
`;
    folder?.file('claims_citations.txt', claimsReport.replace(/\u00A0/g, ' '));
  }

  if (carousel.firstComment) {
    folder?.file('first_comment.txt', carousel.firstComment.replace(/\u00A0/g, ' '));
  }
  if (carousel.shortCaption) {
    folder?.file('short_caption.txt', carousel.shortCaption.replace(/\u00A0/g, ' '));
  }

  // Structured Post Metadata JSON (for automation, analytics, and archiving)
  const metadata = {
    exportedAt: new Date().toISOString(),
    generator: 'MARROK TikTok Carousel Studio',
    category: carousel.category,
    theme: carousel.theme,
    totalSlides: carousel.slides.length,
    brand: carousel.brand,
    brandUrl: carousel.brandUrl,
    scheduleSlot: carousel.scheduleSlot,
    sourceMeta: carousel.sourceMeta,
    facts: carousel.facts || [],
    notesForHuman: carousel.notesForHuman || [],
    archetypes: carousel.slides.map((s, idx) => ({ slide: idx + 1, type: s.type, enTitle: s.enTitle, arTitle: s.arTitle })),
    caption: carousel.caption,
    firstComment: carousel.firstComment,
    screenHook: carousel.screenHook,
    captionVariants: carousel.captionVariants || [],
    hookVariants: carousel.hookVariants || [],
  };
  folder?.file('post_metadata.json', JSON.stringify(metadata, null, 2));

  // Quick Creator Publishing Guide
  const readme = `MARROK TIKTOK CAROUSEL EXPORT PACKAGE
=====================================
Deck: ${carousel.category} (${carousel.slides.length} slides)
Theme: ${carousel.theme}
Search Grounded: ${carousel.sourceMeta?.isSearchGrounded ? 'YES (Google Search)' : 'Autonomous Synthesizer'}
Created: ${new Date().toLocaleString()}

FILES IN THIS PACKAGE:
- slide1.jpg to slide${total}.jpg (1080x1920 9:16 high-res JPGs, Safe-Zone compliant)
- caption.txt (Bilingual TikTok post caption with hashtags and verification block)
- claims_citations.txt (Audit log of all verified numbers, benchmarks, and source links)
- first_comment.txt (Pinned first comment to drive engagement and save rate)
- short_caption.txt (Clean 2-line version for TikTok quick post)
- post_metadata.json (Machine-readable post schema with grounding metadata)

HOW TO PUBLISH TO TIKTOK:
1. Transfer slide1.jpg through slide${total}.jpg to your phone (AirDrop, Google Drive, etc.).
2. Open TikTok -> Tap '+' -> Choose 'Photos' -> Select all ${total} slides in numerical order.
3. Copy text from 'caption.txt' and paste into TikTok's description box.
4. Hit 'Post'. Immediately open your video comments and paste 'first_comment.txt', then pin it!
`;
  folder?.file('README.txt', readme);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MARROK_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}_Carousel.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Spec §10: Contact Sheet Generator for Visual QA
 * Renders all slides tiled in a grid onto a single high-resolution master JPG canvas.
 */
export async function downloadContactSheetJpg(
  carousel: CarouselData,
  customPalette?: ThemePalette,
  onProgress?: (current: number, total: number) => void,
  visualOptions?: VisualSystemOptions
): Promise<void> {
  const total = carousel.slides.length;
  const cols = total <= 4 ? total : total <= 8 ? 4 : 5;
  const rows = Math.ceil(total / cols);

  // Scaled dimensions per slide on contact sheet
  const sW = 360;
  const sH = 640;
  const gap = 32;
  const headerH = 120;
  const pad = 40;

  const masterW = pad * 2 + cols * sW + (cols - 1) * gap;
  const masterH = headerH + pad * 2 + rows * sH + (rows - 1) * gap;

  const master = document.createElement('canvas');
  master.width = masterW;
  master.height = masterH;
  const mctx = master.getContext('2d');
  if (!mctx) return;

  // Background
  mctx.fillStyle = '#080d11';
  mctx.fillRect(0, 0, masterW, masterH);

  // Header banner
  mctx.fillStyle = '#ffffff';
  mctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
  mctx.fillText('MARROK STUDIO · VISUAL QA CONTACT SHEET', pad, pad + 38);

  mctx.fillStyle = '#9BA5AB';
  mctx.font = '500 20px "Plus Jakarta Sans", monospace';
  mctx.fillText(
    `Deck: ${carousel.category}   •   Theme: ${carousel.theme}   •   ${total} Slides (1080×1920 9:16)   •   Format: JPG Q95`,
    pad,
    pad + 74
  );

  // Render each slide
  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = pad + c * (sW + gap);
    const y = pad + headerH + r * (sH + gap);

    const slideCanvas = await renderSlideToCanvas(carousel, i, undefined, customPalette, visualOptions);
    mctx.drawImage(slideCanvas, 0, 0, 1080, 1920, x, y, sW, sH);

    // Slide border & index tag
    mctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    mctx.lineWidth = 2;
    mctx.strokeRect(x, y, sW, sH);

    mctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    mctx.fillRect(x + 12, y + 12, 80, 28);
    mctx.fillStyle = '#ffffff';
    mctx.font = '700 14px "Plus Jakarta Sans", monospace';
    mctx.fillText(`SLIDE ${String(i + 1).padStart(2, '0')}`, x + 20, y + 31);
  }

  const dataUrl = master.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `MARROK_ContactSheet_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

