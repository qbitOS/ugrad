/**
 * ugrad-memory-lab.js — neural album stage: particles + ripple grid + flow lines + cursor trail (original).
 * Feel aligned with interactive particle / burn / ripple / shader-line / trail / liquid-wave patterns — not Framer assets.
 */
(function () {
  'use strict';

  function ParticleField(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.count = opts.count || 140;
    this.particles = [];
    this.mx = -1e9;
    this.my = -1e9;
    this.t = 0;
    this.running = false;
    this.color = opts.color || 'rgba(130,190,255,0.35)';
    this.colorHot = opts.colorHot || 'rgba(255,140,80,0.22)';
    this.dpr = 1;
    /** Full “dream album” layers (grid + lines + trail). */
    this.album = opts.album !== false;
    this.trail = [];
    this.trailMax = opts.trailMax || 52;
  }

  /** Grid + jitter seed (less random clumping than pure Poisson). */
  ParticleField.prototype._seed = function () {
    var w = this.canvas.width;
    var h = this.canvas.height;
    var i;
    var n = this.count;
    var cols = Math.max(1, Math.ceil(Math.sqrt((n * w) / Math.max(1, h))));
    var rows = Math.max(1, Math.ceil(n / cols));
    var cw = w / cols;
    var ch = h / rows;
    var gx;
    var gy;
    var idx = 0;
    this.particles.length = 0;
    for (gy = 0; gy < rows && idx < n; gy++) {
      for (gx = 0; gx < cols && idx < n; gx++, idx++) {
        this.particles.push({
          x: gx * cw + cw * (0.18 + Math.random() * 0.64),
          y: gy * ch + ch * (0.18 + Math.random() * 0.64),
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: 0.55 + Math.random() * 1.45,
          ph: Math.random() * Math.PI * 2
        });
      }
    }
    for (i = idx; i < n; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: 0.55 + Math.random() * 1.45,
        ph: Math.random() * Math.PI * 2
      });
    }
  };

  ParticleField.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.floor(rect.width * this.dpr));
    var h = Math.max(1, Math.floor(rect.height * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this._seed();
    }
  };

  ParticleField.prototype.setPointer = function (x, y) {
    var rect = this.canvas.getBoundingClientRect();
    this.mx = (x - rect.left) * this.dpr;
    this.my = (y - rect.top) * this.dpr;
    if (this.album && this.trailMax > 0) {
      var last = this.trail.length ? this.trail[this.trail.length - 1] : null;
      var minTrail = 7 * this.dpr;
      if (!last) {
        this.trail.push({ x: this.mx, y: this.my });
      } else {
        var tdx = this.mx - last.x;
        var tdy = this.my - last.y;
        if (tdx * tdx + tdy * tdy > minTrail * minTrail) {
          this.trail.push({ x: this.mx, y: this.my });
        }
      }
      while (this.trail.length > this.trailMax) this.trail.shift();
    }
  };

  ParticleField.prototype.clearPointer = function () {
    this.mx = -1e9;
    this.my = -1e9;
    if (this.album) this.trail.length = 0;
  };

  /** Cool void base + subtle vignette draw. */
  ParticleField.prototype._drawBase = function (ctx, w, h) {
    var g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    g.addColorStop(0, 'rgba(12,16,24,0.97)');
    g.addColorStop(0.45, 'rgba(6,8,12,0.98)');
    g.addColorStop(1, 'rgba(2,3,6,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };

  /** Animated line grid with mouse-ripple bump (ripple-grid feel). */
  ParticleField.prototype._drawRippleGrid = function (ctx, w, h) {
    var t = this.t;
    var mx = this.mx;
    var my = this.my;
    var step = 26 * this.dpr;
    var x;
    var y;
    var pulse;
    var d;
    ctx.lineWidth = 1;
    for (x = 0; x <= w; x += step) {
      pulse = 0.035 + 0.055 * Math.sin(t * 1.25 + x * 0.008);
      if (mx > -1e8) {
        d = Math.abs(x - mx);
        pulse += 0.1 * Math.max(0, 1 - d / (w * 0.45)) * Math.sin(t * 2.8 + d * 0.015);
      }
      ctx.strokeStyle = 'rgba(100,165,255,' + Math.min(0.22, pulse) + ')';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (y = 0; y <= h; y += step) {
      pulse = 0.035 + 0.055 * Math.cos(t * 1.05 + y * 0.009);
      if (my > -1e8) {
        d = Math.abs(y - my);
        pulse += 0.1 * Math.max(0, 1 - d / (h * 0.45)) * Math.cos(t * 2.4 + d * 0.014);
      }
      ctx.strokeStyle = 'rgba(130,195,255,' + Math.min(0.2, pulse) + ')';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };

  /** Wavy luminous bands (shader-lines / data-stream feel, 2D). */
  ParticleField.prototype._drawFlowLines = function (ctx, w, h) {
    var t = this.t;
    var mx = this.mx;
    var my = this.my;
    var n = 8;
    var i;
    var y0;
    var x;
    var wave;
    var py;
    var grad;
    for (i = 0; i < n; i++) {
      y0 = (h / n) * i + Math.sin(t * 0.75 + i * 0.9) * 18 * this.dpr;
      grad = ctx.createLinearGradient(0, y0, w, y0 + 36 * this.dpr);
      grad.addColorStop(0, 'rgba(56,139,253,0)');
      grad.addColorStop(0.45, 'rgba(130,190,255,0.1)');
      grad.addColorStop(1, 'rgba(56,139,253,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.25 * this.dpr;
      ctx.beginPath();
      for (x = 0; x <= w; x += 6 * this.dpr) {
        wave = Math.sin(x * 0.011 + t * 1.45 + i * 0.65) * 7 * this.dpr;
        py = y0 + wave;
        if (mx > -1e8) py += Math.cos((x - mx) * 0.0045 + t * 1.1) * 5 * this.dpr * Math.max(0, 1 - Math.abs(y0 - my) / h);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
    }
  };

  /** Glowing cursor trail (pixel-trail / liquid wake). */
  ParticleField.prototype._drawTrail = function (ctx) {
    var tr = this.trail;
    if (!tr || tr.length < 2) return;
    var i;
    var p0;
    var p1;
    var a;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (i = 1; i < tr.length; i++) {
      p0 = tr[i - 1];
      p1 = tr[i];
      a = (i / tr.length) * 0.42;
      ctx.strokeStyle = 'rgba(200,230,255,' + a + ')';
      ctx.lineWidth = (1.2 + (i / tr.length) * 3.8) * this.dpr;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  ParticleField.prototype.tick = function () {
    var ctx = this.ctx;
    var w = this.canvas.width;
    var h = this.canvas.height;
    var i;
    var p;
    var dx;
    var dy;
    var d;
    var f;
    var g;
    this.t += 0.016;

    if (this.album) {
      this._drawBase(ctx, w, h);
      this._drawRippleGrid(ctx, w, h);
      this._drawFlowLines(ctx, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    var mx = this.mx;
    var my = this.my;
    var cursorR = 220 * this.dpr;
    for (i = 0; i < this.particles.length; i++) {
      p = this.particles[i];
      dx = p.x - mx;
      dy = p.y - my;
      d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      /* Softer repel: avoid ring-clumping; falloff outside radius. */
      if (d < cursorR) {
        f = Math.min(1.35, 1400 / (d * d + 120) * (1 - d / cursorR));
        p.vx += (dx / d) * f * 0.014;
        p.vy += (dy / d) * f * 0.014;
      }
      p.vx += Math.sin(this.t * 0.7 + p.ph) * 0.008;
      p.vy += Math.cos(this.t * 0.55 + p.ph) * 0.008;
      /* Light separation: push away from very close neighbors (sample subset). */
      var j = (i + 17) % this.particles.length;
      var p2 = this.particles[j];
      var sx = p.x - p2.x;
      var sy = p.y - p2.y;
      var sd = Math.sqrt(sx * sx + sy * sy) + 0.01;
      if (sd < 28 * this.dpr) {
        var sep = 0.06 * (1 - sd / (28 * this.dpr));
        p.vx += (sx / sd) * sep;
        p.vy += (sy / sd) * sep;
      }
      p.vx *= 0.987;
      p.vy *= 0.987;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }

    for (i = 0; i < this.particles.length; i++) {
      p = this.particles[i];
      dx = p.x - this.mx;
      dy = p.y - this.my;
      d = Math.sqrt(dx * dx + dy * dy);
      g = Math.min(1, d / (160 * this.dpr));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * this.dpr, 0, Math.PI * 2);
      ctx.fillStyle = g < 0.4 ? this.colorHot : this.color;
      ctx.globalAlpha = 0.32 + g * 0.48;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.album) this._drawTrail(ctx);
  };

  ParticleField.prototype.start = function () {
    var self = this;
    if (this.running) return;
    this.running = true;
    function loop() {
      if (!self.running) return;
      self.tick();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

  ParticleField.prototype.stop = function () {
    this.running = false;
  };

  function initBurnTransition(innerEl, embersEl, reducedMotion, onMid, onDone) {
    if (reducedMotion) {
      if (onMid) onMid();
      if (onDone) setTimeout(onDone, 0);
      return;
    }
    innerEl.classList.remove('mem-burn-in');
    innerEl.classList.add('mem-burn-out');
    if (embersEl) embersEl.classList.add('mem-lab-embers--on');
    window.setTimeout(function () {
      if (onMid) onMid();
      innerEl.classList.remove('mem-burn-out');
      innerEl.classList.add('mem-burn-in');
      window.setTimeout(function () {
        innerEl.classList.remove('mem-burn-in');
        if (embersEl) embersEl.classList.remove('mem-lab-embers--on');
        if (onDone) onDone();
      }, 920);
    }, 520);
  }

  window.UgradMemoryLab = {
    ParticleField: ParticleField,
    initBurnTransition: initBurnTransition
  };
})();
