import { Product } from '../types';
import { getProductCode } from './productHelpers';

export interface ProductSpecItem {
  label: string;
  value: string;
}

export interface CleanedDescription {
  cleanText: string;
  tagline?: string;
}

/**
 * Strips robotic prefixes like "Product Description:" and extracts any tagline
 */
export function cleanProductDescription(rawDescription?: string): CleanedDescription {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return { cleanText: '' };
  }

  let text = rawDescription.trim();
  let tagline: string | undefined;

  // Extract tagline if present (e.g. "Tagline: Classic Denim. Modern Attitude.")
  const taglineMatch = text.match(/tagline\s*:\s*([^.\n]+(?:\.[^.\n]+)*)/i);
  if (taglineMatch) {
    tagline = taglineMatch[1].trim();
    text = text.replace(/tagline\s*:\s*([^.\n]+(?:\.[^.\n]+)*)/i, '').trim();
  }

  // Strip leading "Product Description:" or "Description:"
  text = text.replace(/^(?:product\s+)?description\s*:\s*/i, '').trim();

  // Clean trailing punctuation or dangling colons
  text = text.replace(/\s+-\s*$/, '').trim();

  return { cleanText: text, tagline };
}

/**
 * Intelligent apparel specification generator matching Flipkart's specs taxonomy
 */
