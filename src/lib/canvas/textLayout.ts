export interface FitTextOptions {
  maxLines?: number;
  minFontSize?: number;
  lineHeightFactor?: number;
  ellipsis?: boolean;
}

/**
 * Wraps text to fit within maxWidth, respecting newlines,
 * preserving NBSP-bound metrics (e.g., "510 GB", "10 ms"),
 * preventing orphan Latin tokens in Arabic, and applying typographic orphan prevention.
 */
export function wrapTextLines(
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
      const candidateWord = prevWords[prevWords.length - 1];
      const candidateLastLine = `${candidateWord} ${lastLine}`;
      if (ctx.measureText(candidateLastLine).width <= maxWidth) {
        prevWords.pop();
        lines[lines.length - 2] = prevWords.join(' ');
        lines[lines.length - 1] = candidateLastLine;
      }
    }
  }

  return lines;
}

/**
 * Self-healing typography helper:
 * Measures text width and dynamically scales font size down (to minFontSize) or smart-wraps to maxLines,
 * ensuring pills, badges, node cards, and comparison columns never clip or overflow.
 */
export function fitTextInBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialFontSize: number,
  fontFamily: string,
  fontWeight: string | number = '700',
  options: FitTextOptions = {}
): { fontSize: number; lines: string[]; lineHeight: number } {
  const { maxLines = 1, minFontSize = 9, lineHeightFactor = 1.25, ellipsis = true } = options;
  if (!text) {
    return { fontSize: initialFontSize, lines: [], lineHeight: initialFontSize * lineHeightFactor };
  }

  const cleanText = text.trim();
  let currentSize = initialFontSize;

  if (maxLines === 1) {
    while (currentSize >= minFontSize) {
      ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
      const width = ctx.measureText(cleanText).width;
      if (width <= maxWidth) {
        return { fontSize: currentSize, lines: [cleanText], lineHeight: currentSize * lineHeightFactor };
      }
      currentSize -= 0.5;
    }

    // If still overflows at minFontSize, truncate with ellipsis
    ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
    let truncated = cleanText;
    if (ellipsis) {
      while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
        truncated = truncated.slice(0, -1);
      }
      truncated += '…';
    }
    return { fontSize: minFontSize, lines: [truncated], lineHeight: minFontSize * lineHeightFactor };
  }

  // Multi-line wrap with font-size scale down if needed
  while (currentSize >= minFontSize) {
    ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
    const wrapped = wrapTextLines(ctx, cleanText, maxWidth);
    if (wrapped.length <= maxLines) {
      return { fontSize: currentSize, lines: wrapped, lineHeight: currentSize * lineHeightFactor };
    }
    currentSize -= 1;
  }

  // Truncate to maxLines with ellipsis on final line
  ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
  const wrapped = wrapTextLines(ctx, cleanText, maxWidth).slice(0, maxLines);
  if (wrapped.length === maxLines && ellipsis) {
    let last = wrapped[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
      last = last.slice(0, -1);
    }
    wrapped[maxLines - 1] = last + '…';
  }
  return { fontSize: minFontSize, lines: wrapped, lineHeight: minFontSize * lineHeightFactor };
}
