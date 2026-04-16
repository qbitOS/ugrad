/**
 * ugrad-sportsfield-shot.js — xG-style shot value + goal-mouth ray test (FIFA 105×68 m pitch).
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function (global) {
  'use strict';

  var pitchCfg = {
    lengthM: 105,
    widthM: 68,
    goalY0: 30.34,
    goalY1: 37.66,
    gcy: 34,
    shotModel: 'soccer_ifab'
  };

  function inferTargetGoal(vx, bx) {
    var L = pitchCfg.lengthM;
    if (Math.abs(vx) < 0.05) return bx > L * 0.5 ? 'left' : 'right';
    return vx > 0 ? 'right' : 'left';
  }

  function setPitchConfig(preset) {
    if (!preset) return;
    pitchCfg.lengthM = preset.lengthM;
    pitchCfg.widthM = preset.widthM;
    pitchCfg.shotModel = preset.shotModel || 'none';
    var W = preset.widthM;
    if (preset.shotModel === 'soccer_ifab') {
      var g0 = (W - 7.32) / 2;
      pitchCfg.goalY0 = g0;
      pitchCfg.goalY1 = g0 + 7.32;
      pitchCfg.gcy = W / 2;
    }
  }

  /**
   * Ray from (x,y) direction (ux,uy) to vertical line x = gx. Returns { t, yHit } or null.
   */
  function rayVerticalLine(x, y, ux, uy, gx) {
    if (Math.abs(ux) < 1e-9) return null;
    var t = (gx - x) / ux;
    if (t <= 0 || !isFinite(t)) return null;
    return { t: t, yHit: y + t * uy };
  }

  /**
   * @param {object} o — { x, y, vx, vy } ball meters; optional targetGoal 'left'|'right'
   * @returns analysis object
   */
  function analyze(o) {
    var x = +o.x;
    var y = +o.y;
    var vx = +o.vx;
    var vy = +o.vy;
    var sp = Math.sqrt(vx * vx + vy * vy) || 1e-9;
    var LM = pitchCfg.lengthM;
    var WM = pitchCfg.widthM;
    if (pitchCfg.shotModel !== 'soccer_ifab') {
      return {
        v: 2,
        shotModel: pitchCfg.shotModel,
        pitchM: { L: LM, W: WM },
        speedMs: sp,
        note: 'xG / goal-mouth model is soccer IFAB only; use flow + telemetry for other sports.'
      };
    }
    var ux = vx / sp;
    var uy = vy / sp;
    var tg = o.targetGoal || inferTargetGoal(vx, x);
    var goalX = tg === 'left' ? 0 : LM;

    var ray = rayVerticalLine(x, y, ux, uy, goalX);
    var yHit = ray ? ray.yHit : null;
    var inMouth = ray && yHit >= pitchCfg.goalY0 && yHit <= pitchCfg.goalY1;

    var gcx = goalX;
    var gcy = pitchCfg.gcy;
    var dist = Math.sqrt((x - gcx) * (x - gcx) + (y - gcy) * (y - gcy));

    var toGoalX = gcx - x;
    var toGoalY = gcy - y;
    var toGL = Math.sqrt(toGoalX * toGoalX + toGoalY * toGoalY) || 1e-9;
    var cosA = (ux * toGoalX + uy * toGoalY) / toGL;
    cosA = Math.max(-1, Math.min(1, cosA));

    var scale = Math.min(LM, WM) / 68;
    var xG = 0.06 + 0.78 * Math.exp(-dist / (20 * scale)) * (0.55 + 0.45 * Math.max(0, cosA));
    xG *= inMouth ? 1 : 0.35;
    xG = Math.max(0, Math.min(0.97, xG));

    return {
      v: 2,
      shotModel: pitchCfg.shotModel,
      pitchM: { L: LM, W: WM },
      targetGoal: tg,
      goalLineX: goalX,
      goalMouthY: { min: pitchCfg.goalY0, max: pitchCfg.goalY1 },
      rayToGoalLine: ray,
      yAtGoalLine: yHit,
      intersectsGoalMouth: !!inMouth,
      distanceToGoalCenterM: dist,
      angleToGoalCenterDeg: (Math.acos(cosA) * 180) / Math.PI,
      alignmentCos: cosA,
      speedMs: sp,
      xG: xG
    };
  }

  function enrichTelemetryPayload(base, ball, velocity, shotExtra) {
    var a = analyze({
      x: ball.x,
      y: ball.y,
      vx: velocity.vx,
      vy: velocity.vy,
      targetGoal: shotExtra && shotExtra.targetGoal
    });
    var out = Object.assign({}, base || {}, { shotAnalysis: a });
    if (shotExtra && typeof shotExtra === 'object') out.shot = Object.assign({}, shotExtra, { analysis: a });
    return out;
  }

  global.SportsfieldShot = {
    setPitchConfig: setPitchConfig,
    analyze: analyze,
    enrichTelemetryPayload: enrichTelemetryPayload
  };
})(typeof window !== 'undefined' ? window : globalThis);
