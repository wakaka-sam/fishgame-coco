#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const outDir = path.resolve(__dirname, '../build/wechatgame/assets/icons');
fs.mkdirSync(outDir, { recursive: true });

const palette = {
  common: ['#58b8ff', '#2a75b7', '#e9f7ff'],
  rare: ['#4ec9b0', '#0f766e', '#d6fff8'],
  legendary: ['#c586c0', '#6d3480', '#fff0ff'],
  hidden: ['#ffd700', '#9f6500', '#fff4b8'],
  treasure: ['#ff8c42', '#8a4a12', '#fff1b8'],
  trash: ['#6b7280', '#334155', '#cbd5e1'],
  limited: ['#ff7ac8', '#9d2d71', '#fff0f8'],
};

const fishIds = [
  'sardine','crucian_s','tadpole','catfish_s','eel_s','koi','old_turtle','mud_dragon',
  'mackerel','squid_s','crab','tuna_s','octopus','sword','kraken_baby',
  'bass','salmon','shark_s','marlin_s','megalodon_b','leviathan_s',
  'coelacanth','crystal','siren','phoenix_f','kraken','leviathan',
  'boot','bottle','can','seaweed','coin','ring','gem','chest',
  'candy_horse','maple_fish','fire_beast','jade_turtle',
];
const fishRarity = {
  boot: 'trash', bottle: 'trash', can: 'trash', seaweed: 'trash',
  coin: 'treasure', ring: 'treasure', gem: 'treasure', chest: 'treasure',
  koi: 'legendary', old_turtle: 'legendary', sword: 'legendary', megalodon_b: 'legendary',
  phoenix_f: 'legendary', kraken: 'legendary', mud_dragon: 'hidden', kraken_baby: 'hidden',
  leviathan_s: 'hidden', leviathan: 'hidden', candy_horse: 'limited', maple_fish: 'limited',
  fire_beast: 'limited', jade_turtle: 'limited',
};
const baits = {
  bait_worm: ['#8b4513', '#4a2510', '#f2c199'],
  bait_shrimp: ['#ff7f7f', '#b13a3a', '#ffe0d8'],
  bait_lure: ['#c0c0c0', '#5f6f7a', '#ffffff'],
  bait_magic: ['#c586c0', '#64246f', '#ffe5ff'],
  bait_divine: ['#ffd700', '#9f6500', '#fff4b8'],
};
const accessories = {
  accessory_scale_charm: ['#66e6ff', '#0f7490', '#ffffff'],
  accessory_tide_bracelet: ['#4ec9b0', '#0f766e', '#d6fff8'],
  accessory_star_brooch: ['#ffd700', '#7c4a00', '#fff4b8'],
};
const pets = {
  pet_cat: ['#f4a460', '#8b4513', '#ffecd2'],
  pet_dog: ['#c68642', '#6b3a16', '#ffe0b2'],
  pet_parrot: ['#2ecc71', '#e74c3c', '#f1c40f'],
  pet_penguin: ['#2c3e50', '#0f172a', '#ecf0f1'],
  pet_rabbit: ['#ffffff', '#ffb6c1', '#ffe4e1'],
  pet_fox: ['#e67e22', '#8b2f0b', '#ffffff'],
  pet_dragon: ['#27ae60', '#e74c3c', '#f1c40f'],
  pet_unicorn: ['#ffffff', '#af7ac5', '#ffd700'],
};
const rods = {
  rod_wood: ['#5d4037', '#8d6e63', '#e7f5ff'],
  rod_bamboo: ['#6d9b3a', '#8bc34a', '#e7f5ff'],
  rod_iron: ['#607d8b', '#90a4ae', '#e7f5ff'],
  rod_gold: ['#f9a825', '#ffd54f', '#fff4b8'],
  rod_star: ['#1a237e', '#ffd700', '#e7f5ff'],
  rod_panda: ['#202020', '#ffffff', '#e7f5ff'],
  rod_nightmyst: ['#0a0a2e', '#8b5cf6', '#e7f5ff'],
  rod_firekirin: ['#8f1d0b', '#ff6b00', '#e7f5ff'],
  rod_greenxuanwu: ['#14532d', '#86efac', '#e7f5ff'],
  rod_headphone: ['#1a1a2e', '#00d4ff', '#e7f5ff'],
  rod_candy: ['#ff69b4', '#fff0f5', '#e7f5ff'],
};
const ui = {
  ui_shop: ['#ffd700', '#8a4a12', '#fff4b8'],
  ui_gacha: ['#c586c0', '#64246f', '#fff0ff'],
  ui_dex: ['#58b8ff', '#1f4e80', '#e9f7ff'],
  ui_rank: ['#ffd700', '#7c4a00', '#fff4b8'],
  ui_redeem: ['#4ec9b0', '#0f766e', '#d6fff8'],
  ui_share: ['#66e6ff', '#0f7490', '#ffffff'],
};
const characters = {
  character_fishing_master: ['#2563eb', '#facc15', '#fdbcb4'],
};

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function png(size = 64) {
  return new PNG({ width: size, height: size });
}

