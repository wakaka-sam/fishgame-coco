const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const sys = wx.getSystemInfoSync();
const DPR = sys.pixelRatio || 1;
canvas.width = Math.floor(sys.windowWidth * DPR);
canvas.height = Math.floor(sys.windowHeight * DPR);
ctx.scale(DPR, DPR);

const W = sys.windowWidth;
const H = sys.windowHeight;
const SAVE_KEY = 'fish-coco-wechatgame-save';
const PLAYER_ID_KEY = 'fish-coco-player-id';
const API_BASE = 'https://fishapi.wakaka007.cn';
const MINI_SAFE_TOP = Math.max(
  0,
  sys.statusBarHeight || 0,
  sys.safeArea && typeof sys.safeArea.top === 'number' ? sys.safeArea.top : 0
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
const DEBUG_LOG_ENABLED = detectDebugLogEnabled();
const ACTION_BUTTON_COUNT = 12 + (DEBUG_LOG_ENABLED ? 1 : 0);
const ACTION_ROWS = Math.ceil(ACTION_BUTTON_COUNT / ACTION_COLS);
const TOPBAR_H = TOPBAR_PAD_Y * 2 + USER_ROW_H + 6 + ACTION_ROWS * ACTION_H + (ACTION_ROWS - 1) * ACTION_GAP;
const DEBUG_LOG_LIMIT = 160;
const debugLogs = [];
let logScroll = 0;

function detectDebugLogEnabled() {
  try {
    if (wx.getAccountInfoSync) {
      const info = wx.getAccountInfoSync();
      const env = info && info.miniProgram && info.miniProgram.envVersion;
      if (env) return env !== 'release';
    }
  } catch (_) {}
  try {
    if (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion) return __wxConfig.envVersion !== 'release';
  } catch (_) {}
  try {
    if (typeof location !== 'undefined') return /[?&]debugLogs=1(?:&|$)/.test(location.search);
  } catch (_) {}
  return false;
}
function compactLogValue(value) {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    const text = JSON.stringify(value);
    return text.length > 300 ? text.slice(0, 300) + '...' : text;
  } catch (_) {
    return String(value);
  }
}
function addDebugLog(level, parts) {
  if (!DEBUG_LOG_ENABLED) return;
  const now = new Date();
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join(':');
  debugLogs.push({ time, level, text: parts.map(compactLogValue).join(' ') });
  if (debugLogs.length > DEBUG_LOG_LIMIT) debugLogs.shift();
  logScroll = Math.max(0, Math.min(logScroll, Math.max(0, debugLogs.length - 1)));
}
function installDebugLogCapture() {
  if (!DEBUG_LOG_ENABLED || typeof console === 'undefined' || console.__fishDebugLogCapture) return;
  ['log', 'info', 'warn', 'error'].forEach((level) => {
    const original = console[level] && console[level].bind(console);
    if (!original) return;
    console[level] = (...args) => {
      addDebugLog(level, args);
      original(...args);
    };
  });
  console.__fishDebugLogCapture = true;
  if (wx.onError) wx.onError((message) => addDebugLog('error', ['wx.onError', message]));
  if (wx.onUnhandledRejection) wx.onUnhandledRejection((res) => addDebugLog('error', ['unhandledRejection', res && (res.reason || res)]));
  addDebugLog('info', ['debug log enabled']);
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
  character_shard: '角色碎片',
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
  character_shard: '#f59e0b',
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
  character_shard: 5,
};
const BAITS = {
  worm: {
    name: '蚯蚓',
    price: 10,
    desc: '入门鱼饵，能钓到些小鱼小虾',
    color: '#8b4513',
    fishes: [
      { id: 'sardine',     name: '沙丁鱼',   rarity: 'common',    minW: 0.05, maxW: 0.3,  price: 30,   icon: '🐟' },
      { id: 'crucian_s',   name: '小鲫鱼',   rarity: 'common',    minW: 0.1,  maxW: 0.6,  price: 25,   icon: '🐟' },
      { id: 'tadpole',     name: '蝌蚪',     rarity: 'common',    minW: 0.01, maxW: 0.05, price: 200,  icon: '🐸' },
      { id: 'minnow',      name: '米诺鱼',   rarity: 'common',    minW: 0.05, maxW: 0.2,  price: 40,   icon: '🐠' },
      { id: 'frog',        name: '青蛙',     rarity: 'common',    minW: 0.1,  maxW: 0.4,  price: 50,   icon: '🐸' },
      { id: 'catfish_s',   name: '小鲶鱼',   rarity: 'rare',      minW: 0.5,  maxW: 2,    price: 60,   icon: '🐡' },
      { id: 'eel_s',       name: '小鳗鱼',   rarity: 'rare',      minW: 0.3,  maxW: 1.2,  price: 100,  icon: '🐍' },
      { id: 'crucian_k',   name: '鲫鱼王',   rarity: 'rare',      minW: 1,    maxW: 3,    price: 80,   icon: '🐟' },
      { id: 'dawn_carp',   name: '晨曦鲤',   rarity: 'rare',      minW: 0.8,  maxW: 2.5,  price: 150,  icon: '🎏', timeSlot: 'morning' },
      { id: 'dusk_catfish', name: '暮光鲶',   rarity: 'rare',      minW: 1,    maxW: 3,    price: 120,  icon: '🐡', timeSlot: 'afternoon' },
      { id: 'glow_eel',    name: '夜光鳗',   rarity: 'rare',      minW: 0.5,  maxW: 1.8,  price: 200,  icon: '🐍', timeSlot: 'night' },
      { id: 'koi',         name: '锦鲤',     rarity: 'legendary', minW: 2,    maxW: 5,    price: 400,  icon: '🎏' },
      { id: 'old_turtle',  name: '千年龟',   rarity: 'legendary', minW: 5,    maxW: 15,   price: 250,  icon: '🐢' },
      { id: 'mud_dragon',  name: '泥龙',     rarity: 'hidden',    minW: 10,   maxW: 30,   price: 800,  icon: '🐉' },
    ],
  },
  shrimp: {
    name: '鲜虾',
    price: 50,
    desc: '海钓鱼饵，能引来肉食鱼',
    color: '#ff7f7f',
    fishes: [
      { id: 'mackerel',    name: '鲭鱼',     rarity: 'common',    minW: 0.5,  maxW: 1.5,  price: 60,   icon: '🐟' },
      { id: 'flounder_s',  name: '小比目鱼', rarity: 'common',    minW: 0.4,  maxW: 1.2,  price: 80,   icon: '🐠' },
      { id: 'squid_s',     name: '小鱿鱼',   rarity: 'common',    minW: 0.3,  maxW: 1,    price: 90,   icon: '🦑' },
      { id: 'snapper',     name: '红鲷',     rarity: 'common',    minW: 0.5,  maxW: 2,    price: 70,   icon: '🐟' },
      { id: 'crab',        name: '螃蟹',     rarity: 'common',    minW: 0.2,  maxW: 1,    price: 120,  icon: '🦀' },
      { id: 'tuna_s',      name: '小金枪鱼', rarity: 'rare',      minW: 2,    maxW: 6,    price: 200,  icon: '🐟' },
      { id: 'octopus',     name: '章鱼',     rarity: 'rare',      minW: 1,    maxW: 4,    price: 250,  icon: '🐙' },
      { id: 'lobster',     name: '龙虾',     rarity: 'rare',      minW: 0.5,  maxW: 2,    price: 400,  icon: '🦞' },
      { id: 'dawn_crab',   name: '朝霞蟹',   rarity: 'rare',      minW: 0.3,  maxW: 1.5,  price: 300,  icon: '🦀', timeSlot: 'morning' },
      { id: 'sunset_ray',  name: '落日鳐',   rarity: 'rare',      minW: 2,    maxW: 8,    price: 280,  icon: '🐠', timeSlot: 'afternoon' },
      { id: 'moon_jelly',  name: '月光水母', rarity: 'rare',      minW: 0.5,  maxW: 3,    price: 350,  icon: '🪼', timeSlot: 'night' },
      { id: 'sword',       name: '剑鱼',     rarity: 'legendary', minW: 10,   maxW: 30,   price: 600,  icon: '🗡️' },
      { id: 'manta',       name: '蝠鲼',     rarity: 'legendary', minW: 15,   maxW: 50,   price: 500,  icon: '🐠' },
      { id: 'kraken_baby', name: '幼海妖',   rarity: 'hidden',    minW: 20,   maxW: 60,   price: 1500, icon: '🦑' },
    ],
  },
  lure: {
    name: '亮片假饵',
    price: 200,
    desc: '吸引深海大鱼',
    color: '#c0c0c0',
    fishes: [
      { id: 'bass',        name: '鲈鱼',     rarity: 'common',    minW: 1,    maxW: 4,    price: 150,  icon: '🐟' },
      { id: 'pike',        name: '梭鱼',     rarity: 'common',    minW: 2,    maxW: 5,    price: 120,  icon: '🐠' },
      { id: 'salmon',      name: '三文鱼',   rarity: 'common',    minW: 2,    maxW: 6,    price: 200,  icon: '🐟' },
      { id: 'trout',       name: '鳟鱼',     rarity: 'common',    minW: 1,    maxW: 3,    price: 180,  icon: '🐟' },
      { id: 'walleye',     name: '梭鲈',     rarity: 'common',    minW: 1.5,  maxW: 4,    price: 220,  icon: '🐠' },
      { id: 'marlin_s',    name: '小马林鱼', rarity: 'rare',      minW: 5,    maxW: 20,   price: 400,  icon: '🗡️' },
      { id: 'shark_s',     name: '小鲨鱼',   rarity: 'rare',      minW: 8,    maxW: 25,   price: 350,  icon: '🦈' },
      { id: 'barracuda',   name: '梭子鱼',   rarity: 'rare',      minW: 3,    maxW: 10,   price: 500,  icon: '🐟' },
      { id: 'dawn_sword',  name: '破晓旗鱼', rarity: 'rare',      minW: 5,    maxW: 15,   price: 450,  icon: '🐟', timeSlot: 'morning' },
      { id: 'dusk_shark',  name: '黄昏鲨',   rarity: 'rare',      minW: 10,   maxW: 30,   price: 400,  icon: '🦈', timeSlot: 'afternoon' },
      { id: 'abyss_lantern', name: '深渊灯笼鱼', rarity: 'rare',  minW: 2,    maxW: 8,    price: 600,  icon: '🏮', timeSlot: 'night' },
      { id: 'megalodon_b', name: '幼巨齿鲨', rarity: 'legendary', minW: 30,   maxW: 80,   price: 800,  icon: '🦈' },
      { id: 'whale_s',     name: '小鲸',     rarity: 'legendary', minW: 50,   maxW: 200,  price: 600,  icon: '🐋' },
      { id: 'leviathan_s', name: '幼海蛇神', rarity: 'hidden',    minW: 80,   maxW: 300,  price: 2000, icon: '🐉' },
    ],
  },
  magic: {
    name: '魔法鱼饵',
    price: 1000,
    desc: '神秘鱼饵，能召唤奇异生物',
    color: '#c586c0',
    fishes: [
      { id: 'coelacanth',  name: '腔棘鱼',   rarity: 'common',    minW: 5,    maxW: 20,   price: 500,  icon: '🐟' },
      { id: 'angler',      name: '深海琵琶', rarity: 'common',    minW: 3,    maxW: 10,   price: 600,  icon: '🐠' },
      { id: 'hatchet',     name: '斧鱼',     rarity: 'common',    minW: 0.5,  maxW: 2,    price: 1200, icon: '🐟' },
      { id: 'gulper',      name: '吞噬鳗',   rarity: 'common',    minW: 2,    maxW: 8,    price: 800,  icon: '🐍' },
      { id: 'oarfish',     name: '皇带鱼',   rarity: 'common',    minW: 10,   maxW: 50,   price: 400,  icon: '🐍' },
      { id: 'siren',       name: '人鱼',     rarity: 'rare',      minW: 40,   maxW: 80,   price: 1500, icon: '🧜' },
      { id: 'sea_ghost',   name: '海妖',     rarity: 'rare',      minW: 20,   maxW: 60,   price: 2000, icon: '👻' },
      { id: 'crystal',     name: '水晶鱼',   rarity: 'rare',      minW: 1,    maxW: 5,    price: 4000, icon: '💎' },
      { id: 'dew_fairy',   name: '仙露鱼',   rarity: 'rare',      minW: 3,    maxW: 12,   price: 3000, icon: '🧚', timeSlot: 'morning' },
      { id: 'solar_ray',   name: '日炎蝶鱼', rarity: 'rare',      minW: 2,    maxW: 8,    price: 3500, icon: '🦋', timeSlot: 'afternoon' },
      { id: 'star_horse',  name: '星辰海马', rarity: 'rare',      minW: 1,    maxW: 6,    price: 5000, icon: '🐴', timeSlot: 'night' },
      { id: 'phoenix_f',   name: '凤凰鱼',   rarity: 'legendary', minW: 5,    maxW: 20,   price: 5000, icon: '🔥' },
      { id: 'kraken',      name: '海妖王',   rarity: 'legendary', minW: 100,  maxW: 500,  price: 1500, icon: '🦑' },
      { id: 'leviathan',   name: '海蛇神',   rarity: 'hidden',    minW: 200,  maxW: 1000, price: 8000, icon: '🐉' },
    ],
  },
  divine: {
    name: '神仙鱼饵',
    price: 10000,
    currency: 'diamonds',
    desc: '仙气缭绕的鱼饵，只会钓到传说级和隐藏级的鱼，也可通过钓鱼极低概率获得',
    color: '#ffd700',
    specialOnly: true,
    fishes: [
      { id: 'koi',         name: '锦鲤',     rarity: 'legendary', minW: 2,    maxW: 5,    price: 400,  icon: '🎏' },
      { id: 'old_turtle',  name: '千年龟',   rarity: 'legendary', minW: 5,    maxW: 15,   price: 250,  icon: '🐢' },
      { id: 'mud_dragon',  name: '泥龙',     rarity: 'hidden',    minW: 10,   maxW: 30,   price: 800,  icon: '🐉' },
      { id: 'sword',       name: '剑鱼',     rarity: 'legendary', minW: 10,   maxW: 30,   price: 600,  icon: '🗡️' },
      { id: 'manta',       name: '蝠鲼',     rarity: 'legendary', minW: 15,   maxW: 50,   price: 500,  icon: '🐠' },
      { id: 'kraken_baby', name: '幼海妖',   rarity: 'hidden',    minW: 20,   maxW: 60,   price: 1500, icon: '🦑' },
      { id: 'megalodon_b', name: '幼巨齿鲨', rarity: 'legendary', minW: 30,   maxW: 80,   price: 800,  icon: '🦈' },
      { id: 'whale_s',     name: '小鲸',     rarity: 'legendary', minW: 50,   maxW: 200,  price: 600,  icon: '🐋' },
      { id: 'leviathan_s', name: '幼海蛇神', rarity: 'hidden',    minW: 80,   maxW: 300,  price: 2000, icon: '🐉' },
      { id: 'phoenix_f',   name: '凤凰鱼',   rarity: 'legendary', minW: 5,    maxW: 20,   price: 5000, icon: '🔥' },
      { id: 'kraken',      name: '海妖王',   rarity: 'legendary', minW: 100,  maxW: 500,  price: 1500, icon: '🦑' },
      { id: 'leviathan',   name: '海蛇神',   rarity: 'hidden',    minW: 200,  maxW: 1000, price: 8000, icon: '🐉' },
    ],
  },
  jb: {
    name: 'JB鱼饵',
    dexName: '角色碎片',
    price: 0,
    purchasable: false,
    desc: '钓鱼时额外获得的特殊鱼饵，只会钓到角色碎片',
    color: '#f59e0b',
    specialOnly: true,
    characterShardOnly: true,
    hideDex: true,
    fishes: [],
  },
  black_silk: {
    name: '黑丝饵',
    dexName: '黑丝图鉴',
    price: 0,
    purchasable: false,
    desc: '已停止新增获取的特殊鱼饵，现存鱼饵仍可使用，只会钓到黑丝图鉴限定鱼',
    color: '#ff7ac8',
    specialOnly: true,
    fishes: [
      { id: 'candy_fish',      name: '糖果鱼', rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '🍬' },
      { id: 'black_silk_fish', name: '黑丝鱼', rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '🖤' },
      { id: 'water_fish',      name: '水鱼',   rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '💧' },
      { id: 'big_goldfish',    name: '大金鱼', rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '🐠' },
    ],
  },
};
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
  { id: 'wood', name: '木竿', threshold: 0, color: '#5d4037', hi: '#8d6e63', desc: '朴素的木质鱼竿' },
  { id: 'bamboo', name: '竹竿', threshold: 3, color: '#6d9b3a', hi: '#8bc34a', desc: '翠绿的竹节鱼竿' },
  { id: 'iron', name: '铁竿', threshold: 8, color: '#607d8b', hi: '#90a4ae', desc: '坚固的铁质鱼竿' },
  { id: 'gold', name: '黄金竿', threshold: 15, color: '#f9a825', hi: '#ffd54f', desc: '闪耀的黄金鱼竿' },
  { id: 'star', name: '星辰竿', threshold: 28, color: '#1a237e', hi: '#ffd700', desc: '蕴含星辰之力的终极鱼竿' },
];
const GACHA_RODS = [
  { id: 'panda', name: '熊猫竿', icon: '熊', color: '#222', hi: '#fff', desc: '金币抽奖限定' },
  { id: 'nightmyst', name: '神秘暗夜竿', icon: '月', color: '#0a0a2e', hi: '#8b5cf6', desc: '金币抽奖限定' },
  { id: 'firekirin', name: '极品火麒麟鱼竿', icon: '火', color: '#8f1d0b', hi: '#ff6b00', desc: '钻石抽奖第一期' },
  { id: 'greenxuanwu', name: '极品绿玄武鱼竿', icon: '龟', color: '#14532d', hi: '#86efac', desc: '钻石抽奖第一期' },
  { id: 'headphone', name: '耳机竿', icon: '耳', color: '#1a1a2e', hi: '#00d4ff', desc: '钻石抽奖第二期' },
  { id: 'candy', name: 'Candy竿', icon: '糖', color: '#ff69b4', hi: '#fff0f5', desc: '钻石抽奖第二期' },
];
const ROD_FISH = {
  candy: [
    { id: 'candy_horse', name: '糖果海马', rarity: 'rod_exclusive', minW: 10, maxW: 200, price: 0, icon: '马', rodId: 'candy' },
    { id: 'candy_dog', name: '糖果犬鱼', rarity: 'rod_exclusive', minW: 10, maxW: 200, price: 0, icon: '犬', rodId: 'candy' },
  ],
  headphone: [
    { id: 'maple_fish', name: '枫叶鱼', rarity: 'rod_exclusive', minW: 10, maxW: 200, price: 0, icon: '枫', rodId: 'headphone' },
  ],
  firekirin: [
    { id: 'fire_beast', name: '火焰兽', rarity: 'rod_exclusive', minW: 10, maxW: 200, price: 0, icon: '火', rodId: 'firekirin' },
  ],
  greenxuanwu: [
    { id: 'jade_turtle', name: '翡翠龟', rarity: 'rod_exclusive', minW: 10, maxW: 200, price: 0, icon: '龟', rodId: 'greenxuanwu' },
  ],
};
const ALL_ROD_FISH = Object.values(ROD_FISH).flat();
const DIAMOND_JACKPOT_CHANCE = 0.01;
const DIVINE_BAIT_DROP_CHANCE = 0.0001;
const JB_BAIT_DROP_CHANCE = 0.05;
const CHARACTERS = [
  { id: 'fishing_master', name: '钓鱼高手', icon: '钓', desc: '初始角色', title: '码头上的老练新星' },
  { id: 'phoebe_cupid', name: '菲比丘比', icon: '菲', desc: '碎片合成', title: '隐海修会的祈光者' },
  { id: 'raiden_shogun', name: '雷电将军', icon: '雷', desc: '碎片合成', title: '雷鸣海域的执竿者' },
  { id: 'justin_bieber', name: 'justin bieber', icon: 'J', desc: '碎片合成', title: '湖边巡演的流行歌手' },
  { id: 'teemo', name: '提莫', icon: '提', desc: '碎片合成', title: '草丛旁的巡湖斥候' },
];
const PETS = [
  { id: 'cat', name: '小猫咪', icon: '猫', bonus: '钓鱼金币+10', desc: '慵懒的小猫，喜欢看你钓鱼' },
  { id: 'dog', name: '小狗狗', icon: '狗', bonus: '钓鱼金币+10', desc: '忠诚的伙伴，会帮你看鱼竿' },
  { id: 'parrot', name: '鹦鹉', icon: '鹦', bonus: '钓鱼钻石+1', desc: '叽叽喳喳，停在你的肩上' },
  { id: 'penguin', name: '小企鹅', icon: '企', bonus: '钓鱼钻石+1', desc: '从南极远道而来的钓友' },
  { id: 'rabbit', name: '兔子', icon: '兔', bonus: '钓鱼钻石+1', desc: '可爱的月兔，带来好运' },
  { id: 'fox', name: '小狐狸', icon: '狐', bonus: '钓鱼钻石+1', desc: '聪明的狐狸，帮你发现稀有鱼' },
  { id: 'dragon', name: '小龙', icon: '龙', bonus: '钓鱼钻石+5', desc: '神秘的东方小龙' },
  { id: 'unicorn', name: '独角兽', icon: '角', bonus: '钓鱼钻石+5', desc: '传说中的神兽，极其罕见' },
];
const ACCESSORIES = [
  { id: 'scale_charm', name: '鳞光坠', icon: '鳞', color: '#66e6ff', desc: '提高稀有概率', effect: 'rarity' },
  { id: 'tide_bracelet', name: '潮汐环', icon: '潮', color: '#4ec9b0', desc: '减慢命中条', effect: 'slow' },
  { id: 'star_brooch', name: '星砂针', icon: '星', color: '#ffd700', desc: '综合加成', effect: 'both' },
];
const TOP_BUTTONS = [
  ['shop', '商店'], ['dex', '图鉴'], ['rod', '鱼竿'], ['character', '角色'], ['accessory', '首饰'],
  ['pet', '宠物'], ['rank', '排行'], ['gacha', '抽奖'], ['vip', 'VIP自动'], ['redeem', '兑换'],
  ['share', '分享'], ...(DEBUG_LOG_ENABLED ? [['logs', '日志']] : []), ['logout', '退出'],
];
const TOP_EMOJI = {
  shop: '🎁',
  dex: '📖',
  rod: '🎣',
  character: '🧍',
  accessory: '💍',
  pet: '🐾',
  rank: '🏆',
  gacha: '🎰',
  vip: '',
  redeem: '🎫',
  share: '📤',
  logs: '🧾',
  logout: '',
};
const BAIT_IDS = Object.keys(BAITS);
const TOP_ASSETS = {
  shop: 'ui_shop',
  dex: 'ui_dex',
  rod: 'rod_wood',
  character: 'character_fishing_master',
  accessory: 'accessory_scale_charm',
  pet: 'pet_cat',
  rank: 'ui_rank',
  gacha: 'ui_gacha',
  vip: 'rod_star',
  redeem: 'ui_redeem',
  share: 'ui_share',
};
const ASSET_PATHS = {};
const IMAGES = {};

