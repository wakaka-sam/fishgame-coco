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
const ACTION_ROWS = Math.ceil(11 / ACTION_COLS);
const TOPBAR_H = TOPBAR_PAD_Y * 2 + USER_ROW_H + 6 + ACTION_ROWS * ACTION_H + (ACTION_ROWS - 1) * ACTION_GAP;

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
const TOP_BUTTONS = [
  ['shop', '商店'], ['dex', '图鉴'], ['rod', '鱼竿'], ['character', '角色'], ['accessory', '首饰'],
  ['pet', '宠物'], ['rank', '排行'], ['gacha', '抽奖'], ['vip', 'VIP自动'], ['redeem', '兑换'],
  ['share', '分享'],
];
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

registerAssets();
preloadAssets();

function freshUser() {
  return {
    username: '微信玩家',
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
  return u;
}
function saveUser() {
  normalize(user);
  wx.setStorageSync(SAVE_KEY, user);
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
function accessoryEffects() {
  const acc = user.accessories.find((a) => a.uid === user.equippedAccessory);
  if (!acc) return { rarityBoost: 0, slow: 0 };
  if (acc.type === 'scale_charm') return { rarityBoost: Math.min(0.16, 0.006 * acc.star), slow: 0 };
  if (acc.type === 'tide_bracelet') return { rarityBoost: 0, slow: Math.min(0.35, 0.012 * acc.star) };
  return { rarityBoost: Math.min(0.10, 0.003 * acc.star), slow: Math.min(0.24, 0.006 * acc.star) };
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
  const bonus = petBonus();
  user.money += c.value + bonus.coins;
  user.diamonds += c.diamondValue + bonus.diamonds;
  user.dex[c.item.id] = user.dex[c.item.id] || { count: 0, maxWeight: 0 };
  user.dex[c.item.id].count += 1;
  user.dex[c.item.id].maxWeight = Math.max(user.dex[c.item.id].maxWeight || 0, c.weight);
  user.stats.totalCatches += 1;
  user.stats.totalEarned += c.value;
  user.stats.totalDiamonds += c.diamondValue + bonus.diamonds;
  user.history.unshift({ name: c.item.name, rarity: c.rarity, weight: c.weight, value: c.value, at: Date.now() });
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
    return;
  }
  const current = Math.max(0, BAIT_IDS.indexOf(user.currentBait));
  user.currentBait = BAIT_IDS[(current + delta + BAIT_IDS.length) % BAIT_IDS.length];
  status = `当前鱼饵：${BAITS[user.currentBait].name}`;
  saveUser();
}
function doGacha(count) {
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
  const available = H - sceneTop() - 150;
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
  Object.values(BAITS).flatMap((b) => b.fishes).concat(TRASH, TREASURE).forEach((item) => {
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
function drawTopbar() {
  drawRect(CONTENT_X, TOPBAR_Y, CONTENT_W, TOPBAR_H, '#1a1a2e', '#ffd700');
  const userY = TOPBAR_Y + TOPBAR_PAD_Y + USER_ROW_H / 2;
  drawText(user.username, CONTENT_X + TOPBAR_PAD_X, userY, 14, '#4ec9b0');
  drawText(`💰 ${user.money}`, CONTENT_X + Math.min(112, CONTENT_W * .28), userY, 14, '#ffd700');
  drawText(`💎 ${user.diamonds}`, CONTENT_X + Math.min(205, CONTENT_W * .52), userY, 14, '#66e6ff');
  drawText('v1.0.23', CONTENT_X + CONTENT_W - TOPBAR_PAD_X, userY, 9, '#666666', 'right');
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
    drawRect(x, y, bw, ACTION_H, active ? '#ffd700' : (isVip ? '#263849' : '#2c3e50'), isVip ? '#66e6ff' : '#ffd700');
    const iconSize = W <= 380 ? 13 : 15;
    const iconX = x + 4;
    const iconY = y + (ACTION_H - iconSize) / 2;
    const hasIcon = drawAsset(TOP_ASSETS[btn[0]], iconX, iconY, iconSize, iconSize);
    drawFittedText(label, x + bw / 2 + (hasIcon ? 6 : 0), y + ACTION_H / 2, W <= 380 ? 9 : 11, active ? '#1a1a2e' : (isVip ? '#66e6ff' : '#ffd700'), 'center', bw - (hasIcon ? 26 : 8));
    addTarget('top:' + btn[0], x, y, bw, ACTION_H);
  });
}
function drawScene() {
  const top = sceneTop();
  const h = sceneHeight();
  drawRect(CONTENT_X, top, CONTENT_W, h, '#87ceeb', '#ffd700');
  const waterY = top + h * .38;
  drawRect(CONTENT_X, waterY, CONTENT_W, h - (waterY - top), '#1e6091');
  ctx.fillStyle = '#26384c';
  ctx.beginPath();
  ctx.moveTo(CONTENT_X, waterY);
  for (let x = CONTENT_X; x < CONTENT_X + CONTENT_W; x += 24) {
    ctx.lineTo(x, waterY - 18 - Math.sin(x * .04) * 12);
  }
  ctx.lineTo(CONTENT_X + CONTENT_W, waterY);
  ctx.fill();
  for (let y = waterY + 10; y < top + h; y += 9) {
    ctx.fillStyle = 'rgba(200,240,255,.25)';
    ctx.fillRect(CONTENT_X + 10, y + Math.sin(Date.now() / 500 + y) * 2, CONTENT_W - 20, 1);
  }
  drawRect(CONTENT_X + CONTENT_W - 62, top + 28, 26, 26, '#ffeb3b');
  const rod = activeRod();
  const bx = CONTENT_X + CONTENT_W - 45;
  const by = top + h - 10;
  const tx = CONTENT_X + CONTENT_W * .46 + Math.sin(Date.now() / 600) * 5;
  const ty = top + h * .30;
  ctx.strokeStyle = rod.color;
  ctx.lineWidth = 7;
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
  if (state.phase !== 'idle') {
    ctx.strokeStyle = '#dff6ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(state.hookX, state.hookY);
    ctx.stroke();
    drawRect(state.hookX - 5, state.hookY - 8 + Math.sin(Date.now() / 180) * 3, 10, 10, '#ff5722');
  }
  if (!drawCharacterSprite(user.activeCharacter || 'fishing_master', CONTENT_X + CONTENT_W - 98, top + h - 74, 68, 74)) {
    drawRect(CONTENT_X + CONTENT_W - 82, top + h - 28, 26, 26, '#fdbcb4');
    drawRect(CONTENT_X + CONTENT_W - 42, top + h - 20, 18, 18, '#fdbcb4');
  }
}
function drawGamebar() {
  const y = sceneTop() + sceneHeight() + 12;
  drawRect(CONTENT_X, y, CONTENT_W, 98, '#1a1a2e', '#ffd700');
  drawButton('baitprev', '‹', CONTENT_X + 10, y + 8, 34, 30, false);
  drawButton('baitnext', '›', CONTENT_X + CONTENT_W - 44, y + 8, 34, 30, false);
  drawAsset('bait_' + user.currentBait, W / 2 - 92, y + 7, 32, 32);
  drawText(`当前鱼饵: ${BAITS[user.currentBait].name} (×${user.baits[user.currentBait] || 0})`, W / 2, y + 23, 14, '#e8e8e8', 'center');
  const rod = activeRod();
  drawAsset('rod_' + rod.id, W / 2 - 118, y + 35, 28, 28);
  drawText(`🎣 ${rod.name} · 图鉴 ${Object.keys(user.dex).length} 种`, W / 2, y + 50, 13, '#4ec9b0', 'center');
  drawText(status, W / 2, y + 72, 13, '#4ec9b0', 'center');
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
function drawShopModal() {
  let y = 136;
  Object.entries(BAITS).forEach(([id, bait]) => {
    drawListItem(34, y, W - 68, 58, '饵', `${bait.name} x${user.baits[id] || 0}`, `${bait.desc} · ${bait.currency === 'diamonds' ? '钻石' : '金币'} ${bait.price}`, bait.color, 'bait_' + id, 104);
    drawButton('buybait', '买1', W - 132, y + 13, 42, 32, false, { id, count: 1 });
    drawButton('buybaitn', '买N', W - 84, y + 13, 42, 32, false, { id });
    y += 66;
  });
}
function drawDexModal() {
  if (!BAITS[activeDexBait]) activeDexBait = BAIT_IDS[0];
  const tabCols = 3;
  const tabGap = 6;
  const tabX = 34;
  const tabY = 126;
  const tabW = Math.floor((W - 68 - tabGap * (tabCols - 1)) / tabCols);
  const tabH = 30;
  BAIT_IDS.forEach((id, i) => {
    const x = tabX + (i % tabCols) * (tabW + tabGap);
    const y = tabY + Math.floor(i / tabCols) * (tabH + 6);
    drawButton('dextab', BAITS[id].name, x, y, tabW, tabH, activeDexBait === id, { id }, 'bait_' + id);
  });
  const bait = BAITS[activeDexBait];
  const items = bait.fishes;
  const unlocked = items.filter((item) => user.dex[item.id]).length;
  const gridTop = tabY + Math.ceil(BAIT_IDS.length / tabCols) * (tabH + 6) + 10;
  const cols = 3;
  const colW = (W - 84) / cols;
  items.forEach((item, i) => {
    const x = 34 + (i % cols) * (colW + 8);
    const y = gridTop + Math.floor(i / cols) * 76;
    const found = user.dex[item.id];
    const border = found ? RARITY_COLOR[item.rarity] : '#555555';
    drawRect(x, y, colW, 68, '#0d1421', border);
    drawFishPixelIcon(x + colW / 2, y + 23, item, !!found);
    drawFittedText(found ? item.name : '???', x + colW / 2, y + 49, 11, found ? '#e8e8e8' : '#777777', 'center', colW - 8);
    drawFittedText(found ? `x${found.count} | 最大 ${found.maxWeight}kg` : RARITY_NAME[item.rarity], x + colW / 2, y + 61, 9, found ? RARITY_COLOR[item.rarity] : '#777777', 'center', colW - 8);
  });
  const statsY = Math.min(H - 86, gridTop + Math.ceil(items.length / cols) * 76 + 8);
  drawRect(34, statsY, W - 68, 48, '#0d1421', '#555555');
  drawText(`${bait.name}图鉴：${unlocked} / ${items.length}`, 46, statsY + 15, 13, bait.color || '#ffd700');
  drawFittedText(`累计钓获 ${user.stats.totalCatches || 0} 次 · 收入 ${user.stats.totalEarned || 0} 金币 · 钻石 ${user.stats.totalDiamonds || 0}`, 46, statsY + 34, 11, '#9aa6b2', 'left', W - 92);
}
function drawRodModal() {
  const list = RODS.concat(GACHA_RODS);
  const dexCount = Object.keys(user.dex).length;
  list.forEach((rod, i) => {
    const y = 136 + i * 50;
    const gacha = GACHA_RODS.some((r) => r.id === rod.id);
    const unlocked = gacha ? user.ownedRods.includes(rod.id) : dexCount >= rod.threshold;
    drawListItem(34, y, W - 68, 42, rod.icon || '竿', rod.name, unlocked ? (activeRod().id === rod.id ? '装备中' : '点击装备') : (gacha ? '抽奖限定' : `${dexCount}/${rod.threshold}`), rod.hi, 'rod_' + rod.id, unlocked && activeRod().id !== rod.id ? 62 : 0);
    if (unlocked && activeRod().id !== rod.id) drawButton('equiprod', '装备', W - 92, y + 6, 48, 30, false, { id: rod.id });
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
  const rows = [
    { name: user.username, n: user.stats.totalCatches || 0, w: Object.values(user.dex).reduce((s, x) => s + (x.maxWeight || 0), 0) },
    { name: 'wakaka', n: 420, w: 6890.2 },
    { name: 'pixel', n: 180, w: 2240.6 },
    { name: 'cocos38', n: 126, w: 1610.4 },
  ].sort((a, b) => b.n - a.n);
  rows.forEach((r, i) => {
    drawListItem(34, 140 + i * 54, W - 68, 44, String(i + 1), r.name, `累计 ${r.n} 次 · ${r.w.toFixed(1)}kg`, i === 0 ? '#ffd700' : '#ffffff', i === 0 ? 'ui_rank' : '');
  });
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
function drawResultModal() {
  const c = modal.catch;
  const cardW = Math.min(W - 72, 300);
  const cardH = 188;
  const x = (W - cardW) / 2;
  const y = Math.max(MINI_SAFE_TOP + 96, H * .28);
  drawRect(0, 0, W, H, 'rgba(0,0,0,.45)');
  drawRect(x, y, cardW, cardH, '#1a1a2e', '#ffd700');
  drawButton('modal:close', '×', x + cardW - 42, y + 10, 30, 30, false);
  drawFishPixelIcon(W / 2, y + 54, c.item, true);
  drawText(c.item.name, W / 2, y + 92, 20, RARITY_COLOR[c.rarity], 'center');
  drawText(`${RARITY_NAME[c.rarity]} ${c.weight ? c.weight + 'kg' : ''}`, W / 2, y + 122, 14, '#ffffff', 'center');
  drawText(`获得 ${c.value ? c.value + '金币' : ''}${c.diamondValue ? c.diamondValue + '钻石' : ''}`, W / 2, y + 148, 14, '#ffd700', 'center');
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
    handleAction(target);
    return;
  }
  if (!modal && state.phase === 'hooked') startHitbar();
}
function handleAction(t) {
  if (t.id.startsWith('top:')) {
    const type = t.id.slice(4);
    if (type === 'vip') {
      user.vipAuto = !user.vipAuto;
      status = user.vipAuto ? 'VIP自动钓鱼已开启' : 'VIP自动钓鱼已关闭';
      saveUser();
    } else {
      modal = { type };
      if (type === 'dex' && BAITS[user.currentBait]) activeDexBait = user.currentBait;
      if (type === 'gacha') {
        gachaTab = 'coins';
        gachaSeason = 1;
      }
    }
    return;
  }
  if (t.id === 'cast') cast();
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
    const code = t.data.code;
    const usedKey = `redeem_${code}`;
    if (wx.getStorageSync(usedKey)) {
      status = '该兑换码已使用';
    } else {
      if (code === 'WAKAKA666') user.diamonds += 10000;
      else if (code === 'WELCOME2024') user.money += 500;
      else user.money += 200;
      wx.setStorageSync(usedKey, true);
      status = '兑换成功';
      saveUser();
    }
  } else if (t.id === 'sharecopy') {
    wx.setClipboardData({ data: '像素钓鱼小游戏，快来一起钓鱼！' });
    const today = new Date().toDateString();
    if (user.lastShareDate !== today) {
      user.money += 10;
      user.lastShareDate = today;
      saveUser();
    }
    status = '分享口令已复制';
  }
}
wx.onTouchEnd((event) => {
  const touch = event.changedTouches && event.changedTouches[0];
  if (touch) handleTap(touch.clientX, touch.clientY);
});
wx.onShow(() => {
  user = loadUser();
});
loop();
