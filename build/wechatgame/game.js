var __FISH_COCO_RUNTIME_TARGET = "wechat";
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const sys = wx.getSystemInfoSync();
const DPR = sys.pixelRatio || 1;
canvas.width = Math.floor(sys.windowWidth * DPR);
canvas.height = Math.floor(sys.windowHeight * DPR);
ctx.scale(DPR, DPR);

const W = sys.windowWidth;
const H = sys.windowHeight;
const DESIGN_W = 1080;
const DESIGN_H = 2334;
const SAVE_KEY = 'fish-coco-wechatgame-save';
const PLAYER_ID_KEY = 'fish-coco-player-id';
const API_BASE = typeof window === 'undefined' ? 'https://fish.wakaka007.cn' : '';
const BGM_PATH = 'assets/audio/fishing_lake_loop.wav';
const BGM_VOLUME = 0.42;
const SFX_VOLUME = 0.68;
const SFX_PATHS = {
  uiClick: 'assets/audio/sfx_ui_click.wav',
  panelOpen: 'assets/audio/sfx_panel_open.wav',
  panelClose: 'assets/audio/sfx_panel_close.wav',
  switch: 'assets/audio/sfx_switch.wav',
  cast: 'assets/audio/sfx_cast.wav',
  bite: 'assets/audio/sfx_bite.wav',
  hit: 'assets/audio/sfx_hit.wav',
  catchSuccess: 'assets/audio/sfx_catch_success.wav',
  fail: 'assets/audio/sfx_fail.wav',
  buy: 'assets/audio/sfx_buy.wav',
  reward: 'assets/audio/sfx_reward.wav',
  share: 'assets/audio/sfx_share.wav',
  toggle: 'assets/audio/sfx_toggle.wav',
  error: 'assets/audio/sfx_error.wav',
};
const MINI_SAFE_TOP = Math.max(
  0,
  sys.statusBarHeight || 0,
  sys.safeArea && typeof sys.safeArea.top === 'number' ? sys.safeArea.top : 0
);
const MINI_SAFE_BOTTOM = Math.max(
  0,
  sys.safeArea && typeof sys.safeArea.height === 'number'
    ? sys.windowHeight - (sys.safeArea.top || 0) - sys.safeArea.height
    : 0
);
const PAGE_PAD = 8;
const CONTENT_W = Math.min(W - PAGE_PAD * 2, 700);
const CONTENT_X = Math.floor((W - CONTENT_W) / 2);
const TOPBAR_Y = MINI_SAFE_TOP + PAGE_PAD;
const TOPBAR_PAD_X = W <= 700 ? 8 : 12;
const TOPBAR_PAD_Y = W <= 700 ? 6 : 8;
const ACTION_COLS = W <= 700 ? 5 : 6;
const ACTION_GAP = W <= 380 ? 3 : 4;
const ACTION_H = W <= 380 ? 27 : 30;
const USER_ROW_H = 26;
const LIGHT_TOP_BUTTON_COUNT = 5;
const ACTION_ROWS = Math.ceil(LIGHT_TOP_BUTTON_COUNT / ACTION_COLS);
const TOPBAR_H = TOPBAR_PAD_Y * 2 + USER_ROW_H + 6 + ACTION_ROWS * ACTION_H + (ACTION_ROWS - 1) * ACTION_GAP;
const GLOBAL_SCOPE = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
const RUNTIME_TARGET = (typeof __FISH_COCO_RUNTIME_TARGET !== 'undefined' && __FISH_COCO_RUNTIME_TARGET)
  || GLOBAL_SCOPE.__FISH_COCO_RUNTIME_TARGET
  || (typeof tt !== 'undefined' ? 'douyin' : (typeof window === 'undefined' ? 'wechat' : 'web'));
const ANALYTICS_PROVIDERS = {
  wechat: {
    enabled() {
      return RUNTIME_TARGET === 'wechat' && typeof wx !== 'undefined' && typeof wx.reportEvent === 'function';
    },
    report(eventId, data) {
      wx.reportEvent(eventId, data);
    },
  },
};
let analyticsShowCount = 0;
let bgmAudio = null;
let bgmStarted = false;
const sfxAudio = {};

function analyticsProvider() {
  return ANALYTICS_PROVIDERS[RUNTIME_TARGET] || null;
}
function analyticsNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function analyticsString(value) {
  return String(value == null ? '' : value).slice(0, 80);
}
function analyticsLevel() {
  return Math.max(1, Math.floor(analyticsNumber(user && user.stats && user.stats.totalCatches) / 5) + 1);
}
function analyticsStage() {
  const catches = analyticsNumber(user && user.stats && user.stats.totalCatches);
  if (catches <= 0) return 'new';
  if (catches < 10) return 'early';
  if (catches < 50) return 'mid';
  return 'advanced';
}
function sanitizeAnalyticsData(data) {
  const clean = {};
  Object.keys(data || {}).forEach((key) => {
    const value = data[key];
    if (value === undefined || typeof value === 'function') return;
    if (typeof value === 'number') clean[key] = Number.isFinite(value) ? value : 0;
    else if (typeof value === 'boolean') clean[key] = value;
    else if (value === null) clean[key] = '';
    else clean[key] = analyticsString(value);
  });
  return clean;
}
function commonAnalyticsData(extra = {}) {
  let env = null;
  let rod = null;
  try { env = environmentEffects(); } catch (_) {}
  try { rod = activeRod(); } catch (_) {}
  return sanitizeAnalyticsData({
    runtime_target: RUNTIME_TARGET,
    player_stage: analyticsStage(),
    level: analyticsLevel(),
    total_catches: analyticsNumber(user && user.stats && user.stats.totalCatches),
    dex_count: user && user.dex ? Object.keys(user.dex).length : 0,
    bait_id: user && user.currentBait || '',
    rod_id: rod && rod.id || '',
    season_id: env && env.season && env.season.id || '',
    weather_id: env && env.weather && env.weather.id || '',
    province: user && user.province || '',
    chance_left: analyticsNumber(user && user.chances && user.chances.left),
    chance_max: analyticsNumber(user && user.chances && user.chances.max),
    ...extra,
  });
}
function reportEventSafe(eventId, data = {}) {
  const provider = analyticsProvider();
  if (!provider || !provider.enabled()) return;
  try {
    provider.report(eventId, commonAnalyticsData(data));
  } catch (error) {
    console.warn('analytics report failed', eventId, error);
  }
}
function reportGameShow(source) {
  analyticsShowCount += 1;
  reportEventSafe('game_show', {
    show_source: source,
    show_index: analyticsShowCount,
    backend_ready: !!backendReady,
    rank_scope: rankScope,
  });
}
function reportEconomyChange(data) {
  reportEventSafe('economy_change', data);
}
function createBgmAudio() {
  if (bgmAudio) return bgmAudio;
  if (typeof wx === 'undefined' || typeof wx.createInnerAudioContext !== 'function') return null;
  try {
    const audio = wx.createInnerAudioContext();
    audio.src = BGM_PATH;
    audio.loop = true;
    audio.volume = BGM_VOLUME;
    if (typeof audio.onPlay === 'function') {
      audio.onPlay(() => { bgmStarted = true; });
    }
    if (typeof audio.onError === 'function') {
      audio.onError((error) => {
        bgmStarted = false;
        console.warn('bgm audio failed', error);
      });
    }
    bgmAudio = audio;
  } catch (error) {
    console.warn('bgm init failed', error);
    bgmAudio = null;
  }
  return bgmAudio;
}
function startBgm(source = 'auto') {
  const audio = createBgmAudio();
  if (!audio || bgmStarted) return;
  try {
    const result = audio.play();
    if (result && typeof result.then === 'function') {
      result
        .then(() => { bgmStarted = true; })
        .catch((error) => {
          bgmStarted = false;
          console.warn('bgm play deferred', source, error);
        });
    } else {
      bgmStarted = true;
    }
  } catch (error) {
    bgmStarted = false;
    console.warn('bgm play failed', source, error);
  }
}
function createSfxAudio(id) {
  const src = SFX_PATHS[id];
  if (!src || typeof wx === 'undefined' || typeof wx.createInnerAudioContext !== 'function') return null;
  if (sfxAudio[id]) return sfxAudio[id];
  try {
    const audio = wx.createInnerAudioContext();
    audio.src = src;
    audio.loop = false;
    audio.volume = SFX_VOLUME;
    if (typeof audio.onError === 'function') {
      audio.onError((error) => {
        console.warn('sfx audio failed', id, error);
      });
    }
    sfxAudio[id] = audio;
  } catch (error) {
    console.warn('sfx init failed', id, error);
    sfxAudio[id] = null;
  }
  return sfxAudio[id];
}
function playSfx(id) {
  const audio = createSfxAudio(id);
  if (!audio) return;
  try {
    if (typeof audio.stop === 'function') audio.stop();
    if (typeof audio.seek === 'function') audio.seek(0);
    else audio.startTime = 0;
    const result = audio.play();
    if (result && typeof result.catch === 'function') result.catch((error) => console.warn('sfx play deferred', id, error));
  } catch (error) {
    console.warn('sfx play failed', id, error);
  }
}
function playActionSfx(t) {
  if (!t || !t.id) return;
  const id = t.id;
  if (id.startsWith('top:') || id === 'openrank' || id === 'buybaitn') {
    playSfx('panelOpen');
    return;
  }
  if (id === 'modal:close') {
    playSfx('panelClose');
    return;
  }
  if ([
    'shoptab', 'fishdextab', 'fishdexprev', 'fishdexnext',
    'ranktab', 'gachatab', 'gachaseason', 'provinceNext',
  ].includes(id)) {
    playSfx('switch');
    return;
  }
  if ([
    'mobile-action', 'cast', 'hit',
    'baitprev', 'baitnext', 'rodprev', 'rodnext',
    'toggleauto',
    'buybait', 'buyrod',
    'claimgoal', 'gacha', 'redeemcode',
    'sharecopy', 'shareChance', 'coinChance', 'resultShare', 'rankshare',
    'equiprod', 'equipchar', 'equippet', 'equipacc',
  ].includes(id)) return;
  playSfx('uiClick');
}