installDebugLogCapture();
registerAssets();
preloadAssets();

function sanitizeUsername(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 24);
}
function stableServerUsername() {
  let id = '';
  try {
    id = wx.getStorageSync(PLAYER_ID_KEY) || '';
  } catch (_) {}
  if (!sanitizeUsername(id)) {
    id = 'player_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { wx.setStorageSync(PLAYER_ID_KEY, id); } catch (_) {}
  }
  return sanitizeUsername(id);
}
function ensureServerUsername() {
  const clean = sanitizeUsername(user && user.username);
  if (clean) {
    if (clean !== user.username) user.username = clean;
    return clean;
  }
  const id = stableServerUsername();
  if (user) user.username = id;
  return id;
}
function freshUser() {
  return {
    username: stableServerUsername(),
    money: 100,
    diamonds: 0,
    baits: { ...Object.fromEntries(BAIT_IDS.map((id) => [id, 0])), worm: 5 },
    currentBait: 'worm',
    dex: {},
    stats: { totalCatches: 0, totalEarned: 0, totalDiamonds: 0, totalWeight: 0 },
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
  };
}

let user = loadUser();
let state = { phase: 'idle', hookX: W * 0.52, hookY: 250, wait: 0, bite: 0 };
let hb = { active: false, catch: null, hits: 0, need: 0, cursor: 0, dir: 1, zone: 0.4, width: 0.18, speed: 1, time: 12 };
let modal = null;
let status = '准备好后选择鱼饵抛竿';
let targets = [];
let last = Date.now();
let gachaTab = 'coins';
let gachaSeason = 1;
let vipTimer = 0;
let activeDexBait = BAIT_IDS.includes('worm') ? 'worm' : BAIT_IDS[0];
let rankTab = 'total-catches';
let redeemInput = '';
let redeemStatus = '';
let redeemStatusKind = '';
let baitDropdownOpen = false;
let accessoryScroll = 0;
let accessoryStatus = '';
let accessoryDrag = null;
let serverOnline = false;
let serverBusy = false;
let syncTimer = null;
let remoteRankRows = null;
let rankStatus = '排行榜连接中...';

