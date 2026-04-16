#!/usr/bin/env node
// micrograd-steno: initial, train cold (+2s), train warm (+2s), benchmark (+3s)
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
      fEpoch: document.getElementById('f-epoch')?.textContent || '',
      fLoss: document.getElementById('f-loss')?.textContent || '',
      fSteno: document.getElementById('f-steno')?.textContent || '',
      fSpeed: document.getElementById('f-speed')?.textContent || '',
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS } });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const data = { initial: null, afterCold: null, afterWarm: null, afterBench: null };

  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#btn-run', { state: 'visible' });
  await page.waitForTimeout(800);

  // 1. Initial
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-1-initial.png'), fullPage: true });
  data.initial = await captureText(page);
  console.log('1. micrograd-steno-1-initial.png');

  // 2. Train cold
  await page.click('#btn-run');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('cold done'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-2-cold.png'), fullPage: true });
  data.afterCold = await captureText(page);
  console.log('2. micrograd-steno-2-cold.png');

  // 3. Train warm
  await page.click('#btn-warm');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('warm done'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-3-warm.png'), fullPage: true });
  data.afterWarm = await captureText(page);
  console.log('3. micrograd-steno-3-warm.png');

  // 4. Benchmark
  await page.click('#btn-bench');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('benchmark done'), { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-4-benchmark.png'), fullPage: true });
  data.afterBench = await captureText(page);
  console.log('4. micrograd-steno-4-benchmark.png');

  writeFileSync(join(ROOT, 'micrograd-steno-capture.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log('Captured text → micrograd-steno-capture.json');

  await browser.close();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
