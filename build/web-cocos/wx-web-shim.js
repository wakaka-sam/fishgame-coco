(function () {
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
      var title = options && options.title ? options.title + '\n' : '';
      var content = options && options.content ? options.content + '\n' : '';
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
