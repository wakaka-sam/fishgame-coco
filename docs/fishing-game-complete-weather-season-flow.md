# 钓鱼游戏完整流程图（保留原流程 + 天气预报 + 季节）

这版是完整合并版：保留原有钓鱼主循环和外围系统（商店、图鉴、鱼竿、角色、宠物、首饰、排行、抽奖、VIP 自动、兑换、分享、退出、存档、构建发布），再新增天气系统、天气预报和季节系统。

## 1. 完整总览流程

```mermaid
flowchart TD
  A[游戏启动] --> B[loadUser 读取本地存档]
  B --> C[normalize 补齐旧存档默认字段]
  C --> D[初始化运行时状态]

  D --> E1[原有玩家数据: 金币/钻石/鱼饵/图鉴/历史]
  D --> E2[原有收藏系统: 鱼竿/角色/宠物/首饰]
  D --> E3[新增环境数据: calendar / season / weather / forecast]

  E3 --> F1[advanceCalendarIfNeeded]
  F1 --> F2[生成今日天气与未来预报]
  F2 --> F3[resolveEnvironmentEffects]

  E1 --> G[主界面 render]
  E2 --> G
  F3 --> G

  G --> H{玩家操作}
  H --> H1[抛竿/收线/命中]
  H --> H2[切换鱼饵]
  H --> H3[商店]
  H --> H4[图鉴]
  H --> H5[鱼竿]
  H --> H6[角色]
  H --> H7[宠物]
  H --> H8[首饰]
  H --> H9[排行]
  H --> H10[抽奖]
  H --> H11[VIP自动]
  H --> H12[兑换]
  H --> H13[分享]
  H --> H14[天气预报]
  H --> H15[退出/重置]

  H1 --> I[主玩法状态机]
  H2 --> G
  H3 --> J[购买鱼饵并保存]
  H4 --> K[查看图鉴与限定标签]
  H5 --> L[查看/装备鱼竿]
  H6 --> M[查看/装备角色]
  H7 --> N[查看/装备宠物]
  H8 --> O[查看/装备首饰]
  H9 --> P[查看排行与统计]
  H10 --> Q[抽奖获得鱼竿/宠物/首饰/货币]
  H11 --> R[自动推进抛竿/收线/命中]
  H12 --> S[兑换奖励]
  H13 --> T[复制分享口令并发放每日奖励]
  H14 --> U[查看今日与未来 3 到 7 天天气]
  H15 --> V[重置为默认玩家]

  J --> W[saveUser]
  K --> G
  L --> W
  M --> W
  N --> W
  O --> W
  P --> G
  Q --> W
  R --> I
  S --> W
  T --> W
  U --> G
  V --> W
  I --> W
  W --> G
```

## 2. 主玩法状态机（已接入天气和季节）

```mermaid
flowchart TD
  A[玩家点击主按钮] --> B{当前 phase}
  B -- idle --> C{当前鱼饵是否足够}
  B -- hooked --> L[startHitbar]
  B -- reeling --> P[hitbarClick]
  B -- waiting --> B1[等待上钩]

  C -- 否 --> C1[提示鱼饵不足，引导商店]
  C -- 是 --> D[读取 env: 季节 + 天气 + 首饰 + 宠物]
  D --> E[cast]
  E --> F[扣除鱼饵]
  F --> G[等待时间 = 基础等待 * env.biteWaitMultiplier]
  G --> H[进入 waiting]
  H --> I{等待结束}
  I -- 否 --> H
  I -- 是 --> J[进入 hooked，bite 反应窗口]
  J --> K{玩家及时响应}
  K -- 否 --> K1[鱼逃脱，回到 idle]
  K -- 是 --> L

  L --> M[rollCatch]
  M --> M1[基础鱼池: BAITS / TRASH / TREASURE]
  M1 --> M2[应用季节鱼池: seasonTags]
  M2 --> M3[应用天气鱼池: weatherTags]
  M3 --> M4[应用稀有度/垃圾/宝藏概率修正]
  M4 --> N[生成目标]

  N --> O[startHitbar 参数]
  O --> O1[need = HITS_BY_RARITY]
  O1 --> O2[speed *= env.hitbarSpeedMultiplier]
  O2 --> O3[width *= env.hitbarZoneMultiplier]
  O3 --> P

  P --> Q{是否命中红区}
  Q -- 否 --> Q1[连击清零，随机新区间]
  Q1 --> P
  Q -- 是 --> R[hits + 1]
  R --> S{hits >= need}
  S -- 否 --> P
  S -- 是 --> T[applyCatch]
  T --> U[结算金币/钻石/宠物奖励/天气季节加成]
  U --> V[更新图鉴、历史、统计]
  V --> W[显示结果弹窗: 鱼种 + 稀有度 + 天气/季节加成]
  W --> X[saveUser，回到 idle]
```

