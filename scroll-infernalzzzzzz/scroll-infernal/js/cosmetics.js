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
      } },
    { id: 'robot', name: 'Robot', desc: 'Bip bop. Antenne en option.', price: 180, cx: 14, cy: 17, w: 28, h: 32,
      build: function (c) {
        return svg(28, 32, '<path d="M14 3 V8" stroke="' + O + '" stroke-width="2"/><circle cx="14" cy="3" r="2.2" fill="#ff4d6d" stroke="' + O + '" stroke-width="1.4"/>' +
          '<rect x="1.5" y="14" width="3" height="7" rx="1" fill="#8a93a8" stroke="' + O + '" stroke-width="1.4"/><rect x="23.5" y="14" width="3" height="7" rx="1" fill="#8a93a8" stroke="' + O + '" stroke-width="1.4"/>' +
          '<rect x="4" y="8" width="20" height="18" rx="4" fill="' + c + '" stroke="' + O + '" stroke-width="2"/>' +
          '<rect x="8" y="13" width="4.5" height="5" rx="1" fill="#00e5ff"/><rect x="15.5" y="13" width="4.5" height="5" rx="1" fill="#00e5ff"/><rect x="9" y="21" width="10" height="2" fill="' + O + '"/>');
      } },
    { id: 'skull', name: 'Crâne pirate', desc: 'Le grand classique des hackers.', price: 220, cx: 14, cy: 14, w: 28, h: 30,
      build: function (c) {
        return svg(28, 30, '<path d="M14 2 C7 2 3 7 3 13 C3 17 5 19.5 8 21 V26 H20 V21 C23 19.5 25 17 25 13 C25 7 21 2 14 2 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>' +
          '<circle cx="10" cy="13" r="3" fill="' + O + '"/><circle cx="18" cy="13" r="3" fill="' + O + '"/><path d="M14 17 L12.5 20 H15.5 Z" fill="' + O + '"/>' +
          '<path d="M11 22 V26 M14 22 V26 M17 22 V26" stroke="' + O + '" stroke-width="1.4"/>');
      } },
    { id: 'bug', name: 'Bug', desc: 'Un vrai bug. Il court dans le code.', price: 180, cx: 16, cy: 16, w: 32, h: 30,
      build: function (c) {
        return svg(32, 30, '<path d="M6 10 L11 14 M4 17 L10 17 M6 25 L11 21 M26 10 L21 14 M28 17 L22 17 M26 25 L21 21 M12 5 L10 1 M20 5 L22 1" stroke="' + O + '" stroke-width="2" stroke-linecap="round"/>' +
          '<ellipse cx="16" cy="19" rx="7" ry="9" fill="' + c + '" stroke="' + O + '" stroke-width="2"/><circle cx="16" cy="8" r="5" fill="' + c + '" stroke="' + O + '" stroke-width="2"/>' +
          '<path d="M16 12 V28" stroke="' + O + '" stroke-width="1.5"/><circle cx="14" cy="7.5" r="1.2" fill="' + O + '"/><circle cx="18" cy="7.5" r="1.2" fill="' + O + '"/>');
      } },
    { id: 'ufo', name: 'Soucoupe', desc: 'Prends-moi pour un OVNI.', price: 260, cx: 17, cy: 13, w: 34, h: 26,
      build: function (c) {
        return svg(34, 26, '<ellipse cx="17" cy="17" rx="15" ry="6" fill="#8a93a8" stroke="' + O + '" stroke-width="2"/><path d="M9 15 C9 5 25 5 25 15 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>' +
          '<circle cx="8" cy="18" r="1.6" fill="#ffd43b"/><circle cx="17" cy="20" r="1.6" fill="#ffd43b"/><circle cx="26" cy="18" r="1.6" fill="#ffd43b"/>');
      } },
    { id: 'heart', name: 'Cœur', desc: 'Avec amour.', price: 140, cx: 14, cy: 14, w: 28, h: 28,
      build: function (c) {
        return svg(28, 28, '<path d="M14 25 C3 17 2 9 8 6 C11 4.5 14 6.5 14 9 C14 6.5 17 4.5 20 6 C26 9 25 17 14 25 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/><ellipse cx="9" cy="10" rx="2" ry="1.3" fill="#fff" opacity=".7"/>');
      } },
    { id: 'star', name: 'Étoile', desc: 'Une star du web.', price: 160, cx: 14, cy: 15, w: 28, h: 28,
      build: function (c) {
        return svg(28, 28, '<polygon points="14,2 17.5,10.5 26.5,11 19.5,17 22,26 14,21 6,26 8.5,17 1.5,11 10.5,10.5" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>');
      } },
    { id: 'diamond', name: 'Diamant', desc: 'Rare, brillant, hors de prix.', price: 350, cx: 14, cy: 14, w: 28, h: 28,
      build: function (c) {
        return svg(28, 28, '<path d="M14 2 L25 11 L14 26 L3 11 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/><path d="M3 11 H25 M9 11 L14 2 L19 11 M9 11 L14 26 M19 11 L14 26" fill="none" stroke="' + O + '" stroke-width="1.2" stroke-linejoin="round"/>');
      } },
    { id: 'plane', name: 'Avion en papier', desc: 'Léger comme une page web.', price: 170, cx: 14, cy: 14, w: 28, h: 28,
      build: function (c) {
        return svg(28, 28, '<path d="M2 12 L26 3 L18 25 L13 16 Z" fill="' + c + '" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/><path d="M26 3 L13 16" stroke="' + O + '" stroke-width="1.5"/>');
      } },
    { id: 'donut', name: 'Donut', desc: 'Glaçage de la couleur de ton choix.', price: 130, cx: 14, cy: 14, w: 28, h: 28,
      build: function (c) {
        return svg(28, 28, '<path fill-rule="evenodd" d="M14 2 a12 12 0 1 0 .01 0 Z M14 10 a4 4 0 1 1 -.01 0 Z" fill="#e7a96b" stroke="' + O + '" stroke-width="2"/>' +
          '<path fill-rule="evenodd" d="M14 4.5 a9.5 9.5 0 1 0 .01 0 Z M14 10.5 a3.5 3.5 0 1 1 -.01 0 Z" fill="' + c + '"/>' +
          '<path d="M8 9 l2 1 M19 8 l-1 2 M20 17 l-2 -1 M9 20 l1 -2 M14 6 v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>');
      } },
    { id: 'hacker', name: 'Hacker à capuche', desc: 'Récompense du succès « Page chargée ».', price: 0, req: 'win30', cx: 14, cy: 14, w: 28, h: 28,
      build: function (c) {
        return svg(28, 28, '<path d="M14 2 C7 2 3 8 3 15 V26 H25 V15 C25 8 21 2 14 2 Z" fill="#0b1f12" stroke="' + c + '" stroke-width="2"/>' +
          '<ellipse cx="14" cy="15" rx="7" ry="8" fill="#020a04" stroke="' + c + '" stroke-width="1.5"/>' +
          '<rect x="9.5" y="13" width="3.2" height="2" fill="' + c + '"/><rect x="15.3" y="13" width="3.2" height="2" fill="' + c + '"/><path d="M10.5 19 H17.5" stroke="' + c + '" stroke-width="1.4"/>', 'glow', 'color:' + c);
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
    { id: 'rainbow', name: 'Arc-en-ciel', price: 150, v: '#ff4d6d', rainbow: true },
    { id: 'lime', name: 'Citron vert', price: 25, v: '#a3ff12' },
    { id: 'teal', name: 'Turquoise', price: 25, v: '#14d9b5' },
    { id: 'crimson', name: 'Carmin', price: 25, v: '#dc143c' },
    { id: 'blue', name: 'Bleu roi', price: 25, v: '#3b5bff' },
    { id: 'ice', name: 'Glace', price: 40, v: '#a5f3fc' },
    { id: 'silver', name: 'Argent', price: 60, v: '#c9d1d9' },
    { id: 'gold', name: 'Or', price: 90, v: '#ffc83d' },
    { id: 'matrix', name: 'Matrix', price: 60, v: '#39ff7a' },
    { id: 'black', name: 'Noir', price: 40, v: '#222222' },
    { id: 'glitch', name: 'Glitch', price: 200, v: '#00e5ff', glitch: true }
  ];

  var trails = [
    { id: 'none', name: 'Aucune', desc: 'Sobre et efficace.', price: 0, palette: [] },
    { id: 'comet', name: 'Comète', desc: 'Une longue queue lumineuse bleue.', price: 60, palette: ['#2ec4ff'] },
    { id: 'crumbs', name: 'Miettes', desc: 'Tu sèmes des miettes de cookie.', price: 100, palette: ['#8b5a2b', '#6b3e1a', '#a9713a'] },
    { id: 'sparks', name: 'Étincelles', desc: 'Ça crépite derrière toi.', price: 120, palette: ['#ffd43b', '#ff9f1c'] },
    { id: 'rainbow', name: 'Arc-en-ciel', desc: 'Toutes les couleurs du web.', price: 180, palette: ['#ff4d6d', '#ff9f1c', '#ffd43b', '#3ddc84', '#2ec4ff', '#9b6bff', '#ff7ad9'] },
    { id: 'fire', name: 'Flammes', desc: 'Ça chauffe derrière toi.', price: 140, palette: ['#ffd43b', '#ff9f1c', '#ff4d2e'] },
    { id: 'snow', name: 'Neige', desc: 'Des flocons qui tombent doucement.', price: 110, palette: ['#ffffff', '#cfefff'] },
    { id: 'pixels', name: 'Pixels', desc: 'Des petits blocs façon rétro.', price: 130, palette: ['#00e5ff', '#ff2e97', '#ffd43b'] },
    { id: 'bubbles', name: 'Bulles', desc: 'Des bulles qui montent.', price: 120, palette: ['#9be7ff', '#cfefff'] },
    { id: 'electric', name: 'Électrique', desc: 'Des arcs électriques.', price: 200, palette: ['#00e5ff', '#e6fbff'] },
    { id: 'binary', name: 'Binaire', desc: 'Des 0 et des 1. Récompense du succès « Six chiffres ».', price: 0, req: 'score100k', palette: ['#39ff7a', '#b6ffd0'] }
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
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#d9a066" stroke="#111" stroke-width="1.6"/><ellipse cx="9" cy="9" rx="1.8" ry="1.5" fill="#4a2c12"/><ellipse cx="15" cy="11" rx="1.7" ry="1.4" fill="#4a2c12"/><ellipse cx="10.5" cy="15.5" rx="1.8" ry="1.5" fill="#4a2c12"/></svg>' },
    { id: 'luck', name: 'Chance du débutant', max: 3, prices: [200, 500, 1100],
      desc: 'Les bonus (Pare-feu, Wi-Fi lent, Ad-block) apparaissent plus souvent.', lvl: ['+35 %', '+70 %', '+105 %'],
      icon: '<svg viewBox="0 0 24 24"><path d="M12 3 L14.6 9 L21 9.6 L16.1 13.9 L17.6 20.3 L12 17 L6.4 20.3 L7.9 13.9 L3 9.6 L9.4 9 Z" fill="#3ddc84" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>' },
    { id: 'grace', name: 'Démarrage blindé', max: 3, prices: [150, 400, 900],
      desc: 'Plus de temps d’invincibilité au début et après une pause.', lvl: ['+0,5 s', '+1 s', '+1,5 s'],
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="#b39dff" stroke="#111" stroke-width="1.5"/><path d="M12 8 V13 L15 15 M9 2 H15" fill="none" stroke="#111" stroke-width="1.8" stroke-linecap="round"/></svg>' },
    { id: 'harvest', name: 'Récolte abondante', max: 3, prices: [250, 600, 1300],
      desc: 'Plus de cookies apparaissent sur le site.', lvl: ['+25 %', '+50 %', '+75 %'],
      icon: '<svg viewBox="0 0 24 24"><path d="M12 21 V8 M12 12 C8 12 6 9 6 5 C10 5 12 8 12 12 M12 14 C16 14 18 11 18 7 C14 7 12 10 12 14" fill="none" stroke="#111" stroke-width="3.2" stroke-linecap="round"/><path d="M12 21 V8 M12 12 C8 12 6 9 6 5 C10 5 12 8 12 12 M12 14 C16 14 18 11 18 7 C14 7 12 10 12 14" fill="none" stroke="#ffd43b" stroke-width="1.6" stroke-linecap="round"/></svg>' }
  ];

  // Thèmes d'interface (couleur du terminal)
  var uis = [
    { id: 'matrix', name: 'Matrix', desc: 'Le vert terminal classique.', price: 0, g: '#39ff7a', g2: '#00e5ff', rgb: '57,255,122' },
    { id: 'amber', name: 'Ambre', desc: 'Vieux moniteur orange.', price: 80, g: '#ffb000', g2: '#ffd166', rgb: '255,176,0' },
    { id: 'cyber', name: 'Cyber', desc: 'Cyan néon et rose électrique.', price: 120, g: '#00e5ff', g2: '#ff2e97', rgb: '0,229,255' },
    { id: 'blood', name: 'Sang', desc: 'Alerte rouge permanente.', price: 120, g: '#ff3860', g2: '#ff9f1c', rgb: '255,56,96' },
    { id: 'vapor', name: 'Vaporwave', desc: 'Violet et rose, années 80.', price: 150, g: '#b967ff', g2: '#ff71ce', rgb: '185,103,255' },
    { id: 'ice', name: 'Glace', desc: 'Bleu givré.', price: 90, g: '#9be7ff', g2: '#ffffff', rgb: '155,231,255' }
  ];

  // Titres affichés sur ton profil et dans le classement
  var titles = [
    { id: 'rookie', name: 'Script kiddie', desc: 'Tout le monde commence ici.', price: 0 },
    { id: 'hacker', name: 'Hackeur', desc: 'Tu commences à t’y connaître.', price: 80 },
    { id: 'ghost', name: 'Fantôme du réseau', desc: 'Personne ne t’a vu entrer.', price: 150 },
    { id: 'cookie', name: 'Baron des cookies', desc: 'Il y a de quoi faire un gâteau.', price: 250 },
    { id: 'root', name: 'Root', desc: 'Tous les accès.', price: 300 },
    { id: 'nolife', name: 'Sans-vie', desc: 'Le soleil, c’est surfait.', price: 500 },
    { id: 'legend', name: 'Légende vivante', desc: 'Récompense du succès « Dieu du web ».', price: 0, req: 'inf_win30' },
    { id: 'god', name: 'Dieu du scroll', desc: 'Récompense du succès « Platine ».', price: 0, req: 'platinum' }
  ];

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  G.COSMETICS = {
    skins: skins, colors: colors, trails: trails, upgrades: upgrades, uis: uis, titles: titles,
    ui: function (id) { return find(uis, id); },
    title: function (id) { return find(titles, id); },
    // un objet est à toi si tu l'as acheté ou si tu as débloqué le succès qui le donne
    owns: function (type, item, S) {
      return S.owned[type].indexOf(item.id) >= 0 || !!(item.req && S.achievements && S.achievements[item.req]);
    },
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
