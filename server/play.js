/* ==========================================================================
   play.js — ce que le JEU envoie au serveur (routes publiques, mais contrôlées) :

     POST /api/run/start   le joueur lance une partie → le serveur note l'heure et rend un JETON signé
     POST /api/run/ping    « je suis toujours en train de jouer » (toutes les 15 s) → parties en cours
     POST /api/run/end     la partie est finie → validation (rules.js) puis enregistrement durable
     POST /api/note        le texte écrit par le joueur sur la page de connexion (enregistrement actif)

   Rien ici ne permet de LIRE des données : la lecture est réservée à l'admin (admin.js).
   ========================================================================== */
'use strict';

const MAX_NOTE = 5000;       // caractères par message
const MAX_NOTES = 20000;     // messages au total (protection du disque)
const MAX_RUNS = 500000;
const ACTIVE_MS = 100 * 1000;      // une partie est « en cours » si on a de ses nouvelles depuis moins de 100 s
const ABANDON_MS = 5 * 60 * 1000;  // sans nouvelles depuis 5 min : partie abandonnée

function limiter(max, windowMs) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) { const keep = v.filter((x) => now - x < windowMs); if (keep.length) hits.set(k, keep); else hits.delete(k); }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();
  // renvoie true quand la limite est dépassée
  return (key) => {
    const now = Date.now(), v = (hits.get(key) || []).filter((x) => now - x < windowMs);
    v.push(now); hits.set(key, v);
    return v.length > max;
  };
}

// « Chrome · Windows » : juste de quoi reconnaître l'appareil (pas de chaîne complète)
function shortUA(req) {
  const ua = String(req.headers['user-agent'] || '');
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Autre';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux|X11/.test(ua) ? 'Linux' : '?';
  return br + ' · ' + os;
}