function set(p, x, y, color, alpha = 255) {
  if (x < 0 || y < 0 || x >= p.width || y >= p.height) return;
  const [r, g, b] = hexToRgb(color);
  const i = (Math.floor(y) * p.width + Math.floor(x)) * 4;
  p.data[i] = r; p.data[i + 1] = g; p.data[i + 2] = b; p.data[i + 3] = alpha;
}

function rect(p, x, y, w, h, color, alpha = 255) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(p, xx, yy, color, alpha);
}

function border(p, x, y, w, h, color) {
  rect(p, x, y, w, 2, color); rect(p, x, y + h - 2, w, 2, color);
  rect(p, x, y, 2, h, color); rect(p, x + w - 2, y, 2, h, color);
}

function save(name, p) {
  fs.writeFileSync(path.join(outDir, name + '.png'), PNG.sync.write(p));
}

function fishIcon(name, colors) {
  const p = png(64);
  const [body, dark, light] = colors;
  rect(p, 8, 27, 12, 4, dark);
  rect(p, 10, 23, 10, 4, dark);
  rect(p, 10, 31, 10, 4, dark);
  rect(p, 20, 20, 30, 24, body);
  rect(p, 48, 25, 8, 14, body);
  rect(p, 26, 36, 16, 4, light, 210);
  rect(p, 34, 15, 10, 6, dark);
  rect(p, 34, 43, 10, 6, dark);
  rect(p, 45, 27, 4, 4, '#0b0b0b');
  border(p, 20, 20, 30, 24, dark);
  save(name, p);
}

function baitIcon(name, colors) {
  const p = png(64);
  const [body, dark, light] = colors;
  rect(p, 18, 18, 28, 28, body);
  border(p, 18, 18, 28, 28, dark);
  rect(p, 24, 12, 16, 8, light);
  rect(p, 24, 44, 16, 8, dark);
  rect(p, 29, 24, 6, 16, light, 190);
  save(name, p);
}

function accessoryIcon(name, colors) {
  const p = png(64);
  const [body, dark, light] = colors;
  rect(p, 24, 12, 16, 8, light);
  rect(p, 18, 20, 28, 30, body);
  border(p, 18, 20, 28, 30, dark);
  rect(p, 26, 28, 12, 12, light, 220);
  rect(p, 30, 24, 4, 20, '#ffffff', 170);
  save(name, p);
}

function petIcon(name, colors) {
  const p = png(64);
  const [body, dark, light] = colors;
  rect(p, 20, 12, 24, 22, body);
  rect(p, 16, 20, 6, 8, dark);
  rect(p, 42, 20, 6, 8, dark);
  rect(p, 22, 34, 20, 18, body);
  rect(p, 27, 38, 10, 10, light);
  rect(p, 26, 21, 4, 4, '#111111');
  rect(p, 36, 21, 4, 4, '#111111');
  rect(p, 30, 28, 6, 3, dark);
  rect(p, 22, 52, 6, 6, dark);
  rect(p, 36, 52, 6, 6, dark);
  save(name, p);
}

function rodIcon(name, colors) {
  const p = png(64);
  const [body, hi, line] = colors;
  for (let i = 0; i < 42; i++) {
    rect(p, 48 - i, 48 - Math.floor(i * .75), 5, 5, body);
    rect(p, 49 - i, 48 - Math.floor(i * .75), 2, 2, hi);
  }
  rect(p, 8, 14, 2, 32, line, 210);
  rect(p, 6, 44, 6, 6, hi);
  save(name, p);
}

function uiIcon(name, colors) {
  const p = png(64);
  const [body, dark, light] = colors;
  rect(p, 14, 16, 36, 34, body);
  border(p, 14, 16, 36, 34, dark);
  rect(p, 20, 10, 24, 10, light);
  rect(p, 22, 24, 20, 4, light, 210);
  rect(p, 22, 34, 20, 4, dark, 230);
  save(name, p);
}

fishIds.forEach((id) => fishIcon('fish_' + id, palette[fishRarity[id] || (id.includes('_s') ? 'common' : 'rare')]));
Object.entries(baits).forEach(([name, colors]) => baitIcon(name, colors));
Object.entries(accessories).forEach(([name, colors]) => accessoryIcon(name, colors));
Object.entries(pets).forEach(([name, colors]) => petIcon(name, colors));
Object.entries(rods).forEach(([name, colors]) => rodIcon(name, colors));
Object.entries(ui).forEach(([name, colors]) => uiIcon(name, colors));
Object.entries(characters).forEach(([name, colors]) => petIcon(name, colors));

console.log(`Generated ${fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).length} PNG assets in ${outDir}`);
