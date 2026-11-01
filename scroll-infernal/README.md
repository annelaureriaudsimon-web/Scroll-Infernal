# SCROLL INFERNAL

Tu es la **souris**. Un faux site web (boutique, journal, streaming, compagnie aérienne, fast-food…) **descend** de plus en plus vite.
Reste dans les **espaces vides** : ne touche **aucun** bloc, bouton, carte, pub ou pop-up. Tous les sites sont **inventés** (aucune vraie marque).

## Lancer le jeu
Dézippe, puis ouvre simplement `index.html` dans ton navigateur (Chrome, Firefox, Edge, Safari). Aucune installation.
Option : `python3 -m http.server` dans le dossier, puis http://localhost:8000.

## Le niveau (30 min)
- Un niveau dure **30 minutes** : la vitesse et la difficulté montent doucement jusqu'au bas de la page (la barre de chargement sous la barre d'adresse est ta progression).
- 10 **étapes** (une toutes les 3 min). À 100 % : **victoire**, puis tu peux continuer en **mode infini**.
- Réglages : durée 5 / 10 / 30 min / infini, difficulté **Zen / Normal / Infernal**.
- **Infernal** : le site atteint sa vitesse max en **1/6 du temps** (≈ 5 min sur un niveau de 30 min), puis **continue d'accélérer** jusqu'à ×23. Les trous restent toujours franchissables (testé par un robot), mais il faut des réflexes de dingue. Cookies ×2.

## Cookies et bonus (l'idée en plus)
- Des **cookies** flottent dans les espaces vides (certains demandent un petit détour risqué). C'est la monnaie de la boutique.
- Bonus rares : **Pare-feu** (annule un choc), **Wi-Fi lent** (le site ralentit), **Ad-block** (pubs, pop-ups et cookies deviennent inoffensifs).

## Boutique (6 onglets)
- **Souris** (18) : flèche, néon, souris, cookie, fantôme, fusée, chat, couronne, robot, crâne, bug, soucoupe, cœur, étoile, diamant, avion en papier, donut + *Hacker* (à débloquer).
- **Couleurs** (19, dont Arc-en-ciel et Glitch) · **Traînées** (11 : comète, flammes, neige, pixels, bulles, électrique, binaire…).
- **Interface** : change la couleur du terminal (Matrix, Ambre, Cyber, Sang, Vaporwave, Glace).
- **Titres** : affichés sur ton profil et au classement.
- **Bonus** (7) : aimant, Pare-feu de départ, bonus durables, gros butin, chance, démarrage blindé, récolte abondante.
Certains objets ne s'obtiennent qu'avec un **succès** (souris Hacker, traînée Binaire, titres Légende vivante / Dieu du scroll).
La zone de collision est la même pour toutes les souris : c'est purement esthétique.

## Succès (67)
Bronze / Argent / Or / **Légende** (quasi impossibles : 1 h en mode infini, terminer 30 min en Infernal, vitesse ×22, 500 000 points, rester immobile 20 s…) et un **Platine**. Chaque succès rapporte des cookies. Quelques-uns sont secrets.

## Classement
Page « ./classement » : ta **meilleure partie** (score, mode, temps, vitesse max, cookies, cause de la mort, **profil de vitesse**) et ton top 10 par difficulté. Choisis ton pseudo dans les réglages.

## Interface « hacking »
Terminal vert, pluie de code derrière les menus, démarrage façon ordinateur (une fois par session, clic pour passer), effet glitch. Le thème se change dans la boutique.

