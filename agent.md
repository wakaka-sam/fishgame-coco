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

## Deployment Topology

- Frontend service: deploy to `fish.wakaka007.cn` on the current server.
- Backend service: deploy to `fishapi.wakaka007.cn` on the `gz` server.
- Backend API rule: backend services must use `POST` methods only. Do not add or rely on `GET` methods for backend endpoints.
- Current backend implementation: `backend/fishapi_server.py`, deployed as a Python stdlib service behind Caddy on `gz`.
- Current backend data file: `/var/lib/fish-coco-api/store.json` on `gz`.
- Browser-facing frontend calls use same-origin `/api/...` on `fish.wakaka007.cn`; the frontend Caddy proxies those requests to the `gz` backend. This avoids browser mixed-content/CORS issues while keeping the backend deployed on `fishapi.wakaka007.cn`.
- Current backend POST endpoints:
  - `/api/ping`
  - `/api/login`
  - `/api/save`
  - `/api/leaderboard`
  - `/api/rank-history`
  - `/api/redeem`
  - `/api/gacha`

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

## Skill: WeChat Mini Game Preview / Upload

Use this skill when the user asks to preview, upload, or generate a QR code for the WeChat Mini Game.

This skill runs on the `sg` server. Treat `/root/wx_env/` as a local path on the current machine, not as a remote target.

Credential source of truth on this server:

```bash
/root/wx_env/
```

Expected files:

```bash
/root/wx_env/private.key
/root/wx_env/wechat.env
/root/wx_env/wechat-ci.config.json
/root/wx_env/README.md
```

Security rules:

- Never print or paste the private key.
- Never copy `/root/wx_env/private.key` into the repo.
- Never commit `wechat-ci.config.json`, `private*.key`, QR code images, or generated zip files.
- Keep `/root/wx_env` mode `700` and key/config files mode `600`.

Preview workflow:

```bash
# Run from the fish-coco project root on sg.
npm ci
npm run build:unified
node --check build/wechatgame/game.js
node scripts/wechat-ci.js preview /root/wx_env/wechat-ci.config.json
```

After preview succeeds, report the generated QR code path. By default it is:

```bash
./wechat-preview-qrcode.jpg
```

If `/root/wx_env/wechat-ci.config.json` sets `qrcodeOutputDest`, use that path instead.

Upload workflow:

```bash
# Run from the fish-coco project root on sg.
npm ci
npm run build:unified
node --check build/wechatgame/game.js
node scripts/wechat-ci.js upload /root/wx_env/wechat-ci.config.json
```

If preview/upload fails, report the exact `miniprogram-ci` error and check these first:

- `/root/wx_env/wechat-ci.config.json` has the correct `appid`, `type`, `projectPath`, and `privateKeyPath`.
- The `sg` public IP is present in the WeChat code upload IP allowlist.
- The private key matches the configured AppID.
- The package path `build/wechatgame` exists and `build/wechatgame/game.js` passes `node --check`.

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
