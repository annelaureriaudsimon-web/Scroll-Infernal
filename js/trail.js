/* ==========================================================================
   trail.js — traînée derrière la souris (canvas transparent par-dessus le site).
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};

  var cv = null, cx = null, W = 0, H = 0;
  var parts = [], kind = 'none', lastX = null, lastY = null, hueT = 0;

  function spawn(x, y) {
    var p = { x: x, y: y, vx: 0, vy: 0, life: 0, ttl: 0.5, size: 5, c: 0 };
    if (kind === 'comet') { p.ttl = 0.55; p.size = 6.5; }
    else if (kind === 'rainbow') { p.ttl = 0.6; p.size = 5.5; p.c = (hueT * 220) % 360; }
    else if (kind === 'sparks') {
      p.ttl = 0.45 + Math.random() * 0.3; p.size = 1.4 + Math.random() * 1.6;
      p.vx = (Math.random() - 0.5) * 120; p.vy = (Math.random() - 0.5) * 120 + 20; p.c = Math.random() < 0.5 ? 0 : 1;
    } else if (kind === 'crumbs') {
      p.ttl = 0.7 + Math.random() * 0.5; p.size = 2 + Math.random() * 2;
      p.vx = (Math.random() - 0.5) * 50; p.vy = Math.random() * 30; p.c = Math.floor(Math.random() * 3);
    }
    p.life = p.ttl;
    parts.push(p);
  }

  G.trail = {
    init: function () {
      cv = document.getElementById('trail');
      cx = cv.getContext('2d');
    },
    resize: function (w, h) { W = w; H = h; if (cv) { cv.width = w; cv.height = h; } },
    setKind: function (k) { kind = k || 'none'; parts.length = 0; if (cx) cx.clearRect(0, 0, W, H); },
    clear: function () { parts.length = 0; lastX = null; if (cx) cx.clearRect(0, 0, W, H); },
    step: function (dt, x, y, active, enabled) {
      if (!cx) return;
      if (!enabled || kind === 'none') {
        if (parts.length) { parts.length = 0; cx.clearRect(0, 0, W, H); }
        lastX = null;
        return;
      }
      hueT += dt;
      if (active && lastX !== null) {
        var dist = Math.hypot(x - lastX, y - lastY);
        var n = Math.min(8, Math.ceil(dist / 5));
        if (dist > 0.5) for (var i = 1; i <= n; i++) spawn(lastX + (x - lastX) * i / n, lastY + (y - lastY) * i / n);
      }
      lastX = x; lastY = y;

      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = kind === 'crumbs' ? 'source-over' : 'lighter';
      for (var k = parts.length - 1; k >= 0; k--) {
        var p = parts[k];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(k, 1); continue; }
        var a = p.life / p.ttl;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (kind === 'crumbs') p.vy += 260 * dt;
        if (kind === 'comet') {
          cx.fillStyle = 'rgba(70,200,255,' + (a * 0.75) + ')';
          cx.beginPath(); cx.arc(p.x, p.y, p.size * a + 0.5, 0, 6.283); cx.fill();
        } else if (kind === 'rainbow') {
          cx.fillStyle = 'hsla(' + p.c + ',100%,60%,' + (a * 0.85) + ')';
          cx.beginPath(); cx.arc(p.x, p.y, p.size * (0.4 + 0.6 * a), 0, 6.283); cx.fill();
        } else if (kind === 'sparks') {
          cx.fillStyle = (p.c ? 'rgba(255,150,30,' : 'rgba(255,225,80,') + a + ')';
          cx.fillRect(p.x, p.y, p.size, p.size);
        } else {
          cx.fillStyle = ['#8b5a2b', '#6b3e1a', '#a9713a'][p.c];
          cx.globalAlpha = Math.min(1, a * 1.5);
          cx.fillRect(p.x, p.y, p.size, p.size);
          cx.globalAlpha = 1;
        }
      }
    }
  };
})();
