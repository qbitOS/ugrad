#!/usr/bin/env node
// micrograd-steno 500ep: clear+refresh, cold (wait 5s), warm (wait 2s), screenshot, benchmark (wait 10s), screenshot
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

  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#btn-run', { state: 'visible' });
  await page.waitForTimeout(500);

  if (await page.locator('#btn-clear').isVisible()) {
    await page.click('#btn-clear');
    await page.waitForTimeout(300);
  }
  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#btn-run', { state: 'visible' });
  await page.waitForTimeout(500);

  await page.click('#btn-run');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('cold done'), { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);

  await page.click('#btn-warm');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('warm done'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await page.screenshot({ path: join(ROOT, 'micrograd-steno-500-warm.png'), fullPage: true });
  data.afterWarm = await captureText(page);
  console.log('Screenshot: micrograd-steno-500-warm.png');

  await page.click('#btn-bench');
  await page.waitForFunction(() => document.getElementById('f-status')?.textContent?.includes('benchmark done'), { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(10000);

  await page.screenshot({ path: join(ROOT, 'micrograd-steno-500-benchmark.png'), fullPage: true });
  data.afterBench = await captureText(page);
  console.log('Screenshot: micrograd-steno-500-benchmark.png');

  writeFileSync(join(ROOT, 'micrograd-steno-500-capture.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log('Captured → micrograd-steno-500-capture.json');
  await browser.close();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
