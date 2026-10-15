/* ==========================================================================
   main.js — branchement des boutons, du clavier et de la souris / du doigt.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame;
  G.trail.init();
  var game = G.game = new G.Game();
  var ui = G.ui, audio = G.audio, save = G.save;
  G.screens.init();

  function $(id) { return document.getElementById(id); }
  function click(id, fn) {
    $(id).addEventListener('click', function (e) { e.currentTarget.blur(); audio.click(); fn(); });
  }

  function startGame() { game.start(); }
  function toggleSound() {
    audio.setMuted(!audio.isMuted());
    game.applySettings();
  }

  // Menu
  click('btn-play', startGame);
  click('btn-shop', function () { G.screens.openShop('menu'); });
  click('btn-settings', function () { G.screens.openSettings('menu'); });
  click('btn-skin-edit', function () { G.screens.openShop('menu'); });
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
  click('btn-menu', function () { game.toMenu(); });
  // Victoire
  click('btn-continue', function () { game.continueEndless(); });
  click('btn-win-replay', startGame);
  click('btn-win-shop', function () { G.screens.openShop('win'); });
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
    } else {
      game.touchMode = false;
      game.movePlayerTo(e.clientX, e.clientY);
    }
  });
  window.addEventListener('pointerup', function () { lastTX = lastTY = null; });

  /* --- Clavier ----------------------------------------------------------- */
  window.addEventListener('keydown', function (e) {
    var k = e.key, s = game.state, cur = ui.current;
    if (e.target && e.target.tagName === 'INPUT' && k === ' ') return;
    if (k === 'Escape' || k === 'p' || k === 'P') {
      if (cur === 'settings' || cur === 'shop') { ui.back(); G.screens.refresh(); }
      else if (s === 'playing') game.pause();
      else if (s === 'paused') game.resume();
      e.preventDefault();
    } else if (k === 'm' || k === 'M') {
      toggleSound();
    } else if (k === 'r' || k === 'R') {
      if (cur === null || cur === 'pause' || cur === 'over' || cur === 'win') startGame();
    } else if (k === 'Enter' || k === ' ') {
      if (cur === 'menu' || cur === 'over' || cur === 'win') startGame();
      else if (cur === 'pause') game.resume();
      if (cur !== 'settings' && cur !== 'shop') e.preventDefault();
    }
  });

  /* --- Pause automatique si on quitte l'onglet / la fenêtre ------------- */
  window.addEventListener('blur', function () { game.pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) game.pause(); });
  window.addEventListener('resize', function () { game.resize(); game.pause(); });

  game.run();
})();
