/* ==========================================================================
   render.js — transforme une section générée en vrais éléments HTML.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};

  // Dessins des cookies et des bonus (Pare-feu, Wi-Fi lent, Ad-block)
  var W = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
  var PK_HTML = G.PK_HTML = {
    'cookie': '<span class="ckie"></span>',
    'power-shield': W + '<path d="M12 3 L19 6 V12 C19 16.5 16 19.5 12 21 C8 19.5 5 16.5 5 12 V6 Z"/><path d="M8.7 12 l2.4 2.4 l4.4 -4.8"/></svg>',
    'power-slow': W + '<path d="M3 9 C8 4.5 16 4.5 21 9"/><path d="M6 12.5 C9.5 9.5 14.5 9.5 18 12.5"/><path d="M9 16 C11 14.5 13 14.5 15 16"/><circle cx="12" cy="19.5" r="1.3" fill="#fff"/></svg>',
    'power-adblock': W + '<circle cx="12" cy="12" r="9"/><path d="M5.5 18.5 L18.5 5.5"/><text x="12" y="15" text-anchor="middle" font-size="8" font-weight="900" fill="#fff" stroke="none" font-family="Arial,sans-serif">AD</text></svg>'
  };

  G.renderSection = function (sec, world) {
    var th = sec.theme, k;
    var el = document.createElement('div');
    el.className = 'section' + (sec.pageStart ? ' page-start' : '');
    el.dataset.style = th.style;
    for (k in th.vars) el.style.setProperty('--' + k, th.vars[k]);
    el.style.fontFamily = th.font;
    el.style.height = sec.h + 'px';
    el.style.top = (-(sec.offset + sec.h)) + 'px';

    var frag = document.createDocumentFragment();
    sec.items.forEach(function (it) {
      var d = document.createElement('div');
      d.className = 'it ' + it.cls;
      d.style.left = (it.x * 100) + '%';
      d.style.width = (it.w * 100) + '%';
      d.style.top = it.y + 'px';
      d.style.height = it.h + 'px';
      if (it.hue) d.style.setProperty('--hue', it.hue + 'deg');
      d.innerHTML = it.html;
      it.el = d;
      it.near = false;
      frag.appendChild(d);
    });
    (sec.pickups || []).forEach(function (pk) {
      var d = document.createElement('div');
      d.className = 'pk pk-' + pk.type;
      d.style.left = (pk.x * 100) + '%';
      d.style.top = pk.y + 'px';
      d.innerHTML = PK_HTML[pk.type];
      pk.el = d; pk.ox = 0; pk.oy = 0; pk.taken = false;
      frag.appendChild(d);
    });
    el.appendChild(frag);
    world.appendChild(el);
    sec.el = el;
  };
})();
