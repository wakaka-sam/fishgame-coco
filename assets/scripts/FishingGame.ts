import { _decorator, Color, Component, EventKeyboard, Graphics, input, Input, KeyCode, Label, Node, UITransform, Vec3 } from 'cc';
import { BAITS, BaitId, CatchResult, getCurrentRodSkin, HITS_BY_RARITY, RARITY_COLOR, RARITY_NAME, rollCatch } from './game-data';

const { ccclass, property } = _decorator;

type Phase = 'idle' | 'waiting' | 'hooked' | 'reeling';

interface PlayerState {
  money: number;
  diamonds: number;
  baits: Record<string, number>;
  currentBait: BaitId;
  dex: Record<string, number>;
  totalCatches: number;
  totalWeight: number;
}

@ccclass('FishingGame')
export class FishingGame extends Component {
  @property(Graphics)
  sceneGraphics: Graphics | null = null;

  @property(Label)
  hudLabel: Label | null = null;

  @property(Label)
  statusLabel: Label | null = null;

  @property(Label)
  panelLabel: Label | null = null;

  private phase: Phase = 'idle';
  private player: PlayerState = this.createPlayer();
  private baitIds = Object.keys(BAITS) as BaitId[];
  private baitIndex = 0;
  private hookX = 0;
  private hookY = 0;
  private waitLeft = 0;
  private biteLeft = 0;
  private catchResult: CatchResult | null = null;
  private hits = 0;
  private hitsNeeded = 0;
  private hitCursor = 0;
  private hitDir = 1;
  private hitZoneStart = 0.35;
  private hitZoneWidth = 0.18;
  private hitTimeLeft = 0;

  start() {
    this.load();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.setStatus('空格抛竿，Tab 切换鱼饵，S 打开商店，D 查看图鉴');
    this.refreshLabels();
  }

  onDestroy() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  update(dt: number) {
    this.stepGame(dt);
    this.draw();
  }

  private onKeyDown(event: EventKeyboard) {
    if (event.keyCode === KeyCode.SPACE) {
      if (this.phase === 'idle') this.cast();
      else if (this.phase === 'hooked') this.startReeling();
      else if (this.phase === 'reeling') this.hit();
    } else if (event.keyCode === KeyCode.TAB) {
      this.nextBait();
    } else if (event.keyCode === KeyCode.KEY_S) {
      this.buyCurrentBait();
    } else if (event.keyCode === KeyCode.KEY_D) {
      this.showDex();
    }
  }

  private createPlayer(): PlayerState {
    return {
      money: 500,
      diamonds: 20,
      currentBait: 'worm',
      baits: { worm: 10, shrimp: 0, lure: 0, magic: 0, divine: 0 },
      dex: {},
      totalCatches: 0,
      totalWeight: 0,
    };
  }

  private cast() {
    const baitId = this.player.currentBait;
    if ((this.player.baits[baitId] || 0) <= 0) {
      this.setStatus('鱼饵不足，按 S 购买当前鱼饵');
      return;
    }
    this.player.baits[baitId] -= 1;
    this.phase = 'waiting';
    this.waitLeft = 1.5 + Math.random() * 3.5;
    this.hookX = -80 + Math.random() * 160;
    this.hookY = -35 - Math.random() * 40;
    this.setStatus('已抛竿，等待鱼上钩...');
    this.save();
    this.refreshLabels();
  }

  private startReeling() {
    if (this.phase !== 'hooked') return;
    this.phase = 'reeling';
    this.catchResult = rollCatch(this.player.currentBait);
    this.hits = 0;
    this.hitsNeeded = HITS_BY_RARITY[this.catchResult.rarity] || 2;
    this.hitCursor = 0;
    this.hitDir = 1;
    this.hitZoneWidth = Math.max(0.1, 0.28 - this.hitsNeeded * 0.025);
    this.randomizeZone();
    this.hitTimeLeft = 12;
    this.setStatus(`${RARITY_NAME[this.catchResult.rarity]}目标上钩，连续命中 ${this.hitsNeeded} 次`);
  }

