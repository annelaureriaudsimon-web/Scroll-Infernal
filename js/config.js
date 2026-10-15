/* ==========================================================================
   config.js — tous les réglages de difficulté au même endroit.
   La difficulté dépend de la PROGRESSION p (0 → 1) dans le niveau :
   p = temps écoulé / durée du niveau (30 min par défaut).
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};

  var DIFFS = {
    zen:      { name: 'Zen',      speed: 0.8, gap: 1.2, reward: 0.8, desc: 'Plus lent, trous plus larges' },
    normal:   { name: 'Normal',   speed: 1,   gap: 1,   reward: 1,   desc: 'L’expérience prévue' },
    infernal: { name: 'Infernal', speed: 1.2, gap: 0.9, reward: 1.5, desc: 'Plus rapide, +50 % de cookies' }
  };

  var C = G.CONFIG = {
    hitRadius: 7,          // rayon de la zone de collision de la souris (px)
    nearDistance: 38,      // un élément plus proche devient rouge (alerte)
    lookahead: 500,        // on génère le site un peu au-dessus de l'écran (px)
    attractSpeed: 80,      // vitesse du site en arrière-plan du menu (px/s)
    introRatio: 0.62,      // part de l'écran vide au démarrage
    graceStart: 1.2,       // secondes d'invincibilité au départ
    graceResume: 0.9,      // … et après une pause

    // Génération : le trou suivant est toujours atteignable
    playerAbility: 1500,   // vitesse (px/s) supposée de la souris du joueur
    minSpacing: 110,       // espace vertical min. entre deux rangées (px)
    maxSpacing: 320,       // … max.
    minGap: 84,            // largeur minimale d'un trou (px)

    maxSpeed: 1100,        // vitesse du site (px/s) à la fin du niveau
    DIFFS: DIFFS,

    // Réglés au début de chaque partie par configure()
    duration: 1800,        // durée du niveau (s)
    curveLen: 1800,        // durée sur laquelle la difficulté monte (s)
    endless: false,
    diff: DIFFS.normal,

    configure: function (s) {
      C.endless = !s.duration;
      C.duration = (s.duration || 30) * 60;
      C.curveLen = C.endless ? 1800 : C.duration;
      C.diff = DIFFS[s.difficulty] || DIFFS.normal;
    },
    progress: function (t) { return Math.min(1, t / C.curveLen); },

    // Vitesse de défilement (px/s)
    speedAt: function (t) {
      var s = 100 + (C.maxSpeed - 100) * Math.pow(C.progress(t), 0.85);
      if (t > C.curveLen) s += Math.min(300, (t - C.curveLen) * 0.15); // après la fin : ça continue d'accélérer
      return s * C.diff.speed;
    },
    // Espace entre rangées, en secondes de défilement (plus petit = plus nerveux)
    spacingRatio: function (t) { return Math.max(0.24, 0.42 - 0.18 * C.progress(t)); },
    // Largeur moyenne d'un trou (px) : se resserre avec le temps
    gapWidth: function (t) { return Math.max(90, 250 - 160 * Math.pow(C.progress(t), 0.8)) * C.diff.gap; },
    // Nombre de trous par rangée : 2 au début, puis de plus en plus souvent 1
    gapCount: function (t, rnd) {
      var p = C.progress(t);
      if (p < 0.12) return 2;
      if (p < 0.45) return rnd() < 0.5 ? 2 : 1;
      return rnd() < 0.2 ? 2 : 1;
    }
  };
})();