## Compte et sauvegarde (ta progression ne disparaît plus)
Au premier lancement, une **page de connexion** s'affiche : crée un compte (pseudo + mot de passe) ou joue en invité. Ensuite, quand tu reviens, tu es **reconnecté tout seul** et tu retrouves cookies, achats, succès et classement.
- Ton **ancienne progression** (avant les comptes) est reprise dans le premier compte que tu crées.
- **Réglages → Compte** : exporter / importer ta sauvegarde (fichier .json), se déconnecter.
- Si le jeu est simplement ouvert comme un fichier ou un site statique, les comptes sont **sur cet appareil / ce navigateur** : si tu vides les données du navigateur, ou que tu changes d'appareil, il faut importer ta sauvegarde.
- Pour des **comptes en ligne** (même progression sur tous tes appareils), lance le petit serveur inclus (Node.js 18+, aucune installation) :
  `node server/server.js` puis ouvre http://localhost:8000. Le jeu détecte tout seul le serveur. Les comptes sont dans `server/data/db.json` (mots de passe hachés). Le même serveur enregistre aussi les parties et alimente le panneau d'administration (voir plus bas). Pour un site public, mets-le derrière HTTPS.

## Serveur : parties enregistrées, texte des joueurs, panneau d'administration
Le serveur inclus (`node server/server.js`, Node.js 18+, **aucune installation**) fait maintenant tout ça :
- **comptes en ligne** (inchangé : `server/data/db.json`) ;
- **enregistre chaque partie terminée** : joueur, date, durée, score, difficulté, niveau, vitesse max, cookies, cause de la mort, courbe de vitesse… ;
- **enregistre ce que la personne écrit** sur la page de connexion, **uniquement** entre « Démarrer l'enregistrement » et « Arrêter » ;
- donne au panneau `admin.html` les statistiques et l'historique par une **API privée**.

### Page de connexion : la zone de texte et ses 2 boutons
- Zone de texte + boutons **Démarrer l'enregistrement** / **Arrêter** + statut (« Enregistrement arrêté. » / « Enregistrement actif : N caractères dans la zone de texte. »).
- Tant que l'enregistrement n'est pas démarré, **rien n'est envoyé**. Une fois démarré, le texte (et ses modifications) part au serveur dès que la personne fait une courte pause, à l'arrêt, et si elle ferme la page.
- Un avertissement est affiché au joueur : ce qu'il écrit est envoyé à l'administrateur ; ne jamais écrire de mot de passe.
- Si le jeu n'est pas servi par `server/server.js`, la zone est désactivée (il n'y a nulle part où enregistrer).
- Tu lis les messages dans l'onglet **Messages** du panneau (non lus, favoris, recherche, « en cours d'écriture » en direct, blocage de l'auteur, suppression, export CSV).

### Le panneau d'administration : `/admin.html`
1. Lance `node server/server.js`. **Au premier démarrage, le mot de passe admin s'affiche une seule fois dans le terminal** (note-le). Tu peux aussi le choisir toi-même : `ADMIN_PASSWORD="mon-mot-de-passe-long" node server/server.js`. Perdu ? `node server/server.js --reset-admin`.
2. Ouvre `http://localhost:8000/admin.html` (ou `https://ton-site/admin.html`), entre le mot de passe.
3. Depuis ton **téléphone**, ouvre la même adresse : la page s'adapte (tableaux en cartes, filtres repliables). Le jeu peut être joué sur n'importe quels autres appareils : tous envoient leurs parties au même serveur, et le tableau de bord lit **toujours le serveur en ligne** (ouvert comme un simple fichier, il l'explique et n'affiche rien).

| Onglet | Ce que tu y trouves |
|---|---|
| **Vue d'ensemble** | parties jouées, joueurs distincts, **parties en cours**, meilleur score, temps de jeu, taux de victoire… (avec l'évolution par rapport à la période précédente) ; graphiques : parties par jour/heure, joueurs actifs, scores, activité sur la journée, répartition des scores, fins de partie et causes ; période 24 h / 7 j / 30 j / 90 j / tout + filtre de difficulté ; chaque graphique a une vue « Tableau » |
| **Parties** | historique complet : recherche, filtres (difficulté, niveau, résultat, statut, compte/invité, dates), tri, pagination, export CSV ; clic sur une ligne = **détail** (contrôle du serveur, courbe de vitesse, invalider / restaurer / supprimer / bloquer le joueur) |
| **Classement** | meilleurs scores vérifiés (par difficulté, niveau, période ; un score par joueur ou tous) |
| **Joueurs** | liste, parties, meilleur score, temps de jeu, activité ; bloquer / débloquer ; purger (supprime toutes ses données) |
| **Messages** | le texte écrit sur la page de connexion (voir ci-dessus) |
| **Suspects** | les parties **refusées** par le contrôle anti-triche, avec la raison |
| **Système** | état du stockage, serveur, changement du mot de passe, **sauvegarde complète** et exports CSV |

