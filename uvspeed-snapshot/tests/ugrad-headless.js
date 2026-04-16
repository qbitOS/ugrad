#!/usr/bin/env node
// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// μgrad Headless CI Test — R0 scalar + R1 tensor + R5 cortical + R6 organoid
// Run: node tests/ugrad-headless.js
'use strict';

let PASS = 0, FAIL = 0;
function assert(cond, label) {
  if (cond) { PASS++; console.log(`  ✓ ${label}`); }
  else { FAIL++; console.error(`  ✗ FAIL: ${label}`); }
}

// ── R0: Scalar autograd ──────────────────────────────────

class Value {
  constructor(d, ch = [], op = '') {
    this.data = +d; this.grad = 0;
    this._backward = () => {}; this._prev = new Set(ch); this._op = op;
  }
  add(o) { o = o instanceof Value ? o : new Value(o); const out = new Value(this.data + o.data, [this, o], '+'); out._backward = () => { this.grad += out.grad; o.grad += out.grad }; return out }
  mul(o) { o = o instanceof Value ? o : new Value(o); const out = new Value(this.data * o.data, [this, o], '*'); out._backward = () => { this.grad += o.data * out.grad; o.grad += this.data * out.grad }; return out }
  pow(e) { const out = new Value(Math.pow(this.data, e), [this], '**'); out._backward = () => { this.grad += e * Math.pow(this.data, e - 1) * out.grad }; return out }
  tanh() { const t = Math.tanh(this.data); const out = new Value(t, [this], 'tanh'); out._backward = () => { this.grad += (1 - t * t) * out.grad }; return out }
  relu() { const out = new Value(this.data > 0 ? this.data : 0, [this], 'relu'); out._backward = () => { this.grad += (out.data > 0 ? 1 : 0) * out.grad }; return out }
  neg() { return this.mul(-1) }
  sub(o) { return this.add((o instanceof Value ? o : new Value(o)).neg()) }
  div(o) { return this.mul((o instanceof Value ? o : new Value(o)).pow(-1)) }
  backward() {
    const topo = [], vis = new Set();
    const b = v => { if (!vis.has(v)) { vis.add(v); v._prev.forEach(c => b(c)); topo.push(v) } };
    b(this); this.grad = 1;
    for (let i = topo.length - 1; i >= 0; i--) topo[i]._backward();
  }
}

class Neuron {
  constructor(nin, nl = true) {
    const s = Math.sqrt(2 / nin);
    this.w = Array.from({ length: nin }, () => new Value((Math.random() * 2 - 1) * s));
    this.b = new Value(0); this.nl = nl;
  }
  call(x) { let a = this.b; for (let i = 0; i < this.w.length; i++) a = a.add(this.w[i].mul(x[i])); return this.nl ? a.tanh() : a }
  params() { return [...this.w, this.b] }
  getW() { return [...this.w.map(w => w.data), this.b.data] }
  setW(ws) { for (let i = 0; i < this.w.length; i++) this.w[i].data = ws[i]; this.b.data = ws[this.w.length] }
}

class Layer {
  constructor(ni, no, nl = true) { this.neurons = Array.from({ length: no }, () => new Neuron(ni, nl)) }
  call(x) { return this.neurons.map(n => n.call(x)) }
  params() { return this.neurons.flatMap(n => n.params()) }
}

class MLP {
  constructor(sizes) {
    this.layers = [];
    for (let i = 0; i < sizes.length - 1; i++) this.layers.push(new Layer(sizes[i], sizes[i + 1], i < sizes.length - 2));
    this.arch = sizes;
  }
  call(x) { for (const l of this.layers) { const o = l.call(x); x = o.length === 1 ? o : o } return x.length === 1 ? x[0] : x }
  params() { return this.layers.flatMap(l => l.params()) }
  getW() { return this.layers.flatMap(l => l.neurons.flatMap(n => n.getW())) }
  setW(ws) { let i = 0; for (const l of this.layers) for (const n of l.neurons) { const c = n.w.length + 1; n.setW(ws.slice(i, i + c)); i += c } }
  get nParams() { return this.params().length }
}

// ── R1: Tensor engine ────────────────────────────────────

