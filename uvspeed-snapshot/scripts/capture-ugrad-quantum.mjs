#!/usr/bin/env node
// μgrad: clear+refresh, train, quantum, screenshot
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BROWSERS = process.env.PLAYWRIGHT_BROWSERS_PATH || join(ROOT, '.playwright-browsers');

async function main() {
  const browser = await chromium.launch({ headless: true, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS } });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#cmd', { state: 'visible' });
  await page.waitForTimeout(500);

  await page.fill('#cmd', 'clear');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#cmd', { state: 'visible' });
  await page.waitForTimeout(500);

  await page.fill('#cmd', 'train');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  await page.fill('#cmd', 'quantum');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: join(ROOT, 'ugrad-quantum.png'), fullPage: true });
  const logText = await page.evaluate(() => document.getElementById('log')?.innerText || '');
  writeFileSync(join(ROOT, 'ugrad-quantum-log.txt'), logText, 'utf8');
  console.log('Screenshot: ugrad-quantum.png');
  console.log('Log saved: ugrad-quantum-log.txt');

  await browser.close();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
