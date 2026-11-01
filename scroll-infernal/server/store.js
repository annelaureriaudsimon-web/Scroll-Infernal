/* ==========================================================================
   store.js — stockage DURABLE des parties, des messages et des blocages.

   Principe : un journal « une ligne = un événement » (JSON Lines) dans
   DATA_DIR/events.jsonl. Chaque changement est ÉCRIT sur le disque AVANT d'être
   pris en compte. Au démarrage on rejoue le journal : rien n'est perdu quand le
   serveur redémarre. La mémoire n'est qu'un index pour répondre vite.

   Pourquoi pas SQLite / MySQL ? Le projet est un serveur Node.js sans dépendance
   (comme server.js et son db.json). Un journal fichier marche partout où il y a un
   disque qui persiste (VPS, Render/Railway/Fly avec « volume », Raspberry Pi…),
   sans module natif à compiler et avec Node 18+. Si un jour il y a des centaines
   de milliers de parties, il suffira de remplacer CE fichier (mêmes fonctions).

   Le journal est « compacté » (réécrit proprement, de façon atomique) quand il
   contient beaucoup plus de lignes que de données utiles.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');

const FILE = 'events.jsonl';
const MAX_REJECTED = 300;      // on garde les 300 dernières tentatives refusées
const MAX_TOMB = 50000;        // identifiants de parties supprimées (pour empêcher qu'elles reviennent)

function createStore(dir) {
  const file = path.join(dir, FILE);
  const runs = new Map();        // id -> partie
  const notes = new Map();       // id -> message
  const blocked = new Map();     // clé joueur -> { at, reason }
  const tomb = new Set();        // parties supprimées par l'admin
  let rejected = [];
  let lines = 0, fd = null, ok = false, lastError = '', compactedAt = 0, syncTimer = null;

  /* ------------------------------ rejouer un événement ------------------------------ */
  function apply(e) {
    switch (e.k) {
      case 'run': if (e.d && e.d.id) runs.set(e.d.id, e.d); break;
      case 'runp': { const r = runs.get(e.id); if (r) Object.assign(r, e.p); break; }
      case 'rund': runs.delete(e.id); tomb.add(e.id); if (tomb.size > MAX_TOMB) tomb.delete(tomb.values().next().value); break;
      case 'note': if (e.d && e.d.id) notes.set(e.d.id, e.d); break;
      case 'notep': { const n = notes.get(e.id); if (n) Object.assign(n, e.p); break; }
      case 'noted': notes.delete(e.id); break;
      case 'block': if (e.on) blocked.set(e.key, { at: e.at || 0, reason: e.reason || '' }); else blocked.delete(e.key); break;
      case 'rej': if (e.d) { rejected.push(e.d); if (rejected.length > MAX_REJECTED) rejected.shift(); } break;
      case 'rejclear': rejected = []; break;
      default: break;
    }
  }

  /* ------------------------------ lecture du journal (par morceaux) ------------------------------ */
  function replay() {
    let h;
    try { h = fs.openSync(file, 'r'); } catch (e) { return; }                 // pas encore de fichier : premier démarrage
    const buf = Buffer.alloc(4 * 1024 * 1024);
    const dec = new StringDecoder('utf8');       // évite de couper un caractère accentué entre deux morceaux
    let rest = '';
    try {
      for (;;) {
        const n = fs.readSync(h, buf, 0, buf.length, null);
        if (!n) break;
        const parts = (rest + dec.write(buf.subarray(0, n))).split('\n');
        rest = parts.pop();
        for (const ln of parts) {
          if (!ln) continue;
          lines++;
          try { apply(JSON.parse(ln)); } catch (e) { /* ligne abîmée (arrêt brutal) : on l'ignore */ }
        }
      }
      if (rest) { lines++; try { apply(JSON.parse(rest)); } catch (e) { /* dernière ligne coupée */ } }
    } finally { fs.closeSync(h); }
  }

  function entities() { return runs.size + notes.size + blocked.size + tomb.size + rejected.length; }

  function open() {
    fs.mkdirSync(dir, { recursive: true });
    fd = fs.openSync(file, 'a', 0o600);
    // si le dernier octet n'est pas un retour à la ligne (arrêt brutal), on en ajoute un
    const size = fs.fstatSync(fd).size;
    if (size > 0) {
      const r = fs.openSync(file, 'r'), b = Buffer.alloc(1);
      fs.readSync(r, b, 0, 1, size - 1); fs.closeSync(r);
      if (b[0] !== 10) fs.writeSync(fd, '\n');
    }
  }

  /* ------------------------------ écriture ------------------------------ */
  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = setTimeout(() => { syncTimer = null; try { fs.fsyncSync(fd); } catch (e) { /* ignore */ } }, 2000);
    if (syncTimer.unref) syncTimer.unref();
  }
  // Écrit d'abord sur le disque, PUIS met à jour la mémoire : la mémoire est toujours = au journal.
  function commit(e) {
    if (!ok) { const er = new Error('storage'); er.storage = true; throw er; }
    try { fs.writeSync(fd, JSON.stringify(e) + '\n'); lines++; lastError = ''; }
    catch (err) { lastError = err.code || String(err.message || err); const er = new Error('storage'); er.storage = true; throw er; }
    apply(e);
    scheduleSync();
    if (lines > 4000 && lines > 3 * entities() && lines - compactedAt > 2000) { try { compact(); } catch (err) { /* on réessaiera */ } }
  }

  // Réécrit le journal avec seulement l'état actuel (écriture atomique : fichier temporaire puis renommage)
  function compact() {
    const tmp = file + '.tmp';
    const out = [];
    for (const d of runs.values()) out.push(JSON.stringify({ k: 'run', d }));
    for (const d of notes.values()) out.push(JSON.stringify({ k: 'note', d }));
    for (const [key, v] of blocked) out.push(JSON.stringify({ k: 'block', key, on: true, at: v.at, reason: v.reason }));
    for (const id of tomb) out.push(JSON.stringify({ k: 'rund', id }));
    for (const d of rejected) out.push(JSON.stringify({ k: 'rej', d }));
    fs.writeFileSync(tmp, out.length ? out.join('\n') + '\n' : '', { mode: 0o600 });
    try { const th = fs.openSync(tmp, 'r'); try { fs.fsyncSync(th); } finally { fs.closeSync(th); } } catch (e) { /* ignore */ }
    fs.closeSync(fd); fd = null;
    fs.renameSync(tmp, file);
    open();
    lines = out.length; compactedAt = lines;
  }

  /* ------------------------------ démarrage ------------------------------ */
  try {
    fs.mkdirSync(dir, { recursive: true });
    replay();
    open();
    ok = true;
    if (lines > 4000 && lines > 3 * entities()) { try { compact(); } catch (e) { /* ignore */ } }
  } catch (e) { ok = false; lastError = e.code || String(e.message || e); }

  /* ------------------------------ API ------------------------------ */
  return {
    dir, file, runs, notes, blocked, tomb,
    get rejected() { return rejected; },
    get ok() { return ok; },

    putRun(r) { commit({ k: 'run', d: r }); return r; },
    patchRun(id, p) { if (!runs.has(id)) return null; commit({ k: 'runp', id, p }); return runs.get(id); },
    delRun(id) { commit({ k: 'rund', id }); },

    putNote(n) { commit({ k: 'note', d: n }); return n; },
    patchNote(id, p) { if (!notes.has(id)) return null; commit({ k: 'notep', id, p }); return notes.get(id); },
    delNote(id) { commit({ k: 'noted', id }); },

    setBlock(key, on, reason) { commit({ k: 'block', key, on: !!on, at: Date.now(), reason: reason || '' }); },
    addRejected(d) { commit({ k: 'rej', d }); },
    clearRejected() { commit({ k: 'rejclear' }); },

    compact() { if (ok) compact(); },
    info() {
      let bytes = 0;
      try { bytes = fs.statSync(file).size; } catch (e) { /* ignore */ }
      return { file, dir, ok, lastError, bytes, lines, runs: runs.size, notes: notes.size, blocked: blocked.size, rejected: rejected.length };
    },
    // Test d'écriture réel (pour l'écran « Système » de l'admin)
    probe() {
      try { const p = path.join(dir, '.probe'); fs.writeFileSync(p, String(Date.now())); fs.unlinkSync(p); return true; } catch (e) { return false; }
    },
    flush() { if (fd !== null) { try { fs.fsyncSync(fd); } catch (e) { /* ignore */ } } },
    close() { if (fd !== null) { try { fs.fsyncSync(fd); fs.closeSync(fd); } catch (e) { /* ignore */ } fd = null; ok = false; } }
  };
}

module.exports = { createStore };
