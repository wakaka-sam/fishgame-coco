#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtimeGame = path.join(root, 'src/runtime/game.js');
const wechatDir = path.join(root, 'build/wechatgame');
const webDir = path.join(root, 'build/web-cocos');

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
fs.copyFileSync(runtimeGame, path.join(wechatDir, 'game.js'));

fs.rmSync(webDir, { recursive: true, force: true });
fs.mkdirSync(webDir, { recursive: true });
fs.copyFileSync(runtimeGame, path.join(webDir, 'game.js'));
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

  window.wx = {
    createCanvas: ensureCanvas,
    createImage: function () { return new Image(); },
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
