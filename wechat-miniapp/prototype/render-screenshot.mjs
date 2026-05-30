import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const requireFromApp = createRequire(resolve(__dirname, '../../app/package.json'));
const puppeteer = requireFromApp('puppeteer');
const htmlPath = resolve(__dirname, 'index.html');
const outputPath = resolve(__dirname, 'prototype-overview.png');

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1480, height: 1800, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();

console.log(outputPath);
