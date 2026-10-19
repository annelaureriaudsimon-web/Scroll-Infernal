/* ==========================================================================
   auth.js — connexion, comptes, export/import et sauvegarde en ligne.

   Deux modes, choisis tout seul au chargement de la page :
     • « local » : le jeu est ouvert comme un simple fichier / site statique.
       Les comptes (pseudo + mot de passe) vivent dans CE navigateur.
     • « cloud » : le jeu est servi par server/server.js (node server/server.js).
       Les comptes et les sauvegardes sont sur le serveur : on retrouve sa
       progression depuis n'importe quel appareil.

   ⚠ Un mot de passe « local » protège contre un camarade qui joue sur le même
   navigateur, pas contre quelqu'un qui sait fouiller dans le stockage du navigateur.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var save = G.save, K = save.K;
  var NAME_RE = /^[\p{L}\p{N}_\-.]{3,14}$/u;
  var ITER = 120000;

  /* ------------------------------ outils ------------------------------ */
  function hex(buf) {
    var a = new Uint8Array(buf), s = '';
    for (var i = 0; i < a.length; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16);
    return s;
  }
  function randHex(n) { var a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); return hex(a); }
  function hashPass(pass, salt, alg) {
    var subtle = window.crypto && window.crypto.subtle;
    if (alg === 'pbkdf2' && subtle) {
      var enc = new TextEncoder();
      return subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']).then(function (key) {
        return subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: ITER, hash: 'SHA-256' }, key, 256);
      }).then(hex);
    }
    // Repli (navigateur sans WebCrypto, ex. http sur un réseau local) : empreinte simple, plus faible
    var h = 2166136261, str = salt + '|' + pass + '|' + salt, out = '';
    for (var r = 0; r < 4; r++) {
      for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i) + r; h = Math.imul(h, 16777619) >>> 0; }
      out += ('00000000' + h.toString(16)).slice(-8);
    }
    return Promise.resolve(out);
  }
  function accounts() { return save.read(K.accounts) || {}; }
  function fail(msg) { return { ok: false, error: msg }; }
  function checkName(name) {
    if (!NAME_RE.test(name || '')) return 'Pseudo : 3 à 14 caractères (lettres, chiffres, _ - .)';
    return '';
  }
  function checkPass(pass) { return (pass || '').length >= 4 ? '' : 'Mot de passe : 4 caractères minimum'; }

  // Progression d'avant les comptes (invité), si elle existe et n'a pas encore été reprise
  function legacy() {
    var l = save.read(K.legacy);
    if (!l || save.read(K.claimed)) return null;
    var st = l.stats || {};
    return (st.games > 0 || l.cookies > 0) ? l : null;
  }

  /* ------------------------------ cloud ------------------------------ */
  var sync = 'idle';        // idle | pending | sending | offline
  var timer = 0, inflight = false, again = false;

  function api(path, method, body, token, keepalive) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch('api/' + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, keepalive: !!keepalive, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); });
  }
  function setSync(s) { sync = s; if (auth.onStatus) auth.onStatus(); }

  function push(now) {
    if (!save.cloud || !save.session.token) return Promise.resolve();
    clearTimeout(timer); timer = 0;
    if (inflight) { again = true; return Promise.resolve(); }
    inflight = true; setSync('sending');
    var d = save.data, sent = d.meta.updated;
    return api('save', 'PUT', { save: d, baseRev: d.meta.rev }, save.session.token, now).then(function (j) {
      inflight = false;
      if (j.status === 200) {
        d.meta.rev = j.rev; save.commit(false);
        if (again || d.meta.updated !== sent) { again = false; schedule(); } else setSync('idle');
      } else if (j.status === 409 && j.save) {                // une autre session a sauvegardé entre-temps
        save.replace(j.save); save.data.meta.rev = j.rev; save.commit(false);
        setSync('idle'); if (auth.onRemote) auth.onRemote('Une sauvegarde plus récente a été chargée.');
      } else if (j.status === 401) {
        auth.expired();
      } else setSync('offline');
    }).catch(function () { inflight = false; setSync('offline'); });
  }
  function schedule() {
    if (!save.cloud) return;
    setSync('pending');
    clearTimeout(timer); timer = setTimeout(push, 1500);
  }
  save.onCommit = function () { if (save.cloud) schedule(); };
  window.addEventListener('pagehide', function () { if (save.cloud && (timer || sync === 'pending')) push(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && save.cloud && (timer || sync === 'pending')) push(true); });
  window.addEventListener('online', function () { if (save.cloud && sync === 'offline') push(); });

  /* ------------------------------ API publique ------------------------------ */
  var auth = G.auth = {
    mode: 'local',           // 'local' | 'cloud'
    track: false,            // le serveur enregistre-t-il les parties ? (telemetry.js / notes.js)
    api: api,                // appel de l'API du serveur (utilisé aussi par telemetry.js et notes.js)
    onStatus: null, onRemote: null, onExpired: null,

    // Le jeu est-il servi par notre serveur ? (réponse rapide : 1,5 s maximum)
    detect: function () {
      if (!/^https?:$/.test(location.protocol) || !window.fetch) return Promise.resolve('local');
      var ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); }, 1500);
      return fetch('api/ping', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { clearTimeout(t); auth.mode = j && j.cloud ? 'cloud' : 'local'; auth.track = !!(j && j.track !== false); return auth.mode; })
        .catch(function () { clearTimeout(t); auth.mode = 'local'; return 'local'; });
    },

    needLogin: function () { return !save.session; },
    legacy: legacy,
    checkName: checkName,

    status: function () {
      var s = save.session;
      if (!s || s.type === 'guest') return { txt: 'invité · sauvegarde sur cet appareil seulement', cls: 'warn' };
      if (s.type === 'local') return { txt: 'compte local · sauvegardé sur cet appareil', cls: 'ok' };
      if (sync === 'offline') return { txt: 'compte en ligne · hors connexion (envoi plus tard)', cls: 'warn' };
      if (sync === 'pending' || sync === 'sending') return { txt: 'compte en ligne · envoi…', cls: 'ok' };
      return { txt: 'compte en ligne · synchronisé', cls: 'ok' };
    },

    register: function (name, pass, claim) {
      name = (name || '').trim();
      var e = checkName(name) || checkPass(pass);
      if (e) return Promise.resolve(fail(e));
      var old = claim ? legacy() : null;
      function done(sess) {
        save.useSession(sess);
        if (old) { save.replace(old); save.write(K.claimed, sess.name); }
        save.commit();
        return { ok: true, claimed: !!old };
      }
      if (auth.mode === 'cloud') {
        return api('register', 'POST', { name: name, pass: pass }).then(function (j) {
          if (j.status !== 200) return fail(j.error || 'Impossible de créer le compte.');
          return done({ type: 'cloud', name: j.name, token: j.token });
        }).catch(function () { return fail('Serveur injoignable.'); });
      }
      var acc = accounts(), key = name.toLowerCase();
      if (acc[key]) return Promise.resolve(fail('Ce pseudo existe déjà sur cet appareil.'));
      var salt = randHex(16), alg = window.crypto && window.crypto.subtle ? 'pbkdf2' : 'weak';
      return hashPass(pass, salt, alg).then(function (h) {
        acc[key] = { name: name, salt: salt, hash: h, alg: alg, created: Date.now() };
        save.write(K.accounts, acc);
        return done({ type: 'local', name: name });
      });
    },

    login: function (name, pass) {
      name = (name || '').trim();
      if (!name || !pass) return Promise.resolve(fail('Entre ton pseudo et ton mot de passe.'));
      if (auth.mode === 'cloud') {
        return api('login', 'POST', { name: name, pass: pass }).then(function (j) {
          if (j.status !== 200) return fail(j.error || 'Pseudo ou mot de passe incorrect.');
          var sess = { type: 'cloud', name: j.name, token: j.token };
          var hadCache = !!save.read(save.keyFor(sess));
          save.useSession(sess);
          if (j.save && (!hadCache || save.data.meta.rev !== j.rev)) { save.replace(j.save); save.data.meta.rev = j.rev; save.commit(false); }
          else save.commit();                                    // premier envoi, ou copie locale à renvoyer
          return { ok: true };
        }).catch(function () { return fail('Serveur injoignable.'); });
      }
      var acc = accounts()[name.toLowerCase()];
      if (!acc) return Promise.resolve(fail('Compte introuvable sur cet appareil.'));
      return hashPass(pass, acc.salt, acc.alg).then(function (h) {
        if (h !== acc.hash) return fail('Mot de passe incorrect.');
        save.useSession({ type: 'local', name: acc.name });
        return { ok: true };
      });
    },

    guest: function () { save.useSession({ type: 'guest' }); save.commit(false); },

    logout: function () {
      var sess = save.session;
      var p = save.cloud ? push(true) : Promise.resolve();
      if (sess && sess.type === 'cloud') api('logout', 'POST', {}, sess.token).catch(function () { /* ignore */ });
      return p.then(function () { sync = 'idle'; save.endSession(); });
    },

    // Classement mondial (10 premiers) — serveur seulement
    leaderboard: function (diff, dur) {
      var tok = save.cloud && save.session ? save.session.token : null;
      return api('leaderboard?diff=' + encodeURIComponent(diff) + '&dur=' + encodeURIComponent(dur), 'GET', null, tok)
        .catch(function () { return { status: 0 }; });
    },
    // Envoie tout de suite ce qui attend (pour que ta dernière partie soit comptée)
    flush: function () {
      if (save.cloud && (timer || sync === 'pending')) return push(true);
      return Promise.resolve();
    },

    // Au retour d'un joueur cloud : on récupère la version du serveur si elle est plus récente
    resume: function () {
      if (!save.cloud) return Promise.resolve('none');
      return api('save', 'GET', null, save.session.token).then(function (j) {
        if (j.status === 401) { auth.expired(); return 'expired'; }
        if (j.status !== 200) { setSync('offline'); return 'offline'; }
        if (j.save && j.rev !== save.data.meta.rev) { save.replace(j.save); save.data.meta.rev = j.rev; save.commit(false); setSync('idle'); return 'updated'; }
        schedule();                                              // renvoie ce qui n'aurait pas été envoyé
        return 'same';
      }).catch(function () { setSync('offline'); return 'offline'; });
    },
    expired: function () {
      save.endSession(); sync = 'idle';
      if (auth.onExpired) auth.onExpired();
    },

    /* ----- export / import (pour changer d'appareil sans serveur) ----- */
    exportText: function () {
      return JSON.stringify({ app: 'scroll-infernal', v: 3, user: save.user, exported: Date.now(), save: save.data });
    },
    download: function () {
      var blob = new Blob([auth.exportText()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'scroll-infernal-' + (save.user || 'invite') + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    importText: function (text) {
      var obj;
      try { obj = JSON.parse(text); } catch (e) { return fail('Fichier illisible.'); }
      if (!obj || obj.app !== 'scroll-infernal' || !obj.save || typeof obj.save !== 'object' || typeof obj.save.cookies !== 'number') return fail('Ce n’est pas une sauvegarde Scroll Infernal.');
      var rev = save.data.meta.rev;
      save.replace(obj.save);
      save.data.meta.rev = rev;
      save.commit();
      return { ok: true };
    }
  };
})();