## 3. 原有外围系统流程（全部保留）

```mermaid
flowchart TD
  A[顶部功能区 TOP_BUTTONS] --> B[商店 shop]
  A --> C[图鉴 dex]
  A --> D[鱼竿 rod]
  A --> E[角色 character]
  A --> F[首饰 accessory]
  A --> G[宠物 pet]
  A --> H[排行 rank]
  A --> I[抽奖 gacha]
  A --> J[VIP自动 vip]
  A --> K[兑换 redeem]
  A --> L[分享 share]
  A --> M[退出 logout]
  A --> N[新增: 天气预报 forecast]

  B --> B1[选择鱼饵]
  B1 --> B2[买1或买N]
  B2 --> B3{金币/钻石是否足够}
  B3 -- 否 --> B4[提示货币不足]
  B3 -- 是 --> B5[扣货币、加鱼饵、保存]

  C --> C1[按鱼饵分类查看鱼池]
  C1 --> C2[显示已解锁/未解锁]
  C2 --> C3[显示数量、最大重量、稀有度]
  C3 --> C4[新增显示: 季节限定/天气限定标签]

  D --> D1[普通鱼竿按图鉴数量解锁]
  D --> D2[抽奖限定鱼竿按 ownedRods 解锁]
  D1 --> D3[装备 rodSkin]
  D2 --> D3

  E --> E1[查看 ownedCharacters 与碎片]
  E1 --> E2[装备 activeCharacter]

  F --> F1[查看 accessories]
  F1 --> F2[装备 equippedAccessory]
  F2 --> F3[accessoryEffects 影响稀有度或命中条]

  G --> G1[查看 ownedPets]
  G1 --> G2[装备或卸下 activePet]
  G2 --> G3[petBonus 影响结算金币/钻石]

  H --> H1[按累计钓获/重量展示排行]

  I --> I1[金币抽奖/钻石抽奖]
  I1 --> I2[选择奖池期数]
  I2 --> I3[单抽/十连]
  I3 --> I4[获得鱼竿、宠物、首饰、金币、钻石]

  J --> J1[切换 vipAuto]
  J1 --> J2[update 中自动抛竿/收线/命中]

  K --> K1[点击兑换码]
  K1 --> K2{是否已使用}
  K2 -- 是 --> K3[提示已使用]
  K2 -- 否 --> K4[发放奖励并保存 usedKey]

  L --> L1[复制分享口令]
  L1 --> L2[每日首次分享奖励金币]

  M --> M1[freshUser 重置]
  M1 --> M2[saveUser]

  N --> N1[显示今日天气]
  N1 --> N2[显示未来 3 到 7 天预报]
  N2 --> N3[显示推荐鱼饵、目标鱼和天气影响]
```

## 4. 天气、预报与季节新增流程

```mermaid
flowchart TD
  A[新增环境系统] --> B[季节系统]
  A --> C[天气系统]
  A --> D[天气预报系统]
  A --> E[环境效果计算器]

  B --> B1[SEASONS: 春/夏/秋/冬]
  B1 --> B2[getCurrentSeason]
  B2 --> B3[影响季节鱼、场景、活动、奖励]

  C --> C1[WEATHERS: 晴/阴/雨/暴雨/雾/雷暴/雪]
  C1 --> C2[今日天气]
  C2 --> C3[影响等待时间、稀有度、命中条、鱼池]

  D --> D1[generateForecast]
  D1 --> D2[未来 3 到 7 天]
  D2 --> D3[预报稳定，不因刷新反复随机]
  D3 --> D4[跨游戏日 shift 并补齐]

  E --> E1[resolveEnvironmentEffects]
  E1 --> E2[合并季节效果]
  E1 --> E3[合并天气效果]
  E1 --> E4[合并首饰效果]
  E1 --> E5[合并宠物或活动加成]
  E2 --> F[输出 env]
  E3 --> F
  E4 --> F
  E5 --> F

  F --> G[cast]
  F --> H[rollCatch]
  F --> I[startHitbar]
  F --> J[applyCatch]
  F --> K[drawScene]
  F --> L[drawTopbar / drawWeatherModal / drawDexModal]
```

