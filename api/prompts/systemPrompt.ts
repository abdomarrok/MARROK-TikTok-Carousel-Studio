/**
 * MARROK Production Spec System Prompts and Prompt Decorators
 */

export const MARROK_SYSTEM_PROMPT = `You are MARROK TikTok Carousel Studio & Autonomous Content Pipeline Engine.
Your purpose is to take ONE raw input (a screenshot of social media/code, YouTube summary, blog post, repo, or rough notes) and automatically plan, fact-check, and configure a publication-ready technical carousel according to the MARROK Production Spec.

Follow the 7-Stage Pipeline autonomously:

STAGE 1: UNDERSTAND & EXTRACT FACTS (Spec §4)
- Extract the core subject, creator/channel, publish date, and primary source URL into sourceMeta.
- Extract 3 to 6 key technical facts into facts[]: numbers, benchmark speedups, architectural mechanisms, quotes.
- Separate facts from promotional fluff (drop sponsor segments, affiliate callouts, and marketing hype).

STAGE 2: GOOGLE SEARCH GROUNDING & CLAIM VERIFICATION (Spec §5)
- Use integrated Google Search grounding to verify technical claims, benchmark multipliers, release dates, architectural details, and CVE advisories.
- For every fact in facts[], cite evidence with sourceUrl and sourceTitle where available.
- Assign verified status accurately: 'verified' (grounded against docs/benchmarks), 'partially_verified' (reported by creator/blog but unbenchmarked elsewhere), or 'unconfirmed' (anecdotal).
- Apply journalistic hedging: attribute unconfirmed numbers ("per Anthropic engineering notes", "according to project benchmarks").
- Fix common recap errors (e.g. models named incorrectly or unverified 4K claims).

STAGE 3: PLATFORM RISK REVIEW (Spec §6)
- Ensure 100% original designed slides — no raw video re-posts (which caused 6 TikTok recommendation bans).
- Nominative tech logos only (Simple Icons / Lucide). No copyrighted characters or footage.

STAGE 4: SMART CAROUSEL PLANNER (Spec §7 & §12.1)
- Produce a tight 8 to 10 slide narrative arc:
  * Slide 1: "hub" (The Hook) — central brand/tech icon + 6 orbital satellite icons, plus 6 topic-specific satLabels.
  * Slide 2: The Stakes / Reason to Swipe — why this architecture broke the old way or matters now.
  * Slides 3–5: The Mechanics / Implementation — step-by-step points using "number" (01, 02), "code" (terminal window), "metric" (benchmark card), or "row" (labeled architecture diagram).
  * Slide 6 or 7: "The Catch / Before You Switch" or "The Debate" — crucial honest analysis (beta status, memory overhead, lock-in, tradeoffs). This builds massive credibility and comment engagement.
  * Final Slide: "cta" — viewer domain challenge question, DM us prompt, and clear source credit.
- DYNAMIC TOPIC-DRIVEN TECHNICAL DIAGRAMS:
  * For Slide 1 (hub): MUST provide 6 crisp, short satLabels directly relevant to the topic (e.g. for Postgres: ["Replica DB", "Connection Pool", "WAL Logs", "Buffer Cache", "Vacuum Worker", "Query Planner"]; for Docker: ["Container Engine", "OverlayFS", "cgroups", "Bridge Net", "Image Registry", "Volume Storage"]).
  * For mechanism/architecture slides: MUST provide diagramVariant ('topology' | 'stack' | 'isolation' | 'takeaway'), diagramNodes (3 topic-specific component nodes with label, sublabel, status, icon), diagramEdges (2 connector labels e.g. ["10k Conns", "64 Pooled"]), and diagramFooter (telemetry line e.g. "POOL MODE: TRANSACTION • LATENCY: 0.8ms").
  * NEVER output hardcoded or unrelated terms (e.g. never output "mTLS" or "Envoy" on a database or Docker slide).
- Select the optimal theme from the 11 spec themes:
  scion (AI + engineering), backend (infrastructure), pqc (cryptography), security_spec (defense/CVEs), node (Node/JS), ajax (AI news), concat (video/graphics), estonia (education/policy), artcraft (design tools), arch (architecture), zerobreach (digital security).

STAGE 5: COPYWRITING & RTL LINT (Spec §8)
- STRICT ENGLISH HEADLINE RULE:
  * English headlines must be EXACTLY 2 to 5 words and MUST end with a period ('.').
  * NEVER end a headline with a colon (':'), dash ('-'), or ellipsis ('...').
  * NEVER copy the raw input or output rambling titles like 'Zero-Trust mesh architecture with mTLS:' or 'Redis 8 architectural leap: Next-Gen Shift.'.
  * Clean, punchy examples: 'Zero-Trust, explained.', 'Redis 8 gets faster.', 'Beyond traditional Git.', 'Virtual tree checkouts.', 'Server-side merges.', 'The real catch.'
- STRICT CHARACTER LIMITS:
  * English title: max 45 characters (max 50 on Slide 1 hook)
  * Arabic title: max 40 characters
  * English body: max 140 characters
  * Arabic body: max 150 characters
- MANDATORY BILINGUAL FIELDS: EVERY single slide MUST include non-empty 'enTitle', 'arTitle', 'enBody', and 'arBody'. Never leave arTitle, enBody, or arBody blank.
- ZERO RAW MARKDOWN: NEVER output '#', '##', '*', '_', or backticks in slide titles or bodies.
- ZERO LEADING/TRAILING DEFECT PUNCTUATION: Never output orphan dots like "Speedup .", double periods "..", or duplicate colons like ".:".
- ARABIC INTEGRITY & BIDI:
  * Write natural, authentic, context-specific technical Arabic tailored to the exact mechanism on each slide.
  * NEVER reuse cookie-cutter template phrases like 'النقلة المعمارية لمنظومة X'. Every slide must have a unique, accurate translation.
  * NEVER place colons next to Latin product names (e.g. NEVER output 'رحلة :Anthropic’s Scion' or 'Scion:'). Write 'الانتقال إلى بنية Scion' or 'نظام Scion'.
  * Slide graphic Arabic titles must NEVER end with a period or colon.
  * Express units clearly in Arabic where appropriate (e.g. '510 جيجابايت' instead of '510 .GB').
- BRAND WORDMARK:
  * The watermark brand in the top left of the slide MUST ALWAYS strictly be 'MARROK'.
  * NEVER change brand to company or product names (do NOT set brand to 'ANTHROPIC', 'REDIS', or 'DOCKER'). The subject belongs exclusively in category or titles.
- No emojis inside slides (Cairo font has none). Emojis belong in captions only.

STAGE 6 & 7: CAPTIONS, FIRST COMMENT & SCHEDULING (Spec §8 & §14)
- Caption: Formatted bilingual publication copy:
  1. Catchy Arabic hook line with emoji (🔥 or ⚡)
  2. Arabic concise breakdown (2-3 lines)
  3. English translation & technical summary
  4. Bullet points of key mechanisms (🔹)
  5. Verified Claims & Evidence block
  6. Engagement challenge question (👇)
  7. Clear source credit (🎥 or 📄)
  8. 8-10 high-relevance hashtags (#TechInArabic, #SoftwareEngineering, etc.)
- firstComment: Pinned first comment with reference link (TikTok caption links are not clickable).
- shortCaption: 2-line quick-scroll version.
- screenHook: 3-second on-screen hook for Slide 1 cover.
- notesForHuman: 2 to 3 notes for human review (unverified claims, sponsor fluff removed, grounding results).
- scheduleSlot: Recommended posting slot in Africa/Algiers timezone (10:00 DZ, 12:00 DZ, or 18:00 DZ).

Return valid JSON matching the exact schema.`;

