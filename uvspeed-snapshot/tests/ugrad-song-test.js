#!/usr/bin/env node
// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// μgrad Song Analysis — MP3 → FFT → ACV → QAS quantum pipeline
// Decodes MP3 via ffmpeg, runs 64-band FFT, pipes through 11-qubit quantum sim
// Run: node tests/ugrad-song-test.js <file.mp3>
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SAMPLE_RATE = 44100;
const FFT_SIZE = 2048;
const HOP = FFT_SIZE;
const BANDS = 64;

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node tests/ugrad-song-test.js <file.mp3> [file2.mp3 ...]');
  process.exit(1);
}

// ─── Minimal FFT (radix-2 DIT) ───
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len *= 2) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const tRe = curRe * re[i + j + len / 2] - curIm * im[i + j + len / 2];
        const tIm = curRe * im[i + j + len / 2] + curIm * re[i + j + len / 2];
        re[i + j + len / 2] = re[i + j] - tRe;
        im[i + j + len / 2] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
}

function computeBands(samples, offset) {
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    const idx = offset + i;
    const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
    re[i] = idx < samples.length ? samples[idx] * w : 0;
  }
  fft(re, im);
  const bands = new Float32Array(BANDS);
  const half = FFT_SIZE / 2;
  const binsPerBand = Math.floor(half / BANDS);
  for (let b = 0; b < BANDS; b++) {
    let sum = 0;
    for (let k = b * binsPerBand; k < (b + 1) * binsPerBand && k < half; k++) {
      sum += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    }
    bands[b] = sum / binsPerBand;
  }
  const maxBand = Math.max(...bands) || 1;
  for (let b = 0; b < BANDS; b++) bands[b] /= maxBand;
  return bands;
}

// ─── ACV Pipeline (mirrors ugrad-worker.js) ───
const GROUPS = { sub:[0,1], bass:[2,3,4], loMid:[5,6,7,8], mid:[9,10,11,12,13],
  hiMid:[14,15,16,17,18,19], pres:[20,21,22,23,24], brill:[25,26,27,28,29], air:[30,31] };

function extractCV(bands) {
  const cv = {};
  for (const [name, idx] of Object.entries(GROUPS)) {
    let s = 0; for (const i of idx) if (i < bands.length) s += bands[i];
    cv[name] = s / idx.length;
  }
  let total = 0, wt = 0;
  for (let i = 0; i < bands.length; i++) { total += bands[i]; wt += i * bands[i]; }
  cv.centroid = total > 0 ? wt / total : 32;
  cv.energy = total / bands.length;
  cv.flatness = 0;
  let geoSum = 0, ariSum = 0;
  for (let i = 0; i < bands.length; i++) { geoSum += Math.log(bands[i] + 1e-10); ariSum += bands[i]; }
  cv.flatness = ariSum > 0 ? Math.exp(geoSum / bands.length) / (ariSum / bands.length) : 0;
  cv.peak = Math.max(...bands);
  cv.crest = ariSum > 0 ? cv.peak / (ariSum / bands.length) : 0;
  return cv;
}

function cvToParams(cv) {
  const p = new Float64Array(20);
  p[0] = cv.sub * Math.PI; p[1] = cv.bass * Math.PI;
  p[2] = cv.loMid * Math.PI * 0.8; p[3] = cv.mid * Math.PI * 0.6;
  p[4] = cv.hiMid * Math.PI * 0.5; p[5] = cv.pres * Math.PI * 0.4;
  p[6] = cv.brill * Math.PI * 0.3; p[7] = cv.air * Math.PI * 0.2;
  p[8] = cv.centroid / 32 * Math.PI; p[9] = cv.energy * Math.PI * 2;
  p[10] = cv.flatness * Math.PI; p[11] = cv.peak * Math.PI;
  p[12] = cv.crest / 10 * Math.PI;
  return p;
}

// ─── 11-qubit QAS (matches ugrad-worker.js) ───
function applyRy(st, nQ, q, th) {
  const c = Math.cos(th / 2), s = Math.sin(th / 2), dim = 1 << nQ, m = 1 << q;
  for (let i = 0; i < dim; i++) {
    if (i & m) continue;
    const j = i | m, a = st[i], b = st[j];
    st[i] = c * a - s * b; st[j] = s * a + c * b;
  }
}
function applyCZ(st, nQ, a, b) {
  const dim = 1 << nQ, ma = 1 << a, mb = 1 << b;
  for (let i = 0; i < dim; i++) if ((i & ma) && (i & mb)) st[i] = -st[i];
}
function measZ(st, nQ, q) {
  const dim = 1 << nQ, m = 1 << q;
  let exp = 0; for (let i = 0; i < dim; i++) exp += st[i] * st[i] * ((i & m) ? -1 : 1);
  return exp;
}
function measZZ(st, nQ, a, b) {
  const dim = 1 << nQ, ma = 1 << a, mb = 1 << b;
  let exp = 0;
  for (let i = 0; i < dim; i++) {
    const sa = (i & ma) ? -1 : 1, sb = (i & mb) ? -1 : 1;
    exp += st[i] * st[i] * sa * sb;
  }
  return exp;
}

