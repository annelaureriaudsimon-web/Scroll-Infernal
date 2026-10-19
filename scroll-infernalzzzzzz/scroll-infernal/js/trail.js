/* ==========================================================================
   trail.js — traînée derrière la souris (canvas transparent par-dessus le site).
   Types : comet, crumbs, sparks, rainbow, fire, snow, pixels, bubbles, electric, binary
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};

  var cv = null, cx = null, W = 0, H = 0;
  var parts = [], kind = 'none', lastX = null, lastY = null, hueT = 0;
  var rnd = Math.random;
  var ADD = { comet: 1, rainbow: 1, sparks: 1, fire: 1, electric: 1, pixels: 1, binary: 1 }; // modes de fusion « lumineux »

  function spawn(x, y) {
    var p = { x: x, y: y, vx: 0, vy: 0, life: 0, ttl: 0.5, size: 5, c: 0 };
    switch (kind) {
      case 'comet': p.ttl = 0.55; p.size = 6.5; break;
      case 'rainbow': p.ttl = 0.6; p.size = 5.5; p.c = (hueT * 220) % 360; break;
      case 'sparks': p.ttl = 0.45 + rnd() * 0.3; p.size = 1.4 + rnd() * 1.6; p.vx = (rnd() - 0.5) * 120; p.vy = (rnd() - 0.5) * 120 + 20; p.c = rnd() < 0.5 ? 0 : 1; break;
      case 'crumbs': p.ttl = 0.7 + rnd() * 0.5; p.size = 2 + rnd() * 2; p.vx = (rnd() - 0.5) * 50; p.vy = rnd() * 30; p.c = Math.floor(rnd() * 3); break;
      case 'fire': p.ttl = 0.4 + rnd() * 0.3; p.size = 3 + rnd() * 4; p.vx = (rnd() - 0.5) * 30; p.vy = -50 - rnd() * 60; break;
      case 'snow': p.ttl = 0.9 + rnd() * 0.6; p.size = 1.5 + rnd() * 2; p.vx = (rnd() - 0.5) * 24; p.vy = 18 + rnd() * 22; break;
      case 'pixels': p.ttl = 0.5; p.size = 4; p.c = Math.floor(rnd() * 3); p.x = Math.round(x / 4) * 4; p.y = Math.round(y / 4) * 4; break;
      case 'bubbles': p.ttl = 0.7 + rnd() * 0.4; p.size = 2 + rnd() * 3; p.vx = (rnd() - 0.5) * 20; p.vy = -22 - rnd() * 20; break;
      case 'electric': p.ttl = 0.16; p.size = 7 + rnd() * 8; p.c = rnd() * 6.283; break;
      case 'binary': p.ttl = 0.8 + rnd() * 0.4; p.size = 12; p.vy = 25 + rnd() * 25; p.c = rnd() < 0.5 ? '0' : '1'; break;
    }
    p.life = p.ttl;
    parts.push(p);
  }

  function draw(p, a, dt) {
    switch (kind) {
      case 'comet':
        cx.fillStyle = 'rgba(70,200,255,' + (a * 0.75) + ')';
        cx.beginPath(); cx.arc(p.x, p.y, p.size * a + 0.5, 0, 6.283); cx.fill(); break;
      case 'rainbow':
        cx.fillStyle = 'hsla(' + p.c + ',100%,60%,' + (a * 0.85) + ')';
        cx.beginPath(); cx.arc(p.x, p.y, p.size * (0.4 + 0.6 * a), 0, 6.283); cx.fill(); break;
      case 'sparks':
        cx.fillStyle = (p.c ? 'rgba(255,150,30,' : 'rgba(255,225,80,') + a + ')';
        cx.fillRect(p.x, p.y, p.size, p.size); break;
      case 'crumbs':
        p.vy += 260 * dt;
        cx.fillStyle = ['#8b5a2b', '#6b3e1a', '#a9713a'][p.c];
        cx.globalAlpha = Math.min(1, a * 1.5); cx.fillRect(p.x, p.y, p.size, p.size); cx.globalAlpha = 1; break;
      case 'fire':
        cx.fillStyle = 'rgba(255,' + Math.round(60 + 160 * a) + ',30,' + (a * 0.8) + ')';
        cx.beginPath(); cx.arc(p.x, p.y, p.size * a + 0.5, 0, 6.283); cx.fill(); break;
      case 'snow':
        cx.fillStyle = 'rgba(255,255,255,' + Math.min(1, a * 1.4) + ')';
        cx.beginPath(); cx.arc(p.x, p.y, p.size, 0, 6.283); cx.fill(); break;
      case 'pixels':
        cx.fillStyle = ['rgba(0,229,255,', 'rgba(255,46,151,', 'rgba(255,212,59,'][p.c] + a + ')';
        cx.fillRect(p.x, p.y, p.size, p.size); break;
      case 'bubbles':
        cx.strokeStyle = 'rgba(160,225,255,' + a + ')'; cx.lineWidth = 1.2;
        cx.beginPath(); cx.arc(p.x, p.y, p.size * (1.3 - 0.3 * a), 0, 6.283); cx.stroke(); break;
      case 'electric':
        cx.strokeStyle = 'rgba(150,240,255,' + a + ')'; cx.lineWidth = 1.5;
        cx.beginPath(); cx.moveTo(p.x, p.y);
        cx.lineTo(p.x + Math.cos(p.c) * p.size * 0.5 + (rnd() - 0.5) * 5, p.y + Math.sin(p.c) * p.size * 0.5 + (rnd() - 0.5) * 5);
        cx.lineTo(p.x + Math.cos(p.c) * p.size, p.y + Math.sin(p.c) * p.size); cx.stroke(); break;
      case 'binary':
        cx.fillStyle = 'rgba(57,255,122,' + a + ')'; cx.font = '12px monospace';
        cx.fillText(p.c, p.x, p.y); break;
    }
  }

  G.trail = {
    init: function () { cv = document.getElementById('trail'); cx = cv.getContext('2d'); },
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
        else if (kind === 'snow' || kind === 'bubbles' || kind === 'fire') spawn(x, y);
      }
      lastX = x; lastY = y;

      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = ADD[kind] ? 'lighter' : 'source-over';
      for (var k = parts.length - 1; k >= 0; k--) {
        var p = parts[k];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(k, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        draw(p, p.life / p.ttl, dt);
      }
    }
  };
})();
