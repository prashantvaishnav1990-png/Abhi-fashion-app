import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Master SVG 1: Full App Icon (Used for legacy launcher, web, pwa, store icon)
// Size: 512x512
const fullIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="50%" stop-color="#0B132B"/>
      <stop offset="100%" stop-color="#050811"/>
    </linearGradient>

    <!-- Outer Gradient Border (matching Header.tsx: amber-400 via amber-500 to rose-600) -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="45%" stop-color="#F59E0B"/>
      <stop offset="85%" stop-color="#EA580C"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>

    <!-- Golden Text Gradient for AF -->
    <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="35%" stop-color="#FBBF24"/>
      <stop offset="85%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>

    <!-- Inner Badge Background -->
    <linearGradient id="innerBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0B132B"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>

  <!-- Outer Glowing Gradient Border -->
  <rect x="24" y="24" width="464" height="464" rx="92" fill="none" stroke="url(#borderGrad)" stroke-width="12" stroke-linecap="round"/>

  <!-- Subtle Inner Guide Line -->
  <rect x="42" y="42" width="428" height="428" rx="76" fill="none" stroke="#F59E0B" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="10 8"/>

  <!-- Center AF Badge (Exact look of the header preview icon) -->
  <g transform="translate(0, -10)">
    <!-- Inner Rounded Square Badge -->
    <rect x="116" y="90" width="280" height="230" rx="44" fill="url(#innerBadgeBg)" stroke="url(#borderGrad)" stroke-width="6"/>

    <!-- Subtle Crown Accent on top of badge -->
    <path d="M 226 72 L 256 86 L 286 72 L 278 94 L 234 94 Z" fill="#FBBF24"/>
    <circle cx="226" cy="69" r="4.5" fill="#FDE68A"/>
    <circle cx="256" cy="82" r="5.5" fill="#FDE68A"/>
    <circle cx="286" cy="69" r="4.5" fill="#FDE68A"/>

    <!-- Monogram: 'A' and 'F' as clean, bold vector geometric paths -->
    <!-- 'A' -->
    <path d="M 198 126 L 244 266 L 207 266 L 196 230 L 156 230 L 145 266 L 108 266 L 154 126 Z M 176 162 L 163 204 L 189 204 Z" fill="url(#goldText)"/>

    <!-- 'F' -->
    <path d="M 268 126 L 358 126 L 358 155 L 305 155 L 305 183 L 349 183 L 349 211 L 305 211 L 305 266 L 268 266 Z" fill="url(#goldText)"/>
  </g>

  <!-- Gold Divider with Star / Diamond -->
  <line x1="84" y1="360" x2="220" y2="360" stroke="url(#borderGrad)" stroke-width="3" stroke-linecap="round"/>
  <polygon points="256,350 266,360 256,370 246,360" fill="#FBBF24"/>
  <line x1="292" y1="360" x2="428" y2="360" stroke="url(#borderGrad)" stroke-width="3" stroke-linecap="round"/>

  <!-- ABHI FASHION Title -->
  <text x="256" y="412" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="42" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
    ABHI FASHION
  </text>

  <!-- Tagline -->
  <text x="256" y="452" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="19" fill="#F59E0B" text-anchor="middle" letter-spacing="6">
    MEN'S WEAR • CHHUIKHADAN
  </text>
</svg>
`;

// Master SVG 2: Round App Icon (for ic_launcher_round.png)
const roundIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="50%" stop-color="#0B132B"/>
      <stop offset="100%" stop-color="#050811"/>
    </linearGradient>
    <linearGradient id="borderGradR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="45%" stop-color="#F59E0B"/>
      <stop offset="85%" stop-color="#EA580C"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
    <linearGradient id="goldTextR" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="35%" stop-color="#FBBF24"/>
      <stop offset="85%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>

  <!-- Circle Background -->
  <circle cx="256" cy="256" r="256" fill="url(#bgR)"/>

  <!-- Outer Glowing Circular Border -->
  <circle cx="256" cy="256" r="240" fill="none" stroke="url(#borderGradR)" stroke-width="12"/>

  <!-- Inner Subtle Ring -->
  <circle cx="256" cy="256" r="222" fill="none" stroke="#F59E0B" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="8 6"/>

  <!-- Center AF Badge -->
  <g transform="translate(0, -14)">
    <rect x="124" y="96" width="264" height="216" rx="42" fill="#1E293B" stroke="url(#borderGradR)" stroke-width="5"/>

    <!-- Crown -->
    <path d="M 228 80 L 256 92 L 284 80 L 277 100 L 235 100 Z" fill="#FBBF24"/>
    <circle cx="228" cy="77" r="4" fill="#FDE68A"/>
    <circle cx="256" cy="89" r="5" fill="#FDE68A"/>
    <circle cx="284" cy="77" r="4" fill="#FDE68A"/>

    <!-- 'A' -->
    <path d="M 200 132 L 244 264 L 209 264 L 198 230 L 160 230 L 149 264 L 114 264 L 158 132 Z M 179 166 L 167 205 L 191 205 Z" fill="url(#goldTextR)"/>

    <!-- 'F' -->
    <path d="M 268 132 L 352 132 L 352 159 L 303 159 L 303 186 L 344 186 L 344 213 L 303 213 L 303 264 L 268 264 Z" fill="url(#goldTextR)"/>
  </g>

  <!-- Divider -->
  <line x1="100" y1="350" x2="224" y2="350" stroke="url(#borderGradR)" stroke-width="3" stroke-linecap="round"/>
  <polygon points="256,341 265,350 256,359 247,350" fill="#FBBF24"/>
  <line x1="288" y1="350" x2="412" y2="350" stroke="url(#borderGradR)" stroke-width="3" stroke-linecap="round"/>

  <!-- ABHI FASHION Title -->
  <text x="256" y="398" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="38" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
    ABHI FASHION
  </text>
  <text x="256" y="434" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="17" fill="#F59E0B" text-anchor="middle" letter-spacing="5">
    MEN'S WEAR
  </text>
</svg>
`;

