#!/usr/bin/env node
/**
 * Generate PNG favicons from SVG
 * Requires: sharp (npm install sharp)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = join(__dirname, '../static');
const svgPath = join(staticDir, 'favicon.svg');

try {
  // Try to use sharp if available
  const sharp = (await import('sharp')).default;
  const svg = readFileSync(svgPath);

  // Generate favicon.png (32x32)
  await sharp(svg).resize(32, 32).png().toFile(join(staticDir, 'favicon.png'));

  // Generate apple-touch-icon.png (180x180)
  await sharp(svg).resize(180, 180).png().toFile(join(staticDir, 'apple-touch-icon.png'));

  console.log('✓ Generated favicon.png and apple-touch-icon.png');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('⚠ sharp not found. Install it with: pnpm add -D sharp');
    console.log('   Or use an online SVG to PNG converter for favicon.png');
  } else {
    console.error('Error generating favicons:', error.message);
  }
}
