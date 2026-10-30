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

export function createCategorySvgPlaceholder(category?: string): string {
  const cat = (category || 'Mens Wear').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <linearGradient id="afBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="50%" stop-color="#1E293B"/>
        <stop offset="100%" stop-color="#0B132B"/>
      </linearGradient>
      <linearGradient id="afGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCD34D"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
      <linearGradient id="afInner" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1E293B"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
    <rect width="600" height="800" fill="url(#afBg)"/>
    <rect x="24" y="24" width="552" height="752" rx="28" fill="none" stroke="url(#afGold)" stroke-width="3" stroke-opacity="0.35"/>
    <rect x="180" y="240" width="240" height="200" rx="36" fill="url(#afInner)" stroke="url(#afGold)" stroke-width="4"/>
    <g transform="translate(300, 310)">
      <path d="M -22 -14 L 0 -28 L 22 -14 L 16 6 L -16 6 Z" fill="#FBBF24"/>
      <circle cx="-22" cy="-16" r="4" fill="#FEF08A"/>
      <circle cx="0" cy="-30" r="4.5" fill="#FEF08A"/>
      <circle cx="22" cy="-16" r="4" fill="#FEF08A"/>
      <text x="0" y="55" font-family="-apple-system, system-ui, sans-serif" font-weight="900" font-size="52" fill="url(#afGold)" text-anchor="middle">AF</text>
    </g>
    <text x="300" y="500" font-family="-apple-system, system-ui, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">ABHI FASHION</text>
    <text x="300" y="540" font-family="-apple-system, system-ui, sans-serif" font-weight="800" font-size="20" fill="#F59E0B" text-anchor="middle" letter-spacing="5">${cat}</text>
    <text x="300" y="580" font-family="-apple-system, system-ui, sans-serif" font-weight="700" font-size="14" fill="#94A3B8" text-anchor="middle" letter-spacing="2">CHHUIKHADAN • LUXURY APPAREL</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getCategoryFallbackImage(category?: string): string {
  return createCategorySvgPlaceholder(category);
}

/**
 * Ensures any Unsplash, local upload, or external image URL is resolved and requested in High Definition
 */
export function getHdImageUrl(url: string, category?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getCategoryFallbackImage(category);
  }

  // Auto-rewrite known broken Unsplash 404 image IDs
  let cleanUrl = url;
  if (cleanUrl.includes('photo-1542272604-780c96856592')) {
    cleanUrl = cleanUrl.replace('photo-1542272604-780c96856592', 'photo-1541099649105-f69ad21f3246');
  }

  const resolved = resolveImageUrl(cleanUrl);
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
