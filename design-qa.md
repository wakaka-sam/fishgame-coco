# Design QA: UI-v0.6.0-PSD主界面替换版

Source visual: `/root/.botmux/data/attachments/om_x100b6b7913f1f48cc426d370772c870/界面布局UI-20260626.psd`

Reference export: `/tmp/fish-ui-psd/layout-thumb.png`

Prototype capture: `/tmp/fish-ui-v060-2.png`

Viewport: 1080 x 2334

Checks:

- Full-screen pixel lake scene matches the PSD artboard structure.
- Left-side menu uses PSD assets and keeps Backpack, Shop, Rank, Task, Codex, Other positions.
- Right-side Collection and Idle entries use PSD assets and remain clickable.
- Bottom console matches PSD layout: bait button, large cast button, tackle button, rod strip, and base.
- Existing gameplay interactions are preserved: cast, bait switch, rod switch, shop, rank, task, codex, weather, and idle toggle.
- No lower UI obstruction found after moving the status strip above the cast area.

Known differences:

- Profile and resource counters are dynamic code-drawn panels so player id, coins, pearls, and level can update in-game.
- Status text is kept as a compact overlay because the existing game needs runtime feedback.

Final result: passed
