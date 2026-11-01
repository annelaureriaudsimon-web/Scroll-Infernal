# SCROLL INFERNAL

Tu es la **souris**. Un faux site web (boutique, journal, streaming, compagnie aérienne, fast-food…) **descend** de plus en plus vite.
Reste dans les **espaces vides** : ne touche **aucun** bloc, bouton, carte, pub ou pop-up. Tous les sites sont **inventés** (aucune vraie marque).

## Lancer le jeu
**Avec le serveur local (recommandé : ta progression est gardée à chaque fois, et l'enregistreur marche)**
1. Installe **Node.js** (version « LTS ») depuis https://nodejs.org : une seule fois.
2. Dézippe, puis **double-clique sur `LANCER.bat`** (Windows). Une fenêtre noire s'ouvre, le jeu s'ouvre dans ton navigateur. Ne ferme pas la fenêtre pendant que tu joues.
   Sur Mac / Linux : `node server/server.js --open` dans le dossier.
3. Pour arrêter : ferme la fenêtre noire (ou `Ctrl+C`). Relance avec `LANCER.bat` : tout est retrouvé.

**Sans serveur** : tu peux aussi ouvrir `index.html` directement. Le jeu marche (comptes et sauvegarde dans ce navigateur), mais l'enregistreur est indisponible.

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
- Avec le **serveur local** (voir « Lancer le jeu »), les comptes et les sauvegardes sont gardés par le serveur (`db.json`, mots de passe hachés) : tu les retrouves à chaque relance, même si tu vides ton navigateur. Le jeu détecte tout seul le serveur.

## Le serveur local
Le serveur inclus (`server/server.js`, Node.js 18+, **aucune installation de module**) :
- **sert le jeu** sur http://localhost:8000 (seulement **sur ton ordinateur** : `HOST=0.0.0.0` l'ouvrirait au réseau) ;
- **garde les comptes et les sauvegardes** d'une fois sur l'autre ;
- **note ce que fait l'enregistreur** (voir plus bas) ;
- garde aussi chaque partie terminée (durée, score, difficulté…) dans son journal, sans page pour les afficher.

### Où sont gardées tes données
- Dans le dossier **`ScrollInfernal-donnees`** de ton dossier personnel (par exemple `C:\Users\toi\ScrollInfernal-donnees`). Il est **hors** du dossier du jeu : tu peux remplacer le jeu par une nouvelle version, tes données restent.
- Le nom exact du dossier est affiché dans la fenêtre du serveur à chaque lancement. Pour en choisir un autre : variable `DATA_DIR`. Si un ancien dossier `server/data` contient déjà des données, il est réutilisé.
- Contenu : `db.json` (comptes + sauvegardes), `events.jsonl` (journal durable : chaque événement est écrit sur le disque **avant** d'être pris en compte, donc un arrêt brutal ne perd rien), `enregistrements.txt` (le journal lisible de l'enregistreur), `secret.key`.
- **Sauvegarde** : copie ce dossier.
- Les **invités** n'ont pas de compte : leur progression reste dans le navigateur (garde toujours la même adresse, `localhost:8000`). Crée un compte pour qu'elle soit gardée par le serveur.

### L'enregistreur du pseudo (page de connexion)
- Deux onglets : **Se connecter** (compte existant, rien n'est enregistré) et **Commencer l'enregistrement et créer un compte**.
- Un clic sur **Commencer l'enregistrement et créer un compte** démarre l'enregistreur **et** affiche la création de compte (pseudo + mot de passe). Le bouton du formulaire devient **Terminer l'enregistrement et me connecter** : il valide le compte, envoie le pseudo final puis arrête l'enregistreur.
- L'enregistreur n'envoie **que le pseudo** (champ « login »), dès que la personne fait une courte pause, à la validation, et si elle ferme la page. Le mot de passe n'est jamais lu ni envoyé. Un message l'indique au joueur pendant l'enregistrement.
- Rien ne démarre tout seul. Revenir sur « Se connecter » ou quitter la page arrête l'enregistreur. Si la validation échoue (pseudo déjà pris…), l'enregistreur reste actif pour corriger.
- **Pour voir ce qu'il fait** :
  - **en direct**, dans la fenêtre du serveur : une ligne par événement (`▶ démarré`, `✎ pseudo modifié`, `■ terminé` avec le compte validé s'il y en a un) ;
  - **après coup**, dans `enregistrements.txt` (même contenu, avec la date et l'heure). Double-clique sur **`VOIR-ENREGISTREMENTS.bat`** pour l'ouvrir dans le Bloc-notes.

### Éviter les doublons et les faux scores
Le serveur **valide chaque partie** avant de la garder (`server/rules.js`, qui recharge `js/config.js` : la même courbe de vitesse que le jeu) : heure de départ donnée par le serveur (jeton signé), score dans la bande plausible, une même partie une seule fois, limites de débit. Un tricheur qui rejoue le protocole en attendant vraiment le temps de la partie ne peut pas être détecté : le jeu tourne chez le joueur.

### Sécurité et vie privée
- Il n'existe **aucune route de lecture** : le jeu ne peut qu'envoyer. Le dossier `server/` et les données ne sont jamais servis par le serveur web.
- Les adresses IP ne sont **jamais** gardées (seulement une empreinte de 10 caractères). Les mots de passe sont hachés (scrypt).
- Tu recueilles des pseudos et des scores (y compris les pseudos tapés pendant l'enregistrement) : préviens les gens si tu partages le jeu.

### Variables (toutes facultatives)
`PORT` (8000) · `HOST` (127.0.0.1 = cet ordinateur seulement) · `DATA_DIR` · `SERVER_SECRET` · `TRUST_PROXY` (`auto` | `1` | `0`).
Pour un hébergeur public : il faut Node.js, un disque persistant (`DATA_DIR`), `HOST=0.0.0.0` et HTTPS.

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
LANCER.bat          lance le serveur local et ouvre le jeu (Windows)
VOIR-ENREGISTREMENTS.bat   ouvre le journal de l'enregistreur dans le Bloc-notes
js/telemetry.js     envoie les parties au serveur (début, « toujours là », fin) · js/notes.js : enregistreur du pseudo de la page de connexion
server/server.js    serveur (sans dépendance) : jeu + comptes + API — `node server/server.js`
server/store.js     stockage durable (journal events.jsonl) · server/rules.js : validation / anti-faux scores
server/play.js      ce que le jeu envoie (parties, parties en cours, pseudos de l'enregistreur)
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