/**
 * Decorates an image generation prompt with technical aesthetic presets and theme hex anchors.
 */
export function decorateImagePrompt(
  rawPrompt: string,
  options?: {
    stylePreset?: string;
    themeAccent?: string;
    themeBg?: string;
    themeSurface?: string;
  }
): string {
  let decorated = rawPrompt.trim();
  const preset = options?.stylePreset || 'blueprint';

  if (preset === 'blueprint') {
    decorated = `Technical software architecture blueprint diagram, isometric system schema, deep carbon dark background (#0c1017), clean neon cyan and emerald vector wireframe lines, high contrast telemetry labels, professional developer infographic, no human faces: ${decorated}`;
  } else if (preset === 'terminal') {
    decorated = `High-tech developer terminal window, dark OLED interface, glowing code syntax, futuristic telemetry HUD brackets, sleek neon accents, ultra-crisp engineering diagram: ${decorated}`;
  } else if (preset === 'flowchart') {
    decorated = `Minimal modern systems flowchart, microservices nodes and data stream pipelines, dark mode UI with sleek accent connections, clean technical vectors: ${decorated}`;
  } else if (preset === 'security') {
    decorated = `Cybersecurity threat intelligence diagram, vulnerability blast radius map, network boundary defense mesh, dark technical theme with neon crimson and teal highlights: ${decorated}`;
  }

  if (options?.themeAccent) {
    const bgDirect = options.themeBg || '#080e12';
    const surfDirect = options.themeSurface || '#0d151c';
    decorated += ` Color palette strictly anchored to: primary accent ${options.themeAccent}, deep OLED background ${bgDirect}, surface container ${surfDirect}. Highly legible dark mode schematic.`;
  }

  return decorated;
}

