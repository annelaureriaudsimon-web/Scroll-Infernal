/* ==========================================================================
   cosmetics.js — le catalogue de la boutique : souris, couleurs, traînées,
   améliorations. Les « souris » sont de petits dessins SVG.
   La zone de collision est la même pour toutes : la personnalisation est
   purement esthétique.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var O = '#111';

  function svg(w, h, inner, cls, style) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"' +
      (cls ? ' class="' + cls + '"' : '') + (style ? ' style="' + style + '"' : '') + '>' + inner + '</svg>';
  }
  var ARROW = 'M3 2 L3 24 L8.5 19 L12.5 28 L16.5 26.2 L12.6 17.3 L20 17 Z';
  var EYES = '<circle cx="6.6" cy="11" r="1.3" fill="' + O + '"/><circle cx="10.4" cy="12.6" r="1.3" fill="' + O + '"/>';

  var skins = [
    { id: 'arrow', name: 'Classique', desc: 'La flèche de toujours (avec des yeux).', price: 0, cx: 9, cy: 14, w: 24, h: 30,
      build: function (c) { return svg(24, 30, '<path d="' + ARROW + '" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>' + EYES); } },
    { id: 'neon', name: 'Néon', desc: 'Un contour qui brille dans le noir.', price: 80, cx: 9, cy: 14, w: 24, h: 30,
      build: function (c) { return svg(24, 30, '<path d="' + ARROW + '" fill="rgba(0,0,0,.35)" stroke="' + c + '" stroke-width="2.4" stroke-linejoin="round"/>', 'glow', 'color:' + c); } },
    { id: 'mouse', name: 'Souris', desc: 'Une vraie petite souris. Logique, non ?', price: 150, cx: 16, cy: 17, w: 32, h: 32,
      build: function (c) {
        return svg(32, 32,
          '<path d="M25 25 C31 25 32 19 29 15" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round"/>' +
          '<circle cx="9" cy="8" r="5" fill="#f4a6b8" stroke="' + O + '" stroke-width="1.6"/><circle cx="23" cy="8" r="5" fill="#f4a6b8" stroke="' + O + '" stroke-width="1.6"/>' +
          '<ellipse cx="16" cy="18" rx="10.5" ry="9.5" fill="' + c + '" stroke="' + O + '" stroke-width="2"/>' +
          '<circle cx="12.3" cy="16" r="1.5" fill="' + O + '"/><circle cx="19.7" cy="16" r="1.5" fill="' + O + '"/>' +
          '<ellipse cx="16" cy="21" rx="1.8" ry="1.3" fill="#e75480"/>' +
          '<path d="M6 20 L11 20.5 M6 23 L11 22 M26 20 L21 20.5 M26 23 L21 22" stroke="' + O + '" stroke-width="1" stroke-linecap="round"/>');
      } },
    { id: 'cookie', name: 'Cookie', desc: 'Croquant. Ne se teinte pas.', price: 100, cx: 14, cy: 14, w: 28, h: 28, fixedColor: true,
      build: function () {
        return svg(28, 28, '<circle cx="14" cy="14" r="12" fill="#d9a066" stroke="' + O + '" stroke-width="2"/>' +
          '<ellipse cx="9.5" cy="10" rx="2.2" ry="1.8" fill="#4a2c12"/><ellipse cx="18" cy="12" rx="2" ry="1.7" fill="#4a2c12"/>' +
          '<ellipse cx="12" cy="19" rx="2.2" ry="1.8" fill="#4a2c12"/><ellipse cx="19.5" cy="19.5" rx="1.6" ry="1.4" fill="#4a2c12"/>');
      } },
    { id: 'ghost', name: 'Fantôme', desc: 'Il traverse tout… sauf les blocs.', price: 200, cx: 14, cy: 15, w: 28, h: 32,
      build: function (c) {
        return svg(28, 32, '<path d="M3 28 V14 C3 6 8 2 14 2 C20 2 25 6 25 14 V28 L21 24.5 L17.5 28 L14 24.5 L10.5 28 L7 24.5 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>' +
          '<ellipse cx="10.5" cy="14" rx="2" ry="2.8" fill="' + O + '"/><ellipse cx="17.5" cy="14" rx="2" ry="2.8" fill="' + O + '"/><ellipse cx="14" cy="20" rx="1.7" ry="2.2" fill="' + O + '"/>');
      } },
    { id: 'rocket', name: 'Fusée', desc: 'Décollage immédiat.', price: 250, cx: 12, cy: 16, w: 24, h: 36,
      build: function (c) {
        return svg(24, 36, '<path d="M9 24 Q12 36 15 24 Z" fill="#ffb020" stroke="' + O + '" stroke-width="1.5"/>' +
          '<path d="M7 18 L2 28 L7 25 Z M17 18 L22 28 L17 25 Z" fill="#ff3d57" stroke="' + O + '" stroke-width="1.6" stroke-linejoin="round"/>' +
          '<path d="M12 2 C17 8 18 15 17 24 H7 C6 15 7 8 12 2 Z" fill="' + c + '" stroke="' + O + '" stroke-width="1.8" stroke-linejoin="round"/>' +
          '<circle cx="12" cy="12" r="3" fill="#7fd3ff" stroke="' + O + '" stroke-width="1.5"/>');
      } },
    { id: 'cat', name: 'Chat', desc: 'L’ennemi naturel de la souris… devenu ami.', price: 300, cx: 16, cy: 16, w: 32, h: 30,
      build: function (c) {
        return svg(32, 30, '<path d="M5 14 L6 3 L13 8 C15 7.5 17 7.5 19 8 L26 3 L27 14 C28 24 22 28 16 28 C10 28 4 24 5 14 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>' +
          '<ellipse cx="11.5" cy="16" rx="1.6" ry="2.4" fill="' + O + '"/><ellipse cx="20.5" cy="16" rx="1.6" ry="2.4" fill="' + O + '"/>' +
          '<path d="M14.5 19.5 H17.5 L16 21.5 Z" fill="#ff7aa8"/><path d="M4 20 L10 21 M4 24 L10 23 M28 20 L22 21 M28 24 L22 23" stroke="' + O + '" stroke-width="1" stroke-linecap="round"/>');
      } },
    { id: 'crown', name: 'Roi du web', desc: 'Une flèche, une couronne. Tout est dit.', price: 400, cx: 9, cy: 21, w: 26, h: 38,
      build: function (c) {
        return svg(26, 38, '<path d="M3 10 L3 32 L8.5 27 L12.5 36 L16.5 34.2 L12.6 25.3 L20 25 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>' +
          '<circle cx="6.6" cy="19" r="1.3" fill="' + O + '"/><circle cx="10.4" cy="20.6" r="1.3" fill="' + O + '"/>' +
          '<path d="M3 9 L5 2 L9 6 L12 1 L15 6 L19 2 L21 9 Z" fill="#ffd43b" stroke="' + O + '" stroke-width="1.6" stroke-linejoin="round"/>');
      } }
  ];

  var colors = [
    { id: 'white', name: 'Blanc', price: 0, v: '#ffffff' },
    { id: 'red', name: 'Rouge', price: 25, v: '#ff4d6d' },
    { id: 'orange', name: 'Orange', price: 25, v: '#ff9f1c' },
    { id: 'yellow', name: 'Jaune', price: 25, v: '#ffd43b' },
    { id: 'green', name: 'Vert', price: 25, v: '#3ddc84' },
    { id: 'cyan', name: 'Cyan', price: 25, v: '#2ec4ff' },
    { id: 'violet', name: 'Violet', price: 25, v: '#9b6bff' },
    { id: 'pink', name: 'Rose', price: 25, v: '#ff7ad9' },
    { id: 'rainbow', name: 'Arc-en-ciel', price: 150, v: '#ff4d6d', rainbow: true }
  ];

  var trails = [
    { id: 'none', name: 'Aucune', desc: 'Sobre et efficace.', price: 0, palette: [] },
    { id: 'comet', name: 'Comète', desc: 'Une longue queue lumineuse bleue.', price: 60, palette: ['#2ec4ff'] },
    { id: 'crumbs', name: 'Miettes', desc: 'Tu sèmes des miettes de cookie.', price: 100, palette: ['#8b5a2b', '#6b3e1a', '#a9713a'] },
    { id: 'sparks', name: 'Étincelles', desc: 'Ça crépite derrière toi.', price: 120, palette: ['#ffd43b', '#ff9f1c'] },
    { id: 'rainbow', name: 'Arc-en-ciel', desc: 'Toutes les couleurs du web.', price: 180, palette: ['#ff4d6d', '#ff9f1c', '#ffd43b', '#3ddc84', '#2ec4ff', '#9b6bff', '#ff7ad9'] }
  ];

  var upgrades = [
    { id: 'magnet', name: 'Aimant à cookies', max: 3, prices: [120, 300, 700],
      desc: 'Attire les cookies proches de toi.', lvl: ['Portée : 70 px', 'Portée : 110 px', 'Portée : 160 px'],
      icon: '<svg viewBox="0 0 24 24"><path d="M5 3 H9 V13 A3 3 0 0 0 15 13 V3 H19 V13 A7 7 0 0 1 5 13 Z" fill="#ff4d6d" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><rect x="5" y="3" width="4" height="4" fill="#eee" stroke="#111" stroke-width="1.2"/><rect x="15" y="3" width="4" height="4" fill="#eee" stroke="#111" stroke-width="1.2"/></svg>' },
    { id: 'shield', name: 'Pare-feu de départ', max: 1, prices: [500],
      desc: 'Chaque partie commence avec un Pare-feu (annule un choc).', lvl: ['Actif'],
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2 L20 5 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V5 Z" fill="#2ec4ff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.5 12 l2.5 2.5 l4.5 -5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { id: 'power', name: 'Bonus durables', max: 3, prices: [150, 350, 800],
      desc: 'Wi-Fi lent et Ad-block durent plus longtemps.', lvl: ['+25 %', '+50 %', '+75 %'],
      icon: '<svg viewBox="0 0 24 24"><path d="M6 3 H18 V7 L13 12 L18 17 V21 H6 V17 L11 12 L6 7 Z" fill="#ffd43b" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>' },
    { id: 'bonus', name: 'Gros butin', max: 3, prices: [200, 450, 900],
      desc: 'Gagne plus de cookies à la fin de chaque partie.', lvl: ['+20 %', '+40 %', '+60 %'],
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#d9a066" stroke="#111" stroke-width="1.6"/><ellipse cx="9" cy="9" rx="1.8" ry="1.5" fill="#4a2c12"/><ellipse cx="15" cy="11" rx="1.7" ry="1.4" fill="#4a2c12"/><ellipse cx="10.5" cy="15.5" rx="1.8" ry="1.5" fill="#4a2c12"/></svg>' }
  ];

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  G.COSMETICS = {
    skins: skins, colors: colors, trails: trails, upgrades: upgrades,
    skin: function (id) { return find(skins, id); },
    color: function (id) { return find(colors, id); },
    trail: function (id) { return find(trails, id); },
    upgrade: function (id) { return find(upgrades, id); },
    skinHtml: function (skinId, colorId) {
      var s = find(skins, skinId), c = find(colors, colorId);
      return s.build(c.v);
    }
  };
})();
