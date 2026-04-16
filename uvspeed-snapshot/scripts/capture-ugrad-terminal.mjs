#!/usr/bin/env node
// μgrad terminal: run command sequence and capture screenshots + text
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
    const panel = document.getElementById('panel');
    const bGen = document.getElementById('b-gen');
    const bSpeed = document.getElementById('b-speed');
    const cSpeed = document.getElementById('c-speed');
    const cBoundary = document.getElementById('c-boundary');
    const cLoss = document.getElementById('c-loss');
    return {
      log: log ? log.innerText : '',
      panel: panel ? panel.innerText : '',
      bGen: bGen ? bGen.textContent : '',
      bSpeed: bSpeed ? bSpeed.textContent : '',
      hasSpeedCanvas: !!cSpeed,
      hasBoundaryCanvas: !!cBoundary,
      hasLossCanvas: !!cLoss,
    };
  });
}

async function runCmd(page, cmd, waitMs) {
  await page.fill('#cmd', cmd);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(waitMs);
}

async function main() {
  const browser = await chromium.launch({ headless: true, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS } });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const data = {};

  await page.goto('http://localhost:8090/micrograd-steno.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#cmd', { state: 'visible' });
  await page.waitForTimeout(1500);

  // 1. Initial
  await page.screenshot({ path: join(ROOT, 'ugrad-1-initial.png'), fullPage: true });
  data.initial = await captureText(page);
  console.log('1. ugrad-1-initial.png');

  // 2. train
  await runCmd(page, 'train', 1000);
  await page.screenshot({ path: join(ROOT, 'ugrad-2-train.png'), fullPage: true });
  data.afterTrain1 = await captureText(page);
  console.log('2. ugrad-2-train.png');

  // 3. train (warm)
  await runCmd(page, 'train', 1000);

  // 4. evolve 10
  await runCmd(page, 'evolve 10', 5000);
  await page.screenshot({ path: join(ROOT, 'ugrad-4-evolve10.png'), fullPage: true });
  data.afterEvolve10 = await captureText(page);
  console.log('4. ugrad-4-evolve10.png');

  // 5. gen
  await runCmd(page, 'gen', 1000);
  await page.screenshot({ path: join(ROOT, 'ugrad-5-gen.png'), fullPage: true });
  data.afterGen = await captureText(page);
  console.log('5. ugrad-5-gen.png');

  // 6. data spiral
  await runCmd(page, 'data spiral', 1000);

  // 7. evolve 5
  await runCmd(page, 'evolve 5', 5000);
  await page.screenshot({ path: join(ROOT, 'ugrad-7-evolve5-spiral.png'), fullPage: true });
  data.afterEvolve5Spiral = await captureText(page);
  console.log('7. ugrad-7-evolve5-spiral.png');

  // 8. bench
  await runCmd(page, 'bench', 10000);
  await page.screenshot({ path: join(ROOT, 'ugrad-8-bench.png'), fullPage: true });
  data.afterBench = await captureText(page);
  console.log('8. ugrad-8-bench.png');

  // 9. speed
  await runCmd(page, 'speed', 2000);
  await page.screenshot({ path: join(ROOT, 'ugrad-9-speed.png'), fullPage: true });
  data.afterSpeed = await captureText(page);
  console.log('9. ugrad-9-speed.png');

  // 10. steno
  await runCmd(page, 'steno', 1000);
  await page.screenshot({ path: join(ROOT, 'ugrad-10-steno.png'), fullPage: true });
  data.afterSteno = await captureText(page);
  console.log('10. ugrad-10-steno.png');

  writeFileSync(join(ROOT, 'ugrad-capture.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log('Captured → ugrad-capture.json');
  await browser.close();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
