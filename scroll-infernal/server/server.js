#!/usr/bin/env node
/* ==========================================================================
   server.js — serveur OPTIONNEL : comptes en ligne, parties enregistrées,
   messages des joueurs et panneau d'administration (admin.html).
   Sans dépendance : il suffit de Node.js 18+.

       node server/server.js            (puis ouvre http://localhost:8000)
       PORT=3000 node server/server.js  (autre port)

   Variables d'environnement utiles (toutes facultatives) :
       PORT            port d'écoute (8000 par défaut)
       DATA_DIR        dossier où sont gardées les données (server/data par défaut)
                       → sur un hébergeur, mets-le sur un disque/volume PERSISTANT
       ADMIN_PASSWORD  mot de passe du panneau admin (sinon : généré au 1er démarrage)
       TRUST_PROXY     auto (défaut) | 1 | 0 : faire confiance à X-Forwarded-For / -Proto
       SERVER_SECRET   clé qui signe les jetons de partie (sinon : générée dans DATA_DIR)

       node server/server.js --reset-admin    génère un nouveau mot de passe admin

   Le serveur sert le jeu ET garde :
     • db.json       comptes + sauvegardes des joueurs (inchangé)
     • events.jsonl  parties, messages, blocages (journal durable, voir store.js)
     • admin.json    empreinte du mot de passe admin + sessions admin

   ⚠ Pour un vrai site public, mets-le derrière HTTPS (sinon les mots de passe
   circulent en clair). Les mots de passe sont hachés (scrypt) côté serveur.
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createStore } = require('./store');
const { makeRules } = require('./rules');
const { createPlay } = require('./play');
const { createAdmin } = require('./admin');

const PORT = Number(process.env.PORT) || 8000;
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 1024 * 1024;               // 1 Mo max par requête (sauvegarde du joueur)
const SESSION_DAYS = 60;
const NAME_RE = /^[\p{L}\p{N}_\-.]{3,14}$/u;
const TRUST = String(process.env.TRUST_PROXY || 'auto').toLowerCase();

/* ------------------------------ base de données des comptes (un fichier JSON) ------------------------------ */
let db = { users: {}, sessions: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* première fois */ }
let writeTimer = null;
function writeDb() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);              // écriture « atomique » : pas de fichier à moitié écrit
  } catch (e) { console.error('[db] écriture impossible :', e.message); }
}
function persist() { clearTimeout(writeTimer); writeTimer = setTimeout(writeDb, 300); }
function flush() { clearTimeout(writeTimer); writeDb(); }

/* ------------------------------ données des parties + règles + admin ------------------------------ */
const store = createStore(DATA_DIR);
const rules = makeRules(ROOT);
function getSecret() {
  if (process.env.SERVER_SECRET) return process.env.SERVER_SECRET;
  const f = path.join(DATA_DIR, 'secret.key');
  try { const s = fs.readFileSync(f, 'utf8').trim(); if (s.length >= 32) return s; } catch (e) { /* à créer */ }
  const s = crypto.randomBytes(32).toString('hex');
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(f, s, { mode: 0o600 }); } catch (e) { /* secret valable jusqu'au redémarrage */ }
  return s;
}
const secret = getSecret();

/* ------------------------------ outils ------------------------------ */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function hashPass(pass, salt) { return crypto.scryptSync(pass, salt, 32).toString('hex'); }
function send(res, status, obj, headers) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, headers || {}));
  res.end(body);
}
function readBody(req, limit) {
  const max = limit || MAX_BODY;
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      try {
        const b = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
        resolve(b && typeof b === 'object' && !Array.isArray(b) ? b : {});
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Adresse du visiteur. Derrière un proxy d'hébergeur (Render, Railway, nginx…), toutes les requêtes arrivent
// de l'adresse du proxy : on lit alors X-Forwarded-For — mais seulement si la connexion vient d'une adresse
// locale/privée (sinon n'importe qui pourrait truquer l'en-tête).
function isPrivate(ip) { return /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd|::ffff:(127|10|192\.168|172\.(1[6-9]|2\d|3[01]))\.)/i.test(ip || ''); }
function trusted(req) { return TRUST === '1' || (TRUST !== '0' && isPrivate(req.socket && req.socket.remoteAddress)); }
function clientIp(req) {
  const raw = (req.socket && req.socket.remoteAddress) || '?';
  if (trusted(req)) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (xf.length) return xf[xf.length - 1];                // la dernière entrée = celle ajoutée par NOTRE proxy
  }
  return raw;
}
function isHttps(req) { return !!(req.socket && req.socket.encrypted) || (trusted(req) && String(req.headers['x-forwarded-proto'] || '').split(',').pop().trim() === 'https'); }
const ipHash = (ip) => sha(secret + '|' + ip).slice(0, 10);       // on ne garde JAMAIS l'adresse elle-même

// Limite les essais de mot de passe : 20 tentatives par minute et par adresse
const tries = new Map();
function tooMany(ip) {
  const now = Date.now(), t = (tries.get(ip) || []).filter((x) => now - x < 60000);
  t.push(now); tries.set(ip, t);
  return t.length > 20;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of tries) if (!v.some((x) => now - x < 60000)) tries.delete(k); }, 300000).unref();

