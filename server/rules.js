/* ==========================================================================
   rules.js — validation des données envoyées par le jeu (anti-faux scores).

   Le jeu tourne dans le navigateur du joueur : on ne peut jamais être sûr à 100 %.
   Ici on refuse tout ce qui est INCOHÉRENT avec les vraies règles du jeu. Pour ça on
   recharge js/config.js (la même courbe de vitesse que le jeu → une seule source) :

     • le serveur donne lui-même l'heure de départ (jeton signé) : une partie ne peut pas
       durer plus longtemps que le temps réellement écoulé ;
     • le score = distance défilée / 10. Le site défile à la vitesse speedAt(t), ou à
       moitié moins vite sous l'effet « Wi-Fi lent » : le score doit donc se trouver
       dans une bande étroite autour de l'intégrale de speedAt ;
     • la vitesse maximale atteinte, la durée du niveau, la victoire, les cookies… doivent
       être cohérents ; les identifiants et textes sont nettoyés ;
     • une même partie (même jeton) ne peut être enregistrée qu'une fois, et un contenu
       identique du même joueur est refusé (copier-coller de score).

   ⚠ Un tricheur qui rejoue VRAIMENT le protocole en attendant le temps réel de la partie ne
   peut pas être détecté automatiquement : l'admin peut invalider n'importe quelle partie.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const DIFFS = ['zen', 'normal', 'infernal'];
const DURS = [0, 5, 10, 30];
const RESULTS = ['win', 'death', 'quit', 'abandon'];
const SAFE = /^[a-z0-9_-]{1,24}$/i;
const MAX_T = 6 * 3600;           // 6 h de jeu d'une seule partie, au maximum
const MAX_SCORE = 5e6;

/* ------------------------------ la config du jeu, rechargée ------------------------------ */
function loadConfig(root) {
  const src = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const sandbox = { window: {} };               // config.js n'utilise que window.SiteGame
  vm.runInNewContext(src, sandbox, { timeout: 1000 });
  const C = sandbox.window.SiteGame && sandbox.window.SiteGame.CONFIG;
  if (!C || typeof C.speedAt !== 'function' || typeof C.configure !== 'function') throw new Error('config.js inutilisable');
  return C;
}

