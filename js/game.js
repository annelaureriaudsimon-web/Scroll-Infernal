/* ==========================================================================
   game.js — boucle de jeu, défilement, collisions, cookies, bonus, états.
   États : menu → playing ⇄ paused → dying → over   (ou playing → won)
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var C = G.CONFIG, WD = G.WORDS, ui = G.ui, audio = G.audio, save = G.save, COS = G.COSMETICS;
  var SAFE_ADBLOCK = { ad: 1, popup: 1, cookie: 1 };   // inoffensifs pendant Ad-block
  var MAGNET = [0, 70, 110, 160];                      // portée de l'aimant selon le niveau
  var WIN_BONUS = 200;                                 // cookies offerts si on finit le niveau

  function mmss(s) {
    s = Math.max(0, Math.ceil(s));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function Game() {
    this.stage = document.getElementById('stage');
    this.world = document.getElementById('world');
    this.playerEl = document.getElementById('player');
    this.skinEl = this.playerEl.querySelector('.skin');
    // 2e exemplaire de la souris : visible de l'autre côté quand on est tout au bord
    this.wrapEl = this.playerEl.cloneNode(true);
    this.wrapEl.id = 'player-wrap';
    this.wrapEl.style.display = 'none';
    this.stage.appendChild(this.wrapEl);
    this.wrapSkin = this.wrapEl.querySelector('.skin');
    this._cls = '';
    this.sections = [];
    this.nearItems = [];
    this.state = 'menu';
    this.touchMode = false;
    this.opt = { danger: true, shake: true };
    this.fx = { slow: 0, adblock: 0 };
    this.fxMax = { slow: 6, adblock: 8 };
    this.shield = 0; this.cookies = 0; this.banked = true; this.endless = false;
    this.rec = null; this.achT = 0; this.sx = 0; this.sy = 0; this.curStill = 0; this.curNo = 0;
    C.configure(save.data.settings, save.data.upgrades);
    this.resize();
    this.px = this.lx = this.W / 2;
    this.py = this.ly = this.H * 0.7;
    this.reset();
    this.last = 0;
    this._frame = this.frame.bind(this);
    this.applySettings();
    this.applyCosmetics();
    ui.setSound(audio.isMuted());
  }

  Game.prototype.resize = function () {
    this.W = this.stage.clientWidth;
    this.H = this.stage.clientHeight;
    if (G.trail) G.trail.resize(this.W, this.H);
    if (G.hacker) G.hacker.resize(this.W, this.H);
  };

  /* --- Réglages et apparence ------------------------------------------- */
  Game.prototype.applySettings = function () {
    var s = save.data.settings;
    this.opt.danger = !!s.showDanger;
    this.opt.shake = !!s.shake;
    document.body.classList.toggle('no-ring', !s.showHit);
    ui.setSound(!!s.muted);
  };

  Game.prototype.applyCosmetics = function () {
    var eq = save.data.equipped, sk = COS.skin(eq.skin), col = COS.color(eq.color);
    this.skinEl.innerHTML = sk.build(col.v);
    this.skinEl.style.left = (-sk.cx) + 'px';
    this.skinEl.style.top = (-sk.cy) + 'px';
    this.wrapSkin.innerHTML = this.skinEl.innerHTML;
    this.wrapSkin.style.left = this.skinEl.style.left;
    this.wrapSkin.style.top = this.skinEl.style.top;
    this.playerEl.classList.toggle('rainbow', !!col.rainbow);
    this.playerEl.classList.toggle('glitch', !!col.glitch);
    var th = COS.ui(eq.ui), st = document.documentElement.style;
    st.setProperty('--g', th.g); st.setProperty('--g2', th.g2); st.setProperty('--g-rgb', th.rgb);
    if (G.hacker) G.hacker.setColor(th.rgb);
    G.trail.setKind(eq.trail);
  };

  /* --- Mise en place d'une partie / du décor du menu ------------------- */
  Game.prototype.reset = function (seed) {
    this.world.innerHTML = '';
    this.sections.length = 0;
    this.nearItems.length = 0;
    this.scroll = 0; this.offset = 0; this.t = 0;
    this.speed = C.speedAt(0);
    this.maxSpeed = this.speed;
    this.stageNo = 1;
    this.grace = 0;
    this.curUrl = '';
    this.gen = new G.Generator(seed != null ? seed : Math.floor(Math.random() * 4294967296));
    this.addSection(this.gen.intro(this.W, this.H));
    this.fill();
    this.render();
  };

  Game.prototype.addSection = function (sec) {
    sec.offset = this.offset;
    this.offset += sec.h;
    G.renderSection(sec, this.world);
    this.sections.push(sec);
  };

  // Génère le site au-dessus de l'écran tant qu'il en manque
  Game.prototype.fill = function () {
    while (this.offset < this.H + this.scroll + C.lookahead) {
      this.addSection(this.gen.next({ W: this.W, t: this.t }));
    }
  };

  // Supprime ce qui est sorti par le bas
  Game.prototype.cull = function () {
    while (this.sections.length > 2) {
      var s = this.sections[0];
      if (this.scroll - s.offset - s.h > 120) { s.el.remove(); this.sections.shift(); } else break;
    }
  };

  /* --- Commandes -------------------------------------------------------- */
  Game.prototype.start = function (seed) {
    if (this.state === 'playing' || this.state === 'paused') this.bank('quit');
    audio.unlock();
    var S = save.data, U = S.upgrades;
    C.configure(S.settings, U);
    this.reset(seed);
    if (this.touchMode) { this.px = this.W / 2; this.py = this.H * 0.75; }
    this.lx = this.px; this.ly = this.py;
    this.endless = C.endless;
    this.modeKey = (S.settings.duration || 'inf') + '-' + S.settings.difficulty;
    this.cookies = 0;
    this.shield = U.shield > 0 ? 1 : 0;
    this.fx.slow = this.fx.adblock = 0;
    this.fxMax.slow = 6 * (1 + 0.25 * U.power);
    this.fxMax.adblock = 8 * (1 + 0.25 * U.power);
    this.banked = false;
    this.state = 'playing';
    this.lock();
    this.grace = C.graceStart + 0.5 * U.grace;
    this.rec = this.newRun(S);
    this.achT = 0; this.sx = this.px; this.sy = this.py; this.curStill = 0; this.curNo = 0;
    this.applyCosmetics();
    G.trail.clear();
    this.playerEl.classList.remove('hidden', 'dead');
    this.stage.classList.remove('shake');
    this.world.classList.remove('adblock');
    document.body.classList.add('playing');
    ui.hide();
    ui.setHudLabels(this.endless ? 'TEMPS' : 'RESTE');
    ui.setEffects([]);
    this.render();
    ui.toast(this.endless ? 'Mode infini : tiens le plus longtemps possible !' : 'Niveau de ' + (C.duration / 60) + ' min — évite tout ce qui est plein !', 2200);
    audio.start();
  };

  // Suivi d'une partie (succès + classement)
  Game.prototype.newRun = function (S) {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      t: 0, tB: 0, score: 0, cookies: 0, cookiesB: 0, powers: 0, powersB: 0, p: {}, shields: 0,
      nears: 0, nearsB: 0, still: 0, noCookie: 0, mul: 0,
      diff: S.settings.difficulty, dur: S.settings.duration, endless: C.endless,
      won: false, cause: '', result: '', paid: 0, counted: false, winCounted: false,
      samples: [], sInt: 10, nextSample: 0
    };
  };

  Game.prototype.pause = function () {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.unlock();
    document.body.classList.remove('playing');
    ui.show('pause');
  };

  Game.prototype.resume = function () {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lock();
    this.grace = C.graceResume + 0.5 * save.data.upgrades.grace;
    this.lx = this.px; this.ly = this.py;
    document.body.classList.add('playing');
    ui.hide();
  };

  Game.prototype.toMenu = function () {
    if (this.state === 'playing' || this.state === 'paused') this.bank('quit');
    this.state = 'menu';
    this.unlock();
    document.body.classList.remove('playing');
    this.playerEl.classList.add('hidden');
    G.trail.clear();
    C.configure(save.data.settings, save.data.upgrades);
    this.reset();
    ui.setEffects([]);
    ui.show('menu');
    if (G.screens) G.screens.refresh();
  };

  // Après la victoire : on continue en mode infini
  Game.prototype.continueEndless = function () {
    if (this.state !== 'won') return;
    this.lock();
    this.endless = true;
    this.banked = false;
    if (this.rec) this.rec.endless = true;
    this.state = 'playing';
    this.grace = C.graceResume + 0.5 * save.data.upgrades.grace;
    this.lx = this.px; this.ly = this.py;
    document.body.classList.add('playing');
    ui.hide();
    ui.setHudLabels('TEMPS');
    ui.toast('Mode infini ! Chaque seconde compte.', 1800);
  };

  Game.prototype.movePlayerTo = function (clientX, clientY) {
    var r = this.stage.getBoundingClientRect();
    this.setPlayer(clientX - r.left, clientY - r.top);
  };
  // free = souris capturée : on ne s'arrête pas au bord, on ressort de l'autre côté
  Game.prototype.movePlayerBy = function (dx, dy, free) {
    var x = this.px + dx;
    if (free && this.isWrap()) {
      var k = Math.floor(x / this.W);
      if (k) { x -= k * this.W; this.lx -= k * this.W; }   // on décale aussi le point de départ : pas de « saut » à travers l'écran
      this.setPlayer(x, this.py + dy, true);
    } else this.setPlayer(x, this.py + dy);
  };
  Game.prototype.setPlayer = function (x, y, free) {
    var m = C.hitRadius;
    this.px = free ? Math.max(0, Math.min(this.W - 0.01, x)) : Math.max(m, Math.min(this.W - m, x));
    this.py = Math.max(m, Math.min(this.H - m, y));
  };

  /* --- Capture de la souris (nécessaire pour passer d'un bord à l'autre) --- */
  Game.prototype.isWrap = function () {
    return !!save.data.settings.wrap && document.pointerLockElement === this.stage;
  };
  Game.prototype.lock = function () {
    if (!save.data.settings.wrap || this.touchMode || document.pointerLockElement === this.stage) return;
    try {
      var p = this.stage.requestPointerLock && this.stage.requestPointerLock();
      if (p && p.catch) p.catch(function () { /* refusé : on joue avec la souris normale */ });
    } catch (e) { /* ignore */ }
  };
  Game.prototype.unlock = function () {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  };

  /* --- Simulation ------------------------------------------------------- */
  Game.prototype.update = function (dt) {
    if (this.state === 'menu') {
      this.scroll += C.attractSpeed * dt;
      this.fill(); this.cull();
      return;
    }
    if (this.state !== 'playing') return;

    var fx = this.fx;
    this.t += dt;
    if (fx.slow > 0) fx.slow = Math.max(0, fx.slow - dt);
    if (fx.adblock > 0) {
      fx.adblock = Math.max(0, fx.adblock - dt);
      if (fx.adblock === 0) this.world.classList.remove('adblock');
    }
    this.speed = C.speedAt(this.t) * (fx.slow > 0 ? 0.5 : 1);
    if (this.speed > this.maxSpeed) this.maxSpeed = this.speed;
    this.scroll += this.speed * dt;
    if (this.grace > 0) this.grace = Math.max(0, this.grace - dt);

    // Suivi de la partie
    var r = this.rec, mul = C.speedAt(this.t) / 100;
    r.t = this.t; r.score = this.score();
    if (mul > r.mul) r.mul = mul;
    if (Math.hypot(this.px - this.sx, this.py - this.sy) > 3) { this.sx = this.px; this.sy = this.py; this.curStill = 0; }
    else { this.curStill += dt; if (this.curStill > r.still) r.still = this.curStill; }
    this.curNo += dt; if (this.curNo > r.noCookie) r.noCookie = this.curNo;
    if (this.t >= r.nextSample) {
      r.samples.push(Math.round(mul * 10) / 10);
      r.nextSample = r.samples.length * r.sInt;
      if (r.samples.length > 180) {
        r.samples = r.samples.filter(function (v, i) { return i % 2 === 0; });
        r.sInt *= 2; r.nextSample = r.samples.length * r.sInt;
      }
    }
    this.achT += dt;
    if (this.achT >= 0.5) { this.achT = 0; G.ach.check(r); }

    // Étapes : 10 par niveau
    var no = 1 + Math.floor(this.t / (C.curveLen / 10));
    if (!this.endless) no = Math.min(10, no);
    if (no !== this.stageNo) {
      this.stageNo = no;
      ui.toast('Étape ' + no + (this.endless ? '' : '/10') + ' — ça accélère !', 1500);
      audio.stage();
    }

    // Fin du niveau
    if (!this.endless && this.t >= C.duration) { this.win(); return; }

    this.fill(); this.cull();
    this.trackUrl();
    this.collectPickups(dt);

    if (this.grace <= 0) {
      var hit = this.collide();
      if (hit) {
        if (this.shield > 0) this.useShield(hit); else this.die(hit);
      }
    } else {
      this.lx = this.px; this.ly = this.py;
    }
  };

  Game.prototype.sectionTop = function (sec) {
    return this.H - sec.offset - sec.h + this.scroll;
  };

  // Met à jour l'URL de la fausse barre selon le site sous la souris
  Game.prototype.trackUrl = function () {
    for (var i = 0; i < this.sections.length; i++) {
      var s = this.sections[i], top = this.sectionTop(s);
      if (this.py >= top && this.py < top + s.h) {
        if (s.url !== this.curUrl) {
          var first = this.curUrl === '';
          this.curUrl = s.url;
          ui.setUrl('https://' + s.url);
          if (!first) audio.page();
        }
        return;
      }
    }
  };

  /* --- Cookies et bonus -------------------------------------------------- */
  Game.prototype.collectPickups = function (dt) {
    var reach = C.hitRadius + 15, W = this.W;
    var magnet = MAGNET[save.data.upgrades.magnet] || 0;
    for (var i = 0; i < this.sections.length; i++) {
      var sec = this.sections[i];
      if (!sec.pickups || !sec.pickups.length) continue;
      var top = this.sectionTop(sec);
      if (top > this.py + 400 || top + sec.h < this.py - 400) continue;
      for (var j = 0; j < sec.pickups.length; j++) {
        var pk = sec.pickups[j];
        if (pk.taken) continue;
        var dx = this.px - (pk.x * W + pk.ox), dy = this.py - (top + pk.y + pk.oy), d = Math.hypot(dx, dy);
        if (magnet && pk.type === 'cookie' && d < magnet && d > 1) {
          var mv = Math.min(d, 520 * dt);
          pk.ox += dx / d * mv; pk.oy += dy / d * mv;
          pk.el.style.translate = pk.ox + 'px ' + pk.oy + 'px';
          d -= mv;
        }
        if (d < reach) this.collect(pk);
      }
    }
  };

  Game.prototype.collect = function (pk) {
    pk.taken = true;
    pk.el.classList.add('pop');
    setTimeout(function () { if (pk.el.parentNode) pk.el.remove(); }, 300);
    if (pk.type === 'cookie') { this.cookies++; this.rec.cookies = this.cookies; this.curNo = 0; audio.coin(); return; }
    this.rec.powers++; this.rec.p[pk.type] = 1;
    audio.power();
    if (pk.type === 'power-shield') {
      this.shield = Math.min(2, this.shield + 1);
      ui.toast('Pare-feu ! Le prochain choc est annulé.', 1500);
    } else if (pk.type === 'power-slow') {
      this.fx.slow = this.fxMax.slow;
      ui.toast('Wi-Fi lent : le site ralentit.', 1500);
    } else if (pk.type === 'power-adblock') {
      this.fx.adblock = this.fxMax.adblock;
      this.world.classList.add('adblock');
      ui.toast('Ad-block : pubs, pop-ups et cookies sont inoffensifs.', 1700);
    }
  };

  Game.prototype.useShield = function (item) {
    this.shield--;
    save.data.stats.shields++; this.rec.shields++;
    item.dead = true;
    item.el.classList.add('shattered');
    this.grace = 0.9;
    this.lx = this.px; this.ly = this.py;
    var f = document.getElementById('flash');
    f.classList.add('cyan'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    audio.shield();
    ui.toast('Pare-feu utilisé !', 1200);
  };

  // Collision cercle (souris) / rectangles. On « balaie » le trajet de la souris
  // depuis la dernière image pour qu'on ne puisse pas traverser un bloc en un clin d'œil.
  Game.prototype.collide = function () {
    var r = C.hitRadius, near = C.nearDistance, W = this.W;
    var adb = this.fx.adblock > 0, danger = this.opt.danger;
    var x0 = this.lx, y0 = this.ly, x1 = this.px, y1 = this.py;
    var steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
    var minY = Math.min(y0, y1) - near, maxY = Math.max(y0, y1) + near;
    var hit = null, nowNear = [];
    var offs = [0];
    if (this.isWrap()) {          // tout au bord, la souris existe aussi de l'autre côté
      var ed = near + r + 2, mn = Math.min(x0, x1), mx = Math.max(x0, x1);
      if (mn < ed) offs.push(W);
      if (mx > W - ed) offs.push(-W);
    }

    for (var i = 0; i < this.sections.length && !hit; i++) {
      var sec = this.sections[i];
      if (!sec.items.length) continue;
      var top = this.sectionTop(sec);
      if (top > maxY || top + sec.bandH < minY) continue;
      for (var j = 0; j < sec.items.length; j++) {
        var it = sec.items[j];
        if (it.dead || (adb && SAFE_ADBLOCK[it.type])) continue;
        var rx = it.x * W, rw = it.w * W, ry = top + it.y, rh = it.h;
        var best = Infinity;
        for (var oi = 0; oi < offs.length; oi++) {
          for (var s = 1; s <= steps; s++) {
            var k = s / steps, cx = x0 + (x1 - x0) * k + offs[oi], cy = y0 + (y1 - y0) * k;
            var dx = Math.max(rx - cx, 0, cx - (rx + rw));
            var dy = Math.max(ry - cy, 0, cy - (ry + rh));
            var d2 = dx * dx + dy * dy;
            if (d2 < best) best = d2;
          }
        }
        if (best < r * r) { hit = it; break; }
        if (best < near * near) nowNear.push(it);
        if (best < 324 && !it.grazed) { it.grazed = true; this.rec.nears++; }   // frôlement : moins de 18 px
      }
    }
    this.lx = x1; this.ly = y1;

    // Éléments « proches » : entourés de rouge
    var old = this.nearItems, n;
    for (n = 0; n < old.length; n++) if (nowNear.indexOf(old[n]) < 0) old[n].el.classList.remove('near');
    if (danger) for (n = 0; n < nowNear.length; n++) nowNear[n].el.classList.add('near');
    this.nearItems = nowNear;
    return hit;
  };

  Game.prototype.score = function () { return Math.floor(this.scroll / 10); };

  /* --- Fin de partie ----------------------------------------------------- */
  // Compte les cookies gagnés, met à jour records / statistiques / classement.
  // result : 'win' | 'death' | 'quit'. Peut être rappelé après « continuer en mode infini » :
  // on ne paie et ne compte que la différence.
  Game.prototype.bank = function (result) {
    var r = this.rec;
    if (!r || this.banked) return this.lastRun;
    this.banked = true;
    var S = save.data, U = S.upgrades, st = S.stats, score = this.score(), eq = S.equipped;
    r.t = this.t; r.score = score; r.result = result;
    if (result === 'win') r.won = true;

    var total = Math.round((r.cookies + Math.floor(score / 100) + (r.won ? WIN_BONUS : 0)) * C.diff.reward * (1 + 0.2 * U.bonus));
    var pay = Math.max(0, total - r.paid);
    r.paid = total; S.cookies += pay; st.cookies += pay;

    if (!r.counted) { r.counted = true; st.games++; }
    if (r.won && !r.winCounted) {
      r.winCounted = true; st.wins++;
      st.winMax = Math.max(st.winMax, r.dur || 0);
      if (r.diff === 'infernal') st.infWinMax = Math.max(st.infWinMax, r.dur || 0);
    }
    st.time += r.t - r.tB; r.tB = r.t;
    st.picked += r.cookies - r.cookiesB; r.cookiesB = r.cookies;
    st.powers += r.powers - r.powersB; r.powersB = r.powers;
    st.nears += r.nears - r.nearsB; r.nearsB = r.nears;
    st.bestT = Math.max(st.bestT, r.t);
    if (r.diff === 'infernal') st.infT = Math.max(st.infT, r.t);
    st.mul = Math.max(st.mul, r.mul); st.bestScore = Math.max(st.bestScore, score);
    st.still = Math.max(st.still, r.still); st.noCookie = Math.max(st.noCookie, r.noCookie);

    var record = score > (st.best[this.modeKey] || 0);
    if (record) st.best[this.modeKey] = score;

    // Classement : les 10 meilleures parties de chaque difficulté
    var list = S.runs[r.diff] || (S.runs[r.diff] = []);
    for (var k = list.length - 1; k >= 0; k--) if (list[k].id === r.id) list.splice(k, 1);
    var rec = {
      id: r.id, score: score, t: Math.round(r.t), diff: r.diff, dur: r.dur, endless: !r.dur || r.endless,
      won: r.won, result: result, cause: r.cause, cookies: r.cookies, mul: Math.round(r.mul * 10) / 10,
      date: Date.now(), skin: eq.skin, color: eq.color, pseudo: S.settings.pseudo, title: eq.title,
      samples: r.samples.slice(), sInt: r.sInt
    };
    if (score > 0) list.push(rec);
    list.sort(function (a, b) { return b.score - a.score; });
    list.length = Math.min(10, list.length);
    var rank = list.indexOf(rec) + 1;

    this.lastRun = { earned: r.paid, record: record, best: st.best[this.modeKey] || 0, score: score, rank: rank, diff: r.diff };
    save.commit();
    G.ach.check(r);
    return this.lastRun;
  };

  Game.prototype.endInfo = function (title, message) {
    var run = this.lastRun;
    return {
      title: title, message: message, score: run.score, best: run.best, record: run.record, earned: run.earned,
      time: mmss(this.t), rank: run.rank, diff: run.diff
    };
  };

  Game.prototype.win = function () {
    this.state = 'won';
    this.unlock();
    document.body.classList.remove('playing');
    this.bank('win');
    audio.win();
    ui.setEffects([]);
    var self = this;
    setTimeout(function () {
      if (self.state === 'won') ui.showEnd('win', self.endInfo('ACCÈS ROOT OBTENU', 'Page chargée à 100 % : tu as atteint le bas du site. Système piraté !'));
    }, 600);
  };

  Game.prototype.die = function (item) {
    var self = this;
    this.state = 'dying';
    this.unlock();
    document.body.classList.remove('playing');
    item.el.classList.add('hit');
    this.playerEl.classList.add('dead');
    if (this.opt.shake) {
      this.stage.classList.remove('shake');
      void this.stage.offsetWidth;
      this.stage.classList.add('shake');
    }
    var f = document.getElementById('flash');
    f.classList.remove('cyan', 'go'); void f.offsetWidth; f.classList.add('go');
    audio.die();
    ui.setEffects([]);

    this.rec.cause = item.type;
    save.data.stats.deaths[item.type] = (save.data.stats.deaths[item.type] || 0) + 1;
    this.bank('death');
    var msg = (WD.death[item.type] || 'Tu as touché quelque chose.').replace('{label}', item.label || '');
    var title = WD.overTitles[Math.floor(Math.random() * WD.overTitles.length)];
    setTimeout(function () {
      if (self.state !== 'dying') return;
      self.state = 'over';
      ui.showEnd('over', self.endInfo(title, msg));
    }, 800);
  };

  /* --- Affichage -------------------------------------------------------- */
  Game.prototype.render = function () {
    this.world.style.transform = 'translate3d(0,' + (this.H + this.scroll) + 'px,0)';
    this.playerEl.style.transform = 'translate3d(' + this.px + 'px,' + this.py + 'px,0)';
    this.playerEl.classList.toggle('ghost', this.state === 'playing' && this.grace > 0);
    this.playerEl.classList.toggle('shielded', this.shield > 0 && (this.state === 'playing' || this.state === 'paused'));
    var cls = this.playerEl.className;
    if (cls !== this._cls) { this._cls = cls; this.wrapEl.className = cls.replace(/\bhidden\b/, '').trim(); }
    var edge = this.W - 30, shown = this.state !== 'menu' && this.isWrap() && (this.px < 30 || this.px > edge);
    if (shown) {
      this.wrapEl.style.display = 'block';
      this.wrapEl.style.transform = 'translate3d(' + (this.px < 30 ? this.px + this.W : this.px - this.W) + 'px,' + this.py + 'px,0)';
    } else if (this.wrapEl.style.display !== 'none') this.wrapEl.style.display = 'none';
    if (this.state === 'playing') {
      var progress = this.endless ? (this.t % C.curveLen) / C.curveLen : Math.min(1, this.t / C.duration);
      ui.setHud({
        score: this.score(), speed: this.speed / 100,
        stage: this.endless ? String(this.stageNo) : this.stageNo + '/10',
        time: mmss(this.endless ? this.t : C.duration - this.t),
        cookies: this.cookies, progress: progress
      });
      var list = [];
      if (this.shield > 0) list.push({ id: 'shield', label: 'Pare-feu' + (this.shield > 1 ? ' ×' + this.shield : ''), pct: 1 });
      if (this.fx.slow > 0) list.push({ id: 'slow', label: 'Wi-Fi lent', pct: this.fx.slow / this.fxMax.slow });
      if (this.fx.adblock > 0) list.push({ id: 'adblock', label: 'Ad-block', pct: this.fx.adblock / this.fxMax.adblock });
      ui.setEffects(list);
    }
  };

  Game.prototype.frame = function (now) {
    var dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    // Sous-pas : évite de « sauter » par-dessus un bloc quand le jeu rame
    var rem = dt;
    while (rem > 1e-6) {
      var s = Math.min(rem, 1 / 120);
      this.update(s);
      rem -= s;
    }
    this.render();
    G.trail.step(dt, this.px, this.py, this.state === 'playing', save.data.settings.trails);
    requestAnimationFrame(this._frame);
  };

  Game.prototype.run = function () {
    var self = this;
    requestAnimationFrame(function (t) { self.last = t; self._frame(t); });
  };

  G.Game = Game;
})();
