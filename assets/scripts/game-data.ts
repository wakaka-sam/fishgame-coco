export type Rarity = 'trash' | 'common' | 'rare' | 'legendary' | 'hidden' | 'treasure' | 'limited' | 'rod_exclusive';

export interface FishItem {
  id: string;
  name: string;
  rarity: Rarity;
  minW?: number;
  maxW?: number;
  price?: number;
  value?: number;
  diamondValue?: number;
  icon: string;
}

export interface CatchResult {
  kind: 'fish' | 'trash' | 'treasure';
  item: FishItem;
  rarity: Rarity;
  weight: number;
  value: number;
  diamondValue: number;
}

export const HITS_BY_RARITY: Record<Rarity, number> = {
  trash: 1,
  common: 2,
  rare: 3,
  legendary: 5,
  hidden: 7,
  treasure: 4,
  limited: 4,
  rod_exclusive: 5,
};

export const RARITY_NAME: Record<Rarity, string> = {
  trash: '垃圾',
  common: '普通',
  rare: '稀有',
  legendary: '传说',
  hidden: '隐藏',
  treasure: '宝藏',
  limited: '限定',
  rod_exclusive: '鱼竿专属',
};

export const RARITY_COLOR: Record<Rarity, string> = {
  trash: '#8c8c8c',
  common: '#d6e4ff',
  rare: '#4ec9b0',
  legendary: '#c084fc',
  hidden: '#ffd700',
  treasure: '#ff9f43',
  limited: '#ff7ac8',
  rod_exclusive: '#ff5a36',
};

export const BAITS = {
  worm: {
    name: '蚯蚓',
    price: 10,
    color: '#8b4513',
    desc: '入门鱼饵，能钓到些小鱼小虾',
    fishes: [
      { id: 'sardine', name: '沙丁鱼', rarity: 'common', minW: 0.05, maxW: 0.3, price: 30, icon: '🐟' },
      { id: 'crucian_s', name: '小鲫鱼', rarity: 'common', minW: 0.1, maxW: 0.6, price: 25, icon: '🐟' },
      { id: 'tadpole', name: '蝌蚪', rarity: 'common', minW: 0.01, maxW: 0.05, price: 200, icon: '🐸' },
      { id: 'catfish_s', name: '小鲶鱼', rarity: 'rare', minW: 0.5, maxW: 2, price: 60, icon: '🐡' },
      { id: 'eel_s', name: '小鳗鱼', rarity: 'rare', minW: 0.3, maxW: 1.2, price: 100, icon: '🐍' },
      { id: 'koi', name: '锦鲤', rarity: 'legendary', minW: 2, maxW: 5, price: 400, icon: '🎏' },
      { id: 'old_turtle', name: '千年龟', rarity: 'legendary', minW: 5, maxW: 15, price: 250, icon: '🐢' },
      { id: 'mud_dragon', name: '泥龙', rarity: 'hidden', minW: 10, maxW: 30, price: 800, icon: '🐉' },
    ],
  },
  shrimp: {
    name: '鲜虾',
    price: 50,
    color: '#ff7f7f',
    desc: '海钓鱼饵，能引来肉食鱼',
    fishes: [
      { id: 'mackerel', name: '鲭鱼', rarity: 'common', minW: 0.5, maxW: 1.5, price: 60, icon: '🐟' },
      { id: 'squid_s', name: '小鱿鱼', rarity: 'common', minW: 0.3, maxW: 1, price: 90, icon: '🦑' },
      { id: 'crab', name: '螃蟹', rarity: 'common', minW: 0.2, maxW: 1, price: 120, icon: '🦀' },
      { id: 'tuna_s', name: '小金枪鱼', rarity: 'rare', minW: 2, maxW: 6, price: 200, icon: '🐟' },
      { id: 'octopus', name: '章鱼', rarity: 'rare', minW: 1, maxW: 4, price: 250, icon: '🐙' },
      { id: 'sword', name: '剑鱼', rarity: 'legendary', minW: 10, maxW: 30, price: 600, icon: '🗡️' },
      { id: 'kraken_baby', name: '幼海妖', rarity: 'hidden', minW: 20, maxW: 60, price: 1500, icon: '🦑' },
    ],
  },
  lure: {
    name: '亮片假饵',
    price: 200,
    color: '#c0c0c0',
    desc: '吸引深海大鱼',
    fishes: [
      { id: 'bass', name: '鲈鱼', rarity: 'common', minW: 1, maxW: 4, price: 150, icon: '🐟' },
      { id: 'salmon', name: '三文鱼', rarity: 'common', minW: 2, maxW: 6, price: 200, icon: '🐟' },
      { id: 'shark_s', name: '小鲨鱼', rarity: 'rare', minW: 8, maxW: 25, price: 350, icon: '🦈' },
      { id: 'marlin_s', name: '小马林鱼', rarity: 'rare', minW: 5, maxW: 20, price: 400, icon: '🗡️' },
      { id: 'megalodon_b', name: '幼巨齿鲨', rarity: 'legendary', minW: 30, maxW: 80, price: 800, icon: '🦈' },
      { id: 'leviathan_s', name: '幼海蛇神', rarity: 'hidden', minW: 80, maxW: 300, price: 2000, icon: '🐉' },
    ],
  },
  magic: {
    name: '魔法鱼饵',
    price: 1000,
    color: '#c586c0',
    desc: '神秘鱼饵，能召唤奇异生物',
    fishes: [
      { id: 'coelacanth', name: '腔棘鱼', rarity: 'common', minW: 5, maxW: 20, price: 500, icon: '🐟' },
      { id: 'crystal', name: '水晶鱼', rarity: 'rare', minW: 1, maxW: 5, price: 4000, icon: '💎' },
      { id: 'siren', name: '人鱼', rarity: 'rare', minW: 40, maxW: 80, price: 1500, icon: '🧜' },
      { id: 'phoenix_f', name: '凤凰鱼', rarity: 'legendary', minW: 5, maxW: 20, price: 5000, icon: '🔥' },
      { id: 'kraken', name: '海妖王', rarity: 'legendary', minW: 100, maxW: 500, price: 1500, icon: '🦑' },
      { id: 'leviathan', name: '海蛇神', rarity: 'hidden', minW: 200, maxW: 1000, price: 8000, icon: '🐉' },
    ],
  },
  divine: {
    name: '神仙鱼饵',
    price: 10000,
    currency: 'diamonds',
    color: '#ffd700',
    desc: '仙气缭绕，只会钓到传说与隐藏级鱼',
    fishes: [
      { id: 'koi', name: '锦鲤', rarity: 'legendary', minW: 2, maxW: 5, price: 400, icon: '🎏' },
      { id: 'phoenix_f', name: '凤凰鱼', rarity: 'legendary', minW: 5, maxW: 20, price: 5000, icon: '🔥' },
      { id: 'leviathan', name: '海蛇神', rarity: 'hidden', minW: 200, maxW: 1000, price: 8000, icon: '🐉' },
    ],
  },
} as const;

