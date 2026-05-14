# Fish Coco

这是从 `/Volumes/bigger/testspace/fishing-game` 转换出的 Cocos Creator 3.8 LTS 工程骨架和可运行 Web 包。

## 目录

- `assets/scripts/FishingGame.ts`: Cocos Creator 3.8 主组件，包含钓鱼状态机、命中条、经济与图鉴逻辑。
- `assets/scripts/game-data.ts`: 从原项目抽出的鱼饵、鱼、稀有度、鱼竿与抽取逻辑。
- `assets/resources/characters`: 原项目角色贴图资源。
- `build/web-desktop`: 已输出的静态 Web 版本，可直接部署或本地访问。该版本直接复用原项目的 `index.html`、`style.css`、`data.js`、`game.js` 和图片资源，以保持原始美术风格、顶部 tab、按钮位置、弹窗和命中条交互一致；`local-api-shim.js` 负责把原服务端 API 转为浏览器本地存档。

## 运行 Web 版本

```bash
npm run serve:web
```

然后打开 `http://localhost:4173`。

## 微信小游戏上传

不一定要走微信开发者工具 GUI。可以使用微信官方 `miniprogram-ci` 命令行上传：

1. 在微信公众平台下载“代码上传密钥”，并按平台要求配置上传 IP 白名单。
2. 复制 `wechat-ci.config.example.json` 为 `wechat-ci.config.json`。
3. 填入自己的 `appid` 和密钥文件路径 `privateKeyPath`。
4. 安装依赖并上传：

```bash
npm install --save-dev miniprogram-ci
npm run wechat:preview
npm run wechat:upload
```

`preview` 会生成预览二维码，`upload` 会上传开发版本。提审和发布通常仍需要在微信公众平台后台完成。

## 在 Cocos Creator 中继续编辑

用 Cocos Creator 3.8 LTS 打开本目录。当前工程提供了可移植的 TypeScript 逻辑与资源，若本机安装了 Creator，可新建空场景并把 `FishingGame` 组件挂到根节点，或按现有组件继续补充原生 Cocos UI。