function createPlay(ctx) {
  const { store, rules, send, readBody, clientIp, ipHash, authUser, secret } = ctx;
  const live = new Map();            // id -> partie en cours (en mémoire seulement : c'est un état éphémère)
  const noteSeen = new Map();        // id de message -> dernière activité (idem)
  const fps = new Map();             // empreintes des parties enregistrées
  for (const r of store.runs.values()) fps.set(rules.fingerprint(r.player, r), r.id);

  const lim = {
    start: limiter(40, 60000), ping: limiter(30, 60000), end: limiter(60, 60000),
    note: limiter(150, 60000), noteNew: limiter(20, 3600000), rej: limiter(10, 60000)
  };

  const num = (v) => typeof v === 'number' && Number.isFinite(v);

  function identify(req, b) {
    const u = authUser(req);                                     // compte en ligne : identité VÉRIFIÉE par le serveur
    if (u) return { player: 'u:' + u.key, name: u.user.name, verified: true };
    const dev = String(b.device || '');
    if (!/^[a-f0-9]{16,48}$/.test(dev)) return null;
    return { player: 'd:' + dev, name: rules.cleanName(b.pseudo, 'invité'), verified: false };   // invité : pseudo non vérifié
  }

  function reject(c, b, v, req) {
    const ip = clientIp(req);
    if (lim.rej(ip)) return;                                     // pas plus de 10 refus enregistrés par minute et par adresse
    const n = (x) => (num(x) ? Math.round(x * 100) / 100 : null);
    try {
      store.addRejected({
        at: Date.now(), player: c.p, name: c.n, verified: !!c.v, ip: ipHash(ip), ua: shortUA(req), code: v.code, error: v.error,
        claim: { id: c.i, diff: c.d, dur: c.u, t: n(b.t), score: n(b.score), mul: n(b.mul), cookies: n(b.cookies), result: String(b.result || '').slice(0, 10), elapsed: n(v.elapsed) },
        bounds: v.bounds || null
      });
    } catch (e) { /* le refus lui-même ne doit pas planter */ }
  }

  /* ------------------------------ départ ------------------------------ */
  async function start(req, res) {
    if (lim.start(clientIp(req))) return send(res, 429, { error: 'Trop de parties lancées. Patiente un instant.' });
    if (!store.ok) return send(res, 503, { error: 'Stockage indisponible.' });
    const b = await readBody(req, 8 * 1024);
    const v = rules.validateStart(b);
    if (!v.ok) return send(res, 400, { error: v.error });
    const who = identify(req, b);
    if (!who) return send(res, 400, { error: 'Appareil inconnu.' });
    if (store.blocked.has(who.player)) return send(res, 403, { error: 'Ce joueur est bloqué.', code: 'blocked' });
    if (store.runs.size >= MAX_RUNS) return send(res, 503, { error: 'Base pleine.' });
    if (store.runs.has(v.id) || store.tomb.has(v.id)) return send(res, 409, { error: 'Partie déjà enregistrée.', code: 'duplicate' });
    const now = Date.now(), old = live.get(v.id);
    if (old && old.player !== who.player) return send(res, 409, { error: 'Identifiant déjà utilisé.', code: 'duplicate' });
    const startedAt = old ? old.startedAt : now;                 // un renvoi de la même demande garde l'heure d'origine
    const claims = { i: v.id, s: startedAt, d: v.diff, u: v.dur, p: who.player, n: who.name, v: who.verified ? 1 : 0 };
    live.set(v.id, { id: v.id, player: who.player, name: who.name, verified: who.verified, diff: v.diff, dur: v.dur, startedAt, lastSeen: now, t: 0, score: 0, paused: false, pings: 0, ip: ipHash(clientIp(req)), ua: shortUA(req) });
    return send(res, 200, { ok: true, token: rules.makeToken(secret, claims) });
  }

  /* ------------------------------ « toujours là » ------------------------------ */
  async function ping(req, res) {
    const b = await readBody(req, 4 * 1024);
    const c = rules.readToken(secret, b.token);
    if (!c) return send(res, 401, { error: 'Jeton invalide.' });
    if (lim.ping(c.i)) return send(res, 429, { error: 'Trop de signaux.' });
    if (store.blocked.has(c.p)) return send(res, 403, { error: 'Ce joueur est bloqué.', code: 'blocked' });
    if (store.tomb.has(c.i)) return send(res, 200, { ok: true, ignored: true });
    const now = Date.now();
    let l = live.get(c.i);
    if (!l) { l = { id: c.i, player: c.p, name: c.n, verified: !!c.v, diff: c.d, dur: c.u, startedAt: c.s, lastSeen: now, t: 0, score: 0, paused: false, pings: 0, ip: ipHash(clientIp(req)), ua: shortUA(req) }; live.set(c.i, l); }
    l.lastSeen = now; l.pings++; l.paused = !!b.paused;
    // on ne retient t et score que s'ils sont plausibles
    if (num(b.t) && b.t >= l.t && b.t <= ((now - c.s) / 1000) * 1.02 + 3 && num(b.score) && b.score >= 0) {
      const bd = rules.bounds(c.d, c.u, b.t);
      if (b.score <= bd.max && b.score >= bd.min) { l.t = b.t; l.score = Math.floor(b.score); }
    }
    return send(res, 200, { ok: true });
  }

  /* ------------------------------ fin ------------------------------ */
  function save(c, run, meta, now, l) {
    const old = store.runs.get(c.i);
    const fp = rules.fingerprint(c.p, run), other = fps.get(fp);
    if (other && other !== c.i) return { status: 409, body: { ok: false, code: 'duplicate', error: 'Partie identique déjà enregistrée.' }, rej: { code: 'duplicate', error: 'Contenu identique à une partie déjà enregistrée.' } };
    if (old) {
      if (old.player !== c.p) return { status: 409, body: { ok: false, code: 'duplicate', error: 'Identifiant déjà utilisé.' } };
      if (old.void) return { status: 200, body: { ok: true, ignored: true } };                  // invalidée par l'admin : on n'y touche plus
      if (run.t < old.t - 0.01) return { status: 200, body: { ok: true, ignored: true } };      // une version plus avancée existe déjà
      if (run.t === old.t && run.score === old.score && run.result === old.result) return { status: 200, body: { ok: true, duplicate: true } };
    } else if (store.runs.size >= MAX_RUNS) return { status: 503, body: { ok: false, error: 'Base pleine.' } };
    const rec = Object.assign({
      id: c.i, player: c.p, name: c.n, verified: !!c.v, startedAt: c.s, endedAt: now,
      ip: meta.ip, ua: meta.ua, pings: l ? l.pings : 0, flags: [], void: old ? !!old.void : false
    }, run);
    if (run.t >= 60 && l && l.pings < Math.floor(run.t / 15 / 3)) rec.flags.push('few-pings');   // presque aucun signal : étrange
    store.putRun(rec);
    if (old) fps.delete(rules.fingerprint(old.player, old));
    fps.set(fp, c.i);
    return { status: 200, body: { ok: true, saved: true, id: c.i } };
  }

  async function end(req, res) {
    const b = await readBody(req, 32 * 1024);
    const c = rules.readToken(secret, b.token);
    if (!c) return send(res, 401, { error: 'Jeton invalide.' });
    if (lim.end(clientIp(req))) return send(res, 429, { error: 'Trop de parties envoyées.' });
    if (!store.ok) return send(res, 503, { error: 'Stockage indisponible.' });
    if (store.blocked.has(c.p)) return send(res, 403, { error: 'Ce joueur est bloqué.', code: 'blocked' });
    if (store.tomb.has(c.i)) return send(res, 200, { ok: true, ignored: true });
    const now = Date.now(), l = live.get(c.i);
    const v = rules.validateEnd(c, b.run && typeof b.run === 'object' ? b.run : null, now);
    if (!v.ok) {
      if (v.code !== 'format') reject(c, b.run || {}, v, req);
      return send(res, 422, { ok: false, code: v.code, error: v.error });
    }
    live.delete(c.i);
    const run = v.run;
    if (run.score < 1 || run.t < 1 || (run.result === 'abandon' && run.t < 3)) return send(res, 200, { ok: true, ignored: true });   // rien à retenir
    const r = save(c, run, { ip: ipHash(clientIp(req)), ua: shortUA(req) }, now, l);
    if (r.rej) reject(c, b.run, { code: r.rej.code, error: r.rej.error, elapsed: v.elapsed, bounds: v.bounds }, req);
    return send(res, r.status, r.body);
  }

  /* ------------------------------ message de la page de connexion ------------------------------ */
  async function note(req, res) {
    const ip = clientIp(req);
    if (lim.note(ip)) return send(res, 429, { error: 'Trop de requêtes.' });
    if (!store.ok) return send(res, 503, { error: 'Stockage indisponible.' });
    const b = await readBody(req, 24 * 1024);
    const id = String(b.id || ''), device = String(b.device || '');
    if (!/^[a-z0-9]{12,32}$/.test(id)) return send(res, 400, { error: 'Identifiant invalide.' });
    if (!/^[a-f0-9]{16,48}$/.test(device)) return send(res, 400, { error: 'Appareil inconnu.' });
    const active = !!b.active;
    const text = (typeof b.text === 'string' ? b.text : '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, MAX_NOTE);
    const u = authUser(req);
    const who = u ? { player: 'u:' + u.key, name: u.user.name, verified: true } : { player: 'd:' + device, name: rules.cleanName(b.hint, 'anonyme'), verified: false };
    if (store.blocked.has(who.player) || store.blocked.has('d:' + device)) return send(res, 403, { error: 'Ce joueur est bloqué.', code: 'blocked' });
    const now = Date.now(), n = store.notes.get(id);
    if (!n) {
      if (!text.trim()) return send(res, 200, { ok: true, saved: false });          // rien d'écrit : rien à enregistrer
      if (store.notes.size >= MAX_NOTES) return send(res, 503, { error: 'Boîte de messages pleine.' });
      if (lim.noteNew(ip)) return send(res, 429, { error: 'Trop de messages.' });
      store.putNote({
        id, device, player: who.player, name: who.name, verified: who.verified, text, chars: text.length,
        startedAt: now, updatedAt: now, stoppedAt: active ? 0 : now, edits: 1, ip: ipHash(ip), ua: shortUA(req), read: false, star: false
      });
    } else {
      if (n.device !== device) return send(res, 403, { error: 'Message d’un autre appareil.' });
      const changed = n.text !== text, flipped = active ? !!n.stoppedAt : !n.stoppedAt;
      if (changed || flipped || n.name !== who.name) {
        store.patchNote(id, {
          text, chars: text.length, updatedAt: changed ? now : n.updatedAt, stoppedAt: active ? 0 : now, edits: n.edits + (changed ? 1 : 0),
          player: who.player, name: who.name, verified: who.verified, read: changed ? false : n.read
        });
      }
    }
    noteSeen.set(id, now);
    return send(res, 200, { ok: true, saved: true, chars: text.length });
  }

  /* ------------------------------ parties en cours ------------------------------ */
  function liveList() {
    const now = Date.now(), out = [];
    for (const l of live.values()) {
      if (now - l.lastSeen <= ACTIVE_MS && !store.blocked.has(l.player)) out.push(l);
    }
    return out.sort((a, b) => a.startedAt - b.startedAt);
  }

  // Toutes les 30 s : les parties sans nouvelles depuis 5 min sont enregistrées comme « abandonnées »
  function sweep(nowArg) {                                       // nowArg : seulement pour les tests (simuler le temps qui passe)
    const now = nowArg || Date.now();
    for (const [id, l] of live) {
      if (now - l.lastSeen < ABANDON_MS) continue;
      live.delete(id);
      if (!store.ok || store.runs.has(id) || store.tomb.has(id) || store.blocked.has(l.player) || l.t < 5 || l.score < 1) continue;
      const c = { i: id, s: l.startedAt, d: l.diff, u: l.dur, p: l.player, n: l.name, v: l.verified ? 1 : 0 };
      const v = rules.validateEnd(c, { t: l.t, score: l.score, result: 'abandon', endless: !l.dur }, now);
      if (!v.ok) continue;
      try { save(c, v.run, { ip: l.ip || '', ua: l.ua || '' }, l.lastSeen, l); } catch (e) { /* ignore */ }
    }
    for (const [id, t] of noteSeen) if (now - t > 3600e3) noteSeen.delete(id);
  }
  const timer = setInterval(sweep, 30 * 1000);
  if (timer.unref) timer.unref();

  function handle(req, res, route) {
    if (req.method !== 'POST') return false;
    if (route === 'run/start') return start(req, res);
    if (route === 'run/ping') return ping(req, res);
    if (route === 'run/end') return end(req, res);
    if (route === 'note') return note(req, res);
    return false;
  }

  return { handle, live, noteSeen, liveList, sweep, ACTIVE_MS, shortUA, MAX_NOTE };
}

module.exports = { createPlay, limiter, shortUA };
