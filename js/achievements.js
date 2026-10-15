/* ==========================================================================
   achievements.js — les succès et leurs récompenses en cookies.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var store = G.store;

  function equippedCount(d) {
    var n = 0;
    if (d.equipped.skin !== 'classic') n++;
    if (d.equipped.trail !== 'none') n++;
    if (d.equipped.acc !== 'none') n++;
    return n;
  }

  // val(d) renvoie la progression actuelle, goal l'objectif
  var LIST = [
    { id: 'first',   name: 'Premier clic',        desc: 'Lance ta première partie.',                       goal: 1,    reward: 50,  val: function (d) { return d.stats.games; } },
    { id: 'min1',    name: 'Une minute',          desc: 'Survis une minute d’affilée.',                    goal: 60,   reward: 50,  val: function (d) { return d.stats.bestTime; }, time: true },
    { id: 'min5',    name: 'Cinq minutes',        desc: 'Survis cinq minutes d’affilée.',                  goal: 300,  reward: 150, val: function (d) { return d.stats.bestTime; }, time: true },
    { id: 'min15',   name: 'Quart d’heure',       desc: 'Survis quinze minutes d’affilée.',                goal: 900,  reward: 300, val: function (d) { return d.stats.bestTime; }, time: true },
    { id: 'marathon',name: 'Marathon',            desc: 'Termine un niveau de 30 minutes.',                goal: 1,    reward: 800, val: function (d) { return d.stats.completed30; } },
    { id: 'lvl4',    name: 'Au cœur de l’enfer',  desc: 'Débloque le niveau 4.',                           goal: 4,    reward: 200, val: function (d) { return d.unlocked; } },
    { id: 'cook100', name: 'Gourmand',            desc: 'Ramasse 100 cookies.',                            goal: 100,  reward: 50,  val: function (d) { return d.stats.cookies; } },
    { id: 'cook1000',name: 'Boulimique',          desc: 'Ramasse 1 000 cookies.',                          goal: 1000, reward: 250, val: function (d) { return d.stats.cookies; } },
    { id: 'graze',   name: 'Frôleur',             desc: 'Frôle 50 blocs sans les toucher.',                goal: 50,   reward: 100, val: function (d) { return d.stats.grazes; } },
    { id: 'shield',  name: 'Bloqueur de pub',     desc: 'Détruis 5 blocs avec un bouclier.',               goal: 5,    reward: 100, val: function (d) { return d.stats.shields; } },
    { id: 'power',   name: 'Accro aux bonus',     desc: 'Ramasse 15 bonus.',                               goal: 15,   reward: 100, val: function (d) { return d.stats.powerups; } },
    { id: 'shop',    name: 'Shopping',            desc: 'Achète ton premier objet à la boutique.',         goal: 1,    reward: 50,  val: function (d) { return d.stats.purchases; } },
    { id: 'style',   name: 'À la mode',           desc: 'Équipe une souris, une traînée et un accessoire.', goal: 3,   reward: 100, val: equippedCount }
  ];

  G.ACH = LIST;
  G.achievements = {
    progress: function (a) { return Math.min(a.goal, a.val(store.data)); },
    unlocked: function (a) { return !!store.data.ach[a.id]; },
    count: function () { return LIST.filter(function (a) { return !!store.data.ach[a.id]; }).length; },
    // Débloque les succès atteints ; renvoie la liste des nouveaux
    check: function () {
      var got = [];
      LIST.forEach(function (a) {
        if (!store.data.ach[a.id] && a.val(store.data) >= a.goal) {
          store.data.ach[a.id] = Date.now();
          store.addCookies(a.reward);
          got.push(a);
        }
      });
      if (got.length) store.save();
      return got;
    }
  };
})();
