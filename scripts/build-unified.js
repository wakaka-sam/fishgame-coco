#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtimeGame = path.join(root, 'src/runtime/game.js');
const wechatDir = path.join(root, 'build/wechatgame');
const webDir = path.join(root, 'build/web-cocos');

function writeRuntime(dest, target) {
  const source = fs.readFileSync(runtimeGame, 'utf8');
  const prologue = `var __FISH_COCO_RUNTIME_TARGET = ${JSON.stringify(target)};\n`;
  fs.writeFileSync(dest, prologue + source, 'utf8');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(runtimeGame)) {
  console.error(`Missing runtime source: ${runtimeGame}`);
  process.exit(1);
}

fs.mkdirSync(wechatDir, { recursive: true });
const uiLayoutAssets = path.join(root, 'assets', 'ui_layout');
if (fs.existsSync(uiLayoutAssets)) {
  copyDir(uiLayoutAssets, path.join(wechatDir, 'assets', 'ui_layout'));
}
const audioAssets = path.join(root, 'assets', 'audio');
if (fs.existsSync(audioAssets)) {
  copyDir(audioAssets, path.join(wechatDir, 'assets', 'audio'));
}
writeRuntime(path.join(wechatDir, 'game.js'), 'wechat');

fs.rmSync(webDir, { recursive: true, force: true });
fs.mkdirSync(webDir, { recursive: true });
writeRuntime(path.join(webDir, 'game.js'), 'web');
copyDir(path.join(wechatDir, 'assets'), path.join(webDir, 'assets'));

fs.writeFileSync(path.join(webDir, 'index.html'), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>像素钓鱼 Cocos 单工程版</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #020407;
      color: #fff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    canvas {
      display: block;
      width: 100vw;
      height: 100vh;
      image-rendering: pixelated;
      touch-action: none;
    }
  </style>
</head>
<body>
  <script src="wx-web-shim.js"></script>
  <script src="game.js"></script>
</body>
</html>
`, 'utf8');

fs.writeFileSync(path.join(webDir, 'wx-web-shim.js'), `(function () {
  var canvas = null;
  var touchEndHandlers = [];

  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.addEventListener('touchend', function (event) {
      var changed = Array.prototype.map.call(event.changedTouches || [], function (touch) {
        return { clientX: touch.clientX, clientY: touch.clientY };
      });
      touchEndHandlers.forEach(function (handler) { handler({ changedTouches: changed }); });
      event.preventDefault();
    }, { passive: false });
    canvas.addEventListener('mouseup', function (event) {
      touchEndHandlers.forEach(function (handler) {
        handler({ changedTouches: [{ clientX: event.clientX, clientY: event.clientY }] });
      });
    });
    return canvas;
  }

  function readStorage(key) {
    try {
      var raw = localStorage.getItem('fish-coco:' + key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem('fish-coco:' + key, JSON.stringify(value));
    } catch (_) {}
  }

  function createInnerAudioContext() {
    var audio = new Audio();
    audio.preload = 'auto';
    var ctx = {};
    Object.defineProperty(ctx, 'src', {
      get: function () { return audio.getAttribute('src') || ''; },
      set: function (value) { audio.src = value || ''; },
    });
    Object.defineProperty(ctx, 'loop', {
      get: function () { return audio.loop; },
      set: function (value) { audio.loop = !!value; },
    });
    Object.defineProperty(ctx, 'volume', {
      get: function () { return audio.volume; },
      set: function (value) {
        var next = Number(value);
        audio.volume = Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 1;
      },
    });
    Object.defineProperty(ctx, 'paused', {
      get: function () { return audio.paused; },
    });
    ctx.play = function () {
      var result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(function (error) { console.warn('audio play deferred', error); });
      }
      return result;
    };
    ctx.pause = function () { audio.pause(); };
    ctx.stop = function () {
      audio.pause();
      try { audio.currentTime = 0; } catch (_) {}
    };
    ctx.destroy = function () {
      audio.pause();
      audio.removeAttribute('src');
      try { audio.load(); } catch (_) {}
    };
    ctx.onPlay = function (handler) { audio.addEventListener('play', handler); };
    ctx.onError = function (handler) {
      audio.addEventListener('error', function () { handler(audio.error || {}); });
    };
    return ctx;
  }

  window.wx = {
    createCanvas: ensureCanvas,
    createImage: function () { return new Image(); },
    createInnerAudioContext: createInnerAudioContext,
    getSystemInfoSync: function () {
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        statusBarHeight: 0,
        safeArea: { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight },
      };
    },
    getStorageSync: readStorage,
    setStorageSync: writeStorage,
    onTouchEnd: function (handler) { touchEndHandlers.push(handler); },
    onShow: function (handler) { window.addEventListener('focus', handler); },
    setClipboardData: function (options) {
      var data = options && options.data ? String(options.data) : '';
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data);
    },
    showModal: function (options) {
      var title = options && options.title ? options.title + '\\n' : '';
      var content = options && options.content ? options.content + '\\n' : '';
      var result = options && options.editable
        ? window.prompt(title + content + (options.placeholderText || ''), '')
        : (window.confirm(title + content) ? '' : null);
      if (options && typeof options.success === 'function') {
        options.success({ confirm: result !== null, cancel: result === null, content: result || '' });
      }
    },
    showToast: function (options) {
      if (options && options.title) console.log(options.title);
    },
  };
}());
`, 'utf8');

console.log(`Unified runtime built:
- ${path.relative(root, path.join(wechatDir, 'game.js'))}
- ${path.relative(root, webDir)}`);
