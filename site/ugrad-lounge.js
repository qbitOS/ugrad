/**
 * μgrad lounge — hexcast/mesh tap + optional STT corpus (wired to #prompt-menu only)
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function (global) {
  'use strict';

  var NS = {
    hexcastFrames: 0,
    lastFrame: null,
    meshRx: 0,
    listening: false,
    recognition: null,
    sttMode: 'web',
    apiUrl: ''
  };

  function log() {
    var fn = global.ugradLog;
    if (typeof fn === 'function') return fn.apply(null, arguments);
  }
  function run(cmd) {
    var fn = global.ugradExec;
    if (typeof fn === 'function' && cmd) fn(cmd);
  }

  function openPromptMenu() {
    var m = document.getElementById('prompt-menu');
    if (m) m.classList.add('open');
  }
  function closePromptMenu() {
    var m = document.getElementById('prompt-menu');
    if (m) m.classList.remove('open');
  }

  function loadKeys() {
    try {
      NS.sttMode = localStorage.getItem('ugrad_stt_mode') || 'web';
      NS.apiUrl = localStorage.getItem('ugrad_stt_url') || '';
    } catch (e) {}
  }
  function saveKeys() {
    try {
      localStorage.setItem('ugrad_stt_mode', NS.sttMode);
      localStorage.setItem('ugrad_stt_url', NS.apiUrl);
    } catch (e) {}
  }

  function appendCorpus(text) {
    if (!text || !String(text).trim()) return;
    global.__ugradExtraCorpus = (global.__ugradExtraCorpus || '') + '\n' + String(text).trim();
    var el = document.getElementById('ug-transcript-len');
    if (el) el.textContent = String((global.__ugradExtraCorpus || '').length);
  }

  function hexcastHandler(ev) {
    var d = ev && ev.data;
    if (!d) return;
    NS.hexcastFrames++;
    if (d.type === 'hexcast-frame' || d.frame || d.imageData) {
      var w = d.width || (d.frame && d.frame.width) || 0;
      var h = d.height || (d.frame && d.frame.height) || 0;
      NS.lastFrame = { w: w, h: h, ts: Date.now() };
      if (d.quality != null) NS.lastFrame.q = d.quality;
    }
    if (d.type === 'sportsfield-telemetry' || d.type === 'sportsfield-ball') {
      NS.lastFrame = { w: d.meters ? 105 : 0, h: d.meters ? 68 : 0, ts: Date.now(), sports: true };
    }
    var stat = document.getElementById('ug-hexcast-stat');
    if (stat) {
      stat.textContent =
        NS.hexcastFrames + (NS.lastFrame && NS.lastFrame.w ? ' · ' + NS.lastFrame.w + '×' + NS.lastFrame.h : '');
    }
  }

  function meshHandler(ev) {
    NS.meshRx++;
    var el = document.getElementById('ug-mesh-stat');
    if (el) el.textContent = String(NS.meshRx);
    if (ev && ev.data && ev.data.type === 'chat' && ev.data.text) appendCorpus(ev.data.text);
  }

  var hexCh = null,
    meshCh = null,
    channelsWired = false;
  function wireChannels() {
    if (channelsWired || typeof BroadcastChannel === 'undefined') return;
    channelsWired = true;
    hexCh = new BroadcastChannel('hexcast-stream');
    hexCh.onmessage = hexcastHandler;
    meshCh = new BroadcastChannel('hexterm');
    meshCh.onmessage = meshHandler;
  }

  function startListen() {
    if (NS.listening) return;
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) {
      log('<span class="r">STT: Web Speech API unavailable</span>', 'err');
      return;
    }
    NS.recognition = new SR();
    NS.recognition.continuous = true;
    NS.recognition.interimResults = true;
    NS.recognition.lang = 'en-US';
    NS.recognition.onresult = function (e) {
      var i,
        t,
        fin = '';
      for (i = e.resultIndex; i < e.results.length; i++) {
        t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t + ' ';
      }
      if (fin.trim()) {
        appendCorpus(fin.trim());
        log('<span class="d">[transcript]</span> ' + fin.trim(), 'info');
      }
    };
    NS.recognition.onerror = function (e) {
      var err = e.error || '';
      if (err === 'no-speech' || err === 'aborted') return;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        NS.listening = false;
        NS.loungeListenFatal = true;
        try {
          NS.recognition.stop();
        } catch (ex) {}
        NS.recognition = null;
        log('<span class="r">lounge listen blocked</span> <span class="d">— mic denied · training unaffected</span>', 'err');
        return;
      }
      log('<span class="d">lounge mic: ' + err + '</span>', 'info');
    };
    NS.recognition.onend = function () {
      if (!NS.listening || NS.loungeListenFatal) return;
      try {
        NS.recognition.start();
      } catch (ex) {}
    };
    NS.loungeListenFatal = false;
    try {
      NS.recognition.start();
      NS.listening = true;
      openPromptMenu();
      log('<span class="g">lounge listen ON</span> <span class="d">(→ __ugradExtraCorpus)</span>');
    } catch (ex) {
      NS.recognition = null;
      log('<span class="r">listen failed</span>', 'err');
    }
  }

  function stopListen() {
    NS.listening = false;
    NS.loungeListenFatal = false;
    if (NS.recognition) try { NS.recognition.stop(); } catch (e) {}
    NS.recognition = null;
    log('<span class="d">lounge listen OFF</span>');
  }

  function transcribeBlob(blob) {
    var url = NS.apiUrl || global.localStorage.getItem('ugrad_stt_url');
    if (!url) {
      log('<span class="d">set </span><span class="y">lounge stt url &lt;https://…/v1/audio/transcriptions&gt;</span>');
      return Promise.resolve(null);
    }
    var fd = new FormData();
    fd.append('file', blob, 'chunk.webm');
    fd.append('model', 'whisper-1');
    return fetch(url, { method: 'POST', body: fd })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        var tx = (j && (j.text || j.transcript)) || '';
        if (tx) appendCorpus(tx);
        return tx;
      })
      .catch(function () {
        log('<span class="r">STT API fetch failed</span>', 'err');
        return null;
      });
  }

  function ookFlash(text) {
    run('link optical ' + (text || 'ugrad'));
  }

  function imageFingerprint(file) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    return new Promise(function (resolve) {
      img.onload = function () {
        var cv = document.createElement('canvas');
        var w = Math.min(64, img.width),
          h = Math.min(64, img.height);
        cv.width = w;
        cv.height = h;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var id = ctx.getImageData(0, 0, w, h);
        var d = id.data;
        var i,
          s = 0,
          v = 0;
        for (i = 0; i < d.length; i += 4) {
          var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          s += lum;
          v += lum * lum;
        }
        var n = (d.length / 4) | 0;
        var mean = s / n;
        var varc = v / n - mean * mean;
        URL.revokeObjectURL(url);
        resolve({ mean: mean, variance: varc, w: w, h: h });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  function pickImage() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      imageFingerprint(f).then(function (fp) {
        if (!fp) {
          log('<span class="r">image read failed</span>', 'err');
          return;
        }
        var sig =
          'IMG[' +
          fp.w +
          'x' +
          fp.h +
          '] μ=' +
          fp.mean.toFixed(1) +
          ' σ²=' +
          fp.variance.toFixed(1);
        appendCorpus(sig);
        log('<span class="g">image ingested</span> <span class="d">' + sig + '</span>');
        global.UGRAD && global.UGRAD.emit && global.UGRAD.emit('lounge-image', fp);
      });
    };
    inp.click();
  }

  function googleImageSearch(q) {
    var key = localStorage.getItem('googleApiKey') || '';
    var cx = localStorage.getItem('googleCx') || '';
    if (!key || !cx) {
      log('<span class="d">set localStorage googleApiKey + googleCx (Programmable Search)</span>');
      return;
    }
    var url =
      'https://www.googleapis.com/customsearch/v1?key=' +
      encodeURIComponent(key) +
      '&cx=' +
      encodeURIComponent(cx) +
      '&searchType=image&q=' +
      encodeURIComponent(q) +
      '&num=10';
    fetch(url)
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.items || !data.items.length) {
          log('<span class="d">no image results</span>');
          return;
        }
        var titles = data.items
          .map(function (it) {
            return it.title || '';
          })
          .join(' | ');
        appendCorpus('IMGSEARCH: ' + q + ' :: ' + titles.slice(0, 800));
        log('<span class="g">imagesearch</span> <span class="d">' + data.items.length + ' hits</span>');
      })
      .catch(function () {
        log('<span class="r">image search failed</span>', 'err');
      });
  }

  global.UgradLoungeMic = {
    setInterim: function (text) {
      var el = document.getElementById('ug-mic-interim');
      if (el) el.textContent = text || '';
    },
    pushFinal: function (text) {
      if (!text || !String(text).trim()) return;
      var box = document.getElementById('ug-mic-lines');
      if (!box) return;
      var line = document.createElement('div');
      line.className = 'ug-mic-line';
      line.textContent = String(text).trim();
      box.appendChild(line);
      while (box.children.length > 48) box.removeChild(box.firstChild);
      box.scrollTop = box.scrollHeight;
      var it = document.getElementById('ug-mic-interim');
      if (it) it.textContent = '';
    },
    onMicOn: function () {
      openPromptMenu();
    },
    /** Clear live + buffered mic text in #prompt-menu when mic stops */
    onMicOff: function () {
      var it = document.getElementById('ug-mic-interim');
      if (it) it.textContent = '';
      var box = document.getElementById('ug-mic-lines');
      if (box) box.innerHTML = '';
    }
  };

  function loungeCmd(args) {
    var sub = (args[0] || '').toLowerCase();
    loadKeys();
    wireChannels();
    if (!sub || sub === 'open') {
      openPromptMenu();
      return;
    }
    if (sub === 'close') {
      closePromptMenu();
      return;
    }
    if (sub === 'listen') {
      startListen();
      return;
    }
    if (sub === 'stop') {
      stopListen();
      return;
    }
    if (sub === 'clear') {
      global.__ugradExtraCorpus = '';
      var el = document.getElementById('ug-transcript-len');
      if (el) el.textContent = '0';
      log('<span class="g">extra corpus cleared</span>');
      return;
    }
    if (sub === 'stt') {
      var mode = (args[1] || '').toLowerCase();
      if (mode === 'web') {
        NS.sttMode = 'web';
        saveKeys();
        log('<span class="g">STT mode: Web Speech (browser)</span>');
      } else if (mode === 'api' && args[2]) {
        NS.sttMode = 'api';
        NS.apiUrl = args.slice(2).join(' ');
        try {
          localStorage.setItem('ugrad_stt_url', NS.apiUrl);
        } catch (e) {}
        log('<span class="g">STT API URL stored</span>');
      } else if (mode === 'url' && args[2]) {
        NS.apiUrl = args.slice(2).join(' ');
        try {
          localStorage.setItem('ugrad_stt_url', NS.apiUrl);
        } catch (e) {}
      }
      return;
    }
    if (sub === 'flash' && args[1]) {
      ookFlash(args.slice(1).join(' '));
      return;
    }
    if (sub === 'image') {
      pickImage();
      return;
    }
    if (sub === 'imagesearch') {
      googleImageSearch(args.slice(1).join(' ') || 'ugrad neural');
      return;
    }
    if (sub === 'status') {
      log('<span class="c">lounge</span>');
      log('  <span class="d">hexcast:</span> ' + NS.hexcastFrames + ' · <span class="d">mesh:</span> ' + NS.meshRx);
      log('  <span class="d">extra corpus:</span> ' + (global.__ugradExtraCorpus || '').length + ' chars');
      return;
    }
    log('<span class="d">lounge open|close|listen|stop|clear|stt …|flash|image|imagesearch|status</span>');
  }

  global.UgradLounge = NS;
  global.ugradOpenPromptMenu = openPromptMenu;
  global.ugradOokFlash = ookFlash;
  global.ugradTranscribeBlob = transcribeBlob;

  if (typeof global.UGRAD !== 'undefined' && global.UGRAD.extend) {
    global.UGRAD.extend('lounge', {
      version: '0.2.0',
      capabilities: ['prompt-menu-only', 'hexcast-stats', 'mesh-tap', 'transcript-corpus', 'image-fingerprint', 'google-image-search', 'ook-flash'],
      commands: { lounge: loungeCmd },
      help: [
        ['lounge', 'open μgrad> prompt menu'],
        ['lounge listen', 'Web Speech → __ugradExtraCorpus'],
        ['lounge clear', 'clear extra corpus'],
        ['lounge stt api <url>', 'optional Whisper-compatible endpoint'],
        ['lounge image', 'image fingerprint → corpus'],
        ['lounge imagesearch <q>', 'Google CSE (keys in localStorage)'],
        ['lounge flash <text>', 'link optical …'],
        ['lounge status', 'hexcast/mesh/corpus']
      ],
      init: function () {
        try {
          loadKeys();
          wireChannels();
        } catch (e) {}
      }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