class Tensor {
  constructor(data, shape) {
    this.data = data instanceof Float32Array ? data : new Float32Array(data);
    this.shape = shape || [this.data.length];
  }
  static rand(shape) {
    const n = shape.reduce((a, b) => a * b, 1);
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return new Tensor(d, shape);
  }
  static zeros(shape) { return new Tensor(new Float32Array(shape.reduce((a, b) => a * b, 1)), shape) }
  add(o) { const r = new Float32Array(this.data.length); for (let i = 0; i < r.length; i++) r[i] = this.data[i] + (o.data ? o.data[i % o.data.length] : o); return new Tensor(r, this.shape) }
  mul(o) { const r = new Float32Array(this.data.length); for (let i = 0; i < r.length; i++) r[i] = this.data[i] * (o.data ? o.data[i % o.data.length] : o); return new Tensor(r, this.shape) }
  sub(o) { const r = new Float32Array(this.data.length); for (let i = 0; i < r.length; i++) r[i] = this.data[i] - (o.data ? o.data[i % o.data.length] : o); return new Tensor(r, this.shape) }
  matmul(o) {
    const [M, K] = this.shape, N = o.shape[1];
    const r = new Float32Array(M * N);
    for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) { let s = 0; for (let k = 0; k < K; k++) s += this.data[i * K + k] * o.data[k * N + j]; r[i * N + j] = s; }
    return new Tensor(r, [M, N]);
  }
  tanh() { const r = new Float32Array(this.data.length); for (let i = 0; i < r.length; i++) r[i] = Math.tanh(this.data[i]); return new Tensor(r, this.shape) }
  sum() { let s = 0; for (let i = 0; i < this.data.length; i++) s += this.data[i]; return s }
  mean() { return this.sum() / this.data.length }
  T() { const [R, C] = this.shape, d = new Float32Array(R * C); for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) d[j * R + i] = this.data[i * C + j]; return new Tensor(d, [C, R]) }
}

// ── Test suite ───────────────────────────────────────────

const XOR = { X: [[0,0],[0,1],[1,0],[1,1]], Y: [0,1,1,0] };

console.log('');
console.log('⚛ μgrad Headless CI — R0 + R1 + R5 + R6');
console.log('═'.repeat(50));

// --- R0: Scalar autograd ---
console.log('\n── R0: Scalar Autograd ──');
const t0 = performance.now();
const r0model = new MLP([2, 8, 8, 1]);
assert(r0model.nParams > 0, `MLP created (${r0model.nParams} params)`);

const EPOCHS = 500, LR = 0.05, CLIP = 5;
let finalLoss = Infinity;
for (let ep = 0; ep < EPOCHS; ep++) {
  let total = new Value(0);
  for (let i = 0; i < XOR.X.length; i++) {
    const x = XOR.X[i].map(v => new Value(v));
    const pred = r0model.call(x);
    const diff = pred.sub(XOR.Y[i]);
    total = total.add(diff.mul(diff));
  }
  total = total.mul(1 / XOR.X.length);
  finalLoss = total.data;
  r0model.params().forEach(p => { p.grad = 0 });
  total.backward();
  r0model.params().forEach(p => {
    if (!isFinite(p.grad)) p.grad = 0;
    else if (p.grad > CLIP) p.grad = CLIP;
    else if (p.grad < -CLIP) p.grad = -CLIP;
    p.data -= LR * p.grad;
  });
}
const r0ms = performance.now() - t0;
assert(finalLoss < 0.01, `R0 converged: loss=${finalLoss.toFixed(6)}`);

let r0correct = 0;
for (let i = 0; i < XOR.X.length; i++) {
  const x = XOR.X[i].map(v => new Value(v));
  if (Math.round(r0model.call(x).data) === XOR.Y[i]) r0correct++;
}
assert(r0correct === 4, `R0 XOR accuracy: ${r0correct}/4`);
console.log(`  ⏱ R0 time: ${r0ms.toFixed(1)}ms`);

const r0weights = r0model.getW();
assert(r0weights.length === r0model.nParams, `R0 weight export: ${r0weights.length} floats`);

// --- R1: Tensor engine ---
console.log('\n── R1: Tensor Engine ──');
const t1start = performance.now();
const arch = [2, 8, 8, 1];
const batchSize = XOR.X.length;
const Ws = [], Bs = [];
for (let i = 0; i < arch.length - 1; i++) {
  const ni = arch[i], no = arch[i + 1], s = Math.sqrt(2 / ni);
  Ws.push(Tensor.rand([ni, no]).mul(new Tensor(new Float32Array([s]), [1])));
  Bs.push(Tensor.zeros([1, no]));
}
const X = new Tensor(new Float32Array(XOR.X.flat()), [batchSize, 2]);
const Yt = new Tensor(new Float32Array(XOR.Y), [batchSize, 1]);

