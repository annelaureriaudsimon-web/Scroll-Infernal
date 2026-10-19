/* ==========================================================================
   themes.js — les « sites web » aléatoires (palettes, noms, textes).
   Pour ajouter un site : copie un objet de THEMES et change les valeurs.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};

  G.THEMES = [
    {
      id: 'shop', name: 'MegaShop', domain: 'megashop.fr', style: 'soft',
      font: "'Trebuchet MS','Segoe UI',Arial,sans-serif",
      paths: ['promos-folles', 'panier', 'nouveautes', 'soldes-ete'],
      titles: ['Sneakers Turbo', 'Grille-pain 3000', 'Lampe Lune', 'Sac à dos Pro', 'Casque Zen', 'Montre Zéro', 'Vélo Éclair'],
      vars: { bg: '#fff1de', card: '#ffffff', fg: '#1b1b1f', muted: '#6b7280', accent: '#ff6a00', accent2: '#0a9d6a', line: '#1b1b1f', onaccent: '#ffffff', onaccent2: '#ffffff', radius: '8px', bw: '2px' }
    },
    {
      id: 'news', name: 'Le Petit Journal', domain: 'lepetitjournal.info', style: 'hard',
      font: "Georgia,'Times New Roman',serif",
      paths: ['actualites', 'edito', 'meteo', 'une-du-jour'],
      titles: ['Le chat devient maire', 'Grève du wifi', 'Météo : nuageux', 'Le prix du pain', 'Élections à la cantine', 'Un pigeon bat un record'],
      vars: { bg: '#efe6d0', card: '#fffdf6', fg: '#111111', muted: '#555555', accent: '#b3261e', accent2: '#1f3a5f', line: '#111111', onaccent: '#ffffff', onaccent2: '#ffffff', radius: '0px', bw: '2px' }
    },
    {
      id: 'saas', name: 'NeonCloud', domain: 'neoncloud.io', style: 'glow',
      font: "'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      paths: ['pricing', 'dashboard', 'docs/api', 'signup'],
      titles: ['Déploiement 1-clic', 'API illimitée', 'Dashboard live', 'Serveurs ultra', 'Analytics IA', 'Sécurité 24/7'],
      vars: { bg: '#0b1020', card: '#151c33', fg: '#e6ecff', muted: '#8aa0d0', accent: '#7c5cff', accent2: '#00d1ff', line: '#6a7cff', onaccent: '#ffffff', onaccent2: '#06101f', radius: '14px', bw: '2px' }
    },
    {
      id: 'brutal', name: 'Studio Pixel', domain: 'studiopixel.design', style: 'hard',
      font: "'Arial Black','Helvetica Neue',Arial,sans-serif",
      paths: ['work', 'about', 'contact', 'projets/2026'],
      titles: ['Projet Alpha', 'Identité Mango', 'Affiche Rock', 'Branding Lune', 'App Zèbre', 'Logo Cactus'],
      vars: { bg: '#ffe14d', card: '#ffffff', fg: '#000000', muted: '#333333', accent: '#ff3d9a', accent2: '#2b59ff', line: '#000000', onaccent: '#ffffff', onaccent2: '#ffffff', radius: '0px', bw: '3px' }
    },
    {
      id: 'green', name: 'GreenLife', domain: 'greenlife.blog', style: 'soft',
      font: "Verdana,Geneva,sans-serif",
      paths: ['bien-etre', 'recettes-vertes', 'jardin', 'newsletter'],
      titles: ['Smoothie vert', 'Yoga matinal', 'Potager urbain', '10 plantes faciles', 'Zéro déchet', 'Thé du soir'],
      vars: { bg: '#e9f6e8', card: '#ffffff', fg: '#1c3b2a', muted: '#5d7a68', accent: '#2e9e5b', accent2: '#f2a93b', line: '#1c3b2a', onaccent: '#ffffff', onaccent2: '#1c3b2a', radius: '18px', bw: '2px' }
    },
    {
      id: 'retro', name: 'Mon Site 95', domain: 'geoweb95.com/~moi', style: 'bevel',
      font: "'Courier New',Courier,monospace",
      paths: ['index.htm', 'livre-dor.htm', 'liens.htm', 'compteur.htm'],
      titles: ['Mon compteur', 'Livre d’or', 'Liens amis', 'Bienvenue !!', 'En construction', 'Mes MP3'],
      vars: { bg: '#008080', card: '#c0c0c0', fg: '#000000', muted: '#404040', accent: '#000080', accent2: '#800000', line: '#c0c0c0', onaccent: '#ffffff', onaccent2: '#ffffff', radius: '0px', bw: '3px' }
    },
    {
      id: 'crypto', name: 'CryptoMoon', domain: 'cryptomoon.xyz', style: 'glow',
      font: "'Segoe UI',Roboto,Arial,sans-serif",
      paths: ['mint', 'airdrop', 'staking', 'roadmap'],
      titles: ['To the moon', 'HODL 2.0', 'Mint maintenant', 'NFT Pigeon', 'Airdrop secret', 'Staking x10'],
      vars: { bg: '#101010', card: '#1c1c1c', fg: '#f5f5f5', muted: '#aaaaaa', accent: '#f7c600', accent2: '#00e676', line: '#f7c600', onaccent: '#111111', onaccent2: '#111111', radius: '4px', bw: '2px' }
    },
    {
      id: 'food', name: 'Miam Recettes', domain: 'miamrecettes.fr', style: 'soft',
      font: "'Trebuchet MS','Segoe UI',Arial,sans-serif",
      paths: ['tartes', 'plats-rapides', 'desserts', 'liste-courses'],
      titles: ['Tarte aux pommes', 'Pâtes carbonara', 'Crêpes party', 'Ratatouille', 'Cookies XXL', 'Soupe magique'],
      vars: { bg: '#ffe9e4', card: '#ffffff', fg: '#3a1a14', muted: '#8b5a50', accent: '#e5322d', accent2: '#ffb400', line: '#3a1a14', onaccent: '#ffffff', onaccent2: '#3a1a14', radius: '12px', bw: '2px' }
    },
    {
      id: 'burger', name: 'BurgerBoss', domain: 'burgerboss.fr', style: 'soft',
      font: "'Trebuchet MS','Segoe UI',Arial,sans-serif",
      paths: ['menus', 'promos-midi', 'drive', 'offre-du-jour'],
      titles: ['Double Fromage', 'Menu Géant', 'Frites XXL', 'Poulet Croustillant', 'Milkshake Vanille', 'Burger Végé'],
      vars: { bg: '#ffe9a8', card: '#ffffff', fg: '#2b1400', muted: '#7a5a2e', accent: '#d62828', accent2: '#f4a300', line: '#2b1400', onaccent: '#ffffff', onaccent2: '#2b1400', radius: '12px', bw: '2px' }
    },
    {
      id: 'sport', name: 'RunFast', domain: 'runfast.sport', style: 'hard',
      font: "'Arial Black',Impact,'Helvetica Neue',sans-serif",
      paths: ['running', 'nouveautes-homme', 'soldes', 'marathon-2026'],
      titles: ['Chaussures Turbo', 'Maillot Pro', 'Short Aéro', 'Sac Marathon', 'Montre Sprint', 'Gourde Éclair'],
      vars: { bg: '#141414', card: '#222222', fg: '#ffffff', muted: '#bdbdbd', accent: '#c6ff00', accent2: '#ff5722', line: '#c6ff00', onaccent: '#111111', onaccent2: '#ffffff', radius: '0px', bw: '3px' }
    },
    {
      id: 'stream', name: 'Binge.tv', domain: 'binge.tv', style: 'glow',
      font: "'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      paths: ['series', 'nouveautes', 'top-10', 'reprendre'],
      titles: ['Détective Pigeon', 'Les Cookies de la Nuit', 'Souris City', 'Planète Pixel', 'Le Dernier Scroll', 'Chef Baguette'],
      vars: { bg: '#0a0a0f', card: '#16161f', fg: '#f3f3f7', muted: '#9a9ab0', accent: '#ff2e63', accent2: '#08d9d6', line: '#ff2e63', onaccent: '#ffffff', onaccent2: '#06201f', radius: '10px', bw: '2px' }
    },
    {
      id: 'travel', name: 'CloudAir', domain: 'cloudair.com', style: 'soft',
      font: "'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      paths: ['vols', 'week-ends', 'promos-ete', 'reserver'],
      titles: ['Paris → Lisbonne', 'Week-end à Rome', 'Vol direct Tokyo', 'Plage des Îles', 'Hôtel Soleil', 'Location de voiture'],
      vars: { bg: '#dff0ff', card: '#ffffff', fg: '#0b2545', muted: '#5c7a99', accent: '#1565c0', accent2: '#ff9f1c', line: '#0b2545', onaccent: '#ffffff', onaccent2: '#0b2545', radius: '14px', bw: '2px' }
    }
  ];

  // Étiquettes des cartes : « prix + étoiles » pour les boutiques, « catégorie + temps de lecture » sinon
  var TAGS = {
    news: ['Politique', 'Société', 'Météo', 'Sport', 'Culture'],
    saas: ['Nouveau', 'Bêta', 'Pro', 'API'],
    brutal: ['Identité', 'Web', 'Print', 'Motion'],
    green: ['Recette', 'Astuce', 'Santé', 'DIY'],
    retro: ['NEW!', 'Cool', 'Hot', 'Lien'],
    food: ['Facile', 'Végé', 'Rapide', 'Gourmand'],
    stream: ['Série', 'Film', 'Docu', 'Nouveau']
  };
  G.THEMES.forEach(function (t) {
    t.tags = TAGS[t.id] || null;
    t.cardRow = TAGS[t.id] ? 'tag' : 'price';
  });

  G.WORDS = {
    snippets: [
      'Découvrez notre sélection de la semaine, choisie avec soin par toute l’équipe.',
      'Livraison offerte dès 49 € d’achat, retours gratuits pendant 30 jours.',
      'Rejoignez plus de 10 000 membres et ne manquez plus aucune nouveauté.',
      'Notre avis : un excellent rapport qualité-prix, à essayer sans hésiter.',
      'Lisez la suite pour tout savoir sur ce sujet qui fait beaucoup parler.',
      'Une expérience simple, rapide et pensée pour tous, partout et tout le temps.',
      'Profitez de cette offre exceptionnelle avant qu’il ne soit trop tard !'
    ],
    nav: ['Accueil', 'Produits', 'Blog', 'Contact', 'Panier', 'À propos', 'Tarifs', 'FAQ', 'Connexion', 'Aide', 'Actualités', 'Promos'],
    buttons: ['Acheter', 'S’inscrire', 'Cliquer ici', 'Télécharger', 'OK', 'Valider', 'Commander', 'Essai gratuit', 'Accepter', 'Suivant', 'En savoir +', 'Offre limitée', 'Voir plus', 'Se connecter', 'Ajouter au panier'],
    ctas: ['Découvrir', 'Commencer', 'Je veux !', 'Voir l’offre', 'Rejoindre'],
    inputs: ['Votre e-mail…', 'Mot de passe', 'Rechercher…', 'Code promo', 'Votre nom', 'Téléphone'],
    ads: ['GAGNEZ UN PC !!!', '-70% AUJOURD’HUI', 'Votre PC est lent ?', 'CLIQUEZ ICI !', '1 000 000e visiteur', 'Offre exclusive'],
    popups: ['Newsletter', 'Attendez !', 'Notification', 'Enquête'],
    cookies: ['Ce site utilise des cookies', 'On aime les cookies (les vrais)', 'Acceptez-vous les cookies ?'],
    cols: ['Société', 'Aide', 'Légal', 'Suivez-nous'],
    colLinks: ['À propos', 'Presse', 'Carrières', 'CGU', 'Confidentialité', 'Plan du site', 'Instagram', 'Newsletter'],
    overTitles: ['ACCÈS REFUSÉ', 'CONNEXION PERDUE', 'SEGFAULT', 'KERNEL PANIC', 'FIREWALL ACTIVÉ', 'ERREUR 404'],
    death: {
      button: 'Le bouton « {label} » était plus rapide que toi !',
      link: 'Tu t’es pris le lien « {label} » en pleine tête.',
      logo: 'Le logo est sacré : on ne le touche pas.',
      card: 'La carte « {label} » t’a écrasé.',
      text: 'Un pavé de texte… impossible à lire, impossible à éviter.',
      image: 'Une image en haute définition t’a percuté.',
      video: 'La vidéo s’est lancée automatiquement… sur toi.',
      input: 'Un champ obligatoire t’a bloqué.',
      ad: 'Une pub t’a eu. Comme tout le monde.',
      popup: 'Une pop-up est apparue. Évidemment.',
      cookie: 'Bloqué par un bandeau de cookies.',
      col: 'Le pied de page t’a rattrapé.',
      hero: 'Le grand titre était trop grand pour toi.',
      rail: 'Une barre latérale a eu raison de toi.'
    }
  };
})();