  private hit() {
    if (this.phase !== 'reeling' || !this.catchResult) return;
    const ok = this.hitCursor >= this.hitZoneStart && this.hitCursor <= this.hitZoneStart + this.hitZoneWidth;
    if (!ok) {
      this.hits = 0;
      this.randomizeZone();
      this.setStatus('没中，连击清零');
      return;
    }
    this.hits += 1;
    if (this.hits >= this.hitsNeeded) {
      this.applyCatch(this.catchResult);
      this.phase = 'idle';
      this.catchResult = null;
      this.save();
      this.refreshLabels();
    } else {
      this.randomizeZone();
      this.setStatus(`命中！${this.hits}/${this.hitsNeeded}`);
    }
  }

  private stepGame(dt: number) {
    if (this.phase === 'waiting') {
      this.waitLeft -= dt;
      if (this.waitLeft <= 0) {
        this.phase = 'hooked';
        this.biteLeft = 3;
        this.setStatus('鱼上钩了！按空格收线');
      }
    } else if (this.phase === 'hooked') {
      this.biteLeft -= dt;
      if (this.biteLeft <= 0) {
        this.phase = 'idle';
        this.setStatus('反应太慢，鱼跑了');
        this.refreshLabels();
      }
    } else if (this.phase === 'reeling') {
      const speed = 0.7 + this.hitsNeeded * 0.16;
      this.hitCursor += this.hitDir * speed * dt;
      if (this.hitCursor >= 1) {
        this.hitCursor = 1;
        this.hitDir = -1;
      } else if (this.hitCursor <= 0) {
        this.hitCursor = 0;
        this.hitDir = 1;
      }
      this.hitTimeLeft -= dt;
      if (this.hitTimeLeft <= 0) {
        this.phase = 'idle';
        this.catchResult = null;
        this.setStatus('时间到，鱼跑了');
        this.refreshLabels();
      }
    }
  }

  private applyCatch(result: CatchResult) {
    this.player.money += result.value;
    this.player.diamonds += result.diamondValue;
    this.player.totalCatches += 1;
    this.player.totalWeight += result.weight;
    this.player.dex[result.item.id] = (this.player.dex[result.item.id] || 0) + 1;
    const reward = result.diamondValue ? `，💎 +${result.diamondValue}` : `，💰 +${result.value}`;
    this.setStatus(`钓到 ${result.item.icon} ${result.item.name} ${result.weight ? result.weight + 'kg' : ''}${reward}`);
  }

  private nextBait() {
    this.baitIndex = (this.baitIndex + 1) % this.baitIds.length;
    this.player.currentBait = this.baitIds[this.baitIndex];
    this.setStatus(`当前鱼饵：${BAITS[this.player.currentBait].name}`);
    this.save();
    this.refreshLabels();
  }

  private buyCurrentBait() {
    const baitId = this.player.currentBait;
    const bait = BAITS[baitId];
    const currency = 'currency' in bait && bait.currency === 'diamonds' ? 'diamonds' : 'money';
    if (this.player[currency] < bait.price) {
      this.setStatus(currency === 'diamonds' ? '钻石不足' : '金币不足');
      return;
    }
    this.player[currency] -= bait.price;
    this.player.baits[baitId] = (this.player.baits[baitId] || 0) + 5;
    this.setStatus(`购买 5 个${bait.name}`);
    this.save();
    this.refreshLabels();
  }

  private showDex() {
    const names = Object.keys(this.player.dex).slice(-8).join(' / ') || '还没有钓到任何东西';
    this.setStatus(`图鉴 ${Object.keys(this.player.dex).length} 种：${names}`);
  }

  private randomizeZone() {
    this.hitZoneStart = Math.random() * (1 - this.hitZoneWidth);
  }

