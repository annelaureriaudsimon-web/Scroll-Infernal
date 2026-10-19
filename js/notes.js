/* ==========================================================================
   notes.js — la zone de texte de la page de connexion et ses 2 boutons
   (« Démarrer l'enregistrement » / « Arrêter »).

   • Tant que l'enregistrement n'est PAS démarré, rien n'est envoyé.
   • Une fois démarré, le texte (et ses modifications) est envoyé au serveur, qui le
     garde durablement : l'administrateur le lit dans admin.html.
   • Si le jeu n'est pas servi par server/server.js, la zone est désactivée
     (il n'y a nulle part où enregistrer).
   • L'enregistrement s'arrête tout seul quand on quitte la page de connexion.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  function $(id) { return document.getElementById(id); }
  var box = $('rec-box'), zone = $('texte'), statut = $('statut'), demarrer = $('demarrer'), arreter = $('arreter');
  if (!box || !zone) return;

  var actif = false;          // l'enregistrement est-il démarré ?
  var sid = '';               // identifiant de CE message (un par visite, même si on arrête / redémarre)
  var timer = 0, beat = 0, retry = 0;
  var sending = false, again = false;
  var link = 'idle';          // idle | sending | ok | error | refused
  var lastSent = null;        // dernier texte reçu par le serveur

  function newId() {
    var a = new Uint8Array(12), s = '';
    try { (window.crypto || window.msCrypto).getRandomValues(a); } catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < a.length; j++) s += (a[j] % 36).toString(36);
    return s;
  }
  function ready() { return !!G.auth && G.auth.mode === 'cloud' && G.auth.track !== false; }
  function token() { return G.save.cloud && G.save.session ? G.save.session.token : null; }

  function showStatus() {
    var n = zone.value.length;
    if (!ready()) { statut.textContent = 'Indisponible : le jeu n’est pas relié à un serveur (lance « node server/server.js »).'; return; }
    if (!actif) { statut.textContent = 'Enregistrement arrêté.'; return; }
    var s = 'Enregistrement actif : ' + n + ' caractères dans la zone de texte.';
    if (!n) s = 'Enregistrement actif.';
    if (link === 'sending') s += ' Envoi…';
    else if (link === 'ok' && n) s += ' ✓ Enregistré sur le serveur.';
    else if (link === 'error') s += ' ⚠ Serveur injoignable, nouvel essai…';
    else if (link === 'refused') s += ' ⚠ Le serveur refuse ce message.';
    statut.textContent = s;
  }

  function setButtons() {
    var on = ready();
    box.classList.toggle('off', !on);
    zone.disabled = !on;
    demarrer.disabled = !on || actif;
    arreter.disabled = !on || !actif;
  }

  // Envoie le texte au serveur. active=false : message final (on a arrêté)
  function send(active, keepalive) {
    clearTimeout(timer); timer = 0;
    if (!sid || !ready()) return Promise.resolve();
    if (sending && !keepalive) { again = true; return Promise.resolve(); }
    var text = zone.value;
    if (!text.trim() && lastSent === null) return Promise.resolve();            // rien d'écrit : rien à envoyer
    sending = true; link = 'sending'; showStatus();
    var hint = $('login-name') ? $('login-name').value.trim().slice(0, 20) : '';
    return G.auth.api('note', 'POST', { id: sid, device: G.tele ? G.tele.device() : '', text: text, active: active, hint: hint }, token(), keepalive)
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
    if (!ready() || actif) return;
    actif = true; link = 'idle';
    if (!sid) sid = newId();
    setButtons(); showStatus();
    send(true);                                               // envoie tout de suite ce qui est déjà écrit
    clearInterval(beat);
    beat = setInterval(function () { if (actif && zone.value.trim()) send(true); }, 20000);   // « je suis toujours en train d'écrire »
    try { zone.focus(); } catch (e) { /* ignore */ }
  }

  function stop(clear, keepalive) {
    var was = actif;
    actif = false; clearInterval(beat); beat = 0; clearTimeout(timer); timer = 0;
    var p = was ? send(false, keepalive) : Promise.resolve();
    if (clear) { sid = ''; lastSent = null; link = 'idle'; zone.value = ''; }
    setButtons(); showStatus();
    return p;
  }

  demarrer.addEventListener('click', function () { if (G.audio) G.audio.click(); start(); });
  arreter.addEventListener('click', function () { if (G.audio) G.audio.click(); stop(false); });
  zone.addEventListener('input', function () {
    if (actif) { link = 'idle'; showStatus(); sendSoon(900); }   // on n'envoie qu'une fois que la personne fait une pause
  });
  // Fermeture de la page pendant l'enregistrement : dernier envoi
  window.addEventListener('pagehide', function () { if (actif) stop(false, true); });

  G.notes = {
    refresh: function () { setButtons(); showStatus(); },
    // Appelé quand on quitte la page de connexion : on arrête et on efface (rien n'est envoyé ensuite)
    stop: function () { return stop(true); },
    active: function () { return actif; }
  };
  setButtons(); showStatus();
})();
