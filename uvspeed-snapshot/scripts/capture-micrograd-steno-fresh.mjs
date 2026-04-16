#!/usr/bin/env node
// micrograd-steno: clear+refresh, train cold, train warm, screenshot, benchmark, screenshot
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BROWSERS = process.env.PLAYWRIGHT_BROWSERS_PATH || join(ROOT, '.playwright-browsers');

function captureText(page) {
  return page.evaluate(() => {
    const log = document.getElementById('log');
    const viz = document.getElementById('viz');
    const footer = document.getElementById('footer');
    return {
      log: log ? log.innerText : '',
      viz: viz ? viz.innerText : '',
      footer: footer ? footer.innerText : '',
      fStatus: document.getElementById('f-status')?.textContent || '',
      fSpeed: document.getElementById('f-speed')?.textContent || '',
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS } });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const data = { afterWarm: null, afterBench: null };

  // Load page
  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#btn-run', { state: 'visible' });
  await page.waitForTimeout(800);

  // Clear if visible
  const clearBtn = page.locator('#btn-clear');
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(300);
  }
  // Refresh
  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#btn-run', { state: 'visible' });
  await page.waitForTimeout(500);

  // 1. Train cold
  await page.click('#btn-run');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('cold done'), { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // 2. Train warm
  await page.click('#btn-warm');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('warm done'), { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // 5. Screenshot warm results
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-fresh-warm.png'), fullPage: true });
  data.afterWarm = await captureText(page);
  console.log('Screenshot: micrograd-steno-fresh-warm.png');

  // 6. Benchmark
  await page.click('#btn-bench');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('benchmark done'), { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // 7. Screenshot benchmark
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-fresh-benchmark.png'), fullPage: true });
  data.afterBench = await captureText(page);
  console.log('Screenshot: micrograd-steno-fresh-benchmark.png');

  writeFileSync(join(ROOT, 'micrograd-steno-fresh-capture.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log('Captured → micrograd-steno-fresh-capture.json');

  await browser.close();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
