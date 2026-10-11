import Phaser from 'phaser';
import { createCombat, tick, activate } from './combat.js';

const HOME = [350, 610];
const COLORS = [0x62d9b5, 0xf1a15a];
const clamp = Phaser.Math.Clamp;
const ease = t => 1 - (1 - t) ** 3;

export class Arena extends Phaser.Scene {
  constructor() { super('Arena'); }

  create() {
    this.model = createCombat();
    this.lastEvent = 0;
    this.acc = 0;
    this.clock = 0;
    this.pending = [];
    this.particles = [];
    this.labels = [];
    this.finishAt = null;
    this.paintArena();
    this.fighters = HOME.map((home, i) => ({
      home, x: home, direction: i === 0 ? 1 : -1,
      color: COLORS[i], graphic: this.add.graphics().setDepth(3),
      attackAt: -10, hurtAt: -10, healAt: -10, heavy: false,
    }));
    this.effects = this.add.graphics().setDepth(4);
    this.banner = this.add.text(480, 55, 'LA FORJA', {
      fontFamily: 'monospace', fontSize: '17px', color: '#ae9677',
      align: 'center', wordWrap: { width: 850 },
    }).setOrigin(.5).setDepth(6);
    this.input.keyboard.on('keydown', e => {
      if (!e.repeat && ['1', '2', '3'].includes(e.key) &&
          !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        this.skill(['strike', 'guard', 'heal'][Number(e.key) - 1]);
      }
    });
    this.game.events.on('start-duel', this.start, this);
    this.game.events.on('skill', this.skill, this);
    this.game.events.on('pause-duel', this.pause, this);
    this.events.once('shutdown', () => {
      this.game.events.off('start-duel', this.start, this);
      this.game.events.off('skill', this.skill, this);
      this.game.events.off('pause-duel', this.pause, this);
    });
    this.renderFighters();
    this.send();
  }

