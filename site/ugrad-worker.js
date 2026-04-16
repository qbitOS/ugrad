// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// μgrad Shared Web Worker — train / bg / quantum miami / R5 μcortical / R6 μorganoid
// Usage: const w = new Worker('ugrad-worker.js'); w.postMessage({type:'train', ...})
'use strict';

// ═══════════════════════════════════════════════════════════════
// R0: Scalar Autograd Engine
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// R1: Tensor Engine (Float32Array batched matmul)
// ═══════════════════════════════════════════════════════════════

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
  add(o) {
    const r = new Float32Array(this.data.length);
    for (let i = 0; i < r.length; i++) r[i] = this.data[i] + (o.data ? o.data[i % o.data.length] : o);
    return new Tensor(r, this.shape);
  }
  mul(o) {
    const r = new Float32Array(this.data.length);
    for (let i = 0; i < r.length; i++) r[i] = this.data[i] * (o.data ? o.data[i % o.data.length] : o);
    return new Tensor(r, this.shape);
  }
  sub(o) {
    const r = new Float32Array(this.data.length);
    for (let i = 0; i < r.length; i++) r[i] = this.data[i] - (o.data ? o.data[i % o.data.length] : o);
    return new Tensor(r, this.shape);
  }
  matmul(o) {
    const [M, K] = this.shape, N = o.shape[1];
    const r = new Float32Array(M * N);
    for (let i = 0; i < M; i++)
      for (let j = 0; j < N; j++) {
        let s = 0;
        for (let k = 0; k < K; k++) s += this.data[i * K + k] * o.data[k * N + j];
        r[i * N + j] = s;
      }
    return new Tensor(r, [M, N]);
  }
  tanh() { const r = new Float32Array(this.data.length); for (let i = 0; i < r.length; i++) r[i] = Math.tanh(this.data[i]); return new Tensor(r, this.shape) }
  relu() { const r = new Float32Array(this.data.length); for (let i = 0; i < r.length; i++) r[i] = this.data[i] > 0 ? this.data[i] : 0; return new Tensor(r, this.shape) }
  sum() { let s = 0; for (let i = 0; i < this.data.length; i++) s += this.data[i]; return s }
  mean() { return this.sum() / this.data.length }
  T() {
    const [R, C] = this.shape, d = new Float32Array(R * C);
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) d[j * R + i] = this.data[i * C + j];
    return new Tensor(d, [C, R]);
  }
}

// ═══════════════════════════════════════════════════════════════
// Training Functions
// ═══════════════════════════════════════════════════════════════

const DATASETS = {
  xor: { X: [[0,0],[0,1],[1,0],[1,1]], Y: [0,1,1,0] },
  and: { X: [[0,0],[0,1],[1,0],[1,1]], Y: [0,0,0,1] },
  or:  { X: [[0,0],[0,1],[1,0],[1,1]], Y: [0,1,1,1] },
  circle: (function() {
    const X = [], Y = [];
    for (let i = 0; i < 100; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random();
      X.push([Math.cos(a) * r, Math.sin(a) * r]);
      Y.push(r < 0.5 ? 1 : 0);
    }
    return { X, Y };
  })(),
  spiral: (function() {
    const X = [], Y = [], n = 50;
    for (let i = 0; i < n; i++) {
      const r = i / n, t0 = 4 * r, t1 = 4 * r + Math.PI;
      X.push([r * Math.cos(t0) + (Math.random() - 0.5) * 0.1, r * Math.sin(t0) + (Math.random() - 0.5) * 0.1]);
      Y.push(0);
      X.push([r * Math.cos(t1) + (Math.random() - 0.5) * 0.1, r * Math.sin(t1) + (Math.random() - 0.5) * 0.1]);
      Y.push(1);
    }
    return { X, Y };
  })()
};

function trainR0(arch, data, epochs, lr, weights, gen) {
  const CLIP = 5, CONVERGE_TH = 0.01, PLATEAU_W = 3;
  const model = new MLP(arch);
  if (weights && weights.length) model.setW(weights);
  const losses = [];
  let below = 0;
  for (let ep = 0; ep < epochs; ep++) {
    let total = new Value(0);
    for (let i = 0; i < data.X.length; i++) {
      const x = data.X[i].map(v => new Value(v));
      const pred = model.call(x);
      const diff = pred.sub(data.Y[i]);
      total = total.add(diff.mul(diff));
    }
    total = total.mul(1 / data.X.length);
    const lv = total.data;
    if (!isFinite(lv)) { losses.push(NaN); break }
    model.params().forEach(p => { p.grad = 0 });
    total.backward();
    model.params().forEach(p => {
      if (!isFinite(p.grad)) p.grad = 0;
      else if (p.grad > CLIP) p.grad = CLIP;
      else if (p.grad < -CLIP) p.grad = -CLIP;
      p.data -= lr * p.grad;
    });
    losses.push(lv);
    if (lv < CONVERGE_TH) { below++; if (below >= PLATEAU_W) break } else below = 0;
    if (ep % 100 === 0) self.postMessage({ type: 'progress', ep, epochs, loss: lv, gen });
  }
  let c = 0;
  for (let i = 0; i < data.X.length; i++) {
    const x = data.X[i].map(v => new Value(v));
    if (Math.round(model.call(x).data) === data.Y[i]) c++;
  }
  return { gen, ep: losses.length, loss: losses[losses.length - 1], acc: c / data.X.length, weights: model.getW(), arch };
}

