/* ==========================================================================
   admin.js — le panneau d'administration PRIVÉ : connexion + API (/api/admin/…).

   • Rien n'est accessible sans être connecté : toutes les routes répondent 401.
   • Mot de passe : variable d'environnement ADMIN_PASSWORD, sinon un mot de passe
     est généré au premier démarrage (affiché UNE fois dans la console) et seul son
     empreinte (scrypt) est gardée dans DATA_DIR/admin.json.
   • Session : cookie HttpOnly + SameSite=Strict (illisible par les scripts de la page),
     « Secure » dès que le site est en HTTPS. Les actions qui modifient exigent en plus
     l'en-tête X-Admin et une origine identique (protection CSRF).
   • Essais de mot de passe limités par adresse ; refus ralentis.
   • Les statistiques sont calculées à la demande depuis les VRAIES données enregistrées.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DIFFS, DURS, RESULTS } = require('./rules');
const { limiter } = require('./play');

const DAY = 864e5;
const SESSION_DAYS = 30;
const COOKIE = 'si_admin';
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sans 0/O, 1/l/I

function genPassword() {
  const g = () => Array.from({ length: 4 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
  return [g(), g(), g(), g()].join('-');
}
const intp = (v, def, min, max) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };
const fold = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (x, d) => { const k = Math.pow(10, d || 0); return Math.round(x * k) / k; };

function createAdmin(ctx) {
  const { store, rules, play, send, readBody, clientIp, ipHash, dataDir, sha, isHttps, userCount } = ctx;
  const file = path.join(dataDir, 'admin.json');
  const envPass = process.env.ADMIN_PASSWORD || '';
  const envSalt = crypto.randomBytes(16).toString('hex');
  const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');
  const envHash = envPass ? hashPass(envPass, envSalt) : '';
  const bootAt = Date.now();

  let st = { salt: '', hash: '', pwTag: '', sessions: {} };
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); if (j && typeof j === 'object') st = Object.assign(st, j); } catch (e) { /* premier démarrage */ }
  if (!st.sessions || typeof st.sessions !== 'object') st.sessions = {};

  function saveAuth() {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(st), { mode: 0o600 });
      fs.renameSync(tmp, file);
    } catch (e) { console.error('[admin] impossible d’écrire admin.json :', e.message); }
  }
  function prune() { const now = Date.now(); for (const k of Object.keys(st.sessions)) if (!st.sessions[k] || st.sessions[k].exp < now) delete st.sessions[k]; }

  // Prépare le mot de passe. Renvoie le mot de passe généré (à afficher UNE fois) ou null.
  function init() {
    if (envPass) {
      const tag = sha('env:' + envPass).slice(0, 16);
      if (st.pwTag !== tag) { st.sessions = {}; st.pwTag = tag; saveAuth(); }          // nouveau mot de passe : on déconnecte tout le monde
      return { source: 'env', generated: null, short: envPass.length < 10 };
    }
    if (st.hash && st.salt) return { source: 'file', generated: null };
    return { source: 'file', generated: resetPassword() };
  }
  function resetPassword(pw) {
    pw = pw || genPassword();
    st.salt = crypto.randomBytes(16).toString('hex');
    st.hash = hashPass(pw, st.salt);
    st.pwTag = sha(st.hash).slice(0, 16);
    st.sessions = {};
    saveAuth();
    return pw;
  }
  function verify(pass) {
    pass = String(pass || '').slice(0, 200);
    const cand = hashPass(pass, envHash ? envSalt : st.salt);
    const ref = envHash || st.hash;
    if (!ref) return false;
    const a = Buffer.from(cand, 'hex'), b = Buffer.from(ref, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /* ------------------------------ session ------------------------------ */
  const getToken = (req) => { const m = /(?:^|;\s*)si_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || ''); return m ? m[1] : null; };
  function session(req) {
    const t = getToken(req);
    if (!t) return null;
    const s = st.sessions[sha(t)];
    return s && s.exp > Date.now() ? { token: t, s } : null;
  }
  const cookieHeader = (req, value, maxAge) =>
    COOKIE + '=' + value + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + (isHttps(req) ? '; Secure' : '');

  const failsAll = limiter(60, 10 * 60 * 1000);   // 60 échecs au total en 10 min : au-delà, chaque essai est ralenti
  const failedBy = new Map();                     // adresse -> échecs récents (6 max par tranche de 10 min)

  async function login(req, res) {
    const ip = clientIp(req);
    const recent = (failedBy.get(ip) || []).filter((x) => Date.now() - x < 600e3);
    if (recent.length >= 6) return send(res, 429, { error: 'Trop d’essais. Réessaie dans quelques minutes.' });
    const b = await readBody(req, 4 * 1024);
    if (verify(b.password)) {
      failedBy.delete(ip);
      const token = crypto.randomBytes(32).toString('hex');
      prune();
      st.sessions[sha(token)] = { created: Date.now(), exp: Date.now() + SESSION_DAYS * DAY, ip: ipHash(ip), ua: play.shortUA(req) };
      saveAuth();
      console.log('[admin] connexion réussie (' + play.shortUA(req) + ')');
      return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(req, token, SESSION_DAYS * 86400) });
    }
    recent.push(Date.now()); failedBy.set(ip, recent);
    await sleep(failsAll('all') ? 3000 : 600);           // ralentit les essais en rafale
    console.log('[admin] mot de passe refusé (' + play.shortUA(req) + ')');
    return send(res, 401, { error: 'Mot de passe incorrect.' });
  }

  /* ------------------------------ outils de requête ------------------------------ */
  function ensureSameOrigin(req) {
    const o = req.headers.origin;
    if (o) { try { if (new URL(o).host !== req.headers.host) return false; } catch (e) { return false; } }
    return req.headers['x-admin'] === '1';
  }

  function runRow(r) {
    return {
      id: r.id, player: r.player, name: r.name, verified: !!r.verified, startedAt: r.startedAt, endedAt: r.endedAt, t: r.t, score: r.score,
      diff: r.diff, dur: r.dur, endless: !!r.endless, result: r.result, cause: r.cause || '', cookies: r.cookies, mul: r.mul, void: !!r.void,
      flags: r.flags || [], ua: r.ua || ''
    };
  }

  function runFilter(q) {
    const diff = DIFFS.includes(q.diff) ? q.diff : '';
    const dur = q.dur !== undefined && q.dur !== '' && DURS.includes(Number(q.dur)) ? Number(q.dur) : null;
    const result = RESULTS.includes(q.result) ? q.result : '';
    const status = q.status === 'ok' || q.status === 'void' || q.status === 'flag' ? q.status : '';
    const verified = q.verified === '1' ? true : q.verified === '0' ? false : null;
    const from = intp(q.from, 0, 0, 9e15), to = intp(q.to, 0, 0, 9e15);
    const player = String(q.player || '').slice(0, 60);
    const needle = fold(String(q.q || '').slice(0, 80)).trim();
    const minScore = intp(q.minScore, 0, 0, 1e9);
    return (r) => {
      if (diff && r.diff !== diff) return false;
      if (dur !== null && Number(r.dur) !== dur) return false;
      if (result && r.result !== result) return false;
      if (status === 'ok' && r.void) return false;
      if (status === 'void' && !r.void) return false;
      if (status === 'flag' && !(r.flags && r.flags.length)) return false;
      if (verified !== null && !!r.verified !== verified) return false;
      if (from && r.endedAt < from) return false;
      if (to && r.endedAt > to) return false;
      if (player && r.player !== player) return false;
      if (minScore && r.score < minScore) return false;
      if (needle && !(fold(r.name).includes(needle) || fold(r.player).includes(needle) || r.id.includes(needle) || fold(r.cause).includes(needle) || fold(r.ua).includes(needle))) return false;
      return true;
    };
  }

  const SORTS = {
    date: (r) => r.endedAt, score: (r) => r.score, t: (r) => r.t, cookies: (r) => r.cookies, mul: (r) => r.mul,
    name: (r) => fold(r.name), diff: (r) => DIFFS.indexOf(r.diff), result: (r) => r.result
  };
  function sortRows(rows, key, dir, tie) {
    const f = SORTS[key] || SORTS.date, k = dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => { const x = f(a), y = f(b); if (x < y) return -k; if (x > y) return k; return tie(a, b); });
  }
  function paginate(rows, q, defSize) {
    const size = intp(q.size, defSize || 25, 5, 200), total = rows.length, pages = Math.max(1, Math.ceil(total / size));
    const page = intp(q.page, 1, 1, pages);
    return { total, size, page, pages, slice: rows.slice((page - 1) * size, page * size) };
  }

  /* ------------------------------ classement ------------------------------ */
  function ranking(opts) {
    const rows = [];
    for (const r of store.runs.values()) {
      if (r.void || r.result === 'abandon') continue;
      if (opts.diff && r.diff !== opts.diff) continue;
      if (opts.dur !== null && opts.dur !== undefined && Number(r.dur) !== opts.dur) continue;
      if (opts.since && r.endedAt < opts.since) continue;
      if (store.blocked.has(r.player)) continue;
      rows.push(r);
    }
    rows.sort((a, b) => b.score - a.score || a.endedAt - b.endedAt);
    let list = rows;
    if (opts.unique) { const seen = new Set(); list = rows.filter((r) => (seen.has(r.player) ? false : (seen.add(r.player), true))); }
    return { total: list.length, list };
  }

  /* ------------------------------ joueurs ------------------------------ */
  function playersMap() {
    const m = new Map();
    const get = (key) => {
      let p = m.get(key);
      if (!p) {
        p = { key, name: '', verified: key[0] === 'u', type: key[0] === 'u' ? 'compte' : 'invité', runs: 0, valid: 0, best: 0, bestDiff: '', time: 0, firstSeen: 0, lastSeen: 0, notes: 0, unread: 0, blocked: false, blockedAt: 0, blockReason: '', _n: 0 };
        m.set(key, p);
      }
      return p;
    };
    for (const r of store.runs.values()) {
      const p = get(r.player);
      p.runs++;
      if (r.endedAt > p._n) { p._n = r.endedAt; p.name = r.name; }
      if (!p.firstSeen || r.startedAt < p.firstSeen) p.firstSeen = r.startedAt;
      if (r.endedAt > p.lastSeen) p.lastSeen = r.endedAt;
      if (!r.void) {
        p.valid++; p.time += r.t;
        if (r.result !== 'abandon' && r.score > p.best) { p.best = r.score; p.bestDiff = r.diff; }
      }
    }
    for (const n of store.notes.values()) {
      const p = get(n.player);
      p.notes++; if (!n.read) p.unread++;
      if (n.updatedAt > p._n) { p._n = n.updatedAt; p.name = n.name; }
      if (!p.firstSeen || n.startedAt < p.firstSeen) p.firstSeen = n.startedAt;
      if (n.updatedAt > p.lastSeen) p.lastSeen = n.updatedAt;
    }
    for (const [key, b] of store.blocked) { const p = get(key); p.blocked = true; p.blockedAt = b.at; p.blockReason = b.reason; if (!p.name) p.name = key.slice(2, 10); }
    for (const p of m.values()) delete p._n;
    return m;
  }

  /* ------------------------------ vue d'ensemble ------------------------------ */

  function summarize(list) {
    const players = new Set(); let time = 0, score = 0;
    for (const r of list) { players.add(r.player); time += r.t; score += r.score; }
    return { runs: list.length, players: players.size, time, avgScore: list.length ? score / list.length : 0 };
  }

  function overview(q) {
    const now = Date.now(), days = intp(q.days, 30, 0, 3650), tz = intp(q.tz, 0, -840, 840);
    const diff = DIFFS.includes(q.diff) ? q.diff : '';
    const since = days ? now - days * DAY : 0;
    const cur = [], prev = [], prevSince = days ? since - days * DAY : 0;
    let voided = 0, firstAt = now;
    for (const r of store.runs.values()) {
      if (diff && r.diff !== diff) continue;
      if (r.endedAt < firstAt) firstAt = r.endedAt;
      if (r.endedAt >= since) { if (r.void) voided++; else cur.push(r); }
      else if (days && r.endedAt >= prevSince && !r.void) prev.push(r);
    }
    const sum = summarize(cur);
    const players = new Set(), accounts = new Set();
    let wins = 0, deaths = 0, quits = 0, abandons = 0, cookies = 0, maxMul = 0;
    for (const r of cur) {
      players.add(r.player); if (r.verified) accounts.add(r.player);
      if (r.result === 'win') wins++; else if (r.result === 'death') deaths++; else if (r.result === 'quit') quits++; else abandons++;
      cookies += r.cookies; if (r.mul > maxMul) maxMul = r.mul;
    }
    const rk = ranking({ diff, dur: null, since, unique: true });
    const best = rk.list[0] || null;

    // série chronologique (par heure si la période est ≤ 2 jours, sinon par jour)
    const hourly = days > 0 && days <= 2, size = hourly ? 3600e3 : DAY;
    const bk = (ms) => Math.floor((ms - tz * 60000) / size);
    let startIdx = bk(days ? since : Math.max(firstAt, now - 180 * DAY));
    const endIdx = bk(now);
    if (endIdx - startIdx > 400) startIdx = endIdx - 400;
    const series = [];
    for (let i = startIdx; i <= endIdx; i++) series.push({ ts: i * size + tz * 60000, zen: 0, normal: 0, infernal: 0, runs: 0, players: 0, avgScore: 0, best: 0, time: 0, _p: new Set(), _s: 0 });
    for (const r of cur) {
      const b = series[bk(r.endedAt) - startIdx];
      if (!b) continue;
      b[r.diff]++; b.runs++; b._p.add(r.player); b._s += r.score; b.time += r.t;
      if (r.result !== 'abandon' && r.score > b.best) b.best = r.score;
    }
    for (const b of series) { b.players = b._p.size; b.avgScore = b.runs ? Math.round(b._s / b.runs) : 0; b.time = Math.round(b.time); delete b._p; delete b._s; }

    const hours = new Array(24).fill(0);
    for (const r of cur) hours[new Date(r.endedAt - tz * 60000).getUTCHours()]++;

    const causes = {};
    for (const r of cur) if (r.result === 'death') { const k = r.cause || 'inconnu'; causes[k] = (causes[k] || 0) + 1; }

    // Répartition des scores : tranches 0, 100, 300, 1 000, 3 000, 10 000… (les scores vont de quelques dizaines à des centaines de milliers)
    let maxScore = 0;
    for (const r of cur) if (r.result !== 'abandon' && r.score > maxScore) maxScore = r.score;
    const edges = [0];
    if (maxScore) for (let p = 100; edges[edges.length - 1] <= maxScore && edges.length < 40; p *= 10) { edges.push(p); if (p > maxScore) break; edges.push(3 * p); }
    const bins = new Array(Math.max(0, edges.length - 1)).fill(0);
    for (const r of cur) {
      if (r.result === 'abandon') continue;
      let i = bins.length - 1;
      while (i > 0 && edges[i] > r.score) i--;
      if (i >= 0) bins[i]++;
    }

    const byDiff = {};
    for (const d of DIFFS) {
      const list = cur.filter((r) => r.diff === d), s = summarize(list);
      byDiff[d] = { runs: s.runs, players: s.players, avgScore: Math.round(s.avgScore), avgT: s.runs ? Math.round(s.time / s.runs) : 0, best: list.reduce((m, r) => (r.result !== 'abandon' && r.score > m ? r.score : m), 0), wins: list.filter((r) => r.result === 'win').length };
    }

    const recent = cur.slice().sort((a, b) => b.endedAt - a.endedAt).slice(0, 8).map(runRow);
    const lv = play.liveList().filter((l) => !diff || l.diff === diff);
    let unread = 0, starred = 0, typing = 0;
    for (const n of store.notes.values()) {
      if (!n.read) unread++; if (n.star) starred++;
      if (!n.stoppedAt && now - (play.noteSeen.get(n.id) || 0) < 90e3) typing++;
    }
    return {
      ok: true, generatedAt: now, params: { days, diff, tz, bucket: hourly ? 'hour' : 'day' },
      kpi: {
        runs: sum.runs, players: players.size, accounts: accounts.size, guests: players.size - accounts.size,
        live: lv.length, bestScore: best ? { id: best.id, score: best.score, name: best.name, diff: best.diff, dur: best.dur, endedAt: best.endedAt, t: best.t } : null,
        time: Math.round(sum.time), avgT: sum.runs ? Math.round(sum.time / sum.runs) : 0, avgScore: Math.round(sum.avgScore),
        wins, deaths, quits, abandons, winRate: sum.runs ? wins / sum.runs : 0, cookies, maxMul: round(maxMul, 1)
      },
      prev: days ? summarize(prev) : null,
      series, hours, results: { win: wins, death: deaths, quit: quits, abandon: abandons },
      causes, histogram: { edges, bins }, byDiff,
      top: rk.list.slice(0, 5).map((r, i) => Object.assign({ rank: i + 1 }, runRow(r))),
      recent,
      live: lv.slice(0, 10).map(liveRow),
      notes: { total: store.notes.size, unread, starred, typing },
      rejected: { period: store.rejected.filter((x) => x.at >= since).length, stored: store.rejected.length },
      voided, totals: { runs: store.runs.size, players: playersMap().size, notes: store.notes.size }
    };
  }
  const liveRow = (l) => ({ id: l.id, player: l.player, name: l.name, verified: !!l.verified, diff: l.diff, dur: l.dur, t: round(l.t, 1), score: l.score, paused: !!l.paused, startedAt: l.startedAt, lastSeen: l.lastSeen });

  /* ------------------------------ messages ------------------------------ */
  function noteRow(n, full) {
    const now = Date.now();
    const o = {
      id: n.id, player: n.player, name: n.name, verified: !!n.verified, chars: n.chars, startedAt: n.startedAt, updatedAt: n.updatedAt,
      stoppedAt: n.stoppedAt || 0, edits: n.edits, read: !!n.read, star: !!n.star, ua: n.ua || '',
      typing: !n.stoppedAt && now - (play.noteSeen.get(n.id) || 0) < 90e3,
      blocked: store.blocked.has(n.player) || store.blocked.has('d:' + n.device),
      excerpt: n.text.slice(0, 180)
    };
    if (full) { o.text = n.text; o.ip = n.ip; o.device = n.device ? n.device.slice(0, 8) : ''; }
    return o;
  }

  /* ------------------------------ CSV ------------------------------ */
  function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;                       // évite les formules dans Excel/Sheets
    return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const iso = (ms) => (ms ? new Date(ms).toISOString() : '');
  function csv(res, name, head, rows) {
    const body = '﻿' + head.join(',') + '\n' + rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + name + '"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  }

  /* ------------------------------ routes ------------------------------ */
  async function handle(req, res, parts, url) {
    const q = Object.fromEntries(url.searchParams);
    const [a, b2] = parts;

    if (a === 'login' && req.method === 'POST') return login(req, res);
    const sess = session(req);
    if (!sess) return send(res, 401, { error: 'Connexion requise.', code: 'auth' });

    const post = req.method === 'POST';
    if (post && !ensureSameOrigin(req)) return send(res, 403, { error: 'Requête refusée (origine).' });
    if (!post && req.method !== 'GET') return send(res, 405, { error: 'Méthode non autorisée.' });
    const body = post ? await readBody(req, 8 * 1024) : {};
    const mutating = post && a !== 'logout';
    if (mutating && !store.ok && a !== 'password') return send(res, 503, { error: 'Stockage indisponible.' });

    if (a === 'logout' && post) {
      delete st.sessions[sha(sess.token)]; saveAuth();
      return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(req, '', 0) });
    }
    if (a === 'me' && !post) return send(res, 200, { ok: true });

    if (a === 'badges' && !post) {                                   // petits compteurs de la barre de navigation
      let unread = 0, typing = 0; const now = Date.now();
      for (const n of store.notes.values()) { if (!n.read) unread++; if (!n.stoppedAt && now - (play.noteSeen.get(n.id) || 0) < 90e3) typing++; }
      return send(res, 200, { ok: true, unread, typing, live: play.liveList().length, rejected: store.rejected.length });
    }

    if (a === 'overview' && !post) return send(res, 200, overview(q));

    if (a === 'live' && !post) { const l = play.liveList(); return send(res, 200, { ok: true, count: l.length, list: l.slice(0, 100).map(liveRow) }); }

    /* ----- parties ----- */
    if (a === 'runs' && !b2 && !post) {
      const rows = Array.from(store.runs.values()).filter(runFilter(q));
      sortRows(rows, q.sort, q.dir === 'asc' ? 'asc' : 'desc', (x, y) => y.endedAt - x.endedAt);
      const p = paginate(rows, q, 25);
      return send(res, 200, { ok: true, total: p.total, page: p.page, pages: p.pages, size: p.size, rows: p.slice.map(runRow) });
    }
    if (a === 'runs' && b2) {
      const r = store.runs.get(b2);
      if (!r) return send(res, 404, { error: 'Partie introuvable.' });
      if (!post) {
        const bd = rules.bounds(r.diff, r.dur, r.t), pl = playersMap().get(r.player);
        return send(res, 200, {
          ok: true, run: Object.assign(runRow(r), { samples: r.samples || [], sInt: r.sInt || 10, title: r.title, skin: r.skin, color: r.color, pings: r.pings || 0, ip: r.ip || '', won: !!r.won }),
          verify: { elapsed: round((r.endedAt - r.startedAt) / 1000, 1), bounds: bd, plausible: r.score <= bd.max && r.score >= bd.min },
          player: pl ? { key: pl.key, name: pl.name, type: pl.type, runs: pl.runs, best: pl.best, blocked: pl.blocked } : null
        });
      }
      if (body.action === 'void') { store.patchRun(r.id, { void: true }); return send(res, 200, { ok: true }); }
      if (body.action === 'restore') { store.patchRun(r.id, { void: false }); return send(res, 200, { ok: true }); }
      if (body.action === 'delete') { store.delRun(r.id); return send(res, 200, { ok: true }); }
      return send(res, 400, { error: 'Action inconnue.' });
    }

    /* ----- classement ----- */
    if (a === 'top' && !post) {
      const dur = q.dur !== undefined && q.dur !== '' && DURS.includes(Number(q.dur)) ? Number(q.dur) : null;
      const rk = ranking({ diff: DIFFS.includes(q.diff) ? q.diff : '', dur, unique: q.unique !== '0', since: q.days ? Date.now() - intp(q.days, 0, 0, 3650) * DAY : 0 });
      const limit = intp(q.limit, 25, 1, 100);
      return send(res, 200, { ok: true, total: rk.total, rows: rk.list.slice(0, limit).map((r, i) => Object.assign({ rank: i + 1 }, runRow(r))) });
    }

    /* ----- joueurs ----- */
    if (a === 'players' && !b2 && !post) {
      const needle = fold(String(q.q || '').slice(0, 60)).trim(), type = q.type === 'compte' || q.type === 'invité' ? q.type : '';
      let rows = Array.from(playersMap().values());
      if (needle) rows = rows.filter((p) => fold(p.name).includes(needle) || fold(p.key).includes(needle));
      if (type) rows = rows.filter((p) => p.type === type);
      if (q.blocked === '1') rows = rows.filter((p) => p.blocked);
      const keys = { lastSeen: 'lastSeen', runs: 'runs', best: 'best', time: 'time', notes: 'notes', name: 'name' }, sk = keys[q.sort] || 'lastSeen', k = q.dir === 'asc' ? 1 : -1;
      rows.sort((x, y) => { const u = sk === 'name' ? fold(x.name) : x[sk], v = sk === 'name' ? fold(y.name) : y[sk]; return u < v ? -k : u > v ? k : y.lastSeen - x.lastSeen; });
      const p = paginate(rows, q, 25);
      return send(res, 200, { ok: true, total: p.total, page: p.page, pages: p.pages, size: p.size, rows: p.slice });
    }
    if (a === 'players' && b2 && post) {
      const key = decodeURIComponent(b2).slice(0, 80);
      if (!/^[ud]:[\w.\-]{1,60}$/u.test(key)) return send(res, 400, { error: 'Joueur invalide.' });
      if (body.action === 'block') { store.setBlock(key, true, String(body.reason || '').slice(0, 120)); return send(res, 200, { ok: true }); }
      if (body.action === 'unblock') { store.setBlock(key, false); return send(res, 200, { ok: true }); }
      if (body.action === 'purge') {
        let nr = 0, nn = 0;
        for (const r of Array.from(store.runs.values())) if (r.player === key) { store.delRun(r.id); nr++; }
        for (const n of Array.from(store.notes.values())) if (n.player === key) { store.delNote(n.id); nn++; }
        return send(res, 200, { ok: true, runs: nr, notes: nn });
      }
      return send(res, 400, { error: 'Action inconnue.' });
    }

    /* ----- messages ----- */
    if (a === 'notes' && !b2 && !post) {
      const needle = fold(String(q.q || '').slice(0, 80)).trim(), now = Date.now();
      let rows = Array.from(store.notes.values());
      if (needle) rows = rows.filter((n) => fold(n.text).includes(needle) || fold(n.name).includes(needle) || fold(n.player).includes(needle));
      if (q.status === 'unread') rows = rows.filter((n) => !n.read);
      else if (q.status === 'starred') rows = rows.filter((n) => n.star);
      else if (q.status === 'typing') rows = rows.filter((n) => !n.stoppedAt && now - (play.noteSeen.get(n.id) || 0) < 90e3);
      if (q.player) rows = rows.filter((n) => n.player === String(q.player));
      const sk = q.sort === 'chars' ? 'chars' : q.sort === 'startedAt' ? 'startedAt' : 'updatedAt', k = q.dir === 'asc' ? 1 : -1;
      rows.sort((x, y) => (x[sk] < y[sk] ? -k : x[sk] > y[sk] ? k : y.updatedAt - x.updatedAt));
      const p = paginate(rows, q, 20);
      return send(res, 200, { ok: true, total: p.total, page: p.page, pages: p.pages, size: p.size, rows: p.slice.map((n) => noteRow(n, false)) });
    }
    if (a === 'notes' && !b2 && post && body.action === 'read-all') {
      let c = 0; for (const n of store.notes.values()) if (!n.read) { store.patchNote(n.id, { read: true }); c++; }
      return send(res, 200, { ok: true, count: c });
    }
    if (a === 'notes' && b2) {
      const n = store.notes.get(b2);
      if (!n) return send(res, 404, { error: 'Message introuvable.' });
      if (!post) return send(res, 200, { ok: true, note: noteRow(n, true) });
      const act = body.action;
      if (act === 'read' || act === 'unread') store.patchNote(n.id, { read: act === 'read' });
      else if (act === 'star' || act === 'unstar') store.patchNote(n.id, { star: act === 'star' });
      else if (act === 'delete') store.delNote(n.id);
      else return send(res, 400, { error: 'Action inconnue.' });
      return send(res, 200, { ok: true });
    }

    /* ----- tentatives refusées ----- */
    if (a === 'rejected' && !post) {
      const rows = store.rejected.slice().reverse();
      const p = paginate(rows, q, 25);
      return send(res, 200, { ok: true, total: p.total, page: p.page, pages: p.pages, size: p.size, rows: p.slice });
    }
    if (a === 'rejected' && post && body.action === 'clear') { store.clearRejected(); return send(res, 200, { ok: true }); }

    /* ----- système, exports, sauvegarde, mot de passe ----- */
    if (a === 'system' && !post) {
      const mem = process.memoryUsage();
      return send(res, 200, {
        ok: true, node: process.version, uptime: Math.round((Date.now() - bootAt) / 1000), startedAt: bootAt, passwordSource: envHash ? 'env' : 'file',
        https: isHttps(req), store: Object.assign(store.info(), { writable: store.probe() }), accounts: userCount(), memoryMB: Math.round(mem.rss / 1048576),
        sessions: Object.keys(st.sessions).length, live: play.liveList().length
      });
    }
    if (a === 'export' && !post && b2 === 'runs.csv') {
      const rows = Array.from(store.runs.values()).filter(runFilter(q));
      sortRows(rows, q.sort, q.dir === 'asc' ? 'asc' : 'desc', (x, y) => y.endedAt - x.endedAt);
      return csv(res, 'parties.csv', ['id', 'fin', 'debut', 'joueur', 'cle_joueur', 'verifie', 'difficulte', 'niveau_min', 'duree_s', 'score', 'resultat', 'cause', 'cookies', 'vitesse_max', 'invalidee', 'appareil'],
        rows.slice(0, 100000).map((r) => [r.id, iso(r.endedAt), iso(r.startedAt), r.name, r.player, r.verified ? 'oui' : 'non', r.diff, r.dur || 'infini', r.t, r.score, r.result, r.cause, r.cookies, r.mul, r.void ? 'oui' : 'non', r.ua]));
    }
    if (a === 'export' && !post && b2 === 'notes.csv') {
      const rows = Array.from(store.notes.values()).sort((x, y) => y.updatedAt - x.updatedAt);
      return csv(res, 'messages.csv', ['id', 'debut', 'derniere_modif', 'auteur', 'cle_joueur', 'verifie', 'caracteres', 'lu', 'favori', 'texte'],
        rows.map((n) => [n.id, iso(n.startedAt), iso(n.updatedAt), n.name, n.player, n.verified ? 'oui' : 'non', n.chars, n.read ? 'oui' : 'non', n.star ? 'oui' : 'non', n.text]));
    }
    if (a === 'backup' && !post) {
      store.flush();
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Content-Disposition': 'attachment; filename="scroll-infernal-donnees-' + new Date().toISOString().slice(0, 10) + '.jsonl"', 'Cache-Control': 'no-store' });
      return fs.createReadStream(store.file).on('error', () => res.end()).pipe(res);
    }
    if (a === 'password' && post) {
      if (envHash) return send(res, 409, { error: 'Le mot de passe est défini par la variable ADMIN_PASSWORD du serveur : change-la là-bas.' });
      if (!verify(body.current)) return send(res, 403, { error: 'Mot de passe actuel incorrect.' });
      const next = String(body.next || '');
      if (next.length < 10 || next.length > 100) return send(res, 400, { error: 'Le nouveau mot de passe doit faire au moins 10 caractères.' });
      resetPassword(next);
      const token = crypto.randomBytes(32).toString('hex');                  // on garde SEULEMENT cette session
      st.sessions[sha(token)] = { created: Date.now(), exp: Date.now() + SESSION_DAYS * DAY, ip: ipHash(clientIp(req)), ua: play.shortUA(req) };
      saveAuth();
      return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(req, token, SESSION_DAYS * 86400) });
    }

    return send(res, 404, { error: 'Route inconnue.' });
  }

  return { handle, init, resetPassword, genPassword };
}

module.exports = { createAdmin, genPassword };
