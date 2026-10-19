/* ==========================================================================
   hacker.js — l'ambiance « hacking » : pluie de code derrière les menus
   et séquence de démarrage façon terminal (une fois par session).
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var FS = 16, CH = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ<>{}/#$%&*+=';
  var cv = null, cx = null, W = 0, H = 0, cols = [], on = false, raf = 0, last = 0, rgb = '57,255,122';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function size(w, h) {
    if (!cv) return;
    W = w; H = h; cv.width = w; cv.height = h;
    cols = [];
    for (var i = 0; i < Math.ceil(w / FS); i++) cols.push(-Math.floor(Math.random() * h / FS));
  }

  function tick(now) {
    if (!on) return;
    raf = requestAnimationFrame(tick);
    if (now - last < 55) return;       // ~18 images/s : un effet lent et discret
    last = now;
    cx.globalCompositeOperation = 'destination-out';
    cx.fillStyle = 'rgba(0,0,0,.16)';
    cx.fillRect(0, 0, W, H);
    cx.globalCompositeOperation = 'source-over';
    cx.font = FS + 'px monospace';
    for (var i = 0; i < cols.length; i++) {
      var y = cols[i] * FS;
      if (y >= 0) {
        cx.fillStyle = 'rgba(' + rgb + ',.9)';
        cx.fillText(CH.charAt(Math.floor(Math.random() * CH.length)), i * FS, y);
      }
      if (y > H && Math.random() > 0.96) cols[i] = -Math.floor(Math.random() * 12); else cols[i]++;
    }
  }

  var hk = G.hacker = {
    booting: false,
    setColor: function (c) { rgb = c; },
    resize: function (w, h) { if (!cv) cv = document.getElementById('matrix'); if (cv) { cx = cx || cv.getContext('2d'); size(w, h); } },
    rain: function (state) {
      if (reduce) state = false;
      if (!cv) { cv = document.getElementById('matrix'); if (!cv) return; cx = cv.getContext('2d'); }
      if (state === on) return;
      on = state;
      if (on) {
        if (!W) size(cv.clientWidth || 800, cv.clientHeight || 600);
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
        cx.clearRect(0, 0, W, H);
      }
    },

    // Fausse séquence de démarrage. Un clic ou une touche la passe.
    boot: function () {
      var el = document.getElementById('boot'), pseudo = (G.save.data.settings.pseudo || 'invité');
      var seen = false;
      try { seen = sessionStorage.getItem('si.boot') === '1'; sessionStorage.setItem('si.boot', '1'); } catch (e) { /* ignore */ }
      if (!el) return;
      if (seen || reduce) { el.remove(); return; }
      var lines = [
        ['ok', 'SCROLL/OS 3.0 — démarrage du noyau'],
        ['ok', 'chargement des modules : souris, cookies, pare-feu'],
        ['ok', 'montage du web aléatoire … 12 thèmes trouvés'],
        ['wait', 'connexion au site cible'],
        ['ok', 'contournement du firewall'],
        ['go', 'accès accordé. bienvenue, ' + pseudo + '.']
      ];
      var out = el.querySelector('pre'), i = 0, timer = 0, ended = false;
      hk.booting = true;
      el.classList.add('show');
      function onKey(e) { e.stopPropagation(); e.preventDefault(); finish(); }
      function finish() {
        if (ended) return;
        ended = true; clearTimeout(timer); hk.booting = false;
        el.classList.add('out');
        setTimeout(function () { el.remove(); }, 450);
        window.removeEventListener('keydown', onKey, true);
        el.removeEventListener('pointerdown', finish);
      }
      function next() {
        if (i >= lines.length) { timer = setTimeout(finish, 450); return; }
        var l = lines[i++];
        var tag = l[0] === 'ok' ? '[  OK  ]' : l[0] === 'wait' ? '[  ..  ]' : '[ >>> ]';
        out.innerHTML += '<span class="' + l[0] + '">' + tag + '</span> ' + l[1].replace(/</g, '&lt;') + '\n';
        timer = setTimeout(next, 260 + Math.random() * 220);
      }
      window.addEventListener('keydown', onKey, true);
      el.addEventListener('pointerdown', finish);
      next();
    }
  };
})();