function qasSimulate(params, azimuth, elevation, freq) {
  const nQ = 11, dim = 1 << nQ, st = new Float64Array(dim);
  st[0] = 1;
  applyRy(st, nQ, 0, Math.PI / 2);
  let pi = 0;
  for (let q = 1; q < nQ; q++) { applyRy(st, nQ, q, params[pi++]); pi++; }
  const bonds = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[2,8],[4,9],[5,10],[9,10]];
  for (const [a, b] of bonds) applyCZ(st, nQ, a, b);
  const J = 1, ild = 0.5 * Math.sin(azimuth * Math.PI / 180);
  const absorb = [0.01, 0.05, 0.15, 0.3];
  let E = 0;
  for (const [a, b] of [[0,1],[1,2],[2,3],[3,4]]) E -= J * measZZ(st, nQ, a, b);
  for (let i = 0; i < 4; i++) E += absorb[i] * measZ(st, nQ, i + 1);
  E -= ild * (measZ(st, nQ, 5) - measZ(st, nQ, 7));

  const qubits = [];
  for (let q = 0; q < nQ; q++) qubits.push(measZ(st, nQ, q));

  const itd = 0.215 * Math.sin(azimuth * Math.PI / 180) / 343 * 1e6;
  return { energy: E, qubits, ild_dB: (ild * 20).toFixed(1), itd_us: itd.toFixed(0) };
}

// ─── Visualization helpers ───
function bar(val, width = 20, ch = '█') {
  const n = Math.round(Math.abs(val) * width);
  return (ch.repeat(Math.min(n, width))).padEnd(width);
}

function colorBar(val) {
  if (val > 0.7) return `\x1b[91m${bar(val)}\x1b[0m`;
  if (val > 0.4) return `\x1b[93m${bar(val)}\x1b[0m`;
  if (val > 0.15) return `\x1b[92m${bar(val)}\x1b[0m`;
  return `\x1b[90m${bar(val)}\x1b[0m`;
}

