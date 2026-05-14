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
  var touchStartHandlers = [];
  var touchMoveHandlers = [];
  var touchEndHandlers = [];
  var lastTouchStartAt = 0;
  var mouseDown = false;

  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.addEventListener('touchstart', function (event) {
      lastTouchStartAt = Date.now();
      var changed = Array.prototype.map.call(event.touches || [], function (touch) {
        return { clientX: touch.clientX, clientY: touch.clientY };
      });
      touchStartHandlers.forEach(function (handler) { handler({ changedTouches: changed }); });
      event.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', function (event) {
      var changed = Array.prototype.map.call(event.touches || [], function (touch) {
        return { clientX: touch.clientX, clientY: touch.clientY };
      });
      touchMoveHandlers.forEach(function (handler) { handler({ changedTouches: changed }); });
      event.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', function (event) {
      touchEndHandlers.forEach(function (handler) { handler({ changedTouches: [] }); });
      event.preventDefault();
    }, { passive: false });
    canvas.addEventListener('mousedown', function (event) {
      if (Date.now() - lastTouchStartAt < 350) return;
      mouseDown = true;
      touchStartHandlers.forEach(function (handler) {
        handler({ changedTouches: [{ clientX: event.clientX, clientY: event.clientY }] });
      });
    });
    window.addEventListener('mousemove', function (event) {
      if (!mouseDown) return;
      touchMoveHandlers.forEach(function (handler) {
        handler({ changedTouches: [{ clientX: event.clientX, clientY: event.clientY }] });
      });
    });
    window.addEventListener('mouseup', function (event) {
      if (!mouseDown) return;
      mouseDown = false;
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
    onTouchStart: function (handler) { touchStartHandlers.push(handler); },
    onTouchMove: function (handler) { touchMoveHandlers.push(handler); },
    onTouchEnd: function (handler) { touchEndHandlers.push(handler); },
    request: function (options) {
      var method = options && options.method ? options.method : 'GET';
      var headers = options && options.header ? options.header : {};
      fetch(options.url, {
        method: method,
        headers: headers,
        body: method === 'GET' ? undefined : JSON.stringify(options.data || {}),
      }).then(function (response) {
        return response.text().then(function (text) {
          var data = text;
          try { data = text ? JSON.parse(text) : null; } catch (_) {}
          if (options && typeof options.success === 'function') {
            options.success({ statusCode: response.status, data: data });
          }
          if (options && typeof options.complete === 'function') options.complete();
        });
      }).catch(function (error) {
        if (options && typeof options.fail === 'function') options.fail({ errMsg: error.message || String(error) });
        if (options && typeof options.complete === 'function') options.complete();
      });
    },
    onShow: function (handler) { window.addEventListener('focus', handler); },
    setClipboardData: function (options) {
      var data = options && options.data ? String(options.data) : '';
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data);
    },
    showModal: function (options) {
      var title = options && options.title ? options.title + '\\n' : '';
      var content = options && options.content ? options.content + '\\n' : '';
      if (options && options.editable) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;';
        var panel = document.createElement('div');
        panel.style.cssText = 'width:min(360px,86vw);background:#1a1a2e;border:3px solid #ffd700;padding:18px;color:#fff;box-sizing:border-box;text-align:center;';
        var titleEl = document.createElement('div');
        titleEl.textContent = (options.title || '');
        titleEl.style.cssText = 'color:#ffd700;font-size:20px;font-weight:bold;margin-bottom:10px;';
        var contentEl = document.createElement('div');
        contentEl.textContent = (options.content || '');
        contentEl.style.cssText = 'font-size:13px;color:#cbd5e1;margin-bottom:12px;';
        var input = document.createElement('input');
        input.type = 'text';
        input.value = '';
        input.placeholder = options.placeholderText || '';
        input.style.cssText = 'width:100%;height:38px;background:#0d1421;border:2px solid #ffd700;color:#fff;text-align:center;font:14px monospace;box-sizing:border-box;text-transform:uppercase;margin-bottom:14px;outline:none;';
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;';
        var cancel = document.createElement('button');
        cancel.textContent = '取消';
        var ok = document.createElement('button');
        ok.textContent = '确定';
        [cancel, ok].forEach(function (btn) {
          btn.style.cssText = 'flex:1;height:34px;border:2px solid #ffd700;background:#2c3e50;color:#ffd700;font:13px monospace;';
        });
        ok.style.background = '#ffd700';
        ok.style.color = '#1a1a2e';
        function finish(confirm) {
          var value = input.value || '';
          overlay.remove();
          if (options && typeof options.success === 'function') {
            options.success({ confirm: !!confirm, cancel: !confirm, content: value });
          }
        }
        cancel.onclick = function () { finish(false); };
        ok.onclick = function () { finish(true); };
        input.onkeydown = function (event) {
          if (event.key === 'Enter') finish(true);
          if (event.key === 'Escape') finish(false);
        };
        row.appendChild(cancel);
        row.appendChild(ok);
        panel.appendChild(titleEl);
        panel.appendChild(contentEl);
        panel.appendChild(input);
        panel.appendChild(row);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        setTimeout(function () { input.focus(); }, 0);
        return;
      }
      var result = window.confirm(title + content) ? '' : null;
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
