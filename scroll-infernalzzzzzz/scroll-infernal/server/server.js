#!/usr/bin/env node
/* ==========================================================================
   server.js — petit serveur OPTIONNEL pour de vrais comptes en ligne.
   Sans dépendance : il suffit de Node.js 18+.

       node server/server.js            (puis ouvre http://localhost:8000)
       PORT=3000 node server/server.js  (autre port)

   Il sert le jeu ET garde les comptes / sauvegardes dans server/data/db.json.
   Le jeu détecte tout seul qu'il est servi par ce serveur et active les comptes
   en ligne : on retrouve sa progression depuis n'importe quel appareil.

   ⚠ Pour un vrai site public, mets-le derrière HTTPS (sinon les mots de passe
   circulent en clair). Les mots de passe sont hachés (scrypt) côté serveur.
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8000;
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 1024 * 1024;               // 1 Mo max par requête
const SESSION_DAYS = 60;
const NAME_RE = /^[\p{L}\p{N}_\-.]{3,14}$/u;

/* ------------------------------ base de données (un fichier JSON) ------------------------------ */
let db = { users: {}, sessions: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* première fois */ }
let writeTimer = null;
function persist() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);              // écriture « atomique » : pas de fichier à moitié écrit
  }, 300);
}
function flush() { clearTimeout(writeTimer); fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(db)); }
process.on('SIGINT', () => { flush(); process.exit(0); });
process.on('SIGTERM', () => { flush(); process.exit(0); });

/* ------------------------------ outils ------------------------------ */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function hashPass(pass, salt) { return crypto.scryptSync(pass, salt, 32).toString('hex'); }
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
// Limite les essais de mot de passe : 20 tentatives par minute et par adresse
const tries = new Map();
function tooMany(ip) {
  const now = Date.now(), t = (tries.get(ip) || []).filter((x) => now - x < 60000);
  t.push(now); tries.set(ip, t);
  return t.length > 20;
}
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

/* ------------------------------ API ------------------------------ */
async function handleApi(req, res, route) {
  const ip = req.socket.remoteAddress || '?';
  if (route === 'ping' && req.method === 'GET') return send(res, 200, { ok: true, cloud: true });

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
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/')) {
    handleApi(req, res, url.slice(5)).catch(() => send(res, 400, { error: 'Requête invalide.' }));
  } else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res);
  else { res.writeHead(405); res.end(); }
}).listen(PORT, () => {
  console.log('Scroll Infernal : http://localhost:' + PORT + '   (Ctrl+C pour arrêter)');
  console.log('Comptes et sauvegardes : ' + DB_FILE);
});
