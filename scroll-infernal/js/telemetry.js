/* ==========================================================================
   telemetry.js — envoie les parties au serveur (seulement si le jeu est servi par
   server/server.js, voir auth.js). C'est ce qui alimente le panneau d'administration.

   Déroulement d'une partie :
     1. begin()  → le serveur note l'heure de départ et rend un jeton signé
     2. toutes les 15 s : « je joue toujours » (pour compter les parties en cours)
     3. end()    → score, durée, difficulté… : le serveur les VÉRIFIE avant de les enregistrer

   Rien n'est envoyé hors connexion : si le serveur ne répond pas au moment de la fin,
   la partie attend dans le navigateur et repart dès que possible. Le jeu, lui, ne dépend
   jamais de ce fichier : en cas de souci il continue de marcher normalement.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var save = G.save, auth = G.auth;
  var K_DEV = 'scrollInfernal.device.v1', K_PEND = 'scrollInfernal.pending.v1';
  var live = null;                 // { rec, token, done, p }
  var flushing = false;
  var pingTimer = 0;               // « je joue toujours » : un minuteur PAR partie, calé sur son départ

  function rand(n) {
    var a = new Uint8Array(n), s = '', i;
    try { (window.crypto || window.msCrypto).getRandomValues(a); } catch (e) { for (i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); }
    for (i = 0; i < n; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16);
    return s;
  }
  // Identifiant anonyme de cet appareil (sert à compter les joueurs distincts quand on joue sans compte)
  function device() {
    var d = save.read(K_DEV);
    if (typeof d !== 'string' || !/^[a-f0-9]{16,48}$/.test(d)) { d = rand(16); save.write(K_DEV, d); }
    return d;
  }
  function enabled() { return !!auth && auth.mode === 'cloud' && auth.track !== false && !!window.fetch; }
  function token() { return save.cloud && save.session ? save.session.token : null; }
  function noop() { /* ignore */ }

  /* ----- file d'attente hors connexion ----- */
  function pending() { var p = save.read(K_PEND); return Array.isArray(p) ? p : []; }
  function setPending(list) { if (list.length) save.write(K_PEND, list.slice(-20)); else save.remove(K_PEND); }
  function queue(tok, run) { var p = pending(); p.push({ token: tok, run: run }); setPending(p); }

  // Envoie la fin d'une partie. Renvoie une promesse : 'ok' | 'retry' (à renvoyer plus tard) | 'drop' (refusé : inutile de réessayer)
  function post(tok, run, keepalive) {
    return auth.api('run/end', 'POST', { token: tok, run: run }, null, keepalive).then(function (j) {
      if (j.status === 200) return 'ok';
      if (j.status === 0 || j.status === 429 || j.status >= 500) return 'retry';
      return 'drop';
    }).catch(function () { return 'retry'; });
  }

  function flushPending() {
    if (flushing || !enabled()) return;
    var list = pending();
    if (!list.length) return;
    flushing = true;
    var left = [];
    (function next(i) {
      if (i >= list.length) { flushing = false; setPending(left); return; }
      post(list[i].token, list[i].run, false).then(function (r) { if (r === 'retry') left.push(list[i]); next(i + 1); });
    })(0);
  }

  var tele = G.tele = {
    device: device,
    enabled: enabled,

    // Une partie démarre
    begin: function (rec) {
      live = null; clearInterval(pingTimer); pingTimer = 0;
      if (!enabled()) return;
      var e = live = { rec: rec, token: null, done: false };
      e.p = auth.api('run/start', 'POST', { id: rec.id, diff: rec.diff, dur: rec.dur, device: device(), pseudo: save.data.settings.pseudo }, token())
        .then(function (j) { if (j.status === 200 && j.token) e.token = j.token; return e.token; })
        .catch(function () { return null; });
      pingTimer = setInterval(pingNow, 15000);
    },

    // La partie (ou une étape : victoire avant le mode infini) se termine. run = ce que le serveur doit vérifier.
    end: function (rec, run, final) {
      var e = live;
      if (!e || e.rec !== rec || !enabled()) return;
      if (final) { e.done = true; clearInterval(pingTimer); pingTimer = 0; }
      if (run.score < 1 || run.t < 1) return;
      e.p.then(function (tok) {
        if (!tok) return;
        post(tok, run, true).then(function (r) { if (r === 'retry') queue(tok, run); else flushPending(); });
      });
    },
    flushPending: flushPending
  };

  /* ----- « je joue toujours » : toutes les 15 s ----- */
  function pingNow() {
    var e = live, g = G.game;
    if (!e || !e.token || e.done || !g || (g.state !== 'playing' && g.state !== 'paused') || !enabled()) return;
    auth.api('run/ping', 'POST', { token: e.token, t: e.rec.t, score: e.rec.score, paused: g.state === 'paused' }).then(function (j) {
      if (j.status === 401 || j.status === 403) e.token = null;        // jeton refusé / joueur bloqué : on arrête d'insister
    }).catch(noop);
  }

  /* ----- fermeture de la page en pleine partie : on la déclare « abandonnée » ----- */
  window.addEventListener('pagehide', function () {
    var e = live, g = G.game;
    if (!e || !e.token || e.done || !g || (g.state !== 'playing' && g.state !== 'paused') || !enabled()) return;
    var r = e.rec, eq = save.data.equipped;
    if (r.score < 1 || r.t < 3) return;
    post(e.token, {
      score: r.score, t: r.t, diff: r.diff, dur: r.dur, endless: !r.dur || !!r.endless, won: !!r.won, result: 'abandon', cause: '', cookies: r.cookies,
      mul: Math.round(r.mul * 10) / 10, skin: eq.skin, color: eq.color, title: eq.title, samples: r.samples.slice(), sInt: r.sInt
    }, true);
  });

  window.addEventListener('online', flushPending);
  // Au retour sur la page, on renvoie ce qui attendait (une fois la détection du serveur terminée)
  window.addEventListener('load', function () {
    Promise.resolve(auth.ready).then(function () { setTimeout(flushPending, 1500); });
  });
})();
