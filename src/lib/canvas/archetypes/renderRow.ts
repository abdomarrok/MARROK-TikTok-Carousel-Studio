import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import {
  drawMultiNodeTopologyFlow,
  drawBlastRadiusIsolationGrid,
  drawLayeredArchitectureStack,
  drawKeyTakeawayCard,
} from './renderDiagram.ts';

/**
 * Archetype 2: Row / Multi-Node Dynamic Technical Schematic
 * Dispatches to bespoke labeled diagrams (topology flow, isolation grid, stack, or takeaway card)
 * based on explicit diagramVariant or semantic keyword matching.
 */
export async function drawRowSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  options: VisualSystemOptions,
  slideIndex: number = 1
): Promise<number> {
  const slideText = `${slide.enTitle || ''} ${slide.enBody || ''} ${slide.arTitle || ''}`.toLowerCase();
  const iconCount = slide.icons?.length || 0;

  // Prioritize explicit diagramVariant layout choice if set
  if (slide.diagramVariant === 'isolation') {
    return drawBlastRadiusIsolationGrid(ctx, slide, theme, options, 240);
  } else if (slide.diagramVariant === 'stack') {
    return drawLayeredArchitectureStack(ctx, slide, theme, options, 240);
  } else if (slide.diagramVariant === 'takeaway') {
    return drawKeyTakeawayCard(ctx, slide, theme, options, 240);
  } else if (slide.diagramVariant === 'topology') {
    return drawMultiNodeTopologyFlow(ctx, slide, theme, options, 240);
  } else if (
    slideText.includes('blast radius') ||
    slideText.includes('microsegment') ||
    slideText.includes('isolation') ||
    slideText.includes('isolate') ||
    slideText.includes('perimeter') ||
    slideText.includes('firewall') ||
    slideText.includes('quarantine') ||
    slideText.includes('sandbox')
  ) {
    return drawBlastRadiusIsolationGrid(ctx, slide, theme, options, 240);
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
    return drawLayeredArchitectureStack(ctx, slide, theme, options, 240);
  } else if (iconCount === 1) {
    return drawKeyTakeawayCard(ctx, slide, theme, options, 240);
  } else {
    return drawMultiNodeTopologyFlow(ctx, slide, theme, options, 240);
  }
}