export type BaitId = keyof typeof BAITS;

export const TRASH_POOL: FishItem[] = [
  { id: 'boot', name: '破靴子', rarity: 'trash', value: 0, icon: '👢' },
  { id: 'bottle', name: '空瓶', rarity: 'trash', value: 0, icon: '🍾' },
  { id: 'can', name: '易拉罐', rarity: 'trash', value: 0, icon: '🥫' },
  { id: 'seaweed', name: '水草', rarity: 'trash', value: 0, icon: '🌿' },
];

export const TREASURE_POOL: FishItem[] = [
  { id: 'coin', name: '金币', rarity: 'treasure', value: 500, icon: '🪙' },
  { id: 'ring', name: '金戒指', rarity: 'treasure', value: 1500, icon: '💍' },
  { id: 'gem', name: '宝石', rarity: 'treasure', value: 3000, icon: '💎' },
  { id: 'chest', name: '宝箱', rarity: 'treasure', value: 10000, icon: '🏆' },
];

export const ROD_SKINS = [
  { id: 'wood', name: '木竿', threshold: 0, rodColor: '#5d4037', rodHighlight: '#8d6e63', lineColor: '#e7f5ff' },
  { id: 'bamboo', name: '竹竿', threshold: 3, rodColor: '#477a32', rodHighlight: '#8bc34a', lineColor: '#d8ffd8' },
  { id: 'iron', name: '铁竿', threshold: 8, rodColor: '#607d8b', rodHighlight: '#b0bec5', lineColor: '#dce8ff' },
  { id: 'gold', name: '黄金竿', threshold: 15, rodColor: '#f9a825', rodHighlight: '#ffe082', lineColor: '#fff2a8' },
  { id: 'star', name: '星辰竿', threshold: 28, rodColor: '#1d2671', rodHighlight: '#ffd700', lineColor: '#ffff96' },
];

const FISH_RARITY_ROLL: Record<'common' | 'rare' | 'legendary' | 'hidden', number> = {
  common: 0.70,
  rare: 0.255,
  legendary: 0.040,
  hidden: 0.005,
};

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getCurrentRodSkin(dex: Record<string, unknown> = {}) {
  const count = Object.keys(dex).length;
  let skin = ROD_SKINS[0];
  for (const candidate of ROD_SKINS) {
    if (count >= candidate.threshold) skin = candidate;
  }
  return skin;
}

export function rollCatch(baitId: BaitId): CatchResult {
  const bait = BAITS[baitId] || BAITS.worm;
  if (baitId !== 'divine') {
    const roll = Math.random();
    if (roll < 0.20) {
      const item = pick(TRASH_POOL);
      return { kind: 'trash', item, rarity: 'trash', weight: 0, value: 0, diamondValue: 0 };
    }
    if (roll < 0.22) {
      const item = pick(TREASURE_POOL);
      return { kind: 'treasure', item, rarity: 'treasure', weight: 0, value: item.value || 0, diamondValue: item.id === 'gem' ? 5 : 0 };
    }
  }

  let rarity: 'common' | 'rare' | 'legendary' | 'hidden' = baitId === 'divine' ? 'legendary' : 'common';
  if (baitId !== 'divine') {
    let marker = Math.random();
    for (const key of ['common', 'rare', 'legendary', 'hidden'] as const) {
      marker -= FISH_RARITY_ROLL[key];
      if (marker <= 0) {
        rarity = key;
        break;
      }
    }
  } else if (Math.random() < 0.22) {
    rarity = 'hidden';
  }

  const pool = bait.fishes.filter((fish) => fish.rarity === rarity);
  const item = pick((pool.length ? pool : bait.fishes) as readonly FishItem[]);
  const weight = +((item.minW || 0) + Math.random() * ((item.maxW || 1) - (item.minW || 0))).toFixed(2);
  const value = item.diamondValue ? 0 : Math.max(1, Math.round(weight * (item.price || 1)));
  return { kind: 'fish', item, rarity: item.rarity, weight, value, diamondValue: item.diamondValue || 0 };
}
