# 钓鱼游戏天气、天气预报与季节系统流程图

本文档是在现有 `fishgame-coco` 优化流程图基础上补充的新版本。目标是把“天气系统、天气预报、季节循环”接入当前钓鱼主循环，并明确它们对鱼池、掉率、等待时间、命中条、场景表现、UI 展示和存档兼容的影响。

## 1. 总览流程

```mermaid
flowchart TD
  A[开始: 优化钓鱼游戏] --> B[读取当前项目结构]
  B --> C[统一改动入口: src/runtime/game.js]
  C --> D[新增日历与环境系统]

  D --> E1[季节系统]
  D --> E2[天气系统]
  D --> E3[天气预报系统]
  D --> E4[环境效果计算器]

  E1 --> F1[定义季节: 春 / 夏 / 秋 / 冬]
  F1 --> G1[按游戏日或真实日期推进季节]
  G1 --> H1[影响季节鱼池、图鉴、场景色调、活动内容]

  E2 --> F2[定义天气: 晴 / 阴 / 雨 / 暴雨 / 雾 / 雷暴 / 雪]
  F2 --> G2[生成今日天气]
  G2 --> H2[影响咬钩等待、稀有度、命中条、鱼类出现]

  E3 --> F3[生成未来 3 到 7 天预报]
  F3 --> G3[展示在顶部入口或天气弹窗]
  G3 --> H3[帮助玩家提前准备鱼饵和目标鱼]

  E4 --> F4[resolveEnvironmentEffects]
  F4 --> G4[合并季节效果 + 天气效果 + 首饰/宠物效果]
  G4 --> H4[提供给 cast / rollCatch / startHitbar / drawScene]

  H1 --> I[接入钓鱼主循环]
  H2 --> I
  H3 --> I
  H4 --> I

  I --> J{玩家行为}
  J --> J1[查看天气预报]
  J --> J2[选择鱼饵]
  J --> J3[抛竿钓鱼]
  J --> J4[打开图鉴/商店/装备/抽奖]

  J1 --> K1[查看今日与未来天气、季节、推荐鱼饵]
  K1 --> J2
  J2 --> J3
  J3 --> K3[按环境效果调整等待、鱼池、掉率、命中难度]
  K3 --> L[结算奖励与图鉴]
  J4 --> L

  L --> M[saveUser 保存日历、天气预报、图鉴与收益]
  M --> N[统一验收]
  N --> O{验收通过?}
  O -- 否 --> P[回到天气/季节/数值/UI 分支修正]
  P --> D
  O -- 是 --> Q[构建 Web / 微信小游戏并发布]
```

## 2. 日历、季节与天气预报生成流程

```mermaid
flowchart TD
  A[游戏启动 / wx.onShow] --> B[loadUser]
  B --> C[normalize 补默认字段]
  C --> D{是否已有 calendar?}
  D -- 否 --> D1[创建 calendar 默认值]
  D1 --> E
  D -- 是 --> E[读取 lastTickAt / gameDay / season / forecast]

  E --> F{是否跨过新游戏日?}
  F -- 否 --> G[沿用今日天气和预报]
  F -- 是 --> H[推进 gameDay]
  H --> I[计算当前季节]
  I --> J[从旧 forecast 中取今日天气]
  J --> K{预报长度是否不足?}
  K -- 是 --> L[追加生成未来天气]
  K -- 否 --> M[保持剩余预报]
  L --> N[保存 calendar]
  M --> N
  G --> N

  N --> O[resolveEnvironmentEffects]
  O --> P[刷新顶部天气摘要]
  P --> Q[drawScene 使用季节与天气视觉]
  Q --> R[进入钓鱼主循环]
```

## 3. 天气与季节对钓鱼主循环的影响

```mermaid
flowchart TD
  A[玩家点击抛竿] --> B{state.phase == idle?}
  B -- 否 --> A1[忽略或提示当前正在钓鱼]
  B -- 是 --> C{鱼饵是否足够?}
  C -- 否 --> C1[提示鱼饵不足并引导商店]
  C -- 是 --> D[读取环境效果 env]

  D --> E[cast]
  E --> E1[扣除鱼饵]
  E1 --> E2[等待时间 = 基础等待 * env.biteWaitMultiplier]
  E2 --> E3[场景显示当前天气反馈]

  E3 --> F[进入 waiting]
  F --> G{等待结束?}
  G -- 否 --> F
  G -- 是 --> H[进入 hooked]
  H --> I{反应窗口内点击?}
  I -- 否 --> I1[鱼逃脱，回到 idle]
  I -- 是 --> J[startHitbar]

  J --> K[rollCatch]
  K --> K1[按季节过滤 seasonalFish]
  K1 --> K2[按天气过滤 weatherFish]
  K2 --> K3[应用 env.rarityBoost / trashRate / treasureRate]
  K3 --> L[生成目标鱼/垃圾/宝藏]

  L --> M[命中条参数]
  M --> M1[need = 稀有度命中次数]
  M1 --> M2[speed = 基础速度 * env.hitbarSpeedMultiplier]
  M2 --> M3[width = 基础宽度 * env.hitbarZoneMultiplier]
  M3 --> N[进入 reeling]

  N --> O{连续命中达标?}
  O -- 否 --> O1[未命中则连击清零或鱼逃脱]
  O1 --> N
  O -- 是 --> P[applyCatch]
  P --> Q[奖励 = 基础奖励 + 季节/天气加成 + 宠物加成]
  Q --> R[更新图鉴、历史、统计、任务]
  R --> S[结果弹窗展示天气/季节加成]
  S --> T[保存存档并回到 idle]
```