function loadUser() {
  try {
    const saved = wx.getStorageSync(SAVE_KEY);
    return saved ? normalize({ ...freshUser(), ...saved }) : freshUser();
  } catch (_) {
    return freshUser();
  }
}
function normalize(u) {
  const f = freshUser();
  u.username = sanitizeUsername(u.username) || stableServerUsername();
  u.baits = { ...f.baits, ...(u.baits || {}) };
  u.dex = u.dex || {};
  u.stats = { ...f.stats, ...(u.stats || {}) };
  u.history = Array.isArray(u.history) ? u.history : [];
  u.ownedRods = Array.isArray(u.ownedRods) ? u.ownedRods : [];
  u.ownedCharacters = Array.isArray(u.ownedCharacters) ? u.ownedCharacters : ['fishing_master'];
  if (!u.ownedCharacters.includes('fishing_master')) u.ownedCharacters.unshift('fishing_master');
  u.characterFragments = u.characterFragments || {};
  u.ownedPets = Array.isArray(u.ownedPets) ? u.ownedPets : [];
  u.accessories = Array.isArray(u.accessories) ? u.accessories : [];
  u.accessories.forEach((acc) => { acc.star = clampAccessoryStar(acc.star); });
  return u;
}
function wxRequest(options) {
  return new Promise((resolve, reject) => {
    if (!wx.request) {
      reject(new Error('当前环境不支持网络请求'));
      return;
    }
    const started = Date.now();
    addDebugLog('request', [options.method || 'GET', options.url]);
    wx.request({
      ...options,
      success(res) {
        const code = res.statusCode || 0;
        addDebugLog(code >= 200 && code < 300 ? 'response' : 'error', [
          `${options.method || 'GET'} ${options.url}`,
          code,
          `${Date.now() - started}ms`,
          res.data,
        ]);
        if (code >= 200 && code < 300) resolve(res.data);
        else reject(new Error((res.data && res.data.error) || `HTTP ${code}`));
      },
      fail(err) {
        addDebugLog('error', [`${options.method || 'GET'} ${options.url}`, err]);
        reject(new Error((err && (err.errMsg || err.message)) || '网络请求失败'));
      },
    });
  });
}
function apiPost(path, data) {
  return wxRequest({
    url: API_BASE + path,
    method: 'POST',
    data,
    header: { 'content-type': 'application/json' },
  });
}
function apiGet(path) {
  return wxRequest({ url: API_BASE + path, method: 'GET' });
}
function hasLocalProgress(local) {
  return !!(local && (
    (local.stats && local.stats.totalCatches > 0) ||
    Object.keys(local.dex || {}).length > 0 ||
    (local.money || 0) > 100 ||
    (local.diamonds || 0) > 0 ||
    (local.ownedRods || []).length ||
    (local.ownedPets || []).length ||
    (local.accessories || []).length
  ));
}
function looksLikeNewServerUser(remote) {
  return !!(remote &&
    (remote.money || 0) === 100 &&
    (remote.diamonds || 0) === 0 &&
    Object.keys(remote.dex || {}).length === 0 &&
    (!remote.stats || (remote.stats.totalCatches || 0) === 0) &&
    !(remote.ownedRods || []).length &&
    !(remote.ownedPets || []).length &&
    !(remote.accessories || []).length);
}
function applyRemoteUser(remote) {
  if (!remote) return;
  user = normalize({ ...freshUser(), ...remote });
  wx.setStorageSync(SAVE_KEY, user);
}
async function loginServer() {
  const local = normalize(user);
  const username = ensureServerUsername();
  serverBusy = true;
  try {
    const remote = await apiPost('/api/login', { username });
    serverOnline = true;
    if (looksLikeNewServerUser(remote) && hasLocalProgress(local)) {
      user = normalize({ ...remote, ...local, username, vip: remote.vip === true });
      await syncUserNow();
      status = '本地存档已迁移到服务器';
    } else {
      applyRemoteUser(remote);
      const pending = remote.pendingRankRewards || [];
      status = pending.length ? `已领取排行奖励 +${pending.reduce((s, r) => s + (r.diamonds || 0), 0)} 钻石` : '服务器存档已同步';
    }
  } catch (err) {
    serverOnline = false;
    status = `服务器连接失败，使用本地存档`;
  } finally {
    serverBusy = false;
  }
}
async function syncUserNow() {
  const username = ensureServerUsername();
  const remote = await apiPost('/api/save', { username, state: user });
  serverOnline = true;
  applyRemoteUser(remote);
  return remote;
}
function scheduleServerSync() {
  if (serverBusy) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncUserNow().catch(() => { serverOnline = false; });
  }, 450);
}
function saveUser(options = {}) {
  normalize(user);
  wx.setStorageSync(SAVE_KEY, user);
  if (options.remote !== false) scheduleServerSync();
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
function activeRod() {
  const dexCount = Object.keys(user.dex).length;
  const gacha = GACHA_RODS.find((r) => r.id === user.rodSkin && user.ownedRods.includes(r.id));
  if (gacha) return gacha;
  const selected = RODS.find((r) => r.id === user.rodSkin && dexCount >= r.threshold);
  if (selected) return selected;
  return RODS.filter((r) => dexCount >= r.threshold).pop() || RODS[0];
}
function nextRod() {
  const dexCount = Object.keys(user.dex).length;
  return RODS.find((r) => dexCount < r.threshold) || null;
}
function accessoryEffects() {
  const acc = user.accessories.find((a) => a.uid === user.equippedAccessory);
  if (!acc) return { rarityBoost: 0, slow: 0 };
  if (acc.type === 'scale_charm') return { rarityBoost: Math.min(0.16, 0.006 * acc.star), slow: 0 };
  if (acc.type === 'tide_bracelet') return { rarityBoost: 0, slow: Math.min(0.35, 0.012 * acc.star) };
  return { rarityBoost: Math.min(0.10, 0.003 * acc.star), slow: Math.min(0.24, 0.006 * acc.star) };
}
function clampAccessoryStar(star) {
  return Math.max(1, Math.min(20, Math.floor(star || 1)));
}
function accessoryDef(type) {
  return ACCESSORIES.find((a) => a.id === type) || null;
}
function accessoryEffectText(acc) {
  const def = accessoryDef(acc.type);
  if (!def) return '无加成';
  const star = clampAccessoryStar(acc.star);
  const parts = [];
  if (def.effect === 'rarity' || def.effect === 'both') parts.push(`稀有概率 +${Math.round((def.effect === 'both' ? 0.003 : 0.006) * star * 1000) / 10}%`);
  if (def.effect === 'slow' || def.effect === 'both') parts.push(`钓鱼条速度 -${Math.round((def.effect === 'both' ? 0.006 : 0.012) * star * 1000) / 10}%`);
  return parts.join(' / ') || '无加成';
}
function accessoryUpgradeChance(star) {
  star = clampAccessoryStar(star);
  if (star >= 20) return 0;
  return Math.max(0.25, 0.95 - (star - 1) * 0.035);
}
function accessoryUpgradeCost(star) {
  star = clampAccessoryStar(star);
  return star >= 20 ? 0 : star * 100;
}
function findAccessoryUpgradeMaterial(target) {
  return user.accessories.find((item) => item.uid !== target.uid && item.type === target.type && clampAccessoryStar(item.star) === clampAccessoryStar(target.star));
}
function upgradeAccessory(uid) {
  const target = user.accessories.find((item) => item.uid === uid);
  if (!target) return;
  target.star = clampAccessoryStar(target.star);
  if (target.star >= 20) {
    accessoryStatus = '已达到最高星级';
    return;
  }
  const material = findAccessoryUpgradeMaterial(target);
  if (!material) {
    accessoryStatus = '缺少同款同星首饰';
    return;
  }
  const cost = accessoryUpgradeCost(target.star);
  if (user.money < cost) {
    accessoryStatus = `金币不足，需要 ${cost} 金币`;
    return;
  }
  const def = accessoryDef(target.type);
  const success = Math.random() < accessoryUpgradeChance(target.star);
  user.money -= cost;
  if (success) target.star = clampAccessoryStar(target.star + 1);
  user.accessories = user.accessories.filter((item) => item.uid !== material.uid);
  if (user.equippedAccessory === material.uid) user.equippedAccessory = null;
  accessoryStatus = success ? `${def ? def.name : '首饰'} 强化成功，升至 ${target.star} 星` : `${def ? def.name : '首饰'} 强化失败`;
  saveUser();
}
function weightedRarity() {
  const boost = accessoryEffects().rarityBoost;
  const table = [['common', .70 - boost], ['rare', .255 + boost * .70], ['legendary', .04 + boost * .23], ['hidden', .005 + boost * .07]];
  let r = Math.random();
  for (const item of table) {
    r -= item[1];
    if (r <= 0) return item[0];
  }
  return 'common';
}
function currentTimeSlot() {
  const hour = new Date(Date.now() + 8 * 3600000).getUTCHours();
  if (hour >= 7 && hour < 14) return 'morning';
  if (hour >= 14 && hour < 21) return 'afternoon';
  return 'night';
}
function availableCharacterShardTargets() {
  return CHARACTERS
    .filter((ch) => ch.id !== 'fishing_master' && !user.ownedCharacters.includes(ch.id))
    .map((ch) => ({ id: `${ch.id}_shard`, name: `${ch.name}碎片`, icon: ch.icon, characterId: ch.id }));
}
function rollDiamondReward() {
  if (Math.random() < DIAMOND_JACKPOT_CHANCE) return 100;
  return 1 + Math.floor(Math.random() * 3);
}
function rollBonusBaitDrops() {
  const drops = [];
  if (BAITS.divine && Math.random() < DIVINE_BAIT_DROP_CHANCE) drops.push({ id: 'divine', count: 1 });
  if (BAITS.jb && Math.random() < JB_BAIT_DROP_CHANCE) drops.push({ id: 'jb', count: 1 });
  return drops;
}
function rollCatch() {
  const bait = BAITS[user.currentBait] || BAITS.worm;
  if (bait.characterShardOnly) {
    const targets = availableCharacterShardTargets();
    const shard = pick(targets.length ? targets : CHARACTERS.filter((ch) => ch.id !== 'fishing_master').map((ch) => ({ id: `${ch.id}_shard`, name: `${ch.name}碎片`, icon: ch.icon, characterId: ch.id })));
    return { kind: 'character_shard', item: { ...shard, rarity: 'legendary' }, characterId: shard.characterId, shardCount: 1, rarity: 'character_shard', weight: 0, value: 0, diamondValue: 0 };
  }
  const rod = activeRod();
  if (rod && ROD_FISH[rod.id] && Math.random() < 0.05) {
    const item = pick(ROD_FISH[rod.id]);
    const weight = +(item.minW + Math.random() * (item.maxW - item.minW)).toFixed(2);
    return { kind: 'fish', item, rarity: 'rod_exclusive', weight, value: 0, diamondValue: Math.round(weight) };
  }
  if (!bait.specialOnly && user.currentBait !== 'divine') {
    const r = Math.random();
    if (r < 0.20) return { kind: 'trash', item: pick(TRASH), rarity: 'trash', weight: 0, value: 0, diamondValue: 0 };
    if (r < 0.22) {
      const item = pick(TREASURE);
      return { kind: 'treasure', item, rarity: 'treasure', weight: 0, value: item.value, diamondValue: item.id === 'gem' ? 5 : 0 };
    }
  }
  if (bait.specialOnly) {
    const item = pick(bait.fishes);
    const weight = +(item.minW + Math.random() * (item.maxW - item.minW)).toFixed(2);
    const value = item.diamondValue ? 0 : Math.max(1, Math.round(weight * item.price));
    return { kind: 'fish', item, rarity: item.rarity, weight, value, diamondValue: item.diamondValue || 0 };
  }
  let rarity = weightedRarity();
  const slot = currentTimeSlot();
  let pool = bait.fishes.filter((f) => f.rarity === rarity && (!f.timeSlot || f.timeSlot === slot));
  if (!pool.length) {
    rarity = 'common';
    pool = bait.fishes.filter((f) => f.rarity === 'common');
  }
  const item = pick(pool.length ? pool : bait.fishes);
  const weight = +(item.minW + Math.random() * (item.maxW - item.minW)).toFixed(2);
  return { kind: 'fish', item, rarity: item.rarity, weight, value: Math.max(1, Math.round(weight * item.price)), diamondValue: 0 };
}
function cast() {
  if (state.phase !== 'idle') return;
  baitDropdownOpen = false;
  const count = user.baits[user.currentBait] || 0;
  if (count <= 0) {
    status = '没有鱼饵了，去商店买点吧';
    return;
  }
  user.baits[user.currentBait] -= 1;
  state.phase = 'waiting';
  state.wait = 1.5 + Math.random() * 3.5;
  state.hookX = W * 0.5 + (Math.random() - .5) * 80;
  state.hookY = sceneTop() + sceneHeight() * .52 + Math.random() * 30;
  status = '已抛竿，等待鱼上钩...';
  saveUser();
}
function startHitbar() {
  if (state.phase !== 'hooked') return;
  state.phase = 'reeling';
  hb.catch = rollCatch();
  hb.hits = 0;
  hb.need = HITS_BY_RARITY[hb.catch.rarity] || 2;
  hb.cursor = 0;
  hb.dir = 1;
  hb.width = Math.max(.1, .28 - hb.need * .025);
  hb.zone = Math.random() * (1 - hb.width);
  hb.speed = (.75 + hb.need * .17) * (1 - accessoryEffects().slow);
  hb.time = 12;
  hb.active = true;
  status = `${RARITY_NAME[hb.catch.rarity]}级目标上钩了`;
}
function hitbarClick() {
  if (!hb.active || state.phase !== 'reeling') return;
  if (hb.cursor < hb.zone || hb.cursor > hb.zone + hb.width) {
    hb.hits = 0;
    hb.zone = Math.random() * (1 - hb.width);
    status = '没中！计数清零';
    return;
  }
  hb.hits += 1;
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
}
function petBonus() {
  if (!user.activePet) return { coins: 0, diamonds: 0 };
  if (user.activePet === 'cat' || user.activePet === 'dog') return { coins: 10, diamonds: 0 };
  if (user.activePet === 'dragon' || user.activePet === 'unicorn') return { coins: 0, diamonds: 5 };
  return { coins: 0, diamonds: 1 };
}
function applyCatch(c) {
  const isShard = c.kind === 'character_shard';
  const bonus = petBonus();
  const bonusDiamonds = isShard ? 0 : rollDiamondReward();
  const baitDrops = isShard ? [] : rollBonusBaitDrops();
  baitDrops.forEach((drop) => {
    user.baits[drop.id] = (user.baits[drop.id] || 0) + drop.count;
  });
  c.petBonusCoins = isShard ? 0 : bonus.coins;
  c.petBonusDiamonds = isShard ? 0 : bonus.diamonds;
  c.totalCoins = c.value + c.petBonusCoins;
  c.diamonds = bonusDiamonds;
  c.baitDrops = baitDrops;
  c.baitDrop = baitDrops[0] || null;
  c.totalDiamonds = c.diamondValue + bonusDiamonds + c.petBonusDiamonds;
  user.money += c.value + c.petBonusCoins;
  user.diamonds += c.diamondValue + bonusDiamonds + c.petBonusDiamonds;
  if (isShard && c.characterId) {
    user.characterFragments[c.characterId] = (user.characterFragments[c.characterId] || 0) + (c.shardCount || 1);
    c.shardProgress = user.characterFragments[c.characterId];
    c.shardsRequired = 10;
    if (!user.ownedCharacters.includes(c.characterId) && c.shardProgress >= c.shardsRequired) {
      user.characterFragments[c.characterId] -= c.shardsRequired;
      user.ownedCharacters.push(c.characterId);
      user.activeCharacter = c.characterId;
      c.unlockedCharacter = c.characterId;
      c.shardProgress = user.characterFragments[c.characterId] || 0;
    }
  } else {
    user.dex[c.item.id] = user.dex[c.item.id] || { count: 0, maxWeight: 0 };
    user.dex[c.item.id].count += 1;
    user.dex[c.item.id].maxWeight = Math.max(user.dex[c.item.id].maxWeight || 0, c.weight);
  }
  user.stats.totalCatches += 1;
  user.stats.totalEarned += c.value + c.petBonusCoins;
  user.stats.totalDiamonds += c.diamondValue + bonusDiamonds + c.petBonusDiamonds;
  user.stats.totalWeight = +(((user.stats.totalWeight || 0) + (c.weight || 0)).toFixed(2));
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  if (!user.dailyStats || user.dailyStats.date !== today) user.dailyStats = { date: today, catches: 0, weight: 0 };
  user.dailyStats.catches += 1;
  user.dailyStats.weight = +((user.dailyStats.weight + (c.weight || 0)).toFixed(2));
  user.history.unshift({ name: c.item.name, rarity: c.rarity, weight: c.weight, value: c.value + bonus.coins, diamondValue: c.diamondValue, diamonds: bonusDiamonds, baitDrops, at: Date.now() });
  if (user.history.length > 30) user.history.length = 30;
  status = `钓到 ${c.item.name}`;
}
function buyBait(id, count) {
  const bait = BAITS[id];
  count = Math.max(1, Math.floor(Number(count) || 0));
  const cost = bait.price * count;
  const cur = bait.currency === 'diamonds' ? 'diamonds' : 'money';
  if (user[cur] < cost) {
    status = cur === 'diamonds' ? '钻石不足' : '金币不足';
    return;
  }
  user[cur] -= cost;
  user.baits[id] = (user.baits[id] || 0) + count;
  status = `购买 ${count} 个${bait.name}`;
  saveUser();
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
        return;
      }
      buyBait(id, count);
    },
  });
}
function changeBait(delta) {
  if (state.phase !== 'idle') {
    status = '钓鱼中不能切换鱼饵';
    baitDropdownOpen = false;
    return;
  }
  const current = Math.max(0, BAIT_IDS.indexOf(user.currentBait));
  user.currentBait = BAIT_IDS[(current + delta + BAIT_IDS.length) % BAIT_IDS.length];
  status = `当前鱼饵：${BAITS[user.currentBait].name}`;
  saveUser();
}
function selectBait(id) {
  if (state.phase !== 'idle') {
    status = '钓鱼中不能切换鱼饵';
    baitDropdownOpen = false;
    return;
  }
  if (!BAITS[id]) return;
  user.currentBait = id;
  baitDropdownOpen = false;
  status = `当前鱼饵：${BAITS[id].name}`;
  saveUser();
}
function gachaServerResult(result) {
  if (!result) return { icon: '奖', text: '奖励', asset: 'ui_gacha' };
  if (result.type === 'rod') {
    const rod = RODS.concat(GACHA_RODS).find((r) => r.id === result.id);
    return { icon: (rod && rod.icon) || '竿', text: (rod && rod.name) || result.id, asset: 'rod_' + result.id };
  }
  if (result.type === 'pet') {
    const pet = PETS.find((p) => p.id === result.id);
    return { icon: '宠', text: (pet && pet.name) || result.id, asset: 'pet_' + result.id };
  }
  if (result.type === 'accessory') {
    const def = accessoryDef(result.id);
    return { icon: (def && def.icon) || '饰', text: `${(def && def.name) || result.id}${result.star ? ` ${result.star}★` : ''}`, asset: 'accessory_' + result.id };
  }
  if (result.type === 'diamonds') return { icon: '钻', text: `${result.diamonds || 0} 钻石`, asset: 'ui_redeem' };
  if (result.type === 'coins') return { icon: '币', text: `${result.coins || 0} 金币`, asset: 'ui_gacha' };
  return { icon: '奖', text: result.type || '奖励', asset: 'ui_gacha' };
}
function doLocalGacha(count) {
  const isDiamond = gachaTab === 'diamonds';
  const cost = isDiamond ? (count === 10 ? 90 : 10) : (count === 10 ? (gachaSeason === 2 ? 100000 : 9000) : (gachaSeason === 2 ? 10000 : 1000));
  const cur = isDiamond ? 'diamonds' : 'money';
  if (user[cur] < cost) {
    status = isDiamond ? '钻石不足' : '金币不足';
    return;
  }
  user[cur] -= cost;
  const results = [];
  for (let i = 0; i < count; i++) results.push(applyGachaRoll());
  modal.result = results;
  saveUser();
}
async function doGacha(count) {
  const isDiamond = gachaTab === 'diamonds';
  const cost = isDiamond ? (count === 10 ? 90 : 10) : (count === 10 ? (gachaSeason === 2 ? 100000 : 9000) : (gachaSeason === 2 ? 10000 : 1000));
  const cur = isDiamond ? 'diamonds' : 'money';
  if (user[cur] < cost) {
    status = isDiamond ? '钻石不足' : '金币不足';
    return;
  }
  status = '正在请求服务器抽奖...';
  try {
    const data = await apiPost('/api/gacha', {
      username: ensureServerUsername(),
      currency: isDiamond ? 'diamonds' : 'coins',
      count,
      season: gachaSeason,
    });
    serverOnline = true;
    applyRemoteUser(data.user);
    modal.result = (data.results || []).map(gachaServerResult);
    status = '抽奖完成';
  } catch (err) {
    serverOnline = false;
    status = `服务器抽奖失败：${err.message}`;
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

function sceneTop() {
  return TOPBAR_Y + TOPBAR_H + 8;
}
function sceneHeight() {
  const widthHeight = Math.floor(CONTENT_W * 9 / 16);
  const available = H - sceneTop() - 160;
  return Math.max(150, Math.min(widthHeight, available));
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
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(String(text), x, y);
}
function fitText(text, maxWidth, size) {
  const raw = String(text);
  ctx.font = `${size}px monospace`;
  if (!maxWidth || ctx.measureText(raw).width <= maxWidth) return raw;
  let value = raw;
  while (value.length > 1 && ctx.measureText(value + '…').width > maxWidth) value = value.slice(0, -1);
  return value + '…';
}
function drawFittedText(text, x, y, size, color, align, maxWidth) {
  drawText(fitText(text, maxWidth, size), x, y, size, color, align);
}
function registerAsset(key, path) {
  ASSET_PATHS[key] = path;
}
function registerAssets() {
  Object.values(BAITS).flatMap((b) => b.fishes).concat(TRASH, TREASURE, ALL_ROD_FISH).forEach((item) => {
    registerAsset('fish_' + item.id, `assets/icons/fish_${item.id}.png`);
  });
  BAIT_IDS.forEach((id) => registerAsset('bait_' + id, `assets/icons/bait_${id}.png`));
  RODS.concat(GACHA_RODS).forEach((rod) => registerAsset('rod_' + rod.id, `assets/icons/rod_${rod.id}.png`));
  PETS.forEach((pet) => registerAsset('pet_' + pet.id, `assets/icons/pet_${pet.id}.png`));
  ACCESSORIES.forEach((acc) => registerAsset('accessory_' + acc.id, `assets/icons/accessory_${acc.id}.png`));
  ['shop', 'gacha', 'dex', 'rank', 'redeem', 'share'].forEach((name) => registerAsset('ui_' + name, `assets/icons/ui_${name}.png`));
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
  drawRect(x, y, w, h, active ? '#ffd700' : '#2c3e50', '#ffd700');
  const font = W <= 380 ? 9 : 11;
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
  drawFittedText(full, x + w / 2, y + h / 2, W <= 380 ? 9 : 11, fg, 'center', w - 10);
  addTarget(id, x, y, w, h, data);
}
function drawTopbar() {
  drawRect(CONTENT_X, TOPBAR_Y, CONTENT_W, TOPBAR_H, '#1a1a2e', '#ffd700');
  const userY = TOPBAR_Y + TOPBAR_PAD_Y + USER_ROW_H / 2;
  drawText(user.username, CONTENT_X + TOPBAR_PAD_X, userY, 14, '#4ec9b0');
  drawText(`💰 ${user.money}`, CONTENT_X + Math.min(112, CONTENT_W * .28), userY, 14, '#ffd700');
  drawText(`💎 ${user.diamonds}`, CONTENT_X + Math.min(205, CONTENT_W * .52), userY, 14, '#66e6ff');
  drawText(serverOnline ? '云同步' : '本地', CONTENT_X + CONTENT_W - 66, userY, 9, serverOnline ? '#4ec9b0' : '#ffae42', 'right');
  drawText('v1.0.24', CONTENT_X + CONTENT_W - TOPBAR_PAD_X, userY, 9, '#666666', 'right');
  const actionY = TOPBAR_Y + TOPBAR_PAD_Y + USER_ROW_H + 6;
  const bw = Math.floor((CONTENT_W - TOPBAR_PAD_X * 2 - ACTION_GAP * (ACTION_COLS - 1)) / ACTION_COLS);
  TOP_BUTTONS.forEach((btn, i) => {
    const row = Math.floor(i / ACTION_COLS);
    const col = i % ACTION_COLS;
    const label = btn[0] === 'vip' ? (user.vipAuto ? 'VIP自动:开' : 'VIP自动') : btn[1];
    const active = modal && modal.type === btn[0];
    const x = CONTENT_X + TOPBAR_PAD_X + col * (bw + ACTION_GAP);
    const y = actionY + row * (ACTION_H + ACTION_GAP);
    const isVip = btn[0] === 'vip';
    drawOriginalButton('top:' + btn[0], TOP_EMOJI[btn[0]], label, x, y, bw, ACTION_H, active, null, isVip ? 'vip' : '');
  });
}
function drawScene() {
  const top = sceneTop();
  const h = sceneHeight();
  drawRect(CONTENT_X, top, CONTENT_W, h, '#87ceeb', '#ffd700');
  const waterY = top + h * .40;
  drawRect(CONTENT_X, waterY, CONTENT_W, h - (waterY - top), '#1e6091');
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
  drawRect(CONTENT_X + CONTENT_W - 62, top + 28, 26, 26, '#ffeb3b');
  const rod = activeRod();
  const bx = CONTENT_X + CONTENT_W - 46;
  const by = top + h + 4;
  const tx = CONTENT_X + CONTENT_W * .46 + Math.sin(Date.now() / 600) * 5;
  const ty = top + h * .35;
  ctx.strokeStyle = rod.color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = rod.hi;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  const hookX = state.phase === 'idle' ? CONTENT_X + CONTENT_W * .50 : state.hookX;
  const hookY = state.phase === 'idle' ? waterY + 42 : state.hookY;
  ctx.strokeStyle = '#dff6ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();
  drawRect(hookX - 3, hookY - 5 + Math.sin(Date.now() / 180) * 3, 6, 8, '#ff5722');
  drawRect(CONTENT_X + CONTENT_W - 130, top + h - 30, 28, 30, '#f2b1aa');
  drawRect(CONTENT_X + CONTENT_W - 88, top + h - 22, 18, 22, '#f2b1aa');
  if (!drawCharacterSprite(user.activeCharacter || 'fishing_master', CONTENT_X + CONTENT_W - 90, top + h - 66, 56, 68)) {
    drawRect(CONTENT_X + CONTENT_W - 82, top + h - 28, 26, 26, '#fdbcb4');
    drawRect(CONTENT_X + CONTENT_W - 42, top + h - 20, 18, 18, '#fdbcb4');
  }
}
function drawGamebar() {
  const y = sceneTop() + sceneHeight() + 12;
  drawRect(CONTENT_X, y, CONTENT_W, 110, '#1a1a2e', '#ffd700');
  const bait = BAITS[user.currentBait];
  const rowY = y + 30;
  const selectW = Math.min(150, Math.max(126, CONTENT_W * .25));
  const selectX = W / 2 - selectW / 2;
  drawText('当前鱼饵:', selectX - 16, rowY, 14, '#e8e8e8', 'right');
  drawRect(selectX, rowY - 20, selectW, 40, '#2c3e50', '#ffd700');
  drawAsset('bait_' + user.currentBait, selectX + 10, rowY - 14, 28, 28);
  drawFittedText(`${bait.name} (×${user.baits[user.currentBait] || 0})`, selectX + 46, rowY, 13, '#ffd700', 'left', selectW - 64);
  drawText('⌄', selectX + selectW - 14, rowY, 13, '#e8e8e8', 'center');
  drawText(`剩余 ${user.baits[user.currentBait] || 0} 个`, selectX + selectW + 28, rowY, 14, '#e8e8e8', 'left');
  addTarget('baittoggle', selectX, rowY - 20, selectW, 40);
  const rod = activeRod();
  const upcoming = nextRod();
  const dexCount = Object.keys(user.dex).length;
  const rodLine = upcoming ? `🎣 ${rod.name}  🧍 ${CHARACTERS.find((c) => c.id === user.activeCharacter)?.name || '钓鱼高手'}  下一把: ${upcoming.name} (${dexCount}/${upcoming.threshold})` : `🎣 ${rod.name}  🧍 ${CHARACTERS.find((c) => c.id === user.activeCharacter)?.name || '钓鱼高手'}`;
  drawFittedText(rodLine, W / 2, y + 67, 12, '#d8c98a', 'center', CONTENT_W - 42);
  drawFittedText(status, W / 2, y + 91, 13, '#4ec9b0', 'center', CONTENT_W - 36);
  if (baitDropdownOpen) {
    const availableBaits = BAIT_IDS.filter((id) => (user.baits[id] || 0) > 0);
    const itemH = 34;
    const dropY = rowY + 24;
    const dropW = Math.max(selectW, 176);
    const dropX = Math.max(CONTENT_X + 14, Math.min(selectX, CONTENT_X + CONTENT_W - dropW - 14));
    const listH = Math.max(1, availableBaits.length) * itemH + 8;
    drawRect(dropX, dropY, dropW, listH, '#0d1421', '#ffd700');
    if (!availableBaits.length) {
      drawFittedText('暂无可用鱼饵', dropX + dropW / 2, dropY + 22, 12, '#777777', 'center', dropW - 16);
    }
    availableBaits.forEach((id, i) => {
      const iy = dropY + 4 + i * itemH;
      const active = id === user.currentBait;
      drawRect(dropX + 4, iy, dropW - 8, itemH - 4, active ? '#ffd700' : '#101827', active ? '#ffd700' : '#33344f');
      drawAsset('bait_' + id, dropX + 12, iy + 4, 22, 22);
      drawFittedText(`${BAITS[id].name} ×${user.baits[id] || 0}`, dropX + 42, iy + 15, 12, active ? '#1a1a2e' : '#ffd700', 'left', dropW - 54);
      addTarget('baitselect', dropX + 4, iy, dropW - 8, itemH - 4, { id });
    });
  }
}
function drawHitbar() {
  if (!hb.active) return;
  const top = Math.max(MINI_SAFE_TOP + 96, Math.min(H * .38, H - 310));
  drawRect(18, top, W - 36, 146, 'rgba(0,0,0,.72)', '#ffd700');
  drawText(`${RARITY_NAME[hb.catch.rarity]}级鱼上钩了！连续命中红区 ${hb.need} 次`, W / 2, top + 28, 16, '#ffffff', 'center');
  drawText(`${hb.hits} / ${hb.need} 命中    ${hb.time.toFixed(1)}s`, W / 2, top + 55, 14, '#6be7ff', 'center');
  const bx = 40;
  const by = top + 84;
  const bw = W - 80;
  drawRect(bx, by, bw, 28, '#26384c', '#ffd700');
  drawRect(bx + bw * hb.zone, by, bw * hb.width, 28, '#d35400');
  drawRect(bx + bw * hb.cursor - 2, by - 4, 4, 36, '#ffffff');
  const size = Math.min(116, Math.max(94, Math.floor(W * .28)));
  const cx = W / 2;
  const cy = H - size / 2 - 24;
  const gradient = ctx.createLinearGradient(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2);
  gradient.addColorStop(0, '#c0392b');
  gradient.addColorStop(1, '#ff6f00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 4;
  ctx.stroke();
  drawText('击中!', cx, cy, 20, '#ffffff', 'center');
  addTarget('hit', cx - size / 2, cy - size / 2, size, size);
}
function mobileActionLabel() {
  if (state.phase === 'idle') return '抛竿';
  if (state.phase === 'waiting') return '等待...';
  if (state.phase === 'hooked') return '拉!';
  return '击中!';
}
function drawMobileAction() {
  if (modal || hb.active) return;
  const size = Math.min(118, Math.max(92, Math.floor(W * .28)));
  const x = W / 2;
  const y = H - size / 2 - 24;
  const active = state.phase === 'hooked' || state.phase === 'reeling';
  const gradient = ctx.createLinearGradient(x - size / 2, y - size / 2, x + size / 2, y + size / 2);
  gradient.addColorStop(0, active ? '#c0392b' : '#d35400');
  gradient.addColorStop(1, active ? '#e74c3c' : '#ff6f00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 4;
  ctx.stroke();
  drawText(mobileActionLabel(), x, y, 20, '#ffffff', 'center');
  addTarget('mobile-action', x - size / 2, y - size / 2, size, size);
}
function drawModal() {
  if (!modal) return;
  if (modal.type === 'result') {
    drawResultModal();
    return;
  }
  const modalTop = Math.max(76, MINI_SAFE_TOP + 24);
  drawRect(18, modalTop, W - 36, H - modalTop - 36, '#191a2f', '#ffd700');
  drawButton('modal:close', '×', W - 58, modalTop + 12, 30, 30, false);
  const titleMap = {
    shop: '鱼饵商店',
    dex: '钓鱼图鉴',
    rod: '鱼竿收藏',
    character: '角色',
    accessory: '首饰',
    pet: '宠物',
    rank: '排行榜',
    gacha: '幸运抽奖',
    redeem: '兑换码',
    share: '分享',
    logs: '小程序日志',
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
  else if (modal.type === 'gacha') drawGachaModal();
  else if (modal.type === 'redeem') drawRedeemModal();
  else if (modal.type === 'share') drawShareModal();
  else if (modal.type === 'logs') drawLogsModal();
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
function drawMiniBadge(text, x, y, color, textColor = '#0d1421') {
  const w = Math.max(34, Math.min(68, String(text).length * 11 + 12));
  drawRect(x - w, y, w, 18, color);
  drawFittedText(text, x - w / 2, y + 9, 10, textColor, 'center', w - 6);
}
function drawSegmentTabs(id, items, active, x, y, w, h, gap = 4) {
  const tabW = Math.floor((w - gap * (items.length - 1)) / items.length);
  items.forEach((item, i) => {
    const tx = x + i * (tabW + gap);
    drawButton(id, item.label, tx, y, tabW, h, active === item.value, item.data || { value: item.value }, item.asset);
  });
}
function drawRodPreview(rod, x, y, w, h, locked) {
  ctx.save();
  if (locked) ctx.globalAlpha = .45;
  const pad = 14;
  const baseX = x + w - pad;
  const baseY = y + h - 10;
  const tipX = x + pad;
  const tipY = y + 12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rod.color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = rod.hi;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = locked ? '#607080' : 'rgba(255,255,255,.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo(tipX + w * .16, y + h * .72, tipX + w * .24, y + h - 4);
  ctx.stroke();
  drawRect(tipX + w * .22, y + h - 7, 5, 5, locked ? '#607080' : '#ffd700');
  ctx.restore();
}
function drawPrizeCard(prize, x, y, w, h) {
  const palette = {
    ultimate: '#ff6b00',
    legendary: '#8b5cf6',
    rare: '#4ec9b0',
    coin: '#ffd700',
    diamond: '#66e6ff',
    common: '#888888',
    accessory: '#e8d28a',
  };
  const color = palette[prize.rarity] || '#555555';
  drawRect(x, y, w, h, '#0d1421', color);
  const iconSize = 30;
  const ix = x + 10;
  const iy = y + (h - iconSize) / 2;
  if (!drawAsset(prize.asset, ix, iy, iconSize, iconSize)) drawText(prize.icon || '奖', ix + iconSize / 2, iy + iconSize / 2, 18, color, 'center');
  drawFittedText(prize.name, x + 48, y + h / 2 - 8, 12, color, 'left', w - 58);
  drawFittedText(prize.rate, x + 48, y + h / 2 + 10, 10, '#9aa6b2', 'left', w - 58);
}
function getGachaPrizes() {
  if (gachaTab === 'coins' && gachaSeason === 1) return [
    { name: '神秘暗夜竿', rate: '0.1%', rarity: 'legendary', asset: 'rod_nightmyst', icon: '月' },
    { name: '熊猫竿', rate: '1%', rarity: 'rare', asset: 'rod_panda', icon: '熊' },
    { name: '1000金币', rate: '8.9%', rarity: 'coin', asset: 'ui_gacha', icon: '币' },
    { name: '1金币', rate: '90%', rarity: 'common', asset: 'ui_gacha', icon: '币' },
  ];
  if (gachaTab === 'coins') return [
    { name: '小猫咪 / 小狗狗', rate: '各0.1%', rarity: 'ultimate', asset: 'pet_cat', icon: '宠' },
    { name: '鹦鹉 / 企鹅 / 兔子 / 狐狸', rate: '各0.05%', rarity: 'legendary', asset: 'pet_parrot', icon: '宠' },
    { name: '小龙 / 独角兽', rate: '各0.01%', rarity: 'legendary', asset: 'pet_dragon', icon: '宠' },
    { name: '10钻石', rate: '10%', rarity: 'diamond', asset: 'ui_redeem', icon: '钻' },
    { name: '1金币', rate: '89.58%', rarity: 'common', asset: 'ui_gacha', icon: '币' },
  ];
  if (gachaSeason === 1) return [
    { name: '极品火麒麟鱼竿', rate: '1%', rarity: 'ultimate', asset: 'rod_firekirin', icon: '火' },
    { name: '极品绿玄武鱼竿', rate: '1%', rarity: 'ultimate', asset: 'rod_greenxuanwu', icon: '龟' },
    { name: '10钻石', rate: '8%', rarity: 'diamond', asset: 'ui_redeem', icon: '钻' },
    { name: '1000金币', rate: '90%', rarity: 'coin', asset: 'ui_gacha', icon: '币' },
  ];
  if (gachaSeason === 2) return [
    { name: '耳机竿', rate: '0.01%', rarity: 'ultimate', asset: 'rod_headphone', icon: '耳' },
    { name: 'Candy竿', rate: '0.99%', rarity: 'legendary', asset: 'rod_candy', icon: '糖' },
    { name: '10钻石', rate: '10%', rarity: 'diamond', asset: 'ui_redeem', icon: '钻' },
    { name: '1000金币', rate: '90%', rarity: 'coin', asset: 'ui_gacha', icon: '币' },
  ];
  return [
    { name: '鳞光坠', rate: '10%', rarity: 'accessory', asset: 'accessory_scale_charm', icon: '鳞' },
    { name: '潮汐环', rate: '10%', rarity: 'accessory', asset: 'accessory_tide_bracelet', icon: '潮' },
    { name: '星砂针', rate: '10%', rarity: 'legendary', asset: 'accessory_star_brooch', icon: '星' },
    { name: '100金币', rate: '70%', rarity: 'coin', asset: 'ui_gacha', icon: '币' },
  ];
}
function gachaResultRarity(result) {
  if (!result) return 'common';
  if (String(result.text).includes('极品') || result.text === '耳机竿' || result.text === '小龙' || result.text === '独角兽') return 'ultimate';
  if (result.asset && result.asset.startsWith('rod_')) return 'legendary';
  if (result.asset && result.asset.startsWith('pet_')) return 'rare';
  if (result.asset && result.asset.startsWith('accessory_')) return 'accessory';
  if (String(result.text).includes('钻石')) return 'diamond';
  if (String(result.text).includes('1000') || String(result.text).includes('100')) return 'coin';
  return 'common';
}
async function redeemCode(code) {
  code = String(code || '').trim().toUpperCase();
  redeemInput = code;
  if (!code) {
    redeemStatus = '请输入兑换码';
    redeemStatusKind = 'error';
    return;
  }
  redeemStatus = '正在请求服务器兑换...';
  redeemStatusKind = 'info';
  try {
    const data = await apiPost('/api/redeem', { username: ensureServerUsername(), code });
    serverOnline = true;
    applyRemoteUser(data.user);
    const parts = [];
    if (data.coins) parts.push(`+${data.coins} 金币`);
    if (data.diamonds) parts.push(`+${data.diamonds} 钻石`);
    redeemStatus = `兑换成功！${parts.join(' / ') || data.desc || '奖励已到账'}`;
    redeemInput = '';
    redeemStatusKind = 'success';
  } catch (err) {
    serverOnline = false;
    redeemStatus = err.message || '兑换失败';
    redeemStatusKind = 'error';
  }
}
function askRedeemCode() {
  wx.showModal({
    title: '兑换码',
    content: '输入兑换码获取奖励',
    editable: true,
    placeholderText: redeemInput || '输入兑换码',
    success(res) {
      if (!res.confirm) return;
      redeemInput = String(res.content || '').trim().toUpperCase();
      redeemStatus = redeemInput ? '点击兑换领取奖励' : '';
      redeemStatusKind = redeemInput ? 'info' : '';
    },
  });
}
function drawShopModal() {
  let y = 136;
  Object.entries(BAITS).forEach(([id, bait]) => {
    if (bait.purchasable === false) return;
    drawListItem(34, y, W - 68, 58, '饵', `${bait.name} x${user.baits[id] || 0}`, `${bait.desc} · ${bait.currency === 'diamonds' ? '钻石' : '金币'} ${bait.price}`, bait.color, 'bait_' + id, 104);
    drawButton('buybait', '买1', W - 132, y + 13, 42, 32, false, { id, count: 1 });
    drawButton('buybaitn', '买N', W - 84, y + 13, 42, 32, false, { id });
    y += 66;
  });
}
function drawDexModal() {
  if (activeDexBait !== '_rod_exclusive' && (!BAITS[activeDexBait] || BAITS[activeDexBait].hideDex)) activeDexBait = BAIT_IDS.find((id) => !BAITS[id].hideDex) || BAIT_IDS[0];
  const tabCols = W <= 360 ? 2 : 3;
  const tabGap = 4;
  const tabX = 34;
  const tabY = 126;
  const tabW = Math.floor((W - 68 - tabGap * (tabCols - 1)) / tabCols);
  const tabH = 28;
  const dexTabs = BAIT_IDS.filter((id) => !BAITS[id].hideDex).concat('_rod_exclusive');
  dexTabs.forEach((id, i) => {
    const x = tabX + (i % tabCols) * (tabW + tabGap);
    const y = tabY + Math.floor(i / tabCols) * (tabH + 5);
    drawButton('dextab', id === '_rod_exclusive' ? '鱼竿专属' : (BAITS[id].dexName || BAITS[id].name), x, y, tabW, tabH, activeDexBait === id, { id }, id === '_rod_exclusive' ? 'rod_candy' : 'bait_' + id);
  });
  const isRodDex = activeDexBait === '_rod_exclusive';
  const bait = isRodDex ? { name: '鱼竿专属', color: RARITY_COLOR.rod_exclusive } : BAITS[activeDexBait];
  const items = isRodDex ? ALL_ROD_FISH : bait.fishes;
  const unlocked = items.filter((item) => user.dex[item.id]).length;
  const gridTop = tabY + Math.ceil(dexTabs.length / tabCols) * (tabH + 5) + 10;
  const cols = W <= 360 ? 3 : 4;
  const gap = 8;
  const colW = (W - 68 - gap * (cols - 1)) / cols;
  const cardH = W <= 360 ? 80 : 86;
  items.forEach((item, i) => {
    const x = 34 + (i % cols) * (colW + gap);
    const y = gridTop + Math.floor(i / cols) * (cardH + 8);
    const found = user.dex[item.id];
    const border = found ? RARITY_COLOR[item.rarity] : '#555555';
    drawRect(x, y, colW, cardH, '#0d1421', border);
    drawFishPixelIcon(x + colW / 2, y + 24, item, !!found);
    drawFittedText(found ? item.name : '???', x + colW / 2, y + 53, 11, found ? RARITY_COLOR[item.rarity] : '#777777', 'center', colW - 8);
    drawFittedText(found ? RARITY_NAME[item.rarity] : '未解锁', x + colW / 2, y + 66, 9, found ? '#d8d8d8' : '#777777', 'center', colW - 8);
    drawFittedText(found ? `×${found.count} · ${found.maxWeight}kg` : RARITY_NAME[item.rarity], x + colW / 2, y + 78, 9, found ? '#9aa6b2' : '#777777', 'center', colW - 8);
  });
  const statsY = Math.min(H - 94, gridTop + Math.ceil(items.length / cols) * (cardH + 8) + 8);
  drawRect(34, statsY, W - 68, 58, '#0d1421', '#555555');
  drawText(`${bait.dexName || bait.name}图鉴：${unlocked} / ${items.length}`, 46, statsY + 15, 13, bait.color || '#ffd700');
  drawText(`累计钓获：${user.stats.totalCatches || 0} 次`, 46, statsY + 35, 11, '#9aa6b2');
  drawFittedText(`累计收入：${user.stats.totalEarned || 0} 金币    累计钻石：${user.stats.totalDiamonds || 0}`, 46, statsY + 50, 11, '#9aa6b2', 'left', W - 92);
}
function drawRodModal() {
  const list = RODS.concat(GACHA_RODS);
  const dexCount = Object.keys(user.dex).length;
  const x0 = 34;
  const y0 = 132;
  const gap = 10;
  const cols = W <= 360 ? 1 : 2;
  const cardW = Math.floor((W - 68 - gap * (cols - 1)) / cols);
  const cardH = cols === 1 ? 80 : 94;
  list.forEach((rod, i) => {
    const x = x0 + (i % cols) * (cardW + gap);
    const y = y0 + Math.floor(i / cols) * (cardH + 10);
    const gacha = GACHA_RODS.some((r) => r.id === rod.id);
    const unlocked = gacha ? user.ownedRods.includes(rod.id) : dexCount >= rod.threshold;
    const active = activeRod().id === rod.id;
    drawRect(x, y, cardW, cardH, '#0d1421', active ? '#4ec9b0' : (unlocked ? '#ffd700' : '#555555'));
    drawRodPreview(rod, x + 8, y + 8, cardW - 16, cols === 1 ? 30 : 38, !unlocked);
    drawFittedText(rod.name, x + cardW / 2, y + (cols === 1 ? 48 : 56), 13, unlocked ? rod.hi : '#777777', 'center', cardW - 16);
    drawFittedText(rod.desc, x + cardW / 2, y + (cols === 1 ? 63 : 72), 10, unlocked ? '#9aa6b2' : '#666666', 'center', cardW - 16);
    const req = unlocked ? (active ? '装备中' : '点击装备') : (gacha ? '抽奖限定' : `收集 ${rod.threshold} 种鱼 (${dexCount}/${rod.threshold})`);
    drawFittedText(req, x + cardW / 2, y + cardH - 10, 10, unlocked ? '#4ec9b0' : '#777777', 'center', cardW - 16);
    if (active) drawMiniBadge('装备中', x + cardW - 6, y + 6, '#4ec9b0');
    else if (gacha && !unlocked) drawMiniBadge('限定', x + cardW - 6, y + 6, '#c586c0', '#ffffff');
    if (unlocked && !active) addTarget('equiprod', x, y, cardW, cardH, { id: rod.id });
  });
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
  const cols = W <= 360 ? 1 : 2;
  const gap = 10;
  const x0 = 34;
  const y0 = 132;
  const cardW = Math.floor((W - 68 - gap * (cols - 1)) / cols);
  const cardH = cols === 1 ? 76 : 92;
  PETS.forEach((pet, i) => {
    const x = x0 + (i % cols) * (cardW + gap);
    const y = y0 + Math.floor(i / cols) * (cardH + 10);
    const owned = user.ownedPets.includes(pet.id);
    const active = user.activePet === pet.id;
    drawRect(x, y, cardW, cardH, '#0d1421', active ? '#4ec9b0' : (owned ? '#ffd700' : '#555555'));
    const iconSize = cols === 1 ? 42 : 38;
    const iconX = cols === 1 ? x + 14 : x + cardW / 2 - iconSize / 2;
    const iconY = cols === 1 ? y + 16 : y + 10;
    const hasAsset = drawAsset('pet_' + pet.id, iconX, iconY, iconSize, iconSize);
    if (!hasAsset) drawText(pet.icon, iconX + iconSize / 2, iconY + iconSize / 2, 22, owned ? '#4ec9b0' : '#777777', 'center');
    if (cols === 1) {
      drawFittedText(pet.name, x + 68, y + 22, 14, owned ? '#ffd700' : '#777777', 'left', cardW - 118);
      drawFittedText(owned ? pet.bonus : '抽奖获得', x + 68, y + 45, 11, owned ? '#9aa6b2' : '#666666', 'left', cardW - 118);
      if (owned) drawButton('equippet', active ? '卸下' : '装备', x + cardW - 58, y + 23, 48, 30, false, { id: pet.id });
    } else {
      drawFittedText(pet.name, x + cardW / 2, y + 57, 13, owned ? '#ffd700' : '#777777', 'center', cardW - 16);
      drawFittedText(pet.desc, x + cardW / 2, y + 70, 9, owned ? '#9aa6b2' : '#666666', 'center', cardW - 16);
      drawFittedText(owned ? pet.bonus : `抽奖获得 · ${pet.bonus}`, x + cardW / 2, y + 82, 9, owned ? '#ffd700' : '#777777', 'center', cardW - 16);
      if (active) drawMiniBadge('装备中', x + cardW - 6, y + 6, '#4ec9b0');
      if (owned) addTarget('equippet', x, y, cardW, cardH, { id: pet.id });
    }
  });
}
function drawAccessoryModal() {
  const viewX = 34;
  const viewY = 126;
  const viewW = W - 68;
  const viewH = Math.max(240, H - viewY - 94);
  const cardH = 86;
  const gap = 10;
  const sorted = [...user.accessories].sort((a, b) => {
    if (a.uid === user.equippedAccessory) return -1;
    if (b.uid === user.equippedAccessory) return 1;
    return clampAccessoryStar(b.star) - clampAccessoryStar(a.star) || a.type.localeCompare(b.type);
  });
  const contentH = Math.max(viewH, (sorted.length || 1) * (cardH + gap) + 8);
  accessoryScroll = Math.max(0, Math.min(accessoryScroll, Math.max(0, contentH - viewH)));
  drawRect(viewX, viewY, viewW, viewH, '#10121f', '#33344f');
  addTarget('accscroll', viewX, viewY, viewW, viewH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewX, viewY, viewW, viewH);
  ctx.clip();
  if (!sorted.length) {
    drawText('暂无首饰，可在钻石抽奖第三期获得', W / 2, viewY + 44, 14, '#cccccc', 'center');
    ACCESSORIES.forEach((def, i) => {
      const y = viewY + 84 + i * 58;
      drawListItem(viewX + 12, y, viewW - 24, 48, def.icon, def.name, def.desc, def.color, 'accessory_' + def.id);
    });
  }
  sorted.forEach((acc, i) => {
    const def = accessoryDef(acc.type);
    if (!def) return;
    const y = viewY + 8 + i * (cardH + gap) - accessoryScroll;
    if (y > viewY + viewH || y + cardH < viewY) return;
    const active = user.equippedAccessory === acc.uid;
    const material = findAccessoryUpgradeMaterial(acc);
    const cost = accessoryUpgradeCost(acc.star);
    const chance = accessoryUpgradeChance(acc.star);
    const canUpgrade = !!material && acc.star < 20 && user.money >= cost;
    drawRect(viewX + 10, y, viewW - 20, cardH, '#0d1421', active ? '#4ec9b0' : def.color);
    drawAsset('accessory_' + def.id, viewX + 20, y + 14, 34, 34);
    drawFittedText(`${def.name} ${clampAccessoryStar(acc.star)}★`, viewX + 62, y + 18, 14, def.color, 'left', viewW - 150);
    drawFittedText(accessoryEffectText(acc), viewX + 62, y + 39, 10, '#9aa6b2', 'left', viewW - 150);
    const matText = acc.star >= 20 ? '已满星' : `消耗 ${cost} 金币 + 同款同星 ×1${material ? '' : '（缺材料）'}`;
    drawFittedText(matText, viewX + 62, y + 60, 10, canUpgrade ? '#e8d28a' : '#777777', 'left', viewW - 150);
    drawButton('equipacc', active ? '卸下' : '装备', W - 132, y + 12, 42, 28, false, { uid: acc.uid });
    drawButton('upgradeacc', '强化', W - 84, y + 12, 42, 28, canUpgrade, { uid: acc.uid });
  });
  ctx.restore();
  if (contentH > viewH) {
    const barH = Math.max(28, viewH * viewH / contentH);
    const barY = viewY + accessoryScroll / (contentH - viewH) * (viewH - barH);
    drawRect(viewX + viewW - 6, barY, 4, barH, '#ffd700');
  }
  const statusColor = accessoryStatus.includes('失败') || accessoryStatus.includes('不足') || accessoryStatus.includes('缺少') ? '#ff5722' : '#4ec9b0';
  drawFittedText(accessoryStatus || '拖动列表浏览首饰，强化需要同款同星首饰作为材料', W / 2, viewY + viewH + 24, 12, statusColor, 'center', W - 72);
}
async function fetchLeaderboard() {
  rankStatus = '排行榜连接中...';
  try {
    const rows = await apiGet('/api/leaderboard');
    remoteRankRows = Array.isArray(rows) ? rows : [];
    serverOnline = true;
    rankStatus = remoteRankRows.length ? '服务器排行榜' : '暂无排行数据';
  } catch (err) {
    serverOnline = false;
    remoteRankRows = null;
    rankStatus = `排行榜连接失败`;
  }
}
function drawRankModal() {
  drawSegmentTabs('ranktab', [
    { label: '今日次数', value: 'today-catches' },
    { label: '今日重量', value: 'today-weight' },
  ], rankTab, 34, 126, W - 68, 28);
  drawSegmentTabs('ranktab', [
    { label: '累计次数', value: 'total-catches' },
    { label: '累计重量', value: 'total-weight' },
  ], rankTab, 34, 162, W - 68, 28);
  const todayLocal = user.dailyStats || {};
  const localRows = [
    { username: user.username, totalCatches: user.stats.totalCatches || 0, totalWeight: user.stats.totalWeight || 0, todayCatches: todayLocal.catches || 0, todayWeight: todayLocal.weight || 0 },
  ];
  const rows = (remoteRankRows || localRows).map((r) => ({ ...r, name: r.name || r.username }));
  const sortKey = rankTab === 'today-weight' ? 'todayWeight' : rankTab === 'total-weight' ? 'totalWeight' : rankTab === 'today-catches' ? 'todayCatches' : 'totalCatches';
  const isWeight = sortKey.includes('Weight');
  rows.sort((a, b) => b[sortKey] - a[sortKey]);
  if (rankTab === 'today-catches') {
    drawRect(34, 202, W - 68, 34, '#0d1421', '#555555');
    drawFittedText('今日钓鱼数第一名可获得 5000 钻石', W / 2, 219, 12, '#ffd700', 'center', W - 88);
  }
  const startY = rankTab === 'today-catches' ? 248 : 206;
  drawFittedText(rankStatus, W / 2, startY - 14, 11, serverOnline ? '#4ec9b0' : '#ffae42', 'center', W - 90);
  rows.forEach((r, i) => {
    const y = startY + i * 54;
    const isMe = r.name === user.username;
    const color = i === 0 ? '#ffd700' : isMe ? '#4ec9b0' : '#ffffff';
    const value = isWeight ? `${r[sortKey].toFixed(1)}kg` : `${r[sortKey]} 次`;
    drawRect(34, y, W - 68, 44, '#0d1421', isMe ? '#4ec9b0' : '#33344f');
    drawText(i === 0 ? '冠' : String(i + 1), 58, y + 22, 16, color, 'center');
    drawFittedText(r.name, 86, y + 16, 14, color, 'left', W - 180);
    drawFittedText(isWeight ? '重量排行' : '次数排行', 86, y + 33, 10, '#9aa6b2', 'left', W - 180);
    drawFittedText(value, W - 50, y + 22, 13, '#ffd700', 'right', 86);
  });
}
function drawGachaModal() {
  drawSegmentTabs('gachatab', [
    { label: '金币抽奖', value: 'coins', data: { tab: 'coins' } },
    { label: '钻石抽奖', value: 'diamonds', data: { tab: 'diamonds' } },
  ], gachaTab, 34, 126, W - 68, 30);
  const seasons = gachaTab === 'diamonds'
    ? [{ label: '第一期', value: 1, data: { season: 1 } }, { label: '第二期', value: 2, data: { season: 2 } }, { label: '第三期', value: 3, data: { season: 3 } }]
    : [{ label: '第一期', value: 1, data: { season: 1 } }, { label: '第二期', value: 2, data: { season: 2 } }];
  drawSegmentTabs('gachaseason', seasons, gachaSeason, 34, 166, W - 68, 28);
  const prizes = getGachaPrizes();
  const prizeCols = W <= 300 ? 1 : 2;
  const prizeGap = 8;
  const prizeX = 40;
  const prizeW = Math.floor((W - 80 - prizeGap * (prizeCols - 1)) / prizeCols);
  const prizeH = W <= 340 ? 52 : 58;
  const prizeTop = 210;
  const prizeRows = Math.ceil(prizes.length / prizeCols);
  const prizeBottom = prizeTop + prizeRows * prizeH + Math.max(0, prizeRows - 1) * prizeGap;
  const resultCount = modal.result ? Math.min(10, modal.result.length) : 0;
  const resultCols = Math.min(W <= 360 ? 4 : 5, resultCount || 1);
  const resultRows = Math.ceil((resultCount || 1) / resultCols);
  const resultCellH = 54;
  const resultBlockH = resultCount ? resultRows * resultCellH + Math.max(0, resultRows - 1) * 6 : 0;
  const idealButtonY = prizeBottom + 18;
  const resultAwareButtonY = resultCount ? H - resultBlockH - 72 : H - 76;
  const buttonY = Math.max(prizeBottom + 12, Math.min(idealButtonY, resultAwareButtonY));
  drawRect(34, 202, W - 68, Math.max(64, prizeBottom - 202 + 10), '#111827', '#33344f');
  prizes.forEach((p, i) => {
    const x = prizeX + (i % prizeCols) * (prizeW + prizeGap);
    const y = prizeTop + Math.floor(i / prizeCols) * (prizeH + prizeGap);
    drawPrizeCard(p, x, y, prizeW, prizeH);
  });
  drawButton('gacha', gachaTab === 'coins' ? '单抽金币' : '单抽钻石', 44, buttonY, 112, 36, true, { count: 1 });
  drawButton('gacha', '十连抽', W - 156, buttonY, 112, 36, true, { count: 10 });
  if (modal.result) {
    const result = modal.result.slice(0, resultCount);
    const cols = resultCols;
    const gap = 6;
    const cellW = Math.floor((W - 80 - gap * (cols - 1)) / cols);
    const cellH = resultCellH;
    const y0 = buttonY + 50;
    result.forEach((r, i) => {
      const x = 40 + (i % cols) * (cellW + gap);
      const y = y0 + Math.floor(i / cols) * (cellH + 6);
      const rarity = gachaResultRarity(r);
      const color = rarity === 'ultimate' ? '#ff6b00' : rarity === 'legendary' ? '#8b5cf6' : rarity === 'rare' ? '#4ec9b0' : rarity === 'diamond' ? '#66e6ff' : rarity === 'coin' ? '#ffd700' : '#555555';
      drawRect(x, y, cellW, cellH, '#0d1421', color);
      if (!drawAsset(r.asset, x + cellW / 2 - 12, y + 7, 24, 24)) drawText(r.icon, x + cellW / 2, y + 19, 14, color, 'center');
      drawFittedText(r.text, x + cellW / 2, y + 42, 9, color, 'center', cellW - 6);
    });
  }
}
function drawRedeemModal() {
  drawText('输入兑换码获取金币奖励', W / 2, 150, 14, '#cccccc', 'center');
  const inputX = 50;
  const inputY = 184;
  const buttonW = 76;
  drawRect(inputX, inputY, W - 100 - buttonW - 8, 38, '#0d1421', '#ffd700');
  drawFittedText(redeemInput || '输入兑换码', inputX + (W - 100 - buttonW - 8) / 2, inputY + 19, 13, redeemInput ? '#ffffff' : '#777777', 'center', W - 130 - buttonW);
  addTarget('redeeminput', inputX, inputY, W - 100 - buttonW - 8, 38);
  drawButton('redeemsubmit', '兑换', W - 50 - buttonW, inputY, buttonW, 38, true);
  const statusColor = redeemStatusKind === 'success' ? '#4ec9b0' : redeemStatusKind === 'error' ? '#ff5722' : '#ffae42';
  drawFittedText(redeemStatus || '示例：WELCOME2024 / FISHING666 / WAKAKA666', W / 2, 250, 13, statusColor, 'center', W - 100);
}
function drawShareModal() {
  drawText('点击下方按钮复制分享口令', W / 2, 160, 14, '#cccccc', 'center');
  drawButton('sharecopy', '复制分享口令并领奖励', 54, 205, W - 108, 40, true);
  drawText('每天首次分享奖励 10 金币', W / 2, 270, 14, '#ffd700', 'center');
}
function drawLogsModal() {
  const top = 126;
  const controlsY = top;
  drawButton('logscroll', '↑', 34, controlsY, 42, 28, true, { dir: 1 });
  drawButton('logscroll', '↓', 84, controlsY, 42, 28, true, { dir: -1 });
  drawButton('logclear', '清空', W - 100, controlsY, 66, 28, false);
  drawFittedText(`共 ${debugLogs.length} 条，显示最近日志`, W / 2, controlsY + 14, 11, '#9aa6b2', 'center', W - 230);

  const areaX = 28;
  const areaY = top + 40;
  const areaW = W - 56;
  const areaH = H - areaY - 54;
  const lineH = 22;
  const visible = Math.max(1, Math.floor((areaH - 12) / lineH));
  logScroll = Math.max(0, Math.min(logScroll, Math.max(0, debugLogs.length - visible)));
  const start = Math.max(0, debugLogs.length - visible - logScroll);
  const rows = debugLogs.slice(start, start + visible);
  drawRect(areaX, areaY, areaW, areaH, '#080b12', '#33344f');
  if (!rows.length) {
    drawFittedText('暂无日志，进行登录、排行、抽奖等操作后会出现请求记录', W / 2, areaY + 40, 12, '#777777', 'center', areaW - 28);
    return;
  }
  rows.forEach((entry, i) => {
    const y = areaY + 10 + i * lineH;
    const color = entry.level === 'error' ? '#ff5722'
      : entry.level === 'warn' ? '#ffae42'
      : entry.level === 'request' ? '#66e6ff'
      : entry.level === 'response' ? '#4ec9b0'
      : '#dbeafe';
    drawFittedText(`${entry.time} ${entry.level}`, areaX + 8, y + 10, 9, color, 'left', 86);
    drawFittedText(entry.text, areaX + 94, y + 10, 9, '#f8fafc', 'left', areaW - 106);
  });
}
function drawResultModal() {
  const c = modal.catch;
  const rewardLines = [];
  if (c.kind === 'character_shard') {
    const character = CHARACTERS.find((ch) => ch.id === c.characterId);
    rewardLines.push({ label: '角色', value: character ? character.name : '角色碎片', color: '#f59e0b' });
    rewardLines.push({ label: '碎片进度', value: `${c.shardProgress || 0} / ${c.shardsRequired || 10}`, color: '#f59e0b' });
    if (c.unlockedCharacter) rewardLines.push({ label: '解锁角色', value: character ? character.name : c.unlockedCharacter, color: '#ffd700' });
  }
  if (c.weight) rewardLines.push({ label: '重量', value: `${c.weight} kg`, color: '#ffffff' });
  if (c.item && c.item.price && !c.diamondValue) rewardLines.push({ label: '单价', value: `${c.item.price} 金/kg`, color: '#9aa6b2' });
  if (c.value) rewardLines.push({ label: '金币', value: `+${c.value}`, color: '#ffd700' });
  if (c.diamondValue) rewardLines.push({ label: '售卖钻石', value: `+${c.diamondValue}`, color: '#66e6ff' });
  if (c.diamonds) rewardLines.push({ label: '额外钻石', value: `+${c.diamonds}`, color: '#66e6ff' });
  if (c.petBonusCoins) rewardLines.push({ label: '宠物加成', value: `+${c.petBonusCoins} 金币`, color: '#4ec9b0' });
  if (c.petBonusDiamonds) rewardLines.push({ label: '宠物加成', value: `+${c.petBonusDiamonds} 钻石`, color: '#4ec9b0' });
  (c.baitDrops || []).forEach((drop) => {
    const bait = BAITS[drop.id];
    rewardLines.push({ label: '鱼饵掉落', value: `${bait ? bait.name : drop.id} ×${drop.count}`, color: bait ? bait.color : '#ffd700' });
  });
  if ((c.petBonusCoins || c.petBonusDiamonds) && (c.totalCoins || 0) > 0) rewardLines.push({ label: '金币合计', value: `+${c.totalCoins}`, color: '#ffd700' });
  if ((c.petBonusCoins || c.petBonusDiamonds) && (c.totalDiamonds || 0) > 0) rewardLines.push({ label: '钻石合计', value: `+${c.totalDiamonds}`, color: '#66e6ff' });
  if (!rewardLines.length) rewardLines.push({ label: '奖励', value: '已收入图鉴', color: '#4ec9b0' });
  const cardW = Math.min(W - 56, 340);
  const cardH = Math.min(H - MINI_SAFE_TOP - 72, Math.max(232, 170 + rewardLines.length * 24));
  const x = (W - cardW) / 2;
  const y = Math.max(MINI_SAFE_TOP + 56, (H - cardH) / 2);
  drawRect(0, 0, W, H, 'rgba(0,0,0,.45)');
  drawRect(x, y, cardW, cardH, '#1a1a2e', '#ffd700');
  drawButton('modal:close', '×', x + cardW - 42, y + 10, 30, 30, false);
  drawFishPixelIcon(W / 2, y + 54, c.item, true);
  drawText(c.item.name, W / 2, y + 92, 20, RARITY_COLOR[c.rarity], 'center');
  drawText(`★ ${RARITY_NAME[c.rarity]} ★`, W / 2, y + 120, 14, RARITY_COLOR[c.rarity], 'center');
  const listX = x + 24;
  const listY = y + 142;
  const rowH = 22;
  rewardLines.forEach((line, i) => {
    const ry = listY + i * rowH;
    drawRect(listX, ry - 9, cardW - 48, 18, i % 2 ? '#101827' : '#0d1421');
    drawFittedText(line.label, listX + 10, ry, 11, '#9aa6b2', 'left', cardW * .45);
    drawFittedText(line.value, x + cardW - 34, ry, 12, line.color, 'right', cardW * .45);
  });
  drawButton('modal:close', '关闭', W / 2 - 48, y + cardH - 42, 96, 30, true);
}
function render() {
  targets = [];
  drawRect(0, 0, W, H, '#020407');
  drawTopbar();
  drawScene();
  drawGamebar();
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
    }
  } else if (state.phase === 'hooked') {
    state.bite -= dt;
    if (state.bite <= 0) {
      state.phase = 'idle';
      status = '反应太慢，鱼跑了';
    }
  } else if (state.phase === 'reeling') {
    hb.cursor += hb.dir * hb.speed * dt;
    if (hb.cursor >= 1 || hb.cursor <= 0) {
      hb.cursor = Math.max(0, Math.min(1, hb.cursor));
      hb.dir *= -1;
    }
    hb.time -= dt;
    if (hb.time <= 0) {
      state.phase = 'idle';
      hb.active = false;
      status = '时间到，鱼跑了';
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
  const target = targets.slice().reverse().find((t) => hitTarget(x, y, t));
  if (target) {
    target.tapX = x;
    target.tapY = y;
    handleAction(target);
    return;
  }
  if (baitDropdownOpen) {
    baitDropdownOpen = false;
    return;
  }
  if (!modal && state.phase === 'hooked') startHitbar();
}
function handleAction(t) {
  if (t.id.startsWith('top:')) {
    baitDropdownOpen = false;
    const type = t.id.slice(4);
    if (type === 'vip') {
      user.vipAuto = !user.vipAuto;
      status = user.vipAuto ? 'VIP自动钓鱼已开启' : 'VIP自动钓鱼已关闭';
      saveUser();
    } else if (type === 'logout') {
      user = freshUser();
      state.phase = 'idle';
      modal = null;
      status = '已退出，使用本地默认玩家继续';
      saveUser();
    } else {
      modal = { type };
      if (type === 'dex' && BAITS[user.currentBait] && !BAITS[user.currentBait].hideDex) activeDexBait = user.currentBait;
      if (type === 'gacha') {
        gachaTab = 'coins';
        gachaSeason = 1;
      }
      if (type === 'redeem') {
        redeemInput = '';
        redeemStatus = '';
        redeemStatusKind = '';
      }
      if (type === 'rank') fetchLeaderboard();
      if (type === 'logs') logScroll = 0;
    }
    return;
  }
  if (t.id === 'cast') cast();
  else if (t.id === 'baittoggle') {
    if (state.phase !== 'idle') {
      status = '钓鱼中不能切换鱼饵';
      baitDropdownOpen = false;
    } else {
      baitDropdownOpen = !baitDropdownOpen;
    }
  }
  else if (t.id === 'baitselect') selectBait(t.data.id);
  else if (t.id === 'baitprev') changeBait(-1);
  else if (t.id === 'baitnext') changeBait(1);
  else if (t.id === 'mobile-action') {
    if (state.phase === 'idle') cast();
    else if (state.phase === 'hooked') startHitbar();
    else if (state.phase === 'reeling') hitbarClick();
  }
  else if (t.id === 'hit') hitbarClick();
  else if (t.id === 'modal:close') modal = null;
  else if (t.id === 'dextab') activeDexBait = t.data.id;
  else if (t.id === 'buybait') buyBait(t.data.id, t.data.count);
  else if (t.id === 'buybaitn') askBuyBaitCount(t.data.id);
  else if (t.id === 'equiprod') {
    user.rodSkin = t.data.id;
    saveUser();
  } else if (t.id === 'equipchar') {
    user.activeCharacter = t.data.id;
    saveUser();
  } else if (t.id === 'equippet') {
    user.activePet = user.activePet === t.data.id ? null : t.data.id;
    saveUser();
  } else if (t.id === 'equipacc') {
    user.equippedAccessory = user.equippedAccessory === t.data.uid ? null : t.data.uid;
    saveUser();
  } else if (t.id === 'upgradeacc') {
    upgradeAccessory(t.data.uid);
  } else if (t.id === 'accscroll') {
    accessoryDrag = { y: t.tapY || 0, scroll: accessoryScroll };
  } else if (t.id === 'gachatab') {
    gachaTab = t.data.tab;
    gachaSeason = 1;
    modal.result = null;
  } else if (t.id === 'ranktab') {
    rankTab = t.data.value;
  } else if (t.id === 'gachaseason') {
    gachaSeason = t.data.season;
    modal.result = null;
  } else if (t.id === 'gacha') {
    doGacha(t.data.count);
  } else if (t.id === 'redeeminput') {
    askRedeemCode();
  } else if (t.id === 'redeemsubmit') {
    redeemCode(redeemInput);
  } else if (t.id === 'sharecopy') {
    wx.setClipboardData({ data: '像素钓鱼小游戏，快来一起钓鱼！' });
    const today = new Date().toDateString();
    if (user.lastShareDate !== today) {
      user.money += 10;
      user.lastShareDate = today;
      saveUser();
    }
    status = '分享口令已复制';
  } else if (t.id === 'logscroll') {
    const visible = Math.max(1, Math.floor((H - 126 - 40 - 54 - 12) / 22));
    const maxScroll = Math.max(0, debugLogs.length - visible);
    logScroll = Math.max(0, Math.min(maxScroll, logScroll + (t.data.dir > 0 ? visible : -visible)));
  } else if (t.id === 'logclear') {
    debugLogs.length = 0;
    logScroll = 0;
    addDebugLog('info', ['logs cleared']);
  }
}
function handleTouchMove(x, y) {
  if (!accessoryDrag || !modal || modal.type !== 'accessory') return;
  const viewY = 126;
  const viewH = Math.max(240, H - viewY - 94);
  const cardH = 86;
  const gap = 10;
  const contentH = Math.max(viewH, (user.accessories.length || 1) * (cardH + gap) + 8);
  accessoryScroll = Math.max(0, Math.min(accessoryDrag.scroll - (y - accessoryDrag.y), Math.max(0, contentH - viewH)));
}
function handleTouchEnd() {
  accessoryDrag = null;
}
const onTouchStart = wx.onTouchStart || wx.onTouchEnd;
onTouchStart((event) => {
  const touch = event.changedTouches && event.changedTouches[0];
  if (touch) handleTap(touch.clientX, touch.clientY);
});
if (wx.onTouchMove) wx.onTouchMove((event) => {
  const touch = event.changedTouches && event.changedTouches[0];
  if (touch) handleTouchMove(touch.clientX, touch.clientY);
});
if (wx.onTouchEnd) wx.onTouchEnd(() => handleTouchEnd());
wx.onShow(() => {
  user = loadUser();
  loginServer();
});
loginServer();
loop();