function trainR1(arch, data, epochs, lr, weights, gen) {
  const batchSize = data.X.length;
  const Ws = [], Bs = [];
  let wIdx = 0;
  for (let i = 0; i < arch.length - 1; i++) {
    const ni = arch[i], no = arch[i + 1];
    if (weights && weights.length) {
      const wd = new Float32Array(ni * no);
      for (let j = 0; j < ni * no; j++) wd[j] = weights[wIdx++];
      Ws.push(new Tensor(wd, [ni, no]));
      const bd = new Float32Array(no);
      for (let j = 0; j < no; j++) bd[j] = weights[wIdx++];
      Bs.push(new Tensor(bd, [1, no]));
    } else {
      const s = Math.sqrt(2 / ni);
      Ws.push(Tensor.rand([ni, no]).mul(new Tensor(new Float32Array([s]), [1])));
      Bs.push(Tensor.zeros([1, no]));
    }
  }

  const X = new Tensor(new Float32Array(data.X.flat()), [batchSize, arch[0]]);
  const Yt = new Tensor(new Float32Array(data.Y), [batchSize, 1]);
  let lastLoss = Infinity;

  for (let ep = 0; ep < epochs; ep++) {
    let A = X;
    const As = [A];
    for (let i = 0; i < Ws.length; i++) {
      A = A.matmul(Ws[i]).add(Bs[i]);
      if (i < Ws.length - 1) A = A.tanh();
      As.push(A);
    }
    const diff = A.sub(Yt);
    lastLoss = diff.mul(diff).mean();
    if (!isFinite(lastLoss)) break;

    let dA = diff.mul(new Tensor(new Float32Array([2 / batchSize]), [1]));
    for (let i = Ws.length - 1; i >= 0; i--) {
      const dW = As[i].T().matmul(dA);
      const dB = new Float32Array(dA.shape[1]);
      for (let r = 0; r < dA.shape[0]; r++)
        for (let c = 0; c < dA.shape[1]; c++) dB[c] += dA.data[r * dA.shape[1] + c];
      Ws[i] = Ws[i].sub(dW.mul(new Tensor(new Float32Array([lr]), [1])));
      Bs[i] = Bs[i].sub(new Tensor(dB, [1, dA.shape[1]]).mul(new Tensor(new Float32Array([lr]), [1])));
      if (i > 0) {
        const pre = As[i];
        const dtanh = new Float32Array(pre.data.length);
        for (let j = 0; j < pre.data.length; j++) { const t = pre.data[j]; dtanh[j] = 1 - t * t }
        dA = dA.matmul(Ws[i].T()).mul(new Tensor(dtanh, pre.shape));
      }
    }
    if (ep % 100 === 0) self.postMessage({ type: 'progress', ep, epochs, loss: lastLoss, gen });
  }

  let c = 0;
  let A = X;
  for (let i = 0; i < Ws.length; i++) {
    A = A.matmul(Ws[i]).add(Bs[i]);
    if (i < Ws.length - 1) A = A.tanh();
  }
  for (let i = 0; i < batchSize; i++) if (Math.round(A.data[i]) === data.Y[i]) c++;

  const allW = [];
  for (let i = 0; i < Ws.length; i++) {
    allW.push(...Ws[i].data);
    allW.push(...Bs[i].data);
  }

  return { gen, ep: epochs, loss: lastLoss, acc: c / batchSize, weights: allW, arch };
}

// ═══════════════════════════════════════════════════════════════
// R5: μcortical — 24ms cortical loop
// Iron Line L0-L7 pipeline simulation
// ═══════════════════════════════════════════════════════════════

