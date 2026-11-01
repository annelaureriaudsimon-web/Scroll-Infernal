/* ==========================================================================
   notes.js — l'enregistreur de la page de connexion.

   • Il démarre quand la personne clique sur « Commencer l'enregistrement et créer un compte »
     (onglet de création de compte) et s'arrête quand elle valide (« Terminer l'enregistrement
     et me connecter »), revient sur « Se connecter », ou quitte la page de connexion.
   • Il n'enregistre QUE le pseudo (le champ « login »). Le mot de passe n'est jamais lu ni envoyé.
   • Tant que l'enregistrement n'est pas démarré, rien n'est envoyé.
   • Le pseudo (et ses modifications) part au serveur, qui le garde durablement :
     le propriétaire du serveur le lit en direct dans la fenêtre du serveur et dans enregistrements.txt.
   • Si le jeu n'est pas servi par server/server.js, il n'y a nulle part où enregistrer :
     on peut quand même créer son compte (sur cet appareil).
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  function $(id) { return document.getElementById(id); }
  var nameEl = $('login-name'), statut = $('rec-status');
  if (!nameEl || !statut) return;

  var actif = false;          // l'enregistrement est-il démarré ?
  var sid = '';               // identifiant de CET enregistrement (un par départ)
  var timer = 0, beat = 0, retry = 0;
  var sending = false, again = false;
  var link = 'idle';          // idle | sending | ok | error | refused
  var lastSent = null;        // dernier pseudo reçu par le serveur

  function newId() {
    var a = new Uint8Array(12), s = '';
    try { (window.crypto || window.msCrypto).getRandomValues(a); } catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < a.length; j++) s += (a[j] % 36).toString(36);
    return s;
  }
  function ready() { return !!G.auth && G.auth.mode === 'cloud' && G.auth.track !== false; }
  function token() { return G.save.cloud && G.save.session ? G.save.session.token : null; }
  function pseudo() { return nameEl.value.trim().slice(0, 20); }      // la SEULE donnée envoyée

  function showStatus() {
    if (statut.hidden) return;
    if (!ready()) { statut.textContent = 'Enregistrement indisponible : le jeu n’est pas relié à un serveur. Tu peux quand même créer ton compte.'; statut.className = 'rec-status off'; return; }
    if (!actif) { statut.textContent = ''; statut.className = 'rec-status'; return; }
    var s = '● Enregistrement actif : seul ton pseudo est envoyé au serveur du jeu (jamais ton mot de passe).';
    if (link === 'sending') s += ' Envoi…';
    else if (link === 'ok' && pseudo()) s += ' ✓ Pseudo enregistré sur le serveur.';
    else if (link === 'error') s += ' ⚠ Serveur injoignable, nouvel essai…';
    else if (link === 'refused') s += ' ⚠ Le serveur refuse cet enregistrement.';
    statut.textContent = s;
    statut.className = 'rec-status on';
  }

  // Envoie le pseudo au serveur. active=false : envoi final (on termine)
  function send(active, keepalive) {
    clearTimeout(timer); timer = 0;
    if (!sid || !ready()) return Promise.resolve();
    if (sending && !keepalive) { again = true; return Promise.resolve(); }
    var text = pseudo();
    if (!text && lastSent === null) return Promise.resolve();            // rien d'écrit : rien à envoyer
    sending = true; link = 'sending'; showStatus();
    return G.auth.api('note', 'POST', { id: sid, device: G.tele ? G.tele.device() : '', text: text, active: active, hint: text }, token(), keepalive)
      .then(function (j) {
        sending = false;
        if (j.status === 200) { link = 'ok'; lastSent = text; retry = 0; }
        else if (j.status === 403 || j.status === 400) { link = 'refused'; }
        else { link = 'error'; scheduleRetry(); }
        if (again) { again = false; sendSoon(300); }
        showStatus();
      })
      .catch(function () { sending = false; link = 'error'; scheduleRetry(); showStatus(); });
  }
  function sendSoon(ms) { clearTimeout(timer); timer = setTimeout(function () { if (actif) send(true); }, ms); }
  function scheduleRetry() { clearTimeout(timer); retry = Math.min(retry + 1, 5); if (actif) timer = setTimeout(function () { send(true); }, 2000 * retry); }

  function start() {
    if (!ready() || actif) { showStatus(); return; }
    actif = true; link = 'idle';
    if (!sid) sid = newId();
    showStatus();
    send(true);                                               // envoie tout de suite le pseudo déjà écrit
    clearInterval(beat);
    beat = setInterval(function () { if (actif && pseudo()) send(true); }, 20000);   // « je suis toujours là »
  }

  // Termine l'enregistrement : dernier envoi (le pseudo final), puis on remet tout à zéro
  function stop(keepalive) {
    var was = actif;
    actif = false; clearInterval(beat); beat = 0; clearTimeout(timer); timer = 0;
    var p = was ? send(false, keepalive) : Promise.resolve();
    sid = ''; lastSent = null; link = 'idle'; retry = 0; again = false;
    showStatus();
    return p;
  }

  // Le pseudo change : on n'envoie qu'une fois que la personne fait une pause
  nameEl.addEventListener('input', function () {
    if (actif) { link = 'idle'; showStatus(); sendSoon(900); }
  });
  // Fermeture de la page pendant l'enregistrement : dernier envoi
  window.addEventListener('pagehide', function () { if (actif) stop(true); });

  G.notes = {
    // Appelé par la page de connexion à chaque affichage : want=true (onglet « créer un compte ») démarre, sinon arrête
    sync: function (want) {
      statut.hidden = !want;
      if (want) start(); else stop();
      showStatus();
    },
    // Appelé quand on quitte la page de connexion (compte validé, invité…) : fin de l'enregistrement
    stop: function () { statut.hidden = true; return stop(); },
    active: function () { return actif; }
  };
})();
