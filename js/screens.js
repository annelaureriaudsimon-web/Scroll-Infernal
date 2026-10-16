/* ==========================================================================
   screens.js — menu principal, réglages, boutique, classement et succès.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var save = G.save, S = save.data, COS = G.COSMETICS, ui = G.ui, audio = G.audio, C = G.CONFIG, ACH = G.ach;
  function $(id) { return document.getElementById(id); }
  function game() { return G.game; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CK = '<span class="cookie-ico"></span>';
  var CAUSE = {
    button: 'un bouton', link: 'un lien', logo: 'le logo', card: 'une carte', text: 'un pavé de texte', image: 'une image',
    video: 'une vidéo', input: 'un champ', ad: 'une pub', popup: 'une pop-up', cookie: 'un bandeau cookies',
    col: 'le pied de page', hero: 'le grand titre', rail: 'une barre latérale'
  };

  function fmtT(s) {
    s = Math.max(0, Math.round(s));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
    return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + r).slice(-2);
  }
  function fmtN(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function fmtD(ts) { return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }

  /* ======================= MENU PRINCIPAL ======================= */
  function modeKey() { return (S.settings.duration || 'inf') + '-' + S.settings.difficulty; }

  function refreshHub() {
    var s = S.settings, eq = S.equipped;
    $('menu-mode').textContent = (s.duration ? 'niveau de ' + s.duration + ' min' : 'mode infini') + ' · ' + C.DIFFS[s.difficulty].name.toLowerCase();
    $('menu-cookies').textContent = S.cookies;
    $('menu-best').textContent = S.stats.best[modeKey()] || 0;
    $('menu-games').textContent = S.stats.games;
    $('menu-wins').textContent = S.stats.wins;
    $('menu-total').textContent = S.stats.cookies;
    $('menu-skin').innerHTML = COS.skinHtml(eq.skin, eq.color);
    var col = COS.color(eq.color);
    $('menu-skin').classList.toggle('rainbow', !!col.rainbow);
    $('menu-skin').classList.toggle('glitch', !!col.glitch);
    $('menu-skin-name').textContent = COS.skin(eq.skin).name;
    $('menu-who').textContent = 'root@' + s.pseudo.toLowerCase().replace(/\s+/g, '_');
    $('menu-title').textContent = '[ ' + COS.title(eq.title).name + ' ]';
    $('menu-ach').textContent = ACH.count() + '/' + ACH.total();
  }

  /* ======================= RÉGLAGES ======================= */
  function cleanPseudo(v) {
    v = (v || '').replace(/[^\p{L}\p{N}_\-. ]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14);
    return v || 'invité';
  }

  function syncSettings() {
    var root = $('screen-settings');
    root.querySelectorAll('[data-setting]').forEach(function (el) {
      var key = el.dataset.setting, v = S.settings[key];
      if (el.classList.contains('seg')) {
        el.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(v)); });
      } else if (el.type === 'checkbox') {
        el.checked = !!v;
      } else if (el.type === 'range') {
        el.value = v;
        var out = el.parentNode.querySelector('output');
        if (out) out.textContent = key === 'volume' ? Math.round(v * 100) + ' %' : '×' + Number(v).toFixed(1);
      }
    });
    $('diff-desc').textContent = C.DIFFS[S.settings.difficulty].desc;
    var p = $('set-pseudo');
    if (document.activeElement !== p) p.value = S.settings.pseudo === 'invité' ? '' : S.settings.pseudo;
  }

  function applySettings() {
    save.commit();
    syncSettings();
    game().applySettings();
    refreshHub();
  }

  function bindSettings() {
    $('screen-settings').querySelectorAll('[data-setting]').forEach(function (el) {
      var key = el.dataset.setting;
      if (el.classList.contains('seg')) {
        el.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          S.settings[key] = key === 'duration' ? Number(b.dataset.v) : b.dataset.v;
          audio.click();
          applySettings();
        });
      } else if (el.type === 'checkbox') {
        el.addEventListener('change', function () { S.settings[key] = el.checked; applySettings(); });
      } else if (el.type === 'range') {
        el.addEventListener('input', function () { S.settings[key] = Number(el.value); applySettings(); });
        el.addEventListener('change', function () { if (key === 'volume') audio.coin(); });
      }
    });

    var pe = $('set-pseudo');
    pe.addEventListener('input', function () {
      S.settings.pseudo = cleanPseudo(pe.value);
      save.commit(); refreshHub(); ACH.check(null);
    });
    pe.addEventListener('blur', function () { pe.value = S.settings.pseudo === 'invité' ? '' : S.settings.pseudo; });

    var resetBtn = $('btn-reset'), armed = 0;
    resetBtn.addEventListener('click', function () {
      if (!armed) {
        armed = setTimeout(function () { armed = 0; resetBtn.textContent = 'rm -rf progression'; resetBtn.classList.remove('danger'); }, 3500);
        resetBtn.textContent = 'Sûr ? Clique encore pour tout effacer';
        resetBtn.classList.add('danger');
        return;
      }
      clearTimeout(armed); armed = 0;
      resetBtn.textContent = 'rm -rf progression'; resetBtn.classList.remove('danger');
      save.reset();
      syncSettings(); game().applySettings(); game().applyCosmetics(); refreshHub(); renderShop();
      ui.toast('Progression effacée.', 1600);
    });
  }

  /* ======================= BOUTIQUE ======================= */
  var TABS = [
    { id: 'skins', label: 'Souris' }, { id: 'colors', label: 'Couleurs' }, { id: 'trails', label: 'Traînées' },
    { id: 'uis', label: 'Interface' }, { id: 'titles', label: 'Titres' }, { id: 'upgrades', label: 'Bonus' }
  ];
  var EQ_KEY = { skins: 'skin', colors: 'color', trails: 'trail', uis: 'ui', titles: 'title' };
  var tab = 'skins';

  function trailPreview(t) {
    if (!t.palette || !t.palette.length) return '<span class="none">Aucune</span>';
    var out = '<svg viewBox="0 0 110 40" width="110" height="40">';
    for (var i = 0; i < 8; i++) {
      var col = t.palette[i % t.palette.length];
      out += '<circle cx="' + (12 + i * 12) + '" cy="' + (22 + Math.sin(i * 0.9) * 7) + '" r="' + (1.5 + i * 0.7) + '" fill="' + col + '" opacity="' + (0.25 + i * 0.1) + '"/>';
    }
    return out + '</svg>';
  }

  function priceBtn(act, type, id, price, label) {
    var dis = S.cookies < price ? ' disabled' : '';
    return '<button class="buy" data-act="' + act + '" data-type="' + type + '" data-id="' + id + '"' + dis + '>' + label + ' ' + CK + '<b>' + price + '</b></button>';
  }

  function card(on, prev, name, desc, btn, extra, cls) {
    return '<div class="item' + (on ? ' on' : '') + (cls ? ' ' + cls : '') + '"><div class="prev">' + prev + '</div><h4>' + name + '</h4><p>' + desc + '</p>' + (extra || '') + btn + '</div>';
  }

  function renderShop() {
    $('shop-cookies').textContent = S.cookies;
    $('shop-tabs').innerHTML = TABS.map(function (t) {
      return '<button class="' + (t.id === tab ? 'on' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>';
    }).join('');

    var html = '';
    if (tab === 'upgrades') {
      COS.upgrades.forEach(function (u) {
        var lvl = S.upgrades[u.id] || 0, pips = '';
        for (var i = 0; i < u.max; i++) pips += '<i class="' + (i < lvl ? 'on' : '') + '"></i>';
        var btn = lvl >= u.max ? '<button class="buy" disabled>Niveau max ✓</button>' : priceBtn('up', 'upgrades', u.id, u.prices[lvl], lvl ? 'Améliorer' : 'Acheter');
        html += card(lvl >= u.max, u.icon, u.name, u.desc + (lvl ? '<br><em>Actuel : ' + u.lvl[lvl - 1] + '</em>' : ''), btn, '<div class="pips">' + pips + '</div>');
      });
    } else {
      var list = COS[tab], eqId = S.equipped[EQ_KEY[tab]];
      list.forEach(function (it) {
        var owned = COS.owns(tab, it, S), equipped = eqId === it.id, prev, extra = '', cls = '';
        if (tab === 'skins') prev = COS.skinHtml(it.id, S.equipped.color);
        else if (tab === 'colors') prev = '<div class="' + (it.rainbow ? 'rainbow' : '') + (it.glitch ? ' glitch' : '') + '">' + COS.skinHtml(S.equipped.skin, it.id) + '</div>';
        else if (tab === 'trails') prev = trailPreview(it);
        else if (tab === 'uis') prev = '<div class="ui-prev" style="--g:' + it.g + ';--g2:' + it.g2 + ';--g-rgb:' + it.rgb + '"><i>root@scroll:~$</i><b>_</b></div>';
        else prev = '<div class="title-prev">[ ' + esc(it.name) + ' ]</div>';

        var btn;
        if (equipped) btn = '<button class="buy" disabled>Équipé ✓</button>';
        else if (owned) btn = '<button class="buy equip" data-act="equip" data-type="' + tab + '" data-id="' + it.id + '">Équiper</button>';
        else if (it.req) {
          btn = '<button class="buy" disabled>Verrouillé</button>';
          extra = '<p class="lock">Succès : <b>' + esc(ACH.byId[it.req].name) + '</b></p>';
          cls = 'locked';
        } else btn = priceBtn('buy', tab, it.id, it.price, 'Acheter');
        html += card(equipped, prev, esc(it.name), it.desc || (tab === 'colors' ? 'Teinte ta souris.' : ''), btn, extra, cls);
      });
    }
    $('shop-grid').innerHTML = html;
    var n = tab === 'upgrades' ? COS.upgrades.length : COS[tab].length;
    $('shop-count').textContent = n + ' objets dans cet onglet';
  }

  function bindShop() {
    $('shop-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]');
      if (!b) return;
      tab = b.dataset.tab; audio.click(); renderShop();
    });
    $('shop-grid').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      var act = b.dataset.act, type = b.dataset.type, id = b.dataset.id, price;
      if (act === 'up') {
        var u = COS.upgrade(id), lvl = S.upgrades[id] || 0;
        price = u.prices[lvl];
        if (lvl >= u.max || S.cookies < price) return;
        S.cookies -= price; S.upgrades[id] = lvl + 1; S.stats.purchases++;
        ui.toast(u.name + ' : niveau ' + (lvl + 1) + ' !', 1400); audio.power();
      } else if (act === 'buy') {
        var item = COS[type].filter(function (x) { return x.id === id; })[0];
        if (!item || item.req || S.cookies < item.price || S.owned[type].indexOf(id) >= 0) return;
        S.cookies -= item.price; S.owned[type].push(id); S.equipped[EQ_KEY[type]] = id; S.stats.purchases++;
        ui.toast(item.name + ' acheté et équipé !', 1400); audio.coin();
      } else if (act === 'equip') {
        var it2 = COS[type].filter(function (x) { return x.id === id; })[0];
        if (!it2 || !COS.owns(type, it2, S)) return;
        if (S.owned[type].indexOf(id) < 0) S.owned[type].push(id);   // objet offert par un succès
        S.equipped[EQ_KEY[type]] = id; audio.click();
      }
      save.commit();
      game().applyCosmetics();
      ACH.check(null);
      renderShop(); refreshHub();
    });
  }

  /* ======================= CLASSEMENT ======================= */
  var rankTab = 'all';
  var RTABS = [{ id: 'all', label: 'Tous' }, { id: 'infernal', label: 'Infernal' }, { id: 'normal', label: 'Normal' }, { id: 'zen', label: 'Zen' }];

  function runsFor(t) {
    var all = [];
    ['infernal', 'normal', 'zen'].forEach(function (d) {
      if (t === 'all' || t === d) (S.runs[d] || []).forEach(function (r) { all.push(r); });
    });
    all.sort(function (a, b) { return b.score - a.score; });
    return all.slice(0, 10);
  }
  function modeLabel(r) {
    var d = C.DIFFS[r.diff].name;
    if (!r.dur) return d + ' · infini';
    return d + ' · ' + r.dur + ' min' + (r.endless ? ' + ∞' : '');
  }
  function resultText(r) {
    if (r.won) return r.result === 'death' ? 'Niveau terminé, puis éliminé' : 'Niveau terminé';
    if (r.result === 'quit') return 'Partie quittée';
    return 'Éliminé par ' + (CAUSE[r.cause] || 'un élément');
  }
  function spark(samples) {
    if (!samples || samples.length < 2) return '<p class="hint">Partie trop courte pour tracer un profil.</p>';
    var W = 320, H = 64, max = Math.max.apply(null, samples), pts = [];
    samples.forEach(function (v, i) { pts.push((i / (samples.length - 1) * W).toFixed(1) + ',' + (H - 3 - v / max * (H - 8)).toFixed(1)); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="spark"><polygon points="0,' + H + ' ' + pts.join(' ') + ' ' + W + ',' + H + '" fill="currentColor" opacity=".14"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>' +
      '<div class="spark-ax"><span>0:00</span><span>vitesse max ×' + max.toFixed(1) + '</span><span>' + fmtT(r_end(samples)) + '</span></div>';
  }
  var _sInt = 10;
  function r_end(samples) { return (samples.length - 1) * _sInt; }

  function renderRank() {
    $('rank-tabs').innerHTML = RTABS.map(function (t) {
      return '<button class="' + (t.id === rankTab ? 'on' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>';
    }).join('');
    $('rank-who').textContent = S.settings.pseudo + ' · ' + COS.title(S.equipped.title).name;

    var runs = runsFor(rankTab), best = runs[0];
    if (!best) {
      $('rank-best').innerHTML = '<div class="empty"><b>&gt; aucune partie enregistrée_</b><p>Joue une partie : ta meilleure apparaîtra ici avec son profil de vitesse.</p></div>';
      $('rank-table').innerHTML = '';
    } else {
      _sInt = best.sInt || 10;
      $('rank-best').innerHTML =
        '<div class="bestcard"><div class="bc-top"><div class="bc-skin' + (COS.color(best.color).rainbow ? ' rainbow' : '') + (COS.color(best.color).glitch ? ' glitch' : '') + '">' + COS.skinHtml(best.skin, best.color) + '</div>' +
        '<div class="bc-main"><small>MEILLEURE PARTIE</small><b class="bc-score">' + fmtN(best.score) + '</b>' +
        '<span class="bc-who">' + esc(best.pseudo) + ' · [ ' + esc(COS.title(best.title || 'rookie').name) + ' ]</span></div>' +
        '<div class="bc-mode"><span>' + modeLabel(best) + '</span><em class="' + (best.won ? 'win' : 'lose') + '">' + resultText(best) + '</em></div></div>' +
        '<div class="bc-grid"><div><small>TEMPS</small><b>' + fmtT(best.t) + '</b></div><div><small>VITESSE MAX</small><b>×' + best.mul.toFixed(1) + '</b></div>' +
        '<div><small>COOKIES</small><b>' + best.cookies + '</b></div><div><small>DATE</small><b>' + fmtD(best.date) + '</b></div></div>' +
        '<div class="bc-spark"><small>PROFIL DE VITESSE</small>' + spark(best.samples) + '</div></div>';

      var lastId = game().rec ? game().rec.id : '';
      $('rank-table').innerHTML = '<table><thead><tr><th>#</th><th>Mode</th><th>Score</th><th class="hs">Temps</th><th class="hs">Vit.</th><th class="hs2">Fin</th></tr></thead><tbody>' +
        runs.map(function (r, i) {
          return '<tr class="' + (r.id === lastId ? 'last' : '') + '"><td class="pos p' + (i + 1) + '">' + (i + 1) + '</td><td>' + modeLabel(r) + '</td><td class="sc">' + fmtN(r.score) + '</td>' +
            '<td class="hs">' + fmtT(r.t) + '</td><td class="hs">×' + r.mul.toFixed(1) + '</td><td class="hs2">' + (r.won ? 'Terminé' : r.result === 'quit' ? 'Quitté' : esc(CAUSE[r.cause] || '—')) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    var recs = Object.keys(S.stats.best).filter(function (k) { return S.stats.best[k] > 0; }).map(function (k) {
      var p = k.split('-'), d = C.DIFFS[p[1]];
      return d ? '<span><small>' + (p[0] === 'inf' ? 'Infini' : p[0] + ' min') + ' · ' + d.name + '</small><b>' + fmtN(S.stats.best[k]) + '</b></span>' : '';
    }).join('');
    $('rank-records').innerHTML = recs ? '<h5>Records par mode</h5><div class="recs">' + recs + '</div>' : '';
  }

  /* ======================= SUCCÈS ======================= */
  var achTab = 'all';
  var ATABS = [{ id: 'all', label: 'Tous' }, { id: 'bronze', label: 'Bronze' }, { id: 'silver', label: 'Argent' }, { id: 'gold', label: 'Or' }, { id: 'legend', label: 'Légende' }, { id: 'plat', label: 'Platine' }];

  function renderAch() {
    var n = ACH.count(), tot = ACH.total();
    $('ach-count').textContent = n + ' / ' + tot;
    $('ach-total-fill').style.width = (n / tot * 100) + '%';
    $('ach-tabs').innerHTML = ATABS.map(function (t) {
      var c = t.id === 'all' ? '' : ' (' + ACH.list.filter(function (a) { return a.tier === t.id && ACH.done(a.id); }).length + '/' + ACH.list.filter(function (a) { return a.tier === t.id; }).length + ')';
      return '<button class="' + (t.id === achTab ? 'on' : '') + '" data-tab="' + t.id + '">' + t.label + c + '</button>';
    }).join('');
    $('ach-grid').innerHTML = ACH.list.filter(function (a) { return achTab === 'all' || a.tier === achTab; }).map(function (a) {
      var done = ACH.done(a.id), T = ACH.TIERS[a.tier], hidden = a.secret && !done, pr = '';
      if (!done && !hidden && a.goal > 1) {
        var p = ACH.progress(a);
        pr = '<div class="pr"><i style="width:' + (p.pct * 100).toFixed(1) + '%"></i></div><small class="prt">' + p.text + '</small>';
      }
      return '<div class="ach t-' + a.tier + (done ? ' done' : '') + '"><div class="abadge">' + (done ? '✓' : hidden ? '?' : '◆') + '</div>' +
        '<div class="body"><h4>' + (hidden ? '???' : esc(a.name)) + '<em>' + T.name + '</em></h4><p>' + (hidden ? 'Succès secret : à toi de le trouver.' : esc(a.desc)) + '</p>' + pr + '</div>' +
        '<div class="rw">' + (done ? fmtD(S.achievements[a.id]) : CK + '+' + T.reward) + '</div></div>';
    }).join('');
  }

  function bindTabs(id, setter, render) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]');
      if (!b) return;
      setter(b.dataset.tab); audio.click(); render();
    });
  }

  G.screens = {
    refresh: refreshHub,
    openShop: function (from) { renderShop(); ui.show('shop', from); },
    openSettings: function (from) { syncSettings(); ui.show('settings', from); },
    openRank: function (from) { renderRank(); ui.show('rank', from); },
    openAch: function (from) { renderAch(); ui.show('ach', from); },
    onAch: function () {
      refreshHub();
      if (ui.current === 'ach') renderAch();
      else if (ui.current === 'shop') renderShop();
    },
    init: function () {
      bindSettings(); bindShop();
      bindTabs('rank-tabs', function (t) { rankTab = t; }, renderRank);
      bindTabs('ach-tabs', function (t) { achTab = t; }, renderAch);
      syncSettings(); renderShop(); refreshHub();
    }
  };
})();