## 5. 数据与代码影响面

```mermaid
flowchart LR
  A[src/runtime/game.js] --> B[原有数据表]
  A --> C[新增环境数据表]
  A --> D[原有函数改造]
  A --> E[新增函数]
  A --> F[UI 改造]
  A --> G[存档兼容]
  A --> H[构建输出]

  B --> B1[BAITS / TRASH / TREASURE]
  B --> B2[RODS / GACHA_RODS]
  B --> B3[CHARACTERS / PETS / ACCESSORIES]
  B --> B4[HITS_BY_RARITY / RARITY_NAME / RARITY_COLOR]

  C --> C1[SEASONS]
  C --> C2[WEATHERS]
  C --> C3[SEASON_EFFECTS]
  C --> C4[WEATHER_EFFECTS]
  C --> C5[鱼类 seasonTags / weatherTags]

  D --> D1[cast]
  D --> D2[rollCatch]
  D --> D3[startHitbar]
  D --> D4[hitbarClick]
  D --> D5[applyCatch]
  D --> D6[update / vipAuto]

  E --> E1[createCalendar]
  E --> E2[advanceCalendarIfNeeded]
  E --> E3[getCurrentSeason]
  E --> E4[generateForecast]
  E --> E5[resolveEnvironmentEffects]

  F --> F1[drawTopbar 增加天气摘要]
  F --> F2[drawScene 增加季节/天气视觉]
  F --> F3[drawWeatherModal 新增预报弹窗]
  F --> F4[drawDexModal 增加限定标签]
  F --> F5[drawResultModal 增加加成说明]

  G --> G1[loadUser]
  G --> G2[normalize 补 calendar 默认字段]
  G --> G3[saveUser]
  G --> G4[SAVE_KEY 兼容或版本迁移]

  H --> H1[npm run build:unified]
  H --> H2[build/web-cocos]
  H --> H3[build/wechatgame]
  H --> H4[Web / 微信小游戏验证]
```

## 6. 推荐推进顺序

```mermaid
flowchart TD
  A[第 1 阶段: 保持原主循环稳定] --> B[确认抛竿/上钩/收线/结算/VIP 自动不回归]
  B --> C[第 2 阶段: 新增环境数据模型]
  C --> D[SEASONS / WEATHERS / EFFECTS / calendar / forecast]
  D --> E[第 3 阶段: 接入玩法公式]
  E --> F[等待时间、鱼池、稀有度、命中条、奖励]
  F --> G[第 4 阶段: 补 UI 与可读反馈]
  G --> H[顶部天气、预报弹窗、图鉴限定、结果加成]
  H --> I[第 5 阶段: 保留并回归外围系统]
  I --> J[商店、图鉴、鱼竿、角色、宠物、首饰、排行、抽奖、兑换、分享]
  J --> K[第 6 阶段: 存档与平台验证]
  K --> L[旧存档兼容、小屏适配、Web/微信构建]
```

## 7. 完整验收清单

- 原有主玩法保留：抛竿、等待、上钩、收线、命中、失败、结算都能走通。
- 原有外围系统保留：商店、图鉴、鱼竿、角色、宠物、首饰、排行、抽奖、VIP 自动、兑换、分享、退出都能使用。
- 新增天气系统：晴、阴、雨、暴雨、雾、雷暴、雪都有明确效果和视觉反馈。
- 新增季节系统：春、夏、秋、冬能稳定推进，并影响鱼池、图鉴目标和场景表现。
- 新增天气预报：今日天气和未来预报稳定，不会每次刷新都变。
- 环境效果接入：`cast`、`rollCatch`、`startHitbar`、`applyCatch`、`drawScene`、`drawTopbar` 都能拿到一致的 `env`。
- 存档兼容：旧存档通过 `normalize` 补齐 `calendar`、`season`、`weather`、`forecast` 默认值。
- 数值验证：多天气、多季节抽样后，收益、难度、稀有鱼出现率不失控。
- 小屏验证：顶部按钮、预报弹窗、命中按钮、结果弹窗不遮挡。
- 构建验证：`npm run build:unified` 能成功生成 Web 与微信小游戏输出。
