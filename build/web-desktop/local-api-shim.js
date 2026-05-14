(function () {
  const STORAGE_KEY = 'fish-coco-original-ui-users';
  const CODE_KEY = 'fish-coco-original-ui-codes';
  const nativeFetch = window.fetch.bind(window);

  const DEFAULT_CODES = {
    WELCOME2024: { coins: 500, desc: '欢迎礼包' },
    FISHING666: { coins: 200, desc: '钓鱼大吉' },
    GOLDENROD: { coins: 1000, desc: '黄金鱼竿基金' },
    LUCKYDAY: { coins: 300, desc: '幸运日' },
    VIP888: { coins: 888, desc: 'VIP大礼' },
    WAKAKA_NB: { diamonds: 900, desc: 'WAKAKA钻石大礼' },
    WAKAKA666: { diamonds: 10000, desc: '神秘钻石宝藏' },
  };

  function sanitize(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function writeStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function readCodeUse() {
    try { return JSON.parse(localStorage.getItem(CODE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function writeCodeUse(used) {
    localStorage.setItem(CODE_KEY, JSON.stringify(used));
  }

  function defaultUser(name) {
    const baits = { worm: 5, black_silk: 0, divine: 0, jb: 0 };
    const data = window.GAME_DATA || {};
    Object.keys(data.BAITS || {}).forEach((id) => { if (baits[id] == null) baits[id] = 0; });
    return {
      username: name,
      vip: name === 'wakaka',
      money: 100,
      diamonds: 0,
      baits,
      currentBait: 'worm',
      dex: {},
      stats: { totalCatches: 0, totalEarned: 0, totalDiamonds: 0 },
      history: [],
      lastShareDate: '',
      rodSkin: '',
      dailyStats: { date: '', catches: 0, weight: 0 },
      ownedRods: [],
      ownedPets: [],
      activePet: null,
      ownedCharacters: ['fishing_master'],
      activeCharacter: 'fishing_master',
      characterFragments: {},
      accessories: [],
      equippedAccessory: null,
      rankRewards: [],
    };
  }

  function normalizeUser(user, name) {
    const defaults = defaultUser(name || user.username);
    const merged = {
      ...defaults,
      ...user,
      username: name || user.username || defaults.username,
      vip: user.vip === true || (name || user.username) === 'wakaka',
      money: Math.max(0, Math.floor(user.money ?? defaults.money)),
      diamonds: Math.max(0, Math.floor(user.diamonds ?? defaults.diamonds)),
      baits: { ...defaults.baits, ...(user.baits || {}) },
      dex: user.dex || {},
      stats: { ...defaults.stats, ...(user.stats || {}) },
      history: Array.isArray(user.history) ? user.history.slice(-50) : [],
      dailyStats: user.dailyStats || defaults.dailyStats,
      ownedRods: Array.isArray(user.ownedRods) ? user.ownedRods : [],
      ownedPets: Array.isArray(user.ownedPets) ? user.ownedPets : [],
      ownedCharacters: Array.isArray(user.ownedCharacters) ? user.ownedCharacters : ['fishing_master'],
      characterFragments: user.characterFragments || {},
      accessories: Array.isArray(user.accessories) ? user.accessories : [],
      rankRewards: Array.isArray(user.rankRewards) ? user.rankRewards : [],
    };
    if (!merged.ownedCharacters.includes('fishing_master')) merged.ownedCharacters.unshift('fishing_master');
    return merged;
  }

  function loadUser(name) {
    const username = sanitize(name);
    const store = readStore();
    const user = normalizeUser(store[username] || defaultUser(username), username);
    store[username] = user;
    writeStore(store);
    return structuredClone(user);
  }

  function saveUser(user) {
    const username = sanitize(user.username);
    const store = readStore();
    const saved = normalizeUser(user, username);
    store[username] = saved;
    writeStore(store);
    return structuredClone(saved);
  }

  function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  async function readBody(input, init) {
    if (init && init.body) return JSON.parse(init.body);
    if (input && typeof input.json === 'function') return input.json();
    return {};
  }

  function createAccessory(type) {
    return {
      uid: 'acc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      type,
      star: 1,
    };
  }

  function getLeaderboard() {
    const store = readStore();
    const rows = Object.values(store).map((u) => {
      const daily = u.dailyStats || {};
      return {
        username: u.username,
        todayCatches: daily.catches || 0,
        todayWeight: daily.weight || 0,
        totalCatches: u.stats?.totalCatches || 0,
        totalWeight: Object.values(u.dex || {}).reduce((sum, item) => sum + (item.maxWeight || 0) * (item.count || 0), 0),
      };
    });
    const fixtures = [
      { username: 'wakaka', todayCatches: 36, todayWeight: 842.4, totalCatches: 420, totalWeight: 6890.2 },
      { username: 'pixel_fisher', todayCatches: 18, todayWeight: 326.8, totalCatches: 180, totalWeight: 2240.6 },
      { username: 'cocos_lts', todayCatches: 12, todayWeight: 203.5, totalCatches: 126, totalWeight: 1610.4 },
    ];
    const byName = new Map([...fixtures, ...rows].map((row) => [row.username, row]));
    return [...byName.values()];
  }

  function addUnique(list, id) {
    if (!list.includes(id)) list.push(id);
  }

  function runGacha(user, count, currency, season) {
    const results = [];
    const accessories = ['scale_charm', 'tide_bracelet', 'star_brooch'];
    for (let i = 0; i < count; i++) {
      const roll = Math.random() * 100;
      if (currency === 'coins' && season === 2) {
        const petRolls = [
          { threshold: 0.1, id: 'cat' }, { threshold: 0.2, id: 'dog' },
          { threshold: 0.25, id: 'parrot' }, { threshold: 0.30, id: 'penguin' },
          { threshold: 0.35, id: 'rabbit' }, { threshold: 0.40, id: 'fox' },
          { threshold: 0.41, id: 'dragon' }, { threshold: 0.42, id: 'unicorn' },
        ];
        const pet = petRolls.find((p) => roll < p.threshold);
        if (pet) {
          results.push({ type: 'pet', id: pet.id });
          addUnique(user.ownedPets, pet.id);
        } else if (roll < 10.42) {
          results.push({ type: 'diamonds', diamonds: 10 });
          user.diamonds += 10;
        } else {
          results.push({ type: 'coins', coins: 1 });
          user.money += 1;
        }
      } else if (currency === 'diamonds' && season === 3) {
        if (roll < 30) {
          const item = createAccessory(accessories[Math.floor(roll / 10)]);
          user.accessories.push(item);
          results.push({ type: 'accessory', id: item.type, star: item.star });
        } else {
          results.push({ type: 'coins', coins: 100 });
          user.money += 100;
        }
      } else if (currency === 'diamonds' && season === 2) {
        if (roll < 0.01) {
          results.push({ type: 'rod', id: 'headphone' });
          addUnique(user.ownedRods, 'headphone');
        } else if (roll < 1) {
          results.push({ type: 'rod', id: 'candy' });
          addUnique(user.ownedRods, 'candy');
        } else if (roll < 11) {
          results.push({ type: 'diamonds', diamonds: 10 });
          user.diamonds += 10;
        } else {
          results.push({ type: 'coins', coins: 1000 });
          user.money += 1000;
        }
      } else if (currency === 'diamonds') {
        if (roll < 1) {
          results.push({ type: 'rod', id: 'firekirin' });
          addUnique(user.ownedRods, 'firekirin');
        } else if (roll < 2) {
          results.push({ type: 'rod', id: 'greenxuanwu' });
          addUnique(user.ownedRods, 'greenxuanwu');
        } else if (roll < 10) {
          results.push({ type: 'diamonds', diamonds: 10 });
          user.diamonds += 10;
        } else {
          results.push({ type: 'coins', coins: 1000 });
          user.money += 1000;
        }
      } else if (roll < 10) {
        if (roll < 0.1) {
          results.push({ type: 'rod', id: 'nightmyst' });
          addUnique(user.ownedRods, 'nightmyst');
        } else if (roll < 1.1) {
          results.push({ type: 'rod', id: 'panda' });
          addUnique(user.ownedRods, 'panda');
        } else {
          results.push({ type: 'coins', coins: 1000 });
          user.money += 1000;
        }
      } else {
        results.push({ type: 'coins', coins: 1 });
        user.money += 1;
      }
    }
    return results;
  }

  window.fetch = async function localFetch(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const remoteApiBase = window.FISH_API_BASE || '';
    if (remoteApiBase && url.origin === location.origin && url.pathname.startsWith('/api/')) {
      const remoteUrl = new URL(url.pathname + url.search, remoteApiBase);
      return nativeFetch(remoteUrl.toString(), init);
    }
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input, init);

    try {
      if (url.pathname === '/api/leaderboard') return jsonResponse(getLeaderboard());
      if (url.pathname === '/api/rank-history') return jsonResponse({ history: [] });

      const body = await readBody(input, init);
      const username = sanitize(body.username || '');
      if (!username) return jsonResponse({ error: '用户名无效' }, 400);

      if (url.pathname === '/api/login') {
        const user = loadUser(username);
        const unseen = (user.rankRewards || []).filter((r) => !r.seen);
        user.rankRewards.forEach((r) => { r.seen = true; });
        saveUser(user);
        return jsonResponse({ ...user, pendingRankRewards: unseen });
      }

      if (url.pathname === '/api/save') {
        return jsonResponse(saveUser({ ...body.state, username }));
      }

      if (url.pathname === '/api/gacha') {
        const count = body.count === 10 ? 10 : 1;
        const currency = body.currency === 'diamonds' ? 'diamonds' : 'coins';
        const season = [1, 2, 3].includes(body.season) ? body.season : 1;
        const cost = currency === 'diamonds'
          ? (count === 1 ? 10 : 90)
          : (season === 2 ? (count === 1 ? 10000 : 100000) : (count === 1 ? 1000 : 9000));
        const user = loadUser(username);
        if (currency === 'diamonds') {
          if (user.diamonds < cost) return jsonResponse({ error: '钻石不足' }, 400);
          user.diamonds -= cost;
        } else {
          if (user.money < cost) return jsonResponse({ error: '金币不足' }, 400);
          user.money -= cost;
        }
        const results = runGacha(user, count, currency, season);
        const saved = saveUser(user);
        return jsonResponse({ results, user: saved });
      }

      if (url.pathname === '/api/redeem') {
        const code = String(body.code || '').trim().toUpperCase();
        const entry = DEFAULT_CODES[code];
        if (!entry) return jsonResponse({ error: '兑换码不存在' }, 400);
        const used = readCodeUse();
        used[username] = used[username] || [];
        if (used[username].includes(code)) return jsonResponse({ error: '你已经使用过这个兑换码了' }, 400);
        used[username].push(code);
        writeCodeUse(used);
        const user = loadUser(username);
        if (entry.coins) user.money += entry.coins;
        if (entry.diamonds) user.diamonds += entry.diamonds;
        const saved = saveUser(user);
        return jsonResponse({ success: true, coins: entry.coins || 0, diamonds: entry.diamonds || 0, desc: entry.desc, user: saved });
      }

      return jsonResponse({ error: 'unknown api' }, 404);
    } catch (error) {
      return jsonResponse({ error: error.message || String(error) }, 500);
    }
  };
})();