  private refreshLabels() {
    const bait = BAITS[this.player.currentBait];
    if (this.hudLabel) {
      this.hudLabel.string = `💰 ${this.player.money}   💎 ${this.player.diamonds}   ${bait.name} x${this.player.baits[this.player.currentBait] || 0}`;
    }
    if (this.panelLabel) {
      this.panelLabel.string = `图鉴 ${Object.keys(this.player.dex).length} 种   累计 ${this.player.totalCatches} 次   总重量 ${this.player.totalWeight.toFixed(2)}kg`;
    }
  }

  private setStatus(text: string) {
    if (this.statusLabel) this.statusLabel.string = text;
  }

  private draw() {
    const g = this.sceneGraphics;
    if (!g) return;
    const view = this.node.getComponent(UITransform);
    const width = view?.width || 960;
    const height = view?.height || 540;
    const t = performance.now() / 1000;
    g.clear();
    g.fillColor = new Color(129, 200, 225, 255);
    g.rect(-width / 2, -height / 2, width, height);
    g.fill();
    g.fillColor = new Color(61, 90, 115, 255);
    g.moveTo(-width / 2, 50);
    for (let x = -width / 2; x <= width / 2; x += 40) {
      g.lineTo(x, 60 + Math.sin(x * 0.02) * 30);
    }
    g.lineTo(width / 2, 50);
    g.close();
    g.fill();
    g.fillColor = new Color(30, 96, 145, 255);
    g.rect(-width / 2, -height / 2, width, height / 2 + 55);
    g.fill();
    for (let i = 0; i < 28; i += 1) {
      g.fillColor = new Color(210, 240, 255, 90);
      g.rect(-width / 2 + ((i * 73 + t * 38) % width), -height / 2 + 35 + ((i * 41) % 220), 34, 3);
      g.fill();
    }
    const rod = getCurrentRodSkin(this.player.dex);
    const base = new Vec3(width * 0.42, -height * 0.42);
    const tip = new Vec3(-80 + Math.sin(t * 1.4) * 8, 80);
    this.strokeLine(g, base.x, base.y, tip.x, tip.y, Color.fromHEX(new Color(), rod.rodColor), 8);
    this.strokeLine(g, base.x, base.y, tip.x, tip.y, Color.fromHEX(new Color(), rod.rodHighlight), 3);
    if (this.phase !== 'idle') {
      this.strokeLine(g, tip.x, tip.y, this.hookX, this.hookY, new Color(240, 248, 255, 210), 2);
      g.fillColor = new Color(255, 87, 34, 255);
      g.circle(this.hookX, this.hookY + Math.sin(t * 4) * 4, this.phase === 'hooked' ? 10 : 7);
      g.fill();
    }
    if (this.phase === 'reeling') this.drawHitbar(g, width, height);
  }

  private drawHitbar(g: Graphics, width: number, height: number) {
    const barW = width * 0.62;
    const x = -barW / 2;
    const y = -height * 0.32;
    g.fillColor = new Color(15, 23, 42, 220);
    g.roundRect(x - 20, y - 22, barW + 40, 76, 10);
    g.fill();
    g.fillColor = new Color(226, 232, 240, 255);
    g.rect(x, y, barW, 18);
    g.fill();
    g.fillColor = Color.fromHEX(new Color(), RARITY_COLOR[this.catchResult?.rarity || 'common']);
    g.rect(x + barW * this.hitZoneStart, y, barW * this.hitZoneWidth, 18);
    g.fill();
    g.fillColor = new Color(20, 20, 20, 255);
    g.rect(x + barW * this.hitCursor - 3, y - 9, 6, 36);
    g.fill();
  }

  private strokeLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: Color, width: number) {
    g.strokeColor = color;
    g.lineWidth = width;
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }

  private save() {
    localStorage.setItem('fish-coco-save', JSON.stringify(this.player));
  }

  private load() {
    try {
      const saved = localStorage.getItem('fish-coco-save');
      if (saved) this.player = { ...this.createPlayer(), ...JSON.parse(saved) };
      this.baitIndex = Math.max(0, this.baitIds.indexOf(this.player.currentBait));
    } catch (_) {
      this.player = this.createPlayer();
    }
  }
}
