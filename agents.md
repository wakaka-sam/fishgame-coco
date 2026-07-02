# Skills

## WeChat Mini Game Preview / Upload

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