// Master SVG 3: Adaptive Icon Foreground (Transparent background, centered in 66% safe zone)
// Size: 512x512, with emblem fitting nicely within the inner 340px circle
const foregroundIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="fgBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="45%" stop-color="#F59E0B"/>
      <stop offset="85%" stop-color="#EA580C"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
    <linearGradient id="fgGoldText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="35%" stop-color="#FBBF24"/>
      <stop offset="85%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>

  <!-- Center AF Emblem in Adaptive Safe Zone (scale around center) -->
  <g transform="translate(256, 256) scale(0.92) translate(-256, -256)">
    <!-- Badge Container with border -->
    <rect x="136" y="112" width="240" height="200" rx="38" fill="#101827" stroke="url(#fgBorderGrad)" stroke-width="6"/>

    <!-- Crown -->
    <path d="M 230 96 L 256 108 L 282 96 L 275 116 L 237 116 Z" fill="#FBBF24"/>
    <circle cx="230" cy="93" r="4" fill="#FDE68A"/>
    <circle cx="256" cy="105" r="5" fill="#FDE68A"/>
    <circle cx="282" cy="93" r="4" fill="#FDE68A"/>

    <!-- 'A' -->
    <path d="M 202 144 L 244 266 L 211 266 L 201 234 L 165 234 L 155 266 L 122 266 L 164 144 Z M 183 175 L 171 211 L 195 211 Z" fill="url(#fgGoldText)"/>

    <!-- 'F' -->
    <path d="M 266 144 L 344 144 L 344 170 L 298 170 L 298 196 L 336 196 L 336 222 L 298 222 L 298 266 L 266 266 Z" fill="url(#fgGoldText)"/>

    <!-- Divider -->
    <line x1="120" y1="334" x2="224" y2="334" stroke="url(#fgBorderGrad)" stroke-width="2.5" stroke-linecap="round"/>
    <polygon points="256,326 264,334 256,342 248,334" fill="#FBBF24"/>
    <line x1="288" y1="334" x2="392" y2="334" stroke="url(#fgBorderGrad)" stroke-width="2.5" stroke-linecap="round"/>

    <!-- ABHI FASHION Text -->
    <text x="256" y="374" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
      ABHI FASHION
    </text>
    <text x="256" y="405" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="16" fill="#F59E0B" text-anchor="middle" letter-spacing="5">
      MEN'S WEAR
    </text>
  </g>
</svg>
`;

// Save SVGs to public directory
fs.writeFileSync('public/icon.svg', fullIconSvg);
console.log('Saved public/icon.svg');

// Render all Android mipmap sizes
const mipmaps = [
  { dir: 'android/app/src/main/res/mipmap-mdpi', icon: 48, fg: 108 },
  { dir: 'android/app/src/main/res/mipmap-hdpi', icon: 72, fg: 162 },
  { dir: 'android/app/src/main/res/mipmap-xhdpi', icon: 96, fg: 216 },
  { dir: 'android/app/src/main/res/mipmap-xxhdpi', icon: 144, fg: 324 },
  { dir: 'android/app/src/main/res/mipmap-xxxhdpi', icon: 192, fg: 432 },
];

for (const m of mipmaps) {
  fs.mkdirSync(m.dir, { recursive: true });

  // 1. ic_launcher.png
  await sharp(Buffer.from(fullIconSvg))
    .resize(m.icon, m.icon)
    .png()
    .toFile(path.join(m.dir, 'ic_launcher.png'));

  // 2. ic_launcher_round.png
  await sharp(Buffer.from(roundIconSvg))
    .resize(m.icon, m.icon)
    .png()
    .toFile(path.join(m.dir, 'ic_launcher_round.png'));

  // 3. ic_launcher_foreground.png
  await sharp(Buffer.from(foregroundIconSvg))
    .resize(m.fg, m.fg)
    .png()
    .toFile(path.join(m.dir, 'ic_launcher_foreground.png'));

  console.log(`Generated mipmaps for ${m.dir} (icon: ${m.icon}px, fg: ${m.fg}px)`);
}

// Render Public / PWA Web Icons
await sharp(Buffer.from(fullIconSvg)).resize(64, 64).png().toFile('public/favicon.png');
await sharp(Buffer.from(fullIconSvg)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(fullIconSvg)).resize(192, 192).png().toFile('public/pwa-192x192.png');
await sharp(Buffer.from(fullIconSvg)).resize(512, 512).png().toFile('public/pwa-512x512.png');
await sharp(Buffer.from(fullIconSvg)).resize(512, 512).png().toFile('public/pwa-maskable-512x512.png');

console.log('All public and Android icon PNGs generated successfully!');
