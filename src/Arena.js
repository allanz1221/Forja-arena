import Phaser from 'phaser';
import {drawScenery,drawCosmetics} from './scenery.js';
import {SCENARIOS} from './progression.js';
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
    this.banner = this.add.text(480, 55, this.scenario.name.toUpperCase(), {
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
    this.game.events.on('cosmetics', this.cosmetics, this);
    this.game.events.on('pause-duel', this.pause, this);
    this.events.once('shutdown', () => {
      this.game.events.off('start-duel', this.start, this);
      this.game.events.off('skill', this.skill, this);
      this.game.events.off('cosmetics', this.cosmetics, this);
      this.game.events.off('pause-duel', this.pause, this);
    });
    this.renderFighters();
    this.send();
  }

  paintArena(id='orbital') {
    this.scenario=SCENARIOS.find(s=>s.id===id)||SCENARIOS[0];
    if(!this.backdrop)this.backdrop=this.add.graphics().setDepth(0);
    drawScenery(this.backdrop,this.scenario.id);
    if(!this.locationLabel)this.locationLabel=this.add.text(25,400,'',{fontSize:'11px',fontFamily:'monospace',color:'#dcf0ec'}).setDepth(1);
    this.locationLabel.setText(this.scenario.name.toUpperCase()+' / ALIENS & ROBOTS');
  }

  start(config) {
    this.model = createCombat(config.build, config.difficulty, config.enemyBuild,config.rulesVersion,config);
    this.paintArena(config.scenario);
    this.playerCosmetics=config.playerCosmetics||{};this.enemyCosmetics=config.enemyCosmetics||{};
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

  cosmetics(value) { if(!['running','paused'].includes(this.model.status)){this.playerCosmetics=value;this.renderFighters();} }

  skill(id) {
    if (activate(this.model, id)) { this.actions.push({step:this.model.steps,id}); this.consumeEvents(); }
    this.send();
  }

  pause() {
    if (this.model.status === 'running') {
      this.model.status = 'paused'; this.cameras.main.stopShake();
    } else if (this.model.status === 'paused') this.model.status = 'running';
    this.banner.setText(this.model.status === 'paused' ? 'EN PAUSA' : this.scenario.name.toUpperCase());
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
        this.floatText(this.fighters[actor].x, 100, actor===1?'GUARDIA RIVAL':'GUARDIA', '#94e8ff', 18);
        this.burst(this.fighters[actor].x, 240, 0x91e3ff, 12, 90);
      }
      if (e.type === 'heal') {
        this.fighters[actor].healAt = this.clock;
        this.floatText(this.fighters[actor].x, 95, '+' + e.amount, '#bcff9a', 28);
        this.burst(this.fighters[actor].x, 260, 0xa8ff97, 20, 80);
      }
      if (e.type === 'charge') this.floatText(this.fighters[1].x, 95, this.model.enemyAbilities?'¡IMPACTO RIVAL!':'¡GOLPE PESADO!', '#ffd38e', 18);
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
    const guarding = this.model.time < (i===0?this.model.player.guardUntil:this.model.enemy.guardUntil||0);
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
    const alien = i === 0;
    const step = attacking ? Math.sin(attack * 28) * 12 : 0;
    const handX = guarding ? 43 : 45 + (attacking ? Math.sin(clamp(attack / .32, 0, 1) * Math.PI) : 0) * 37;
    const swing = attacking ? Math.sin(clamp(attack / .32, 0, 1) * Math.PI) : 0;
    const handY = winner ? -187 : charging ? -165 : -98 - swing * (f.heavy ? 30 : 15);
    if (alien) {
      // Alien: long limbs, exosuit, oversized head and luminous eyes.
      g.lineStyle(12, 0x415761);
      g.lineBetween(-14, -60, -23 + step, -29); g.lineBetween(-23 + step, -29, -28 + step, -5);
      g.lineBetween(14, -60, 25 - step, -29); g.lineBetween(25 - step, -29, 30 - step, -5);
      g.fillStyle(0x74eab8); g.fillEllipse(-25 + step, -3, 30, 13); g.fillEllipse(31 - step, -3, 30, 13);
      g.fillStyle(recoil > .2 ? 0xc8ffe6 : 0x263b52); g.fillRoundedRect(-26, -131, 52, 75, 16);
      g.lineStyle(2, 0x80e2be); g.strokeRoundedRect(-26, -131, 52, 75, 16);
      g.fillStyle(0x76efca); g.fillTriangle(0, -112, -14, -90, 14, -90);
      g.fillStyle(0x13273a); g.fillRect(-24, -72, 48, 12);
      g.fillStyle(0xadff9d); g.fillCircle(0, -67, 5);
      g.lineStyle(11, 0x69d8b0); g.lineBetween(-23, -118, -40, winner ? -178 : -82);
      g.lineBetween(24, -117, handX - 16, handY + 11); g.lineBetween(handX - 16, handY + 11, handX, handY);
      g.fillStyle(0x9af3be); g.fillCircle(handX, handY, 7);
      g.lineStyle(3, 0x7bd8bb); g.lineBetween(-17, -181, -25, -206); g.lineBetween(15, -181, 21, -210);
      g.fillStyle(0xbdffa5); g.fillCircle(-25, -206, 5); g.fillCircle(21, -210, 5);
      g.fillStyle(recoil > .2 ? 0xd6ffe3 : 0x80deb4); g.fillEllipse(0, -165, 69, 67);
      g.fillStyle(0x103f43); g.fillEllipse(-16, -169, 19, 29); g.fillEllipse(16, -169, 19, 29);
      g.fillStyle(0xafffee); g.fillEllipse(-13, -173, 6, 12); g.fillEllipse(19, -173, 6, 12);
      g.lineStyle(2, 0x28766a); g.lineBetween(-6, -144, 9, -144);
    } else {
      // Robot: armored plates, mechanical joints, antenna and reactor core.
      g.lineStyle(17, 0x4e6273); g.lineBetween(-17, -61, -24 + step, -30); g.lineBetween(-24 + step, -30, -27 + step, -6);
      g.lineBetween(17, -61, 24 - step, -30); g.lineBetween(24 - step, -30, 29 - step, -6);
      g.fillStyle(0xeda65e); g.fillCircle(-24 + step, -30, 8); g.fillCircle(24 - step, -30, 8);
      g.fillStyle(0x263e51); g.fillRoundedRect(-42 + step, -12, 35, 16, 4); g.fillRoundedRect(14 - step, -12, 35, 16, 4);
      g.fillStyle(recoil > .2 ? 0xffddab : 0x647e90); g.fillRoundedRect(-34, -138, 68, 80, 8);
      g.lineStyle(3, 0xa6b6bd); g.strokeRoundedRect(-34, -138, 68, 80, 8);
      g.fillStyle(0x253b4d); g.fillRoundedRect(-21, -124, 42, 49, 5);
      g.fillStyle(charging ? 0xff634e : 0xffc270); g.fillCircle(0, -102, 14);
      g.fillStyle(0xfff2be); g.fillCircle(0, -102, 6);
      g.lineStyle(18, 0x536b80); g.lineBetween(-30, -120, -44, winner ? -182 : -83);
      g.lineBetween(30, -120, handX - 16, handY + 12); g.lineBetween(handX - 16, handY + 12, handX, handY);
      g.fillStyle(0xe4ac69); g.fillCircle(-30, -120, 10); g.fillCircle(30, -120, 10);
      g.fillStyle(0x9cb2c2); g.fillRoundedRect(handX - 9, handY - 8, 18, 19, 4);
      g.fillStyle(0x829caa); g.fillRoundedRect(-30, -190, 60, 46, 8);
      g.fillStyle(0x1c3447); g.fillRoundedRect(-24, -179, 48, 16, 4);
      g.fillStyle(charging ? 0xff684f : 0xffcf81); g.fillRect(-17, -175, 13, 7); g.fillRect(6, -175, 13, 7);
      g.lineStyle(4, 0x91a9b7); g.lineBetween(0, -190, 0, -207);
      g.fillStyle(0xffd27d); g.fillCircle(0, -211, 5);
      g.lineStyle(2, 0x273e4e); for (let x = -10; x <= 10; x += 10) g.lineBetween(x, -155, x + 4, -155);
    }
    drawCosmetics(g, i===0?this.playerCosmetics:this.enemyCosmetics);
    // Plasma blade keeps each attack readable in the new science-fiction theme.
    g.save(); g.translateCanvas(handX, handY); g.rotateCanvas(charging ? -.6 : swing * 1.45 - .18);
    g.fillStyle(alien ? 0x56ebd8 : 0xffa967, .2); g.fillRoundedRect(-12, -68, 24, 74, 7);
    g.fillStyle(alien ? 0xa6fff0 : 0xffd9a1); g.fillRoundedRect(-4, -63, 8, 66, 3);
    g.fillStyle(0x22394d); g.fillRect(-13, 0, 26, 8); g.fillStyle(0x6d8294); g.fillRect(-5, 8, 10, 17);
    g.restore();
    g.restore();
    if (guarding && !loser) {
      g.lineStyle(3, 0x9adefa, .75); g.strokeEllipse(f.x, 231, 126, 194);
      g.fillStyle(0x78cbed, .06); g.fillEllipse(f.x, 231, 126, 194);
    }
    if (charging && !finished) {
      const progress = clamp(1 - (this.model.enemy.releaseAt - this.model.time) / this.model.enemy.chargeTime, 0, 1);
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
      : this.model.enemy.charging ? '¡RIVAL CARGANDO! · INTERRUMPE O BLOQUEA' : this.scenario.name.toUpperCase());
  }
}