const RARITY_NAME = {
  trash: '垃圾',
  common: '普通',
  rare: '稀有',
  legendary: '传说',
  hidden: '隐藏',
  treasure: '宝藏',
  limited: '限定',
  rod_exclusive: '鱼竿专属',
};
const RARITY_COLOR = {
  trash: '#888888',
  common: '#bbbbbb',
  rare: '#4ec9b0',
  legendary: '#c586c0',
  hidden: '#ffd700',
  treasure: '#ff8c42',
  limited: '#ff7ac8',
  rod_exclusive: '#ff4500',
};
const HITS_BY_RARITY = {
  trash: 1,
  common: 2,
  rare: 3,
  legendary: 5,
  hidden: 7,
  treasure: 4,
  limited: 4,
  rod_exclusive: 5,
};
const BAITS = {
  worm: {
    name: '蚯蚓',
    price: 10,
    color: '#8b4513',
    desc: '入门鱼饵，能钓到些小鱼小虾',
    fishes: [
      ['sardine', '沙丁鱼', 'common', 0.05, 0.3, 30, '鱼'],
      ['crucian_s', '小鲫鱼', 'common', 0.1, 0.6, 25, '鱼'],
      ['tadpole', '蝌蚪', 'common', 0.01, 0.05, 200, '蛙'],
      ['catfish_s', '小鲶鱼', 'rare', 0.5, 2, 60, '鲶'],
      ['eel_s', '小鳗鱼', 'rare', 0.3, 1.2, 100, '鳗'],
      ['koi', '锦鲤', 'legendary', 2, 5, 400, '锦'],
      ['old_turtle', '千年龟', 'legendary', 5, 15, 250, '龟'],
      ['mud_dragon', '泥龙', 'hidden', 10, 30, 800, '龙'],
    ],
  },
  shrimp: {
    name: '鲜虾',
    price: 50,
    color: '#ff7f7f',
    desc: '海钓鱼饵，能引来肉食鱼',
    fishes: [
      ['mackerel', '鲭鱼', 'common', 0.5, 1.5, 60, '鲭'],
      ['squid_s', '小鱿鱼', 'common', 0.3, 1, 90, '鱿'],
      ['crab', '螃蟹', 'common', 0.2, 1, 120, '蟹'],
      ['tuna_s', '小金枪鱼', 'rare', 2, 6, 200, '枪'],
      ['octopus', '章鱼', 'rare', 1, 4, 250, '章'],
      ['sword', '剑鱼', 'legendary', 10, 30, 600, '剑'],
      ['kraken_baby', '幼海妖', 'hidden', 20, 60, 1500, '妖'],
    ],
  },
  lure: {
    name: '亮片假饵',
    price: 200,
    color: '#c0c0c0',
    desc: '吸引深海大鱼',
    fishes: [
      ['bass', '鲈鱼', 'common', 1, 4, 150, '鲈'],
      ['salmon', '三文鱼', 'common', 2, 6, 200, '鲑'],
      ['shark_s', '小鲨鱼', 'rare', 8, 25, 350, '鲨'],
      ['marlin_s', '小马林鱼', 'rare', 5, 20, 400, '马'],
      ['megalodon_b', '幼巨齿鲨', 'legendary', 30, 80, 800, '齿'],
      ['leviathan_s', '幼海蛇神', 'hidden', 80, 300, 2000, '蛇'],
    ],
  },
  magic: {
    name: '魔法鱼饵',
    price: 1000,
    color: '#c586c0',
    desc: '神秘鱼饵，能召唤奇异生物',
    fishes: [
      ['coelacanth', '腔棘鱼', 'common', 5, 20, 500, '棘'],
      ['crystal', '水晶鱼', 'rare', 1, 5, 4000, '晶'],
      ['siren', '人鱼', 'rare', 40, 80, 1500, '人'],
      ['phoenix_f', '凤凰鱼', 'legendary', 5, 20, 5000, '凤'],
      ['kraken', '海妖王', 'legendary', 100, 500, 1500, '王'],
      ['leviathan', '海蛇神', 'hidden', 200, 1000, 8000, '神'],
    ],
  },
  divine: {
    name: '神仙鱼饵',
    price: 10000,
    currency: 'diamonds',
    color: '#ffd700',
    desc: '只会钓到传说级和隐藏级的鱼',
    fishes: [
      ['koi', '锦鲤', 'legendary', 2, 5, 400, '锦'],
      ['phoenix_f', '凤凰鱼', 'legendary', 5, 20, 5000, '凤'],
      ['leviathan', '海蛇神', 'hidden', 200, 1000, 8000, '神'],
    ],
  },
};
Object.values(BAITS).forEach((bait) => {
  bait.fishes = bait.fishes.map(([id, name, rarity, minW, maxW, price, icon]) => ({ id, name, rarity, minW, maxW, price, icon }));
});
const TRASH = [
  { id: 'boot', name: '破靴子', rarity: 'trash', value: 0, icon: '靴' },
  { id: 'bottle', name: '空瓶', rarity: 'trash', value: 0, icon: '瓶' },
  { id: 'can', name: '易拉罐', rarity: 'trash', value: 0, icon: '罐' },
  { id: 'seaweed', name: '水草', rarity: 'trash', value: 0, icon: '草' },
];
const TREASURE = [
  { id: 'coin', name: '金币', rarity: 'treasure', value: 500, icon: '币' },
  { id: 'ring', name: '金戒指', rarity: 'treasure', value: 1500, icon: '戒' },
  { id: 'gem', name: '宝石', rarity: 'treasure', value: 3000, icon: '宝' },
  { id: 'chest', name: '宝箱', rarity: 'treasure', value: 10000, icon: '箱' },
];
const RODS = [
  { id: 'wood', name: '木竿', threshold: 0, price: 0, color: '#5d4037', hi: '#8d6e63', desc: '朴素的木质鱼竿' },
  { id: 'bamboo', name: '竹竿', threshold: 3, price: 300, color: '#6d9b3a', hi: '#8bc34a', desc: '翠绿的竹节鱼竿' },
  { id: 'iron', name: '铁竿', threshold: 8, price: 1200, color: '#607d8b', hi: '#90a4ae', desc: '坚固的铁质鱼竿' },
  { id: 'gold', name: '黄金竿', threshold: 15, price: 3600, color: '#f9a825', hi: '#ffd54f', desc: '闪耀的黄金鱼竿' },
  { id: 'star', name: '星辰竿', threshold: 28, price: 8800, color: '#1a237e', hi: '#ffd700', desc: '蕴含星辰之力的终极鱼竿' },
];
const GACHA_RODS = [
  { id: 'panda', name: '熊猫竿', icon: '熊', color: '#222', hi: '#fff', desc: '金币抽奖限定' },
  { id: 'nightmyst', name: '神秘暗夜竿', icon: '月', color: '#0a0a2e', hi: '#8b5cf6', desc: '金币抽奖限定' },
  { id: 'firekirin', name: '极品火麒麟鱼竿', icon: '火', color: '#8f1d0b', hi: '#ff6b00', desc: '钻石抽奖第一期' },
  { id: 'greenxuanwu', name: '极品绿玄武鱼竿', icon: '龟', color: '#14532d', hi: '#86efac', desc: '钻石抽奖第一期' },
  { id: 'headphone', name: '耳机竿', icon: '耳', color: '#1a1a2e', hi: '#00d4ff', desc: '钻石抽奖第二期' },
  { id: 'candy', name: 'Candy竿', icon: '糖', color: '#ff69b4', hi: '#fff0f5', desc: '钻石抽奖第二期' },
];
const CHARACTERS = [
  { id: 'fishing_master', name: '钓鱼高手', icon: '钓', desc: '初始角色', title: '码头上的老练新星' },
  { id: 'phoebe_cupid', name: '菲比丘比', icon: '菲', desc: '碎片合成', title: '隐海修会的祈光者' },
  { id: 'raiden_shogun', name: '雷电将军', icon: '雷', desc: '碎片合成', title: '雷鸣海域的执竿者' },
  { id: 'justin_bieber', name: 'justin bieber', icon: 'J', desc: '碎片合成', title: '湖边巡演的流行歌手' },
  { id: 'teemo', name: '提莫', icon: '提', desc: '碎片合成', title: '草丛旁的巡湖斥候' },
];
const PETS = [
  { id: 'cat', name: '小猫咪', icon: '猫', bonus: '金币+10' },
  { id: 'dog', name: '小狗狗', icon: '狗', bonus: '金币+10' },
  { id: 'parrot', name: '鹦鹉', icon: '鹦', bonus: '钻石+1' },
  { id: 'penguin', name: '小企鹅', icon: '企', bonus: '钻石+1' },
  { id: 'rabbit', name: '兔子', icon: '兔', bonus: '钻石+1' },
  { id: 'fox', name: '小狐狸', icon: '狐', bonus: '钻石+1' },
  { id: 'dragon', name: '小龙', icon: '龙', bonus: '钻石+5' },
  { id: 'unicorn', name: '独角兽', icon: '角', bonus: '钻石+5' },
];
const ACCESSORIES = [
  { id: 'scale_charm', name: '鳞光坠', icon: '鳞', color: '#66e6ff', desc: '提高稀有概率' },
  { id: 'tide_bracelet', name: '潮汐环', icon: '潮', color: '#4ec9b0', desc: '减慢命中条' },
  { id: 'star_brooch', name: '星砂针', icon: '星', color: '#ffd700', desc: '综合加成' },
];
const WEATHERS = [
  { id: 'sunny', name: '晴天', icon: '晴', wait: 1, rarityBoost: 0, hitSpeed: 1, zone: 1, desc: '稳定适合练手', tip: '适合补图鉴和刷金币' },
  { id: 'cloudy', name: '阴天', icon: '阴', wait: .92, rarityBoost: .015, hitSpeed: 1, zone: 1, desc: '鱼群更靠岸', tip: '普通鱼和稀有鱼都比较均衡' },
  { id: 'rain', name: '雨天', icon: '雨', wait: .78, rarityBoost: .035, hitSpeed: 1.08, zone: .96, desc: '咬钩更快', tip: '适合冲稀有鱼' },
  { id: 'fog', name: '雾天', icon: '雾', wait: .9, rarityBoost: .045, hitSpeed: 1.14, zone: .92, desc: '视野差但鱼更神秘', tip: '隐藏鱼概率略高' },
  { id: 'storm', name: '雷暴', icon: '雷', wait: .72, rarityBoost: .06, hitSpeed: 1.25, zone: .86, desc: '高风险高收益', tip: '适合冲榜和稀有收集' },
  { id: 'snow', name: '雪天', icon: '雪', wait: 1.12, rarityBoost: .025, hitSpeed: .95, zone: 1.05, desc: '节奏更慢', tip: '适合稳定连击' },
];
const SEASONS = [
  { id: 'spring', name: '春季', icon: '春', color: '#9bd77a', desc: '鱼类活跃，适合补图鉴' },
  { id: 'summer', name: '夏季', icon: '夏', color: '#ffd166', desc: '雷雨更多，适合冲稀有' },
  { id: 'autumn', name: '秋季', icon: '秋', color: '#ff9f43', desc: '鱼体更肥，收益更稳' },
  { id: 'winter', name: '冬季', icon: '冬', color: '#b8e6ff', desc: '节奏放慢，限定目标更多' },
];
const PROVINCES = ['广东', '浙江', '江苏', '四川', '山东', '河南', '湖北', '北京'];
const MOCK_PROVINCE_RANKS = [
  { name: '海风玩家', score: 16880 },
  { name: '今天也钓鱼', score: 13240 },
  { name: '湖边新星', score: 9650 },
  { name: '像素钓手', score: 7420 },
];
const MOCK_NATIONAL_RANKS = [
  { name: '全国钓王', province: '广东', score: 26880, bestFish: '海蛇神', bestWeight: 320 },
  { name: '暴雨冲榜手', province: '浙江', score: 22420, bestFish: '凤凰鱼', bestWeight: 18.6 },
  { name: '深海收藏家', province: '江苏', score: 19860, bestFish: '幼海蛇神', bestWeight: 210 },
  { name: '湖边冠军', province: '四川', score: 17640, bestFish: '锦鲤', bestWeight: 4.8 },
];
const MOCK_PROVINCE_WAR_RANKS = [
  { province: '广东', name: '广东队', score: 88600, members: 238, todayCatches: 620, bestPlayer: '珠江钓王', topScore: 16660 },
  { province: '浙江', name: '浙江队', score: 82450, members: 211, todayCatches: 588, bestPlayer: '西湖鱼客', topScore: 15420 },
  { province: '江苏', name: '江苏队', score: 79220, members: 197, todayCatches: 540, bestPlayer: '太湖猎手', topScore: 14880 },
  { province: '四川', name: '四川队', score: 73510, members: 184, todayCatches: 501, bestPlayer: '锦江钓手', topScore: 13940 },
];
const RANK_SCOPES = [
  ['provinceWar', '省队战'],
  ['province', '本省榜'],
  ['national', '全国榜'],
];
const DAILY_GOALS = [
  { id: 'catch1', icon: '首', name: '完成首钓', desc: '今天任意钓获 1 次', target: 1, metric: 'catchCount', reward: { money: 80 } },
  { id: 'catch3', icon: '练', name: '稳定练手', desc: '今天累计钓获 3 次', target: 3, metric: 'catchCount', reward: { money: 160 } },
  { id: 'score500', icon: '分', name: '省队贡献', desc: '今日累计获得 500 分', target: 500, metric: 'todayScore', reward: { money: 220 } },
  { id: 'checkWeather', icon: '天', name: '查看天气', desc: '打开天气预报 1 次', target: 1, metric: 'weatherSeen', reward: { money: 60 } },
  { id: 'openDex', icon: '鉴', name: '整理图鉴', desc: '打开鱼类图鉴 1 次', target: 1, metric: 'dexSeen', reward: { money: 60 } },
];
const TOP_BUTTONS = [
  ['shop', '商店'], ['dex', '图鉴'], ['task', '任务'], ['weather', '天气'], ['rank', '排行'],
];
const TOP_EMOJI = {
  shop: '🎁',
  dex: '📖',
  task: '✅',
  rod: '🎣',
  weather: '☁',
  rank: '🏆',
};
const BAIT_IDS = Object.keys(BAITS);
const FISH_DEX_FILTERS = [
  ['all', '全部'],
  ['common', '普通'],
  ['rare', '稀有'],
  ['legendary', '传说'],
  ['hidden', '隐藏'],
];
const TOP_ASSETS = {
  shop: 'ui_shop',
  dex: 'ui_dex',
  rod: 'rod_wood',
  weather: 'ui_share',
  rank: 'ui_rank',
};
const UI_LAYOUT_ASSETS = [
  'scene',
  'base',
  'menu_bag',
  'menu_shop',
  'menu_rank',
  'menu_task',
  'menu_dex',
  'menu_more',
  'menu_collection',
  'menu_idle',
  'event_alert',
  'control_meter',
  'button_cast',
  'rod_current',
  'button_tackle',
  'button_bait',
];
const ASSET_PATHS = {};
const IMAGES = {};

registerAssets();
preloadAssets();

