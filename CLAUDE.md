# Mariage Tunisie — prestataires (mariage-tunisie)

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
