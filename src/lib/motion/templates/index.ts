import { MotionTemplateId, MotionTemplateConfig } from '../../../types.ts';
import { MotionTemplateDefinition } from '../base.ts';
import { marrokSlidesTemplate } from './marrokSlides.ts';
import { kineticTextTemplate } from './kineticText.ts';
import { brandIntroTemplate } from './brandIntro.ts';
import { productShowcaseTemplate } from './productShowcase.ts';

export const MOTION_TEMPLATES: Record<MotionTemplateId, MotionTemplateDefinition> = {
  'marrok-slides': marrokSlidesTemplate,
  'kinetic-text': kineticTextTemplate,
  'brand-intro': brandIntroTemplate,
  'product-showcase': productShowcaseTemplate,
};

export const MOTION_TEMPLATE_LIST: MotionTemplateDefinition[] = [
  marrokSlidesTemplate,
  kineticTextTemplate,
  brandIntroTemplate,
  productShowcaseTemplate,
];

export function getMotionTemplate(id: MotionTemplateId): MotionTemplateDefinition {
  return MOTION_TEMPLATES[id] || marrokSlidesTemplate;
}

export function drawMotionReelFrame(
  ctx: CanvasRenderingContext2D,
  templateId: MotionTemplateId,
  config: MotionTemplateConfig,
  t: number
): void {
  const tpl = getMotionTemplate(templateId);
  tpl.drawFrame(ctx, config, t);
}

export {
  marrokSlidesTemplate,
  kineticTextTemplate,
  brandIntroTemplate,
  productShowcaseTemplate,
};
