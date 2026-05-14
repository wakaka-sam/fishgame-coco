# Agent Guide

This project is a Cocos Creator 3.8 LTS port plus runnable Web and WeChat Mini Game outputs for the pixel fishing game.

## Project Layout

- `assets/scripts/FishingGame.ts`: Cocos Creator game component and portable gameplay logic.
- `assets/scripts/game-data.ts`: shared bait, fish, rarity, rod, character, pet, accessory, and gacha data.
- `assets/resources/characters/`: character sprite resources used by the Cocos project.
- `src/runtime/game.js`: the single runtime source for both Web and WeChat Mini Game. Make UI and interaction changes here first.
- `build/web-cocos/`: generated Web build that runs the same runtime through `wx-web-shim.js`.
- `build/web-desktop/`: legacy DOM Web version kept for reference against the original project.
- `build/wechatgame/`: generated WeChat Mini Game package. This is the package used by WeChat Developer Tools and `miniprogram-ci`.
- `scripts/generate-wechat-assets.js`: generates missing WeChat PNG icon assets.
- `scripts/build-unified.js`: builds the single-runtime Web and WeChat outputs from `src/runtime/game.js`.
- `scripts/wechat-ci.js`: wraps `miniprogram-ci` for preview/upload. Preview generates `wechat-preview-qrcode.jpg` by default.
- `wechat-ci.config.example.json`: template for local WeChat CI config.
- `wechat-ci.config.json`: local-only config. Do not commit it.
- `private*.key`: local-only WeChat upload private key. Do not commit it.

## Install

```bash
npm install
```

Do not commit `node_modules/`.

## Run Web Version

```bash
npm run build:unified
npm run serve:web
```

Open `http://localhost:4173`.

When changing Web UI behavior, compare against `/Volumes/bigger/testspace/fishing-game` and keep the art style, top tabs, button placement, dialogs, and game interactions consistent with the original project.

## WeChat Mini Game

The WeChat Mini Game source is in:

```bash
build/wechatgame
```

Before preview/upload, create a local config:

```bash
cp wechat-ci.config.example.json wechat-ci.config.json
```

Then set:

- `appid`
- `privateKeyPath`
- optional `version`
- optional `desc`

The private key must be downloaded from the WeChat public platform, and the upload IP allowlist must be configured there.

## Required Workflow After Code Changes

After any code or asset change, the agent must do all of the following before reporting completion:

1. Build the unified Web and WeChat runtime outputs:

```bash
npm run build:unified
```

2. Validate JavaScript syntax for the shared and generated packages:

```bash
node --check src/runtime/game.js
node --check build/web-cocos/wx-web-shim.js
node --check build/wechatgame/game.js
```

3. Regenerate WeChat icon assets if data, fish, bait, rod, pet, accessory, character, shop, gacha, or dex visuals changed:

```bash
node scripts/generate-wechat-assets.js
npm run build:unified
```

4. Rebuild the distributable Web and WeChat archives:

```bash
zip -qr fish-coco-web.zip build/web-cocos web-server.js README.md package.json agent.md
zip -qr fish-coco-wechatgame.zip build/wechatgame package.json scripts wechat-ci.config.example.json README.md agent.md
```

5. Generate a WeChat preview QR code:

```bash
npm run wechat:preview
```

This command must be run after the package is updated. It generates `wechat-preview-qrcode.jpg` by default. After it succeeds, the agent must send the QR code image to the user in the final response, for example:

```markdown
![微信预览二维码](/absolute/path/to/wechat-preview-qrcode.jpg)
```

If preview fails, report the exact error and the likely cause. Common causes include missing `wechat-ci.config.json`, invalid `appid`, missing `privateKeyPath`, IP allowlist problems, or `miniprogram-ci` compiler timeout.

## Upload

To upload a development version:

```bash
npm run wechat:upload
```

Submitting for review and publishing are usually completed in the WeChat public platform console.

## Git Hygiene

Commit source and generated WeChat/Web package files that are needed to run the project. Do not commit:

- `node_modules/`
- `wechat-ci.config.json`
- `private*.key`
- `*.pem`
- `*.zip`
- `wechat-preview-qrcode.*`
- editor caches or local temporary files

Before committing:

```bash
git status --short
```

Check that no local credentials or private keys are staged.