  paintArena() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x172b30, 0x172b30, 0x111819, 0x111819, 1);
    g.fillRect(0, 0, 960, 430);
    g.fillStyle(0x1d3031); g.fillCircle(480, 135, 165);
    g.lineStyle(1, 0x44615a, .3);
    for (let i = 0; i < 7; i++) g.strokeCircle(480, 135, 45 + i * 22);
    g.fillStyle(0x263a37); g.fillRect(0, 275, 960, 155);
    g.fillStyle(0x344740); g.fillEllipse(480, 338, 790, 110);
    g.lineStyle(2, 0x5a6c55, .4); g.strokeEllipse(480, 338, 790, 110);
    for (let x = 70; x < 960; x += 140) {
      g.fillStyle(0x1b2627); g.fillRect(x, 120, 35, 158);
      g.fillStyle(0x324a43); g.fillRect(x - 6, 110, 47, 15);
    }
    for (const x of [130, 830]) {
      g.fillStyle(0x8c593b); g.fillRect(x, 220, 7, 64);
      g.fillStyle(0xffbd68); g.fillTriangle(x - 9, 225, x + 16, 225, x + 5, 190);
      this.add.circle(x + 4, 215, 35, 0xff9c46, .06);
    }
    this.add.text(25, 400, 'ENTRENAMIENTO / SIN CLASIFICACIÓN', {
      fontSize: '11px', fontFamily: 'monospace', color: '#899c89',
    });
  }

  start(config) {
    this.model = createCombat(config.build, config.difficulty, config.enemyBuild);
    this.actions = [];
    this.model.status = 'running';
    this.lastEvent = 0; this.acc = 0; this.clock = 0; this.finishAt = null;
    this.pending = []; this.particles = [];
    for (const l of this.labels) l.text.destroy();
    this.labels = [];
    this.cameras.main.stopShake();
    for (const f of this.fighters) {
      f.attackAt = f.hurtAt = f.healAt = -10;
      f.x = f.home; f.heavy = false;
    }
    this.floatText(480, 150, '¡A COMBATIR!', '#def6a7', 28, 1);
    this.renderFighters(); this.send();
  }

  skill(id) {
    if (activate(this.model, id)) { this.actions.push({step:this.model.steps,id}); this.consumeEvents(); }
    this.send();
  }

  pause() {
    if (this.model.status === 'running') {
      this.model.status = 'paused'; this.cameras.main.stopShake();
    } else if (this.model.status === 'paused') this.model.status = 'running';
    this.banner.setText(this.model.status === 'paused' ? 'EN PAUSA' : 'LA FORJA');
    this.send();
  }

  send() { this.game.events.emit('snapshot', structuredClone({...this.model,commands:this.actions||[]})); }

  consumeEvents() {
    for (const e of this.model.events) {
      if (e.id <= this.lastEvent) continue;
      this.lastEvent = e.id;
      const actor = e.actor === 'player' ? 0 : 1;
      if (e.type === 'hit') {
        const f = this.fighters[actor];
        f.attackAt = this.clock;
        f.heavy = e.kind === 'strike' || e.kind === 'heavy';
        this.pending.push({ at: this.clock + .16, actor, amount: e.amount, heavy: f.heavy, blocked: e.blocked });
        this.burst(f.x, 324, 0xa7bda3, 6, 35);
      }
      if (e.type === 'guard') {
        this.floatText(this.fighters[0].x, 100, 'GUARDIA', '#94e8ff', 18);
        this.burst(this.fighters[0].x, 240, 0x91e3ff, 12, 90);
      }
      if (e.type === 'heal') {
        this.fighters[0].healAt = this.clock;
        this.floatText(this.fighters[0].x, 95, '+' + e.amount, '#bcff9a', 28);
        this.burst(this.fighters[0].x, 260, 0xa8ff97, 20, 80);
      }
      if (e.type === 'charge') this.floatText(this.fighters[1].x, 95, '¡GOLPE PESADO!', '#ffd38e', 18);
      if (e.type === 'interrupt') this.floatText(480, 115, '¡INTERRUMPIDO!', '#d8ff8e', 21);
      if (e.type === 'finish') this.finishAt = this.clock + .4;
    }
  }

  floatText(x, y, value, color, size = 25, life = .8) {
    const text = this.add.text(x, y, value, {
      fontFamily: 'monospace', fontSize: size + 'px', color,
      stroke: '#142124', strokeThickness: 4,
    }).setOrigin(.5).setDepth(7);
    this.labels.push({ text, y, born: this.clock, life });
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const velocity = speed * (.5 + (i % 4) / 4);
      this.particles.push({ x, y, vx: Math.cos(a) * velocity, vy: Math.sin(a) * velocity - 20,
        color, born: this.clock, life: .35 + (i % 3) * .12, size: 2 + i % 3 });
    }
  }

  impact(p) {
    const target = this.fighters[1 - p.actor];
    target.hurtAt = this.clock;
    this.burst(target.x - target.direction * 25, 223, p.blocked ? 0x9ee8ff : p.heavy ? 0xffe499 : 0xf6f0ca,
      p.heavy ? 22 : 10, p.heavy ? 180 : 95);
    this.floatText(target.x, 122, (p.blocked ? 'BLOQUEO ' : '') + '−' + p.amount,
      p.blocked ? '#a3e6ff' : p.actor === 0 ? '#c9ff9b' : '#ffb88e', p.heavy ? 30 : 24);
    if (p.heavy) this.cameras.main.shake(140, .004);
  }

  drawFighter(f, i) {
    const g = f.graphic;
    const attack = this.clock - f.attackAt;
    const hurt = this.clock - f.hurtAt;
    const attacking = attack >= 0 && attack < .62;
    const lunging = attacking ? (attack < .16 ? ease(attack / .16) : 1 - ease(clamp((attack - .23) / .39, 0, 1))) : 0;
    const recoil = hurt >= 0 && hurt < .35 ? Math.sin(hurt / .35 * Math.PI) : 0;
    const charging = i === 1 && this.model.enemy.charging;
    const guarding = i === 0 && this.model.time < this.model.player.guardUntil;
    const finished = this.finishAt !== null && this.clock >= this.finishAt;
    const loser = finished && this.model.winner !== 'draw' && this.model.winner !== (i === 0 ? 'player' : 'enemy');
    const winner = finished && this.model.winner === (i === 0 ? 'player' : 'enemy');
    const fall = loser ? ease(clamp((this.clock - this.finishAt) / .5, 0, 1)) : 0;
    const breath = Math.sin(this.clock * 5 + i) * 2;
    f.x = f.home + f.direction * (lunging * 135 - recoil * (f.heavy ? 25 : 14));
    const jump = winner ? Math.max(0, Math.sin((this.clock - this.finishAt) * 6)) * 14 : attacking ? Math.sin(lunging * Math.PI) * 8 : 0;
    g.clear();
    g.fillStyle(0x000000, .25); g.fillEllipse(f.x, 332, 98 - jump, 20);
    g.save();
    g.translateCanvas(f.x, 330 - jump);
    g.rotateCanvas(-f.direction * fall * 1.25);
    g.scaleCanvas(f.direction, 1);
    g.translateCanvas(0, breath);
    // Articulated legs alternate steps while closing the gap.
    const step = attacking ? Math.sin(attack * 28) * 12 : 0;
    g.lineStyle(15, 0x303b42, 1);
    g.lineBetween(-16, -60, -23 + step, -30); g.lineBetween(-23 + step, -30, -29 + step, -5);
    g.lineBetween(16, -60, 26 - step, -30); g.lineBetween(26 - step, -30, 31 - step, -5);
    g.lineStyle(12, 0x111d20); g.lineBetween(-33 + step, -3, -17 + step, -3); g.lineBetween(22 - step, -3, 38 - step, -3);
    g.fillStyle(recoil > .2 ? 0xffdcc2 : f.color);
    g.fillRoundedRect(-29, -133, 58, 78, 12);
    g.fillStyle(0x27383a); g.fillRect(-29, -72, 58, 12);
    g.fillStyle(0xdbc89b); g.fillRect(-5, -72, 10, 12);
    // Raised weapon telegraphs charge; extended arm makes actual contact.
    const swing = attacking ? Math.sin(clamp(attack / .32, 0, 1) * Math.PI) : 0;
    const handX = guarding ? 43 : 45 + swing * 37;
    const handY = winner ? -187 : charging ? -165 : -98 - swing * (f.heavy ? 30 : 15);
    g.lineStyle(15, f.color);
    g.lineBetween(-26, -117, -40, winner ? -178 : -83);
    g.lineBetween(25, -117, handX - 15, handY + 12); g.lineBetween(handX - 15, handY + 12, handX, handY);
    g.fillStyle(0xe6b891); g.fillCircle(handX, handY, 8);
    g.save(); g.translateCanvas(handX, handY); g.rotateCanvas(charging ? -.6 : swing * 1.45 - .18);
    g.fillStyle(0xd7ded0); g.fillRoundedRect(-6, -60, 12, 65, 3);
    g.fillStyle(0x887860); g.fillRect(-17, 0, 34, 7); g.fillStyle(0x553e30); g.fillRect(-5, 7, 10, 16); g.restore();
    g.fillStyle(0xe6b891); g.fillCircle(0, -163, 26);
    g.fillStyle(0x263038); g.fillRoundedRect(-28, -189, 56, 21, 5); g.fillRect(-28, -185, 12, 22);
    g.fillStyle(0x16272b); g.fillRect(9, -167, 7, 5);
    g.lineStyle(2, 0x79594b); g.lineBetween(9, -150, 17, -150);
    g.restore();
    if (guarding && !loser) {
      g.lineStyle(3, 0x9adefa, .75); g.strokeEllipse(f.x, 231, 126, 194);
      g.fillStyle(0x78cbed, .06); g.fillEllipse(f.x, 231, 126, 194);
    }
    if (charging && !finished) {
      const progress = clamp(1 - (this.model.enemy.releaseAt - this.model.time) / 1.6, 0, 1);
      g.lineStyle(3, 0xf7b960, .5 + Math.sin(this.clock * 20) * .25); g.strokeEllipse(f.x, 329, 115, 29);
      g.fillStyle(0x53352c); g.fillRoundedRect(f.x - 47, 112, 94, 6, 3);
      g.fillStyle(0xffbe6c); g.fillRoundedRect(f.x - 47, 112, Math.max(1, progress * 94), 6, 3);
    }
    if (attacking && swing > .3) {
      g.lineStyle(f.heavy ? 6 : 3, f.heavy ? 0xffe98a : 0xd4f3dc, .4);
      g.beginPath(); g.arc(f.x + f.direction * 43, 215, f.heavy ? 78 : 62, -.8, .8, false); g.strokePath();
    }
  }

  renderFighters() { this.fighters.forEach((f, i) => this.drawFighter(f, i)); }

  renderEffects() {
    const g = this.effects; g.clear();
    this.particles = this.particles.filter(p => this.clock - p.born < p.life);
    for (const p of this.particles) {
      const t = this.clock - p.born;
      g.fillStyle(p.color, 1 - t / p.life);
      g.fillCircle(p.x + p.vx * t, p.y + p.vy * t + 110 * t * t, p.size * (1 - t / p.life));
    }
    this.labels = this.labels.filter(l => {
      const t = this.clock - l.born;
      if (t >= l.life) { l.text.destroy(); return false; }
      l.text.setY(l.y - t * 48).setAlpha(Math.min(1, (l.life - t) * 4)); return true;
    });
  }

  update(_, delta) {
    if (!this.model || this.model.status === 'paused') return;
    this.clock += Math.min(delta, 100) / 1000;
    if (this.model.status === 'running') {
      this.acc += Math.min(delta, 100);
      while (this.acc >= 50) { tick(this.model, .05); this.acc -= 50; }
      this.consumeEvents(); this.send();
    }
    this.renderFighters();
    const due = this.pending.filter(p => p.at <= this.clock);
    this.pending = this.pending.filter(p => p.at > this.clock);
    for (const p of due) this.impact(p);
    this.renderEffects();
    this.banner.setText(this.model.status === 'finished'
      ? (this.model.winner === 'player' ? 'VICTORIA' : this.model.winner === 'draw' ? 'EMPATE' : 'DERROTA')
      : this.model.enemy.charging ? '¡RIVAL CARGANDO! · INTERRUMPE O BLOQUEA' : 'LA FORJA');
  }
}
