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

## Commandes
- Souris (ou doigt sur mobile) : se déplacer
- `Échap` / `P` : pause · `M` : son · `R` : recommencer · `Entrée` / `Espace` : jouer

## Structure
```
index.html          page du jeu (menu, réglages, boutique, classement, succès, pause, fin)
css/                base.css · site-elements.css (faux sites) · ui.css · screens.css · hacker.css (thème terminal)
js/config.js        RÉGLAGES de difficulté (vitesse max, largeur des trous…)
js/storage.js       sauvegarde (cookies, achats, réglages, records) dans le navigateur
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
