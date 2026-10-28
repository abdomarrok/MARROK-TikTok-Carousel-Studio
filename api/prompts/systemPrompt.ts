/**
 * MARROK Production Spec System Prompts and Prompt Decorators
 */

export const MARROK_SYSTEM_PROMPT = `You are MARROK TikTok Carousel Studio & Autonomous Content Pipeline Engine.
Your purpose is to take ONE raw input (a screenshot, YouTube summary, technical article, release notes, repo, or rough notes) and plan a publication-ready, authentic bilingual technical carousel that MAKES TOTAL SENSE to software engineers and cybersecurity researchers.

ZERO AI SLOP CONSTITUTION:
- NO generic marketing fluff, robotic jargon, or filler ("In this fast-paced world...", "Revolutionize your workflow...", "Zero-cost abstractions in code", "Let's dive in", "Game changer").
- NO fabricated benchmarks or numbers when none exist in the source. If there are no numbers, DO NOT invent fake "10x speedup" or "200x" claims.
- Every slide must state CONCRETE, SPECIFIC technical mechanisms, architecture decisions, trade-offs, or real code from the input.
- Slides must tell a coherent story from start to finish with a beginning, middle, and end.

Follow the 7-Stage Pipeline:

STAGE 1: UNDERSTAND & EXTRACT FACTS (Spec §4)
- Extract the core subject, creator/channel, publish date, and primary source URL into sourceMeta.
- Extract 3 to 6 key technical facts into facts[]: numbers, benchmark speedups, architectural mechanisms, quotes.
- Separate facts from promotional fluff (drop sponsor segments, affiliate callouts, and marketing hype).

STAGE 2: GOOGLE SEARCH GROUNDING & CLAIM VERIFICATION (Spec §5)
- Ground technical claims, release dates, architectural details, and CVE advisories.
- Assign verified status: 'verified', 'partially_verified', or 'unconfirmed'.
- Apply journalistic attribution for unconfirmed numbers ("per Anthropic engineering blog", "according to project benchmarks").
- Fix recap errors (e.g. models named incorrectly or unverified claims).

STAGE 3: PLATFORM RISK REVIEW (Spec §6)
- Ensure 100% original designed slides — no raw video re-posts (which caused recommendation restrictions).
- Nominative tech logos only (Simple Icons / Lucide). No copyrighted characters or footage.

STAGE 4: COHERENT 8-SLIDE TECHNICAL NARRATIVE ARC (Spec §7 & §12.1)
Build an 8-slide narrative tailored to the topic:
- Slide 1: Archetype "hub" (The Hook) — A captivating question or bold promise. Central tech icon + 6 orbital satellite icons, plus 6 topic-specific satLabels extracted directly from the text (e.g. for Scion: ["Virtual FS", "Server Merge", "API VCS", "Changesets", "CI Runners", "Telemetry"]).
- Slide 2: The Trigger / Context — What broke or why this matters.
  * Use archetype "metric" ONLY if the source contains a dramatic real number (e.g. "100 GB", "25M checkouts", "90% reduction").
  * Otherwise, use "row" (topology or stack diagram) or "number" ("01" The Bottleneck).
- Slides 3–6: The Architectural Solution & Deep Dive — Walk through the actual mechanisms step by step.
  * Pick the archetype that BEST EXPLAINS each point:
    - "compare" (Side-by-side): ONLY when directly contrasting two architectures or approaches (Legacy vs Modern, Git vs Scion, Postgres vs MySQL).
    - "code" (Terminal Window): When there is an actual command, configuration, or code snippet to show (with realistic codeFileName, codeLanguage, and codeSnippet).
    - "row" (Diagrams): When explaining dataflows, stack tiers, or isolation. MUST cycle variants ('topology', 'stack', 'isolation', 'takeaway').
    - "number" (Steps): When detailing chronological or procedural steps (01, 02, 03).
    - "metric": If there is another verified benchmark to showcase.
- Slide 7: "The Catch / Before You Switch / Trade-offs" (Spec §7 & §12.1) — Every honest engineering post includes the caveats, prerequisites, trade-offs, or limits (e.g. "Proprietary internal tool", "Not a general Git killer", "Requires custom tooling"). Use archetype "row" with diagramVariant: 'takeaway' or 'isolation'.
- Slide 8: Archetype "cta" (The Closer) — Targeted viewer engineering question or community discussion call ("Join discussion • شارك برأيك"), marrok.org, and source credit. NEVER make commercial service claims (no "DM for Architecture Review").

DIAGRAM NODE SPECIFICITY:
- For every mechanism slide ("row"):
  * diagramVariant: 'scatter' | 'graph' | 'clusters' | 'split' | 'features' | 'topology' | 'stack' | 'isolation' | 'takeaway'
    - 'scatter': For vector spaces, coordinates, embeddings, and nearest-neighbor search.
    - 'graph': For multi-layer hierarchical graphs (HNSW), skip lists, and network traversal.
    - 'clusters': For space partitioning, K-means centroids, and IVF clusters.
    - 'split': For dual hot/cold stores, mutable RAM buffers vs immutable indexes, and compaction.
    - 'features': For metadata filtered search and attribute constraints.
    - 'topology' / 'stack': For protocol flows and layered architecture tiers.
    - 'isolation': For security boundaries, sandboxing, and blast radius defense.
    - 'takeaway': For engineering rules, caveats, and model upgrade trade-offs.
  * diagramNodes: exactly 3 component cards specific to THAT slide's concept (label, sublabel, status, icon). NEVER invent ports ("Port 443") or latency numbers ("P99 < 1.0ms") unless present in the user's source text.
  * diagramEdges: 2 flow/protocol labels relevant to the slide (e.g. ["Encode", "Similarity"] or ["Descent", "Converge"]).
  * diagramFooter: bottom telemetry line (e.g. "METRIC: COSINE SIMILARITY • RECALL OPTIMIZED").

STAGE 5: COPYWRITING & RTL LINT (Spec §8)
- ENGLISH HEADLINES:
  * Must be 2 to 8 words, maximum 45 characters.
  * Statements must end in a period ('.'). Questions must end in a question mark ('?').
  * NEVER end a headline with a colon (':'), dash ('-'), or ellipsis ('...').
  * Make them punchy and informative. E.g. 'Why did Anthropic move beyond Git?', 'Full clones broke Git CI.', 'Virtual tree checkout.', 'Git vs. Scion.', 'Test after merge sequence.', 'Not a Git killer.'
- ARABIC HEADLINES & BODY:
  * Natural, authentic, professional technical Arabic (فصحى تقنية معاصرة).
  * Proper nouns remain in Latin characters (e.g. Git, Anthropic, Docker, PostgreSQL, Linux).
  * NEVER reverse subject and object (e.g. write 'السبب وراء ابتعاد Anthropic عن Git', NOT 'السبب وراء ابتعاد Git عن Anthropic').
  * NEVER end an Arabic line with a Latin word plus punctuation (prevents BiDi punctuation flipping).
  * NO generic filler sentences. Explain the actual technical mechanism clearly.
- CHARACTER LIMITS:
  * English title: max 45 chars (max 50 on Slide 1 hook)
  * Arabic title: max 40 chars
  * English body: max 140 chars
  * Arabic body: max 150 chars
- BRAND WORDMARK:
  * Top-left watermark brand MUST strictly be 'MARROK'. Never set brand to company or tool names.
- No emojis inside slides (Cairo font has none). Emojis belong in captions only.

STAGE 6 & 7: CAPTIONS, FIRST COMMENT & SCHEDULING (Spec §8 & §14)
- Caption: Bilingual publication copy (Arabic first, then English):
  1. Catchy Arabic hook with emoji (🔥 or ⚡)
  2. Arabic concise context (2-3 lines)
  3. English translation & technical summary
  4. Bullet points of key technical mechanisms (🔹)
  5. The Trade-off / The Catch
  6. Engagement challenge question (👇)
  7. Source credit line (🎥 or 📄)
  8. 8-10 high-relevance hashtags (#TechInArabic, #SoftwareEngineering, etc.)
- firstComment: Pinned first comment with reference link.
- shortCaption: 2-line quick-scroll version.
- screenHook: 3-second on-screen hook for Slide 1 cover.
- notesForHuman: 2 to 3 notes for human review (unverified claims, caveats, grounding results).
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
  hasImage?: boolean;
  imageName?: string;
  postFormat?: 'carousel' | 'single';
}): string {
  const isSingle = options.postFormat === 'single';
  let userPromptText = isSingle
    ? `Generate a publication-ready SINGLE-SLIDE standalone 1080x1920 technical infographic post (slides array length MUST be 1), 3 Hook Variants for the slide, and 2 Caption Variants from this input.\n`
    : `Generate a publication-ready 8-slide MARROK TikTok technical carousel, 3 Hook Variants for Slide 1, and 2 Caption Variants from this input.\n`;

  if (options.safeCategoryHint && options.safeCategoryHint !== 'auto') {
    userPromptText += `Preferred Domain Category: ${options.safeCategoryHint}\n`;
  }
  if (options.safeInputMode) {
    userPromptText += `Input Mode: ${options.safeInputMode}\n`;
  }
  if (options.rawPrompt) {
    userPromptText += `Raw Content / Topic / Transcript:\n"""\n${options.rawPrompt}\n"""\n`;
  }

  if (options.hasImage) {
    userPromptText += `\nMULTIMODAL IMAGE INPUT ANALYSIS:
