import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const svg = readFileSync('public/icon.svg');
mkdirSync('public/icons', { recursive: true });
mkdirSync('public/splash', { recursive: true });

const png = (size, out) => sharp(svg, { density: 384 }).resize(size, size).png().toFile(out);
await png(192, 'public/icons/icon-192.png');
await png(512, 'public/icons/icon-512.png');
await png(180, 'public/icons/apple-touch-icon.png');
await png(32, 'public/icons/favicon-32.png');

// maskable: icon on full-bleed background with safe-zone padding
const inner = await sharp(svg, { density: 384 }).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b1228' } })
  .composite([{ input: inner, gravity: 'center' }]).png().toFile('public/icons/maskable-512.png');

// iOS splash screens (portrait): [w, h, dpr]
const devices = [[430, 932, 3], [440, 956, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [820, 1180, 2], [1024, 1366, 2]];
for (const [w, h, d] of devices) {
  const W = w * d, H = h * d, s = Math.round(Math.min(W, H) * 0.32);
  const logo = await sharp(svg, { density: 384 }).resize(s, s).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: '#070b16' } })
    .composite([{ input: logo, gravity: 'center' }]).png().toFile(`public/splash/${W}x${H}.png`);
}
console.log('icons ok');
