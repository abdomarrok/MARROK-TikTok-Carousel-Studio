import React from 'react';
import { ICONS_REGISTRY, getIconDataUrl, TECH_ICONS_LIST } from '../../lib/icons.ts';
import { ThemePalette } from '../../types.ts';

/**
 * Returns a human-friendly display label for any vector icon, tech brand, or image URL.
 */
export function getIconDisplayName(iconName: string): string {
  if (!iconName) return 'Select Icon';
  if (ICONS_REGISTRY[iconName]) return ICONS_REGISTRY[iconName].label;
  const lower = iconName.toLowerCase().trim();
  const tech = TECH_ICONS_LIST.find((t) => t.name === lower || t.aliases?.includes(lower));
  if (tech) return tech.title;
  if (iconName.startsWith('http://') || iconName.startsWith('https://')) {
    const cleanUrl = iconName.split('?')[0];
    const filename = cleanUrl.split('/').pop()?.replace('.svg', '') || '';
    const matchTech = TECH_ICONS_LIST.find((t) => t.name === filename.toLowerCase());
    if (matchTech) return matchTech.title;
    return filename ? filename.charAt(0).toUpperCase() + filename.slice(1) : 'Web Icon';
  }
  return iconName.charAt(0).toUpperCase() + iconName.slice(1);
}

interface IconThumbnailProps {
  icon: string;
  theme?: ThemePalette;
  className?: string;
}

/**
 * Robust dual-renderer that natively displays both ICONS_REGISTRY vector glyphs
 * and curated tech brand logos (PostgreSQL, Redis, Go, Rust, etc.) or web URLs,
 * matching canvas projection 1:1.
 */
export const IconThumbnail: React.FC<IconThumbnailProps> = ({
  icon,
  theme,
  className = 'w-4 h-4',
}) => {
  const accentColor = theme?.accent || '#10B981';
  const registryItem = ICONS_REGISTRY[icon];
  if (registryItem?.svgInner) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        stroke={accentColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        dangerouslySetInnerHTML={{ __html: registryItem.svgInner }}
      />
    );
  }

  const url = getIconDataUrl(icon, accentColor);
  return (
    <img
      src={url}
      alt={getIconDisplayName(icon)}
      className={`${className} object-contain`}
      onError={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = '0.3';
      }}
    />
  );
};