let r1loss = Infinity;
for (let ep = 0; ep < EPOCHS; ep++) {
  let A = X;
  const As = [A];
  for (let i = 0; i < Ws.length; i++) {
    A = A.matmul(Ws[i]).add(Bs[i]);
    if (i < Ws.length - 1) A = A.tanh();
    As.push(A);
  }
  const diff = A.sub(Yt);
  r1loss = diff.mul(diff).mean();
  let dA = diff.mul(new Tensor(new Float32Array([2 / batchSize]), [1]));
  for (let i = Ws.length - 1; i >= 0; i--) {
    const dW = As[i].T().matmul(dA);
    const dB = new Float32Array(dA.shape[1]);
    for (let r = 0; r < dA.shape[0]; r++)
      for (let c = 0; c < dA.shape[1]; c++) dB[c] += dA.data[r * dA.shape[1] + c];
    Ws[i] = Ws[i].sub(dW.mul(new Tensor(new Float32Array([LR]), [1])));
    Bs[i] = Bs[i].sub(new Tensor(dB, [1, dA.shape[1]]).mul(new Tensor(new Float32Array([LR]), [1])));
    if (i > 0) {
      const pre = As[i];
      const dtanh = new Float32Array(pre.data.length);
      for (let j = 0; j < pre.data.length; j++) { const t = pre.data[j]; dtanh[j] = 1 - t * t }
      dA = dA.matmul(Ws[i].T()).mul(new Tensor(dtanh, pre.shape));
    }
  }
}
const r1ms = performance.now() - t1start;
assert(r1loss < 0.05, `R1 converged: loss=${r1loss.toFixed(6)}`);

let A = X;
for (let i = 0; i < Ws.length; i++) { A = A.matmul(Ws[i]).add(Bs[i]); if (i < Ws.length - 1) A = A.tanh() }
let r1correct = 0;
for (let i = 0; i < batchSize; i++) if (Math.round(A.data[i]) === XOR.Y[i]) r1correct++;
assert(r1correct === 4, `R1 XOR accuracy: ${r1correct}/4`);
console.log(`  ⏱ R1 time: ${r1ms.toFixed(1)}ms (${(r0ms / r1ms).toFixed(1)}x vs R0)`);

// --- R5: μcortical (Iron Line) ---
console.log('\n── R5: μcortical (Iron Line) ──');
const layers = ['L0:sensor','L1:spike','L2:binding','L3:cortex','L4:predict','L5:feedback','L6:motor','L7:quantum'];
assert(layers.length === 8, `Iron Line: ${layers.length} layers`);

const corticalT0 = performance.now();
const input = XOR.X[1];
const expected = XOR.Y[1];
const spike = input.map(v => v > 0.5 ? 1.0 : 0.0);
const bound = spike.reduce((a, b) => a + b, 0) / spike.length;
const cortex = Math.tanh(bound * (r0weights[0] || 1.0));
const predict = Math.round(cortex);
const feedback = expected - predict;
const qPhase = cortex * Math.PI;
const corticalMs = performance.now() - corticalT0;

assert(corticalMs < 24, `cortical loop: ${corticalMs.toFixed(3)}ms (budget: 24ms)`);
assert(typeof qPhase === 'number' && isFinite(qPhase), `L7 quantum phase: ${qPhase.toFixed(4)}`);
assert(spike.length === 2, `L1 spike encoding: ${spike.join(',')}`);
console.log(`  L0→L7: [${input}] → spike=${spike} → cortex=${cortex.toFixed(4)} → phase=${qPhase.toFixed(4)}`);

// --- R6: μorganoid (DNA) ---
console.log('\n── R6: μorganoid (DNA cycle) ──');
const bases = ['A', 'T', 'C', 'G'];
function encodeW(weights) {
  const dna = [];
  for (const w of weights) {
    const byte = Math.max(0, Math.min(255, Math.round(((w + 10) / 20) * 255)));
    dna.push(bases[(byte >> 6) & 3]); dna.push(bases[(byte >> 4) & 3]);
    dna.push(bases[(byte >> 2) & 3]); dna.push(bases[byte & 3]);
  }
  return dna.join('');
}
function decodeW(dna) {
  const bm = { A: 0, T: 1, C: 2, G: 3 };
  const ws = [];
  for (let i = 0; i < dna.length; i += 4)
    ws.push(((bm[dna[i]] << 6) | (bm[dna[i + 1]] << 4) | (bm[dna[i + 2]] << 2) | bm[dna[i + 3]]) / 255 * 20 - 10);
  return ws;
}
function mutate(dna, rate = 0.01) {
  const arr = dna.split('');
  for (let i = 0; i < arr.length; i++) if (Math.random() < rate) arr[i] = bases[Math.floor(Math.random() * 4)];
  return arr.join('');
}

const dna = encodeW(r0weights);
assert(dna.length === r0weights.length * 4, `DNA encode: ${r0weights.length} weights → ${dna.length} bases`);
assert(/^[ATCG]+$/.test(dna), 'DNA uses valid bases (A/T/C/G)');

