/**
 * Helper utilities for High Definition (HD) Image optimization and Color styling
 */

export interface ColorPreset {
  name: string;
  hex: string;
  border?: boolean;
}

export const POPULAR_COLORS: ColorPreset[] = [
  { name: 'Jet Black', hex: '#0B0F19' },
  { name: 'Pure White', hex: '#FFFFFF', border: true },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Wine Red', hex: '#881337' },
  { name: 'Maroon', hex: '#581C87' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Sage Olive', hex: '#4D7C0F' },
  { name: 'Dark Green', hex: '#064E3B' },
  { name: 'Charcoal Grey', hex: '#374151' },
  { name: 'Heather Grey', hex: '#9CA3AF' },
  { name: 'Beige / Cream', hex: '#F5F5DC', border: true },
  { name: 'Khaki Tan', hex: '#B45309' },
  { name: 'Mustard Yellow', hex: '#EAB308' },
  { name: 'Chocolate Brown', hex: '#451A03' },
  { name: 'Peach / Coral', hex: '#FB7185' },
  { name: 'Dusty Pink', hex: '#F472B6' },
];

/**
 * Returns an approx hex code for a color name
 */
export function getColorHex(colorName: string): string {
  if (!colorName) return '#334155';
  const clean = colorName.toLowerCase().trim();
  const match = POPULAR_COLORS.find(
    (c) =>
      clean.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(clean)
  );
  if (match) return match.hex;

  // Basic fallbacks
  if (clean.includes('black')) return '#0B0F19';
  if (clean.includes('white')) return '#FFFFFF';
  if (clean.includes('blue') || clean.includes('indigo') || clean.includes('navy')) return '#1E3A8A';
  if (clean.includes('red') || clean.includes('maroon') || clean.includes('wine')) return '#991B1B';
  if (clean.includes('green') || clean.includes('olive') || clean.includes('mint')) return '#15803D';
  if (clean.includes('yellow') || clean.includes('mustard')) return '#CA8A04';
  if (clean.includes('grey') || clean.includes('gray')) return '#4B5563';
  if (clean.includes('brown') || clean.includes('tan') || clean.includes('khaki')) return '#78350F';
  if (clean.includes('pink')) return '#EC4899';
  if (clean.includes('orange')) return '#EA580C';
  if (clean.includes('purple')) return '#7E22CE';

  return '#475569';
}

import { resolveImageUrl } from './apiConfig';

/**
 * Ensures any Unsplash, local upload, or external image URL is resolved and requested in High Definition
 */
export function getHdImageUrl(url: string): string {
  if (!url) return '';
  const resolved = resolveImageUrl(url);
  if (resolved.startsWith('data:image') || resolved.startsWith('blob:')) {
    // Base64 or Blob user uploaded image
    return resolved;
  }
  if (resolved.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(resolved);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', '1400');
      parsed.searchParams.set('q', '90');
      return parsed.toString();
    } catch {
      return resolved;
    }
  }
  return resolved;
}