Tous les chiffres sont calculés par le serveur **à partir des vraies données enregistrées** ; sans partie, le panneau l'indique au lieu d'inventer des valeurs. Boutons **Actualiser** et **Actualisation auto** (15 s, seulement quand la page est affichée).

### Sécurité du panneau
- Les joueurs ne peuvent **qu'envoyer** (leurs parties, leur texte). Aucune route de lecture ou de modification n'est accessible sans le mot de passe admin : toutes les routes `/api/admin/*` répondent **401** sans session.
- Mot de passe haché (scrypt), jamais stocké en clair ; essais limités ; cookie de session **HttpOnly + SameSite=Strict** (30 jours, `Secure` sous HTTPS) ; protection CSRF (en-tête + origine) ; `admin.html` est servi avec une politique CSP stricte, interdit dans les iframes et non indexé ; les textes des joueurs ne sont jamais interprétés comme du HTML.
- Le dossier `server/` et les fichiers de données ne sont jamais téléchargeables par le serveur web.
- Les adresses IP ne sont **jamais** gardées : seulement une empreinte (10 caractères) ; un invité n'est reconnu que par un identifiant aléatoire de son navigateur.

### Éviter les doublons et les faux scores
Le serveur **valide chaque partie** avant de l'enregistrer (`server/rules.js`, qui recharge `js/config.js` : la même courbe de vitesse que le jeu) :
- l'heure de départ est donnée **par le serveur** (jeton signé) : une partie ne peut pas durer plus longtemps que le temps réellement écoulé ;
- le score doit rester dans la bande plausible de la courbe de vitesse ; vitesse max, cookies, victoire (impossible avant la fin du niveau ou en mode infini), durée du niveau, difficulté : tout est recoupé ;
- une même partie ne s'enregistre qu'**une fois** (identifiant unique ; la suite « victoire → mode infini » met à jour la même ligne) ; un contenu identique du même joueur est refusé ; une partie supprimée ne peut pas revenir ;
- ce qui est refusé est listé dans **Suspects** ; limites de débit par adresse ; tailles et valeurs bornées.
- **Limite honnête** : un tricheur qui rejoue le protocole *en attendant vraiment le temps de la partie* ne peut pas être détecté automatiquement (le jeu tourne chez le joueur). C'est pour ça que tu peux **invalider, supprimer ou bloquer** n'importe quelle partie ou n'importe quel joueur. Les pseudos des **invités** ne sont pas vérifiés (ceux des comptes en ligne, si).
- Le classement affiché *dans le jeu* (page « classement ») reste celui des sauvegardes des joueurs ; **celui du panneau admin vient uniquement des parties vérifiées**.

### Où sont les données (et pourquoi ce choix)
- `DATA_DIR` (par défaut `server/data`) contient : `db.json` (comptes), **`events.jsonl`** (parties, messages, blocages : un journal « une ligne = un événement »), `admin.json` (mot de passe admin haché + sessions), `secret.key`.
- Chaque événement est **écrit sur le disque avant d'être pris en compte** : un redémarrage ne perd rien (testé : parties, messages, session admin et jetons de partie survivent). Le journal est compacté tout seul quand il grossit.
- Pourquoi pas SQLite/MySQL ? Le projet est un serveur Node sans dépendance : un fichier-journal marche partout où il y a **un disque qui persiste**, sans module natif à compiler, et `db.json` n'a pas été remplacé. Si un jour tu as des centaines de milliers de parties, il suffira de remplacer `server/store.js` (mêmes fonctions).
- **Sauvegarde** : onglet Système → « Sauvegarde complète » (ou copie `events.jsonl` + `db.json`).

