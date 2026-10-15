/* ==========================================================================
   screens.js — menu principal, réglages et boutique.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var save = G.save, S = save.data, COS = G.COSMETICS, ui = G.ui, audio = G.audio, C = G.CONFIG;
  function $(id) { return document.getElementById(id); }
  function game() { return G.game; }

  var CK = '<span class="cookie-ico"></span>';

  /* ======================= MENU PRINCIPAL ======================= */
  function modeKey() { return (S.settings.duration || 'inf') + '-' + S.settings.difficulty; }

  function refreshHub() {
    var s = S.settings, eq = S.equipped;
    $('menu-mode').textContent = (s.duration ? 'Niveau de ' + s.duration + ' min' : 'Mode infini') + ' · ' + C.DIFFS[s.difficulty].name;
    $('menu-cookies').textContent = S.cookies;
    $('menu-best').textContent = S.stats.best[modeKey()] || 0;
    $('menu-games').textContent = S.stats.games;
    $('menu-wins').textContent = S.stats.wins;
    $('menu-total').textContent = S.stats.cookies;
    $('menu-skin').innerHTML = COS.skinHtml(eq.skin, eq.color);
    $('menu-skin').classList.toggle('rainbow', !!COS.color(eq.color).rainbow);
    $('menu-skin-name').textContent = COS.skin(eq.skin).name;
  }

  /* ======================= RÉGLAGES ======================= */
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

    var resetBtn = $('btn-reset'), armed = 0;
    resetBtn.addEventListener('click', function () {
      if (!armed) {
        armed = setTimeout(function () { armed = 0; resetBtn.textContent = 'Réinitialiser la progression'; resetBtn.classList.remove('danger'); }, 3500);
        resetBtn.textContent = 'Sûr ? Clique encore pour tout effacer';
        resetBtn.classList.add('danger');
        return;
      }
      clearTimeout(armed); armed = 0;
      resetBtn.textContent = 'Réinitialiser la progression'; resetBtn.classList.remove('danger');
      save.reset();
      syncSettings(); game().applySettings(); game().applyCosmetics(); refreshHub(); renderShop();
      ui.toast('Progression réinitialisée.', 1600);
    });
  }

  /* ======================= BOUTIQUE ======================= */
  var TABS = [
    { id: 'skins', label: 'Souris' }, { id: 'colors', label: 'Couleurs' },
    { id: 'trails', label: 'Traînées' }, { id: 'upgrades', label: 'Bonus' }
  ];
  var EQ_KEY = { skins: 'skin', colors: 'color', trails: 'trail' };
  var OWN_KEY = { skins: 'skins', colors: 'colors', trails: 'trails' };
  var tab = 'skins';

  function trailPreview(t) {
    if (!t.palette.length) return '<span class="none">Aucune</span>';
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

  function card(on, prev, name, desc, btn, extra) {
    return '<div class="item' + (on ? ' on' : '') + '"><div class="prev">' + prev + '</div><h4>' + name + '</h4><p>' + desc + '</p>' + (extra || '') + btn + '</div>';
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
        var owned = S.owned[OWN_KEY[tab]].indexOf(it.id) >= 0, equipped = eqId === it.id, prev;
        if (tab === 'skins') prev = COS.skinHtml(it.id, S.equipped.color);
        else if (tab === 'colors') prev = '<div class="' + (it.rainbow ? 'rainbow' : '') + '">' + COS.skinHtml(S.equipped.skin, it.id) + '</div>';
        else prev = trailPreview(it);
        var btn = equipped ? '<button class="buy" disabled>Équipé ✓</button>'
          : owned ? '<button class="buy equip" data-act="equip" data-type="' + tab + '" data-id="' + it.id + '">Équiper</button>'
          : priceBtn('buy', tab, it.id, it.price, 'Acheter');
        html += card(equipped, prev, it.name, it.desc || (tab === 'colors' ? 'Teinte ta souris.' : ''), btn);
      });
    }
    $('shop-grid').innerHTML = html;
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
        S.cookies -= price; S.upgrades[id] = lvl + 1;
        ui.toast(u.name + ' : niveau ' + (lvl + 1) + ' !', 1400); audio.power();
      } else if (act === 'buy') {
        var item = COS[type].filter(function (x) { return x.id === id; })[0];
        if (!item || S.cookies < item.price || S.owned[type].indexOf(id) >= 0) return;
        S.cookies -= item.price; S.owned[type].push(id); S.equipped[EQ_KEY[type]] = id;
        ui.toast(item.name + ' acheté et équipé !', 1400); audio.coin();
      } else if (act === 'equip') {
        S.equipped[EQ_KEY[type]] = id; audio.click();
      }
      save.commit();
      game().applyCosmetics();
      renderShop(); refreshHub();
    });
  }

  G.screens = {
    refresh: refreshHub,
    openShop: function (from) { renderShop(); ui.show('shop', from); },
    openSettings: function (from) { syncSettings(); ui.show('settings', from); },
    init: function () { bindSettings(); bindShop(); syncSettings(); renderShop(); refreshHub(); }
  };
})();
