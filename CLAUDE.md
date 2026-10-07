# Mariage Tunisie — prestataires (mariage-tunisie)

> ⚠️ **À REPORTER DANS LE MOTEUR DU PC (`annuaires/moteur/`) AVANT TOUTE SYNCHRONISATION** (07/10/2026) : correction des grandes
> cartes de métier qui filtrent la liste (`a.metier[data-m]` → `choisir()` dans `assets/annuaire.js`) + son test dans
> `tools/test_site.mjs` (« une grande carte de métier filtre la liste »). Faite depuis le téléphone, elle a déjà été effacée une
> fois par `synchroniser.py` le 07/10 : copier `assets/annuaire.js` et `tools/test_site.mjs` de ce dépôt vers le moteur, puis supprimer ce bloc.


> **Ce site** : https://ah6259.github.io/mariage-tunisie/ — annuaire gratuit des prestataires de mariage (FR/AR), couleur framboise, icône bague.
> Métiers et étiquettes OpenStreetMap : salles des fêtes (`amenity=events_venue`, `amenity=wedding_venue`), photographes (`craft=photographer`, `shop=photo`),
> traiteurs (`craft=caterer`), pâtisseries (`shop=pastry`), coiffure et beauté (`shop=hairdresser`, `shop=beauty`). Robes de mariée (`shop=wedding`, `shop=bridal`) : 0 fiche dans OSM au 05/10/2026, métier non affiché.
> Premier relevé (05/10/2026) : 444 fiches publiées (salles 22, photographes 44, traiteurs 2, pâtisseries 146, coiffure-beauté 230). Photo du bandeau : Vivaystn, CC BY-SA 4.0 (Wikimedia). À venir plus tard : outils gratuits (budget, liste de préparation).

# Mémoire du projet — annuaire (moteur commun des annuaires d'Ahmed)

Fichier lu par Claude Code au début de chaque session. **Dépôt PUBLIC : rien de personnel ni de secret, jamais le nom d'un concurrent.**
Répondre à Ahmed **en français**, simplement. Règles communes : `../../regles communes a tous les sites.md`.

## Principe
- Un **moteur commun** (`annuaires/moteur/`, sur le PC d'Ahmed) copié dans chaque annuaire par `python annuaires/synchroniser.py`.
  **Ne jamais modifier le moteur directement dans un site** : modifier `annuaires/moteur/`, synchroniser, puis tester chaque site.
- Propre à chaque site : `config.json` (nom, couleurs, métiers et étiquettes OpenStreetMap, liens vers nos autres sites),
  `donnees/` (osm.json = robot ; inscrits.json = fiches vérifiées ; retraits.json = fiches retirées, jamais republiées),
  `assets/logo.svg`, `assets/icons/` (famille d'icônes commune : `annuaires/icones_annuaires.py`).
- Pages fabriquées par `node tools/construire.mjs` (ne pas les modifier à la main) : accueil (recherche + filtres),
  24 gouvernorats, une page par fiche (JSON-LD), Professionnels (ajout / correction / retrait par Formspree), À propos.

## Données et loi
- Sources permises : **OpenStreetMap** (licence ODbL, crédit sur chaque page), demandes des professionnels. **Jamais** de copie
  d'un annuaire concurrent, du RNE ou de Google Maps.
- `inscriptions_ouvertes: false` tant que la **déclaration INPDP** n'est pas faite (loi organique 2004-63). Les demandes
  d'ajout / correction / retrait restent possibles. Un retrait est définitif (`donnees/retraits.json`).
- Fiche gratuite pour tous ; fiche **Pro** payante plus tard (champ `pro: true`, mise en avant), découverte au moment du besoin.
- Statistiques anonymes GoatCounter (compteur prix-eaux-tunisie) : `clic-tel|whatsapp|itineraire/<fiche>` = argument de vente Pro.

## Robots (sans PC)
- `maj.yml` chaque nuit (02h40 UTC) : relevé OSM (`tools/releve_osm.py` : plusieurs serveurs, nouvelles tentatives, refus si
  chute de plus de 50 % des fiches), pages, tests, publication. `tests.yml` à chaque modification. Échec → e-mail GitHub.

## Tests
`node tools/construire.mjs` puis `node tools/test_site.mjs` → **TOUT PASSE** (jsdom : `npm install --no-save --no-package-lock jsdom`).

## Règles du moteur (mise à jour du 06/10/2026, détail dans annuaires/moteur/CLAUDE.md)
- **Aucune fiche vide** : une fiche sans téléphone, WhatsApp, site ni page publique n'est pas publiée (règle d'Ahmed, pour le sérieux).
- Au moins 3 fiches par métier et par gouvernorat ; sources affichées telles quelles (osm, web = page de l'établissement, officiel = liste d'une administration).
- Vraie photo par métier (config.metiers[].photo) ; espace professionnels gratuit + Pro (1er mois offert), fermé jusqu'à l'INPDP.

- **Vidéos de présentation** (06/10/2026) : `assets/video/presentation.mp4` (visiteurs) et `presentation-pro.mp4` (professionnels), 1080 × 1920, + couvertures et aperçus 1200 × 630 (`apercu-video*.jpg`). Musique de fond : J. S. Bach, Aria des Variations Goldberg (enregistrement Musopen, CC0, Wikimedia Commons ; preuve dans le dossier privé `videos (outil)/preuves musique/`). Pages **`video/`** et **`video-pro/`** fabriquées par `tools/page_video.mjs` (appelé par construire.mjs, à partir de À propos : mêmes en-tête, pied, CSP) avec og:video / og:image. Le bouton « Partager » envoie un LIEN : la page vidéo (video-pro/ sur inscription/) + l'adresse du site dans le texte, jamais le fichier. Tests dans test_site.mjs.
  Pour refaire les vidéos : `python fabriquer.py <id-du-site>` dans le dossier PRIVÉ du PC `videos (outil)/`.
