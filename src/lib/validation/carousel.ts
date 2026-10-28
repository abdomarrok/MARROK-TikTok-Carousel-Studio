import type {
  CaptionVariant,
  CarouselData,
  DiagramNode,
  DiagramVariant,
  ExtractedFact,
  GroundingSource,
  HookVariant,
  IconLabelPair,
  PostSourceMeta,
  SlideData,
  SlideType,
  VisualSystemOptions,
} from '../../types.ts';

const SLIDE_TYPES: SlideType[] = ['hub', 'row', 'number', 'metric', 'code', 'compare', 'image', 'cta'];
const DIAGRAM_VARIANTS: DiagramVariant[] = [
  'topology',
  'stack',
  'isolation',
  'takeaway',
  'scatter',
  'graph',
  'clusters',
  'split',
  'features',
];
const IMAGE_FITS: Array<NonNullable<SlideData['imageFit']>> = ['contain', 'cover'];
const IMAGE_FILTERS: Array<NonNullable<SlideData['imageFilter']>> = ['hud', 'invert', 'tint', 'clean'];
const FACT_TYPES: ExtractedFact['type'][] = ['number', 'date', 'name', 'quote', 'claim'];
const FACT_STATUSES: ExtractedFact['verified'][] = [
  'verified',
  'partially_verified',
  'unconfirmed',
  'unverified',
];

const DEFAULT_MAX_SLIDES = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
  maxLength = 4000
): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean);
  return strings.length > 0 ? strings.slice(0, maxItems) : undefined;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function parseIconPairs(value: unknown): IconLabelPair[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const pairs: IconLabelPair[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const icon = readString(item, 'icon', 500);
    const label = readString(item, 'label', 80);
    if (icon && label) pairs.push({ icon, label });
  }
  return pairs.length > 0 ? pairs.slice(0, 12) : undefined;
}

function parseDiagramNodes(value: unknown): DiagramNode[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const nodes: DiagramNode[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const label = readString(item, 'label', 120);
    if (!label) continue;
    const node: DiagramNode = { label };
    const sublabel = readString(item, 'sublabel', 160);
    const status = readString(item, 'status', 80);
    const icon = readString(item, 'icon', 500);
    if (sublabel) node.sublabel = sublabel;
    if (status) node.status = status;
    if (icon) node.icon = icon;
    nodes.push(node);
  }
  return nodes.length > 0 ? nodes.slice(0, 12) : undefined;
}

function parseSlide(
  value: unknown,
  index: number,
  total: number,
  requireContent: boolean
): SlideData | null {
  if (!isRecord(value)) return null;

  let type = readEnum(value.type, SLIDE_TYPES);
  if (!type) {
    if (index === 0) type = 'hub';
    else if (index === total - 1) type = 'cta';
    else type = 'row';
  }

  const slide: SlideData = { type };

  const stringFields: Array<[keyof SlideData, string, number]> = [
    ['centerIcon', 'centerIcon', 500],
    ['centerTag', 'centerTag', 80],
    ['diagramFooter', 'diagramFooter', 240],
    ['stepNumber', 'stepNumber', 16],
    ['stepLabel', 'stepLabel', 40],
    ['metricValue', 'metricValue', 40],
    ['metricLabel', 'metricLabel', 80],
    ['metricDiff', 'metricDiff', 120],
    ['metricIcon', 'metricIcon', 500],
    ['codeSnippet', 'codeSnippet', 6000],
    ['codeLanguage', 'codeLanguage', 40],
    ['codeFileName', 'codeFileName', 100],
    ['compareLeftTitle', 'compareLeftTitle', 100],
    ['compareLeftBody', 'compareLeftBody', 800],
    ['compareRightTitle', 'compareRightTitle', 100],
    ['compareRightBody', 'compareRightBody', 800],
    ['imageUrl', 'imageUrl', 2_500_000],
    ['imageCaption', 'imageCaption', 160],
    ['imagePrompt', 'imagePrompt', 4000],
    ['imageModel', 'imageModel', 120],
    ['enTitle', 'enTitle', 500],
    ['arTitle', 'arTitle', 500],
    ['enBody', 'enBody', 1200],
    ['arBody', 'arBody', 1200],
    ['ctaText', 'ctaText', 160],
    ['url', 'url', 500],
    ['enCredit', 'enCredit', 200],
    ['arCredit', 'arCredit', 200],
  ];

  for (const [target, source, maxLength] of stringFields) {
    const parsed = readString(value, source, maxLength);
    if (parsed !== undefined) {
      (slide as unknown as Record<string, unknown>)[target as string] = parsed;
    }
  }

  const satIcons = readStringArray(value.satIcons, 12, 500);
  const satLabels = readStringArray(value.satLabels, 12, 80);
  const diagramEdges = readStringArray(value.diagramEdges, 8, 120);
  const icons = parseIconPairs(value.icons);
  const diagramNodes = parseDiagramNodes(value.diagramNodes);
  const diagramVariant = readEnum(value.diagramVariant, DIAGRAM_VARIANTS);
  const imageFit = readEnum(value.imageFit, IMAGE_FITS);
  const imageFilter = readEnum(value.imageFilter, IMAGE_FILTERS);

  if (satIcons) slide.satIcons = satIcons;
  if (satLabels) slide.satLabels = satLabels;
  if (diagramEdges) slide.diagramEdges = diagramEdges;
  if (icons) slide.icons = icons;
  if (diagramNodes) slide.diagramNodes = diagramNodes;
  if (diagramVariant) slide.diagramVariant = diagramVariant;
  if (imageFit) slide.imageFit = imageFit;
  if (imageFilter) slide.imageFilter = imageFilter;

  if (requireContent) {
    const hasText = [
      slide.enTitle,
      slide.arTitle,
      slide.enBody,
      slide.arBody,
      slide.codeSnippet,
      slide.metricValue,
      slide.compareLeftTitle,
      slide.compareRightTitle,
      slide.imageUrl,
      slide.ctaText,
      slide.diagramFooter,
    ].some((text) => typeof text === 'string' && text.trim().length > 0);
    const hasNodes = (slide.diagramNodes?.length ?? 0) > 0 || (slide.icons?.length ?? 0) > 0;
    if (!hasText && !hasNodes) return null;
  }

  return slide;
}