export function getProductSpecifications(
  product: Product,
  selectedColor?: string
): {
  highlights: string[];
  specs: ProductSpecItem[];
} {
  const name = (product.name || '').toLowerCase();
  const cat = (product.category || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const combined = `${name} ${cat} ${desc}`;
  const code = getProductCode(product);
  const color = selectedColor || product.colors?.[0] || 'Standard';

  // Inferred Fabric
  let fabric = '100% Premium Cotton';
  if (combined.includes('denim') || combined.includes('jean')) {
    fabric = combined.includes('stretch') ? 'Cotton Blend Stretch Denim' : '100% Ring-Spun Denim';
  } else if (combined.includes('fleece')) {
    fabric = 'Super-Soft Poly-Cotton Fleece';
  } else if (combined.includes('leather')) {
    fabric = combined.includes('pu') || combined.includes('faux') ? 'High-Grade PU Leather' : 'Genuine Leather Finish';
  } else if (combined.includes('linen')) {
    fabric = 'Pure Breathable Linen';
  } else if (combined.includes('poly') || combined.includes('viscose')) {
    fabric = 'Poly-Viscose Comfort Blend';
  } else if (combined.includes('terry') || combined.includes('hoodie') || combined.includes('sweatshirt')) {
    fabric = 'Heavyweight French Terry Cotton';
  } else if (combined.includes('chiffon') || combined.includes('silk')) {
    fabric = 'Smooth Silk Blend';
  } else if (combined.includes('corduroy')) {
    fabric = 'Washed Wale Corduroy';
  } else if (combined.includes('knit') || combined.includes('mesh')) {
    fabric = 'Engineered Breathable Mesh Knit';
  } else if (cat.includes('shirt') || combined.includes('oxford')) {
    fabric = '100% Combed Compact Cotton';
  }

  // Inferred Pattern
  let pattern = 'Solid';
  if (combined.includes('printed') || combined.includes('graphic')) pattern = 'Graphic Print';
  else if (combined.includes('check') || combined.includes('plaid')) pattern = 'Classic Checks';
  else if (combined.includes('stripe')) pattern = 'Vertical Stripes';
  else if (combined.includes('washed') || combined.includes('fade') || combined.includes('stone wash')) pattern = 'Clean Washed / Whisker';
  else if (combined.includes('distressed') || combined.includes('ripped')) pattern = 'Distressed Styling';
  else if (combined.includes('textured') || combined.includes('self design')) pattern = 'Self Design Texture';

  // Inferred Fit
  let fit = 'Regular Fit';
  if (combined.includes('straight')) fit = 'Straight Fit';
  else if (combined.includes('slim')) fit = 'Slim Fit';
  else if (combined.includes('oversize') || combined.includes('baggy') || combined.includes('boxy')) fit = 'Oversized Boxy Fit';
  else if (combined.includes('skinny')) fit = 'Skinny Fit';
  else if (combined.includes('tapered') || combined.includes('carrot')) fit = 'Tapered Fit';
  else if (combined.includes('relaxed')) fit = 'Relaxed Fit';

  // Inferred Sleeve
  let sleeve: string | null = null;
  if (cat.includes('jean') || cat.includes('trouser') || cat.includes('pant') || cat.includes('footwear') || cat.includes('shoe') || cat.includes('acc')) {
    sleeve = null;
  } else if (combined.includes('full sleeve') || combined.includes('long sleeve') || cat.includes('jacket') || cat.includes('blazer') || cat.includes('hoodie')) {
    sleeve = 'Full Sleeve';
  } else if (combined.includes('sleeveless') || combined.includes('vest') || combined.includes('sando')) {
    sleeve = 'Sleeveless';
  } else {
    sleeve = cat.includes('shirt') ? 'Full / Roll-up Sleeve' : 'Half Sleeve';
  }

  // Inferred Closure
  let closure = 'Button Placket';
  if (cat.includes('jean') || cat.includes('pant') || cat.includes('trouser')) {
    closure = 'Zip Fly with Premium Button';
  } else if (combined.includes('zipper') || combined.includes('zip') || cat.includes('jacket')) {
    closure = 'Heavy Duty Metal Zipper';
  } else if (cat.includes('t-shirt') || cat.includes('tee') || combined.includes('pullover')) {
    closure = 'Pull On / Slip On';
  } else if (cat.includes('shoe') || cat.includes('footwear') || cat.includes('sneaker')) {
    closure = 'Lace-Up';
  }

  // Inferred Neck / Collar
  let neck: string | null = null;
  if (cat.includes('jean') || cat.includes('trouser') || cat.includes('pant') || cat.includes('shoe') || cat.includes('acc')) {
    neck = null;
  } else if (combined.includes('hood') || combined.includes('hoodie')) {
    neck = 'Hooded Neck';
  } else if (combined.includes('high neck') || combined.includes('turtle')) {
    neck = 'High Neck';
  } else if (combined.includes('mandarin') || combined.includes('chinese collar')) {
    neck = 'Mandarin Collar';
  } else if (combined.includes('polo') || combined.includes('collar')) {
    neck = 'Spread Collar';
  } else if (cat.includes('shirt')) {
    neck = 'Classic Spread Collar';
  } else {
    neck = 'Crew Neck / Round Neck';
  }

  // Inferred Length
  let length = 'Regular';
  if (cat.includes('jean') || cat.includes('trouser') || cat.includes('pant')) {
    length = combined.includes('ankle') ? 'Ankle Length' : 'Full Length';
  } else if (combined.includes('crop')) {
    length = 'Crop Length';
  } else if (combined.includes('longline')) {
    length = 'Longline';
  }

  // Inferred Occasion
  let occasion = 'Casual & Daily Wear';
  if (combined.includes('party') || combined.includes('club')) occasion = 'Party & Night Out';
  else if (combined.includes('formal') || combined.includes('office') || combined.includes('work')) occasion = 'Formal & Smart Casual';
  else if (combined.includes('festive') || combined.includes('wedding')) occasion = 'Festive & Celebration';
  else if (combined.includes('street') || combined.includes('urban')) occasion = 'Streetwear & Casual';

  // Fabric Care
  let fabricCare = 'Machine Wash as per Tag';
  if (combined.includes('denim') || combined.includes('jean')) {
    fabricCare = 'Machine Wash Cold, Inside Out, Do Not Bleach';
  } else if (combined.includes('leather')) {
    fabricCare = 'Wipe Clean with Damp Cloth / Specialist Clean';
  } else if (combined.includes('cotton') || cat.includes('t-shirt')) {
    fabricCare = 'Gentle Machine Wash in Cold Water, Dry in Shade';
  }

  // Highlights list
  const highlights: string[] = [
    `Fabric: ${fabric}`,
    `Fit: ${fit} • ${pattern}`,
    `Style Code: #${code}`,
    `100% Original Brand Verified at ABHI FASHION Bazar Line Store`,
    `⚡ 10-Minute Instant Free Doorstep Delivery in Chhuikhadan`,
    `Easy Size Exchange & Store Visit Available`,
  ];

  // Specifications Grid
  const specs: ProductSpecItem[] = [
    { label: 'Brand', value: 'ABHI FASHION' },
    { label: 'Color', value: color },
    { label: 'Fabric', value: fabric },
    { label: 'Pattern', value: pattern },
    { label: 'Style code', value: code },
    { label: 'Ideal for', value: 'Men' },
    ...(fit ? [{ label: 'Fit', value: fit }] : []),
    ...(sleeve ? [{ label: 'Sleeve', value: sleeve }] : []),
    { label: 'Closure', value: closure },
    { label: 'Pack of', value: '1' },
    { label: 'Suitable for', value: 'Western & Casual Wear' },
    { label: 'Reversible', value: 'No' },
    { label: 'Type', value: product.category || 'Apparel' },
    { label: 'Fabric care', value: fabricCare },
    ...(neck ? [{ label: 'Neck / Collar', value: neck }] : []),
    { label: 'Net Quantity', value: '1 Piece' },
    { label: 'Brand Color', value: color },
    { label: 'Length', value: length },
    { label: 'Occasion', value: occasion },
    { label: 'Available Sizes', value: product.sizes?.length ? product.sizes.join(', ') : 'Standard' },
  ];

  return { highlights, specs };
}