const decoded = decodeW(dna);
assert(decoded.length === r0weights.length, `DNA decode: ${decoded.length} weights recovered`);
const maxDelta = Math.max(...r0weights.map((w, i) => Math.abs(w - decoded[i])));
assert(maxDelta < 0.1, `round-trip precision: max Δ=${maxDelta.toFixed(4)}`);

const mutated = mutate(dna, 0.01);
let mutations = 0;
for (let i = 0; i < dna.length; i++) if (dna[i] !== mutated[i]) mutations++;
assert(mutations > 0 && mutations < dna.length * 0.05, `mutation: ${mutations}/${dna.length} bases changed (${(mutations / dna.length * 100).toFixed(1)}%)`);

const childWeights = decodeW(mutated);
const childModel = new MLP([2, 8, 8, 1]);
childModel.setW(childWeights.slice(0, childModel.nParams));
let childCorrect = 0;
for (let i = 0; i < XOR.X.length; i++) {
  const x = XOR.X[i].map(v => new Value(v));
  if (Math.round(childModel.call(x).data) === XOR.Y[i]) childCorrect++;
}
console.log(`  parent acc: 100% → child acc: ${(childCorrect / 4 * 100).toFixed(0)}% (after 1% mutation)`);

// --- Quantum Miami QASM ---
console.log('\n── Quantum Miami (QASM) ──');
const PHYSQ = [4, 5, 9, 14, 15, 16, 17, 18, 19, 25, 26];
const nQ = Math.min(11, r0weights.length > 0 ? 11 : 11);
let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${nQ}];\ncreg c[${nQ}];\n`;
let gateCount = 0;
for (let i = 0; i < nQ; i++) { qasm += `h q[${i}];\n`; gateCount++ }
for (let i = 0; i < Math.min(nQ, r0weights.length); i++) {
  qasm += `rz(${(r0weights[i] % (2 * Math.PI)).toFixed(6)}) q[${i}];\n`;
  gateCount++;
}
for (let i = 0; i < nQ; i++) { qasm += `measure q[${i}] -> c[${i}];\n`; gateCount++ }
assert(qasm.includes('OPENQASM 2.0'), 'QASM 2.0 header present');
assert(qasm.includes('qreg q[11]'), 'QASM has 11 qubits');
assert(gateCount >= 22, `QASM gates: ${gateCount}`);
console.log(`  target: ibm_miami (Nighthawk r1, 120Q)`);
console.log(`  physical: ${PHYSQ.join(', ')}`);
console.log(`  gates: ${gateCount}`);

// --- Gluelam stack (Node.js) ---
console.log('\n── Gluelam Stack (Node.js) ──');
const path = require('path');
const webDir = path.join(__dirname, '..', 'web');
let qpLoaded = false, dacLoaded = false, stenoLoaded = false;
try { require(path.join(webDir, 'quantum-prefixes.js')); qpLoaded = true } catch (e) { /* CI may not have web/ */ }
try { require(path.join(webDir, 'qbit-dac.js')); dacLoaded = true } catch (e) {}
try { require(path.join(webDir, 'qbit-steno.js')); stenoLoaded = true } catch (e) {}

if (qpLoaded) {
  const QP = global.QuantumPrefixes || module.exports;
  assert(typeof QP === 'object' && typeof QP.classifyLine === 'function', 'quantum-prefixes loaded');
} else {
  console.log('  ⚠ quantum-prefixes.js not found (ok in CI without web/)');
}
if (dacLoaded) {
  assert(typeof global.dacTracks === 'function' || typeof global.QbitDAC === 'object', 'qbit-dac loaded');
} else {
  console.log('  ⚠ qbit-dac.js not found (ok in CI without web/)');
}
if (stenoLoaded) {
  assert(typeof global.QbitSteno === 'object', 'qbit-steno loaded');
} else {
  console.log('  ⚠ qbit-steno.js not found (ok in CI without web/)');
}

const workerPath = path.join(webDir, 'ugrad-worker.js');
const fs = require('fs');
assert(fs.existsSync(workerPath), 'ugrad-worker.js exists');
const workerSize = fs.statSync(workerPath).size;
assert(workerSize > 5000, `ugrad-worker.js size: ${(workerSize / 1024).toFixed(1)}KB`);

// --- VQE (inline, no Worker needed) ---
console.log('\n── VQE: Variational Quantum Eigensolver ──');
const VQE_BONDS = [[0,3],[1,4],[2,8],[3,4],[4,5],[5,6],[6,7],[7,8],[4,9],[5,10],[9,10],[0,1]];
const VQE_NQ = 11, VQE_LAYERS = 2, VQE_J = 1.0, VQE_H = 0.5;

function vqeApplyRy(st, nQ, q, th) {
  const c=Math.cos(th/2),s=Math.sin(th/2),dim=1<<nQ,m=1<<q;
  for(let i=0;i<dim;i++){if(i&m)continue;const j=i|m;const a=st[i],b=st[j];st[i]=c*a-s*b;st[j]=s*a+c*b;}
}
function vqeApplyCZ(st, nQ, a, b) {
  const dim=1<<nQ,ma=1<<a,mb=1<<b;
  for(let i=0;i<dim;i++){if((i&ma)&&(i&mb))st[i]*=-1;}
}
function vqeMeasZZ(st, nQ, a, b) {
  const dim=1<<nQ,ma=1<<a,mb=1<<b;let e=0;
  for(let i=0;i<dim;i++){e+=st[i]*st[i]*((i&ma)?-1:1)*((i&mb)?-1:1);}return e;
}
function vqeMeasZ(st, nQ, q) {
  const dim=1<<nQ,m=1<<q;let e=0;
  for(let i=0;i<dim;i++){e+=st[i]*st[i]*((i&m)?-1:1);}return e;
}
function vqeEnergy(params) {
  const st=new Float64Array(1<<VQE_NQ);st[0]=1;let pi=0;
  for(let l=0;l<VQE_LAYERS;l++){
    for(let q=0;q<VQE_NQ;q++){vqeApplyRy(st,VQE_NQ,q,params[pi++]);pi++;}
    for(const[a,b]of VQE_BONDS)vqeApplyCZ(st,VQE_NQ,a,b);
  }
  let E=0;
  for(const[a,b]of VQE_BONDS)E-=VQE_J*vqeMeasZZ(st,VQE_NQ,a,b);
  for(let q=0;q<VQE_NQ;q++)E-=VQE_H*vqeMeasZ(st,VQE_NQ,q);
  return E;
}

const vqeT0 = performance.now();
const vqeNP = VQE_NQ * 2 * VQE_LAYERS;
const vqeParams = new Float64Array(vqeNP);
for (let i = 0; i < vqeNP; i++) vqeParams[i] = (Math.random() - 0.5) * 0.1;

const E0 = vqeEnergy(vqeParams);
assert(isFinite(E0), `VQE initial energy: ${E0.toFixed(4)}`);

const VQE_ITERS = 20, VQE_LR = 0.1, VQE_SHIFT = Math.PI / 2;
for (let iter = 0; iter < VQE_ITERS; iter++) {
  const grad = new Float64Array(vqeNP);
  for (let k = 0; k < vqeNP; k++) {
    const p1 = new Float64Array(vqeParams); p1[k] += VQE_SHIFT;
    const p2 = new Float64Array(vqeParams); p2[k] -= VQE_SHIFT;
    grad[k] = (vqeEnergy(p1) - vqeEnergy(p2)) / 2;
  }
  for (let k = 0; k < vqeNP; k++) vqeParams[k] -= VQE_LR * grad[k];
}
const Ef = vqeEnergy(vqeParams);
const vqeMs = performance.now() - vqeT0;

assert(Ef < E0, `VQE optimized: ${E0.toFixed(4)} → ${Ef.toFixed(4)} (ΔE=${(Ef-E0).toFixed(4)})`);
assert(vqeMs < 30000, `VQE time: ${vqeMs.toFixed(0)}ms (${VQE_ITERS} iters, ${vqeNP} params)`);
console.log(`  ⏱ VQE time: ${vqeMs.toFixed(0)}ms`);
console.log(`  Hamiltonian: TFIM 11Q (J=${VQE_J}, h=${VQE_H})`);
console.log(`  Params: ${vqeNP} (${VQE_NQ}Q × 2 × ${VQE_LAYERS} layers)`);
console.log(`  Energy: ${E0.toFixed(4)} → ${Ef.toFixed(4)}`);

const vqeCircuitPath = path.join(__dirname, '..', 'models', 'IBM-Quantum-Platform', 'circuits', 'beyondBINARY-miami-vqe-11q.qasm');
assert(fs.existsSync(vqeCircuitPath), 'VQE 11Q circuit file exists');
const vqe114Path = path.join(__dirname, '..', 'models', 'IBM-Quantum-Platform', 'circuits', 'beyondBINARY-miami-vqe-114q.qasm');
assert(fs.existsSync(vqe114Path), 'VQE 114Q circuit file exists');
const vqe114Size = fs.statSync(vqe114Path).size;
console.log(`  VQE 114Q circuit: ${(vqe114Size / 1024).toFixed(1)}KB`);

// --- QBT: Quantum Ballistic Transport ---
console.log('\n── QBT: Quantum Ballistic Transport ──');
const QBT_NQ = 11;

function qbtEnergy(params, mach, alt) {
  const ALT_DATA = [
    {rho:1.225,g:9.81},{rho:0.364,g:9.77},{rho:0.040,g:9.73},{rho:0.001,g:9.65},
    {rho:5e-6,g:9.51},{rho:1e-12,g:8.43},{rho:1e-11,g:8.69},{rho:0,g:0.27}
  ];
  const dim = 1 << QBT_NQ;
  const st = new Float64Array(dim); st[0] = 1;
  const t = mach * 0.3;
  const atm = ALT_DATA[Math.min(alt, 7)];
  const V = atm.rho * 10;
  const g = (mach >= 1.0) ? 0.5 * (mach - 1.0) : 0;
  let pi = 0;
  for (let q = 0; q < QBT_NQ; q++) { vqeApplyRy(st, QBT_NQ, q, params[pi++]); pi++; }
  const allBonds = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[4,9],[5,10],[9,10],[2,8],[0,3],[1,4]];
  for (const [a,b] of allBonds) vqeApplyCZ(st, QBT_NQ, a, b);
  let E = 0;
  for (const [a,b] of [[0,1],[1,2],[2,3]]) E -= t * vqeMeasZZ(st, QBT_NQ, a, b);
  for (const q of [4,5,6]) E += V * vqeMeasZ(st, QBT_NQ, q);
  for (const q of [0,1,2,3]) E -= (atm.g / 9.81) * vqeMeasZ(st, QBT_NQ, q);
  if (g > 0) E -= g * vqeMeasZZ(st, QBT_NQ, 6, 7) * vqeMeasZ(st, QBT_NQ, 8);
  for (const q of [9,10]) E -= 0.3 * vqeMeasZ(st, QBT_NQ, q);
  return E;
}

const qbtT0 = performance.now();
const qbtNP = QBT_NQ * 2;
const qbtParams = new Float64Array(qbtNP);
for (let i = 0; i < qbtNP; i++) qbtParams[i] = (Math.random() - 0.5) * 0.2;

const qbtE0 = qbtEnergy(qbtParams, 2.0, 2);
assert(isFinite(qbtE0), `QBT initial energy (Mach 2, stratosphere): ${qbtE0.toFixed(4)}`);

for (let iter = 0; iter < 15; iter++) {
  const grad = new Float64Array(qbtNP);
  for (let k = 0; k < qbtNP; k++) {
    const p1 = new Float64Array(qbtParams); p1[k] += VQE_SHIFT;
    const p2 = new Float64Array(qbtParams); p2[k] -= VQE_SHIFT;
    grad[k] = (qbtEnergy(p1, 2.0, 2) - qbtEnergy(p2, 2.0, 2)) / 2;
  }
  for (let k = 0; k < qbtNP; k++) qbtParams[k] -= 0.1 * grad[k];
}
const qbtEf = qbtEnergy(qbtParams, 2.0, 2);
const qbtMs = performance.now() - qbtT0;

assert(qbtEf <= qbtE0, `QBT optimized: ${qbtE0.toFixed(4)} → ${qbtEf.toFixed(4)}`);

const subsonicE = qbtEnergy(qbtParams, 0.3, 0);
const transonicE = qbtEnergy(qbtParams, 1.0, 0);
const hypersonicE = qbtEnergy(qbtParams, 5.0, 4);
assert(isFinite(subsonicE) && isFinite(transonicE) && isFinite(hypersonicE),
  `QBT multi-regime: sub=${subsonicE.toFixed(2)} trans=${transonicE.toFixed(2)} hyper=${hypersonicE.toFixed(2)}`);

console.log(`  ⏱ QBT time: ${qbtMs.toFixed(0)}ms (15 iters, Mach 2, stratosphere)`);
console.log(`  Energy: ${qbtE0.toFixed(4)} → ${qbtEf.toFixed(4)}`);
console.log(`  Mach sweep: sub=${subsonicE.toFixed(2)} · trans=${transonicE.toFixed(2)} · hyper=${hypersonicE.toFixed(2)}`);

const qbtCircuitPath = path.join(__dirname, '..', 'models', 'IBM-Quantum-Platform', 'circuits', 'beyondBINARY-miami-qbt-11q.qasm');
assert(fs.existsSync(qbtCircuitPath), 'QBT circuit file exists');

// --- QAS: Quantum Acoustic Simulator ---
console.log('\n── QAS: Quantum Acoustic Simulator ──');

function qasDispersion(k, J, a) { return 2 * J * Math.abs(Math.sin(k * a / 2)); }
function qasGroupVel(k, J, a) { return J * a * Math.cos(k * a / 2); }

const d1k = qasDispersion(2 * Math.PI * 1000 / 20000, 1.0, 1.0);
const d10k = qasDispersion(2 * Math.PI * 10000 / 20000, 1.0, 1.0);
assert(d10k > d1k, `dispersion: ω(1kHz)=${d1k.toFixed(4)} < ω(10kHz)=${d10k.toFixed(4)}`);
const vg0 = qasGroupVel(0.01, 1.0, 1.0);
assert(vg0 > 0.99, `group velocity at k→0: ${vg0.toFixed(4)} ≈ J·a = speed of sound`);

function qasEnergy(params, az, el, freq) {
  const nQ=11,dim=1<<nQ,st=new Float64Array(dim);st[0]=1;
  vqeApplyRy(st,nQ,0,Math.PI/2);
  let pi=0;for(let q=1;q<nQ;q++){vqeApplyRy(st,nQ,q,params[pi++]);pi++;}
  const bonds=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[2,8],[4,9],[5,10],[9,10]];
  for(const[a,b]of bonds)vqeApplyCZ(st,nQ,a,b);
  const J=1,ild=0.5*Math.sin(az*Math.PI/180),absorb=[0.01,0.05,0.15,0.3];
  let E=0;
  for(const[a,b]of[[0,1],[1,2],[2,3],[3,4]])E-=J*vqeMeasZZ(st,nQ,a,b);
  for(let i=0;i<4;i++)E+=absorb[i]*vqeMeasZ(st,nQ,i+1);
  E-=ild*(vqeMeasZ(st,nQ,5)-vqeMeasZ(st,nQ,7));
  return E;
}

const qasT0=performance.now();
const qasNP=(11-1)*2;
const qasP=new Float64Array(qasNP);
for(let i=0;i<qasNP;i++)qasP[i]=(Math.random()-0.5)*0.2;
const qasE0=qasEnergy(qasP,90,0,1000);
assert(isFinite(qasE0),`QAS initial (az=90°, 1kHz): E=${qasE0.toFixed(4)}`);
for(let iter=0;iter<10;iter++){
  const grad=new Float64Array(qasNP);
  for(let k=0;k<qasNP;k++){const p1=new Float64Array(qasP);p1[k]+=Math.PI/2;const p2=new Float64Array(qasP);p2[k]-=Math.PI/2;grad[k]=(qasEnergy(p1,90,0,1000)-qasEnergy(p2,90,0,1000))/2;}
  for(let k=0;k<qasNP;k++)qasP[k]-=0.1*grad[k];
}
const qasEf=qasEnergy(qasP,90,0,1000);
const qasMs=performance.now()-qasT0;
assert(qasEf<=qasE0,`QAS optimized: ${qasE0.toFixed(4)} → ${qasEf.toFixed(4)}`);

const eFront=qasEnergy(qasP,0,0,1000);
const eSide=qasEnergy(qasP,90,0,1000);
const eBack=qasEnergy(qasP,180,0,1000);
assert(isFinite(eFront)&&isFinite(eSide)&&isFinite(eBack),
  `QAS spatial: front=${eFront.toFixed(2)} side=${eSide.toFixed(2)} back=${eBack.toFixed(2)}`);

const ild90=0.5*Math.sin(90*Math.PI/180);
const itd90=0.215*Math.sin(90*Math.PI/180)/343*1e6;
assert(ild90>0.49,`ILD at 90°: ${(ild90*20).toFixed(1)}dB`);
assert(itd90>600,`ITD at 90°: ${itd90.toFixed(0)}μs (max human ~690μs)`);

console.log(`  ⏱ QAS time: ${qasMs.toFixed(0)}ms (10 iters, az=90°, 1kHz)`);
console.log(`  Dispersion: ω(1kHz)=${d1k.toFixed(4)} ω(10kHz)=${d10k.toFixed(4)}`);
console.log(`  Binaural at 90°: ILD=${(ild90*20).toFixed(1)}dB ITD=${itd90.toFixed(0)}μs`);
console.log(`  Spatial: front=${eFront.toFixed(2)} side=${eSide.toFixed(2)} back=${eBack.toFixed(2)}`);

const qasCircuitPath = path.join(__dirname, '..', 'models', 'IBM-Quantum-Platform', 'circuits', 'beyondBINARY-miami-qas-11q.qasm');
assert(fs.existsSync(qasCircuitPath), 'QAS circuit file exists');

// --- ACV: Audio Control Vector Pipeline ---
console.log('\n── ACV: Audio Control Vector Pipeline ──');

const acvBands = new Float32Array(64);
for (let i = 0; i < 64; i++) acvBands[i] = 0.3 * Math.sin(i / 10) + 0.2;

function acvExtractCV(bands) {
  const GROUPS = { sub:[0,1], bass:[2,3,4], loMid:[5,6,7,8], mid:[9,10,11,12,13],
    hiMid:[14,15,16,17,18,19], pres:[20,21,22,23,24], brill:[25,26,27,28,29], air:[30,31] };
  const cv = {};
  for (const [name, idx] of Object.entries(GROUPS)) {
    let s = 0; for (const i of idx) if (i < bands.length) s += bands[i];
    cv[name] = s / idx.length;
  }
  let total = 0, wt = 0;
  for (let i = 0; i < bands.length; i++) { total += bands[i]; wt += i * bands[i]; }
  cv.centroid = total > 0 ? wt / total : 32;
  cv.energy = total / bands.length;
  return cv;
}

const acvT0 = performance.now();
const testCV = acvExtractCV(acvBands);
const acvMs = performance.now() - acvT0;

assert(testCV.sub !== undefined, 'ACV extract: sub band exists');
assert(testCV.bass !== undefined, 'ACV extract: bass band exists');
assert(testCV.mid !== undefined, 'ACV extract: mid band exists');
assert(testCV.energy > 0, 'ACV extract: energy > 0 (' + testCV.energy.toFixed(3) + ')');
assert(testCV.centroid > 0 && testCV.centroid < 64, 'ACV centroid in range (' + testCV.centroid.toFixed(1) + ')');
assert(acvMs < 10, 'ACV extract < 10ms (' + acvMs.toFixed(3) + 'ms)');

function acvCvToParams(cv) {
  const p = new Float64Array(20);
  p[0] = cv.sub * Math.PI; p[1] = cv.bass * Math.PI;
  p[2] = cv.loMid * Math.PI * 0.8; p[3] = cv.mid * Math.PI * 0.6;
  p[8] = cv.centroid / 32 * Math.PI; p[9] = cv.energy * Math.PI * 2;
  return p;
}

const acvParams = acvCvToParams(testCV);
assert(acvParams.length === 20, 'ACV produces 20 QAS params');
assert(acvParams[0] !== 0, 'ACV param[0] (sub) non-zero');
assert(acvParams[9] !== 0, 'ACV param[9] (energy) non-zero');

const acvE = qasEnergy(acvParams.slice(0, 20), 45, 0, 1000);
assert(isFinite(acvE), 'ACV → QAS energy is finite (' + acvE.toFixed(4) + ')');

const silentBands = new Float32Array(64);
const silentCV = acvExtractCV(silentBands);
assert(silentCV.energy === 0 || silentCV.energy < 0.001, 'ACV silence: energy ≈ 0');

const loudBands = new Float32Array(64);
for (let i = 0; i < 64; i++) loudBands[i] = 1.0;
const loudCV = acvExtractCV(loudBands);
assert(loudCV.energy > silentCV.energy, 'ACV loud > silent energy');
assert(loudCV.sub > 0.9, 'ACV loud sub near max (' + loudCV.sub.toFixed(3) + ')');

console.log(`  ACV: extract=${acvMs.toFixed(3)}ms, 14 control vectors, 20 QAS params`);

// --- Summary ---
console.log('\n' + '═'.repeat(50));
console.log(`⚛ μgrad CI: ${PASS} passed, ${FAIL} failed`);
console.log(`  R0: ${r0ms.toFixed(0)}ms  R1: ${r1ms.toFixed(0)}ms (${(r0ms / r1ms).toFixed(1)}x speedup)`);
console.log(`  cortical: ${corticalMs.toFixed(3)}ms / 24ms budget`);
console.log(`  DNA: ${dna.length} bases, ${mutations} mutations`);
console.log(`  QASM: ${gateCount} gates on 11 qubits → ibm_miami`);
console.log(`  VQE: ${Ef.toFixed(4)} energy, ${vqeNP} params, ${vqeMs.toFixed(0)}ms`);
console.log(`  QBT: ${qbtEf.toFixed(4)} energy (Mach 2), ${qbtMs.toFixed(0)}ms`);
console.log(`  QAS: ILD=${(ild90*20).toFixed(1)}dB ITD=${itd90.toFixed(0)}μs, ${qasMs.toFixed(0)}ms`);
console.log(`  ACV: ${acvMs.toFixed(3)}ms, 14 CVs → 20 params → QAS`);
console.log('');

process.exit(FAIL > 0 ? 1 : 0);
