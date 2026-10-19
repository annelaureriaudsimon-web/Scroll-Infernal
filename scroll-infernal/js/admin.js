/* ==========================================================================
   admin.js — le tableau de bord (admin.html).

   Toutes les données viennent du SERVEUR par l'API privée /api/admin/… (cookie de
   session, mot de passe demandé). Rien n'est calculé ici à partir de fichiers locaux
   ni de chiffres inventés : on affiche ce que le serveur a vraiment enregistré.

   Les textes des joueurs (pseudos, messages…) sont des données NON fiables : on ne les
   insère jamais avec innerHTML, seulement avec textContent (voir h()).
   ========================================================================== */
(function () {
  'use strict';
  var C = window.AdminCharts, nf = C.nf, cf = C.cf;
  function $(id) { return document.getElementById(id); }

  /* ------------------------------ DOM ------------------------------ */
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(e, x); });
    else e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'hidden') e[k] = !!v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }

  /* ------------------------------ formats & libellés ------------------------------ */
  var DIFF_ORDER = ['zen', 'normal', 'infernal'];
  var DIFFS = { zen: 'Zen', normal: 'Normal', infernal: 'Infernal' };
  var RES = { win: ['✓', 'Victoire'], death: ['✕', 'Collision'], quit: ['⏸', 'Quittée'], abandon: ['…', 'Abandonnée'] };
  var CAUSE = { button: 'Bouton', link: 'Lien', logo: 'Logo', card: 'Carte', text: 'Bloc de texte', image: 'Image', video: 'Vidéo', input: 'Champ de saisie',
    ad: 'Publicité', popup: 'Pop-up', cookie: 'Bandeau cookies', col: 'Pied de page', hero: 'Grand titre', rail: 'Barre latérale', inconnu: 'Inconnue' };
  var DUR = { 0: 'Infini', 5: '5 min', 10: '10 min', 30: '30 min' };
  var REASON = {
    'too-fast': 'Durée annoncée supérieure au temps réellement écoulé',
    'score-implausible': 'Score incohérent avec la durée (hors de la courbe de vitesse du jeu)',
    'speed-implausible': 'Vitesse maximale incohérente',
    'win-early': 'Victoire annoncée avant la fin du niveau',
    'win-endless': 'Victoire annoncée en mode infini',
    'over-duration': 'Durée supérieure à celle du niveau',
    'endless-early': 'Mode infini annoncé sans avoir fini le niveau',
    'cookies-implausible': 'Nombre de cookies incohérent',
    mismatch: 'Difficulté ou durée différentes de celles du départ',
    range: 'Valeur hors limites', clock: 'Heure de départ incohérente', duplicate: 'Copie d’une partie déjà enregistrée'
  };
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(s) { s = Math.round(s || 0); var hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60); return (hh ? hh + ':' + p2(mm) : mm) + ':' + p2(s % 60); }
  function longDur(s) {
    s = Math.round(s || 0);
    if (s < 60) return s + ' s';
    if (s < 3600) return Math.floor(s / 60) + ' min ' + p2(s % 60) + ' s';
    var hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60);
    return hh + ' h ' + p2(mm) + ' min';
  }
  var fShort = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  var fFull = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'medium' });
  var fDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  var fDayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  function fdate(ms) { return ms ? fShort.format(ms) : '—'; }
  function ago(ms) {
    if (!ms) return '—';
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 45) return 'à l’instant';
    if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    return 'il y a ' + Math.round(s / 86400) + ' j';
  }
  function pct(x) { return (Math.round(x * 1000) / 10).toLocaleString('fr-FR') + ' %'; }
  function kb(n) { return n < 1024 ? n + ' o' : n < 1048576 ? (n / 1024).toFixed(1).replace('.', ',') + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo'; }
  function clock(ms) { var d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }

  /* petits éléments réutilisables */
  function tagDiff(d) { return h('span', { 'class': 'tag ' + d }, h('i'), DIFFS[d] || d); }
  function resEl(r) { var x = RES[r.result] || ['?', r.result]; return h('span', { 'class': 'res ' + r.result }, h('span', { 'aria-hidden': 'true' }, x[0]), x[1]); }
  function nameEl(r) {
    return h('span', null, r.name || '—', r.verified ? h('span', { 'class': 'st ok', title: 'Compte en ligne : pseudo vérifié par le serveur' }, ' ✓') : null);
  }
  function stEl(kind, text, title) { return h('span', { 'class': 'st ' + kind, title: title || null }, text); }
  function empty(title, text) { return h('div', { 'class': 'empty' }, h('b', null, title), text || ''); }

  /* ------------------------------ API ------------------------------ */
  function qs(o) {
    return Object.keys(o).filter(function (k) { return o[k] !== '' && o[k] != null && o[k] !== false; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k] === true ? '1' : o[k]); }).join('&');
  }
  function api(path, opt) {
    opt = opt || {};
    var init = { method: 'GET', credentials: 'same-origin', headers: { 'X-Admin': '1' }, cache: 'no-store' };
    if (opt.body !== undefined) { init.method = 'POST'; init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
    return fetch('api/admin/' + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        j.status = r.status;
        if (r.status === 401 && !opt.quiet) gateShow('Session expirée : reconnecte-toi.');
        return j;
      });
    }, function () { return { status: 0, ok: false, error: 'Serveur injoignable.' }; });
  }

  /* ------------------------------ état & préférences ------------------------------ */
  var S = {
    view: 'overview',
    ov: { days: 30, diff: '' },
    runs: { page: 1, size: 25, sort: 'date', dir: 'desc', q: '', diff: '', dur: '', result: '', status: '', verified: '', from: '', to: '', player: '', playerLabel: '' },
    top: { diff: '', dur: '', unique: true, days: 0 },
    players: { page: 1, size: 25, sort: 'lastSeen', dir: 'desc', q: '', type: '', blocked: false },
    notes: { page: 1, size: 20, status: '', q: '', player: '', playerLabel: '' },
    rej: { page: 1, size: 25 },
    hidden: {},
    auto: false
  };
  var PREF = 'scrollInfernal.admin.prefs.v1';
  try {
    var pr = JSON.parse(localStorage.getItem(PREF) || '{}');
    if (pr && typeof pr === 'object') {
      if ([1, 7, 30, 90, 0].indexOf(pr.days) >= 0) S.ov.days = pr.days;
      if (DIFFS[pr.diff]) S.ov.diff = pr.diff;
      S.auto = !!pr.auto;
    }
  } catch (e) { /* ignore */ }
  function savePrefs() { try { localStorage.setItem(PREF, JSON.stringify({ days: S.ov.days, diff: S.ov.diff, auto: S.auto })); } catch (e) { /* ignore */ } }

  /* ------------------------------ messages éclair ------------------------------ */
  var toastTimer = 0;
  function toast(msg, bad) {
    var t = $('toast'); t.textContent = msg; t.className = bad ? 'bad' : ''; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, bad ? 5000 : 3000);
  }

  /* ------------------------------ composants : tableau, pagination, carte de graphique ------------------------------ */
  function table(cols, rows, o) {
    o = o || {};
    var cards = cols.some(function (c) { return c.m; });          // c.m = rôle de la colonne dans la carte (téléphone) : a titre, b valeur, c/d/e ligne du bas, f ligne entière
    var head = h('tr', null, cols.map(function (c) {
      var th = h('th', { 'class': (c.num ? 'num ' : '') + (c.sort ? 'sortable ' : '') + (c.hide ? 'hide-sm' : ''), scope: 'col' }, c.t);
      if (c.sort && o.sort) {
        var on = o.sort.key === c.sort;
        th.tabIndex = 0; th.setAttribute('role', 'button');
        th.setAttribute('aria-sort', on ? (o.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
        if (on) th.appendChild(h('span', { 'class': 'ar', 'aria-hidden': 'true' }, o.sort.dir === 'asc' ? '▲' : '▼'));
        th.addEventListener('click', function () { o.onSort(c.sort); });
        th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onSort(c.sort); } });
      }
      return th;
    }));
    var body = h('tbody', null, rows.map(function (r) {
      var tr = h('tr', { 'class': (o.onRow ? 'clk ' : '') + (o.rowClass ? o.rowClass(r) : '') });
      cols.forEach(function (c) {
        var td = h('td', { 'class': (c.num ? 'num ' : '') + (c.hide ? 'hide-sm ' : '') + (c.m ? 'm-' + c.m + ' ' : '') + (c.cls || '') });
        add(td, c.render(r));
        tr.appendChild(td);
      });
      if (o.onRow) {
        tr.tabIndex = 0;
        tr.addEventListener('click', function (e) { if (!e.target.closest('button,a')) o.onRow(r); });
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target === tr) o.onRow(r); });
      }
      return tr;
    }));
    return h('div', { 'class': 'tbl-wrap' }, h('table', { 'class': 'tbl' + (cards ? ' cards' : '') }, h('thead', null, head), body));
  }

  function pager(p, onPage, onSize) {
    var from = p.total ? (p.page - 1) * p.size + 1 : 0, to = Math.min(p.total, p.page * p.size);
    function btn(label, aria, page, dis) { return h('button', { 'class': 'btn sm', type: 'button', disabled: dis, 'aria-label': aria, onclick: function () { onPage(page); } }, label); }
    return h('div', { 'class': 'pager' },
      h('span', null, p.total ? from + '–' + to + ' sur ' + nf.format(p.total) : 'Aucun résultat'),
      h('span', { 'class': 'sp' }),
      h('label', { 'class': 'help' }, 'Par page ',
        h('select', { 'aria-label': 'Lignes par page', onchange: function (e) { onSize(parseInt(e.target.value, 10)); } },
          [10, 25, 50, 100].map(function (n) { var o = h('option', { value: n }, String(n)); if (n === p.size) o.selected = true; return o; }))),
      btn('«', 'Première page', 1, p.page <= 1), btn('‹', 'Page précédente', p.page - 1, p.page <= 1),
      h('span', null, 'Page ' + p.page + ' / ' + p.pages),
      btn('›', 'Page suivante', p.page + 1, p.page >= p.pages), btn('»', 'Dernière page', p.pages, p.page >= p.pages));
  }

  var charts = [];                                   // graphiques à redessiner quand la fenêtre change de taille
  function chartCard(o) {
    var host = h('div', { 'class': 'chart-host' }), legend = h('ul', { 'class': 'legend' }), tbl = h('div', { hidden: true }), showTable = false, subEl = h('p', { 'class': 'sub' }, o.sub || '');
    legend.hidden = true;
    var tb = h('button', { 'class': 'tbtn', type: 'button', 'aria-pressed': 'false', title: 'Afficher les valeurs sous forme de tableau' }, 'Tableau');
    tb.addEventListener('click', function () {
      showTable = !showTable;
      tb.setAttribute('aria-pressed', String(showTable)); tb.textContent = showTable ? 'Graphique' : 'Tableau';
      host.hidden = showTable; tbl.hidden = !showTable; legend.hidden = showTable || !legend.firstChild;
      if (!showTable && me.fn) me.fn();
    });
    var card = h('div', { 'class': 'card' + (o.wide ? ' span2' : '') },
      h('div', { 'class': 'card-h' }, h('div', null, h('h3', null, o.title), subEl), h('span', { 'class': 'sp' }), o.noTable ? null : tb),
      legend, host, tbl);
    var me = {
      card: card, host: host, legend: legend, sub: subEl, fn: null,
      draw: function (fn) { me.fn = fn; if (!host.hidden) fn(); },
      setTable: function (cols, rows) {
        clear(tbl);
        tbl.appendChild(table(cols.map(function (c, i) { return { t: c, num: i > 0, render: function (r) { return r[i]; } }; }), rows));
      }
    };
    charts.push(me);
    return me;
  }
  var rzT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () { charts.forEach(function (c) { if (c.fn && c.host.offsetParent !== null && !c.host.hidden) c.fn(); }); }, 160);
  });

  function selectEl(id, label, opts, val, onchange) {
    var s = h('select', { id: id, 'aria-label': label, onchange: function (e) { onchange(e.target.value); } },
      opts.map(function (o) { var op = h('option', { value: o[0] }, o[1]); if (String(o[0]) === String(val)) op.selected = true; return op; }));
    return s;
  }
  var OPT_DIFF = [['', 'Toutes difficultés'], ['zen', 'Zen'], ['normal', 'Normal'], ['infernal', 'Infernal']];
  var OPT_DUR = [['', 'Tous niveaux'], ['0', 'Infini'], ['5', '5 min'], ['10', '10 min'], ['30', '30 min']];
  function segEl(opts, val, onpick, label) {
    var seg = h('div', { 'class': 'seg', role: 'group', 'aria-label': label });
    opts.forEach(function (o) {
      var b = h('button', { type: 'button', 'class': String(o[0]) === String(val) ? 'on' : '', 'aria-pressed': String(o[0]) === String(val), title: o[2] || null, 'aria-label': o[2] || null }, o[1]);
      b.addEventListener('click', function () { onpick(o[0]); });
      seg.appendChild(b);
    });
    return seg;
  }
  // Bouton « Filtres » : visible seulement sur téléphone, il déplie/replie les filtres secondaires
  function moreBtn(filters) {
    var b = h('button', { 'class': 'btn more', type: 'button', 'aria-expanded': 'false' }, 'Filtres');
    b.addEventListener('click', function () { var on = filters.classList.toggle('open'); b.setAttribute('aria-expanded', String(on)); });
    return b;
  }
  function setMore(b, n) { b.textContent = n ? 'Filtres · ' + n : 'Filtres'; }
  function debounce(fn, ms) { var t = 0; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
  function setBusy(view, on) { view.el.classList.toggle('refetch', !!on); }

  /* ------------------------------ panneau de détail (tiroir) ------------------------------ */
  var Drawer = { kind: '', id: '', timer: 0, last: null };
  Drawer.open = function (title, body, foot, kind, id) {
    var dr = $('drawer'), sc = $('scrim');
    Drawer.last = document.activeElement; Drawer.kind = kind || ''; Drawer.id = id || '';
    $('dr-title').textContent = title;
    Drawer.set(body, foot);
    sc.hidden = false; dr.hidden = false;
    requestAnimationFrame(function () { sc.classList.add('show'); dr.classList.add('show'); $('dr-close').focus(); });
  };
  Drawer.set = function (body, foot) {
    clear($('dr-body')).appendChild(body);
    var f = clear($('dr-foot')); f.hidden = !foot;
    if (foot) add(f, foot);
  };
  Drawer.close = function () {
    clearInterval(Drawer.timer); Drawer.timer = 0; Drawer.kind = ''; Drawer.id = '';
    var dr = $('drawer'), sc = $('scrim');
    if (dr.hidden) return;
    dr.classList.remove('show'); sc.classList.remove('show');
    setTimeout(function () { dr.hidden = true; sc.hidden = true; }, 230);
    try { if (Drawer.last && Drawer.last.focus) Drawer.last.focus(); } catch (e) { /* ignore */ }
  };
  $('dr-close').addEventListener('click', Drawer.close);
  $('scrim').addEventListener('click', Drawer.close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('drawer').hidden) Drawer.close(); });

  function kv(label, value) { return h('div', null, h('dt', null, label), h('dd', null, value)); }
  function reloadView() { var v = V[S.view]; if (v && v.load) v.load(true); badges(); }

  /* ----- détail d'une partie ----- */
  function openRun(id) {
    Drawer.open('Détail de la partie', h('p', { 'class': 'muted' }, 'Chargement…'), null, 'run', id);
    api('runs/' + encodeURIComponent(id)).then(function (d) {
      if (!d.ok) { Drawer.set(empty('Partie introuvable', d.error || '')); return; }
      var r = d.run, v = d.verify, pl = d.player, checks = [];
      function chk(kind, text) { checks.push(h('li', null, h('span', { 'class': 'ic ' + kind, 'aria-hidden': 'true' }, kind === 'ok' ? '✓' : kind === 'ko' ? '✕' : '!'), h('span', null, text))); }
      if (v.elapsed + 3 >= r.t) chk('ok', 'Durée de jeu (' + mmss(r.t) + ') compatible avec le temps réellement écoulé depuis le départ (' + mmss(v.elapsed) + ').');
      else chk('ko', 'Durée de jeu (' + mmss(r.t) + ') supérieure au temps écoulé (' + mmss(v.elapsed) + ').');
      if (v.plausible) chk('ok', 'Score dans la plage attendue pour cette durée : ' + nf.format(v.bounds.min) + ' à ' + nf.format(v.bounds.max) + '.');
      else chk('ko', 'Score hors de la plage attendue (' + nf.format(v.bounds.min) + ' à ' + nf.format(v.bounds.max) + ').');
      chk(r.verified ? 'ok' : 'wa', r.verified ? 'Compte en ligne : le pseudo est vérifié par le serveur.' : 'Invité : le pseudo est déclaré par le navigateur, il n’est pas vérifié.');
      if (r.flags.indexOf('few-pings') >= 0) chk('wa', 'Très peu de signaux de présence reçus pendant la partie (connexion instable ou envoi bricolé).');
      if (r.void) chk('ko', 'Partie invalidée : exclue des statistiques et du classement.');

      var speed = null;
      if (r.samples && r.samples.length >= 2) {
        var host = h('div', { 'class': 'chart-host' });
        speed = h('div', null, h('div', { 'class': 'sec-t' }, 'Vitesse du site pendant la partie'), host);
        var draw = function () {
          C.lines(host, {
            height: 170, aria: 'Vitesse du site au cours de la partie', yfmt: function (x) { return '×' + x; }, vfmt: function (x) { return '×' + x; },
            series: [{ key: 'mul', name: 'Vitesse', color: 'accent', area: true }],
            data: r.samples.map(function (m, i) { return { xl: mmss(i * r.sInt), tl: 'Après ' + mmss(i * r.sInt), v: { mul: m } }; })
          });
        };
        setTimeout(draw, 260);
      }
      var body = h('div', { 'class': 'dr-b-in', style: null },
        h('div', null, h('div', { 'class': 'big-score' }, nf.format(r.score)),
          h('div', { 'class': 'head-row' }, resEl(r), tagDiff(r.diff), r.void ? stEl('bad', '⛔ invalidée') : null)),
        h('dl', { 'class': 'kv' },
          kv('Joueur', h('span', null, nameEl(r), r.verified ? '' : h('span', { 'class': 'muted' }, ' · invité'))),
          kv('Fin de la partie', fFull.format(r.endedAt)),
          kv('Durée de jeu', mmss(r.t) + ' (' + nf.format(r.t) + ' s)'),
          kv('Niveau', DUR[r.dur] != null ? DUR[r.dur] : String(r.dur)),
          kv('Cookies ramassés', nf.format(r.cookies)),
          kv('Vitesse max', '×' + String(r.mul).replace('.', ',')),
          kv('Cause de fin', r.result === 'death' ? (CAUSE[r.cause] || r.cause || 'Inconnue') : '—'),
          kv('Appareil', r.ua || '—'),
          kv('Début', fFull.format(r.startedAt)),
          kv('Signaux de présence', String(r.pings)),
          kv('Identifiant', h('span', { 'class': 'mono' }, r.id)),
          kv('Clé du joueur', h('span', { 'class': 'mono' }, r.player))),
        h('div', null, h('div', { 'class': 'sec-t' }, 'Contrôle du serveur'), h('ul', { 'class': 'checks' }, checks)),
        speed);
      var foot = [
        r.void ? h('button', { 'class': 'btn', type: 'button', onclick: function () { act('runs/' + id, 'restore', 'Partie restaurée.'); } }, 'Restaurer')
               : h('button', { 'class': 'btn', type: 'button', onclick: function () { act('runs/' + id, 'void', 'Partie invalidée.'); } }, 'Invalider'),
        h('button', { 'class': 'btn', type: 'button', onclick: function () { S.runs.player = r.player; S.runs.playerLabel = r.name; S.runs.page = 1; Drawer.close(); go('runs'); } }, 'Ses parties'),
        pl && pl.blocked ? h('button', { 'class': 'btn', type: 'button', onclick: function () { playerAct(r.player, 'unblock', 'Joueur débloqué.'); } }, 'Débloquer le joueur')
                         : h('button', { 'class': 'btn danger', type: 'button', onclick: function () { if (window.confirm('Bloquer ' + r.name + ' ? Il ne pourra plus envoyer de parties ni de messages.')) playerAct(r.player, 'block', 'Joueur bloqué.'); } }, 'Bloquer le joueur'),
        h('button', { 'class': 'btn danger', type: 'button', onclick: function () { if (window.confirm('Supprimer définitivement cette partie ?')) act('runs/' + id, 'delete', 'Partie supprimée.', true); } }, 'Supprimer')
      ];
      Drawer.set(body, foot);
    });
  }
  function act(path, action, okMsg, close) {
    api(path, { body: { action: action } }).then(function (j) {
      if (j.status === 200 && j.ok !== false) {
        toast(okMsg);
        if (close) Drawer.close(); else if (Drawer.kind === 'run') openRun(Drawer.id); else if (Drawer.kind === 'note') openNote(Drawer.id, true);
        reloadView();
      } else toast(j.error || 'Action impossible.', true);
    });
  }
  function playerAct(key, action, okMsg, extra) {
    api('players/' + encodeURIComponent(key), { body: Object.assign({ action: action }, extra || {}) }).then(function (j) {
      if (j.status === 200 && j.ok !== false) { toast(okMsg); if (Drawer.kind === 'run') openRun(Drawer.id); else if (Drawer.kind === 'note') openNote(Drawer.id, true); reloadView(); }
      else toast(j.error || 'Action impossible.', true);
    });
  }

  /* ----- détail d'un message ----- */
  function openNote(id, keep) {
    if (!keep) Drawer.open('Message', h('p', { 'class': 'muted' }, 'Chargement…'), null, 'note', id);
    function load() {
      return api('notes/' + encodeURIComponent(id)).then(function (d) {
        if (Drawer.kind !== 'note' || Drawer.id !== id) return;
        if (!d.ok) { Drawer.set(empty('Message introuvable', d.error || '')); return; }
        var n = d.note;
        var typing = n.typing;
        var body = h('div', null,
          h('div', { 'class': 'head-row' },
            h('b', null, n.name || 'anonyme'), n.verified ? stEl('ok', '✓ compte vérifié') : h('span', { 'class': 'muted' }, 'invité (pseudo non vérifié)'),
            typing ? h('span', { 'class': 'typing' }, '✎ écrit en ce moment') : (n.stoppedAt ? stEl('mut', '■ enregistrement arrêté') : stEl('warn', '… enregistrement interrompu')),
            n.blocked ? stEl('bad', '⛔ bloqué') : null),
          h('pre', { 'class': 'note-text', id: 'note-text' }, n.text || '(vide)'),
          h('dl', { 'class': 'kv' },
            kv('Début', fFull.format(n.startedAt)), kv('Dernière modification', fFull.format(n.updatedAt)),
            kv('Caractères', nf.format(n.chars)), kv('Modifications reçues', nf.format(n.edits)),
            kv('Appareil', (n.ua || '—') + (n.device ? ' · ' + n.device : '')), kv('Clé du joueur', h('span', { 'class': 'mono' }, n.player))));
        body.className = 'dr-b-in';
        var foot = [
          h('button', { 'class': 'btn', type: 'button', onclick: function () { act('notes/' + id, n.read ? 'unread' : 'read', n.read ? 'Marqué non lu.' : 'Marqué lu.'); } }, n.read ? 'Marquer non lu' : 'Marquer lu'),
          h('button', { 'class': 'btn', type: 'button', onclick: function () { act('notes/' + id, n.star ? 'unstar' : 'star', n.star ? 'Retiré des favoris.' : 'Ajouté aux favoris.'); } }, n.star ? '★ Retirer des favoris' : '☆ Favori'),
          n.blocked ? h('button', { 'class': 'btn', type: 'button', onclick: function () { playerAct(n.player, 'unblock', 'Auteur débloqué.'); } }, 'Débloquer l’auteur')
                    : h('button', { 'class': 'btn danger', type: 'button', onclick: function () { if (window.confirm('Bloquer cet auteur ? Il ne pourra plus envoyer de messages ni de parties.')) playerAct(n.player, 'block', 'Auteur bloqué.'); } }, 'Bloquer l’auteur'),
          h('button', { 'class': 'btn danger', type: 'button', onclick: function () { if (window.confirm('Supprimer définitivement ce message ?')) act('notes/' + id, 'delete', 'Message supprimé.', true); } }, 'Supprimer')
        ];
        var scrollTop = $('dr-body').scrollTop;
        Drawer.set(body, foot);
        $('dr-body').scrollTop = scrollTop;
        return n;
      });
    }
    load().then(function (n) {
      if (!keep && n && !n.read) api('notes/' + encodeURIComponent(id), { body: { action: 'read' } }).then(function () { badges(); if (S.view === 'notes') V.notes.load(true); });   // ouvrir = lu (une seule fois)
      clearInterval(Drawer.timer);
      Drawer.timer = setInterval(function () { if (Drawer.kind === 'note' && Drawer.id === id && !document.hidden) load(); }, 4000);   // le texte se met à jour en direct
    });
  }

  /* ------------------------------ les vues ------------------------------ */
  var V = {};
  function makeView(id, def) {
    def.id = id; def.seq = 0; def.built = false;
    def.el = h('section', { 'class': 'view', id: 'v-' + id, hidden: true });
    $('views').appendChild(def.el);
    V[id] = def;
    return def;
  }
  function failView(v, j) {
    var box = v.errBox || (v.errBox = h('div', { 'class': 'banner bad', role: 'alert' }));
    box.textContent = j.status === 0 ? 'Serveur injoignable : les données affichées peuvent être anciennes.' : (j.error || 'Erreur du serveur.');
    if (!box.parentNode) v.el.insertBefore(box, v.el.firstChild);
    $('updated').textContent = '⚠ hors ligne'; $('updated').className = 'updated err';
  }
  function okView(v) {
    if (v.errBox && v.errBox.parentNode) v.errBox.parentNode.removeChild(v.errBox);
    $('updated').textContent = 'maj ' + clock(Date.now()); $('updated').className = 'updated';
  }

  /* ============================ VUE D'ENSEMBLE ============================ */
  makeView('overview', {
    build: function () {
      var v = this, el = this.el;
      v.scope = h('span', { 'class': 'scope' });
      v.filters = h('div', { 'class': 'filters' });
      v.live = h('div', { 'class': 'liverow' });
      v.kpis = h('div', { 'class': 'kpis' });
      v.hint = h('div', { 'class': 'banner', hidden: true });
      v.cRuns = chartCard({ title: 'Parties jouées', sub: '', wide: true });
      v.cPlayers = chartCard({ title: 'Joueurs actifs', sub: 'Joueurs distincts ayant terminé au moins une partie' });
      v.cScores = chartCard({ title: 'Scores', sub: 'Meilleur score et score moyen' });
      v.cHours = chartCard({ title: 'Activité sur la journée', sub: 'Parties terminées par heure (heure de cet appareil)' });
      v.cHist = chartCard({ title: 'Répartition des scores', sub: 'Nombre de parties par tranche de score' });
      v.cEnd = chartCard({ title: 'Comment finissent les parties', sub: '' });
      v.cDiff = chartCard({ title: 'Par difficulté', sub: 'Sur la période choisie', noTable: true });
      v.top = h('div', { 'class': 'card' });
      v.recent = h('div', { 'class': 'card' });
      add(el, [h('div', { 'class': 'head-row' }, h('h2', null, 'Vue d’ensemble'), h('span', { 'class': 'sp' }), v.scope), v.filters, v.hint, v.live, v.kpis,
        v.cRuns.card, h('div', { 'class': 'grid2' }, v.cPlayers.card, v.cScores.card, v.cHours.card, v.cHist.card, v.cEnd.card, v.cDiff.card),
        h('div', { 'class': 'grid2' }, v.top, v.recent)]);
      v.drawFilters();
    },
    drawFilters: function () {
      var v = this, f = clear(v.filters);
      add(f, [
        segEl([[1, '24 h', '24 dernières heures'], [7, '7 j', '7 derniers jours'], [30, '30 j', '30 derniers jours'], [90, '90 j', '90 derniers jours'], [0, 'Tout', 'Depuis le début']], S.ov.days, function (d) { S.ov.days = Number(d); savePrefs(); v.drawFilters(); v.load(true); }, 'Période'),
        selectEl('ov-diff', 'Difficulté', OPT_DIFF, S.ov.diff, function (d) { S.ov.diff = d; savePrefs(); v.load(true); })
      ]);
    },
    load: function (quiet) {
      var v = this, seq = ++v.seq;
      if (!v.built) { v.built = true; v.build(); }
      setBusy(v, quiet);
      return api('overview?' + qs({ days: S.ov.days, diff: S.ov.diff, tz: new Date().getTimezoneOffset() })).then(function (d) {
        if (seq !== v.seq) return;
        setBusy(v, false);
        if (!d.ok) return failView(v, d);
        okView(v); v.render(d);
      });
    },
    render: function (d) {
      var v = this, k = d.kpi, per = { 1: 'les dernières 24 heures', 7: 'les 7 derniers jours', 30: 'les 30 derniers jours', 90: 'les 90 derniers jours', 0: 'toute la période enregistrée' }[S.ov.days];
      v.scope.textContent = 'Statistiques sur ' + per + (S.ov.diff ? ' · ' + DIFFS[S.ov.diff] : '');
      v.hint.hidden = d.totals.runs > 0;
      if (!v.hint.hidden) v.hint.textContent = 'Aucune partie enregistrée pour le moment. Les parties jouées sur ce serveur (en compte en ligne ou en invité) apparaîtront ici dès qu’elles se terminent.';

      /* parties en cours */
      var live = clear(v.live);
      live.appendChild(h('span', { 'class': 'live-dot' + (d.live.length ? ' on' : '') }));
      live.appendChild(h('b', null, d.kpi.live ? nf.format(d.kpi.live) + (d.kpi.live > 1 ? ' parties en cours' : ' partie en cours') : 'Aucune partie en cours'));
      d.live.forEach(function (l) {
        live.appendChild(h('span', { 'class': 'chip' }, h('span', null, l.name), tagDiff(l.diff), h('span', { 'class': 'muted' }, mmss(l.t) + ' · ' + nf.format(l.score) + ' pts' + (l.paused ? ' · pause' : ''))));
      });

      /* tuiles */
      var runsSeries = d.series.map(function (b) { return b.runs; }), plSeries = d.series.map(function (b) { return b.players; });
      var kp = clear(v.kpis);
      function delta(cur, prev) {
        if (prev == null) return h('span');
        if (!prev) return cur > 0 ? h('span', { 'class': 'delta up', title: 'Rien sur la période précédente' }, '▲ nouveau') : h('span');
        var p = (cur - prev) / prev * 100, r = Math.round(p);
        if (r === 0) return h('span', { 'class': 'delta flat', title: 'Identique à la période précédente' }, '= stable');
        return h('span', { 'class': 'delta ' + (r > 0 ? 'up' : 'down'), title: 'Par rapport à la période précédente de même durée' }, (r > 0 ? '▲ +' : '▼ −') + Math.abs(r) + ' %');
      }
      function tile(o) {
        var sp = h('span'); if (o.spark) C.spark(sp, o.spark);
        var t = h('div', { 'class': 'tile' + (o.hero ? ' hero' : '') + (o.onclick ? ' link' : ''), tabindex: o.onclick ? 0 : null, role: o.onclick ? 'link' : null },
          h('div', { 'class': 'lab' }, o.dot ? h('span', { 'class': 'live-dot' + (o.dot === 2 ? ' on' : '') }) : null, o.label),
          h('div', { 'class': 'val' }, o.value),
          h('div', { 'class': 'meta' }, o.meta || ''),
          h('div', { 'class': 'foot' }, o.delta || h('span'), sp));
        if (o.onclick) { t.addEventListener('click', o.onclick); t.addEventListener('keydown', function (e) { if (e.key === 'Enter') o.onclick(); }); }
        kp.appendChild(t);
      }
      var pv = d.prev;
      tile({ hero: true, label: 'Parties jouées', value: nf.format(k.runs), meta: k.runs ? nf.format(k.wins) + ' victoires · ' + nf.format(k.deaths) + ' collisions · ' + nf.format(k.quits + k.abandons) + ' abandons' : 'Aucune partie sur la période', delta: delta(k.runs, pv && pv.runs), spark: hasAny(runsSeries) ? thin(runsSeries, 14) : null });
      tile({ label: 'Joueurs distincts', value: nf.format(k.players), meta: nf.format(k.accounts) + ' compte' + (k.accounts > 1 ? 's' : '') + ' · ' + nf.format(k.guests) + ' invité' + (k.guests > 1 ? 's' : ''), delta: delta(k.players, pv && pv.players), spark: hasAny(plSeries) ? thin(plSeries, 14) : null });
      tile({ label: 'En cours maintenant', dot: k.live ? 2 : 1, value: nf.format(k.live), meta: k.live ? 'dont ' + d.live.filter(function (l) { return l.paused; }).length + ' en pause' : 'à cet instant', onclick: null });
      tile({ label: 'Meilleur score', value: k.bestScore ? nf.format(k.bestScore.score) : '—', meta: k.bestScore ? k.bestScore.name + ' · ' + DIFFS[k.bestScore.diff] + ' · ' + fdate(k.bestScore.endedAt) : 'Aucun score', onclick: k.bestScore ? function () { openRun(k.bestScore.id); } : null });
      tile({ label: 'Temps de jeu total', value: longDur(k.time), meta: k.runs ? 'Moyenne : ' + mmss(k.avgT) + ' par partie' : '', delta: delta(k.time, pv && pv.time) });
      tile({ label: 'Score moyen', value: nf.format(k.avgScore), meta: k.maxMul ? 'Vitesse max atteinte : ×' + String(k.maxMul).replace('.', ',') : '', delta: delta(k.avgScore, pv && Math.round(pv.avgScore)) });
      tile({ label: 'Taux de victoire', value: pct(k.winRate), meta: nf.format(k.wins) + ' victoire' + (k.wins > 1 ? 's' : '') + ' · ' + nf.format(k.cookies) + ' cookies ramassés' });
      tile({ label: 'Messages non lus', value: nf.format(d.notes.unread), meta: nf.format(d.notes.total) + ' au total' + (d.notes.typing ? ' · ' + d.notes.typing + ' en cours d’écriture' : ''), onclick: function () { go('notes'); } });
      tile({ label: 'Tentatives refusées', value: nf.format(d.rejected.period), meta: 'contrôle anti-triche du serveur', onclick: function () { go('rejected'); } });
      tile({ label: 'Parties invalidées', value: nf.format(d.voided), meta: 'exclues des statistiques' });
      tile({ label: 'Enregistré au total', value: nf.format(d.totals.runs), meta: nf.format(d.totals.players) + ' joueurs, toutes périodes' });

      /* graphique : parties par jour / heure */
      var hourly = d.params.bucket === 'hour', lab = d.series.map(function (b) {
        var dt = new Date(b.ts);
        return hourly ? { xl: dt.getHours() + ' h', tl: fDay.format(dt) + ', ' + dt.getHours() + ' h – ' + ((dt.getHours() + 1) % 24) + ' h' }
                      : { xl: fDay.format(dt), tl: fDayLong.format(dt) };
      });
      var series3 = DIFF_ORDER.map(function (key) { return { key: key, name: DIFFS[key], color: key }; });
      var hasRuns = k.runs > 0;
      v.cRuns.card.querySelector('h3').textContent = hourly ? 'Parties par heure' : 'Parties par jour';
      v.cRuns.sub.textContent = 'Parties terminées, par difficulté · clique sur la légende pour masquer une difficulté';
      var lg = clear(v.cRuns.legend); v.cRuns.legend.hidden = false;
      series3.forEach(function (s) {
        var b = h('button', { type: 'button', 'aria-pressed': String(!S.hidden[s.key]) }, h('span', { 'class': 'sw ' + s.key }), s.name);
        b.addEventListener('click', function () { S.hidden[s.key] = !S.hidden[s.key]; b.setAttribute('aria-pressed', String(!S.hidden[s.key])); v.cRuns.fn(); });
        lg.appendChild(h('li', null, b));
      });
      v.cRuns.draw(function () {
        if (!hasRuns) { clear(v.cRuns.host).appendChild(empty('Aucune partie sur cette période')); return; }
        C.columns(v.cRuns.host, {
          height: 240, unit: ['partie', 'parties'], aria: 'Parties terminées par ' + (hourly ? 'heure' : 'jour') + ', par difficulté', series: series3, hidden: S.hidden,
          data: d.series.map(function (b, i) { return { xl: lab[i].xl, tl: lab[i].tl, v: { zen: b.zen, normal: b.normal, infernal: b.infernal } }; })
        });
      });
      v.cRuns.setTable([hourly ? 'Heure' : 'Jour', 'Zen', 'Normal', 'Infernal', 'Total'], d.series.map(function (b, i) { return [lab[i].tl, nf.format(b.zen), nf.format(b.normal), nf.format(b.infernal), nf.format(b.runs)]; }));

      /* joueurs actifs */
      v.cPlayers.draw(function () {
        if (!hasRuns) { clear(v.cPlayers.host).appendChild(empty('Pas encore de joueurs')); return; }
        C.lines(v.cPlayers.host, { height: 200, aria: 'Joueurs actifs par ' + (hourly ? 'heure' : 'jour'), series: [{ key: 'p', name: 'Joueurs', color: 'accent', area: true, label: true }],
          data: d.series.map(function (b, i) { return { xl: lab[i].xl, tl: lab[i].tl, v: { p: b.players } }; }) });
      });
      v.cPlayers.setTable([hourly ? 'Heure' : 'Jour', 'Joueurs actifs'], d.series.map(function (b, i) { return [lab[i].tl, nf.format(b.players)]; }));

      /* scores */
      v.cScores.legend.hidden = false;
      clear(v.cScores.legend).appendChild(h('li', null, h('span', { 'class': 'k' }, h('span', { 'class': 'sw line accent' }), 'Meilleur score')));
      v.cScores.legend.appendChild(h('li', null, h('span', { 'class': 'k' }, h('span', { 'class': 'sw line gray' }), 'Score moyen')));
      v.cScores.draw(function () {
        if (!hasRuns) { clear(v.cScores.host).appendChild(empty('Pas encore de scores')); return; }
        C.lines(v.cScores.host, { height: 200, gapZero: true, aria: 'Meilleur score et score moyen par ' + (hourly ? 'heure' : 'jour'),
          series: [{ key: 'avg', name: 'Score moyen', color: 'deemph' }, { key: 'best', name: 'Meilleur score', color: 'accent', label: true }],
          data: d.series.map(function (b, i) { return { xl: lab[i].xl, tl: lab[i].tl, v: { avg: b.avgScore, best: b.best } }; }) });
      });
      v.cScores.setTable([hourly ? 'Heure' : 'Jour', 'Meilleur score', 'Score moyen'], d.series.map(function (b, i) { return [lab[i].tl, b.best ? nf.format(b.best) : '—', b.avgScore ? nf.format(b.avgScore) : '—']; }));

      /* heures de la journée */
      v.cHours.draw(function () {
        if (!hasRuns) { clear(v.cHours.host).appendChild(empty('Pas encore d’activité')); return; }
        C.columns(v.cHours.host, { height: 200, unit: ['partie', 'parties'], xgap: 56, aria: 'Parties terminées par heure de la journée', series: [{ key: 'n', name: 'Parties', color: 'accent' }],
          data: d.hours.map(function (n, hr) { return { xl: hr + ' h', tl: hr + ' h – ' + ((hr + 1) % 24) + ' h', v: { n: n } }; }) });
      });
      v.cHours.setTable(['Heure', 'Parties'], d.hours.map(function (n, hr) { return [hr + ' h – ' + ((hr + 1) % 24) + ' h', nf.format(n)]; }));

      /* histogramme des scores : tranches 0, 100, 300, 1 k, 3 k… (les scores s'étalent sur plusieurs ordres de grandeur) */
      var hs = d.histogram;
      function rng(i) { return nf.format(hs.edges[i]) + ' – ' + nf.format(hs.edges[i + 1] - 1); }
      v.cHist.sub.textContent = 'Nombre de parties par tranche de score (les tranches grandissent : 100, 300, 1 000, 3 000…)';
      v.cHist.draw(function () {
        if (!hs.bins.length) { clear(v.cHist.host).appendChild(empty('Pas encore de scores')); return; }
        C.columns(v.cHist.host, { height: 200, unit: ['partie', 'parties'], xgap: 50, aria: 'Nombre de parties par tranche de score', series: [{ key: 'n', name: 'Parties', color: 'accent' }],
          data: hs.bins.map(function (n, i) { return { xl: cf.format(hs.edges[i]), tl: rng(i) + ' points', v: { n: n } }; }) });
      });
      v.cHist.setTable(['Tranche de score', 'Parties'], hs.bins.map(function (n, i) { return [rng(i), nf.format(n)]; }));

      /* fins de partie */
      var causes = Object.keys(d.causes).map(function (c) { return [c, d.causes[c]]; }).sort(function (a, b) { return b[1] - a[1]; });
      v.cEnd.sub.textContent = k.deaths ? 'Ce qui a touché le joueur lors des ' + nf.format(k.deaths) + ' collisions' : 'Résultat des parties';
      v.cEnd.draw(function () {
        var box = clear(v.cEnd.host);
        box.appendChild(h('div', { 'class': 'results' },
          ['win', 'death', 'quit', 'abandon'].map(function (r) { return h('span', { 'class': 'chip' }, h('span', { 'class': 'res ' + r, 'aria-hidden': 'true' }, RES[r][0]), RES[r][1], ' ', h('b', null, nf.format(d.results[r]))); })));
        if (!causes.length) { box.appendChild(empty('Aucune collision enregistrée')); return; }
        var mx = causes[0][1], list = h('div', { 'class': 'hbars' });
        causes.slice(0, 8).forEach(function (c) {
          var bar = h('i'); bar.style.width = Math.max(1, Math.round(c[1] / mx * 100)) + '%';
          list.appendChild(h('div', { 'class': 'hrow', title: (CAUSE[c[0]] || c[0]) + ' : ' + nf.format(c[1]) }, h('span', { 'class': 'l' }, CAUSE[c[0]] || c[0]), h('span', { 'class': 't' }, bar), h('span', { 'class': 'v' }, nf.format(c[1]))));
        });
        box.appendChild(list);
      });
      v.cEnd.setTable(['Cause', 'Collisions'], causes.map(function (c) { return [CAUSE[c[0]] || c[0], nf.format(c[1])]; }));

      /* par difficulté */
      clear(v.cDiff.host).appendChild(table([
        { t: 'Difficulté', render: function (r) { return tagDiff(r.d); } },
        { t: 'Parties', num: true, render: function (r) { return nf.format(r.runs); } },
        { t: 'Joueurs', num: true, hide: true, render: function (r) { return nf.format(r.players); } },
        { t: 'Score moyen', num: true, render: function (r) { return r.runs ? nf.format(r.avgScore) : '—'; } },
        { t: 'Meilleur', num: true, render: function (r) { return r.best ? nf.format(r.best) : '—'; } },
        { t: 'Durée moy.', num: true, hide: true, render: function (r) { return r.runs ? mmss(r.avgT) : '—'; } },
        { t: 'Victoires', num: true, render: function (r) { return nf.format(r.wins); } }
      ], DIFF_ORDER.map(function (key) { return Object.assign({ d: key }, d.byDiff[key]); })));

      /* meilleurs scores + dernières parties */
      function mini(title, rows, cols, linkTo, linkLabel) {
        var c = [h('div', { 'class': 'card-h' }, h('div', null, h('h3', null, title)), h('span', { 'class': 'sp' }), h('button', { 'class': 'btn sm ghost', type: 'button', onclick: function () { go(linkTo); } }, linkLabel))];
        c.push(rows.length ? table(cols, rows, { onRow: function (r) { openRun(r.id); } }) : empty('Rien à afficher pour le moment'));
        return c;
      }
      clear(v.top); add(v.top, mini('Meilleurs scores', d.top, [
        { t: '#', render: function (r) { return h('span', { 'class': 'rank r' + r.rank }, String(r.rank)); } },
        { t: 'Joueur', cls: 'nm', render: nameEl },
        { t: 'Difficulté', hide: true, render: function (r) { return tagDiff(r.diff); } },
        { t: 'Score', num: true, render: function (r) { return h('b', null, nf.format(r.score)); } }
      ], 'top', 'Tout le classement'));
      clear(v.recent); add(v.recent, mini('Dernières parties', d.recent, [
        { t: 'Fin', m: 'd', render: function (r) { return h('span', { 'class': 'muted' }, ago(r.endedAt)); } },
        { t: 'Joueur', cls: 'nm', m: 'a', render: nameEl },
        { t: 'Difficulté', m: 'c', render: function (r) { return tagDiff(r.diff); } },
        { t: 'Score', num: true, m: 'b', render: function (r) { return h('b', null, nf.format(r.score)); } },
        { t: 'Résultat', m: 'e', render: resEl }
      ], 'runs', 'Tout l’historique'));
    }
  });
  function hasAny(arr) { return arr.length > 1 && arr.some(function (x) { return x > 0; }); }     // pas de mini-courbe plate quand il n'y a rien
  function thin(arr, n) {                      // réduit une série à ~n points (moyenne par groupe) pour une mini-courbe
    if (arr.length <= n) return arr;
    var out = [], step = arr.length / n;
    for (var i = 0; i < n; i++) { var a = Math.floor(i * step), b = Math.max(a + 1, Math.floor((i + 1) * step)), s = 0; for (var j = a; j < b; j++) s += arr[j]; out.push(s / (b - a)); }
    return out;
  }

  /* ============================ HISTORIQUE DES PARTIES ============================ */
  makeView('runs', {
    build: function () {
      var v = this, el = this.el, R = S.runs;
      v.filters = h('div', { 'class': 'filters' });
      v.chips = h('div', { 'class': 'head-row' });
      v.box = h('div');
      v.csv = h('a', { 'class': 'btn sm', href: '#', download: 'parties.csv' }, '⇩ CSV');
      var reload = function () { R.page = 1; v.load(true); };
      var q = h('input', { type: 'search', placeholder: 'Rechercher un joueur, une cause…', 'aria-label': 'Rechercher', value: R.q });
      q.addEventListener('input', debounce(function () { R.q = q.value; reload(); }, 300));
      var from = h('input', { type: 'date', 'aria-label': 'Du', value: R.from, onchange: function (e) { R.from = e.target.value; reload(); } });
      var to = h('input', { type: 'date', 'aria-label': 'Au', value: R.to, onchange: function (e) { R.to = e.target.value; reload(); } });
      v.more = moreBtn(v.filters);
      var sortSel = selectEl('r-sort', 'Trier par', [['date:desc', 'Plus récentes'], ['date:asc', 'Plus anciennes'], ['score:desc', 'Meilleur score'], ['score:asc', 'Score le plus bas'], ['t:desc', 'Plus longues'], ['cookies:desc', 'Plus de cookies'], ['mul:desc', 'Plus rapides'], ['name:asc', 'Joueur A → Z']], R.sort + ':' + R.dir,
        function (x) { var a = x.split(':'); R.sort = a[0]; R.dir = a[1]; reload(); });
      sortSel.className = 'show-sm';
      add(v.filters, [h('div', { 'class': 'grow' }, q), v.more, h('div', { 'class': 'opt-wrap' }, [sortSel,
        selectEl('r-diff', 'Difficulté', OPT_DIFF, R.diff, function (x) { R.diff = x; reload(); }),
        selectEl('r-dur', 'Niveau', OPT_DUR, R.dur, function (x) { R.dur = x; reload(); }),
        selectEl('r-res', 'Résultat', [['', 'Tous résultats'], ['win', 'Victoire'], ['death', 'Collision'], ['quit', 'Quittée'], ['abandon', 'Abandonnée']], R.result, function (x) { R.result = x; reload(); }),
        selectEl('r-st', 'Statut', [['', 'Tous statuts'], ['ok', 'Valides'], ['void', 'Invalidées'], ['flag', 'Signalées']], R.status, function (x) { R.status = x; reload(); }),
        selectEl('r-ver', 'Joueur', [['', 'Tous joueurs'], ['1', 'Comptes vérifiés'], ['0', 'Invités']], R.verified, function (x) { R.verified = x; reload(); }),
        h('span', { 'class': 'range' }, h('span', { 'class': 'lbl' }, 'du'), from, h('span', { 'class': 'lbl' }, 'au'), to),
        h('button', { 'class': 'btn sm ghost', type: 'button', onclick: function () {
          Object.assign(R, { page: 1, q: '', diff: '', dur: '', result: '', status: '', verified: '', from: '', to: '', player: '', playerLabel: '', sort: 'date', dir: 'desc' });
          clear(el); v.build(); v.load(true);
        } }, 'Réinitialiser'), v.csv])]);
      add(el, [h('div', { 'class': 'head-row' }, h('h2', null, 'Historique des parties')), v.filters, v.chips, v.box]);
    },
    params: function () {
      var R = S.runs, from = R.from ? new Date(R.from + 'T00:00:00').getTime() : '', to = R.to ? new Date(R.to + 'T23:59:59.999').getTime() : '';
      return { q: R.q, diff: R.diff, dur: R.dur, result: R.result, status: R.status, verified: R.verified, from: from, to: to, player: R.player, sort: R.sort, dir: R.dir };
    },
    load: function (quiet) {
      var v = this, seq = ++v.seq, R = S.runs;
      if (!v.built) { v.built = true; v.build(); }
      setBusy(v, quiet);
      v.csv.href = 'api/admin/export/runs.csv?' + qs(v.params());
      setMore(v.more, [R.diff, R.dur, R.result, R.status, R.verified, R.from, R.to].filter(Boolean).length);
      clear(v.chips);
      if (R.player) v.chips.appendChild(h('span', { 'class': 'chip' }, 'Joueur : ', h('b', null, R.playerLabel || R.player), h('button', { 'class': 'btn sm ghost', type: 'button', 'aria-label': 'Retirer le filtre joueur', onclick: function () { R.player = ''; R.playerLabel = ''; R.page = 1; v.load(true); } }, '✕')));
      return api('runs?' + qs(Object.assign(v.params(), { page: R.page, size: R.size }))).then(function (d) {
        if (seq !== v.seq) return;
        setBusy(v, false);
        if (!d.ok) return failView(v, d);
        okView(v);
        R.page = d.page;
        var cols = [
          { t: 'Date', sort: 'date', m: 'd', render: function (r) { return h('span', { title: fFull.format(r.endedAt) }, fdate(r.endedAt), h('span', { 'class': 'show-sm' }, ' · ' + mmss(r.t))); } },
          { t: 'Joueur', sort: 'name', cls: 'nm', m: 'a', render: nameEl },
          { t: 'Difficulté', sort: 'diff', m: 'c', render: function (r) { return tagDiff(r.diff); } },
          { t: 'Niveau', hide: true, render: function (r) { return DUR[r.dur] != null ? DUR[r.dur] : r.dur; } },
          { t: 'Durée', sort: 't', num: true, hide: true, render: function (r) { return mmss(r.t); } },
          { t: 'Score', sort: 'score', num: true, m: 'b', render: function (r) { return h('b', null, nf.format(r.score)); } },
          { t: 'Cookies', sort: 'cookies', num: true, hide: true, render: function (r) { return nf.format(r.cookies); } },
          { t: 'Vitesse', sort: 'mul', num: true, hide: true, render: function (r) { return '×' + String(r.mul).replace('.', ','); } },
          { t: 'Résultat', sort: 'result', m: 'e', render: function (r) { return [resEl(r), r.void ? stEl('bad', ' ⛔') : null, r.flags.length ? stEl('warn', ' !', 'Partie signalée') : null]; } }
        ];
        var box = clear(v.box);
        if (!d.rows.length) { box.appendChild(empty('Aucune partie ne correspond', d.total === 0 && !R.q && !R.diff && !R.result ? 'Les parties apparaîtront ici dès qu’un joueur en termine une.' : 'Essaie d’élargir les filtres.')); }
        else box.appendChild(table(cols, d.rows, {
          sort: { key: R.sort, dir: R.dir }, onSort: function (k) { if (R.sort === k) R.dir = R.dir === 'asc' ? 'desc' : 'asc'; else { R.sort = k; R.dir = k === 'name' || k === 'diff' ? 'asc' : 'desc'; } R.page = 1; v.load(true); },
          onRow: function (r) { openRun(r.id); }, rowClass: function (r) { return r.void ? 'void' : ''; }
        }));
        box.appendChild(pager(d, function (p) { R.page = p; v.load(true); window.scrollTo({ top: 0 }); }, function (n) { R.size = n; R.page = 1; v.load(true); }));
      });
    }
  });

  /* ============================ CLASSEMENT ============================ */
  makeView('top', {
    build: function () {
      var v = this, T = S.top;
      v.filters = h('div', { 'class': 'filters' });
      v.box = h('div');
      var reload = function () { v.load(true); };
      add(v.filters, [
        selectEl('t-diff', 'Difficulté', OPT_DIFF, T.diff, function (x) { T.diff = x; reload(); }),
        selectEl('t-dur', 'Niveau', OPT_DUR, T.dur, function (x) { T.dur = x; reload(); }),
        selectEl('t-days', 'Période', [['0', 'Depuis le début'], ['1', '24 heures'], ['7', '7 jours'], ['30', '30 jours'], ['90', '90 jours']], String(T.days), function (x) { T.days = Number(x); reload(); }),
        h('label', { 'class': 'chk' }, h('input', { type: 'checkbox', checked: T.unique, onchange: function (e) { T.unique = e.target.checked; reload(); } }), 'Un seul score par joueur')]);
      add(v.el, [h('div', { 'class': 'head-row' }, h('h2', null, 'Classement des meilleurs scores'), h('span', { 'class': 'sp' }), v.sc = h('span', { 'class': 'scope' })), v.filters, v.box]);
    },
    load: function (quiet) {
      var v = this, seq = ++v.seq, T = S.top;
      if (!v.built) { v.built = true; v.build(); }
      setBusy(v, quiet);
      return api('top?' + qs({ diff: T.diff, dur: T.dur, days: T.days || '', unique: T.unique ? '1' : '0', limit: 25 })).then(function (d) {
        if (seq !== v.seq) return;
        setBusy(v, false);
        if (!d.ok) return failView(v, d);
        okView(v);
        v.sc.textContent = nf.format(d.total) + ' partie' + (d.total > 1 ? 's' : '') + ' classée' + (d.total > 1 ? 's' : '') + ' · les parties abandonnées et invalidées ne comptent pas';
        var box = clear(v.box);
        if (!d.rows.length) { box.appendChild(empty('Aucun score pour le moment', 'Le classement se remplit dès qu’une partie est terminée.')); return; }
        var best = d.rows[0].score || 1;
        box.appendChild(table([
          { t: '#', m: 'c', render: function (r) { return h('span', { 'class': 'rank' + (r.rank <= 3 ? ' r' + r.rank : '') }, String(r.rank)); } },
          { t: 'Joueur', cls: 'nm', m: 'a', render: nameEl },
          { t: 'Score', num: true, m: 'b', cls: 'barcell', render: function (r) { var b = h('i'); b.style.width = Math.max(2, Math.round(r.score / best * 100)) + '%'; return [h('b', null, nf.format(r.score)), b]; } },
          { t: 'Difficulté', m: 'd', render: function (r) { return h('span', null, tagDiff(r.diff), h('span', { 'class': 'show-sm' }, ' ' + (DUR[r.dur] != null ? DUR[r.dur] : r.dur) + ' · ' + mmss(r.t))); } },
          { t: 'Niveau', hide: true, render: function (r) { return DUR[r.dur] != null ? DUR[r.dur] : r.dur; } },
          { t: 'Durée', num: true, hide: true, render: function (r) { return mmss(r.t); } },
          { t: 'Date', m: 'e', render: function (r) { return fdate(r.endedAt); } },
          { t: 'Résultat', hide: true, render: resEl }
        ], d.rows, { onRow: function (r) { openRun(r.id); } }));
      });
    }
  });

  /* ============================ JOUEURS ============================ */
  makeView('players', {
    build: function () {
      var v = this, P = S.players;
      v.filters = h('div', { 'class': 'filters' });
      v.box = h('div');
      var reload = function () { P.page = 1; v.load(true); };
      var q = h('input', { type: 'search', placeholder: 'Rechercher un joueur…', 'aria-label': 'Rechercher un joueur', value: P.q });
      q.addEventListener('input', debounce(function () { P.q = q.value; reload(); }, 300));
      var pSort = selectEl('p-sort', 'Trier par', [['lastSeen:desc', 'Activité récente'], ['best:desc', 'Meilleur score'], ['runs:desc', 'Plus de parties'], ['time:desc', 'Plus de temps de jeu'], ['notes:desc', 'Plus de messages'], ['name:asc', 'Nom A → Z']], P.sort + ':' + P.dir,
        function (x) { var a = x.split(':'); P.sort = a[0]; P.dir = a[1]; reload(); });
      pSort.className = 'show-sm';
      add(v.filters, [h('div', { 'class': 'grow' }, q), pSort,
        selectEl('p-type', 'Type', [['', 'Tous les joueurs'], ['compte', 'Comptes en ligne'], ['invité', 'Invités']], P.type, function (x) { P.type = x; reload(); }),
        h('label', { 'class': 'chk' }, h('input', { type: 'checkbox', checked: P.blocked, onchange: function (e) { P.blocked = e.target.checked; reload(); } }), 'Bloqués seulement')]);
      add(v.el, [h('div', { 'class': 'head-row' }, h('h2', null, 'Joueurs')), v.filters, v.box]);
    },
    load: function (quiet) {
      var v = this, seq = ++v.seq, P = S.players;
      if (!v.built) { v.built = true; v.build(); }
      setBusy(v, quiet);
      return api('players?' + qs({ q: P.q, type: P.type, blocked: P.blocked ? '1' : '', sort: P.sort, dir: P.dir, page: P.page, size: P.size })).then(function (d) {
        if (seq !== v.seq) return;
        setBusy(v, false);
        if (!d.ok) return failView(v, d);
        okView(v); P.page = d.page;
        var box = clear(v.box);
        if (!d.rows.length) { box.appendChild(empty('Aucun joueur', 'Les joueurs apparaissent dès qu’ils terminent une partie ou écrivent un message.')); box.appendChild(pager(d, function () {}, function () {})); return; }
        box.appendChild(table([
          { t: 'Joueur', sort: 'name', cls: 'nm', m: 'a', render: function (p) { return h('span', null, p.name || '—', p.verified ? h('span', { 'class': 'st ok', title: 'Compte vérifié' }, ' ✓') : null); } },
          { t: 'Type', hide: true, render: function (p) { return h('span', { 'class': 'tag' }, p.type); } },
          { t: 'Parties', sort: 'runs', num: true, m: 'd', render: function (p) { return [nf.format(p.valid) + (p.runs !== p.valid ? ' / ' + nf.format(p.runs) : ''), h('span', { 'class': 'show-sm' }, ' partie' + (p.valid > 1 ? 's' : '') + ' · ' + p.type)]; } },
          { t: 'Meilleur', sort: 'best', num: true, m: 'b', render: function (p) { return p.best ? h('span', null, h('b', null, nf.format(p.best)), ' ', h('span', { 'class': 'muted' }, DIFFS[p.bestDiff])) : '—'; } },
          { t: 'Temps', sort: 'time', num: true, hide: true, render: function (p) { return longDur(p.time); } },
          { t: 'Activité', sort: 'lastSeen', m: 'e', render: function (p) { return h('span', { title: p.lastSeen ? fFull.format(p.lastSeen) : '' }, ago(p.lastSeen)); } },
          { t: 'Messages', sort: 'notes', num: true, hide: true, render: function (p) { return p.notes ? nf.format(p.notes) + (p.unread ? ' (' + p.unread + ' non lu' + (p.unread > 1 ? 's' : '') + ')' : '') : '—'; } },
          { t: 'Statut', m: 'c', render: function (p) { return p.blocked ? stEl('bad', '⛔ bloqué', p.blockReason || '') : stEl('ok', 'actif'); } },
          { t: '', m: 'f', render: function (p) {
            return h('div', { 'class': 'acts' },
              p.runs ? h('button', { 'class': 'btn sm', type: 'button', onclick: function () { S.runs.player = p.key; S.runs.playerLabel = p.name; S.runs.page = 1; go('runs'); } }, 'Parties') : null,
              p.notes ? h('button', { 'class': 'btn sm', type: 'button', onclick: function () { S.notes.player = p.key; S.notes.playerLabel = p.name; S.notes.page = 1; go('notes'); } }, 'Messages') : null,
              p.blocked ? h('button', { 'class': 'btn sm', type: 'button', onclick: function () { playerAct(p.key, 'unblock', 'Joueur débloqué.'); } }, 'Débloquer')
                        : h('button', { 'class': 'btn sm danger', type: 'button', onclick: function () { if (window.confirm('Bloquer ' + p.name + ' ?')) playerAct(p.key, 'block', 'Joueur bloqué.'); } }, 'Bloquer'),
              h('button', { 'class': 'btn sm danger', type: 'button', title: 'Supprimer toutes ses parties et tous ses messages', onclick: function () {
                if (window.confirm('Supprimer définitivement TOUTES les parties et TOUS les messages de ' + p.name + ' ?')) playerAct(p.key, 'purge', 'Données du joueur supprimées.');
              } }, 'Purger')); } }
        ], d.rows, { sort: { key: P.sort, dir: P.dir }, onSort: function (k) { if (P.sort === k) P.dir = P.dir === 'asc' ? 'desc' : 'asc'; else { P.sort = k; P.dir = k === 'name' ? 'asc' : 'desc'; } P.page = 1; v.load(true); } }));
        box.appendChild(pager(d, function (p) { P.page = p; v.load(true); }, function (n) { P.size = n; P.page = 1; v.load(true); }));
      });
    }
  });

  /* ============================ MESSAGES ============================ */
  makeView('notes', {
    build: function () {
      var v = this, N = S.notes;
      v.filters = h('div', { 'class': 'filters' });
      v.chips = h('div', { 'class': 'head-row' });
      v.box = h('div');
      v.csv = h('a', { 'class': 'btn sm', href: 'api/admin/export/notes.csv', download: 'messages.csv' }, '⇩ CSV');
      var reload = function () { N.page = 1; v.load(true); };
      var q = h('input', { type: 'search', placeholder: 'Rechercher dans les messages…', 'aria-label': 'Rechercher dans les messages', value: N.q });
      q.addEventListener('input', debounce(function () { N.q = q.value; reload(); }, 300));
      add(v.filters, [h('div', { 'class': 'grow' }, q),
        segEl([['', 'Tous'], ['unread', 'Non lus'], ['starred', 'Favoris'], ['typing', 'En cours', 'En cours d’écriture']], N.status, function (x) { N.status = x; v.drawSeg(); reload(); }, 'Filtrer les messages'),
        h('button', { 'class': 'btn sm', type: 'button', onclick: function () {
          api('notes', { body: { action: 'read-all' } }).then(function (j) { if (j.status === 200) { toast('Tous les messages sont marqués comme lus.'); v.load(true); badges(); } else toast(j.error || 'Action impossible.', true); });
        } }, 'Tout marquer comme lu'), v.csv]);
      v.seg = v.filters.querySelector('.seg');
      add(v.el, [h('div', { 'class': 'head-row' }, h('h2', null, 'Messages des joueurs'), h('span', { 'class': 'sp' }), h('span', { 'class': 'scope' }, 'Texte saisi sur la page de connexion pendant l’enregistrement')), v.filters, v.chips, v.box]);
    },
    drawSeg: function () {
      var v = this, N = S.notes, nseg = segEl([['', 'Tous'], ['unread', 'Non lus'], ['starred', 'Favoris'], ['typing', 'En cours', 'En cours d’écriture']], N.status, function (x) { N.status = x; v.drawSeg(); N.page = 1; v.load(true); }, 'Filtrer les messages');
      v.filters.replaceChild(nseg, v.seg); v.seg = nseg;
    },
    load: function (quiet) {
      var v = this, seq = ++v.seq, N = S.notes;
      if (!v.built) { v.built = true; v.build(); }
      setBusy(v, quiet);
      clear(v.chips);
      if (N.player) v.chips.appendChild(h('span', { 'class': 'chip' }, 'Auteur : ', h('b', null, N.playerLabel || N.player), h('button', { 'class': 'btn sm ghost', type: 'button', 'aria-label': 'Retirer le filtre auteur', onclick: function () { N.player = ''; N.playerLabel = ''; N.page = 1; v.load(true); } }, '✕')));
      return api('notes?' + qs({ q: N.q, status: N.status, player: N.player, page: N.page, size: N.size })).then(function (d) {
        if (seq !== v.seq) return;
        setBusy(v, false);
        if (!d.ok) return failView(v, d);
        okView(v); N.page = d.page;
        var box = clear(v.box);
        if (!d.rows.length) { box.appendChild(empty(N.q || N.status || N.player ? 'Aucun message ne correspond' : 'Aucun message pour le moment', 'Les messages écrits sur la page de connexion (après « Démarrer l’enregistrement ») apparaîtront ici.')); return; }
        var list = h('div', { 'class': 'notes' });
        d.rows.forEach(function (n) {
          var open = function () { openNote(n.id); };
          var el = h('article', { 'class': 'note' + (n.read ? '' : ' unread'), tabindex: 0, role: 'button', 'aria-label': 'Ouvrir le message de ' + (n.name || 'anonyme') },
            h('span', { 'class': 'dot', title: n.read ? 'Lu' : 'Non lu' }),
            h('div', { style: null },
              h('div', { 'class': 'who' }, n.name || 'anonyme', n.verified ? stEl('ok', '✓') : h('span', { 'class': 'muted' }, 'invité'), n.blocked ? stEl('bad', '⛔ bloqué') : null,
                n.typing ? h('span', { 'class': 'typing' }, '✎ écrit en ce moment') : null, h('span', { 'class': 'when' }, ago(n.updatedAt))),
              h('div', { 'class': 'ex' }, n.excerpt || '(vide)')),
            h('div', { 'class': 'side' }, n.star ? h('span', { 'class': 'star', title: 'Favori' }, '★') : null, h('span', null, nf.format(n.chars) + ' car.')));
          el.addEventListener('click', open);
          el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
          list.appendChild(el);
        });
        box.appendChild(list);
        box.appendChild(pager(d, function (p) { N.page = p; v.load(true); }, function (n) { N.size = n; N.page = 1; v.load(true); }));
      });
    }
  });

  /* ============================ TENTATIVES REFUSÉES ============================ */
  makeView('rejected', {
    build: function () {
      var v = this;
      v.box = h('div');
      v.clearBtn = h('button', { 'class': 'btn sm danger', type: 'button', onclick: function () {
        if (!window.confirm('Vider la liste des tentatives refusées ?')) return;
        api('rejected', { body: { action: 'clear' } }).then(function (j) { if (j.status === 200) { toast('Liste vidée.'); v.load(true); badges(); } else toast(j.error || 'Action impossible.', true); });
      } }, 'Vider la liste');
      add(v.el, [h('div', { 'class': 'head-row' }, h('h2', null, 'Parties refusées'), h('span', { 'class': 'sp' }), v.clearBtn),
        h('p', { 'class': 'help' }, 'Le serveur vérifie chaque partie reçue : durée, score, vitesse, victoire… Ce qui est incohérent avec les règles du jeu est refusé et listé ici (les 300 dernières tentatives).'), v.box]);
    },
    load: function (quiet) {
      var v = this, seq = ++v.seq, R = S.rej;
      if (!v.built) { v.built = true; v.build(); }
      setBusy(v, quiet);
      return api('rejected?' + qs({ page: R.page, size: R.size })).then(function (d) {
        if (seq !== v.seq) return;
        setBusy(v, false);
        if (!d.ok) return failView(v, d);
        okView(v); R.page = d.page; v.clearBtn.hidden = !d.total;
        var box = clear(v.box);
        if (!d.rows.length) { box.appendChild(empty('Aucune tentative refusée', 'Tout ce que les joueurs ont envoyé était cohérent.')); return; }
        box.appendChild(table([
          { t: 'Date', m: 'd', render: function (r) { return fdate(r.at); } },
          { t: 'Joueur', cls: 'nm', m: 'a', render: function (r) { return h('span', null, r.name || '—', r.verified ? h('span', { 'class': 'st ok' }, ' ✓') : null); } },
          { t: 'Difficulté', m: 'c', render: function (r) { return tagDiff(r.claim.diff); } },
          { t: 'Annoncé', m: 'b', render: function (r) { return (r.claim.t != null ? mmss(r.claim.t) : '—') + ' · ' + (r.claim.score != null ? nf.format(r.claim.score) + ' pts' : '—'); } },
          { t: 'Écoulé', hide: true, num: true, render: function (r) { return r.claim.elapsed != null ? mmss(r.claim.elapsed) : '—'; } },
          { t: 'Attendu', hide: true, num: true, render: function (r) { return r.bounds ? nf.format(r.bounds.min) + ' – ' + nf.format(r.bounds.max) : '—'; } },
          { t: 'Raison', m: 'f', render: function (r) { return h('span', { 'class': 'st warn', title: r.error || '' }, REASON[r.code] || r.error || r.code); } }
        ], d.rows));
        box.appendChild(pager(d, function (p) { R.page = p; v.load(true); }, function (n) { R.size = n; R.page = 1; v.load(true); }));
      });
    }
  });

  /* ============================ SYSTÈME ============================ */
  makeView('system', {
    build: function () {
      var v = this;
      v.grid = h('div', { 'class': 'sys-grid' });
      add(v.el, [h('div', { 'class': 'head-row' }, h('h2', null, 'Système et sauvegarde')), v.grid]);
    },
    load: function (quiet) {
      var v = this, seq = ++v.seq;
      if (!v.built) { v.built = true; v.build(); }
      setBusy(v, quiet);
      return api('system').then(function (d) {
        if (seq !== v.seq) return;
        setBusy(v, false);
        if (!d.ok) return failView(v, d);
        okView(v);
        var st = d.store, g = clear(v.grid);
        var local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
        g.appendChild(h('div', { 'class': 'card' }, h('div', { 'class': 'card-h' }, h('h3', null, 'Stockage des données')),
          st.ok && st.writable ? h('p', { 'class': 'st ok' }, '✓ Écriture sur le disque : OK') : h('p', { 'class': 'banner bad' }, '⚠ Écriture impossible' + (st.lastError ? ' (' + st.lastError + ')' : '') + ' : les parties ne sont PAS enregistrées. Vérifie le dossier DATA_DIR.'),
          h('dl', { 'class': 'kv' }, kv('Dossier', h('span', { 'class': 'mono' }, st.dir)), kv('Journal', h('span', { 'class': 'mono' }, 'events.jsonl · ' + kb(st.bytes))),
            kv('Parties', nf.format(st.runs)), kv('Messages', nf.format(st.notes)), kv('Joueurs bloqués', nf.format(st.blocked)), kv('Tentatives refusées', nf.format(st.rejected)),
            kv('Comptes joueurs (en ligne)', nf.format(d.accounts)), kv('Lignes du journal', nf.format(st.lines))),
          h('p', { 'class': 'help' }, 'Chaque événement est écrit sur le disque avant d’être pris en compte : un redémarrage ne perd rien. Chez un hébergeur, place DATA_DIR sur un disque persistant.')));
        g.appendChild(h('div', { 'class': 'card' }, h('div', { 'class': 'card-h' }, h('h3', null, 'Serveur')),
          h('dl', { 'class': 'kv' }, kv('Node.js', d.node), kv('En marche depuis', longDur(d.uptime)), kv('Mémoire', d.memoryMB + ' Mo'),
            kv('Parties en cours', nf.format(d.live)), kv('Sessions admin ouvertes', nf.format(d.sessions)),
            kv('Connexion', d.https ? stEl('ok', '✓ chiffrée (HTTPS)') : stEl(local ? 'mut' : 'warn', local ? 'locale (http)' : '⚠ non chiffrée (http)'))),
          !d.https && !local ? h('p', { 'class': 'banner' }, 'Cette page est servie sans HTTPS : le mot de passe admin circule en clair. Mets le serveur derrière HTTPS avant de l’utiliser sur Internet.') : null));
        var pw = h('div', { 'class': 'card' }, h('div', { 'class': 'card-h' }, h('h3', null, 'Mot de passe administrateur')));
        if (d.passwordSource === 'env') pw.appendChild(h('p', { 'class': 'help' }, 'Le mot de passe est défini par la variable d’environnement ADMIN_PASSWORD du serveur. Pour le changer, modifie cette variable puis redémarre le serveur.'));
        else {
          var cur = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Mot de passe actuel', 'aria-label': 'Mot de passe actuel' });
          var nw = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Nouveau (10 caractères minimum)', 'aria-label': 'Nouveau mot de passe' });
          var msg = h('p', { 'class': 'help', role: 'status' });
          pw.appendChild(h('form', { onsubmit: function (e) {
            e.preventDefault();
            api('password', { body: { current: cur.value, next: nw.value } }).then(function (j) {
              if (j.status === 200) { cur.value = ''; nw.value = ''; msg.textContent = ''; toast('Mot de passe modifié.'); } else msg.textContent = j.error || 'Impossible de modifier le mot de passe.';
            });
          } }, h('div', { 'class': 'form-row' }, cur, nw, h('button', { 'class': 'btn primary', type: 'submit' }, 'Changer')), msg));
          pw.appendChild(h('p', { 'class': 'help' }, 'Mot de passe oublié : sur le serveur, lance « node server/server.js --reset-admin ».'));
        }
        g.appendChild(pw);
        g.appendChild(h('div', { 'class': 'card' }, h('div', { 'class': 'card-h' }, h('h3', null, 'Sauvegarde et exports')),
          h('p', { 'class': 'help' }, 'La sauvegarde contient toutes les parties et tous les messages (fichier .jsonl). Garde-en une copie régulièrement, surtout si ton hébergeur efface le disque à chaque mise à jour.'),
          h('div', { 'class': 'form-row' },
            h('a', { 'class': 'btn primary', href: 'api/admin/backup', download: '' }, '⇩ Sauvegarde complète'),
            h('a', { 'class': 'btn', href: 'api/admin/export/runs.csv', download: 'parties.csv' }, '⇩ Parties (CSV)'),
            h('a', { 'class': 'btn', href: 'api/admin/export/notes.csv', download: 'messages.csv' }, '⇩ Messages (CSV)'))));
      });
    }
  });

  /* ------------------------------ navigation ------------------------------ */
  var TABS = [['overview', 'Vue d’ensemble'], ['runs', 'Parties'], ['top', 'Classement'], ['players', 'Joueurs'], ['notes', 'Messages'], ['rejected', 'Suspects'], ['system', 'Système']];
  var tabEls = {};
  function buildTabs() {
    var nav = clear($('tabs'));
    TABS.forEach(function (t) {
      var b = h('button', { type: 'button', role: 'tab', 'data-view': t[0] }, t[1], h('span', { 'class': 'pill', hidden: true }));
      b.addEventListener('click', function () { go(t[0]); });
      nav.appendChild(b); tabEls[t[0]] = b;
    });
  }
  function go(view) {
    if (location.hash === '#' + view) route(); else location.hash = view;
  }
  function route() {
    if ($('app').hidden) return;
    var id = (location.hash || '#overview').slice(1).split('?')[0];
    if (!V[id]) id = 'overview';
    S.view = id;
    Object.keys(V).forEach(function (k) { V[k].el.hidden = k !== id; });
    Object.keys(tabEls).forEach(function (k) { tabEls[k].classList.toggle('on', k === id); tabEls[k].setAttribute('aria-selected', String(k === id)); });
    window.scrollTo({ top: 0 });
    V[id].load(false);
    badges();
  }
  window.addEventListener('hashchange', route);

  function badges() {
    return api('badges', { quiet: true }).then(function (b) {
      if (!b.ok) return;
      function pill(view, n, alt) { var p = tabEls[view] && tabEls[view].querySelector('.pill'); if (!p) return; p.hidden = !n; p.textContent = n > 99 ? '99+' : String(n); p.className = 'pill' + (alt ? ' alt' : ''); }
      pill('notes', b.unread, false); pill('rejected', b.rejected, true);
    });
  }

  /* ------------------------------ actualisation ------------------------------ */
  var refreshing = false;
  function refresh(auto) {
    if (refreshing || $('app').hidden) return;
    refreshing = true;
    var btn = $('refresh'); if (!auto) { btn.disabled = true; btn.classList.add('busy'); }
    var done = function () { refreshing = false; btn.disabled = false; btn.classList.remove('busy'); };
    Promise.resolve(V[S.view].load(true)).then(function () { return badges(); }).then(done, done);
  }
  $('refresh').addEventListener('click', function () { refresh(false); });
  $('auto').checked = S.auto;
  $('auto').addEventListener('change', function () { S.auto = $('auto').checked; savePrefs(); });
  setInterval(function () { if (S.auto && !document.hidden && !$('app').hidden && $('drawer').hidden) refresh(true); }, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.auto && !$('app').hidden) refresh(true); });

  /* ------------------------------ connexion ------------------------------ */
  function gateShow(msg) {
    $('app').hidden = true; $('gate').hidden = false;
    $('gate-err').textContent = msg || '';
    Drawer.close();
    setTimeout(function () { try { $('pw').focus(); } catch (e) { /* ignore */ } }, 30);
  }
  function appShow() {
    $('gate').hidden = true; $('app').hidden = false; $('gate-err').textContent = '';
    if (!tabEls.overview) buildTabs();
    route();
  }
  $('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('gate-btn'), pw = $('pw').value;
    if (!pw) { $('gate-err').textContent = 'Entre le mot de passe.'; return; }
    btn.disabled = true; $('gate-err').textContent = '';
    api('login', { body: { password: pw }, quiet: true }).then(function (j) {
      btn.disabled = false;
      if (j.status === 200) { $('pw').value = ''; appShow(); }
      else if (j.status === 0) $('gate-err').textContent = 'Serveur injoignable. Vérifie qu’il est démarré.';
      else $('gate-err').textContent = j.error || 'Connexion refusée.';
    });
  });
  $('logout').addEventListener('click', function () {
    api('logout', { body: {}, quiet: true }).then(function () { Object.keys(V).forEach(function (k) { V[k].built = false; clear(V[k].el); }); charts.length = 0; gateShow(''); });
  });

  /* ------------------------------ démarrage ------------------------------ */
  if (location.protocol === 'file:') {                 // ouverte comme un simple fichier : il n'y a aucun serveur à qui parler
    gateShow('Cette page doit être ouverte depuis ton serveur (par exemple http://localhost:8000/admin.html), pas comme un simple fichier : elle lit les données enregistrées en ligne.');
    $('pw').hidden = true; $('gate-btn').hidden = true; document.querySelector('label[for=pw]').hidden = true;
    return;
  }
  buildTabs();
  api('me', { quiet: true }).then(function (j) {
    if (j.status === 200) appShow(); else if (j.status === 0) gateShow('Serveur injoignable. Vérifie qu’il est démarré.'); else gateShow('');
  });
})();
