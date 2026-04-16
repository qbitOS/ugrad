#!/usr/bin/env node
// micrograd-steno v2: initial, train cold (+3s), train warm (+3s), benchmark (+5s)
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
    const warmBtn = document.getElementById('btn-warm');
    const benchBtn = document.getElementById('btn-bench');
    return {
      log: log ? log.innerText : '',
      viz: viz ? viz.innerText : '',
      footer: footer ? footer.innerText : '',
      fStatus: document.getElementById('f-status')?.textContent || '',
      fEpoch: document.getElementById('f-epoch')?.textContent || '',
      fLoss: document.getElementById('f-loss')?.textContent || '',
      fSteno: document.getElementById('f-steno')?.textContent || '',
      fSpeed: document.getElementById('f-speed')?.textContent || '',
      btnWarmText: warmBtn?.textContent || '',
      btnBenchText: benchBtn?.textContent || '',
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS } });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const data = { initial: null, afterCold: null, afterWarm: null, afterBench: null };

  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#btn-run', { state: 'visible' });
  await page.waitForTimeout(1500);

  // 1. Initial (should show "R0: micrograd + steno v2")
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-v2-1-initial.png'), fullPage: true });
  data.initial = await captureText(page);
  console.log('1. micrograd-steno-v2-1-initial.png');

  // 2. Train cold
  await page.click('#btn-run');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('cold done'), { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-v2-2-cold.png'), fullPage: true });
  data.afterCold = await captureText(page);
  console.log('2. micrograd-steno-v2-2-cold.png');

  // 3. Train warm (button should be green "▸ train warm")
  await page.click('#btn-warm');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('warm done'), { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-v2-3-warm.png'), fullPage: true });
  data.afterWarm = await captureText(page);
  console.log('3. micrograd-steno-v2-3-warm.png');

  // 4. Benchmark (button should be green "▸ benchmark")
  await page.click('#btn-bench');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('benchmark done'), { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.screenshot({ path: join(ROOT, 'micrograd-steno-v2-4-benchmark.png'), fullPage: true });
  data.afterBench = await captureText(page);
  console.log('4. micrograd-steno-v2-4-benchmark.png');

  writeFileSync(join(ROOT, 'micrograd-steno-v2-capture.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log('Captured → micrograd-steno-v2-capture.json');

  await browser.close();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
