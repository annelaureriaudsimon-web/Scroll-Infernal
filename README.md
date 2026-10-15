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

## Cookies et bonus (l'idée en plus)
- Des **cookies** flottent dans les espaces vides (certains demandent un petit détour risqué). C'est la monnaie de la boutique.
- Bonus rares : **Pare-feu** (annule un choc), **Wi-Fi lent** (le site ralentit), **Ad-block** (pubs, pop-ups et cookies deviennent inoffensifs).

## Boutique
Souris (flèche, néon, vraie souris, cookie, fantôme, fusée, chat, couronne), couleurs, traînées (comète, miettes, étincelles, arc-en-ciel) et améliorations (aimant à cookies, Pare-feu de départ, bonus durables, gros butin).
La zone de collision est la même pour toutes les souris : c'est purement esthétique.

## Commandes
- Souris (ou doigt sur mobile) : se déplacer
- `Échap` / `P` : pause · `M` : son · `R` : recommencer · `Entrée` / `Espace` : jouer

## Structure
```
index.html          page du jeu (menu, réglages, boutique, pause, fin)
css/                base.css · site-elements.css (faux sites) · ui.css · screens.css (menus, boutique)
js/config.js        RÉGLAGES de difficulté (vitesse max, largeur des trous…)
js/storage.js       sauvegarde (cookies, achats, réglages, records) dans le navigateur
js/cosmetics.js     catalogue de la boutique (dessins SVG des souris)
js/themes.js        les sites inventés et leurs textes
js/generator.js     génération du site rangée par rangée (toujours franchissable) + cookies/bonus
js/render.js        création des éléments HTML
js/game.js          boucle de jeu, collisions, cookies, bonus, victoire
js/screens.js       menu, réglages, boutique
js/trail.js, ui.js, audio.js, main.js
assets/             icône et curseur
```

## Personnaliser
- Plus facile / plus dur : `js/config.js` (`maxSpeed`, `gapWidth`, `hitRadius`…).
- Nouveau site : ajoute un objet dans `js/themes.js`. Nouvelle souris : `skins` dans `js/cosmetics.js`.
