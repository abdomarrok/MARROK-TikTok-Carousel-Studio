/**
 * Canvas Dimensions & Safe Zone Constants (1080x1920 9:16 Vertical Video)
 * Spec §9: TikTok safe zone rules:
 * - Top header safe area: y >= 112px
 * - Right safe margin: x <= 945px (clearing native TikTok interaction icons)
 * - Left safe margin: x >= 90px
 * - Bottom safe zone: y <= 1840px (clearing bottom captions and sound titles)
 * - Optical text ceiling: y <= 1710px
 */
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

export const SAFE_MARGIN_LEFT = 90;
export const SAFE_MARGIN_RIGHT = 945;
export const SAFE_CONTENT_WIDTH = SAFE_MARGIN_RIGHT - SAFE_MARGIN_LEFT;
export const SAFE_CONTENT_CENTER_X = (SAFE_MARGIN_LEFT + SAFE_MARGIN_RIGHT) / 2;
export const SAFE_TEXT_WIDTH_TITLE = 850;
export const SAFE_TEXT_WIDTH_BODY = 820;
export const SAFE_TEXT_CENTER_X = 518;

export const SAFE_HEADER_Y = 112;
export const SAFE_FOOTER_CEILING_Y = 1710;
export const SAFE_MAX_Y = 1840;
export const PAGINATION_DOT_Y = 1826;

export const GRID_SPACING = 108;
export const GRID_LINE_WIDTH = 2;

export const FONT_TITLE_EN = '"Plus Jakarta Sans", sans-serif';
export const FONT_TITLE_AR = '"Cairo", sans-serif';
export const FONT_BODY_EN = '"Plus Jakarta Sans", sans-serif';
export const FONT_BODY_AR = '"Cairo", sans-serif';
export const FONT_MONO = '"JetBrains Mono", monospace';
