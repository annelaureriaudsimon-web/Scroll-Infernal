/* ==========================================================================
   admin-charts.js — petits graphiques SVG sans dépendance, pour admin.html.

   Règles appliquées (méthode « dataviz ») :
     • traits fins : lignes de 2 px, colonnes de 24 px maximum, bout arrondi (4 px) seulement
       côté données, base droite ; 2 px de vide entre les segments d'une pile ;
     • points d'extrémité de 8 px avec un anneau de 2 px de la couleur du fond ;
     • quadrillage et axes : un trait fin, plein, discret ; jamais de nombre sur chaque point
       (seulement le maximum / la dernière valeur) ;
     • survol : un repère vertical suit le pointeur, UNE infobulle donne toutes les séries ;
       le clavier fonctionne aussi (flèches gauche/droite sur le graphique) ;
     • le texte reste dans les couleurs de texte : la couleur est portée par la marque à côté.
   Les noms (joueurs, causes…) sont des données non fiables : toujours textContent.
   ========================================================================== */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var nf = new Intl.NumberFormat('fr-FR');
  var cf = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // couleur = jeton CSS (--zen, --accent…) : posée par le CSSOM (compatible avec la CSP stricte de la page)
  function paint(node, prop, token) { node.style.setProperty(prop, 'var(--' + token + ')'); }
  function niceStep(x) {
    if (x <= 0) return 1;
    var e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  function ticks(max, n) {
    var step = Math.max(1, niceStep(Math.max(1, max) / n)), out = [0];
    while (out[out.length - 1] < max && out.length < 14) out.push(Math.round((out[out.length - 1] + step) * 100) / 100);
    return out;
  }

  /* ----- infobulle unique ----- */
  var tipEl = null;
  var Tip = {
    show: function (cx, cy, node) {
      tipEl = tipEl || document.getElementById('tip');
      if (!tipEl) return;
      tipEl.textContent = ''; tipEl.appendChild(node); tipEl.hidden = false;
      var w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
      var x = cx + 14, y = cy + 14;
      if (x + w > vw - 8) x = cx - w - 14;
      if (x < 8) x = 8;
      if (y + h > vh - 8) y = cy - h - 14;
      if (y < 8) y = 8;
      tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
    },
    hide: function () { if (tipEl) tipEl.hidden = true; }
  };
  function tipBox(head, main, unit, rows) {
    var box = el('div');
    box.appendChild(el('div', 'th', head));
    if (main != null) { var tm = el('div', 'tm', main); if (unit) tm.appendChild(el('small', null, ' ' + unit)); box.appendChild(tm); }
    (rows || []).forEach(function (r) {
      var row = el('div', 'tr');
      row.appendChild(el('span', 'k-line c-' + r.color));
      row.appendChild(el('b', null, r.value));
      row.appendChild(el('span', 'n', r.name));
      box.appendChild(row);
    });
    return box;
  }
  function topRound(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function frame(host, o, m) {
    host.textContent = '';
    var W = Math.max(260, Math.floor(host.clientWidth || 600)), H = o.height || 220;
    var svg = S('svg', { 'class': 'chart', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', tabindex: 0, 'aria-label': o.aria || '' }, host);
    return { svg: svg, W: W, H: H, pw: W - m.l - m.r, ph: H - m.t - m.b, base: H - m.b };
  }
  function yAxis(svg, f, m, tk, top, fmt) {
    tk.forEach(function (v) {
      var y = f.base - f.ph * v / top;
      S('line', { 'class': v === 0 ? 'axis' : 'grid', x1: m.l, x2: f.W - m.r, y1: y, y2: y }, svg);
      var t = S('text', { 'class': 'tick', x: m.l - 7, y: y + 4, 'text-anchor': 'end' }, svg);
      t.textContent = fmt ? fmt(v) : cf.format(v);
    });
  }

  /* ==========================================================================
     Colonnes (empilées si plusieurs séries) : parties par jour, heures, scores…
     o.data   : [{ xl: étiquette d'axe, tl: titre d'infobulle, v: { clé: nombre } }]
     o.series : [{ key, name, color }]      o.hidden : { clé: true } séries masquées
     ========================================================================== */
  function columns(host, o) {
    var data = o.data || [], n = data.length;
    var m = { t: 20, r: 8, b: 26, l: 40 };
    var f = frame(host, o, m), svg = f.svg;
    if (!n) return;
    var vis = o.series.filter(function (s) { return !(o.hidden && o.hidden[s.key]); });
    var totals = data.map(function (d) { return vis.reduce(function (a, s) { return a + (d.v[s.key] || 0); }, 0); });
    var maxV = Math.max.apply(null, totals.concat([1]));
    var tk = ticks(maxV, 4), top = tk[tk.length - 1];
    var slot = f.pw / n, bw = Math.max(1.5, Math.min(24, slot * 0.72));
    yAxis(svg, f, m, tk, top, o.yfmt);

    var every = Math.max(1, Math.ceil((o.xgap || 64) / slot));
    data.forEach(function (d, i) {
      if (i % every) return;
      var t = S('text', { 'class': 'tick', x: m.l + (i + 0.5) * slot, y: f.H - 8, 'text-anchor': 'middle' }, svg);
      t.textContent = d.xl || '';
    });

    var band = S('rect', { 'class': 'band', y: m.t, height: f.ph, width: slot, visibility: 'hidden' }, svg);
    var bars = S('g', null, svg), groups = [];
    data.forEach(function (d, i) {
      var g = S('g', { 'class': 'bk' }, bars); groups.push(g);
      var x = m.l + i * slot + (slot - bw) / 2, cursor = f.base, last = -1, below = false;
      vis.forEach(function (s, k) { if ((d.v[s.key] || 0) > 0) last = k; });
      vis.forEach(function (s, k) {
        var v = d.v[s.key] || 0;
        if (v <= 0) return;
        var full = f.ph * v / top, h = Math.max(1.5, full - (below ? 2 : 0)), y = cursor - full, node;
        if (k === last && bw >= 7 && h >= 4) node = S('path', { d: topRound(x, y, bw, h, 4) }, g);
        else node = S('rect', { x: x, y: y, width: bw, height: h }, g);
        paint(node, 'fill', s.color);
        cursor -= full; below = true;
      });
    });
    var pk = totals.indexOf(Math.max.apply(null, totals));
    if (n > 1 && totals[pk] > 0) {                       // un seul chiffre sur le graphique : le maximum
      var lab = S('text', { 'class': 'dlabel', x: m.l + (pk + 0.5) * slot, y: Math.max(11, f.base - f.ph * totals[pk] / top - 5), 'text-anchor': 'middle' }, svg);
      lab.textContent = nf.format(totals[pk]);
    }
    var cross = S('line', { 'class': 'cross', y1: m.t, y2: f.base, visibility: 'hidden' }, svg);
    var hit = S('rect', { x: m.l, y: m.t - 8, width: f.pw, height: f.ph + 8, fill: 'transparent' }, svg);

    var cur = -1;
    function hide() {
      Tip.hide(); band.setAttribute('visibility', 'hidden'); cross.setAttribute('visibility', 'hidden');
      if (cur >= 0 && groups[cur]) groups[cur].classList.remove('hot');
      cur = -1;
    }
    function show(i, cx, cy) {
      if (cur >= 0 && groups[cur]) groups[cur].classList.remove('hot');
      cur = i; groups[i].classList.add('hot');
      var bx = m.l + i * slot;
      band.setAttribute('x', bx); band.setAttribute('visibility', 'visible');
      cross.setAttribute('x1', bx + slot / 2); cross.setAttribute('x2', bx + slot / 2); cross.setAttribute('visibility', 'visible');
      var d = data[i], rows = vis.length > 1 ? vis.slice().reverse().map(function (s) { return { color: s.color, value: nf.format(d.v[s.key] || 0), name: s.name }; }) : [];
      Tip.show(cx, cy, tipBox(d.tl || d.xl, nf.format(totals[i]), Array.isArray(o.unit) ? (totals[i] < 2 ? o.unit[0] : o.unit[1]) : (o.unit || ''), rows));
    }
    function idxFrom(ev) { var r = hit.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - r.left) / slot))); }
    function at(i) { var r = svg.getBoundingClientRect(); show(i, r.left + m.l + (i + 0.5) * slot, r.top + m.t + 24); }
    ['pointermove', 'pointerdown'].forEach(function (t) { hit.addEventListener(t, function (ev) { show(idxFrom(ev), ev.clientX, ev.clientY); }); });
    hit.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', function () { at(cur < 0 ? n - 1 : cur); });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (ev) {
      var k = ev.key, i = cur < 0 ? n - 1 : cur;
      if (k === 'ArrowLeft') i = Math.max(0, i - 1); else if (k === 'ArrowRight') i = Math.min(n - 1, i + 1);
      else if (k === 'Home') i = 0; else if (k === 'End') i = n - 1; else if (k === 'Escape') { hide(); return; } else return;
      ev.preventDefault(); at(i);
    });
  }

  /* ==========================================================================
     Courbes (une ou plusieurs séries sur UN seul axe).
     o.data   : [{ xl, tl, v: { clé: nombre | null } }]
     o.series : [{ key, name, color, area?, label? }]   label : écrit la dernière valeur au bout de la courbe
     o.gapZero : les zéros sont des « pas de données » (la courbe s'interrompt)
     ========================================================================== */
  function lines(host, o) {
    var data = o.data || [], n = data.length, series = o.series;
    var m = { t: 16, r: series.some(function (s) { return s.label; }) ? 50 : 14, b: 26, l: 44 };
    var f = frame(host, o, m), svg = f.svg;
    if (!n) return;
    var isGap = function (v) { return v == null || (o.gapZero && v === 0); };
    var vals = [];
    data.forEach(function (d) { series.forEach(function (s) { if (!isGap(d.v[s.key])) vals.push(d.v[s.key]); }); });
    var maxV = Math.max.apply(null, vals.concat([1])), tk = ticks(maxV, 4), top = tk[tk.length - 1];
    var xs = function (i) { return n === 1 ? m.l + f.pw / 2 : m.l + f.pw * i / (n - 1); };
    var ys = function (v) { return f.base - f.ph * v / top; };
    yAxis(svg, f, m, tk, top, o.yfmt);
    var every = Math.max(1, Math.ceil((o.xgap || 72) / (n > 1 ? f.pw / (n - 1) : f.pw)));
    data.forEach(function (d, i) {
      if (i % every) return;
      var t = S('text', { 'class': 'tick', x: xs(i), y: f.H - 8, 'text-anchor': i === 0 && n > 3 ? 'start' : 'middle' }, svg);
      t.textContent = d.xl || '';
    });
    var cross = S('line', { 'class': 'cross', y1: m.t, y2: f.base, visibility: 'hidden' }, svg);

    series.forEach(function (s) {
      var segs = [], seg = null;
      data.forEach(function (d, i) {
        var v = d.v[s.key];
        if (isGap(v)) { seg = null; return; }
        if (!seg) { seg = []; segs.push(seg); }
        seg.push([xs(i), ys(v), v]);
      });
      segs.forEach(function (pts) {
        if (pts.length > 1) {
          var dstr = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
          if (s.area) {
            var a = S('path', { d: dstr + 'L' + pts[pts.length - 1][0].toFixed(1) + ',' + f.base + 'L' + pts[0][0].toFixed(1) + ',' + f.base + 'Z', opacity: 0.1 }, svg);
            paint(a, 'fill', s.color);
          }
          var p = S('path', { d: dstr, fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
          paint(p, 'stroke', s.color);
        }
      });
      var lastSeg = segs[segs.length - 1];
      if (lastSeg) {                                      // point d'extrémité : 8 px + anneau de 2 px couleur du fond
        var lp = lastSeg[lastSeg.length - 1];
        S('circle', { 'class': 'ring', cx: lp[0], cy: lp[1], r: 6 }, svg);
        var dot = S('circle', { cx: lp[0], cy: lp[1], r: 4 }, svg); paint(dot, 'fill', s.color);
        if (s.label) {
          var lt = S('text', { 'class': 'dlabel', x: lp[0] + 10, y: lp[1] + 4 }, svg);
          lt.textContent = cf.format(lp[2]);
        }
      }
    });

    var marks = series.map(function (s) {
      var ring = S('circle', { 'class': 'ring', r: 6, visibility: 'hidden' }, svg);
      var dot = S('circle', { r: 4, visibility: 'hidden' }, svg); paint(dot, 'fill', s.color);
      return { ring: ring, dot: dot };
    });
    var hit = S('rect', { x: m.l - 6, y: m.t - 8, width: f.pw + 12, height: f.ph + 8, fill: 'transparent' }, svg);
    var cur = -1;
    function hide() {
      Tip.hide(); cross.setAttribute('visibility', 'hidden');
      marks.forEach(function (k) { k.ring.setAttribute('visibility', 'hidden'); k.dot.setAttribute('visibility', 'hidden'); });
      cur = -1;
    }
    function show(i, cx, cy) {
      cur = i;
      cross.setAttribute('x1', xs(i)); cross.setAttribute('x2', xs(i)); cross.setAttribute('visibility', 'visible');
      var d = data[i], rows = [];
      series.forEach(function (s, k) {
        var v = d.v[s.key], g = isGap(v);
        marks[k].ring.setAttribute('visibility', g ? 'hidden' : 'visible'); marks[k].dot.setAttribute('visibility', g ? 'hidden' : 'visible');
        if (!g) { marks[k].ring.setAttribute('cx', xs(i)); marks[k].ring.setAttribute('cy', ys(v)); marks[k].dot.setAttribute('cx', xs(i)); marks[k].dot.setAttribute('cy', ys(v)); }
        rows.push({ color: s.color, value: g ? '—' : (o.vfmt ? o.vfmt(v) : nf.format(v)), name: s.name });
      });
      Tip.show(cx, cy, tipBox(d.tl || d.xl, null, '', rows));
    }
    function idxFrom(ev) {
      var r = hit.getBoundingClientRect(), x = ev.clientX - (r.left + 6);
      return n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(x / (f.pw / (n - 1)))));
    }
    function at(i) { var r = svg.getBoundingClientRect(); show(i, r.left + xs(i), r.top + m.t + 24); }
    ['pointermove', 'pointerdown'].forEach(function (t) { hit.addEventListener(t, function (ev) { show(idxFrom(ev), ev.clientX, ev.clientY); }); });
    hit.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', function () { at(cur < 0 ? n - 1 : cur); });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (ev) {
      var k = ev.key, i = cur < 0 ? n - 1 : cur;
      if (k === 'ArrowLeft') i = Math.max(0, i - 1); else if (k === 'ArrowRight') i = Math.min(n - 1, i + 1);
      else if (k === 'Home') i = 0; else if (k === 'End') i = n - 1; else if (k === 'Escape') { hide(); return; } else return;
      ev.preventDefault(); at(i);
    });
  }

  /* ----- mini-courbe d'une tuile (gris discret, point actuel en accent) ----- */
  function spark(host, values) {
    host.textContent = '';
    var W = 96, H = 28, svg = S('svg', { 'class': 'spark', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, host);
    if (!values || !values.length) return;
    var mn = Math.min.apply(null, values), mx = Math.max.apply(null, values), span = mx - mn || 1;
    var pts = values.map(function (v, i) { return [values.length === 1 ? W / 2 : 3 + (W - 6) * i / (values.length - 1), mx === mn ? H - 4 : H - 4 - (H - 8) * (v - mn) / span]; });
    S('path', { 'class': 'ln', d: pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('') }, svg);
    var l = pts[pts.length - 1];
    S('circle', { 'class': 'dot', cx: l[0], cy: l[1], r: 2.8 }, svg);
  }

  window.AdminCharts = { columns: columns, lines: lines, spark: spark, Tip: Tip, nf: nf, cf: cf, ticks: ticks };
})();
