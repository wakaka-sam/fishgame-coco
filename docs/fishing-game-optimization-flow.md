# 钓鱼游戏优化推进流程图

本文档基于当前 `fishgame-coco` 项目结构整理。当前 Web / 微信小游戏共用运行时集中在 `src/runtime/game.js`，Cocos 版本逻辑参考 `assets/scripts/FishingGame.ts` 与 `assets/scripts/game-data.ts`。

## 1. 总览流程

```mermaid
flowchart TD
  A[开始优化钓鱼游戏] --> B[读取当前项目结构]
  B --> C[确认改动入口]
  C --> D{优化类型}

  D --> D1[主玩法手感]
  D --> D2[经济与数值]
  D --> D3[内容扩展]
  D --> D4[UI 与触控体验]
  D --> D5[平台适配与发布]
  D --> D6[存档与兼容]

  D1 --> E1[梳理状态机: idle / waiting / hooked / reeling]
  E1 --> F1[调整等待时间、反应窗口、命中条速度、命中次数]
  F1 --> G1[验证抛竿、上钩、收线、逃脱、结算反馈]

  D2 --> E2[梳理鱼饵价格、掉落概率、稀有度、奖励公式]
  E2 --> F2[调整 BAITS / HITS_BY_RARITY / weightedRarity / petBonus]
  F2 --> G2[跑抽样或人工多轮测试，确认收益曲线]

  D3 --> E3[新增鱼类、鱼饵、鱼竿、角色、宠物、首饰或奖池]
  E3 --> F3[补数据、图标资源、图鉴展示、抽奖/装备入口]
  F3 --> G3[确认解锁、装备、收藏、重复获得的处理]

  D4 --> E4[梳理 topbar / scene / gamebar / hitbar / modal]
  E4 --> F4[优化布局、按钮大小、文案、动效、触控目标]
  F4 --> G4[覆盖小屏、安全区、横竖屏、误触与遮挡]

  D5 --> E5[修改共用源: src/runtime/game.js]
  E5 --> F5[执行 npm run build:unified]
  F5 --> G5[Web 冒烟测试与微信小游戏预览]

  D6 --> E6[检查 loadUser / normalize / saveUser / SAVE_KEY]
  E6 --> F6[设计兼容默认值与旧存档迁移]
  F6 --> G6[验证老用户数据不丢失]

  G1 --> H[统一验收清单]
  G2 --> H
  G3 --> H
  G4 --> H
  G5 --> H
  G6 --> H

  H --> I{验收通过?}
  I -- 否 --> J[记录问题: 玩法 / 数值 / UI / 平台 / 存档]
  J --> D
  I -- 是 --> K[更新版本说明]
  K --> L[提交或发布]
```

## 2. 主玩法状态机

```mermaid
flowchart TD
  A[主界面 render] --> B{玩家操作}
  B --> C[切换鱼饵 changeBait]
  B --> D[打开系统弹窗 modal]
  B --> E[点击抛竿 mobile-action]
  B --> V[VIP 自动流程]

  C --> A
  D --> M{弹窗类型}
  M --> M1[商店 shop]
  M --> M2[图鉴 dex]
  M --> M3[鱼竿 rod]
  M --> M4[角色 character]
  M --> M5[宠物 pet]
  M --> M6[首饰 accessory]
  M --> M7[抽奖 gacha]
  M --> M8[兑换/分享/排行]
  M1 --> A
  M2 --> A
  M3 --> A
  M4 --> A
  M5 --> A
  M6 --> A
  M7 --> A
  M8 --> A

  E --> F{state.phase == idle?}
  F -- 否 --> A
  F -- 是 --> G{当前鱼饵数量 > 0?}
  G -- 否 --> G1[提示鱼饵不足，引导商店]
  G1 --> A
  G -- 是 --> H[扣除鱼饵，进入 waiting]
  H --> I[随机等待 1.5 到 5 秒]
  I --> J[进入 hooked，bite = 3 秒]
  J --> K{3 秒内响应?}
  K -- 否 --> K1[鱼跑了，回到 idle]
  K1 --> A
  K -- 是 --> L[startHitbar]
  L --> N[rollCatch 生成目标]
  N --> O[按稀有度设置 need / width / speed / time]
  O --> P[进入 reeling，显示命中条]
  P --> Q{点击命中区?}
  Q -- 否 --> Q1[连击清零，随机新区间]
  Q1 --> P
  Q -- 是 --> R[命中次数 +1]
  R --> S{hits >= need?}
  S -- 否 --> P
  S -- 是 --> T[applyCatch 结算]
  T --> U[更新金币/钻石/图鉴/历史/统计]
  U --> W[显示钓获结果弹窗]
  W --> X[saveUser 保存]
  X --> A

  V --> V1{vipAuto 开启且无弹窗?}
  V1 -- 否 --> A
  V1 -- 是 --> V2[每 0.55 秒自动推进]
  V2 --> V3[idle 自动抛竿]
  V2 --> V4[hooked 自动收线]
  V2 --> V5[reeling 自动命中中心]
  V3 --> A
  V4 --> A
  V5 --> A
```

