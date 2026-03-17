#!/usr/bin/env node
/**
 * Genera icon-512.png e icon-192.png desde icon.svg
 * Ejecutar: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'icon.svg');
const svg = readFileSync(svgPath);

await sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'icon-512.png'));

await sharp(Buffer.from(svg))
  .resize(192, 192)
  .png()
  .toFile(join(publicDir, 'icon-192.png'));

await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));

console.log('✅ icon-512.png, icon-192.png y apple-touch-icon.png generados');