function parseGroundingSources(value: unknown): GroundingSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources: GroundingSource[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const title = readString(item, 'title', 300);
    const url = readString(item, 'url', 1000);
    if (title && url) sources.push({ title, url });
  }
  return sources.length > 0 ? sources.slice(0, 20) : undefined;
}

function parseSourceMeta(value: unknown): PostSourceMeta | undefined {
  if (!isRecord(value)) return undefined;

  const meta: PostSourceMeta = {};
  const type = readEnum(value.type, ['article', 'screenshot', 'youtube', 'notes'] as const);
  const engine = readEnum(value.engine, [
    'grounded',
    'ungrounded',
    'offline',
    'gemini-ai',
    'offline-synthesizer',
  ] as const);
  const status = readEnum(value.status, ['verified_live', 'unverified_draft'] as const);

  const title = readString(value, 'title', 500);
  const creator = readString(value, 'creator', 200);
  const channel = readString(value, 'channel', 200);
  const url = readString(value, 'url', 1000);
  const published = readString(value, 'published', 100);
  const model = readString(value, 'model', 120);
  const groundingQueries = readStringArray(value.groundingQueries, 20, 300);
  const groundingSources = parseGroundingSources(value.groundingSources);
  const isSearchGrounded = readBoolean(value, 'isSearchGrounded');
  const isFallback = readBoolean(value, 'isFallback');
  const userReviewed = readBoolean(value, 'userReviewed');

  if (type) meta.type = type;
  if (title) meta.title = title;
  if (creator) meta.creator = creator;
  if (channel) meta.channel = channel;
  if (url) meta.url = url;
  if (published) meta.published = published;
  if (groundingQueries) meta.groundingQueries = groundingQueries;
  if (groundingSources) meta.groundingSources = groundingSources;
  if (isSearchGrounded !== undefined) meta.isSearchGrounded = isSearchGrounded;
  if (isFallback !== undefined) meta.isFallback = isFallback;
  if (engine) meta.engine = engine;
  if (model) meta.model = model;
  if (status) meta.status = status;
  if (userReviewed !== undefined) meta.userReviewed = userReviewed;

  return Object.keys(meta).length > 0 ? meta : undefined;
}

function parseFacts(value: unknown): ExtractedFact[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const facts: ExtractedFact[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const text = readString(item, 'text', 1000);
    if (!text) continue;
    const fact: ExtractedFact = {
      text,
      type: readEnum(item.type, FACT_TYPES) ?? 'claim',
      verified: readEnum(item.verified, FACT_STATUSES) ?? 'unverified',
    };
    const evidence = readString(item, 'evidence', 1000);
    const sourceUrl = readString(item, 'sourceUrl', 1000);
    const sourceTitle = readString(item, 'sourceTitle', 300);
    if (evidence) fact.evidence = evidence;
    if (sourceUrl) fact.sourceUrl = sourceUrl;
    if (sourceTitle) fact.sourceTitle = sourceTitle;
    facts.push(fact);
  }
  return facts.length > 0 ? facts.slice(0, 30) : undefined;
}