## 3. 系统影响面

```mermaid
flowchart LR
  A[src/runtime/game.js] --> B[数据表]
  A --> C[状态机]
  A --> D[渲染层]
  A --> E[交互层]
  A --> F[存档层]
  A --> G[构建输出]

  B --> B1[BAITS / TRASH / TREASURE]
  B --> B2[RODS / GACHA_RODS]
  B --> B3[CHARACTERS / PETS / ACCESSORIES]
  B --> B4[RARITY / HITS_BY_RARITY]

  C --> C1[cast]
  C --> C2[startHitbar]
  C --> C3[hitbarClick]
  C --> C4[applyCatch]
  C --> C5[update / vipAuto]

  D --> D1[drawTopbar]
  D --> D2[drawScene]
  D --> D3[drawGamebar]
  D --> D4[drawHitbar]
  D --> D5[drawModal 系列]

  E --> E1[targets 注册]
  E --> E2[handleTap]
  E --> E3[handleAction]
  E --> E4[wx.showModal / setClipboardData]

  F --> F1[loadUser]
  F --> F2[normalize]
  F --> F3[saveUser]
  F --> F4[兑换码 usedKey]

  G --> G1[npm run build:unified]
  G --> G2[build/web-cocos]
  G --> G3[build/wechatgame]
  G --> G4[Web / 微信冒烟测试]
```

## 4. 推荐推进顺序

```mermaid
flowchart TD
  A[第 1 阶段: 稳定主循环] --> B[修正触控、命中条、状态切换、鱼饵不足引导]
  B --> C[第 2 阶段: 数值闭环]
  C --> D[调整鱼饵价格、掉落概率、奖励、宠物/首饰加成]
  D --> E[第 3 阶段: 图鉴与成长]
  E --> F[优化鱼竿解锁、图鉴展示、稀有鱼目标感]
  F --> G[第 4 阶段: 抽奖与长期留存]
  G --> H[明确奖池、保底/重复转化、稀有资产展示]
  H --> I[第 5 阶段: UI 与平台适配]
  I --> J[小屏、安全区、按钮密度、弹窗滚动、资源加载兜底]
  J --> K[第 6 阶段: 发布验证]
  K --> L[构建、Web 冒烟、微信预览、版本记录]
```

## 5. 每次优化的验收清单

- `npm run build:unified` 能成功生成 Web 与微信小游戏输出。
- 抛竿、上钩、收线、失败、成功结算都能走通。
- 鱼饵不足、金币不足、钻石不足都有明确反馈。
- 图鉴、鱼竿、角色、宠物、首饰、抽奖、兑换、分享入口不互相遮挡。
- 旧存档经过 `normalize` 后能继续使用，新字段有默认值。
- 小屏宽度下顶部按钮、鱼饵选择、命中按钮、弹窗内容不溢出。
- Web 版本与微信小游戏版本都基于同一个 `src/runtime/game.js` 源同步生成。