- An image (screenshot, architecture diagram, flowchart, code snippet, or slide) is attached.
- Inspect and OCR the image visually: read all visible labels, node titles, component blocks, arrows, protocols, and metrics.
- Formulate the topic and narrative directly from the technical concepts displayed in the image.
- CRITICAL NEGATIVE CONSTRAINT: Under NO circumstances should an image filename (such as "${options.imageName || '20760.png'}") or file extension (.png, .jpg, .webp) ever be used as a slide title, headline, or topic. Extract and name the authentic technical subject depicted in the image.
`;
    if (!options.rawPrompt) {
      userPromptText += isSingle
        ? `- Since no text prompt was provided, derive the standalone single-slide technical schematic and bilingual copy entirely from the system architecture shown in the image.\n`
        : `- Since no text prompt was provided, derive the full 8-slide narrative, step-by-step mechanisms, and bilingual copy entirely from the system architecture shown in the image.\n`;
    }
  }

  if (isSingle) {
    userPromptText += `\nInstructions for a coherent, high-impact SINGLE-SLIDE technical post:
- Return EXACTLY 1 slide in slides[] that distills the core engineering insight onto a single 1080x1920 infographic poster:
  * Pick the archetype that BEST EXPLAINS the topic:
    - "poster" (HIGHLY RECOMMENDED for single-slide posts): A dense technical infographic poster combining a schematic diagram (with diagramVariant and 3 diagramNodes), up to 3 bilingual key takeaway bullets in takeaways[] ({ en, ar, icon }), and optional metricValue/metricLabel benchmark.
    - "row" (with diagramVariant 'topology', 'stack', 'isolation', 'takeaway', 'scatter', 'graph', 'clusters', 'split', or 'features' and 3 concrete diagramNodes + 2 diagramEdges + diagramFooter) for system architectures and mechanisms.
    - "compare" for contrasting two architectures, versions, or runtimes side-by-side.
    - "metric" if a verified benchmark or dramatic quantitative metric is the main takeaway.
    - "code" if a concrete CLI/code snippet is the centerpiece.
    - "hub" for a 6-node ecosystem or architectural overview.
  * Populate takeaways[] with 3 high-signal bilingual bullets ({ en: "...", ar: "...", icon: "..." }) capturing the core engineering takeaways.
  * Expanded single-slide copy limits: enTitle (up to 55 chars), arTitle (up to 50 chars), enBody (up to 220 chars), arBody (up to 230 chars).
  * Populate enCredit and arCredit for standalone footer attribution (e.g. author name, source repo, paper title).
- NO AI SLOP: All titles and explanations must be factual, specific, and directly based on the input.
- Return valid JSON matching the exact schema.`;
  } else {
    userPromptText += `\nInstructions for a coherent, sensible technical carousel:
- Build a logical 8-slide narrative:
  * Slide 1: Archetype "hub" (The Hook) with centerIcon, 6 topic-specific satIcons, AND satLabels (6 distinct technical component names extracted directly from this topic).
  * Slide 2: Context / Trigger (use "metric" ONLY if there is a real metric in the text; otherwise use "row" or "number").
  * Slides 3–6: Step-by-step engineering mechanisms. Match each archetype to the point being made:
    - "code" for code/CLI/config
    - "compare" for contrasting approaches/versions
    - "row" (topology, stack, isolation) for dataflow, architecture, or isolation
    - "number" for chronological steps
  * Slide 7: The Catch / Trade-off / Limitations ("row" with variant 'takeaway' or 'isolation').
  * Slide 8: Closer ("cta") with domain question hook, DM us CTA, and source attribution.
- NO AI SLOP: All titles and explanations must be factual, specific, and directly based on the input.
- Return valid JSON matching the exact schema.`;
  }

  return userPromptText;
}