### Mettre en ligne
- Il faut un hébergeur qui fait tourner **Node.js** (VPS, Render, Railway, Fly.io, Raspberry Pi…) avec **un disque/volume persistant** : fixe `DATA_DIR` dessus. Un hébergeur purement statique (GitHub Pages, Netlify…) ne peut pas faire tourner le serveur.
- Mets-le derrière **HTTPS** (c'est le cas sur la plupart des hébergeurs ; derrière un proxy, `TRUST_PROXY` est géré automatiquement).
- Définis `ADMIN_PASSWORD` (long) et `SERVER_SECRET` (une longue chaîne secrète) dans les variables d'environnement de l'hébergeur : ainsi les accès et les jetons survivent même si le disque est remplacé.
- Variables : `PORT` (8000), `DATA_DIR`, `ADMIN_PASSWORD`, `SERVER_SECRET`, `TRUST_PROXY` (`auto` | `1` | `0`).
- **Vie privée** : tu recueilles des pseudos, des scores et le texte que les gens écrivent. Dis-le dans une page de confidentialité si le jeu est public ; l'onglet Joueurs permet de tout supprimer pour une personne.

### API (résumé)
- Jeu (publiques, contrôlées, **écriture seule**) : `POST /api/run/start`, `/api/run/ping`, `/api/run/end`, `/api/note` ; comptes : routes existantes.
- Admin (cookie de session obligatoire) : `GET /api/admin/overview`, `live`, `runs`, `runs/:id`, `top`, `players`, `notes`, `notes/:id`, `rejected`, `system`, `badges`, `export/runs.csv`, `export/notes.csv`, `backup` ; `POST` (avec en-tête `X-Admin: 1`) : `login`, `logout`, `runs/:id`, `players/:key`, `notes`, `notes/:id`, `rejected`, `password`.

## Commandes
- Souris : se déplacer. **Va tout au bord de l'écran : tu ressors de l'autre côté** (la souris est capturée pendant la partie ; `Échap` la rend et met en pause ; désactivable dans Réglages).
- Téléphone / tablette : le jeu est **bloqué pour l'instant** (`allowMobile` dans `js/config.js` pour le réactiver).
- `Échap` / `P` : pause · `M` : son · `R` : recommencer · `Entrée` / `Espace` : jouer

## Structure
```
index.html          page du jeu (menu, réglages, boutique, classement, succès, pause, fin)
css/                base.css · site-elements.css (faux sites) · ui.css · screens.css · hacker.css (thème terminal)
js/config.js        RÉGLAGES de difficulté (vitesse max, largeur des trous…)
js/storage.js       sauvegarde (cookies, achats, réglages, records) par compte, dans le navigateur
js/auth.js          connexion, comptes, export/import, synchronisation avec le serveur
admin.html          panneau d'administration (privé, mot de passe)
css/admin.css       son style (thème sombre)
js/admin.js         le tableau de bord (lit l'API du serveur) · js/admin-charts.js : graphiques SVG
js/telemetry.js     envoie les parties au serveur (début, « toujours là », fin) · js/notes.js : zone de texte de la page de connexion
server/server.js    serveur (sans dépendance) : jeu + comptes + API — `node server/server.js`
server/store.js     stockage durable (journal events.jsonl) · server/rules.js : validation / anti-faux scores
server/play.js      ce que le jeu envoie (parties, parties en cours, messages) · server/admin.js : API privée du panneau
js/cosmetics.js     catalogue de la boutique (dessins SVG des souris)
js/themes.js        les sites inventés et leurs textes
js/generator.js     génération du site rangée par rangée (toujours franchissable) + cookies/bonus
js/render.js        création des éléments HTML
js/game.js          boucle de jeu, collisions, cookies, bonus, victoire
js/screens.js       menu, réglages, boutique, classement, succès
js/achievements.js  la liste des succès
js/hacker.js        pluie de code + démarrage terminal
js/trail.js, ui.js, audio.js, main.js
assets/             icône et curseur
```

## Personnaliser
- Plus facile / plus dur : `js/config.js` (`maxSpeed`, `gapWidth`, `hitRadius`…).
- Nouveau site : ajoute un objet dans `js/themes.js`. Nouvelle souris : `skins` dans `js/cosmetics.js`.