function parseCaptionVariants(value: unknown): CaptionVariant[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const variants: CaptionVariant[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const style = readString(item, 'style', 200);
    const caption = readString(item, 'caption', 10_000);
    if (style && caption) variants.push({ style, caption });
  }
  return variants.length > 0 ? variants.slice(0, 10) : undefined;
}

function parseHookVariants(value: unknown): HookVariant[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const variants: HookVariant[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const tag = readString(item, 'tag', 100);
    const enTitle = readString(item, 'enTitle', 500);
    const arTitle = readString(item, 'arTitle', 500);
    const enBody = readString(item, 'enBody', 1200);
    const arBody = readString(item, 'arBody', 1200);
    if (!tag || !enTitle || !arTitle || !enBody || !arBody) continue;
    const variant: HookVariant = { tag, enTitle, arTitle, enBody, arBody };
    const centerIcon = readString(item, 'centerIcon', 500);
    if (centerIcon) variant.centerIcon = centerIcon;
    variants.push(variant);
  }
  return variants.length > 0 ? variants.slice(0, 10) : undefined;
}

function parseVisualOptions(value: unknown): VisualSystemOptions | undefined {
  if (!isRecord(value)) return undefined;
  const options: VisualSystemOptions = {};
  const showCadReticles = readBoolean(value, 'showCadReticles');
  const showSparklines = readBoolean(value, 'showSparklines');
  const terminalScanlines = readBoolean(value, 'terminalScanlines');
  if (showCadReticles !== undefined) options.showCadReticles = showCadReticles;
  if (showSparklines !== undefined) options.showSparklines = showSparklines;
  if (terminalScanlines !== undefined) options.terminalScanlines = terminalScanlines;
  return Object.keys(options).length > 0 ? options : undefined;
}

export interface ParseCarouselOptions {
  minSlides?: number;
  maxSlides?: number;
  requireSlideContent?: boolean;
}

/**
 * Runtime boundary parser for carousel payloads from Gemini, localStorage, and fallbacks.
 * Rejects malformed cores (non-object root, missing/empty slides) and normalizes every
 * optional field to a known-safe shape instead of trusting model or storage JSON.
 */
export function parseCarouselData(
  value: unknown,
  options: ParseCarouselOptions = {}
): CarouselData | null {
  const minSlides = Math.max(1, options.minSlides ?? 1);
  const maxSlides = Math.max(minSlides, options.maxSlides ?? DEFAULT_MAX_SLIDES);

  if (!isRecord(value)) return null;
  if (!Array.isArray(value.slides)) return null;
  if (value.slides.length < minSlides || value.slides.length > maxSlides) return null;

  const slides: SlideData[] = [];
  for (let index = 0; index < value.slides.length; index += 1) {
    const parsed = parseSlide(
      value.slides[index],
      index,
      value.slides.length,
      options.requireSlideContent ?? false
    );
    if (!parsed) return null;
    slides.push(parsed);
  }

  const carousel: CarouselData = {
    theme: readString(value, 'theme', 80) || 'teal',
    category: readString(value, 'category', 200) || 'SYSTEMS ARCHITECTURE',
    caption: readString(value, 'caption', 20_000) || '',
    slides,
  };

  const id = readString(value, 'id', 200);
  const brand = readString(value, 'brand', 100);
  const brandUrl = readString(value, 'brandUrl', 500);
  const channel = readString(value, 'channel', 200);
  const firstComment = readString(value, 'firstComment', 5000);
  const shortCaption = readString(value, 'shortCaption', 3000);
  const screenHook = readString(value, 'screenHook', 1000);
  const scheduleSlot = readString(value, 'scheduleSlot', 300);
  const sourceMeta = parseSourceMeta(value.sourceMeta);
  const facts = parseFacts(value.facts);
  const notesForHuman = readStringArray(value.notesForHuman, 20, 1000);
  const captionVariants = parseCaptionVariants(value.captionVariants);
  const hookVariants = parseHookVariants(value.hookVariants);
  const visualOptions = parseVisualOptions(value.visualOptions);

  if (id) carousel.id = id;
  if (brand) carousel.brand = brand;
  if (brandUrl) carousel.brandUrl = brandUrl;
  if (channel) carousel.channel = channel;
  if (firstComment) carousel.firstComment = firstComment;
  if (shortCaption) carousel.shortCaption = shortCaption;
  if (screenHook) carousel.screenHook = screenHook;
  if (scheduleSlot) carousel.scheduleSlot = scheduleSlot;
  if (sourceMeta) carousel.sourceMeta = sourceMeta;
  if (facts) carousel.facts = facts;
  if (notesForHuman) carousel.notesForHuman = notesForHuman;
  if (captionVariants) carousel.captionVariants = captionVariants;
  if (hookVariants) carousel.hookVariants = hookVariants;
  if (visualOptions) carousel.visualOptions = visualOptions;

  return carousel;
}
