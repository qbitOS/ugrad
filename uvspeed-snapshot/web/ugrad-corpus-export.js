/**
 * ugrad-corpus-export.js — append-only browser log + JSONL snapshot for hub / LLM / Freya / kbatch pipelines.
 */
(function (global) {
  'use strict';

  var KEY = 'ugrad-corpus-log-v1';
  var MAX = 5000;

  function load() {
    try {
      var r = localStorage.getItem(KEY);
      if (!r) return [];
      var a = JSON.parse(r);
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function save(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
    } catch (e2) {}
  }

  /**
   * @param {object} rec — e.g. { type:'go-ugrad-state', source, n, movesLen, tensorSlice?, dacMeta? }
   */
  function append(rec) {
    var a = load();
    a.push(
      Object.assign(
        {
          ts: Date.now(),
          v: 1,
          origin: (function () {
            try {
              return location.origin;
            } catch (e) {
              return '';
            }
          })()
        },
        rec || {}
      )
    );
    save(a);
  }

  function presenceSnapshot() {
    var out = {};
    try {
      var keys = Object.keys(localStorage);
      var i,
        k,
        pre = 'ugrad-presence-v1:';
      for (i = 0; i < keys.length; i++) {
        k = keys[i];
        if (k.indexOf(pre) !== 0) continue;
        out[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  }

  function buildJSONL() {
    var lines = [];
    lines.push(
      JSON.stringify({
        type: 'ugrad-corpus-meta',
        v: 1,
        exportedAt: new Date().toISOString(),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        origin: (function () {
          try {
            return location.origin;
          } catch (e) {
            return '';
          }
        })(),
        note:
          'NDJSON for search/history/Freya/kbatch/LLM ingestion. Expand with Worker + D1 for 50k–200k+ daily events.'
      })
    );
    if (global.UgradGameRegistry && UgradGameRegistry.GAMES) {
      lines.push(
        JSON.stringify({
          type: 'ugrad-registry-snapshot',
          games: UgradGameRegistry.GAMES
        })
      );
    }
    lines.push(
      JSON.stringify({
        type: 'ugrad-presence-keys',
        keys: presenceSnapshot()
      })
    );
    load().forEach(function (row) {
      lines.push(JSON.stringify(row));
    });
    return lines.join('\n') + '\n';
  }

  function download(filename) {
    var blob = new Blob([buildJSONL()], { type: 'application/x-ndjson;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'ugrad-corpus-snapshot.jsonl';
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  global.UgradCorpusLog = {
    append: append,
    getAll: load,
    buildJSONL: buildJSONL,
    download: download,
    KEY: KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);