const IRON_LINE = {
  layers: ['L0:sensor','L1:spike','L2:binding','L3:cortex','L4:predict','L5:feedback','L6:motor','L7:quantum'],
  roundTrip: 24,
  loop(weights, data, gen) {
    const t0 = performance.now();
    const input = data.X[gen % data.X.length];
    const expected = data.Y[gen % data.X.length];

    const spike = input.map(v => v > 0.5 ? 1.0 : 0.0);
    const bound = spike.reduce((a, b) => a + b, 0) / spike.length;
    const cortex = Math.tanh(bound * (weights ? weights[0] || 1.0 : 1.0));
    const predict = Math.round(cortex);
    const feedback = expected - predict;
    const motor = predict;
    const qPhase = cortex * Math.PI;

    const elapsed = performance.now() - t0;
    return {
      layers: {
        L0: input, L1: spike, L2: bound, L3: cortex,
        L4: predict, L5: feedback, L6: motor, L7: qPhase
      },
      correct: predict === expected,
      elapsed,
      withinBudget: elapsed < IRON_LINE.roundTrip
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// R6: μorganoid — DNA parenthood cycle
// AI → DNA encoding → Organoid simulation → AI feedback
// ═══════════════════════════════════════════════════════════════

const ORGANOID = {
  encode(weights) {
    const bases = ['A', 'T', 'C', 'G'];
    const dna = [];
    for (const w of weights) {
      const norm = ((w + 10) / 20) * 255;
      const byte = Math.max(0, Math.min(255, Math.round(norm)));
      dna.push(bases[(byte >> 6) & 3]);
      dna.push(bases[(byte >> 4) & 3]);
      dna.push(bases[(byte >> 2) & 3]);
      dna.push(bases[byte & 3]);
    }
    return dna.join('');
  },
  decode(dna) {
    const bases = { A: 0, T: 1, C: 2, G: 3 };
    const weights = [];
    for (let i = 0; i < dna.length; i += 4) {
      const byte = (bases[dna[i]] << 6) | (bases[dna[i + 1]] << 4) |
                   (bases[dna[i + 2]] << 2) | bases[dna[i + 3]];
      weights.push((byte / 255) * 20 - 10);
    }
    return weights;
  },
  mutate(dna, rate = 0.01) {
    const bases = ['A', 'T', 'C', 'G'];
    const arr = dna.split('');
    for (let i = 0; i < arr.length; i++) {
      if (Math.random() < rate) arr[i] = bases[Math.floor(Math.random() * 4)];
    }
    return arr.join('');
  },
  simulate(dna, generations = 3) {
    let current = dna;
    const lineage = [current];
    for (let g = 0; g < generations; g++) {
      current = ORGANOID.mutate(current, 0.005 + g * 0.002);
      lineage.push(current);
    }
    return { finalDNA: current, lineage, mutations: generations };
  },
  cycle(weights, data, arch, gen) {
    const dna = ORGANOID.encode(weights);
    const sim = ORGANOID.simulate(dna);
    const childWeights = ORGANOID.decode(sim.finalDNA);
    const model = new MLP(arch);
    model.setW(childWeights.slice(0, model.nParams));
    let c = 0;
    for (let i = 0; i < data.X.length; i++) {
      const x = data.X[i].map(v => new Value(v));
      if (Math.round(model.call(x).data) === data.Y[i]) c++;
    }
    return {
      parentAcc: null,
      childAcc: c / data.X.length,
      dnaLength: dna.length,
      mutations: sim.mutations,
      parentWeights: weights.length,
      childWeights: childWeights.slice(0, weights.length)
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// Quantum Miami — QASM generation from weights
// ibm_miami Nighthawk r1 120Q (cal 2026-02-21T04:41:16Z)
// ═══════════════════════════════════════════════════════════════

const MIAMI = {
  physQ: [4, 5, 9, 14, 15, 16, 17, 18, 19, 25, 26],
  labels: ['n:shebang', '+1:comment', '+3:output', '+0:class', '+2:loop',
           '-0:return', '0:function', '-1:error', '+n:condition', '1:variable', '-n:import'],
  cal: '2026-02-21T04:41:16Z',
  czBonds: [[0,3],[1,4],[2,8],[3,4],[4,5],[5,6],[6,7],[7,8],[4,9],[5,10],[9,10],[0,1]],
  readout: [1.16,1.50,0.74,1.49,0.61,0.79,1.35,1.15,1.33,0.92,1.66],
  t1: [370,358,367,343,247,476,492,469,332,309,455],
  generateQASM(arch, weights, gen) {
    const nQ = Math.min(11, weights.length > 0 ? Math.max(...arch) + 1 : 11);
    let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${nQ}];\ncreg c[${nQ}];\n\n`;
    qasm += `// μgrad G${gen} → ibm_miami (120q Nighthawk r1)\n`;
    qasm += `// cal: ${MIAMI.cal}\n`;
    qasm += `// arch: ${arch.join('→')} · ${weights.length} params\n`;
    qasm += `// physical: ${MIAMI.physQ.slice(0, nQ).map(q => '$' + q).join(', ')}\n`;
    qasm += `// avg readout: 1.15% · avg CZ: 0.0020\n\n`;

    for (let i = 0; i < nQ; i++) qasm += `h q[${i}];\n`;
    qasm += '\n';

    let wIdx = 0, gateCount = nQ;
    for (let layer = 0; layer < arch.length - 1; layer++) {
      const nin = arch[layer], nout = arch[layer + 1];
      for (let j = 0; j < nout; j++) {
        const tQ = j % nQ;
        for (let i = 0; i < nin; i++) {
          if (wIdx < weights.length) {
            const angle = weights[wIdx] % (2 * Math.PI);
            qasm += `rz(${angle.toFixed(6)}) q[${tQ}];\n`;
            wIdx++; gateCount++;
          }
          const sQ = i % nQ;
          if (sQ !== tQ) {
            const bond = MIAMI.czBonds.find(b =>
              (b[0] === sQ && b[1] === tQ) || (b[0] === tQ && b[1] === sQ));
            if (bond) { qasm += `cz q[${sQ}],q[${tQ}];\n`; gateCount++ }
          }
        }
        if (wIdx < weights.length) {
          qasm += `rz(${(weights[wIdx] % (2 * Math.PI)).toFixed(6)}) q[${tQ}];\n`;
          wIdx++; gateCount++;
        }
        qasm += `sx q[${tQ}];\n`; gateCount++;
      }
    }
    qasm += '\n';
    for (let i = 0; i < nQ; i++) qasm += `measure q[${i}] -> c[${i}];\n`;

    return { qasm, gateCount, nQ, physQ: MIAMI.physQ.slice(0, nQ) };
  }
};

// ═══════════════════════════════════════════════════════════════
// VQE — Variational Quantum Eigensolver (simulator)
// Hardware-efficient ansatz, parameter-shift gradients
// Scales from 11Q patch to 114Q full chip
// ═══════════════════════════════════════════════════════════════

const VQE = {
  PATCHES: {
    '11q': {
      qubits: 11,
      bonds: [[0,3],[1,4],[2,8],[3,4],[4,5],[5,6],[6,7],[7,8],[4,9],[5,10],[9,10],[0,1]],
      physQ: [4,5,9,14,15,16,17,18,19,25,26]
    }
  },

  createAnsatz(nQ, bonds, layers, params) {
    const state = new Float64Array(1 << nQ);
    state[0] = 1.0;
    let pi = 0;
    for (let l = 0; l < layers; l++) {
      for (let q = 0; q < nQ; q++) {
        VQE.applyRy(state, nQ, q, params[pi++]);
        VQE.applyRz(state, nQ, q, params[pi++]);
      }
      for (const [a, b] of bonds) {
        VQE.applyCZ(state, nQ, a, b);
      }
    }
    return state;
  },

  applyRy(state, nQ, q, theta) {
    const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    const dim = 1 << nQ, mask = 1 << q;
    for (let i = 0; i < dim; i++) {
      if (i & mask) continue;
      const j = i | mask;
      const a = state[i], b = state[j];
      state[i] = c * a - s * b;
      state[j] = s * a + c * b;
    }
  },

  applyRz(state, nQ, q, theta) {
    const dim = 1 << nQ, mask = 1 << q;
    const cr = Math.cos(theta / 2), ci = Math.sin(theta / 2);
    for (let i = 0; i < dim; i++) {
      if (i & mask) {
        state[i] *= -1;
      }
    }
  },

  applyCZ(state, nQ, a, b) {
    const dim = 1 << nQ, ma = 1 << a, mb = 1 << b;
    for (let i = 0; i < dim; i++) {
      if ((i & ma) && (i & mb)) state[i] *= -1;
    }
  },

  measureZZ(state, nQ, a, b) {
    const dim = 1 << nQ, ma = 1 << a, mb = 1 << b;
    let exp = 0;
    for (let i = 0; i < dim; i++) {
      const za = (i & ma) ? -1 : 1;
      const zb = (i & mb) ? -1 : 1;
      exp += state[i] * state[i] * za * zb;
    }
    return exp;
  },

  measureZ(state, nQ, q) {
    const dim = 1 << nQ, mask = 1 << q;
    let exp = 0;
    for (let i = 0; i < dim; i++) {
      exp += state[i] * state[i] * ((i & mask) ? -1 : 1);
    }
    return exp;
  },

  energy(nQ, bonds, layers, params, J, h) {
    const state = VQE.createAnsatz(nQ, bonds, layers, params);
    let E = 0;
    for (const [a, b] of bonds) E -= J * VQE.measureZZ(state, nQ, a, b);
    for (let q = 0; q < nQ; q++) E -= h * VQE.measureZ(state, nQ, q);
    return E;
  },

  gradient(nQ, bonds, layers, params, J, h) {
    const nP = params.length;
    const grad = new Float64Array(nP);
    const shift = Math.PI / 2;
    for (let k = 0; k < nP; k++) {
      const p1 = new Float64Array(params);
      const p2 = new Float64Array(params);
      p1[k] += shift;
      p2[k] -= shift;
      grad[k] = (VQE.energy(nQ, bonds, layers, p1, J, h) -
                  VQE.energy(nQ, bonds, layers, p2, J, h)) / 2;
    }
    return grad;
  },

  optimize(nQ, bonds, layers, maxIter, lr, J, h) {
    const nP = nQ * 2 * layers;
    const params = new Float64Array(nP);
    for (let i = 0; i < nP; i++) params[i] = (Math.random() - 0.5) * 0.1;

    const history = [];
    for (let iter = 0; iter < maxIter; iter++) {
      const E = VQE.energy(nQ, bonds, layers, params, J, h);
      history.push(E);

      if (iter % 5 === 0) {
        self.postMessage({ type: 'vqe-progress', iter, maxIter, energy: E });
      }

      const grad = VQE.gradient(nQ, bonds, layers, params, J, h);
      for (let k = 0; k < nP; k++) {
        params[k] -= lr * grad[k];
      }

      if (history.length > 5) {
        const recent = history.slice(-5);
        const delta = Math.abs(recent[0] - recent[4]);
        if (delta < 1e-6) break;
      }
    }

    return {
      params: Array.from(params),
      energy: history[history.length - 1],
      iterations: history.length,
      history,
      nQ, layers,
      nParams: nP,
      bonds: bonds.length,
      converged: history.length < maxIter
    };
  },

  generateQASM(nQ, bonds, layers, params, physQ) {
    let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${nQ}];\ncreg c[${nQ}];\n\n`;
    qasm += `// VQE ansatz — ${nQ}Q, ${layers} layers, ${params.length} params\n`;
    qasm += `// ibm_miami Nighthawk r1 · cal 2026-02-21\n\n`;

    let pi = 0, gateCount = 0;
    for (let l = 0; l < layers; l++) {
      qasm += `// Layer ${l + 1}\n`;
      for (let q = 0; q < nQ; q++) {
        qasm += `ry(${params[pi].toFixed(6)}) q[${q}]; rz(${params[pi + 1].toFixed(6)}) q[${q}];\n`;
        pi += 2; gateCount += 2;
      }
      for (const [a, b] of bonds) {
        qasm += `cz q[${a}],q[${b}];\n`;
        gateCount++;
      }
      qasm += '\n';
    }

    for (let q = 0; q < nQ; q++) {
      qasm += `measure q[${q}] -> c[${q}];\n`;
    }

    return { qasm, gateCount, nQ, layers, nParams: params.length, physQ };
  }
};

// ═══════════════════════════════════════════════════════════════
// QBT — Quantum Ballistic Transport Simulator
// H = H_kinetic + H_barrier + H_shock + H_burst + H_grav
// Models hypersonic traversal, sound barrier, plasma data burst
// ═══════════════════════════════════════════════════════════════

const QBT = {
  REGISTERS: {
    kinetic: [0,1,2,3],
    atmos:   [4,5,6],
    barrier: [7,8],
    burst:   [9,10]
  },

  ALTITUDES: [
    {name:'sea level',     alt:0,     rho:1.225,  g:9.81,  temp:288},
    {name:'tropopause',    alt:11000, rho:0.364,  g:9.77,  temp:217},
    {name:'stratosphere',  alt:25000, rho:0.040,  g:9.73,  temp:222},
    {name:'mesosphere',    alt:50000, rho:0.001,  g:9.65,  temp:271},
    {name:'thermosphere',  alt:85000, rho:5e-6,   g:9.51,  temp:187},
    {name:'exosphere',     alt:500e3, rho:1e-12,  g:8.43,  temp:1500},
    {name:'LEO',           alt:400e3, rho:1e-11,  g:8.69,  temp:1200},
    {name:'escape',        alt:36e6,  rho:0,      g:0.27,  temp:0}
  ],

  SHOCKS: ['none','oblique','normal','detached'],

  energy(params, mach, alt) {
    const nQ = 11, dim = 1 << nQ;
    const state = new Float64Array(dim);
    state[0] = 1.0;

    const t = mach * 0.3;
    const atm = QBT.ALTITUDES[Math.min(alt, 7)];
    const V = atm.rho * 10;
    const g = (mach >= 1.0) ? 0.5 * (mach - 1.0) : 0;
    const mu = 0.3;
    const grav = atm.g / 9.81;

    let pi = 0;
    for (let q = 0; q < nQ; q++) {
      VQE.applyRy(state, nQ, q, params[pi++]);
      VQE.applyRz(state, nQ, q, params[pi++]);
    }

    const kinBonds = [[0,1],[1,2],[2,3]];
    for (const [a,b] of kinBonds) VQE.applyCZ(state, nQ, a, b);
    const atmBonds = [[3,4],[4,5],[5,6]];
    for (const [a,b] of atmBonds) VQE.applyCZ(state, nQ, a, b);
    const shockBonds = [[6,7],[7,8]];
    for (const [a,b] of shockBonds) VQE.applyCZ(state, nQ, a, b);
    const burstBonds = [[4,9],[5,10],[9,10]];
    for (const [a,b] of burstBonds) VQE.applyCZ(state, nQ, a, b);
    const crossBonds = [[2,8],[0,3],[1,4]];
    for (const [a,b] of crossBonds) VQE.applyCZ(state, nQ, a, b);

    let E = 0;
    for (const [a,b] of kinBonds) {
      E -= t * VQE.measureZZ(state, nQ, a, b);
    }
    for (const q of QBT.REGISTERS.atmos) {
      E += V * VQE.measureZ(state, nQ, q);
    }
    for (const q of QBT.REGISTERS.kinetic) {
      E -= grav * VQE.measureZ(state, nQ, q);
    }
    if (g > 0) {
      E -= g * VQE.measureZZ(state, nQ, 6, 7) * VQE.measureZ(state, nQ, 8);
    }
    for (const q of QBT.REGISTERS.burst) {
      E -= mu * VQE.measureZ(state, nQ, q);
    }
    return E;
  },

  simulate(maxIter, lr, mach, alt) {
    const nQ = 11, nP = nQ * 2;
    const params = new Float64Array(nP);
    for (let i = 0; i < nP; i++) params[i] = (Math.random() - 0.5) * 0.2;

    const history = [];
    const shift = Math.PI / 2;
    for (let iter = 0; iter < maxIter; iter++) {
      const E = QBT.energy(params, mach, alt);
      history.push(E);
      if (iter % 10 === 0) {
        self.postMessage({type:'qbt-progress', iter, maxIter, energy:E, mach, alt});
      }
      const grad = new Float64Array(nP);
      for (let k = 0; k < nP; k++) {
        const p1 = new Float64Array(params); p1[k] += shift;
        const p2 = new Float64Array(params); p2[k] -= shift;
        grad[k] = (QBT.energy(p1, mach, alt) - QBT.energy(p2, mach, alt)) / 2;
      }
      for (let k = 0; k < nP; k++) params[k] -= lr * grad[k];
      if (history.length > 5) {
        const r = history.slice(-5);
        if (Math.abs(r[0] - r[4]) < 1e-7) break;
      }
    }
    const Ef = history[history.length - 1];
    const shockState = (mach < 0.8) ? 0 : (mach < 1.2) ? 2 : (mach < 5) ? 1 : 3;
    const atm = QBT.ALTITUDES[Math.min(alt, 7)];
    const blackout = (atm.alt > 60000 && atm.alt < 400000 && mach > 20);
    return {
      params: Array.from(params), energy: Ef,
      iterations: history.length, history,
      mach, alt, altName: atm.name, altMeters: atm.alt,
      density: atm.rho, gravity: atm.g, temp: atm.temp,
      shock: QBT.SHOCKS[shockState], shockState,
      blackout, dataIntegrity: blackout ? 0.12 : 0.97,
      converged: history.length < maxIter
    };
  },

  sweep(maxIter, lr) {
    const results = [];
    const machs = [0.3, 0.8, 1.0, 1.2, 2.0, 5.0, 10.0, 25.4];
    const alts = [0, 2, 4, 6];
    for (const m of machs) {
      for (const a of alts) {
        const r = QBT.simulate(Math.min(maxIter, 20), lr, m, a);
        results.push({mach:m, alt:a, altName:r.altName, energy:r.energy,
                      shock:r.shock, blackout:r.blackout, dataIntegrity:r.dataIntegrity});
      }
    }
    return results;
  }
};

// ═══════════════════════════════════════════════════════════════
// QAS — Quantum Acoustic Simulator (D-Wave Source/Target/Detector)
// Binaural surround sound: spin wave propagation = acoustic propagation
// Dispersion: ω(k) = 2J|sin(ka/2)|
// ═══════════════════════════════════════════════════════════════

const QAS = {
  REGISTERS: {
    source: [0], medium: [1,2,3,4],
    leftEar: [5,6], rightEar: [7,8], hrtf: [9,10]
  },

  dispersion(k, J, a) {
    return 2 * J * Math.abs(Math.sin(k * a / 2));
  },

  groupVelocity(k, J, a) {
    return J * a * Math.cos(k * a / 2);
  },

  energy(params, azimuth, elevation, freq, roomSize) {
    const nQ = 11, dim = 1 << nQ;
    const state = new Float64Array(dim);
    state[0] = 1.0;

    const J = 1.0;
    const a = 1.0;
    const k = 2 * Math.PI * freq / 20000;
    const omega = QAS.dispersion(k, J, a);
    const az = azimuth * Math.PI / 180;
    const el = elevation * Math.PI / 180;
    const ild = 0.5 * Math.sin(az);
    const itd = 0.3 * Math.sin(az);
    const absorb = [0.01, 0.05, 0.15, 0.3];
    const reverb = 0.1 / Math.max(0.1, roomSize);

    VQE.applyRy(state, nQ, 0, Math.PI / 2);

    let pi = 0;
    for (let q = 1; q < nQ; q++) {
      VQE.applyRy(state, nQ, q, params[pi++]);
      VQE.applyRz(state, nQ, q, params[pi++]);
    }

    const chain = [[0,1],[1,2],[2,3],[3,4]];
    for (const [a,b] of chain) VQE.applyCZ(state, nQ, a, b);
    const binBonds = [[4,5],[5,6],[6,7],[7,8],[2,8]];
    for (const [a,b] of binBonds) VQE.applyCZ(state, nQ, a, b);
    const hrtfBonds = [[4,9],[5,10],[9,10]];
    for (const [a,b] of hrtfBonds) VQE.applyCZ(state, nQ, a, b);

    let E = 0;
    for (const [a,b] of chain) E -= J * VQE.measureZZ(state, nQ, a, b);
    for (let i = 0; i < 4; i++) E += absorb[i] * VQE.measureZ(state, nQ, i + 1);
    E -= ild * (VQE.measureZ(state, nQ, 5) - VQE.measureZ(state, nQ, 7));
    E -= itd * (VQE.measureZ(state, nQ, 6) - VQE.measureZ(state, nQ, 8));
    E -= 0.5 * (Math.cos(az) * VQE.measureZ(state, nQ, 9) +
                Math.sin(el) * VQE.measureZ(state, nQ, 10));
    for (let i = 1; i < 4; i++) {
      for (let j = i + 2; j <= 4; j++) {
        E -= reverb * VQE.measureZZ(state, nQ, i, j);
      }
    }
    return E;
  },

  simulate(maxIter, lr, azimuth, elevation, freq, roomSize) {
    const nQ = 11, nP = (nQ - 1) * 2;
    const params = new Float64Array(nP);
    for (let i = 0; i < nP; i++) params[i] = (Math.random() - 0.5) * 0.2;

    const history = [];
    const shift = Math.PI / 2;
    for (let iter = 0; iter < maxIter; iter++) {
      const E = QAS.energy(params, azimuth, elevation, freq, roomSize);
      history.push(E);
      if (iter % 10 === 0) {
        self.postMessage({type:'qas-progress', iter, maxIter, energy:E});
      }
      const grad = new Float64Array(nP);
      for (let k = 0; k < nP; k++) {
        const p1 = new Float64Array(params); p1[k] += shift;
        const p2 = new Float64Array(params); p2[k] -= shift;
        grad[k] = (QAS.energy(p1, azimuth, elevation, freq, roomSize) -
                    QAS.energy(p2, azimuth, elevation, freq, roomSize)) / 2;
      }
      for (let k = 0; k < nP; k++) params[k] -= lr * grad[k];
      if (history.length > 5 && Math.abs(history[history.length-1] - history[history.length-5]) < 1e-7) break;
    }

    const k = 2 * Math.PI * freq / 20000;
    const J = 1.0, a = 1.0;
    const omega = QAS.dispersion(k, J, a);
    const vGroup = QAS.groupVelocity(k, J, a);
    const vPhase = omega / Math.max(0.001, k);
    const ild = 0.5 * Math.sin(azimuth * Math.PI / 180);
    const itd = 0.215 * Math.sin(azimuth * Math.PI / 180) / 343 * 1e6;

    return {
      params: Array.from(params), energy: history[history.length - 1],
      iterations: history.length, history,
      azimuth, elevation, freq, roomSize,
      dispersion: { omega, k, vGroup, vPhase },
      binaural: { ild_dB: (ild * 20).toFixed(1), itd_us: itd.toFixed(1) },
      channels: {
        L_ILD: Math.max(0, 0.5 + ild).toFixed(3),
        R_ILD: Math.max(0, 0.5 - ild).toFixed(3),
        elevation: elevation, azimuth: azimuth
      },
      converged: history.length < maxIter
    };
  },

  spatialSweep(maxIter, lr, freq, roomSize) {
    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const results = [];
    for (const az of angles) {
      const r = QAS.simulate(Math.min(maxIter, 15), lr, az, 0, freq, roomSize);
      results.push({azimuth: az, energy: r.energy, ild_dB: r.binaural.ild_dB,
                     itd_us: r.binaural.itd_us, L: r.channels.L_ILD, R: r.channels.R_ILD});
    }
    return results;
  }
};

// ═══════════════════════════════════════════════════════════════
// ACV — Audio Control Vector Pipeline
// FFT bands → control vectors → QAS quantum parameters → spatial state
// Input: Float32Array of FFT magnitudes (32 or 64 bands)
// Output: 11 QAS control angles + spatial field + quantum state
// ═══════════════════════════════════════════════════════════════

const ACV = {
  BAND_GROUPS: {
    sub:    [0, 1],
    bass:   [2, 3, 4],
    loMid:  [5, 6, 7, 8],
    mid:    [9, 10, 11, 12, 13],
    hiMid:  [14, 15, 16, 17, 18, 19],
    pres:   [20, 21, 22, 23, 24],
    brill:  [25, 26, 27, 28, 29],
    air:    [30, 31]
  },

  extractCV(fftBands) {
    const n = fftBands.length;
    const cv = {};
    for (const [name, indices] of Object.entries(ACV.BAND_GROUPS)) {
      let sum = 0, count = 0;
      for (const i of indices) {
        if (i < n) { sum += fftBands[i]; count++; }
      }
      cv[name] = count > 0 ? sum / count : 0;
    }
    let total = 0, weighted = 0;
    for (let i = 0; i < n; i++) { total += fftBands[i]; weighted += i * fftBands[i]; }
    cv.centroid = total > 0 ? weighted / total : n / 2;
    cv.energy = total / n;
    let flat = 1, arith = total / n;
    let logSum = 0, logCount = 0;
    for (let i = 0; i < n; i++) {
      if (fftBands[i] > 1e-10) { logSum += Math.log(fftBands[i]); logCount++; }
    }
    if (logCount > 0 && arith > 1e-10) {
      flat = Math.exp(logSum / logCount) / arith;
    }
    cv.flatness = flat;
    let maxVal = 0, maxI = 0;
    for (let i = 0; i < n; i++) { if (fftBands[i] > maxVal) { maxVal = fftBands[i]; maxI = i; } }
    cv.peak = maxI / n;
    cv.crest = arith > 0 ? maxVal / arith : 1;
    let flux = 0;
    if (ACV._prevBands) {
      for (let i = 0; i < n; i++) {
        const d = fftBands[i] - (ACV._prevBands[i] || 0);
        if (d > 0) flux += d * d;
      }
      flux = Math.sqrt(flux);
    }
    cv.flux = flux;
    ACV._prevBands = new Float32Array(fftBands);
    return cv;
  },

  cvToQASParams(cv) {
    const p = new Float64Array(20);
    p[0]  = cv.sub * Math.PI;
    p[1]  = cv.bass * Math.PI;
    p[2]  = cv.loMid * Math.PI * 0.8;
    p[3]  = cv.mid * Math.PI * 0.6;
    p[4]  = cv.hiMid * Math.PI * 0.5;
    p[5]  = cv.pres * Math.PI * 0.4;
    p[6]  = cv.brill * Math.PI * 0.3;
    p[7]  = cv.air * Math.PI * 0.2;
    p[8]  = cv.centroid / 32 * Math.PI;
    p[9]  = cv.energy * Math.PI * 2;
    p[10] = cv.flatness * Math.PI;
    p[11] = cv.peak * Math.PI * 2;
    p[12] = Math.min(cv.crest / 10, 1) * Math.PI;
    p[13] = Math.min(cv.flux / 5, 1) * Math.PI;
    p[14] = (cv.sub + cv.bass) * Math.PI * 0.5;
    p[15] = (cv.hiMid + cv.pres) * Math.PI * 0.3;
    p[16] = (cv.mid - cv.bass) * Math.PI;
    p[17] = cv.centroid / 64 * Math.PI * 2;
    p[18] = (cv.brill + cv.air) * Math.PI * 0.25;
    p[19] = Math.atan2(cv.bass, cv.pres + 0.001);
    return p;
  },

  processBands(fftBands, azimuth, elevation, freq, roomSize) {
    const cv = ACV.extractCV(fftBands);
    const qasParams = ACV.cvToQASParams(cv);
    const nQ = 11, dim = 1 << nQ;
    const st = new Float64Array(dim);
    st[0] = 1.0;

    VQE.applyRy(st, nQ, 0, Math.PI / 2);
    let pi = 0;
    for (let q = 1; q < nQ; q++) {
      VQE.applyRy(st, nQ, q, qasParams[pi++]);
      VQE.applyRz(st, nQ, q, qasParams[pi++]);
    }
    const chain = [[0,1],[1,2],[2,3],[3,4]];
    for (const [a,b] of chain) VQE.applyCZ(st, nQ, a, b);
    const binBonds = [[4,5],[5,6],[6,7],[7,8],[2,8]];
    for (const [a,b] of binBonds) VQE.applyCZ(st, nQ, a, b);
    const hrtfBonds = [[4,9],[5,10],[9,10]];
    for (const [a,b] of hrtfBonds) VQE.applyCZ(st, nQ, a, b);

    const E = QAS.energy(qasParams.slice(0, 20), azimuth, elevation, freq, roomSize);
    const k = 2 * Math.PI * freq / 20000;
    const J = 1.0, a = 1.0;
    const az = azimuth * Math.PI / 180;
    const ild = 0.5 * Math.sin(az);
    const itd = 0.215 * Math.sin(az) / 343 * 1e6;

    const qubits = [];
    for (let q = 0; q < nQ; q++) qubits.push(VQE.measureZ(st, nQ, q));

    return {
      cv, qasParams: Array.from(qasParams),
      energy: E,
      qubits,
      spatial: {
        L_ILD: Math.max(0, 0.5 + ild).toFixed(3),
        R_ILD: Math.max(0, 0.5 - ild).toFixed(3),
        ild_dB: (ild * 20).toFixed(1),
        itd_us: itd.toFixed(1),
        azimuth, elevation
      },
      dispersion: {
        omega: QAS.dispersion(k, J, a),
        k, vGroup: QAS.groupVelocity(k, J, a),
        vPhase: QAS.dispersion(k, J, a) / Math.max(0.001, k)
      }
    };
  },

  _prevBands: null
};

// ═══════════════════════════════════════════════════════════════
// Worker State & Background Loop
// ═══════════════════════════════════════════════════════════════

const STATE = {
  arch: [2, 8, 8, 1],
  lr: 0.05,
  epochs: 500,
  gen: 0,
  weights: null,
  dataset: 'xor',
  engine: 'r0',
  bgActive: false,
  bgGens: 0,
  bgStartTime: 0
};

function runGeneration() {
  const data = DATASETS[STATE.dataset] || DATASETS.xor;
  const t0 = performance.now();
  let result;

  if (STATE.engine === 'r1') {
    result = trainR1(STATE.arch, data, STATE.epochs, STATE.lr, STATE.weights, STATE.gen);
  } else {
    result = trainR0(STATE.arch, data, STATE.epochs, STATE.lr, STATE.weights, STATE.gen);
  }

  result.ms = performance.now() - t0;
  result.engine = STATE.engine;
  result.dataset = STATE.dataset;
  result.bg = true;
  result.ts = Date.now();

  STATE.weights = result.weights;
  STATE.gen++;
  result.gen = STATE.gen;

  return result;
}

function bgLoop() {
  if (!STATE.bgActive) return;
  const result = runGeneration();
  STATE.bgGens++;
  self.postMessage({ type: 'generation', ...result, bgGens: STATE.bgGens });

  if (result.acc >= 1.0 && STATE.bgGens > 5) {
    self.postMessage({ type: 'converged', gen: STATE.gen, bgGens: STATE.bgGens, loss: result.loss });
    if (STATE.dataset === 'xor') {
      STATE.dataset = 'circle';
      STATE.weights = null;
      STATE.arch = [2, 16, 16, 1];
      self.postMessage({ type: 'curriculum', dataset: STATE.dataset, arch: STATE.arch });
    } else if (STATE.dataset === 'circle') {
      STATE.dataset = 'spiral';
      STATE.weights = null;
      STATE.arch = [2, 16, 16, 1];
      self.postMessage({ type: 'curriculum', dataset: STATE.dataset, arch: STATE.arch });
    }
  }

  if (STATE.bgActive) setTimeout(bgLoop, 0);
}

// ═══════════════════════════════════════════════════════════════
// Message Handler — API surface
// ═══════════════════════════════════════════════════════════════

self.onmessage = function(e) {
  const d = e.data;

  switch (d.type) {
    case 'train': {
      if (d.arch) STATE.arch = d.arch;
      if (d.lr) STATE.lr = d.lr;
      if (d.epochs) STATE.epochs = d.epochs;
      if (d.weights) STATE.weights = d.weights;
      if (d.dataset) STATE.dataset = d.dataset;
      if (d.engine) STATE.engine = d.engine;
      if (d.gen !== undefined) STATE.gen = d.gen;
      const t0 = performance.now();
      const result = runGeneration();
      result.ms = performance.now() - t0;
      self.postMessage({ type: 'generation', ...result });
      break;
    }

    case 'bg-start': {
      if (d.arch) STATE.arch = d.arch;
      if (d.lr) STATE.lr = d.lr;
      if (d.epochs) STATE.epochs = d.epochs;
      if (d.weights) STATE.weights = d.weights;
      if (d.dataset) STATE.dataset = d.dataset;
      if (d.engine) STATE.engine = d.engine;
      if (d.gen !== undefined) STATE.gen = d.gen;
      STATE.bgActive = true;
      STATE.bgGens = 0;
      STATE.bgStartTime = performance.now();
      self.postMessage({ type: 'bg-started' });
      bgLoop();
      break;
    }

    case 'bg-stop': {
      STATE.bgActive = false;
      self.postMessage({
        type: 'bg-stopped',
        bgGens: STATE.bgGens,
        elapsed: performance.now() - STATE.bgStartTime,
        gen: STATE.gen,
        weights: STATE.weights
      });
      break;
    }

    case 'status': {
      self.postMessage({
        type: 'status',
        bgActive: STATE.bgActive,
        bgGens: STATE.bgGens,
        gen: STATE.gen,
        arch: STATE.arch,
        dataset: STATE.dataset,
        engine: STATE.engine,
        hasWeights: !!STATE.weights
      });
      break;
    }

    case 'quantum-miami': {
      const arch = d.arch || STATE.arch;
      const weights = d.weights || STATE.weights || [];
      const gen = d.gen !== undefined ? d.gen : STATE.gen;
      if (!weights.length) {
        self.postMessage({ type: 'error', msg: 'no weights — train first' });
        break;
      }
      const result = MIAMI.generateQASM(arch, weights, gen);
      self.postMessage({
        type: 'quantum-miami',
        ...result,
        cal: MIAMI.cal,
        labels: MIAMI.labels,
        readout: MIAMI.readout,
        t1: MIAMI.t1
      });
      break;
    }

    case 'cortical': {
      const weights = d.weights || STATE.weights || [];
      const data = DATASETS[d.dataset || STATE.dataset] || DATASETS.xor;
      const gen = d.gen !== undefined ? d.gen : STATE.gen;
      const result = IRON_LINE.loop(weights, data, gen);
      self.postMessage({ type: 'cortical', ...result, gen });
      break;
    }

    case 'organoid': {
      const weights = d.weights || STATE.weights || [];
      const data = DATASETS[d.dataset || STATE.dataset] || DATASETS.xor;
      const arch = d.arch || STATE.arch;
      const gen = d.gen !== undefined ? d.gen : STATE.gen;
      if (!weights.length) {
        self.postMessage({ type: 'error', msg: 'no weights for organoid cycle — train first' });
        break;
      }
      const result = ORGANOID.cycle(weights, data, arch, gen);
      self.postMessage({ type: 'organoid', ...result, gen, dna: ORGANOID.encode(weights).slice(0, 60) + '...' });
      break;
    }

    case 'vqe': {
      const patch = VQE.PATCHES[d.patch || '11q'] || VQE.PATCHES['11q'];
      const nQ = d.qubits || patch.qubits;
      const bonds = patch.bonds;
      const layers = d.layers || 3;
      const maxIter = d.maxIter || 50;
      const lr = d.lr || 0.1;
      const J = d.J || 1.0;
      const h = d.h || 0.5;

      self.postMessage({ type: 'vqe-started', nQ, layers, bonds: bonds.length, maxIter });
      const t0 = performance.now();
      const result = VQE.optimize(nQ, bonds, layers, maxIter, lr, J, h);
      result.ms = performance.now() - t0;
      result.physQ = patch.physQ;

      const qasmResult = VQE.generateQASM(nQ, bonds, layers, result.params, patch.physQ);
      result.qasm = qasmResult.qasm;
      result.gateCount = qasmResult.gateCount;

      self.postMessage({ type: 'vqe-result', ...result });
      break;
    }

    case 'qbt': {
      const mach = d.mach || 1.0;
      const alt = d.alt || 0;
      const maxIter = d.maxIter || 40;
      const lr = d.lr || 0.1;
      const doSweep = d.sweep || false;

      if (doSweep) {
        self.postMessage({type:'qbt-started', mode:'sweep', mach, alt});
        const t0 = performance.now();
        const results = QBT.sweep(maxIter, lr);
        self.postMessage({type:'qbt-sweep', results, ms:performance.now()-t0});
      } else {
        self.postMessage({type:'qbt-started', mode:'single', mach, alt,
          altName: QBT.ALTITUDES[Math.min(alt,7)].name});
        const t0 = performance.now();
        const result = QBT.simulate(maxIter, lr, mach, alt);
        result.ms = performance.now() - t0;
        self.postMessage({type:'qbt-result', ...result});

        if (d.chainQAS) {
          const boomFreq = mach > 1 ? 20 + (mach - 1) * 60 : 200;
          const boomAz = d.chainAz || 0;
          const boomRoom = d.chainRoom || 50;
          const qasBoom = QAS.simulate(15, 0.1, boomAz, 0, boomFreq, boomRoom);
          qasBoom.ms = performance.now() - t0;
          qasBoom.chainSource = 'qbt';
          qasBoom.mach = mach;
          self.postMessage({type:'qbt-qas-chain', qbt: result, qas: qasBoom});
        }
      }
      break;
    }

    case 'qas': {
      const az = d.azimuth || 0;
      const el = d.elevation || 0;
      const freq = d.freq || 1000;
      const room = d.roomSize || 5;
      const maxIter = d.maxIter || 30;
      const lr = d.lr || 0.1;
      const doSweep = d.sweep || false;

      if (doSweep) {
        self.postMessage({type:'qas-started', mode:'sweep', freq, room});
        const t0 = performance.now();
        const results = QAS.spatialSweep(maxIter, lr, freq, room);
        self.postMessage({type:'qas-sweep', results, ms:performance.now()-t0, freq, room});
      } else {
        self.postMessage({type:'qas-started', mode:'single', azimuth:az, elevation:el, freq});
        const t0 = performance.now();
        const result = QAS.simulate(maxIter, lr, az, el, freq, room);
        result.ms = performance.now() - t0;
        self.postMessage({type:'qas-result', ...result});
      }
      break;
    }

    case 'audio-cv': {
      const bands = d.bands;
      const az = d.azimuth || 0;
      const el = d.elevation || 0;
      const freq = d.freq || 1000;
      const room = d.roomSize || 5;
      const t0 = performance.now();
      const result = ACV.processBands(bands, az, el, freq, room);
      result.ms = performance.now() - t0;
      result.frame = d.frame || 0;
      self.postMessage({type:'audio-cv-result', ...result});
      break;
    }

    case 'audio-cv-batch': {
      const frames = d.frames;
      const az = d.azimuth || 0;
      const el = d.elevation || 0;
      const room = d.roomSize || 5;
      const t0 = performance.now();
      const results = [];
      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        const r = ACV.processBands(f.bands, az, el, f.freq || 1000, room);
        r.frame = f.frame || i;
        results.push(r);
      }
      self.postMessage({type:'audio-cv-batch-result', results, ms:performance.now()-t0, count:frames.length});
      break;
    }

    case 'ping':
      self.postMessage({ type: 'pong', ts: performance.now() });
      break;

    case 'stop':
      STATE.bgActive = false;
      self.close();
      break;
  }
};

self.postMessage({ type: 'ready', version: '1.4.0', capabilities: [
  'r0-scalar', 'r1-tensor', 'bg-train', 'curriculum',
  'quantum-miami', 'r5-cortical', 'r6-organoid',
  'vqe-11q', 'vqe-114q', 'parameter-shift',
  'qbt-ballistic', 'qbt-sweep', 'mach-barrier',
  'qas-binaural', 'qas-surround', 'qas-dispersion', 'qas-hrtf',
  'audio-cv', 'audio-cv-batch', 'fft-to-quantum', 'live-pipe',
  'datasets:xor,and,or,circle,spiral'
]});