function makeRules(root) {
  const C = loadConfig(root);

  // Distance défilée / 10 si le site avance à pleine vitesse pendant t secondes
  function maxScore(diff, dur, t) {
    C.configure({ duration: dur, difficulty: diff }, {});
    let sum = 0;
    const step = t > 3600 ? 1 : 0.25;
    for (let x = 0; x < t; x += step) { const h = Math.min(step, t - x); sum += C.speedAt(x + h) * h; }
    return sum / 10;
  }
  function speedMul(diff, dur, t) { C.configure({ duration: dur, difficulty: diff }, {}); return C.speedAt(t) / 100; }

  // Bande de score plausible pour (diff, dur, t) : de « Wi-Fi lent tout le temps » à « jamais ralenti »
  function bounds(diff, dur, t) {
    const I = maxScore(diff, dur, t);
    return { min: Math.max(0, Math.floor(I * 0.5 * 0.97 - 5)), max: Math.ceil(I * 1.03 + 5), full: Math.round(I) };
  }

  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const bad = (code, error, extra) => Object.assign({ ok: false, code, error }, extra || {});

  function cleanName(v, fallback) {
    const s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    return s || fallback || 'invité';
  }
  function cleanId(v, def) { return SAFE.test(String(v || '')) ? String(v) : def; }

  /* ------------------------------ début de partie ------------------------------ */
  function validateStart(b) {
    if (!b || typeof b !== 'object') return bad('format', 'Données manquantes.');
    if (!/^[a-z0-9]{8,24}$/.test(String(b.id || ''))) return bad('format', 'Identifiant de partie invalide.');
    if (!DIFFS.includes(b.diff)) return bad('format', 'Difficulté inconnue.');
    const dur = Number(b.dur);
    if (!DURS.includes(dur)) return bad('format', 'Durée de niveau inconnue.');
    return { ok: true, id: String(b.id), diff: b.diff, dur };
  }

  /* ------------------------------ fin de partie ------------------------------ */
  // claims : ce que le serveur sait (jeton signé) ; b : ce que dit le jeu ; now : heure du serveur
  function validateEnd(claims, b, now) {
    if (!b || typeof b !== 'object') return bad('format', 'Données manquantes.');
    const { d: diff, u: dur } = claims;
    if (!num(b.t) || !num(b.score)) return bad('format', 'Score ou durée manquants.');
    if (b.diff !== undefined && b.diff !== diff) return bad('mismatch', 'La difficulté ne correspond pas au jeton.');
    if (b.dur !== undefined && Number(b.dur) !== dur) return bad('mismatch', 'La durée du niveau ne correspond pas au jeton.');
    const result = RESULTS.includes(b.result) ? b.result : null;
    if (!result) return bad('format', 'Résultat inconnu.');
    const t = Math.round(b.t * 100) / 100, score = Math.floor(b.score);
    if (t < 0 || t > MAX_T) return bad('range', 'Durée hors limites.');
    if (score < 0 || score > MAX_SCORE) return bad('range', 'Score hors limites.');
    const endless = !!b.endless || !dur;

    // 1) le temps de jeu ne peut pas dépasser le temps réel écoulé depuis le départ (pauses comprises)
    const elapsed = (now - claims.s) / 1000;
    if (elapsed < -5) return bad('clock', 'Heure de départ dans le futur.');
    if (t > elapsed * 1.02 + 3) return bad('too-fast', 'Partie plus longue que le temps réellement écoulé.', { elapsed });

    // 2) le score doit coller à la courbe de vitesse du jeu
    const bd = bounds(diff, dur, t);
    if (score > bd.max || score < bd.min) return bad('score-implausible', 'Score incohérent avec la durée de la partie.', { elapsed, bounds: bd });

    // 3) vitesse maximale atteinte
    const exp = speedMul(diff, dur, t);
    let mul = Math.round(exp * 10) / 10;                    // pas envoyée (partie abandonnée) : on déduit la vitesse de la courbe
    if (b.mul !== undefined) {
      if (!num(b.mul)) return bad('format', 'Vitesse invalide.');
      if (b.mul > exp * 1.03 + 0.1 || b.mul < exp * 0.97 - 0.1) return bad('speed-implausible', 'Vitesse maximale incohérente.', { elapsed });
      mul = Math.round(b.mul * 10) / 10;
    }

    // 4) durée du niveau et victoire
    if (result === 'win') {
      if (!dur) return bad('win-endless', 'Pas de victoire en mode infini.', { elapsed });
      if (t < dur * 60 - 3) return bad('win-early', 'Victoire avant la fin du niveau.', { elapsed });
    }
    if (dur && !endless && t > dur * 60 + 3) return bad('over-duration', 'Partie plus longue que le niveau.', { elapsed });
    if (dur && endless && t < dur * 60 - 3) return bad('endless-early', 'Mode infini sans avoir fini le niveau.', { elapsed });

    // 5) le reste
    let cookies = num(b.cookies) ? Math.floor(b.cookies) : 0;
    if (cookies < 0 || cookies > 20 + t * 8) return bad('cookies-implausible', 'Nombre de cookies incohérent.', { elapsed });
    let samples = [];
    if (Array.isArray(b.samples)) {
      samples = b.samples.slice(0, 200).map((v) => (num(v) ? Math.max(0, Math.min(100, Math.round(v * 10) / 10)) : 0));
    }
    const sInt = num(b.sInt) && b.sInt >= 1 && b.sInt <= 3600 ? Math.round(b.sInt) : 10;
    const won = result === 'win' || !!b.won;

    return {
      ok: true, elapsed, bounds: bd,
      run: {
        t, score, diff, dur, endless, won, result, mul, cookies, samples, sInt,
        cause: cleanId(b.cause, ''), skin: cleanId(b.skin, 'arrow'), color: cleanId(b.color, 'white'), title: cleanId(b.title, 'rookie')
      }
    };
  }

  // Empreinte d'une partie : même joueur + mêmes chiffres = copier-coller
  function fingerprint(player, r) { return [player, r.diff, r.dur, r.t.toFixed(2), r.score, r.cookies].join('|'); }

  /* ------------------------------ jeton de partie (signé, sans état) ------------------------------ */
  const b64u = (buf) => Buffer.from(buf).toString('base64url');
  function sign(secret, payload) { return crypto.createHmac('sha256', secret).update(payload).digest('base64url'); }
  function makeToken(secret, claims) {
    const p = b64u(JSON.stringify(claims));
    return p + '.' + sign(secret, p);
  }
  function readToken(secret, token) {
    if (typeof token !== 'string' || token.length > 600) return null;
    const i = token.indexOf('.');
    if (i < 1) return null;
    const p = token.slice(0, i), sig = token.slice(i + 1);
    const good = sign(secret, p);
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    try {
      const c = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
      if (!c || typeof c.i !== 'string' || !num(c.s) || !DIFFS.includes(c.d) || !DURS.includes(c.u) || typeof c.p !== 'string') return null;
      return c;
    } catch (e) { return null; }
  }

  return { C, DIFFS, DURS, RESULTS, bounds, maxScore, validateStart, validateEnd, fingerprint, makeToken, readToken, cleanName };
}

module.exports = { makeRules, DIFFS, DURS, RESULTS, SAFE };