function randomIdPart() {
  return Math.random().toString(36).slice(2, 10);
}
function localPlayerId() {
  try {
    let id = wx.getStorageSync(PLAYER_ID_KEY);
    id = String(id || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    if (!id) {
      id = `fc_${Date.now().toString(36)}_${randomIdPart()}`;
      wx.setStorageSync(PLAYER_ID_KEY, id);
    }
    return id;
  } catch (_) {
    return `fc_${randomIdPart()}`;
  }
}
function normalizeUsername(value) {
  const text = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  return text || localPlayerId();
}
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function freshUser() {
  return {
    username: localPlayerId(),
    money: 100,
    diamonds: 0,
    baits: { worm: 5, shrimp: 0, lure: 0, magic: 0, divine: 0 },
    currentBait: 'worm',
    dex: {},
    stats: { totalCatches: 0, totalEarned: 0, totalDiamonds: 0 },
    history: [],
    ownedRods: [],
    rodSkin: '',
    ownedCharacters: ['fishing_master'],
    activeCharacter: 'fishing_master',
    characterFragments: {},
    ownedPets: [],
    activePet: null,
    accessories: [],
    equippedAccessory: null,
    vipAuto: false,
    chances: { left: 10, max: 10, shareGrants: 0, lastDate: '' },
    province: '广东',
    ranking: { bestScore: 0, bestFish: '', bestWeight: 0, todayScore: 0, lastScoreDate: '' },
    calendar: { dayKey: '', season: 'spring', forecast: [] },
    daily: freshDaily(),
    lastFailure: null,
    lastShareDate: '',
  };
}

let user = loadUser();
let state = { phase: 'idle', hookX: W * 0.52, hookY: 250, wait: 0, bite: 0 };
let hb = { active: false, catch: null, hits: 0, need: 0, cursor: 0, dir: 1, zone: 0.4, width: 0.18, speed: 1, time: 12 };
let modal = null;
let status = user.stats.totalCatches ? '准备好后选择鱼饵抛竿' : '先点下方抛竿，完成今日目标';
let targets = [];
let last = Date.now();
let shopTab = 'bait';
let gachaTab = 'coins';
let gachaSeason = 1;
let vipTimer = 0;
let activeFishDexFilter = 'all';
let fishDexPage = 0;
let backendReady = false;
let backendSaveTimer = null;
let rankScope = 'provinceWar';
let rankCache = { provinceWar: null, province: null, national: null };
let rankMeta = {
  provinceWar: { total: 0, selfRank: 0, beatPercent: 0 },
  province: { total: 0, selfRank: 0, beatPercent: 0 },
  national: { total: 0, selfRank: 0, beatPercent: 0 },
};
let rankLoading = false;

function loadUser() {
  try {
    const saved = wx.getStorageSync(SAVE_KEY);
    return saved ? normalize({ ...freshUser(), ...saved }) : normalize(freshUser());
  } catch (_) {
    return normalize(freshUser());
  }
}
function normalize(u) {
  const f = freshUser();
  u.username = normalizeUsername(u.username);
  u.baits = { ...f.baits, ...(u.baits || {}) };
  u.dex = u.dex || {};
  u.stats = { ...f.stats, ...(u.stats || {}) };
  u.history = Array.isArray(u.history) ? u.history : [];
  u.ownedRods = Array.isArray(u.ownedRods) ? u.ownedRods : [];
  if (!u.ownedRods.includes('wood')) u.ownedRods.unshift('wood');
  u.ownedCharacters = Array.isArray(u.ownedCharacters) ? u.ownedCharacters : ['fishing_master'];
  if (!u.ownedCharacters.includes('fishing_master')) u.ownedCharacters.unshift('fishing_master');
  u.characterFragments = u.characterFragments || {};
  u.ownedPets = Array.isArray(u.ownedPets) ? u.ownedPets : [];
  u.accessories = Array.isArray(u.accessories) ? u.accessories : [];
  u.vipAuto = !!u.vipAuto;
  u.chances = { ...f.chances, ...(u.chances || {}) };
  u.province = PROVINCES.includes(u.province) ? u.province : f.province;
  u.ranking = { ...f.ranking, ...(u.ranking || {}) };
  u.calendar = ensureCalendar({ ...f.calendar, ...(u.calendar || {}) });
  u.daily = ensureDaily({ ...f.daily, ...(u.daily || {}) });
  u.lastFailure = u.lastFailure || null;
  const today = dateKey();
  if (u.chances.lastDate !== today) {
    u.chances.left = u.chances.max;
    u.chances.shareGrants = 0;
    u.chances.lastDate = today;
  }
  if (u.ranking.lastScoreDate !== today) {
    u.ranking.todayScore = 0;
    u.ranking.lastScoreDate = today;
  }
  return u;
}
function persistLocalUser() {
  normalize(user);
  wx.setStorageSync(SAVE_KEY, user);
}
function saveUser() {
  persistLocalUser();
  scheduleBackendSave();
}
function backendAvailable() {
  return typeof fetch === 'function' || (wx && typeof wx.request === 'function');
}
function apiPost(path, body) {
  if (!backendAvailable()) return Promise.reject(new Error('当前环境不支持网络请求'));
  const payload = JSON.stringify(body || {});
  if (typeof fetch === 'function') {
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: payload,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    });
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + path,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: body || {},
      success(res) {
        const data = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(data.error || `HTTP ${res.statusCode}`));
      },
      fail(err) {
        reject(new Error(err && err.errMsg ? err.errMsg : '网络请求失败'));
      },
    });
  });
}
function scheduleBackendSave(delay = 600) {
  if (!backendAvailable()) return;
  clearTimeout(backendSaveTimer);
  backendSaveTimer = setTimeout(() => {
    const snapshot = cloneJson(normalize(user));
    apiPost('/api/save', { username: snapshot.username, state: snapshot })
      .then(() => { backendReady = true; })
      .catch((error) => {
        backendReady = false;
        console.warn('cloud save failed', error);
      });
  }, delay);
}
async function syncBackendUser() {
  if (!backendAvailable()) return;
  const snapshot = cloneJson(normalize(user));
  try {
    const remote = await apiPost('/api/login', { username: snapshot.username, state: snapshot });
    const pendingRewards = remote.pendingRankRewards || [];
    delete remote.pendingRankRewards;
    user = normalize({ ...snapshot, ...remote });
    persistLocalUser();
    backendReady = true;
    status = pendingRewards.length ? '云端存档已同步，获得排名奖励' : '云端存档已同步';
    loadRank(rankScope);
  } catch (error) {
    backendReady = false;
    status = '云端同步失败，使用本地存档';
    console.warn('cloud login failed', error);
  }
}
async function loadRank(scope = rankScope) {
  if (!backendAvailable() || rankLoading) return;
  const safeScope = scope === 'national' ? 'national' : scope === 'province' ? 'province' : 'provinceWar';
  rankLoading = true;
  const snapshot = cloneJson(normalize(user));
  try {
    const body = { username: snapshot.username, scope: safeScope, state: snapshot };
    if (safeScope === 'province') body.province = snapshot.province;
    const data = await apiPost('/api/leaderboard', body);
    rankCache[safeScope] = Array.isArray(data.rows) ? data.rows : null;
    rankMeta[safeScope] = {
      total: Math.max(0, Number(data.total) || 0),
      selfRank: Math.max(0, Number(data.selfRank) || 0),
      beatPercent: Math.max(0, Math.min(99, Number(data.beatPercent) || 0)),
      generatedAt: data.generatedAt || Date.now(),
    };
    backendReady = true;
  } catch (error) {
    backendReady = false;
    console.warn('rank load failed', error);
  } finally {
    rankLoading = false;
  }
}
function loadProvinceRank() {
  return loadRank('province');
}
function addTarget(id, x, y, w, h, data) {
  targets.push({ id, x, y, w, h, data });
}
function hitTarget(x, y, t) {
  return x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pad2(n) {
  return String(n).padStart(2, '0');
}
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function freshDaily(dayKey = dateKey()) {
  return {
    dayKey,
    claimed: {},
    weatherSeen: false,
    dexSeen: false,
    guideSeen: false,
  };
}
function ensureDaily(daily) {
  const today = dateKey();
  const source = daily || {};
  const sourceDay = source.dayKey || source.date || '';
  if (sourceDay !== today) return freshDaily(today);
  return {
    dayKey: today,
    claimed: source.claimed && typeof source.claimed === 'object' ? source.claimed : {},
    weatherSeen: !!source.weatherSeen,
    dexSeen: !!source.dexSeen,
    guideSeen: !!source.guideSeen,
  };
}
function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}
function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}
function seasonForDate(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return SEASONS[0];
  if (month >= 6 && month <= 8) return SEASONS[1];
  if (month >= 9 && month <= 11) return SEASONS[2];
  return SEASONS[3];
}
function weatherForDateKey(key, seasonId) {
  const roll = hashString(`${key}:${seasonId}`) % 100;
  if (seasonId === 'winter' && roll < 24) return WEATHERS.find((w) => w.id === 'snow');
  if (seasonId === 'summer' && roll < 18) return WEATHERS.find((w) => w.id === 'storm');
  if (roll < 30) return WEATHERS.find((w) => w.id === 'sunny');
  if (roll < 50) return WEATHERS.find((w) => w.id === 'cloudy');
  if (roll < 70) return WEATHERS.find((w) => w.id === 'rain');
  if (roll < 84) return WEATHERS.find((w) => w.id === 'fog');
  if (roll < 94) return WEATHERS.find((w) => w.id === 'storm');
  return WEATHERS.find((w) => w.id === 'snow');
}
function generateForecast(days = 7) {
  const now = new Date();
  const forecast = [];
  for (let i = 0; i < days; i += 1) {
    const d = addDays(now, i);
    const season = seasonForDate(d);
    const key = dateKey(d);
    forecast.push({ key, season: season.id, weather: weatherForDateKey(key, season.id).id });
  }
  return forecast;
}
function ensureCalendar(calendar) {
  const today = dateKey();
  if (!calendar || calendar.dayKey !== today || !Array.isArray(calendar.forecast) || calendar.forecast.length < 3) {
    const season = seasonForDate();
    return { dayKey: today, season: season.id, forecast: generateForecast(7) };
  }
  return calendar;
}
function todayWeather() {
  const today = user.calendar.forecast.find((item) => item.key === user.calendar.dayKey) || user.calendar.forecast[0];
  return WEATHERS.find((w) => w.id === today.weather) || WEATHERS[0];
}
function todaySeason() {
  const today = user.calendar.forecast.find((item) => item.key === user.calendar.dayKey) || user.calendar.forecast[0];
  return SEASONS.find((s) => s.id === today.season) || seasonForDate();
}
function environmentEffects() {
  const weather = todayWeather();
  const season = todaySeason();
  const seasonBoost = season.id === 'spring' ? .01 : season.id === 'summer' ? .015 : season.id === 'winter' ? .005 : 0;
  const valueBonus = season.id === 'autumn' ? .12 : 0;
  const waitSeason = season.id === 'winter' ? 1.08 : season.id === 'spring' ? .96 : 1;
  return {
    weather,
    season,
    wait: weather.wait * waitSeason,
    rarityBoost: weather.rarityBoost + seasonBoost,
    hitSpeed: weather.hitSpeed,
    zone: weather.zone,
    valueBonus,
  };
}
function grantChance(reason, source = 'manual', extra = {}) {
  const before = analyticsNumber(user.chances.left);
  user.chances.left = Math.min(user.chances.max, user.chances.left + 1);
  const gained = analyticsNumber(user.chances.left) - before;
  playSfx(gained > 0 ? 'reward' : 'error');
  status = reason || '获得 1 次钓鱼机会';
  saveUser();
  reportEconomyChange({
    action: 'chance_recover',
    recover_method: source,
    chance_left_before: before,
    chance_left_after: analyticsNumber(user.chances.left),
    chance_gain: Math.max(0, gained),
    ...extra,
  });
}
function failCatch(reason) {
  const failedCatch = hb.catch;
  state.phase = 'idle';
  hb.active = false;
  hb.catch = null;
  const textMap = {
    slow: '反应慢了一点，鱼跑了',
    miss: '差一点命中，鱼脱钩了',
    timeout: '收线超时，鱼跑了',
    noChance: '今天的钓鱼次数用完了',
  };
  status = textMap[reason] || '这次没钓上来';
  playSfx(reason === 'noChance' ? 'error' : 'fail');
  user.lastFailure = { reason, at: Date.now(), province: user.province };
  modal = { type: 'failure', reason };
  saveUser();
  reportEventSafe('fish_result', {
    result: 'failure',
    fail_reason: reason || 'unknown',
    fish_id: failedCatch && failedCatch.item && failedCatch.item.id || '',
    fish_kind: failedCatch && failedCatch.kind || '',
    rarity: failedCatch && failedCatch.rarity || '',
    hits_done: analyticsNumber(hb.hits),
    hits_need: analyticsNumber(hb.need),
    score: 0,
  });
}
function catchScore(c) {
  const rarityScore = { trash: 10, common: 60, rare: 180, legendary: 520, hidden: 1200, treasure: 260, limited: 420, rod_exclusive: 500 };
  const base = rarityScore[c.rarity] || 60;
  const weightScore = c.weight ? Math.round(c.weight * 18) : 0;
  const env = environmentEffects();
  const envBonus = Math.round(base * (env.rarityBoost + env.valueBonus));
  return base + weightScore + envBonus;
}
function rankLabel(scope = rankScope) {
  if (scope === 'provinceWar') return '省队冲榜';
  return scope === 'national' ? '全国榜' : `${user.province}省份榜`;
}
function rankRows(scope = rankScope) {
  const safeScope = scope === 'national' ? 'national' : scope === 'province' ? 'province' : 'provinceWar';
  if (safeScope === 'provinceWar') {
    const cachedRows = rankCache.provinceWar;
    const remoteRows = Array.isArray(cachedRows) && cachedRows.length
      ? cachedRows.map((row) => ({
        province: row.province || row.name,
        name: row.name || `${row.province}队`,
        score: row.score || row.todayScore || 0,
        todayScore: row.todayScore || row.score || 0,
        members: row.members || 0,
        todayCatches: row.todayCatches || 0,
        bestPlayer: row.bestPlayer || '',
        topScore: row.topScore || 0,
        self: row.province === user.province || row.self === true,
      }))
      : MOCK_PROVINCE_WAR_RANKS.map((row) => ({ ...row, self: row.province === user.province }));
    const byProvince = new Map(remoteRows.map((row) => [row.province, row]));
    if (!byProvince.has(user.province)) {
      byProvince.set(user.province, {
        province: user.province,
        name: `${user.province}队`,
        score: user.ranking.todayScore || 0,
        todayScore: user.ranking.todayScore || 0,
        members: user.stats.totalCatches ? 1 : 0,
        todayCatches: user.stats.totalCatches || 0,
        bestPlayer: user.username,
        topScore: user.ranking.bestScore || 0,
        self: true,
      });
    }
    return [...byProvince.values()].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.members || 0) - (a.members || 0));
  }
  const own = {
    username: user.username,
    name: user.username,
    province: user.province,
    score: user.ranking.bestScore || 0,
    todayScore: user.ranking.todayScore || 0,
    bestFish: user.ranking.bestFish || '',
    bestWeight: user.ranking.bestWeight || 0,
    totalCatches: user.stats.totalCatches || 0,
    self: true,
  };
  const cachedRows = rankCache[safeScope];
  const mockRows = safeScope === 'national' ? MOCK_NATIONAL_RANKS : MOCK_PROVINCE_RANKS;
  const remoteRows = Array.isArray(cachedRows) && cachedRows.length
    ? cachedRows.map((row) => ({
      username: row.username || row.name,
      name: row.name || row.username,
      province: row.province || user.province,
      score: row.score || 0,
      todayScore: row.todayScore || 0,
      totalCatches: row.totalCatches || 0,
      bestFish: row.bestFish || '',
      bestWeight: row.bestWeight || 0,
      self: row.username === user.username || row.self === true,
    }))
    : mockRows;
  const byName = new Map(remoteRows.map((row) => [row.name, row]));
  const existing = byName.get(own.name) || {};
  byName.set(own.name, { ...existing, ...own, score: Math.max(own.score, existing.score || 0), self: true });
  return [...byName.values()].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.todayScore || 0) - (a.todayScore || 0));
}
function rankSummary(scope = rankScope) {
  const safeScope = scope === 'national' ? 'national' : scope === 'province' ? 'province' : 'provinceWar';
  const rows = rankRows(safeScope);
  const ownIndex = rows.findIndex((row) => row.self);
  const fallbackRank = ownIndex >= 0 ? ownIndex + 1 : rows.length || 1;
  const meta = rankMeta[safeScope] || {};
  const total = Math.max(Number(meta.total) || 0, rows.length || 1, fallbackRank);
  const selfRank = Number(meta.selfRank) > 0 ? Number(meta.selfRank) : fallbackRank;
  const beatPercent = Number(meta.beatPercent) > 0
    ? Math.round(Number(meta.beatPercent))
    : Math.max(0, Math.min(99, Math.round((total - selfRank) / Math.max(1, total) * 100)));
  const nextRow = rows[selfRank - 2] || null;
  const ownRow = rows.find((row) => row.self) || null;
  const ownScore = safeScope === 'provinceWar' ? (ownRow && ownRow.score || 0) : (user.ranking.bestScore || 0);
  const gap = nextRow && !nextRow.self ? Math.max(0, (nextRow.score || 0) - ownScore + 1) : 0;
  return { rows, total, selfRank, beatPercent, gap, nextRow, ownRow };
}
function rankSummaryText(scope = rankScope) {
  const summary = rankSummary(scope);
  if (scope === 'provinceWar') {
    const base = `${user.province}队第 ${summary.selfRank}/${summary.total} 名 · 超过 ${summary.beatPercent}% 省队`;
    if (summary.gap > 0) return `${base} · 距上一省 ${summary.gap} 分`;
    return `${base} · 继续为本省上分`;
  }
  const base = `${rankLabel(scope)}第 ${summary.selfRank}/${summary.total} 名 · 超过 ${summary.beatPercent}% 玩家`;
  if (summary.gap > 0) return `${base} · 距上一名 ${summary.gap} 分`;
  return `${base} · 继续扩大领先`;
}
function todayCatchCount() {
  const today = dateKey();
  return (user.history || []).filter((item) => {
    const at = Number(item && item.at) || 0;
    return at && dateKey(new Date(at)) === today;
  }).length;
}
function dailyGoalProgress(goal) {
  user.daily = ensureDaily(user.daily);
  if (goal.metric === 'catchCount') return todayCatchCount();
  if (goal.metric === 'todayScore') return user.ranking.todayScore || 0;
  if (goal.metric === 'weatherSeen') return user.daily.weatherSeen ? 1 : 0;
  if (goal.metric === 'dexSeen') return user.daily.dexSeen ? 1 : 0;
  return 0;
}
function dailyGoalReady(goal) {
  return dailyGoalProgress(goal) >= goal.target;
}
function dailyGoalClaimed(goal) {
  user.daily = ensureDaily(user.daily);
  return !!user.daily.claimed[goal.id];
}
function dailyGoalRewardText(goal) {
  const reward = goal.reward || {};
  const parts = [];
  if (reward.money) parts.push(`${reward.money}金币`);
  if (reward.diamonds) parts.push(`${reward.diamonds}钻石`);
  if (reward.chances) parts.push(`${reward.chances}次机会`);
  return parts.join(' + ') || '奖励';
}
function dailyGoalCounts() {
  const completed = DAILY_GOALS.filter((goal) => dailyGoalReady(goal)).length;
  const claimed = DAILY_GOALS.filter((goal) => dailyGoalClaimed(goal)).length;
  const claimable = DAILY_GOALS.filter((goal) => dailyGoalReady(goal) && !dailyGoalClaimed(goal)).length;
  return { completed, claimed, claimable, total: DAILY_GOALS.length };
}
function applyDailyGoalReward(goal) {
  const reward = goal.reward || {};
  user.money += reward.money || 0;
  user.diamonds += reward.diamonds || 0;
  if (reward.chances) user.chances.left = Math.min(user.chances.max, (user.chances.left || 0) + reward.chances);
}
function claimDailyGoal(id) {
  const goal = DAILY_GOALS.find((item) => item.id === id);
  if (!goal) return;
  user.daily = ensureDaily(user.daily);
  if (user.daily.claimed[goal.id]) {
    status = '这个目标奖励已经领取过了';
    playSfx('error');
    return;
  }
  if (!dailyGoalReady(goal)) {
    status = '目标还没有完成，继续钓鱼或查看相关入口';
    playSfx('error');
    return;
  }
  const moneyBefore = analyticsNumber(user.money);
  const diamondsBefore = analyticsNumber(user.diamonds);
  const chanceBefore = analyticsNumber(user.chances.left);
  applyDailyGoalReward(goal);
  user.daily.claimed[goal.id] = true;
  status = `已领取${goal.name}奖励：${dailyGoalRewardText(goal)}`;
  playSfx('reward');
  saveUser();
  reportEconomyChange({
    action: 'daily_goal_claim',
    item_type: 'daily_goal',
    item_id: goal.id,
    currency: 'mixed',
    amount: analyticsNumber(user.money) - moneyBefore,
    diamond_amount: analyticsNumber(user.diamonds) - diamondsBefore,
    chance_gain: analyticsNumber(user.chances.left) - chanceBefore,
  });
}
function markDailyFlag(flag) {
  user.daily = ensureDaily(user.daily);
  if (!user.daily[flag]) {
    user.daily[flag] = true;
    saveUser();
  }
}
function allFishDexItems() {
  const byId = new Map();
  BAIT_IDS.forEach((baitId) => {
    const bait = BAITS[baitId];
    bait.fishes.forEach((item) => {
      if (!byId.has(item.id)) byId.set(item.id, { ...item, baitIds: [] });
      const entry = byId.get(item.id);
      if (!entry.baitIds.includes(baitId)) entry.baitIds.push(baitId);
    });
  });
  return [...byId.values()];
}
function baitNamesForFish(item) {
  return (item.baitIds || [])
    .map((id) => BAITS[id] && BAITS[id].name)
    .filter(Boolean)
    .join(' / ');
}
function baitRaritySummary(bait) {
  const counts = bait.fishes.reduce((acc, fish) => {
    acc[fish.rarity] = (acc[fish.rarity] || 0) + 1;
    return acc;
  }, {});
  return ['common', 'rare', 'legendary', 'hidden']
    .filter((rarity) => counts[rarity])
    .map((rarity) => `${RARITY_NAME[rarity]}${counts[rarity]}`)
    .join(' · ');
}
function ownedRodList() {
  const base = RODS.filter((rod) => user.ownedRods.includes(rod.id));
  const gacha = GACHA_RODS.filter((rod) => user.ownedRods.includes(rod.id));
  return base.concat(gacha).length ? base.concat(gacha) : [RODS[0]];
}
function activeRod() {
  const gacha = GACHA_RODS.find((r) => r.id === user.rodSkin && user.ownedRods.includes(r.id));
  if (gacha) return gacha;
  const selected = RODS.find((r) => r.id === user.rodSkin && user.ownedRods.includes(r.id));
  if (selected) return selected;
  return ownedRodList().filter((r) => RODS.some((base) => base.id === r.id)).pop() || RODS[0];
}
function nextRod() {
  const dexCount = Object.keys(user.dex).length;
  return RODS.find((r) => !user.ownedRods.includes(r.id) && dexCount >= r.threshold)
    || RODS.find((r) => !user.ownedRods.includes(r.id))
    || null;
}
function accessoryEffects() {
  const acc = user.accessories.find((a) => a.uid === user.equippedAccessory);
  if (!acc) return { rarityBoost: 0, slow: 0 };
  if (acc.type === 'scale_charm') return { rarityBoost: Math.min(0.16, 0.006 * acc.star), slow: 0 };
  if (acc.type === 'tide_bracelet') return { rarityBoost: 0, slow: Math.min(0.35, 0.012 * acc.star) };
  return { rarityBoost: Math.min(0.10, 0.003 * acc.star), slow: Math.min(0.24, 0.006 * acc.star) };
}
function weightedRarity() {
  const boost = accessoryEffects().rarityBoost + environmentEffects().rarityBoost;
  const table = [['common', Math.max(.54, .70 - boost)], ['rare', .255 + boost * .70], ['legendary', .04 + boost * .23], ['hidden', .005 + boost * .07]];
  let r = Math.random();
  for (const item of table) {
    r -= item[1];
    if (r <= 0) return item[0];
  }
  return 'common';
}
function rollCatch() {
  const bait = BAITS[user.currentBait] || BAITS.worm;
  if (user.currentBait !== 'divine') {
    const r = Math.random();
    if (r < 0.20) return { kind: 'trash', item: pick(TRASH), rarity: 'trash', weight: 0, value: 0, diamondValue: 0 };
    if (r < 0.22) {
      const item = pick(TREASURE);
      return { kind: 'treasure', item, rarity: 'treasure', weight: 0, value: item.value, diamondValue: item.id === 'gem' ? 5 : 0 };
    }
  }
  const rarity = user.currentBait === 'divine' ? (Math.random() < .22 ? 'hidden' : 'legendary') : weightedRarity();
  const pool = bait.fishes.filter((f) => f.rarity === rarity);
  const item = pick(pool.length ? pool : bait.fishes);
  const weight = +(item.minW + Math.random() * (item.maxW - item.minW)).toFixed(2);
  return { kind: 'fish', item, rarity: item.rarity, weight, value: Math.max(1, Math.round(weight * item.price)), diamondValue: 0 };
}
function cast() {
  if (state.phase !== 'idle') return;
  const count = user.baits[user.currentBait] || 0;
  if (count <= 0) {
    status = '鱼饵不足：点商店补货，也可先领今日目标奖励';
    playSfx('error');
    reportEventSafe('fish_cast', {
      success: false,
      fail_reason: 'no_bait',
      bait_count_before: count,
      chance_left_before: analyticsNumber(user.chances.left),
    });
    return;
  }
  if ((user.chances.left || 0) <= 0) {
    reportEventSafe('fish_cast', {
      success: false,
      fail_reason: 'no_chance',
      bait_count_before: count,
      chance_left_before: analyticsNumber(user.chances.left),
    });
    failCatch('noChance');
    return;
  }
  const baitBefore = count;
  const chanceBefore = analyticsNumber(user.chances.left);
  user.baits[user.currentBait] -= 1;
  user.chances.left -= 1;
  const env = environmentEffects();
  state.phase = 'waiting';
  state.wait = (1.1 + Math.random() * 2.2) * env.wait;
  state.hookX = W * 0.5 + (Math.random() - .5) * 80;
  state.hookY = sceneTop() + sceneHeight() * .52 + Math.random() * 30;
  status = `${env.season.name}${env.weather.name}，已抛竿等待上钩...`;
  playSfx('cast');
  saveUser();
  reportEventSafe('fish_cast', {
    success: true,
    bait_count_before: baitBefore,
    bait_count_after: analyticsNumber(user.baits[user.currentBait]),
    chance_left_before: chanceBefore,
    chance_left_after: analyticsNumber(user.chances.left),
    wait_seconds: Math.round(state.wait * 100) / 100,
  });
}
function startHitbar() {
  if (state.phase !== 'hooked') return;
  state.phase = 'reeling';
  hb.catch = rollCatch();
  hb.hits = 0;
  hb.need = HITS_BY_RARITY[hb.catch.rarity] || 2;
  hb.cursor = 0;
  hb.dir = 1;
  const env = environmentEffects();
  hb.width = Math.max(.09, (.28 - hb.need * .025) * env.zone);
  hb.zone = Math.random() * (1 - hb.width);
  hb.speed = (.75 + hb.need * .17) * (1 - accessoryEffects().slow) * env.hitSpeed;
  hb.time = 12;
  hb.active = true;
  status = `${RARITY_NAME[hb.catch.rarity]}级目标上钩了`;
  playSfx('hit');
}
function hitbarClick() {
  if (!hb.active || state.phase !== 'reeling') return;
  if (hb.cursor < hb.zone || hb.cursor > hb.zone + hb.width) {
    failCatch('miss');
    return;
  }
  hb.hits += 1;
  playSfx('hit');
  if (hb.hits < hb.need) {
    hb.zone = Math.random() * (1 - hb.width);
    status = `命中！${hb.hits}/${hb.need}`;
    return;
  }
  applyCatch(hb.catch);
  modal = { type: 'result', catch: hb.catch };
  hb.active = false;
  state.phase = 'idle';
  saveUser();
  loadRank(rankScope);
}
function petBonus() {
  if (!user.activePet) return { coins: 0, diamonds: 0 };
  if (user.activePet === 'cat' || user.activePet === 'dog') return { coins: 10, diamonds: 0 };
  if (user.activePet === 'dragon' || user.activePet === 'unicorn') return { coins: 0, diamonds: 5 };
  return { coins: 0, diamonds: 1 };
}
function applyCatch(c) {
  const bonus = petBonus();
  const env = environmentEffects();
  const envCoinBonus = Math.round(c.value * env.valueBonus);
  const coinGain = c.value + envCoinBonus + bonus.coins;
  const diamondGain = c.diamondValue + bonus.diamonds;
  const isNewDex = !user.dex[c.item.id];
  const previousBestScore = user.ranking.bestScore || 0;
  user.money += coinGain;
  user.diamonds += diamondGain;
  user.dex[c.item.id] = user.dex[c.item.id] || { count: 0, maxWeight: 0 };
  user.dex[c.item.id].count += 1;
  user.dex[c.item.id].maxWeight = Math.max(user.dex[c.item.id].maxWeight || 0, c.weight);
  user.stats.totalCatches += 1;
  user.stats.totalEarned += c.value + envCoinBonus;
  user.stats.totalDiamonds += c.diamondValue + bonus.diamonds;
  const score = catchScore(c);
  user.ranking.todayScore += score;
  if (score > (user.ranking.bestScore || 0)) {
    user.ranking.bestScore = score;
    user.ranking.bestFish = c.item.name;
    user.ranking.bestWeight = c.weight || 0;
  }
  user.history.unshift({ name: c.item.name, rarity: c.rarity, weight: c.weight, value: c.value, score, at: Date.now() });
  if (user.history.length > 30) user.history.length = 30;
  status = `钓到 ${c.item.name}，本局 ${score} 分`;
  playSfx('catchSuccess');
  reportEventSafe('fish_result', {
    result: 'success',
    fish_id: c.item.id,
    fish_kind: c.kind,
    rarity: c.rarity,
    weight: c.weight || 0,
    score,
    coin_gain: coinGain,
    diamond_gain: diamondGain,
    is_new_dex: isNewDex,
    is_best_score: score > previousBestScore,
  });
}
function buyBait(id, count) {
  const bait = BAITS[id];
  count = Math.max(1, Math.floor(Number(count) || 0));
  const cost = bait.price * count;
  const cur = bait.currency === 'diamonds' ? 'diamonds' : 'money';
  if (user[cur] < cost) {
    status = cur === 'diamonds' ? '钻石不足' : '金币不足';
    playSfx('error');
    return;
  }
  user[cur] -= cost;
  user.baits[id] = (user.baits[id] || 0) + count;
  status = `购买 ${count} 个${bait.name}`;
  playSfx('buy');
  saveUser();
  reportEconomyChange({
    action: 'buy_bait',
    item_type: 'bait',
    item_id: id,
    item_count: count,
    currency: cur === 'diamonds' ? 'diamonds' : 'money',
    amount: -cost,
    balance_after: analyticsNumber(user[cur]),
    item_count_after: analyticsNumber(user.baits[id]),
  });
}
function buyRod(id) {
  const rod = RODS.find((item) => item.id === id);
  if (!rod) return;
  const dexCount = Object.keys(user.dex).length;
  if (dexCount < rod.threshold) {
    status = `图鉴 ${dexCount}/${rod.threshold}，暂不能购买${rod.name}`;
    playSfx('error');
    return;
  }
  if (user.ownedRods.includes(id)) {
    user.rodSkin = id;
    status = `已装备${rod.name}`;
    playSfx('switch');
    saveUser();
    return;
  }
  if (user.money < rod.price) {
    status = `金币不足，购买${rod.name}需要 ${rod.price}`;
    playSfx('error');
    return;
  }
  user.money -= rod.price;
  user.ownedRods.push(id);
  user.rodSkin = id;
  status = `购买并装备${rod.name}`;
  playSfx('buy');
  saveUser();
  reportEconomyChange({
    action: 'buy_rod',
    item_type: 'rod',
    item_id: id,
    currency: 'money',
    amount: -rod.price,
    balance_after: analyticsNumber(user.money),
    owned_rod_count: user.ownedRods.length,
  });
}
function askBuyBaitCount(id) {
  const bait = BAITS[id];
  if (!bait) return;
  wx.showModal({
    title: `购买${bait.name}`,
    content: `${bait.currency === 'diamonds' ? '钻石' : '金币'} ${bait.price}/个`,
    editable: true,
    placeholderText: '请输入数量',
    success(res) {
      if (!res.confirm) return;
      const count = Math.floor(Number(res.content));
      if (!Number.isFinite(count) || count <= 0) {
        status = '购买数量不正确';
        playSfx('error');
        return;
      }
      buyBait(id, count);
    },
  });
}
function changeBait(delta) {
  if (state.phase !== 'idle') {
    status = '钓鱼中不能切换鱼饵';
    playSfx('error');
    return;
  }
  const current = Math.max(0, BAIT_IDS.indexOf(user.currentBait));
  user.currentBait = BAIT_IDS[(current + delta + BAIT_IDS.length) % BAIT_IDS.length];
  status = `当前鱼饵：${BAITS[user.currentBait].name}`;
  playSfx('switch');
  saveUser();
}
function changeRod(delta) {
  if (state.phase !== 'idle') {
    status = '钓鱼中不能切换鱼竿';
    playSfx('error');
    return;
  }
  const rods = ownedRodList();
  const current = activeRod();
  const index = Math.max(0, rods.findIndex((rod) => rod.id === current.id));
  const next = rods[(index + delta + rods.length) % rods.length];
  user.rodSkin = next.id;
  status = `当前鱼竿：${next.name}`;
  playSfx('switch');
  saveUser();
}
async function doGacha(count) {
  const isDiamond = gachaTab === 'diamonds';
  const cost = isDiamond ? (count === 10 ? 90 : 10) : (count === 10 ? (gachaSeason === 2 ? 100000 : 9000) : (gachaSeason === 2 ? 10000 : 1000));
  const cur = isDiamond ? 'diamonds' : 'money';
  if (user[cur] < cost) {
    status = isDiamond ? '钻石不足' : '金币不足';
    playSfx('error');
    return;
  }
  const balanceBefore = analyticsNumber(user[cur]);
  status = '正在连接云端抽奖...';
  try {
    const data = await apiPost('/api/gacha', {
      username: user.username,
      count,
      currency: gachaTab,
      season: gachaSeason,
      state: cloneJson(normalize(user)),
    });
    user = normalize(data.user || user);
    persistLocalUser();
    modal.result = Array.isArray(data.results) ? data.results : [];
    status = '抽奖完成';
    playSfx('reward');
    reportEconomyChange({
      action: 'gacha',
      currency: cur,
      amount: -cost,
      draw_count: count,
      gacha_tab: gachaTab,
      gacha_season: gachaSeason,
      balance_before: balanceBefore,
      balance_after: analyticsNumber(user[cur]),
      result_count: modal.result.length,
    });
    loadRank(rankScope);
  } catch (error) {
    status = error.message || '抽奖失败';
    playSfx('error');
  }
}
function addUnique(list, id) {
  if (!list.includes(id)) list.push(id);
}
function applyGachaRoll() {
  const roll = Math.random() * 100;
  if (gachaTab === 'coins' && gachaSeason === 2) {
    const pet = roll < .1 ? 'cat' : roll < .2 ? 'dog' : roll < .25 ? 'parrot' : roll < .3 ? 'penguin' : roll < .35 ? 'rabbit' : roll < .4 ? 'fox' : roll < .41 ? 'dragon' : roll < .42 ? 'unicorn' : '';
    if (pet) {
      addUnique(user.ownedPets, pet);
      return { icon: '宠', text: PETS.find((p) => p.id === pet).name, asset: 'pet_' + pet };
    }
    if (roll < 10.42) {
      user.diamonds += 10;
      return { icon: '钻', text: '10 钻石', asset: 'ui_redeem' };
    }
    user.money += 1;
    return { icon: '币', text: '1 金币', asset: 'ui_gacha' };
  }
  if (gachaTab === 'diamonds' && gachaSeason === 3) {
    if (roll < 30) {
      const def = ACCESSORIES[Math.floor(roll / 10)];
      user.accessories.push({ uid: 'acc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: def.id, star: 1 });
      return { icon: def.icon, text: def.name, asset: 'accessory_' + def.id };
    }
    user.money += 100;
    return { icon: '币', text: '100 金币', asset: 'ui_gacha' };
  }
  if (gachaTab === 'diamonds' && gachaSeason === 2) {
    if (roll < .01) {
      addUnique(user.ownedRods, 'headphone');
      return { icon: '耳', text: '耳机竿', asset: 'rod_headphone' };
    }
    if (roll < 1) {
      addUnique(user.ownedRods, 'candy');
      return { icon: '糖', text: 'Candy竿', asset: 'rod_candy' };
    }
    if (roll < 11) {
      user.diamonds += 10;
      return { icon: '钻', text: '10 钻石', asset: 'ui_redeem' };
    }
    user.money += 1000;
    return { icon: '币', text: '1000 金币', asset: 'ui_gacha' };
  }
  if (gachaTab === 'diamonds') {
    if (roll < 1) {
      addUnique(user.ownedRods, 'firekirin');
      return { icon: '火', text: '极品火麒麟鱼竿', asset: 'rod_firekirin' };
    }
    if (roll < 2) {
      addUnique(user.ownedRods, 'greenxuanwu');
      return { icon: '龟', text: '极品绿玄武鱼竿', asset: 'rod_greenxuanwu' };
    }
    if (roll < 10) {
      user.diamonds += 10;
      return { icon: '钻', text: '10 钻石', asset: 'ui_redeem' };
    }
    user.money += 1000;
    return { icon: '币', text: '1000 金币', asset: 'ui_gacha' };
  }
  if (roll < .1) {
    addUnique(user.ownedRods, 'nightmyst');
    return { icon: '月', text: '神秘暗夜竿', asset: 'rod_nightmyst' };
  }
  if (roll < 1.1) {
    addUnique(user.ownedRods, 'panda');
    return { icon: '熊', text: '熊猫竿', asset: 'rod_panda' };
  }
  if (roll < 10) {
    user.money += 1000;
    return { icon: '币', text: '1000 金币', asset: 'ui_gacha' };
  }
  user.money += 1;
  return { icon: '币', text: '1 金币', asset: 'ui_gacha' };
}
async function redeemCode(code) {
  status = '正在兑换...';
  try {
    const data = await apiPost('/api/redeem', {
      username: user.username,
      code,
      state: cloneJson(normalize(user)),
    });
    user = normalize(data.user || user);
    persistLocalUser();
    const reward = `${data.coins ? data.coins + '金币 ' : ''}${data.diamonds ? data.diamonds + '钻石' : ''}`.trim();
    status = reward ? `兑换成功：${reward}` : '兑换成功';
    playSfx('reward');
    reportEconomyChange({
      action: 'redeem',
      currency: 'mixed',
      amount: analyticsNumber(data.coins),
      diamond_amount: analyticsNumber(data.diamonds),
    });
  } catch (error) {
    status = error.message || '兑换失败';
    playSfx('error');
  }
}

function sceneTop() {
  return 0;
}
function bottomDockPad() {
  return MINI_SAFE_BOTTOM;
}
function gamebarHeight() {
  return H - gamebarTop();
}
function gamebarTop() {
  return uy(1742);
}
function sceneHeight() {
  return Math.max(260, uy(1742));
}
function drawRect(x, y, w, h, color, stroke) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }
}
function drawText(text, x, y, size, color, align = 'left') {
  const px = Math.round(x);
  const py = Math.round(y);
  const fontSize = Math.max(10, Math.round(size));
  ctx.font = `600 ${fontSize}px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'miter';
  if (fontSize >= 14) {
    ctx.lineWidth = Math.max(1, Math.round(fontSize * .07));
    ctx.strokeStyle = 'rgba(18, 13, 18, .68)';
    ctx.strokeText(String(text), px, py);
  }
  ctx.fillStyle = color;
  ctx.fillText(String(text), px, py);
}
function drawOutlinedText(text, x, y, size, color, align = 'left', stroke = '#2a1b19') {
  const px = Math.round(x);
  const py = Math.round(y);
  const fontSize = Math.max(10, Math.round(size));
  ctx.font = `600 ${fontSize}px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, Math.round(fontSize * .14));
  ctx.strokeStyle = stroke;
  ctx.strokeText(String(text), px, py);
  ctx.fillStyle = color;
  ctx.fillText(String(text), px, py);
}
function fitText(text, maxWidth, size) {
  const raw = String(text);
  const fontSize = Math.max(10, Math.round(size));
  ctx.font = `600 ${fontSize}px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
  if (!maxWidth || ctx.measureText(raw).width <= maxWidth) return raw;
  let value = raw;
  while (value.length > 1 && ctx.measureText(value + '…').width > maxWidth) value = value.slice(0, -1);
  return value + '…';
}
function drawFittedText(text, x, y, size, color, align, maxWidth) {
  drawText(fitText(text, maxWidth, size), x, y, size, color, align);
}
function buttonFrame(id, y, h) {
  if (id === 'modal:close') return { y, h };
  const compact = /tab$/.test(id) || id === 'shoptab' || id === 'fishdextab' || id === 'ranktab';
  const targetH = compact ? 32 : 36;
  return { y: y + (h - targetH) / 2, h: targetH };
}
function compactNumber(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n >= 100000000) return `${(n / 100000000).toFixed(n >= 1000000000 ? 1 : 2).replace(/\.0+$/, '')}亿`;
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 1 : 2).replace(/\.0+$/, '')}万`;
  return String(n);
}
function shortPlayerId(value) {
  const raw = String(value || '').replace(/^fc_/, '');
  if (raw.length <= 14) return raw || 'local';
  return `${raw.slice(0, 6)}-${raw.slice(-6)}`;
}
function ux(value) {
  return value / DESIGN_W * W;
}
function uy(value) {
  return value / DESIGN_H * H;
}
function us(value) {
  return value * Math.min(W / DESIGN_W, H / DESIGN_H);
}
function drawLayoutAsset(name, x, y, w, h) {
  return drawAsset('ui_layout_' + name, ux(x), uy(y), ux(w), uy(h));
}
function addLayoutTarget(id, x, y, w, h, data) {
  addTarget(id, ux(x), uy(y), ux(w), uy(h), data);
}
function drawPixelPanel(x, y, w, h, fill, stroke, hi) {
  drawRect(x, y, w, h, stroke || '#201614');
  drawRect(x + 3, y + 3, w - 6, h - 6, fill || '#6b3f2a');
  if (hi) drawRect(x + 6, y + 6, w - 12, 4, hi);
}
function registerAsset(key, path) {
  ASSET_PATHS[key] = path;
}
function registerAssets() {
  Object.values(BAITS).flatMap((b) => b.fishes).concat(TRASH, TREASURE).forEach((item) => {
    registerAsset('fish_' + item.id, `assets/icons/fish_${item.id}.png`);
  });
  BAIT_IDS.forEach((id) => registerAsset('bait_' + id, `assets/icons/bait_${id}.png`));
  RODS.concat(GACHA_RODS).forEach((rod) => registerAsset('rod_' + rod.id, `assets/icons/rod_${rod.id}.png`));
  PETS.forEach((pet) => registerAsset('pet_' + pet.id, `assets/icons/pet_${pet.id}.png`));
  ACCESSORIES.forEach((acc) => registerAsset('accessory_' + acc.id, `assets/icons/accessory_${acc.id}.png`));
  ['shop', 'gacha', 'dex', 'rank', 'redeem', 'share'].forEach((name) => registerAsset('ui_' + name, `assets/icons/ui_${name}.png`));
  UI_LAYOUT_ASSETS.forEach((name) => registerAsset('ui_layout_' + name, `assets/ui_layout/${name}.png`));
  registerAsset('character_fishing_master', 'assets/icons/character_fishing_master.png');
  registerAsset('character_phoebe_cupid', 'assets/characters/phoebe-cupid-sprite.png');
  registerAsset('character_raiden_shogun', 'assets/characters/raiden-shogun-sprite.png');
  registerAsset('character_justin_bieber', 'assets/characters/justin-bieber-sprite.png');
  registerAsset('character_teemo', 'assets/characters/teemo-sprite.png');
}
function preloadAssets() {
  Object.keys(ASSET_PATHS).forEach((key) => {
    const img = wx.createImage();
    img.onload = () => { img.ready = true; };
    img.onerror = () => { img.failed = true; };
    img.src = ASSET_PATHS[key];
    IMAGES[key] = img;
  });
}
function drawAsset(key, x, y, w, h) {
  const img = IMAGES[key];
  if (!img || !img.ready) return false;
  try {
    ctx.drawImage(img, x, y, w, h);
    return true;
  } catch (_) {
    return false;
  }
}
function drawCharacterSprite(id, x, y, w, h) {
  const key = 'character_' + id;
  const img = IMAGES[key];
  const frame = Math.floor(Date.now() / 300) % 3;
  if (img && img.ready && id !== 'fishing_master') {
    const sw = Math.floor((img.width || 384) / 3);
    const sh = img.height || 192;
    try {
      ctx.drawImage(img, frame * sw, 0, sw, sh, x, y, w, h);
      return true;
    } catch (_) {}
  }
  const bob = frame === 1 ? -3 : frame === 2 ? 1 : 0;
  if (drawAsset(key, x, y + bob, w, h)) return true;
  drawRect(x + w * .28, y + h * .18 + bob, w * .44, h * .34, '#fdbcb4', '#7c2d12');
  drawRect(x + w * .20, y + h * .47 + bob, w * .60, h * .35, '#2563eb', '#facc15');
  drawText('钓', x + w / 2, y + h * .64 + bob, 16, '#facc15', 'center');
  return false;
}
function fishAssetKey(item) {
  return 'fish_' + item.id;
}
function drawButton(id, label, x, y, w, h, active, data, asset) {
  const frame = buttonFrame(id, y, h);
  y = frame.y;
  h = frame.h;
  drawRect(x, y, w, h, active ? '#ffd700' : '#2c3e50', '#ffd700');
  const font = W <= 380 ? 11 : 12;
  if (asset && w >= 58 && drawAsset(asset, x + 5, y + Math.max(4, (h - 18) / 2), 18, 18)) {
    drawFittedText(label, x + w / 2 + 8, y + h / 2, font, active ? '#1a1a2e' : '#ffd700', 'center', w - 30);
  } else {
    drawFittedText(label, x + w / 2, y + h / 2, font, active ? '#1a1a2e' : '#ffd700', 'center', w - 8);
  }
  addTarget(id, x, y, w, h, data);
}
function drawOriginalButton(id, icon, label, x, y, w, h, active, data, variant) {
  const bg = active ? '#ffd700' : (variant === 'vip' ? '#203647' : '#2c3e50');
  const stroke = variant === 'vip' ? '#66e6ff' : '#ffd700';
  const fg = active ? '#1a1a2e' : (variant === 'vip' ? '#66e6ff' : '#ffd700');
  drawRect(x, y, w, h, bg, stroke);
  const full = icon ? `${icon} ${label}` : label;
  drawFittedText(full, x + w / 2, y + h / 2, W <= 380 ? 11 : 12, fg, 'center', w - 14);
  addTarget(id, x, y, w, h, data);
}
function drawTopbar() {
  drawMainHud();
}
function drawResourcePill(x, y, value, iconColor) {
  const px = ux(x);
  const py = uy(y);
  const pw = ux(282);
  const ph = uy(64);
  const isCoin = iconColor === '#f8c247';
  drawRect(px + ux(22), py + uy(8), pw - ux(42), ph - uy(6), 'rgba(35,20,13,.55)');
  drawPixelPanel(px + ux(18), py + uy(2), pw - ux(40), ph - uy(2), '#704327', '#201311', '#e2aa5d');
  drawRect(px + ux(72), py + uy(14), ux(142), uy(40), '#704327');
  drawRect(px + ux(14), py + uy(10), ux(48), uy(48), iconColor, '#4b2a18');
  drawRect(px + ux(19), py + uy(15), ux(38), uy(8), 'rgba(255,255,255,.35)');
  drawText(isCoin ? '金' : '钻', px + ux(38), py + uy(34), us(20), isCoin ? '#6a390f' : '#425066', 'center');
  drawFittedText(isCoin ? '金币' : '钻石', px + ux(78), py + uy(22), us(14), '#d8c491', 'left', ux(126));
  drawFittedText(compactNumber(value), px + ux(78), py + uy(44), us(27), '#fff1a8', 'left', ux(138));
  drawRect(px + ux(220), py, ux(64), uy(64), '#4fbf5a', '#174f27');
  drawRect(px + ux(226), py + uy(6), ux(52), uy(10), 'rgba(255,255,255,.28)');
  drawOutlinedText('+', px + ux(252), py + uy(32), us(33), '#f6ffd5', 'center', '#174f27');
  addLayoutTarget('top:shop', x + 220, y, 64, 64);
}
function drawProfilePanel() {
  const x = ux(40);
  const y = uy(40);
  drawRect(x + ux(8), y + uy(8), ux(374), uy(172), 'rgba(35,20,13,.50)');
  drawPixelPanel(x, y, ux(374), uy(172), '#6a412a', '#1f1412', '#e0a65b');
  drawRect(x + ux(12), y + uy(12), ux(128), uy(128), '#214d6d', '#1a1210');
  drawRect(x + ux(18), y + uy(18), ux(116), uy(20), 'rgba(255,255,255,.16)');
  drawCharacterSprite(user.activeCharacter || 'fishing_master', x + ux(23), y + uy(18), ux(106), uy(112));
  drawRect(x + ux(18), y + uy(110), ux(116), uy(24), 'rgba(0,0,0,.36)');
  drawText(user.province, x + ux(76), y + uy(122), us(17), '#f6ffd5', 'center');
  drawPixelPanel(x + ux(150), y + uy(16), ux(250), uy(56), '#3c2824', '#201311', '#c58b49');
  drawRect(x + ux(158), y + uy(26), ux(232), uy(36), '#3c2824');
  drawFittedText(user.username, x + ux(168), y + uy(44), us(23), '#fff1a8', 'left', ux(210));
  drawPixelPanel(x + ux(150), y + uy(80), ux(250), uy(52), '#253b4d', '#18242d', '#7fb6d9');
  drawRect(x + ux(210), y + uy(89), ux(180), uy(34), '#253b4d');
  drawRect(x + ux(164), y + uy(93), ux(42), uy(26), '#d9a64f', '#5a341d');
  drawText('ID', x + ux(185), y + uy(106), us(18), '#3d2818', 'center');
  drawFittedText(shortPlayerId(user.username), x + ux(216), y + uy(106), us(18), '#ffffff', 'left', ux(166));
  const level = Math.max(1, Math.floor((user.stats.totalCatches || 0) / 5) + 1);
  const exp = ((user.stats.totalCatches || 0) % 5) / 5;
  drawPixelPanel(x + ux(10), y + uy(136), ux(350), uy(38), '#263f5b', '#162230', '#7fb6d9');
  drawText(`LV.${level}`, x + ux(72), y + uy(155), us(21), '#ffffff', 'center');
  drawRect(x + ux(142), y + uy(147), ux(210), uy(14), '#111827', '#0e1725');
  drawRect(x + ux(142), y + uy(147), ux(210 * exp), uy(14), '#f08c35');
  drawRect(x + ux(142), y + uy(147), ux(210 * exp), uy(4), 'rgba(255,255,255,.35)');
}
function drawMenuAsset(key, id, x, y, w, h, data) {
  if (!drawLayoutAsset(key, x, y, w, h)) {
    drawPixelPanel(ux(x), uy(y), ux(w), uy(h), '#7b4a33', '#2a1b19', '#d29a5a');
  }
  addLayoutTarget(id, x, y, w, h, data);
}
function drawMainHud() {
  drawProfilePanel();
  drawResourcePill(758, 62, user.money, '#f8c247');
  drawResourcePill(758, 149, user.diamonds, '#f4f2e9');
  drawMenuAsset('menu_bag', 'top:shop', 43, 311, 114, 130, { tab: 'bait' });
  drawMenuAsset('menu_shop', 'top:shop', 40, 470, 124, 128, { tab: 'bait' });
  drawMenuAsset('menu_rank', 'top:rank', 41, 629, 117, 129);
  drawMenuAsset('menu_task', 'top:task', 42, 790, 113, 123);
  drawMenuAsset('menu_dex', 'top:dex', 45, 949, 107, 126);
  drawMenuAsset('menu_more', 'top:weather', 48, 1112, 103, 79);
  drawMenuAsset('menu_collection', 'top:dex', 846, 309, 186, 153);
  drawMenuAsset('menu_idle', 'toggleauto', 864, 499, 151, 143);
  const counts = dailyGoalCounts();
  if (counts.claimable) {
    drawRect(ux(132), uy(782), ux(38), uy(38), '#d82f2f', '#fff1a8');
    drawText(String(counts.claimable), ux(151), uy(801), us(22), '#ffffff', 'center');
  }
  if (user.vipAuto) {
    drawRect(ux(850), uy(482), ux(184), uy(32), '#1f8f53', '#fff1a8');
    drawText('挂机中', ux(942), uy(498), us(19), '#ffffff', 'center');
  }
}
function firstPersonPoints() {
  const sway = Math.sin(Date.now() / 520);
  return {
    baseX: ux(742),
    baseY: Math.min(gamebarTop() - uy(10), uy(1742)),
    tipX: ux(570) + sway * ux(10),
    tipY: uy(1002) + Math.sin(Date.now() / 680) * uy(8),
    hookX: state.phase === 'idle' ? ux(612) + sway * ux(8) : state.hookX,
    hookY: state.phase === 'idle' ? uy(1284) + Math.sin(Date.now() / 180) * uy(4) : state.hookY,
  };
}
function drawFirstPersonScenePatch() {
  const scene = IMAGES.ui_layout_scene;
  if (scene && scene.ready) {
    try {
      ctx.drawImage(scene, 190, 1076, 360, 340, ux(680), uy(1058), ux(332), uy(312));
    } catch (_) {}
  } else {
    ctx.fillStyle = '#35aee1';
    ctx.beginPath();
    ctx.moveTo(ux(690), uy(1088));
    ctx.lineTo(ux(906), uy(1068));
    ctx.lineTo(ux(944), uy(1286));
    ctx.lineTo(ux(694), uy(1316));
    ctx.closePath();
    ctx.fill();
    drawRect(ux(706), uy(1284), ux(276), uy(54), '#2b8fca');
  }
  for (let i = 0; i < 8; i += 1) {
    const x = ux(724 + i * 31);
    const y = uy(1116 + (i % 3) * 48);
    drawRect(x, y, ux(46 + (i % 2) * 28), uy(7), 'rgba(179,229,255,.42)');
  }
  drawRect(ux(798), uy(1224), ux(282), uy(52), '#9b6a43', '#54351f');
  drawRect(ux(798), uy(1248), ux(282), uy(6), '#6b442b');
  [826, 888, 950, 1012].forEach((x) => drawRect(ux(x), uy(1217), ux(13), uy(68), '#6f452d', '#4a2b1c'));
  [836, 898, 960, 1022].forEach((x) => drawRect(ux(x), uy(1234), ux(52), uy(4), 'rgba(255,214,142,.32)'));
}
function drawFirstPersonFishingRig(points) {
  const rod = activeRod();
  const dx = points.tipX - points.baseX;
  const dy = points.tipY - points.baseY;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const nx = -dy / len;
  const ny = dx / len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#dff6ff';
  ctx.lineWidth = Math.max(1, us(2));
  ctx.beginPath();
  ctx.moveTo(points.tipX, points.tipY);
  ctx.lineTo(points.hookX, points.hookY);
  ctx.stroke();
  ctx.strokeStyle = '#261817';
  ctx.lineWidth = Math.max(5, us(11));
  ctx.beginPath();
  ctx.moveTo(points.baseX, points.baseY);
  ctx.lineTo(points.tipX, points.tipY);
  ctx.stroke();
  ctx.strokeStyle = rod.color;
  ctx.lineWidth = Math.max(3, us(7));
  ctx.beginPath();
  ctx.moveTo(points.baseX, points.baseY);
  ctx.lineTo(points.tipX, points.tipY);
  ctx.stroke();
  ctx.strokeStyle = rod.hi;
  ctx.lineWidth = Math.max(1, us(3));
  ctx.beginPath();
  ctx.moveTo(points.baseX + nx * ux(5), points.baseY + ny * uy(5));
  ctx.lineTo(points.tipX + nx * ux(4), points.tipY + ny * uy(4));
  ctx.stroke();
  ctx.restore();
  drawRect(points.hookX - ux(7), points.hookY - uy(11), ux(14), uy(20), '#ff5722', '#5b2a15');
  drawRect(points.hookX - ux(4), points.hookY - uy(7), ux(8), uy(6), '#fff1a8');
  const gripX = points.baseX - ux(18);
  const gripY = points.baseY - uy(12);
  drawRect(gripX - ux(92), gripY + uy(12), ux(76), uy(44), '#244f73', '#162e44');
  drawRect(gripX + ux(38), gripY + uy(8), ux(86), uy(44), '#244f73', '#162e44');
  drawRect(gripX - ux(58), gripY - uy(2), ux(50), uy(42), '#f0b37e', '#5c2d16');
  drawRect(gripX + ux(16), gripY - uy(10), ux(54), uy(44), '#f0b37e', '#5c2d16');
  drawRect(gripX - ux(2), gripY - uy(18), ux(36), uy(82), '#4a2d29', '#201311');
  drawRect(gripX + ux(6), gripY - uy(10), ux(20), uy(64), '#7b4a33', '#d29a5a');
}
function drawPsdSceneOverlays() {
  const env = environmentEffects();
  const overlayBottom = uy(1994);
  if (env.weather.id === 'rain' || env.weather.id === 'storm') {
    ctx.strokeStyle = env.weather.id === 'storm' ? 'rgba(210,235,255,.72)' : 'rgba(225,245,255,.50)';
    ctx.lineWidth = Math.max(1, us(2));
    for (let i = 0; i < 42; i += 1) {
      const rx = (i * 43 + Date.now() / 18) % W;
      const ry = (uy(230) + i * 67 + Date.now() / 12) % overlayBottom;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - ux(16), ry + uy(34));
      ctx.stroke();
    }
  } else if (env.weather.id === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    for (let i = 0; i < 30; i += 1) {
      const sx = (i * 59 + Date.now() / 45) % W;
      const sy = (uy(240) + i * 47 + Date.now() / 32) % overlayBottom;
      ctx.fillRect(sx, sy, Math.max(2, ux(5)), Math.max(2, uy(5)));
    }
  } else if (env.weather.id === 'fog') {
    drawRect(ux(32), uy(760), ux(1016), uy(72), 'rgba(230,236,238,.22)');
    drawRect(ux(80), uy(1160), ux(900), uy(58), 'rgba(230,236,238,.18)');
  }
  drawFirstPersonScenePatch();
  const points = firstPersonPoints();
  drawFirstPersonFishingRig(points);
  if (state.phase === 'hooked') drawLayoutAsset('event_alert', 862, 902, 156, 168);
}
function drawScene() {
  if (drawAsset('ui_layout_scene', 0, 0, W, H)) {
    drawPsdSceneOverlays();
    return;
  }
  const top = sceneTop();
  const h = sceneHeight();
  const env = environmentEffects();
  const skyColor = env.weather.id === 'storm' ? '#52616f'
    : env.weather.id === 'rain' ? '#6f91a8'
      : env.weather.id === 'fog' ? '#aab7bf'
        : env.weather.id === 'snow' ? '#cfe7f5'
          : env.season.id === 'autumn' ? '#9fd1d9'
            : '#87ceeb';
  const waterColor = env.weather.id === 'storm' ? '#123a55'
    : env.weather.id === 'snow' ? '#2b7c9f'
      : env.season.id === 'winter' ? '#237da2'
        : '#1e6091';
  drawRect(CONTENT_X, top, CONTENT_W, h, skyColor, '#ffd700');
  const waterY = top + h * .40;
  drawRect(CONTENT_X, waterY, CONTENT_W, h - (waterY - top), waterColor);
  ctx.fillStyle = '#26384c';
  ctx.beginPath();
  ctx.moveTo(CONTENT_X, waterY);
  for (let x = CONTENT_X; x <= CONTENT_X + CONTENT_W; x += 20) {
    const ridge = Math.sin(x * .045) * 16 + Math.sin(x * .017) * 9;
    ctx.lineTo(x, waterY - 22 - ridge);
  }
  ctx.lineTo(CONTENT_X + CONTENT_W, waterY);
  ctx.fill();
  for (let y = waterY + 4; y < top + h; y += 7) {
    ctx.fillStyle = 'rgba(185,225,255,.18)';
    ctx.fillRect(CONTENT_X + 10, y + Math.sin(Date.now() / 500 + y) * 1.5, CONTENT_W - 20, 1);
  }
  for (let i = 0; i < 24; i += 1) {
    const sx = CONTENT_X + ((i * 57 + Date.now() / 35) % (CONTENT_W - 18)) + 9;
    const sy = waterY + 20 + ((i * 41) % Math.max(40, h - (waterY - top) - 40));
    ctx.fillStyle = 'rgba(230,250,255,.65)';
    ctx.fillRect(sx, sy, i % 3 === 0 ? 4 : 2, 1);
  }
  if (env.weather.id === 'rain' || env.weather.id === 'storm') {
    ctx.strokeStyle = env.weather.id === 'storm' ? 'rgba(210,235,255,.75)' : 'rgba(225,245,255,.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 34; i += 1) {
      const rx = CONTENT_X + ((i * 43 + Date.now() / 18) % CONTENT_W);
      const ry = top + 8 + ((i * 67 + Date.now() / 12) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 18);
      ctx.stroke();
    }
    if (env.weather.id === 'storm' && Math.floor(Date.now() / 700) % 5 === 0) drawRect(CONTENT_X + CONTENT_W * .64, top + 22, 4, 70, 'rgba(255,255,210,.88)');
  } else if (env.weather.id === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 26; i += 1) {
      const sx = CONTENT_X + ((i * 59 + Date.now() / 45) % CONTENT_W);
      const sy = top + 10 + ((i * 47 + Date.now() / 32) % h);
      ctx.fillRect(sx, sy, 3, 3);
    }
  } else if (env.weather.id === 'fog') {
    ctx.fillStyle = 'rgba(230,236,238,.28)';
    drawRect(CONTENT_X + 8, top + h * .28, CONTENT_W - 16, 22, 'rgba(230,236,238,.28)');
    drawRect(CONTENT_X + 20, top + h * .58, CONTENT_W - 40, 18, 'rgba(230,236,238,.22)');
  }
  drawRect(CONTENT_X + CONTENT_W - 62, top + 28, 26, 26, '#ffeb3b');
  drawFirstPersonFishingRig(firstPersonPoints());
}
function drawGamebar() {
  const bait = BAITS[user.currentBait];
  const rod = activeRod();
  const env = environmentEffects();
  const castW = 380;
  const castH = 165;
  const castX = (DESIGN_W - castW) / 2;
  const castY = 1786;
  drawLayoutAsset('control_meter', 312, 1742, 244, 220);
  drawLayoutAsset('base', -1, 1994, 1082, 341);
  if (!drawLayoutAsset('button_cast', castX, castY, castW, castH)) {
    drawPixelPanel(ux(castX), uy(castY), ux(castW), uy(castH), '#ffd64d', '#4c2a1d', '#fff0a8');
    drawText(mobileActionLabel(), ux(castX + castW / 2), uy(castY + castH / 2), us(64), '#332523', 'center');
  }
  if (state.phase !== 'idle') {
    drawRect(ux(castX + 60), uy(castY + 26), ux(castW - 120), uy(112), 'rgba(255,214,77,.72)');
    drawText(mobileActionLabel(), ux(castX + castW / 2), uy(castY + castH / 2), us(46), '#332523', 'center');
  }
  addLayoutTarget('mobile-action', castX, castY, castW, castH);
  if (!drawLayoutAsset('button_bait', 114, 1945, 150, 167)) {
    drawPixelPanel(ux(114), uy(1945), ux(150), uy(167), '#7b4a33', '#2a1b19', '#d29a5a');
  }
  addLayoutTarget('baitnext', 88, 1918, 210, 220);
  if (!drawLayoutAsset('button_tackle', 895, 1773, 150, 174)) {
    drawPixelPanel(ux(895), uy(1773), ux(150), uy(174), '#7b4a33', '#2a1b19', '#d29a5a');
  }
  addLayoutTarget('rodnext', 850, 1746, 215, 230);
  drawLayoutAsset('rod_current', 345, 2016, 623, 89);
  drawAsset('bait_' + user.currentBait, ux(136), uy(1962), ux(76), uy(76));
  drawFittedText(`${bait.name} x${user.baits[user.currentBait] || 0}`, ux(189), uy(1926), us(24), '#fff1a8', 'center', ux(184));
  drawAsset('rod_' + rod.id, ux(802), uy(1998), ux(72), uy(72));
  drawFittedText(rod.name, ux(834), uy(1980), us(24), '#fff1a8', 'center', ux(206));
  drawRect(ux(210), uy(1618), ux(660), uy(78), 'rgba(22,18,14,.40)');
  drawPixelPanel(ux(224), uy(1626), ux(632), uy(64), '#23384d', '#172536', '#87c7e8');
  drawRect(ux(242), uy(1643), ux(94), uy(30), '#c58b49', '#5a341d');
  drawRect(ux(346), uy(1640), ux(492), uy(36), '#23384d');
  drawText('鱼讯', ux(289), uy(1658), us(19), '#3d2818', 'center');
  drawFittedText(`${env.season.name}${env.weather.name} · ${status}`, ux(604), uy(1658), us(23), '#e9ffd5', 'center', ux(486));
  const rankBrief = rankScope === 'provinceWar'
    ? `${user.province}队 ${user.ranking.todayScore || 0}分`
    : `${rankLabel(rankScope)} ${user.ranking.bestScore || 0}`;
  drawPixelPanel(ux(278), uy(2122), ux(524), uy(52), '#263f5b', '#172536', '#87c7e8');
  drawFittedText(`次数 ${user.chances.left}/${user.chances.max} · ${rankBrief}`, ux(540), uy(2148), us(22), '#eaf7ff', 'center', ux(486));
}
function drawHitbar() {
  if (!hb.active) return;
  const top = Math.max(MINI_SAFE_TOP + 96, Math.min(H * .38, H - 310));
  drawRect(18, top, W - 36, 146, 'rgba(0,0,0,.72)', '#ffd700');
  drawText(`${RARITY_NAME[hb.catch.rarity]}级鱼上钩了！点击下方按钮命中红区 ${hb.need} 次`, W / 2, top + 28, 16, '#ffffff', 'center');
  drawText(`${hb.hits} / ${hb.need} 命中    ${hb.time.toFixed(1)}s`, W / 2, top + 55, 14, '#6be7ff', 'center');
  const bx = 40;
  const by = top + 84;
  const bw = W - 80;
  drawRect(bx, by, bw, 28, '#26384c', '#ffd700');
  drawRect(bx + bw * hb.zone, by, bw * hb.width, 28, '#d35400');
  drawRect(bx + bw * hb.cursor - 2, by - 4, 4, 36, '#ffffff');
}
function mobileActionLabel() {
  if (state.phase === 'idle') return '抛竿';
  if (state.phase === 'waiting') return '等待...';
  if (state.phase === 'hooked') return '拉!';
  return '击中!';
}
function drawMobileAction() {
  return;
}
function drawModal() {
  if (!modal) return;
  if (modal.type === 'result') {
    drawResultModal();
    return;
  }
  if (modal.type === 'failure') {
    drawFailureModal();
    return;
  }
  const modalTop = Math.max(76, MINI_SAFE_TOP + 24);
  drawRect(18, modalTop, W - 36, H - modalTop - 36, '#191a2f', '#ffd700');
  drawButton('modal:close', '×', W - 58, modalTop + 12, 30, 30, false);
  const titleMap = {
    shop: '商店',
    dex: '图鉴',
    rod: '鱼竿收藏',
    character: '角色',
    accessory: '首饰',
    pet: '宠物',
    rank: '排行榜',
    task: '今日任务',
    gacha: '幸运抽奖',
    redeem: '兑换码',
    share: '分享',
    weather: '今日天气',
    result: '钓获结果',
  };
  drawText(titleMap[modal.type] || '', W / 2, modalTop + 29, 20, '#ffd700', 'center');
  if (modal.type === 'shop') drawShopModal();
  else if (modal.type === 'dex') drawDexModal();
  else if (modal.type === 'rod') drawRodModal();
  else if (modal.type === 'character') drawCharacterModal();
  else if (modal.type === 'pet') drawPetModal();
  else if (modal.type === 'accessory') drawAccessoryModal();
  else if (modal.type === 'rank') drawRankModal();
  else if (modal.type === 'task') drawTaskModal();
  else if (modal.type === 'weather') drawWeatherModal();
  else if (modal.type === 'gacha') drawGachaModal();
  else if (modal.type === 'redeem') drawRedeemModal();
  else if (modal.type === 'share') drawShareModal();
  else if (modal.type === 'result') drawResultModal();
}
function drawListItem(x, y, w, h, icon, name, desc, color, asset, reserveRight = 0) {
  drawRect(x, y, w, h, '#10121f', '#33344f');
  const iconSize = Math.min(34, h - 10);
  const hasAsset = asset && drawAsset(asset, x + 8, y + (h - iconSize) / 2, iconSize, iconSize);
  if (!hasAsset) drawText(icon, x + 23, y + h / 2, 18, color || '#ffd700', 'center');
  const textX = x + 50;
  const textW = Math.max(60, w - 58 - reserveRight);
  drawFittedText(name, textX, y + Math.min(20, h * .42), 14, color || '#ffffff', 'left', textW);
  drawFittedText(desc, textX, y + Math.min(43, h * .74), 12, '#9aa6b2', 'left', textW);
}
function drawFishPixelIcon(x, y, item, unlocked) {
  if (!unlocked) {
    drawRect(x - 22, y - 18, 44, 36, '#0d1421', '#555555');
    ctx.globalAlpha = .35;
    const hasLockedAsset = drawAsset(fishAssetKey(item), x - 28, y - 28, 56, 56);
    ctx.globalAlpha = 1;
    if (!hasLockedAsset) drawRect(x - 14, y - 10, 28, 20, '#26384c');
    drawText('?', x, y, 20, '#777777', 'center');
    return;
  }
  if (drawAsset(fishAssetKey(item), x - 28, y - 28, 56, 56)) return;
  const color = RARITY_COLOR[item.rarity] || '#58b8ff';
  const dark = item.rarity === 'hidden' ? '#7c5a00' : item.rarity === 'legendary' ? '#5b2c74' : item.rarity === 'rare' ? '#0f766e' : '#1f4e80';
  if (item.rarity === 'trash') {
    drawRect(x - 12, y - 10, 24, 20, '#334155', '#94a3b8');
    drawText(item.icon || '物', x, y, 13, '#cbd5e1', 'center');
    return;
  }
  if (item.rarity === 'treasure') {
    drawRect(x - 14, y - 11, 28, 22, '#8a5a12', '#ffd700');
    drawRect(x - 8, y - 5, 16, 10, '#facc15');
    return;
  }
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x - 22, y);
  ctx.lineTo(x - 36, y - 11);
  ctx.lineTo(x - 36, y + 11);
  ctx.closePath();
  ctx.fill();
  drawRect(x - 22, y - 13, 40, 26, color, dark);
  drawRect(x - 5, y + 4, 16, 6, 'rgba(255,255,255,.55)');
  drawRect(x + 11, y - 5, 4, 4, '#101010');
  drawRect(x - 8, y - 20, 14, 7, dark);
  drawRect(x - 8, y + 13, 14, 7, dark);
}
function drawMerchantPixel(x, y) {
  drawRect(x + 12, y + 4, 46, 10, '#7c3f18', '#3d1f0f');
  drawRect(x + 18, y + 14, 34, 26, '#f0b37e', '#5c2d16');
  drawRect(x + 10, y + 20, 50, 10, '#8b4513');
  drawRect(x + 22, y + 23, 6, 5, '#101010');
  drawRect(x + 42, y + 23, 6, 5, '#101010');
  drawRect(x + 30, y + 31, 10, 4, '#7c2d12');
  drawRect(x + 16, y + 40, 38, 32, '#2563eb', '#facc15');
  drawRect(x + 8, y + 44, 10, 24, '#f0b37e', '#5c2d16');
  drawRect(x + 52, y + 44, 10, 24, '#f0b37e', '#5c2d16');
  drawRect(x + 24, y + 48, 22, 12, '#facc15', '#7c2d12');
  drawText('商', x + 35, y + 55, 13, '#7c2d12', 'center');
}
function drawShopModal() {
  drawRect(34, 126, W - 68, 78, '#0d1421', '#33344f');
  drawMerchantPixel(48, 132);
  drawText('码头商店', 126, 148, 17, '#ffd700');
  drawFittedText('商人出售鱼饵和基础鱼竿，图鉴收集仍在“图鉴”入口查看。', 126, 174, 11, '#9aa6b2', 'left', W - 172);
  drawButton('shoptab', '鱼饵', 40, 214, 82, 30, shopTab === 'bait', { tab: 'bait' });
  drawButton('shoptab', '鱼竿', 130, 214, 82, 30, shopTab === 'rod', { tab: 'rod' });
  let y = 256;
  if (shopTab === 'bait') {
    Object.entries(BAITS).forEach(([id, bait]) => {
      const current = user.currentBait === id;
      const currency = bait.currency === 'diamonds' ? '钻石' : '金币';
      const label = `${bait.name} x${user.baits[id] || 0}${current ? ' · 使用中' : ''}`;
      const desc = `${bait.desc} · ${currency} ${bait.price}/个 · ${baitRaritySummary(bait)}`;
      drawListItem(34, y, W - 68, 58, '饵', label, desc, bait.color, 'bait_' + id, 104);
      drawButton('buybait', '买1', W - 132, y + 13, 42, 32, false, { id, count: 1 });
      drawButton('buybaitn', '买N', W - 84, y + 13, 42, 32, false, { id });
      y += 64;
    });
  } else {
    const dexCount = Object.keys(user.dex).length;
    RODS.forEach((rod) => {
      const owned = user.ownedRods.includes(rod.id);
      const unlocked = dexCount >= rod.threshold;
      const equipped = activeRod().id === rod.id;
      const priceText = rod.price ? `${rod.price}金币` : '免费';
      const desc = owned
        ? (equipped ? '已装备' : '已拥有，点击装备')
        : (unlocked ? `${rod.desc} · ${priceText}` : `图鉴 ${dexCount}/${rod.threshold} 解锁购买`);
      drawListItem(34, y, W - 68, 50, rod.icon || '竿', rod.name, desc, rod.hi, 'rod_' + rod.id, unlocked ? 72 : 0);
      if (unlocked) drawButton('buyrod', owned ? (equipped ? '已装备' : '装备') : '购买', W - 106, y + 10, 62, 30, !owned || !equipped, { id: rod.id });
      y += 58;
    });
  }
}
function drawDexModal() {
  if (!FISH_DEX_FILTERS.some(([id]) => id === activeFishDexFilter)) activeFishDexFilter = 'all';
  const tabCols = FISH_DEX_FILTERS.length;
  const tabGap = 4;
  const tabX = 34;
  const tabY = 126;
  const tabW = Math.floor((W - 68 - tabGap * (tabCols - 1)) / tabCols);
  const tabH = 30;
  FISH_DEX_FILTERS.forEach(([id, label], i) => {
    const x = tabX + (i % tabCols) * (tabW + tabGap);
    drawButton('fishdextab', label, x, tabY, tabW, tabH, activeFishDexFilter === id, { id });
  });
  const allItems = allFishDexItems();
  const filteredItems = activeFishDexFilter === 'all'
    ? allItems
    : allItems.filter((item) => item.rarity === activeFishDexFilter);
  const cols = 3;
  const gridTop = tabY + tabH + 14;
  const rows = Math.max(2, Math.floor((H - gridTop - 116) / 76));
  const pageSize = Math.max(cols * rows, cols * 2);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  fishDexPage = Math.max(0, Math.min(fishDexPage, pageCount - 1));
  const items = filteredItems.slice(fishDexPage * pageSize, fishDexPage * pageSize + pageSize);
  const unlockedTotal = allItems.filter((item) => user.dex[item.id]).length;
  const unlockedFiltered = filteredItems.filter((item) => user.dex[item.id]).length;
  const colW = (W - 84) / cols;
  items.forEach((item, i) => {
    const x = 34 + (i % cols) * (colW + 8);
    const y = gridTop + Math.floor(i / cols) * 76;
    const found = user.dex[item.id];
    const border = found ? RARITY_COLOR[item.rarity] : '#555555';
    drawRect(x, y, colW, 68, '#0d1421', border);
    drawFishPixelIcon(x + colW / 2, y + 23, item, !!found);
    drawFittedText(found ? item.name : '???', x + colW / 2, y + 49, 11, found ? '#e8e8e8' : '#777777', 'center', colW - 8);
    const foundDesc = `${baitNamesForFish(item)} · x${found && found.count || 0}`;
    drawFittedText(found ? foundDesc : RARITY_NAME[item.rarity], x + colW / 2, y + 61, 9, found ? RARITY_COLOR[item.rarity] : '#777777', 'center', colW - 8);
  });
  const gridRows = Math.max(1, Math.ceil(items.length / cols));
  const statsY = Math.min(H - 92, gridTop + gridRows * 76 + 8);
  drawRect(34, statsY, W - 68, 58, '#0d1421', '#555555');
  const filterName = FISH_DEX_FILTERS.find(([id]) => id === activeFishDexFilter)[1];
  drawText(`鱼类图鉴：${unlockedTotal} / ${allItems.length}`, 46, statsY + 16, 13, '#ffd700');
  drawFittedText(`${filterName} ${unlockedFiltered}/${filteredItems.length} · 累计钓获 ${user.stats.totalCatches || 0} 次 · 收入 ${user.stats.totalEarned || 0} 金币`, 46, statsY + 36, 11, '#9aa6b2', 'left', W - 92);
  if (pageCount > 1) {
    drawButton('fishdexprev', '上一页', 42, statsY + 68, 66, 28, false);
    drawText(`${fishDexPage + 1}/${pageCount}`, W / 2, statsY + 82, 12, '#e8e8e8', 'center');
    drawButton('fishdexnext', '下一页', W - 108, statsY + 68, 66, 28, false);
  }
}
function drawRodModal() {
  const list = RODS.concat(GACHA_RODS.filter((rod) => user.ownedRods.includes(rod.id)));
  const dexCount = Object.keys(user.dex).length;
  list.forEach((rod, i) => {
    const y = 136 + i * 50;
    const gacha = GACHA_RODS.some((r) => r.id === rod.id);
    const unlocked = gacha ? user.ownedRods.includes(rod.id) : dexCount >= rod.threshold;
    drawListItem(34, y, W - 68, 42, rod.icon || '竿', rod.name, unlocked ? (activeRod().id === rod.id ? '装备中' : '点击装备') : `图鉴 ${dexCount}/${rod.threshold}`, rod.hi, 'rod_' + rod.id, unlocked && activeRod().id !== rod.id ? 62 : 0);
    if (unlocked && activeRod().id !== rod.id) drawButton('equiprod', '装备', W - 92, y + 6, 48, 30, false, { id: rod.id });
  });
  drawFittedText('轻度版鱼竿按图鉴自然解锁，抽奖限定竿只保留已拥有外观。', W / 2, H - 64, 12, '#9aa6b2', 'center', W - 86);
}
function drawCharacterModal() {
  CHARACTERS.forEach((ch, i) => {
    const y = 132 + i * 92;
    const cardH = 84;
    const cardX = 34;
    const cardW = W - 68;
    const owned = user.ownedCharacters.includes(ch.id);
    const shards = user.characterFragments[ch.id] || 0;
    drawRect(cardX, y, cardW, cardH, '#10121f', owned ? (user.activeCharacter === ch.id ? '#4ec9b0' : '#33344f') : '#33344f');
    drawRect(cardX + 8, y + 8, 64, 68, '#0d1421', '#334155');
    drawCharacterSprite(ch.id, cardX + 12, y + 6, 56, 70);
    const buttonW = owned && user.activeCharacter !== ch.id ? 52 : 0;
    const textX = cardX + 82;
    const textW = cardW - 96 - buttonW;
    drawFittedText(ch.name, textX, y + 19, 14, owned ? '#ffd700' : '#8b8b8b', 'left', textW);
    drawFittedText(ch.title || ch.desc, textX, y + 39, 12, '#4ec9b0', 'left', textW);
    drawFittedText(owned ? (user.activeCharacter === ch.id ? '已装备' : '点击右侧装备') : `碎片 ${shards}/10 · ${ch.desc}`, textX, y + 61, 12, owned ? '#e8e8e8' : '#9aa6b2', 'left', textW);
    if (owned && user.activeCharacter !== ch.id) drawButton('equipchar', '装备', W - 92, y + 27, 48, 30, false, { id: ch.id });
  });
}
function drawPetModal() {
  PETS.forEach((pet, i) => {
    const y = 136 + i * 46;
    const owned = user.ownedPets.includes(pet.id);
    drawListItem(34, y, W - 68, 38, pet.icon, pet.name, owned ? (user.activePet === pet.id ? `已装备 · ${pet.bonus}` : pet.bonus) : '抽奖获得', '#4ec9b0', 'pet_' + pet.id, owned ? 62 : 0);
    if (owned) drawButton('equippet', user.activePet === pet.id ? '卸下' : '装备', W - 92, y + 4, 48, 30, false, { id: pet.id });
  });
}
function drawAccessoryModal() {
  if (!user.accessories.length) drawText('暂无首饰，可在钻石抽奖第三期获得', W / 2, 155, 14, '#cccccc', 'center');
  user.accessories.forEach((acc, i) => {
    const def = ACCESSORIES.find((a) => a.id === acc.type);
    const y = 136 + i * 54;
    drawListItem(34, y, W - 68, 46, def.icon, `${def.name} ${acc.star}★`, user.equippedAccessory === acc.uid ? '装备中' : def.desc, def.color, 'accessory_' + def.id, 62);
    drawButton('equipacc', user.equippedAccessory === acc.uid ? '卸下' : '装备', W - 92, y + 8, 48, 30, false, { uid: acc.uid });
  });
}
function drawRankModal() {
  const tabY = 126;
  const tabW = Math.floor((W - 68 - 8) / RANK_SCOPES.length);
  RANK_SCOPES.forEach(([scope, label], i) => {
    drawButton('ranktab', label, 34 + i * (tabW + 4), tabY, tabW, 30, rankScope === scope, { scope });
  });
  const summary = rankSummary(rankScope);
  if (rankScope === 'provinceWar') {
    const ownTeam = summary.ownRow || { score: user.ranking.todayScore || 0, members: 1, todayCatches: 0 };
    drawRect(34, 166, W - 68, 108, '#0d1421', '#ffd700');
    drawText(`为 ${user.province}队 出战`, 48, 188, 16, '#ffd700');
    drawFittedText(`省队第 ${summary.selfRank}/${summary.total} 名 · 超过 ${summary.beatPercent}% 省队`, 48, 212, 13, '#66e6ff', 'left', W - 96);
    const gapText = summary.gap > 0
      ? `距离上一省 ${summary.gap} 分，分享给朋友一起补分`
      : '今天领先状态不错，继续拉开差距';
    drawFittedText(`我今日贡献 ${user.ranking.todayScore || 0} 分 · 本省总分 ${ownTeam.score || 0} · ${gapText}`, 48, 236, 11, '#9aa6b2', 'left', W - 96);
    drawButton('rankshare', '召集队友', W - 126, 184, 76, 30, true);
    drawButton('provinceNext', '换省份', W - 126, 224, 76, 30, false);
    const rows = summary.rows.slice(0, Math.max(4, Math.floor((H - 352) / 54)));
    rows.forEach((r, i) => {
      const medal = i === 0 ? '冠' : i === 1 ? '亚' : i === 2 ? '季' : String(i + 1);
      const label = r.self ? `${r.province}队（我）` : `${r.province}队`;
      const desc = `今日 ${r.score || 0} 分 · 队友 ${r.members || 0} 人 · 头名 ${r.bestPlayer || '暂无'} ${r.topScore || 0}分`;
      drawListItem(34, 292 + i * 54, W - 68, 44, medal, label, desc, r.self ? '#ffd700' : '#ffffff', r.self ? 'ui_rank' : '');
    });
  } else {
    if (rankScope === 'province') drawButton('provinceNext', '切换省份', W - 126, 166, 76, 30, false);
    drawRect(34, 166, W - 68, 86, '#0d1421', '#33344f');
    drawText(rankLabel(rankScope), 48, 188, 16, '#ffd700');
    drawFittedText(`第 ${summary.selfRank}/${summary.total} 名 · 超过 ${summary.beatPercent}% 玩家`, 48, 213, 13, '#66e6ff', 'left', W - 96);
    const gapText = summary.gap > 0
      ? `再拿 ${summary.gap} 分可追上 ${summary.nextRow && summary.nextRow.name || '上一名'}`
      : '当前排名表现稳定，继续钓鱼扩大优势';
    drawFittedText(`个人最佳 ${user.ranking.bestScore || 0} 分 · 今日累计 ${user.ranking.todayScore || 0} 分 · ${gapText}`, 48, 236, 11, '#9aa6b2', 'left', W - 96);
    const rows = summary.rows.slice(0, Math.max(4, Math.floor((H - 336) / 54)));
    rows.forEach((r, i) => {
      const label = r.self ? `${r.name}（我）` : r.name;
      const desc = r.self
        ? `最佳鱼 ${user.ranking.bestFish || '暂无'} · 最大 ${user.ranking.bestWeight || 0}kg`
        : `${rankScope === 'national' ? (r.province || '未知') + ' · ' : ''}最佳 ${r.score} 分${r.bestFish ? ' · ' + r.bestFish : ''}`;
      drawListItem(34, 270 + i * 54, W - 68, 44, String(i + 1), label, desc, r.self ? '#ffd700' : '#ffffff', r.self ? 'ui_rank' : '');
    });
  }
  const rankHint = rankLoading
    ? `正在加载云端${rankLabel(rankScope)}...`
    : (backendReady ? `${rankLabel(rankScope)}已同步，结果页和失败页会显示当前排名。` : `${rankLabel(rankScope)}使用本地兜底显示。`);
  drawFittedText(rankHint, W / 2, H - 70, 12, '#4ec9b0', 'center', W - 90);
}
function drawTaskModal() {
  user.daily = ensureDaily(user.daily);
  const counts = dailyGoalCounts();
  drawRect(34, 126, W - 68, 86, '#0d1421', '#33344f');
  drawText('轻量每日目标', 48, 150, 17, '#ffd700');
  drawFittedText('完成钓鱼、天气和图鉴目标，领取金币后去商店补给。', 48, 177, 12, '#9aa6b2', 'left', W - 96);
  drawFittedText(`今日完成 ${counts.completed}/${counts.total} · 已领 ${counts.claimed}/${counts.total} · 可领取 ${counts.claimable}`, 48, 198, 11, '#66e6ff', 'left', W - 96);
  const rowH = H <= 640 ? 48 : 54;
  const gap = 6;
  const startY = 226;
  DAILY_GOALS.forEach((goal, i) => {
    const y = startY + i * (rowH + gap);
    if (y + rowH > H - 82) return;
    const progress = Math.min(goal.target, dailyGoalProgress(goal));
    const ready = progress >= goal.target;
    const claimed = dailyGoalClaimed(goal);
    const color = claimed ? '#4ec9b0' : (ready ? '#ffd700' : '#ffffff');
    const desc = `${goal.desc} · ${progress}/${goal.target} · 奖励 ${dailyGoalRewardText(goal)}`;
    drawListItem(34, y, W - 68, rowH, goal.icon, goal.name, desc, color, '', 78);
    const bx = W - 108;
    const by = y + Math.max(7, (rowH - 30) / 2);
    if (claimed) {
      drawRect(bx, by, 64, 30, '#203647', '#4ec9b0');
      drawText('已领', bx + 32, by + 15, 12, '#4ec9b0', 'center');
    } else if (ready) {
      drawButton('claimgoal', '领取', bx, by, 64, 30, true, { id: goal.id });
    } else {
      drawRect(bx, by, 64, 30, '#1f2937', '#4b5563');
      drawText('未完成', bx + 32, by + 15, 11, '#9aa6b2', 'center');
    }
  });
  drawFittedText('建议顺序：先看天气，再抛竿；鱼饵不足时进商店补货。', W / 2, H - 62, 12, '#4ec9b0', 'center', W - 90);
}
function drawWeatherModal() {
  const env = environmentEffects();
  drawRect(34, 126, W - 68, 86, '#0d1421', '#33344f');
  drawText(`${env.season.icon} ${env.season.name} · ${env.weather.icon} ${env.weather.name}`, 48, 150, 17, '#ffd700');
  drawFittedText(`${env.weather.desc} · ${env.weather.tip}`, 48, 177, 12, '#9aa6b2', 'left', W - 96);
  drawFittedText(`效果：咬钩 ${(env.wait * 100).toFixed(0)}% · 稀有 +${Math.round(env.rarityBoost * 100)}% · 命中速度 ${(env.hitSpeed * 100).toFixed(0)}%`, 48, 198, 11, '#66e6ff', 'left', W - 96);
  drawText('未来预报', 48, 242, 15, '#ffd700');
  user.calendar.forecast.slice(0, 7).forEach((item, i) => {
    const weather = WEATHERS.find((w) => w.id === item.weather) || WEATHERS[0];
    const season = SEASONS.find((s) => s.id === item.season) || SEASONS[0];
    const day = i === 0 ? '今天' : `+${i}天`;
    drawListItem(34, 264 + i * 48, W - 68, 38, weather.icon, `${day} ${season.name} ${weather.name}`, weather.tip, season.color, '');
  });
  drawFittedText('建议：根据预报提前买鱼饵，雨天和雷暴更适合冲稀有鱼与省份榜。', W / 2, H - 62, 12, '#4ec9b0', 'center', W - 90);
}
function drawGachaModal() {
  drawButton('gachatab', '金币抽奖', 40, 132, 92, 32, gachaTab === 'coins', { tab: 'coins' });
  drawButton('gachatab', '钻石抽奖', 140, 132, 92, 32, gachaTab === 'diamonds', { tab: 'diamonds' });
  drawButton('gachaseason', '第一期', 40, 174, 74, 30, gachaSeason === 1, { season: 1 });
  drawButton('gachaseason', '第二期', 122, 174, 74, 30, gachaSeason === 2, { season: 2 });
  if (gachaTab === 'diamonds') drawButton('gachaseason', '第三期', 204, 174, 74, 30, gachaSeason === 3, { season: 3 });
  const prizes = gachaTab === 'coins'
    ? (gachaSeason === 1 ? ['神秘暗夜竿 0.1%', '熊猫竿 1%', '1000金币 8.9%', '1金币 90%'] : ['宠物奖池', '10钻石 10%', '1金币 89.58%'])
    : (gachaSeason === 1 ? ['火麒麟/绿玄武 各1%', '10钻石 8%', '1000金币 90%'] : gachaSeason === 2 ? ['耳机竿 0.01%', 'Candy竿 0.99%', '10钻石 10%', '1000金币 90%'] : ['鳞光坠 10%', '潮汐环 10%', '星砂针 10%', '100金币 70%']);
  prizes.forEach((p, i) => drawListItem(40, 218 + i * 44, W - 80, 34, '奖', p, '', '#ffd700', 'ui_gacha'));
  drawButton('gacha', gachaTab === 'coins' ? '单抽金币' : '单抽钻石', 44, H - 142, 112, 36, true, { count: 1 });
  drawButton('gacha', '十连抽', W - 156, H - 142, 112, 36, true, { count: 10 });
  if (modal.result) {
    modal.result.slice(0, 8).forEach((r, i) => {
      const y = H - 98 + i * 18;
      if (!drawAsset(r.asset, 44, y - 8, 16, 16)) drawText(r.icon, 52, y, 12, '#ffd700', 'center');
      drawText(r.text, 66, y, 12, '#ffffff');
    });
  }
}
function drawRedeemModal() {
  drawText('微信小游戏版提供快捷兑换按钮', W / 2, 150, 14, '#cccccc', 'center');
  drawButton('redeemcode', 'WELCOME2024', 50, 190, W - 100, 36, true, { code: 'WELCOME2024' });
  drawButton('redeemcode', 'FISHING666', 50, 236, W - 100, 36, true, { code: 'FISHING666' });
  drawButton('redeemcode', 'WAKAKA666', 50, 282, W - 100, 36, true, { code: 'WAKAKA666' });
}
function drawShareModal() {
  drawText('点击下方按钮复制分享口令', W / 2, 160, 14, '#cccccc', 'center');
  drawButton('sharecopy', '复制分享口令并领奖励', 54, 205, W - 108, 40, true);
  drawText('每天首次分享奖励 10 金币', W / 2, 270, 14, '#ffd700', 'center');
}
function drawFailureModal() {
  const reasonText = {
    slow: '鱼已经咬钩了，但反应慢了一点',
    miss: '只差一点命中红区，鱼脱钩了',
    timeout: '收线时间用完，鱼跑了',
    noChance: '今天的钓鱼次数用完了',
  }[modal.reason] || '这次没有钓上来';
  const cardW = Math.min(W - 56, 330);
  const cardH = 260;
  const x = (W - cardW) / 2;
  const y = Math.max(MINI_SAFE_TOP + 78, H * .22);
  drawRect(0, 0, W, H, 'rgba(0,0,0,.50)');
  drawRect(x, y, cardW, cardH, '#1a1a2e', '#ff8c42');
  drawButton('modal:close', '×', x + cardW - 42, y + 10, 30, 30, false);
  drawText('差一点就钓到了', W / 2, y + 38, 20, '#ffcc66', 'center');
  drawFittedText(reasonText, W / 2, y + 72, 13, '#ffffff', 'center', cardW - 44);
  drawFittedText(rankSummaryText(rankScope), W / 2, y + 102, 12, '#66e6ff', 'center', cardW - 44);
  drawRect(x + 24, y + 124, cardW - 48, 42, '#10121f', '#33344f');
  drawText(`剩余次数 ${user.chances.left}/${user.chances.max}`, W / 2, y + 145, 15, '#4ec9b0', 'center');
  drawButton('shareChance', '分享+1次', x + 30, y + 184, 118, 36, true);
  drawButton('coinChance', '50金币+1次', x + cardW - 148, y + 184, 118, 36, false);
  drawButton('openrank', '看省份榜', x + 30, y + 228, 118, 30, false);
  drawButton('modal:close', '明天再来', x + cardW - 148, y + 228, 118, 30, false);
}
function drawResultModal() {
  const c = modal.catch;
  const cardW = Math.min(W - 72, 300);
  const cardH = 238;
  const x = (W - cardW) / 2;
  const y = Math.max(MINI_SAFE_TOP + 96, H * .28);
  const score = c ? catchScore(c) : 0;
  drawRect(0, 0, W, H, 'rgba(0,0,0,.45)');
  drawRect(x, y, cardW, cardH, '#1a1a2e', '#ffd700');
  drawButton('modal:close', '×', x + cardW - 42, y + 10, 30, 30, false);
  drawFishPixelIcon(W / 2, y + 54, c.item, true);
  drawText(c.item.name, W / 2, y + 92, 20, RARITY_COLOR[c.rarity], 'center');
  drawText(`${RARITY_NAME[c.rarity]} ${c.weight ? c.weight + 'kg' : ''}`, W / 2, y + 122, 14, '#ffffff', 'center');
  drawText(`获得 ${c.value ? c.value + '金币' : ''}${c.diamondValue ? c.diamondValue + '钻石' : ''} · ${score}分`, W / 2, y + 148, 14, '#ffd700', 'center');
  drawFittedText(rankSummaryText(rankScope), W / 2, y + 173, 12, '#66e6ff', 'center', cardW - 40);
  drawButton('resultShare', '分享战绩', x + 24, y + cardH - 46, 86, 30, true);
  drawButton('openrank', '看排行', x + cardW / 2 - 43, y + cardH - 46, 86, 30, false);
  drawButton('modal:close', '继续钓', x + cardW - 110, y + cardH - 46, 86, 30, true);
}
function render() {
  targets = [];
  drawRect(0, 0, W, H, '#020407');
  drawScene();
  drawGamebar();
  drawTopbar();
  drawMobileAction();
  drawHitbar();
  drawModal();
}
function update() {
  const now = Date.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.phase === 'waiting') {
    state.wait -= dt;
    if (state.wait <= 0) {
      state.phase = 'hooked';
      state.bite = 3;
      status = '鱼上钩了！点击画面响应';
      playSfx('bite');
    }
    } else if (state.phase === 'hooked') {
    state.bite -= dt;
    if (state.bite <= 0) {
      failCatch('slow');
    }
  } else if (state.phase === 'reeling') {
    hb.cursor += hb.dir * hb.speed * dt;
    if (hb.cursor >= 1 || hb.cursor <= 0) {
      hb.cursor = Math.max(0, Math.min(1, hb.cursor));
      hb.dir *= -1;
    }
    hb.time -= dt;
    if (hb.time <= 0) {
      failCatch('timeout');
    }
  }
  if (user.vipAuto && !modal) {
    vipTimer += dt;
    if (vipTimer > .55) {
      vipTimer = 0;
      if (state.phase === 'idle') cast();
      else if (state.phase === 'hooked') startHitbar();
      else if (state.phase === 'reeling') {
        hb.cursor = hb.zone + hb.width / 2;
        hitbarClick();
      }
    }
  }
}
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
function handleTap(x, y) {
  startBgm('tap');
  const target = targets.slice().reverse().find((t) => hitTarget(x, y, t));
  if (target) {
    playActionSfx(target);
    handleAction(target);
    return;
  }
  if (!modal && state.phase === 'hooked') startHitbar();
}
function handleAction(t) {
  if (t.id.startsWith('top:')) {
    const type = t.id.slice(4);
    if (type === 'logout') {
      user = freshUser();
      state.phase = 'idle';
      modal = null;
      status = '已退出，使用本地默认玩家继续';
      saveUser();
    } else {
      modal = { type };
      reportEventSafe('ui_panel_open', {
        panel: type,
        open_source: 'top_button',
        panel_tab: t.data && t.data.tab || '',
      });
      if (type === 'dex') {
        activeFishDexFilter = 'all';
        fishDexPage = 0;
        markDailyFlag('dexSeen');
      }
      if (type === 'shop') shopTab = t.data && t.data.tab === 'rod' ? 'rod' : 'bait';
      if (type === 'gacha') {
        gachaTab = 'coins';
        gachaSeason = 1;
      }
      if (type === 'weather') markDailyFlag('weatherSeen');
      if (type === 'rank') loadRank(rankScope);
    }
    return;
  }
  if (t.id === 'cast') cast();
  else if (t.id === 'baitprev') changeBait(-1);
  else if (t.id === 'baitnext') changeBait(1);
  else if (t.id === 'rodprev') changeRod(-1);
  else if (t.id === 'rodnext') changeRod(1);
  else if (t.id === 'toggleauto') {
    user.vipAuto = !user.vipAuto;
    status = user.vipAuto ? '挂机钓鱼已开启' : '挂机钓鱼已关闭';
    playSfx('toggle');
    saveUser();
  }
  else if (t.id === 'mobile-action') {
    if (state.phase === 'idle') cast();
    else if (state.phase === 'waiting') playSfx('uiClick');
    else if (state.phase === 'hooked') startHitbar();
    else if (state.phase === 'reeling') hitbarClick();
  }
  else if (t.id === 'hit') hitbarClick();
  else if (t.id === 'modal:close') modal = null;
  else if (t.id === 'openrank') {
    modal = { type: 'rank' };
    reportEventSafe('ui_panel_open', {
      panel: 'rank',
      open_source: 'inline_button',
      rank_scope: rankScope,
    });
    loadRank(rankScope);
  }
  else if (t.id === 'ranktab') {
    rankScope = t.data.scope === 'national' ? 'national' : t.data.scope === 'province' ? 'province' : 'provinceWar';
    reportEventSafe('ui_panel_open', {
      panel: 'rank',
      open_source: 'rank_tab',
      rank_scope: rankScope,
    });
    loadRank(rankScope);
  }
  else if (t.id === 'fishdextab') {
    activeFishDexFilter = t.data.id;
    fishDexPage = 0;
  }
  else if (t.id === 'fishdexprev') fishDexPage = Math.max(0, fishDexPage - 1);
  else if (t.id === 'fishdexnext') fishDexPage += 1;
  else if (t.id === 'shoptab') shopTab = t.data.tab === 'rod' ? 'rod' : 'bait';
  else if (t.id === 'buybait') buyBait(t.data.id, t.data.count);
  else if (t.id === 'buybaitn') askBuyBaitCount(t.data.id);
  else if (t.id === 'buyrod') buyRod(t.data.id);
  else if (t.id === 'claimgoal') claimDailyGoal(t.data.id);
  else if (t.id === 'equiprod') {
    user.rodSkin = t.data.id;
    playSfx('switch');
    saveUser();
  } else if (t.id === 'equipchar') {
    user.activeCharacter = t.data.id;
    playSfx('switch');
    saveUser();
  } else if (t.id === 'equippet') {
    user.activePet = user.activePet === t.data.id ? null : t.data.id;
    playSfx('switch');
    saveUser();
  } else if (t.id === 'equipacc') {
    user.equippedAccessory = user.equippedAccessory === t.data.uid ? null : t.data.uid;
    playSfx('switch');
    saveUser();
  } else if (t.id === 'gachatab') {
    gachaTab = t.data.tab;
    gachaSeason = 1;
    modal.result = null;
  } else if (t.id === 'gachaseason') {
    gachaSeason = t.data.season;
    modal.result = null;
  } else if (t.id === 'gacha') {
    doGacha(t.data.count);
  } else if (t.id === 'redeemcode') {
    redeemCode(t.data.code);
  } else if (t.id === 'sharecopy') {
    playSfx('share');
    wx.setClipboardData({ data: '像素钓鱼小游戏，快来一起钓鱼！' });
    const today = new Date().toDateString();
    let rewardGranted = false;
    if (user.lastShareDate !== today) {
      user.money += 10;
      user.lastShareDate = today;
      saveUser();
      rewardGranted = true;
      reportEconomyChange({
        action: 'share_reward',
        share_type: 'invite_copy',
        currency: 'money',
        amount: 10,
        balance_after: analyticsNumber(user.money),
      });
    }
    status = '分享口令已复制';
    reportEventSafe('share_action', {
      share_type: 'invite_copy',
      reward_granted: rewardGranted,
      reward_currency: rewardGranted ? 'money' : '',
      reward_amount: rewardGranted ? 10 : 0,
    });
  } else if (t.id === 'shareChance') {
    wx.setClipboardData({ data: `我正在为${user.province}队冲榜，${rankSummaryText('provinceWar')}，快来帮本省加一分！` });
    if (user.chances.shareGrants >= 3) {
      status = '今日分享补次数已达上限，可用金币补次数或明天再来';
      playSfx('error');
      reportEventSafe('share_action', {
        share_type: 'chance_recover',
        reward_granted: false,
        fail_reason: 'daily_limit',
        share_grants_today: user.chances.shareGrants,
      });
    } else {
      playSfx('share');
      user.chances.shareGrants += 1;
      grantChance('分享成功，获得 1 次钓鱼机会', 'share', {
        share_grants_today: user.chances.shareGrants,
      });
      modal = null;
      reportEventSafe('share_action', {
        share_type: 'chance_recover',
        reward_granted: true,
        reward_type: 'chance',
        reward_amount: 1,
        share_grants_today: user.chances.shareGrants,
      });
    }
  } else if (t.id === 'coinChance') {
    if (user.money < 50) {
      status = '金币不足，分享或明天再来';
      playSfx('error');
    } else {
      user.money -= 50;
      grantChance('已消耗 50 金币，获得 1 次钓鱼机会', 'coin', {
        currency: 'money',
        amount: -50,
        balance_after: analyticsNumber(user.money),
      });
      modal = null;
    }
  } else if (t.id === 'resultShare') {
    playSfx('share');
    const score = modal && modal.catch ? catchScore(modal.catch) : (user.ranking.bestScore || 0);
    wx.setClipboardData({ data: `我刚为${user.province}队贡献 ${score} 分，${rankSummaryText('provinceWar')}，等你来一起冲榜！` });
    status = '战绩口令已复制';
    reportEventSafe('share_action', {
      share_type: 'result',
      score,
      reward_granted: false,
    });
  } else if (t.id === 'rankshare') {
    playSfx('share');
    wx.setClipboardData({ data: `今天加入${user.province}队钓鱼冲榜，${rankSummaryText('provinceWar')}，快来一起给本省上分！` });
    status = '省队召集口令已复制';
    reportEventSafe('share_action', {
      share_type: 'rank_invite',
      rank_scope: rankScope,
      reward_granted: false,
    });
  } else if (t.id === 'provinceNext') {
    const idx = Math.max(0, PROVINCES.indexOf(user.province));
    user.province = PROVINCES[(idx + 1) % PROVINCES.length];
    status = `已切换为${user.province}队出战`;
    rankCache.province = null;
    rankCache.provinceWar = null;
    saveUser();
    loadRank(rankScope);
  }
}
wx.onTouchEnd((event) => {
  const touch = event.changedTouches && event.changedTouches[0];
  if (touch) handleTap(touch.clientX, touch.clientY);
});
wx.onShow(() => {
  user = loadUser();
  startBgm('show');
  reportGameShow('show');
  syncBackendUser();
});
startBgm('launch');
reportGameShow('launch');
syncBackendUser();
loop();