## 4. 新增数据结构与代码影响面

```mermaid
flowchart LR
  A[src/runtime/game.js] --> B[新增数据表]
  A --> C[新增函数]
  A --> D[改造现有函数]
  A --> E[UI 与视觉]
  A --> F[存档兼容]

  B --> B1[SEASONS]
  B --> B2[WEATHERS]
  B --> B3[SEASON_EFFECTS]
  B --> B4[WEATHER_EFFECTS]
  B --> B5[鱼类 seasonTags / weatherTags]

  C --> C1[createCalendar]
  C --> C2[getCurrentSeason]
  C --> C3[generateForecast]
  C --> C4[advanceCalendarIfNeeded]
  C --> C5[resolveEnvironmentEffects]

  D --> D1[cast 使用 biteWaitMultiplier]
  D --> D2[rollCatch 使用季节/天气鱼池与概率]
  D --> D3[startHitbar 使用命中条修正]
  D --> D4[applyCatch 显示环境奖励]
  D --> D5[update 处理跨日与 VIP 自动]

  E --> E1[drawTopbar 展示季节/天气]
  E --> E2[drawScene 画天空、水面、雨雪雾雷]
  E --> E3[drawWeatherModal 展示预报]
  E --> E4[drawDexModal 标记季节/天气限定鱼]
  E --> E5[handleAction 增加 forecast 入口]

  F --> F1[normalize 补 calendar 默认值]
  F --> F2[旧存档不丢失]
  F --> F3[预报可重算，避免存档过大]
  F --> F4[SAVE_KEY 不变或设计迁移版本]
```

## 5. 推荐实现顺序

```mermaid
flowchart TD
  A[第 1 阶段: 数据模型] --> B[定义 SEASONS / WEATHERS / 效果字段]
  B --> C[第 2 阶段: 日历与预报]
  C --> D[实现 createCalendar / generateForecast / advanceCalendarIfNeeded]
  D --> E[第 3 阶段: 主玩法接入]
  E --> F[接入 cast / rollCatch / startHitbar / applyCatch]
  F --> G[第 4 阶段: UI 与反馈]
  G --> H[顶部摘要、天气弹窗、场景视觉、结果加成]
  H --> I[第 5 阶段: 图鉴与目标感]
  I --> J[标记季节限定、天气限定、预报推荐鱼饵]
  J --> K[第 6 阶段: 平衡与验证]
  K --> L[多天气多季节抽样测试，确认收益和难度]
  L --> M[第 7 阶段: 构建发布]
  M --> N[npm run build:unified]
  N --> O[Web 冒烟 + 微信小游戏预览]
```

## 6. 天气与季节规则建议

| 系统 | 建议内容 | 影响点 |
|---|---|---|
| 春季 | 鱼类活跃、普通/稀有鱼略增 | 新手体验、图鉴收集 |
| 夏季 | 暴雨/雷暴概率更高，深水鱼出现 | 稀有鱼、隐藏鱼、场景表现 |
| 秋季 | 宝藏概率略增，鱼体重量略高 | 金币收益、目标感 |
| 冬季 | 雪天、雾天概率高，部分鱼休眠，冬季限定鱼出现 | 限定收集、等待时间 |
| 晴天 | 稳定基础天气 | 默认体验 |
| 阴天 | 等待略短，稀有度微增 | 平滑过渡 |
| 雨天 | 咬钩更快，稀有鱼概率提升 | 爽感与收益 |
| 暴雨 | 咬钩快但命中条更难 | 高风险高收益 |
| 大雾 | 稀有鱼略增但反应窗口更短 | 操作挑战 |
| 雷暴 | 隐藏鱼/宝藏概率提升，命中条更快 | 高价值事件 |
| 雪天 | 冬季鱼出现，等待变慢 | 季节限定 |

## 7. 验收清单

- 旧存档加载后自动补 `calendar`、`season`、`weather`、`forecast` 默认值。
- 今日天气和未来预报稳定，不会每次刷新都随机变化。
- 跨游戏日后会推进季节和天气，并补齐未来预报。
- 抛竿等待时间、鱼池筛选、稀有度、命中条速度、奖励文案都能体现天气/季节影响。
- 图鉴能区分普通鱼、天气限定鱼、季节限定鱼。
- 顶部信息和天气预报弹窗在小屏不遮挡主按钮。
- 雨、雪、雾、雷暴等场景效果有性能兜底，不影响低端设备帧率。
- `npm run build:unified` 后 Web 与微信小游戏输出一致。
