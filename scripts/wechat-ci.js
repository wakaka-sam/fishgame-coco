#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const action = process.argv[2] || 'preview';
const configPath = path.resolve(root, process.argv[3] || 'wechat-ci.config.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!['preview', 'upload'].includes(action)) {
  fail('Usage: node scripts/wechat-ci.js <preview|upload> [configPath]');
}

if (!fs.existsSync(configPath)) {
  fail(`Missing config: ${configPath}\nCopy wechat-ci.config.example.json to wechat-ci.config.json and fill appid/privateKeyPath.`);
}

let ci;
try {
  ci = require('miniprogram-ci');
} catch (_) {
  fail('Missing dependency: miniprogram-ci\nRun: npm install --save-dev miniprogram-ci');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const projectPath = path.resolve(root, config.projectPath || 'build/wechatgame');
const privateKeyPath = path.resolve(root, config.privateKeyPath || '');
const qrcodeOutputDest = path.resolve(root, config.qrcodeOutputDest || 'wechat-preview-qrcode.jpg');

if (!config.appid || config.appid === 'wx_your_game_appid') fail('Please set appid in wechat-ci.config.json');
if (!fs.existsSync(projectPath)) fail(`Missing projectPath: ${projectPath}`);
if (!fs.existsSync(privateKeyPath)) fail(`Missing privateKeyPath: ${privateKeyPath}`);

const project = new ci.Project({
  appid: config.appid,
  type: config.type || 'miniGame',
  projectPath,
  privateKeyPath,
  ignores: config.ignores || ['node_modules/**/*', '.git/**/*'],
});

const setting = {
  es6: true,
  minify: true,
  urlCheck: false,
  ...config.setting,
};

async function main() {
  if (action === 'preview') {
    const result = await ci.preview({
      project,
      desc: config.desc || 'preview',
      setting,
      qrcodeFormat: config.qrcodeFormat || 'image',
      qrcodeOutputDest,
      onProgressUpdate: console.log,
    });
    console.log(result);
    console.log(`Preview QR code: ${qrcodeOutputDest}`);
    return;
  }

  const result = await ci.upload({
    project,
    version: config.version || require('../package.json').version,
    desc: config.desc || 'upload',
    setting,
    onProgressUpdate: console.log,
  });
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