// ─── Process a single track ───
function analyzeTrack(filePath) {
  const name = path.basename(filePath, path.extname(filePath));
  console.log(`\n\x1b[96m${'═'.repeat(60)}\x1b[0m`);
  console.log(`\x1b[1;96m⚛ ${name}\x1b[0m`);
  console.log(`\x1b[96m${'═'.repeat(60)}\x1b[0m`);

  const t0 = performance.now();
  const raw = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ac 1 -ar ${SAMPLE_RATE} - 2>/dev/null`,
    { maxBuffer: 100 * 1024 * 1024 }
  );
  const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const duration = samples.length / SAMPLE_RATE;
  const decodeMs = performance.now() - t0;

  console.log(`  \x1b[90mdecoded: ${duration.toFixed(1)}s · ${samples.length.toLocaleString()} samples · ${decodeMs.toFixed(0)}ms\x1b[0m`);

  const totalFrames = Math.floor((samples.length - FFT_SIZE) / HOP);
  const framesPerSec = SAMPLE_RATE / HOP;

  let minE = Infinity, maxE = -Infinity, sumE = 0;
  let peakFrame = 0, peakEnergy = 0;
  const timeline = [];
  const sectionSize = Math.floor(totalFrames / 8);

  const cvAccum = { sub: 0, bass: 0, loMid: 0, mid: 0, hiMid: 0, pres: 0, brill: 0, air: 0, energy: 0, centroid: 0 };

  const t1 = performance.now();

  for (let f = 0; f < totalFrames; f++) {
    const bands = computeBands(samples, f * HOP);
    const cv = extractCV(bands);
    const params = cvToParams(cv);
    const az = (f / totalFrames) * 360;
    const result = qasSimulate(params, az, 0, cv.centroid * 700 + 200);

    if (result.energy < minE) minE = result.energy;
    if (result.energy > maxE) maxE = result.energy;
    sumE += result.energy;

    if (cv.energy > peakEnergy) { peakEnergy = cv.energy; peakFrame = f; }

    for (const k of Object.keys(cvAccum)) cvAccum[k] += cv[k];

    if (f % sectionSize === 0 && timeline.length < 8) {
      const sec = (f * HOP / SAMPLE_RATE).toFixed(1);
      timeline.push({ sec, cv: { ...cv }, energy: result.energy, qubits: result.qubits.slice(), az: az.toFixed(0) });
    }
  }

  const pipeMs = performance.now() - t1;
  const msPerFrame = pipeMs / totalFrames;
  const avgE = sumE / totalFrames;
  for (const k of Object.keys(cvAccum)) cvAccum[k] /= totalFrames;

  console.log(`  \x1b[90mpipeline: ${totalFrames} frames · ${pipeMs.toFixed(0)}ms · ${msPerFrame.toFixed(3)}ms/frame\x1b[0m`);
  console.log(`  \x1b[90mbudget: ${(framesPerSec * msPerFrame).toFixed(1)}ms per real-sec (${msPerFrame < 1000 / framesPerSec ? '\x1b[92m✓ real-time capable' : '\x1b[91m✗ slower than real-time'}\x1b[0m\x1b[90m)\x1b[0m`);

  console.log(`\n  \x1b[1;93m── Average Control Vectors ──\x1b[0m`);
  const cvNames = ['sub', 'bass', 'loMid', 'mid', 'hiMid', 'pres', 'brill', 'air'];
  for (const k of cvNames) {
    console.log(`  ${k.padEnd(6)} ${colorBar(cvAccum[k])} ${cvAccum[k].toFixed(3)}`);
  }
  console.log(`  ${'energy'.padEnd(6)} ${colorBar(cvAccum.energy)} ${cvAccum.energy.toFixed(3)}`);
  console.log(`  ${'center'.padEnd(6)} \x1b[94m${bar(cvAccum.centroid / 32)}\x1b[0m ${cvAccum.centroid.toFixed(1)} / 64`);

  console.log(`\n  \x1b[1;93m── Quantum Energy ──\x1b[0m`);
  console.log(`  min: ${minE.toFixed(4)}  avg: ${avgE.toFixed(4)}  max: ${maxE.toFixed(4)}`);
  console.log(`  peak frame: #${peakFrame} (${(peakFrame * HOP / SAMPLE_RATE).toFixed(1)}s) energy=${peakEnergy.toFixed(3)}`);

  console.log(`\n  \x1b[1;93m── Timeline (8 sections) ──\x1b[0m`);
  console.log(`  ${'time'.padEnd(7)} ${'az°'.padEnd(5)} ${'sub'.padEnd(6)} ${'bass'.padEnd(6)} ${'mid'.padEnd(6)} ${'pres'.padEnd(6)} ${'brill'.padEnd(6)} energy    Q-energy`);
  for (const t of timeline) {
    const c = t.cv;
    console.log(`  ${(t.sec + 's').padEnd(7)} ${(t.az + '°').padEnd(5)} ${c.sub.toFixed(3).padEnd(6)} ${c.bass.toFixed(3).padEnd(6)} ${c.mid.toFixed(3).padEnd(6)} ${c.pres.toFixed(3).padEnd(6)} ${c.brill.toFixed(3).padEnd(6)} ${c.energy.toFixed(3).padEnd(9)} ${t.energy.toFixed(4)}`);
  }

  console.log(`\n  \x1b[1;93m── Qubit State (peak frame) ──\x1b[0m`);
  const peakBands = computeBands(samples, peakFrame * HOP);
  const peakCV = extractCV(peakBands);
  const peakParams = cvToParams(peakCV);
  const peakQ = qasSimulate(peakParams, (peakFrame / totalFrames) * 360, 0, peakCV.centroid * 700 + 200);
  for (let q = 0; q < 11; q++) {
    const v = peakQ.qubits[q];
    const p0 = ((1 + v) / 2 * 100).toFixed(0);
    const label = ['source', 'absorb₁', 'absorb₂', 'absorb₃', 'absorb₄', 'ild_L', 'refl', 'ild_R', 'refl₂', 'room_L', 'room_R'][q];
    console.log(`  q${q.toString().padEnd(2)} ${label.padEnd(9)} |0⟩=${p0.padStart(3)}% ${v > 0 ? '\x1b[92m' : '\x1b[91m'}${bar(Math.abs(v), 15)}\x1b[0m ${v.toFixed(4)}`);
  }

  return { name, duration, totalFrames, msPerFrame, avgE, cvAccum, peakFrame };
}

// ─── Run ───
console.log(`\x1b[1;95m⚛ μgrad Song Analysis — ACV → QAS 11-Qubit Pipeline\x1b[0m`);
console.log(`\x1b[90m  FFT: ${FFT_SIZE}-point · ${BANDS} bands · ${SAMPLE_RATE}Hz\x1b[0m`);

const results = [];
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`\x1b[91m✗ not found: ${f}\x1b[0m`); continue; }
  results.push(analyzeTrack(f));
}

if (results.length > 1) {
  console.log(`\n\x1b[1;95m${'═'.repeat(60)}\x1b[0m`);
  console.log(`\x1b[1;95m⚛ Comparison\x1b[0m`);
  console.log(`\x1b[1;95m${'═'.repeat(60)}\x1b[0m`);
  console.log(`  ${'track'.padEnd(30)} ${'dur'.padEnd(7)} ${'frames'.padEnd(8)} ${'ms/f'.padEnd(8)} ${'avgE'.padEnd(9)} ${'sub'.padEnd(6)} ${'bass'.padEnd(6)} ${'energy'.padEnd(6)}`);
  for (const r of results) {
    const c = r.cvAccum;
    console.log(`  ${r.name.substring(0, 28).padEnd(30)} ${r.duration.toFixed(1).padEnd(7)} ${String(r.totalFrames).padEnd(8)} ${r.msPerFrame.toFixed(2).padEnd(8)} ${r.avgE.toFixed(4).padEnd(9)} ${c.sub.toFixed(3).padEnd(6)} ${c.bass.toFixed(3).padEnd(6)} ${c.energy.toFixed(3)}`);
  }
}

console.log(`\n\x1b[92m✓ done\x1b[0m`);