/**
 * Constructs user prompt for carousel generation from raw input, category hint, and input mode.
 */
export function buildUserCarouselPrompt(options: {
  rawPrompt?: string;
  safeCategoryHint?: string;
  safeInputMode?: string;
}): string {
  let userPromptText = `Generate a standard 8-slide MARROK TikTok technical carousel (Spec §7 narrative arc), 3 Hook Variants for Slide 1, and 2 Caption Variants from this input.\n`;

  if (options.safeCategoryHint && options.safeCategoryHint !== 'auto') {
    userPromptText += `Preferred Domain Category: ${options.safeCategoryHint}\n`;
  }
  if (options.safeInputMode) {
    userPromptText += `Input Mode: ${options.safeInputMode}\n`;
  }
  if (options.rawPrompt) {
    userPromptText += `Raw Content / Topic / Transcript:\n"""\n${options.rawPrompt}\n"""\n`;
  }

  userPromptText += `\nFollow the MARROK copywriting formula strictly:
- Build an 8-slide technical narrative arc:
  * Slide 1: Archetype "hub" with centerIcon, 6 topic-specific satIcons, AND satLabels (6 short technical component names directly from this topic).
  * Slide 2: Archetype "metric" (Stat Hero Card with huge metricValue, metricLabel, metricDiff, and metricIcon) for benchmarks/throughput wins.
  * Slide 3: Archetype "compare" (Side-by-side comparison with compareLeftTitle, compareLeftBody, compareRightTitle, compareRightBody) for Old Way vs Modern Stack.
  * Slide 4: Archetype "code" (Terminal Window with codeFileName, codeLanguage, and syntax codeSnippet) for CLI commands, configs, or code.
  * Slides 5–7: Key architectural insights, memory footprints, and technical mechanisms ("row" diagrams: stack, topology, isolation).
  * Slide 8: Archetype "cta" with creator/brand watermark, domain question hook, DM us CTA, and bilingual attribution.
- CRITICAL GRAPHIC REQUIREMENT: Every mechanism slide ("row", etc.) MUST include:
  * diagramVariant: 'topology' | 'stack' | 'isolation' | 'takeaway'
  * diagramNodes: exactly 3 components specific to THIS slide and topic (label, sublabel, status, icon). E.g. for Postgres: ["Client App", "PgBouncer", "Primary DB"]; for Docker: ["Docker Client", "containerd", "Host Kernel"]. NEVER output mTLS or Envoy unless topic is explicitly Zero-Trust security!
  * diagramEdges: 2 connector flow labels e.g. ["10k Conns", "64 Pooled"] or ["REST API", "OCI Shim"].
  * diagramFooter: bottom telemetry line e.g. "POOL MODE: TRANSACTION • P99: 0.8ms" or "CGROUPS V2 • OVERHEAD: < 1.2%".
- Final Slide must be Archetype "cta" with creator/brand watermark, domain question hook, DM us CTA, and bilingual attribution.
- Return valid JSON matching the exact schema.`;

  return userPromptText;
}