function newSession(key) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[sha(token)] = { user: key, exp: Date.now() + SESSION_DAYS * 864e5 };
  return token;
}
function auth(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const s = db.sessions[sha(m[1])];
  if (!s || s.exp < Date.now() || !db.users[s.user]) return null;
  return { key: s.user, user: db.users[s.user], hash: sha(m[1]) };
}

const ctx = { store, rules, send, readBody, clientIp, ipHash, authUser: auth, secret, sha, isHttps, dataDir: DATA_DIR, userCount: () => Object.keys(db.users).length };
const play = createPlay(ctx);
ctx.play = play;
const admin = createAdmin(ctx);

/* ------------------------------ ligne de commande : nouveau mot de passe admin ------------------------------ */
if (process.argv.includes('--reset-admin')) {
  if (process.env.ADMIN_PASSWORD) { console.log('ADMIN_PASSWORD est défini : c’est lui qui sert de mot de passe. Change-le dans l’environnement.'); process.exit(0); }
  const pw = admin.resetPassword();
  console.log('\n  Nouveau mot de passe admin :  ' + pw + '\n  (les anciennes connexions admin sont fermées)\n');
  process.exit(0);
}

/* ------------------------------ classement mondial ------------------------------ */
// Chaque joueur (compte) apparaît UNE fois, avec sa meilleure partie. On ne montre que les 10 premiers.
// Le jeu tourne dans le navigateur : on écarte les parties « impossibles » (score trop grand pour le temps joué),
// mais un tricheur déterminé peut quand même fausser son score. C'est un classement entre amis, pas un tournoi.
const DIFFS = new Set(['zen', 'normal', 'infernal']);
const SAFE = /^[a-z0-9_-]{1,20}$/i;
function validRun(r) {
  return r && typeof r === 'object' && Number.isFinite(r.score) && Number.isFinite(r.t) && Number.isFinite(r.date) &&
    r.score >= 1 && r.score <= 1e7 && r.t >= 1 && r.t <= 172800 &&
    r.score <= r.t * 250 + 100 &&                       // vitesse max du jeu ≈ 234 points / seconde
    (r.mul === undefined || (Number.isFinite(r.mul) && r.mul <= 25)) && [0, 5, 10, 30].includes(Number(r.dur));
}
const boardCache = new Map();
function boardFor(diff, dur) {
  const key = diff + '|' + dur, hit = boardCache.get(key);
  if (hit && Date.now() - hit.ts < 5000) return hit.rows;
  const rows = [];
  for (const [ukey, u] of Object.entries(db.users)) {
    const runs = u.save && u.save.runs;
    if (!runs || typeof runs !== 'object') continue;
    let best = null;
    for (const d of DIFFS) {
      if (diff !== 'all' && diff !== d) continue;
      const list = Array.isArray(runs[d]) ? runs[d].slice(0, 10) : [];
      for (const r of list) {
        if (!validRun(r)) continue;
        if (dur !== 'all' && Number(r.dur) !== Number(dur)) continue;
        if (!best || r.score > best.score || (r.score === best.score && r.date < best.date)) best = Object.assign({ d }, r);
      }
    }
    if (best) rows.push({
      key: ukey, name: u.name, score: Math.floor(best.score), t: Math.round(best.t), diff: best.d, dur: Number(best.dur),
      endless: !!best.endless || !Number(best.dur), won: !!best.won, result: best.result === 'win' || best.result === 'quit' ? best.result : 'death',
      cause: SAFE.test(best.cause || '') ? best.cause : '', mul: Math.round(best.mul * 10) / 10 || 0, cookies: Math.max(0, Math.floor(best.cookies) || 0),
      date: best.date, skin: SAFE.test(best.skin || '') ? best.skin : 'arrow', color: SAFE.test(best.color || '') ? best.color : 'white',
      title: SAFE.test(best.title || '') ? best.title : 'rookie'
    });
  }
  rows.sort((a, b) => b.score - a.score || a.date - b.date);
  boardCache.set(key, { ts: Date.now(), rows });
  return rows;
}

