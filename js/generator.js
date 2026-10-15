/* ==========================================================================
   generator.js — fabrique le site web « rangée par rangée ».

   Chaque rangée (bande) contient des éléments dangereux (boutons, cartes,
   pubs…) et 1 ou 2 TROUS où la souris peut passer. Le trou « principal »
   de chaque rangée est toujours atteignable depuis celui de la rangée
   précédente, compte tenu de la vitesse : le jeu est donc toujours jouable.

   Les positions horizontales sont stockées en fractions de la largeur
   (0..1) pour s'adapter si la fenêtre est redimensionnée.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var C = G.CONFIG, TH = G.THEMES, WD = G.WORDS;

  var GUTTER = 8; // espace entre deux éléments voisins (< diamètre de la souris : infranchissable)

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function mk(type, cls, label, html, hue) { return { type: type, cls: cls, label: label, html: html, hue: hue || 0 }; }

  /* --- Fabriques d'éléments (une par type de rangée) ------------------- */
  var BUILD = {
    nav: function (r, th, w, h, i) {
      if (i === 0 && w >= 120 && r() < 0.6) return mk('logo', 'it-logo', th.name, '<span class="mark"></span><span class="nm">' + th.name + '</span>');
      var l = pick(r, WD.nav);
      if (r() < 0.18) return BUILD.btn(w, l, 1);
      return mk('link', 'it-link', l, l);
    },
    btn: function (w, label, v) {
      return mk('button', 'it-button v' + v, label, '<span class="lb">' + label + '</span>' + (w >= 130 ? '<span class="arr">›</span>' : ''));
    },
    buttons: function (r, th, w) {
      return BUILD.btn(w, pick(r, WD.buttons), 1 + Math.floor(r() * 3));
    },
    cards: function (r, th) {
      var t = pick(r, th.titles), hue = Math.floor(r() * 90 - 45), row, badge = '';
      if (th.cardRow === 'price') {
        row = '<span class="price">' + (5 + Math.floor(r() * 190)) + ',' + pick(r, ['00', '50', '90', '99']) + ' €</span>' +
              '<span class="stars">' + pick(r, ['★★★★★', '★★★★☆', '★★★☆☆']) + '</span>';
        if (r() < 0.45) badge = '<span class="badge">-' + (10 + 10 * Math.floor(r() * 6)) + '%</span>';
      } else {
        row = '<span class="tag">' + pick(r, th.tags) + '</span><span class="read">' + (2 + Math.floor(r() * 9)) + ' min</span>';
      }
      return mk('card', 'it-card', t,
        '<div class="thumb v' + Math.floor(r() * 3) + '" style="filter:hue-rotate(' + hue + 'deg)"><span class="sh a"></span><span class="sh b"></span></div>' +
        badge + '<div class="meta"><b>' + t + '</b><div class="row">' + row + '</div></div>');
    },
    text: function (r, th, w, h) {
      var t = pick(r, th.titles), lines = Math.max(1, Math.floor((h - 44) / 17)), kick = '';
      if (h >= 100) { kick = '<span class="kicker">' + pick(r, th.tags || ['À la une', 'Nouveau']) + '</span>'; lines = Math.max(1, lines - 1); }
      return mk('text', 'it-text', t, kick + '<b>' + t + '</b><p style="-webkit-line-clamp:' + lines + '">' + pick(r, WD.snippets) + ' ' + pick(r, WD.snippets) + '</p>');
    },
    hero: function (r, th, w, h) {
      if (w < 240) return BUILD.gallery(r, th, w, h);
      var t = pick(r, th.titles), big = h >= 150;
      return mk('hero', 'it-hero', t,
        '<span class="blob b1"></span><span class="blob b2"></span>' +
        (big ? '<span class="kicker">' + pick(r, th.tags || ['Nouveau']) + '</span>' : '') +
        '<b class="h1">' + t + '</b>' + (big ? '<p>' + pick(r, WD.snippets) + '</p>' : '') +
        '<span class="cta">' + pick(r, WD.ctas) + '</span>');
    },
    gallery: function (r, th) {
      if (r() < 0.22) {
        return mk('video', 'it-video', 'vidéo', '<span class="play"></span><span class="vbar"><span></span></span><span class="time">0:' + (10 + Math.floor(r() * 49)) + '</span>');
      }
      var sc = pick(r, ['sunset', 'day', 'night', 'abs']), t = pick(r, th.titles);
      return mk('image', 'it-image', t,
        '<span class="scene sc-' + sc + '" style="filter:hue-rotate(' + Math.floor(r() * 50 - 25) + 'deg)"><span class="sun"></span><span class="m m1"></span><span class="m m2"></span></span>' +
        '<span class="cap">' + t + '</span>');
    },
    form: function (r, th, w) {
      if (r() < 0.3) return BUILD.btn(w, pick(r, WD.buttons), 1);
      var p = pick(r, WD.inputs);
      return mk('input', 'it-input', p, '<span class="ph">' + p + '</span><span class="caret"></span><span class="go">→</span>');
    },
    ads: function (r, th, w, h) {
      if (w >= 170 && r() < 0.35) {
        var t = pick(r, WD.popups);
        return mk('popup', 'it-popup', t,
          '<header><span class="tl"><i></i><i></i><i></i></span><b>' + t + '</b><u>×</u></header>' +
          '<div class="body">' + (h >= 98 ? '<p>' + pick(r, WD.snippets) + '</p>' : '') + '<span class="cta">S’abonner</span></div>');
      }
      var a = pick(r, WD.ads);
      return mk('ad', 'it-ad', a, '<small>PUB</small><b>' + a + '</b><span class="go">GO !</span>');
    },
    footer: function (r, th, w, h) {
      var t = pick(r, WD.cols), n = Math.max(1, Math.min(4, Math.floor((h - 48) / 21))), links = '';
      for (var i = 0; i < n; i++) links += '<em>' + pick(r, WD.colLinks) + '</em>';
      return mk('col', 'it-col', t, '<b>' + t + '</b>' + links);
    },
    cookie: function (r) {
      var t = pick(r, WD.cookies);
      return mk('cookie', 'it-cookie', t, '<span class="ck"></span><span class="tx">' + t + '</span><span class="cta">Accepter</span>');
    }
  };

  /* --- Types de rangées ------------------------------------------------- */
  // h: hauteur de la rangée, avgW/minW: largeur moyenne/minimale d'un élément,
  // from: temps de jeu (s) à partir duquel la rangée peut apparaître, w: poids, vary: hauteurs variables
  var KINDS = {
    nav:     { h: [46, 58],   avgW: 130, minW: 60,  from: 0,  w: 3, vary: false },
    buttons: { h: [50, 70],   avgW: 150, minW: 90,  from: 0,  w: 4, vary: false },
    cards:   { h: [120, 170], avgW: 230, minW: 120, from: 0,  w: 4, vary: true },
    text:    { h: [84, 130],  avgW: 260, minW: 140, from: 0,  w: 3, vary: true },
    hero:    { h: [130, 190], avgW: 380, minW: 220, from: 20,  w: 2, vary: false },
    gallery: { h: [100, 150], avgW: 200, minW: 100, from: 40, w: 3, vary: true },
    form:    { h: [50, 62],   avgW: 210, minW: 130, from: 60, w: 2, vary: false },
    ads:     { h: [70, 110],  avgW: 240, minW: 150, from: 90, w: 3, vary: false },
    footer:  { h: [100, 140], avgW: 180, minW: 110, from: 120, w: 2, vary: true },
    cookie:  { h: [60, 80],   avgW: 330, minW: 230, from: 150, w: 2, vary: false }
  };

  /* --- Générateur ------------------------------------------------------- */
  function Generator(seed) {
    this.seed = seed;
    this.rnd = mulberry32(seed);
    this.themeIdx = Math.floor(this.rnd() * TH.length);
    this.lastKind = '';
    this.prev = null;
    this.pageLeft = 0;
    this.pageId = 0;
    this.newPage(true);
  }

  Generator.prototype.newPage = function (first) {
    var r = this.rnd, n;
    if (!first) {
      do { n = Math.floor(r() * TH.length); } while (n === this.themeIdx);
      this.themeIdx = n;
    }
    var th = TH[this.themeIdx];
    this.pageLeft = 12 + Math.floor(r() * 8);
    this.url = th.domain + '/' + pick(r, th.paths);
    this.pageId++;
    this.pageStart = true;
  };

  Generator.prototype.pickKind = function (t) {
    var r = this.rnd, last = this.lastKind;
    var pool = Object.keys(KINDS).filter(function (k) { return KINDS[k].from <= t && k !== last; });
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += KINDS[pool[i]].w;
    var x = r() * total;
    for (i = 0; i < pool.length; i++) {
      x -= KINDS[pool[i]].w;
      if (x <= 0) return (this.lastKind = pool[i]);
    }
    return (this.lastKind = pool[pool.length - 1]);
  };

  // Section d'introduction : vide, pour laisser le temps de se placer.
  Generator.prototype.intro = function (W, H) {
    var th = TH[this.themeIdx];
    var sec = {
      kind: 'intro', theme: th, url: this.url, pageId: this.pageId, pageStart: true,
      h: Math.round(H * C.introRatio), bandH: 0, items: [], gaps: [], pickups: []
    };
    this.pageStart = false;
    return sec;
  };

  // Remplit une zone horizontale [x0, x1] (en px) avec des éléments.
  Generator.prototype.fillZone = function (kind, th, x0, x1, bandH, W, out) {
    var r = this.rnd, def = KINDS[kind];
    var zw = x1 - x0;
    if (zw < 14) return; // trop étroit : on l'ajoute au trou voisin
    if (zw < def.minW) {
      out.push(this.place(mk('rail', 'it-rail', '', '<span></span>'), x0, zw, bandH, W));
      return;
    }
    var n = Math.max(1, Math.round(zw / def.avgW));
    n = Math.min(n, Math.floor((zw + GUTTER) / (def.minW + GUTTER)));
    n = Math.max(1, n);
    var usable = zw - GUTTER * (n - 1);
    var extra = usable - n * def.minW;
    var weights = [], sum = 0, i;
    for (i = 0; i < n; i++) { weights[i] = 0.5 + r(); sum += weights[i]; }
    var cx = x0;
    for (i = 0; i < n; i++) {
      var w = def.minW + extra * weights[i] / sum;
      var h = def.vary ? Math.round(bandH * (0.78 + 0.22 * r())) : bandH;
      var item = BUILD[kind](r, th, w, h, i);
      out.push(this.place(item, cx, w, h, W));
      cx += w + GUTTER;
    }
  };

  Generator.prototype.place = function (item, x, w, h, W) {
    item.x = x / W; item.w = w / W; item.y = 0; item.h = Math.round(h);
    return item;
  };

  Generator.prototype.next = function (ctx) {
    var r = this.rnd, W = ctx.W, t = ctx.t;
    if (this.pageLeft <= 0) this.newPage(false);
    this.pageLeft--;
    var th = TH[this.themeIdx];
    var kind = this.pickKind(t), def = KINDS[kind];
    var bandH = Math.round(lerp(def.h[0], def.h[1], r()));

    // Espace vide sous la rangée (entre elle et la rangée précédente)
    var speedArr = C.speedAt(t + 3);
    var spacing = Math.round(clamp(speedArr * C.spacingRatio(t), C.minSpacing, C.maxSpacing));

    // Trous
    var nGaps = C.gapCount(t, r);
    var base = C.gapWidth(t) * (0.85 + r() * 0.4);
    base = Math.max(C.minGap, Math.min(base, W * 0.46));
    var gw = nGaps === 2 ? Math.max(C.minGap, base * 0.8) : base;

    // Position du trou principal : atteignable depuis celui de la rangée précédente
    var cx;
    if (this.prev) {
      var travelTime = (spacing - 2 * C.hitRadius) / speedArr;
      var reach = (this.prev.gw + gw) / 2 + C.playerAbility * travelTime * 0.55;
      var pc = this.prev.cxF * W;
      var lo = Math.max(gw / 2, pc - reach), hi = Math.min(W - gw / 2, pc + reach);
      cx = hi >= lo ? lo + (hi - lo) * r() : W / 2;
    } else {
      cx = W * (0.3 + 0.4 * r());
    }
    cx = clamp(cx, gw / 2, Math.max(gw / 2, W - gw / 2));

    var gaps = [{ c: cx, w: gw, primary: true }];
    if (nGaps === 2) {
      for (var k = 0; k < 8; k++) {
        var c2 = gw / 2 + r() * Math.max(0, W - gw);
        if (Math.abs(c2 - cx) >= gw + 90) { gaps.push({ c: c2, w: gw, primary: false }); break; }
      }
    }
    gaps.sort(function (a, b) { return a.c - b.c; });
    this.prev = { cxF: cx / W, gw: gw };

    // Zones remplies = tout ce qui n'est pas un trou
    var items = [], pos = 0, i;
    for (i = 0; i < gaps.length; i++) {
      var gx0 = Math.max(0, gaps[i].c - gaps[i].w / 2), gx1 = Math.min(W, gaps[i].c + gaps[i].w / 2);
      this.fillZone(kind, th, pos, gx0, bandH, W, items);
      gaps[i].x0 = gx0 / W; gaps[i].x1 = gx1 / W;
      pos = gx1;
    }
    this.fillZone(kind, th, pos, W, bandH, W, items);

    // Cookies (monnaie de la boutique) et bonus à ramasser
    var pickups = [], second = null;
    for (i = 0; i < gaps.length; i++) if (!gaps[i].primary) second = gaps[i];
    if (r() < 0.45) pickups.push({ type: 'cookie', x: cx / W, y: Math.round(bandH / 2) });
    if (second && r() < 0.3) pickups.push({ type: 'cookie', x: second.c / W, y: Math.round(bandH / 2) });
    if (r() < 0.22) pickups.push({ type: 'cookie', x: 0.08 + 0.84 * r(), y: Math.round(bandH + spacing * 0.5) }); // appât : demande un petit détour
    if (t > 20 && r() < 0.03) pickups.push({ type: 'power-' + pick(r, ['shield', 'slow', 'adblock']), x: cx / W, y: Math.round(bandH + spacing * 0.45) });

    var sec = {
      kind: kind, theme: th, url: this.url, pageId: this.pageId, pageStart: this.pageStart,
      h: bandH + spacing, bandH: bandH, items: items, gaps: gaps, pickups: pickups
    };
    this.pageStart = false;
    return sec;
  };

  G.Generator = Generator;
})();
