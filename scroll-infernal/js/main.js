/* ==========================================================================
   main.js — branchement des boutons, du clavier et de la souris / du doigt.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame;
  // Téléphone / tablette sans souris : le jeu est bloqué pour l'instant (CONFIG.allowMobile)
  if (!G.CONFIG.allowMobile && G.CONFIG.isMobile()) { document.body.classList.add('blocked'); return; }
  G.trail.init();
  var game = G.game = new G.Game();
  var ui = G.ui, audio = G.audio, save = G.save;
  G.screens.init();

  function $(id) { return document.getElementById(id); }
  function click(id, fn) {
    $(id).addEventListener('click', function (e) { e.currentTarget.blur(); audio.click(); fn(); });
  }

  function startGame() {
    if (!save.session) { G.screens.openLogin(); return; }   // jamais de partie sans être connecté (ou invité)
    game.start();
  }
  function toggleSound() {
    audio.setMuted(!audio.isMuted());
    game.applySettings();
  }

  // Menu
  click('btn-play', startGame);
  click('btn-shop', function () { G.screens.openShop('menu'); });
  click('btn-settings', function () { G.screens.openSettings('menu'); });
  click('btn-skin-edit', function () { G.screens.openShop('menu'); });
  click('btn-menu-rank', function () { G.screens.openRank('menu'); });
  click('btn-menu-ach', function () { G.screens.openAch('menu'); });
  click('btn-rank-back', function () { ui.back(); G.screens.refresh(); });
  click('btn-ach-back', function () { ui.back(); G.screens.refresh(); });
  // Réglages / boutique
  click('btn-settings-back', function () { ui.back(); G.screens.refresh(); });
  click('btn-shop-back', function () { ui.back(); G.screens.refresh(); });
  // Pause
  click('btn-resume', function () { game.resume(); });
  click('btn-pause-settings', function () { G.screens.openSettings('pause'); });
  click('btn-restart-pause', startGame);
  click('btn-quit', function () { game.toMenu(); });
  click('btn-pause', function () { game.pause(); });
  click('btn-sound', toggleSound);
  // Fin de partie
  click('btn-replay', startGame);
  click('btn-over-shop', function () { G.screens.openShop('over'); });
  click('btn-over-rank', function () { G.screens.openRank('over'); });
  click('btn-menu', function () { game.toMenu(); });
  // Victoire
  click('btn-continue', function () { game.continueEndless(); });
  click('btn-win-replay', startGame);
  click('btn-win-shop', function () { G.screens.openShop('win'); });
  click('btn-win-rank', function () { G.screens.openRank('win'); });
  click('btn-win-menu', function () { game.toMenu(); });

  /* --- Souris / doigt ---------------------------------------------------- */
  var lastTX = null, lastTY = null;
  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') {
      game.touchMode = true;
      lastTX = e.clientX; lastTY = e.clientY;
    }
  });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') {
      var k = save.data.settings.touchSens;
      if (lastTX !== null) game.movePlayerBy((e.clientX - lastTX) * k, (e.clientY - lastTY) * k);
      lastTX = e.clientX; lastTY = e.clientY;
    } else if (document.pointerLockElement === $('stage')) {
      // souris capturée : on additionne les déplacements (et on ressort de l'autre côté aux bords)
      var cap = 300;
      game.movePlayerBy(Math.max(-cap, Math.min(cap, e.movementX || 0)), Math.max(-cap, Math.min(cap, e.movementY || 0)), true);
    } else {
      game.touchMode = false;
      game.movePlayerTo(e.clientX, e.clientY);
    }
  });

  // Échap (ou clic hors de la page) rend la souris : on met la partie en pause
  var wrapHint = false;
  document.addEventListener('pointerlockchange', function () {
    if (document.pointerLockElement === $('stage')) {
      if (!wrapHint) { wrapHint = true; ui.toast('Va tout au bord : tu ressors de l’autre côté !', 2600); }
    } else if (game.state === 'playing') { lockLost = performance.now(); game.pause(); }
  });
  var lockLost = 0;
  window.addEventListener('pointerup', function () { lastTX = lastTY = null; });

  /* --- Clavier ----------------------------------------------------------- */
  window.addEventListener('keydown', function (e) {
    var k = e.key, s = game.state, cur = ui.current;
    if (G.hacker && G.hacker.booting) return;
    if (e.target && e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'password')) {   // on tape un pseudo : pas de raccourcis
      if (k === 'Escape' || (k === 'Enter' && !e.target.form)) e.target.blur();
      return;
    }
    if (k === 'Escape' || k === 'p' || k === 'P') {
      if (cur === 'settings' || cur === 'shop' || cur === 'rank' || cur === 'ach') { ui.back(); G.screens.refresh(); }
      else if (s === 'playing') game.pause();
      else if (s === 'paused' && performance.now() - lockLost > 300) game.resume();   // (Échap qui vient de rendre la souris ne reprend pas aussitôt)
      e.preventDefault();
    } else if (k === 'm' || k === 'M') {
      toggleSound();
    } else if (k === 'r' || k === 'R') {
      if (cur === null || cur === 'pause' || cur === 'over' || cur === 'win') startGame();
    } else if (k === 'Enter' || k === ' ') {
      if (cur === 'menu' || cur === 'over' || cur === 'win') startGame();
      else if (cur === 'pause') game.resume();
      if (cur !== 'settings' && cur !== 'shop' && cur !== 'rank' && cur !== 'ach') e.preventDefault();
    }
  });

  /* --- Pause automatique si on quitte l'onglet / la fenêtre ------------- */
  window.addEventListener('blur', function () { game.pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) game.pause(); });
  window.addEventListener('resize', function () { game.resize(); game.pause(); });

  game.run();
  G.hacker.rain(true);   // le menu est ouvert au départ
  G.hacker.boot();

  /* --- Comptes : on montre la connexion tout de suite si personne n'est connecté --- */
  G.screens.bindAuth();
  if (G.auth.needLogin()) G.screens.openLogin();
  G.auth.ready = G.auth.detect().then(function (mode) {
    if (ui.current === 'login') G.screens.openLogin('', true);     // met à jour le texte (comptes en ligne ou sur cet appareil)
    if (save.cloud) return G.auth.resume().then(function (st) { if (st === 'updated') G.screens.reloadAll(); else G.screens.updateStatus(); });
    G.screens.updateStatus();
  });
})();