/* ------------------------------ API ------------------------------ */
async function handleApi(req, res, route) {
  const ip = clientIp(req);
  if (route === 'ping' && req.method === 'GET') return send(res, 200, { ok: true, cloud: true, track: store.ok });

  if (route.startsWith('admin/')) {                               // panneau d'administration (privé)
    const parts = route.slice(6).split('/').filter(Boolean);
    return admin.handle(req, res, parts, new URL(req.url, 'http://x'));
  }
  const played = play.handle(req, res, route);                    // parties et messages envoyés par le jeu
  if (played) return played;

  if (route === 'leaderboard' && req.method === 'GET') {       // public : pas besoin d'être connecté pour regarder
    const q = new URL(req.url, 'http://x').searchParams;
    const diff = DIFFS.has(q.get('diff')) ? q.get('diff') : 'all';
    const dur = ['0', '5', '10', '30'].includes(q.get('dur')) ? q.get('dur') : 'all';
    const rows = boardFor(diff, dur), a = auth(req);
    let me = null;
    if (a) { const i = rows.findIndex((r) => r.key === a.key); if (i >= 0) me = { rank: i + 1, score: rows[i].score }; }
    const entries = rows.slice(0, 10).map((r, i) => { const e = Object.assign({ rank: i + 1 }, r); delete e.key; return e; });
    return send(res, 200, { ok: true, entries, total: rows.length, me });
  }

  if ((route === 'register' || route === 'login') && req.method === 'POST') {
    if (tooMany(ip)) return send(res, 429, { error: 'Trop d’essais. Réessaie dans une minute.' });
    const b = await readBody(req);
    const name = String(b.name || '').trim(), pass = String(b.pass || ''), key = name.toLowerCase();
    if (route === 'register') {
      if (!NAME_RE.test(name)) return send(res, 400, { error: 'Pseudo : 3 à 14 caractères (lettres, chiffres, _ - .)' });
      if (pass.length < 4 || pass.length > 100) return send(res, 400, { error: 'Mot de passe : 4 caractères minimum' });
      if (db.users[key]) return send(res, 409, { error: 'Ce pseudo est déjà pris.' });
      const salt = crypto.randomBytes(16).toString('hex');
      db.users[key] = { name, salt, hash: hashPass(pass, salt), created: Date.now(), save: null, rev: 0 };
      const token = newSession(key); persist();
      return send(res, 200, { ok: true, name, token });
    }
    const u = db.users[key];
    const ok = u && crypto.timingSafeEqual(Buffer.from(hashPass(pass, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
    if (!ok) return send(res, 401, { error: 'Pseudo ou mot de passe incorrect.' });
    const token = newSession(key); persist();
    return send(res, 200, { ok: true, name: u.name, token, save: u.save, rev: u.rev });
  }

  const a = auth(req);
  if (!a) return send(res, 401, { error: 'Session expirée.' });

  if (route === 'save' && req.method === 'GET') return send(res, 200, { ok: true, save: a.user.save, rev: a.user.rev });
  if (route === 'save' && req.method === 'PUT') {
    const b = await readBody(req);
    if (!b.save || typeof b.save !== 'object' || Array.isArray(b.save) || typeof b.save.cookies !== 'number') return send(res, 400, { error: 'Sauvegarde invalide.' });
    if (Number(b.baseRev) !== a.user.rev) return send(res, 409, { error: 'Conflit', save: a.user.save, rev: a.user.rev });
    a.user.save = b.save; a.user.rev++;
    persist();
    return send(res, 200, { ok: true, rev: a.user.rev });
  }
  if (route === 'logout' && req.method === 'POST') { delete db.sessions[a.hash]; persist(); return send(res, 200, { ok: true }); }
  return send(res, 404, { error: 'Inconnu' });
}

/* ------------------------------ fichiers du jeu ------------------------------ */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
// Le panneau admin n'a le droit de charger que SES fichiers, de se parler qu'à ce serveur, et de n'être affiché dans aucun cadre.
const ADMIN_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
function serveStatic(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = path.relative(ROOT, file);
  // Interdit : sortir du dossier, le dossier server/ (base de données !) et les fichiers cachés
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some((s) => s.startsWith('.')) || rel.split(path.sep)[0] === 'server') {
    res.writeHead(404); return res.end('Not found');
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const h = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' };
    if (rel === 'admin.html') Object.assign(h, { 'Content-Security-Policy': ADMIN_CSP, 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
    res.writeHead(200, h);
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/')) {
    handleApi(req, res, url.slice(5)).catch((e) => {
      if (e && e.storage) return send(res, 503, { error: 'Stockage indisponible sur le serveur.' });
      send(res, e && e.message === 'too big' ? 413 : 400, { error: 'Requête invalide.' });
    });
  } else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res);
  else { res.writeHead(405); res.end(); }
});

function shutdown() { try { flush(); store.close(); } catch (e) { /* ignore */ } process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  const init = admin.init();
  const line = '─'.repeat(64);
  console.log('Scroll Infernal : http://localhost:' + PORT + '   (Ctrl+C pour arrêter)');
  console.log('Panneau admin   : http://localhost:' + PORT + '/admin.html');
  console.log('Données         : ' + DATA_DIR + (store.ok ? '' : '   ⚠ ILLISIBLE / NON ÉCRITE : les parties ne seront pas enregistrées !'));
  if (init.generated) {
    console.log('\n' + line + '\n  MOT DE PASSE ADMIN (affiché une seule fois) :  ' + init.generated +
      '\n  Note-le. S\'il est perdu :  node server/server.js --reset-admin\n  (ou fixe toi-même la variable ADMIN_PASSWORD)\n' + line + '\n');
  } else if (init.source === 'env') {
    console.log('Mot de passe admin : variable ADMIN_PASSWORD' + (init.short ? '   ⚠ trop court (10 caractères minimum conseillés)' : ''));
  }
});
