/* ==========================================================================
   achievements.js — les succès (dont des trucs quasi impossibles).
   Chaque succès : { id, tier, name, desc, goal, val(S, run), fmt?, secret? }
   val() renvoie la progression ; le succès est gagné quand val >= goal.
   « run » = la partie en cours (ou celle qui vient de finir), ou null.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var save = G.save, COS = G.COSMETICS;

  var TIERS = {
    bronze: { name: 'Bronze', reward: 20, order: 0 },
    silver: { name: 'Argent', reward: 60, order: 1 },
    gold:   { name: 'Or', reward: 200, order: 2 },
    legend: { name: 'Légende', reward: 1000, order: 3 },
    plat:   { name: 'Platine', reward: 3000, order: 4 }
  };

  // Cumul : valeur déjà sauvegardée + ce que la partie en cours a fait depuis la dernière sauvegarde
  function lt(sk, rk) {
    return function (S, r) { return (S.stats[sk] || 0) + (r ? (r[rk] || 0) - (r[rk + 'B'] || 0) : 0); };
  }
  // Record : le meilleur entre le passé et la partie en cours
  function mx(sk, rk) {
    return function (S, r) { return Math.max(S.stats[sk] || 0, r ? r[rk] || 0 : 0); };
  }
  function inf(S, r) { return Math.max(S.stats.infT || 0, r && r.diff === 'infernal' ? r.t : 0); }
  function died(cause) { return function (S) { return (S.stats.deaths[cause] || 0) > 0 ? 1 : 0; }; }
  function owned(type) {
    return function (S) { return COS[type].filter(function (it) { return COS.owns(type, it, S); }).length; };
  }
  function flag(fn) { return function (S, r) { return r && fn(S, r) ? 1 : 0; }; }

  var L = [];
  function A(id, tier, name, desc, goal, val, o) {
    var a = { id: id, tier: tier, name: name, desc: desc, goal: goal, val: val };
    if (o) for (var k in o) a[k] = o[k];
    L.push(a);
  }
  var T = { fmt: 'time' };

  /* ---- Bronze ---- */
  A('run1', 'bronze', 'Premier clic', 'Lance ta première partie.', 1, function (S, r) { return S.stats.games + (r ? 1 : 0); });
  A('cookie1', 'bronze', 'Première miette', 'Ramasse un cookie.', 1, lt('picked', 'cookies'));
  A('power1', 'bronze', 'Bonus !', 'Ramasse un bonus.', 1, lt('powers', 'powers'));
  A('shield1', 'bronze', 'Pare-feu en action', 'Annule un choc avec un Pare-feu.', 1, function (S) { return S.stats.shields; });
  A('buy1', 'bronze', 'Shopping', 'Achète ton premier objet à la boutique.', 1, function (S) { return S.stats.purchases; });
  A('pseudo', 'bronze', 'Identité secrète', 'Choisis ton pseudo dans les réglages.', 1, function (S) { return S.settings.pseudo && S.settings.pseudo !== 'invité' ? 1 : 0; });
  A('t60', 'bronze', 'Une minute', 'Survis 1 minute.', 60, mx('bestT', 't'), T);
  A('cook25', 'bronze', 'Gourmand', 'Ramasse 25 cookies dans une même partie.', 25, function (S, r) { return r ? r.cookies : 0; });
  A('score10k', 'bronze', 'Ça roule', 'Atteins 10 000 points.', 10000, mx('bestScore', 'score'));
  A('mul3', 'bronze', 'Ça va vite', 'Atteins la vitesse ×3.', 3, mx('mul', 'mul'), { fmt: 'mul' });
  A('near50', 'bronze', 'Frôleur', 'Frôle 50 blocs à moins de 18 px sans les toucher.', 50, lt('nears', 'nears'));
  A('games10', 'bronze', 'Habitué', 'Joue 10 parties.', 10, function (S, r) { return S.stats.games + (r && !r.counted ? 1 : 0); });
  A('die_early', 'bronze', 'Quelle erreur…', 'Perds dans les 3 premières secondes.', 1, flag(function (S, r) { return r.cause && r.t < 3; }), { secret: true });
  A('quit_early', 'bronze', 'Poltron', 'Quitte une partie avant 10 secondes.', 1, flag(function (S, r) { return r.result === 'quit' && r.t < 10; }), { secret: true });
  A('night', 'bronze', 'Oiseau de nuit', 'Joue entre 2 h et 5 h du matin.', 1, flag(function () { var h = new Date().getHours(); return h >= 2 && h < 5; }), { secret: true });

  /* ---- Argent ---- */
  A('t300', 'silver', 'Cinq minutes', 'Survis 5 minutes.', 300, mx('bestT', 't'), T);
  A('t600', 'silver', 'Dix minutes', 'Survis 10 minutes.', 600, mx('bestT', 't'), T);
  A('win5', 'silver', 'Page chargée (version courte)', 'Termine un niveau d’au moins 5 minutes.', 5, function (S) { return S.stats.winMax; }, { fmt: 'min' });
  A('mul6', 'silver', 'Turbo', 'Atteins la vitesse ×6.', 6, mx('mul', 'mul'), { fmt: 'mul' });
  A('cook100', 'silver', 'Boulimique', 'Ramasse 100 cookies dans une même partie.', 100, function (S, r) { return r ? r.cookies : 0; });
  A('score50k', 'silver', 'Autoroute', 'Atteins 50 000 points.', 50000, mx('bestScore', 'score'));
  A('shield5', 'silver', 'Bloqueur de pub', 'Annule 5 chocs avec un Pare-feu.', 5, function (S) { return S.stats.shields; });
  A('pow20', 'silver', 'Accro aux bonus', 'Ramasse 20 bonus.', 20, lt('powers', 'powers'));
  A('near300', 'silver', 'Funambule', 'Frôle 300 blocs sans les toucher.', 300, lt('nears', 'nears'));
  A('still4', 'silver', 'Statue', 'Reste immobile 4 secondes sans mourir.', 4, mx('still', 'still'), T);
  A('buy10', 'silver', 'Accro du shopping', 'Achète 10 objets.', 10, function (S) { return S.stats.purchases; });
  A('games100', 'silver', 'Fidèle', 'Joue 100 parties.', 100, function (S, r) { return S.stats.games + (r && !r.counted ? 1 : 0); });
  A('total1k', 'silver', 'Épargnant', 'Gagne 1 000 cookies au total.', 1000, function (S) { return S.stats.cookies; });
  A('inf60', 'silver', 'Premier feu', 'Survis 1 minute en Infernal.', 60, inf, T);
  A('allpow', 'silver', 'Trio gagnant', 'Ramasse les 3 types de bonus dans une même partie.', 3, function (S, r) { return r ? Object.keys(r.p).length : 0; });
  A('time1h', 'silver', 'Une heure', 'Joue 1 heure en tout.', 3600, lt('time', 't'), T);
  A('skins8', 'silver', 'Collectionneur', 'Possède 8 souris.', 8, owned('skins'));
  A('die_ad', 'silver', 'Victime de la pub', 'Perds à cause d’une pub.', 1, died('ad'));
  A('die_popup', 'silver', 'Pop-up !', 'Perds à cause d’une pop-up.', 1, died('popup'));
  A('die_cookie', 'silver', 'Trahi par un cookie', 'Perds à cause d’un bandeau de cookies.', 1, died('cookie'));
  A('die_button', 'silver', 'Mauvais clic', 'Perds à cause d’un bouton.', 1, died('button'));

  /* ---- Or ---- */
  A('t1200', 'gold', 'Vingt minutes', 'Survis 20 minutes.', 1200, mx('bestT', 't'), T);
  A('win30', 'gold', 'Page chargée !', 'Termine un niveau de 30 minutes. Débloque la souris Hacker.', 30, function (S) { return S.stats.winMax; }, { fmt: 'min' });
  A('inf180', 'gold', 'L’enfer, c’est ici', 'Survis 3 minutes en Infernal.', 180, inf, T);
  A('mul10', 'gold', 'Hyperespace', 'Atteins la vitesse ×10.', 10, mx('mul', 'mul'), { fmt: 'mul' });
  A('mul14', 'gold', 'Mach 14', 'Atteins la vitesse ×14.', 14, mx('mul', 'mul'), { fmt: 'mul' });
  A('cook300', 'gold', 'Pâtissier', 'Ramasse 300 cookies dans une même partie.', 300, function (S, r) { return r ? r.cookies : 0; });
  A('score100k', 'gold', 'Six chiffres', 'Atteins 100 000 points. Débloque la traînée Binaire.', 100000, mx('bestScore', 'score'));
  A('near1500', 'gold', 'Danseur de l’extrême', 'Frôle 1 500 blocs sans les toucher.', 1500, lt('nears', 'nears'));
  A('still10', 'gold', 'Zen absolu', 'Reste immobile 10 secondes sans mourir.', 10, mx('still', 'still'), T);
  A('ascete', 'gold', 'Ascète', 'Survis 5 minutes sans ramasser un seul cookie.', 300, mx('noCookie', 'noCookie'), T);
  A('pacifist', 'gold', 'Régime sec', 'Termine un niveau d’au moins 5 minutes sans aucun cookie.', 1, flag(function (S, r) { return r.won && r.dur >= 5 && r.cookies === 0; }));
  A('total10k', 'gold', 'Banquier', 'Gagne 10 000 cookies au total.', 10000, function (S) { return S.stats.cookies; });
  A('time10h', 'gold', 'Dix heures', 'Joue 10 heures en tout.', 36000, lt('time', 't'), T);
  A('upg_all', 'gold', 'Surarmé', 'Monte toutes les améliorations au maximum.', COS.upgrades.length, function (S) {
    return COS.upgrades.filter(function (u) { return (S.upgrades[u.id] || 0) >= u.max; }).length;
  });
  A('skins_all', 'gold', 'Garde-robe complète', 'Possède toutes les souris.', COS.skins.length, owned('skins'));
  A('inf_win5', 'gold', 'Dompteur d’enfer', 'Termine un niveau de 5 minutes en Infernal.', 5, function (S) { return S.stats.infWinMax; }, { fmt: 'min' });

  /* ---- Légende : quasi impossibles ---- */
  A('t3600', 'legend', 'Une heure d’enfer', 'Survis 1 heure (mode infini).', 3600, mx('bestT', 't'), T);
  A('inf300', 'legend', 'Maître de l’enfer', 'Survis 5 minutes en Infernal.', 300, inf, T);
  A('inf600', 'legend', 'Sans pitié', 'Survis 10 minutes en Infernal.', 600, inf, T);
  A('mul18', 'legend', 'Vitesse de la lumière', 'Atteins la vitesse ×18.', 18, mx('mul', 'mul'), { fmt: 'mul' });
  A('mul22', 'legend', 'Au-delà du mur du son', 'Atteins la vitesse ×22.', 22, mx('mul', 'mul'), { fmt: 'mul' });
  A('score250k', 'legend', 'Quart de million', 'Atteins 250 000 points.', 250000, mx('bestScore', 'score'));
  A('score500k', 'legend', 'Demi-million', 'Atteins 500 000 points.', 500000, mx('bestScore', 'score'));
  A('inf_win30', 'legend', 'Dieu du web', 'Termine un niveau de 30 minutes en Infernal. Débloque le titre « Légende vivante ».', 30, function (S) { return S.stats.infWinMax; }, { fmt: 'min' });
  A('still20', 'legend', 'Mort-vivant', 'Reste immobile 20 secondes sans mourir.', 20, mx('still', 'still'), T);
  A('near5000', 'legend', 'Sixième sens', 'Frôle 5 000 blocs sans les toucher.', 5000, lt('nears', 'nears'));
  A('total100k', 'legend', 'Milliardaire', 'Gagne 100 000 cookies au total.', 100000, function (S) { return S.stats.cookies; });
  A('time100h', 'legend', 'Plus de vie', 'Joue 100 heures en tout.', 360000, lt('time', 't'), T);
  A('games1000', 'legend', 'Mille et une parties', 'Joue 1 000 parties.', 1000, function (S, r) { return S.stats.games + (r && !r.counted ? 1 : 0); });
  A('ascete2', 'legend', 'Moine du web', 'Survis 15 minutes sans ramasser un seul cookie.', 900, mx('noCookie', 'noCookie'), T);

  /* ---- Platine ---- */
  A('platinum', 'plat', 'Platine', 'Débloque tous les autres succès. Débloque le titre « Dieu du scroll ».', 0, function (S) {
    return Object.keys(S.achievements).filter(function (k) { return k !== 'platinum'; }).length;
  });
  L[L.length - 1].goal = L.length - 1;

  var byId = {};
  L.forEach(function (a) { byId[a.id] = a; });

  function fmtVal(a, v) {
    v = Math.min(a.goal, Math.floor(v));
    if (a.fmt === 'time') {
      if (a.goal >= 3600) return Math.floor(v / 3600) + ' h ' + Math.floor(v % 3600 / 60) + ' min';
      return Math.floor(v / 60) + ':' + ('0' + (v % 60)).slice(-2);
    }
    if (a.fmt === 'mul') return '×' + v;
    if (a.fmt === 'min') return v + ' min';
    return String(v);
  }

  G.ach = {
    list: L, TIERS: TIERS, byId: byId,
    done: function (id) { return !!save.data.achievements[id]; },
    count: function () { return Object.keys(save.data.achievements).filter(function (k) { return byId[k]; }).length; },
    total: function () { return L.length; },
    value: function (a, r) { return a.val(save.data, r || null); },
    progress: function (a, r) {
      var v = Math.max(0, a.val(save.data, r || null));
      return { v: v, pct: Math.min(1, v / a.goal), text: fmtVal(a, v) + ' / ' + fmtVal(a, a.goal) };
    },
    // Débloque tout ce qui est atteint ; renvoie les nouveaux succès
    check: function (run) {
      var S = save.data, got = [];
      for (var i = 0; i < L.length; i++) {
        var a = L[i];
        if (S.achievements[a.id]) continue;
        if (a.val(S, run || null) >= a.goal) {
          S.achievements[a.id] = Date.now();
          S.cookies += TIERS[a.tier].reward;
          got.push(a);
        }
      }
      if (got.length) {
        save.commit();
        got.forEach(function (a) { if (G.ui && G.ui.achToast) G.ui.achToast(a, TIERS[a.tier].reward); });
        if (G.audio) G.audio.power();
        if (G.screens && G.screens.onAch) G.screens.onAch();
        // le platine peut tomber juste après un autre succès
        if (!S.achievements.platinum) G.ach.check(run);
      }
      return got;
    }
  };
})();
