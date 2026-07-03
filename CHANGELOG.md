# Journal des versions

Toutes les évolutions notables de Kizuna sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet adhère au [versionnage sémantique](https://semver.org/lang/fr/)
(`MAJEURE.MINEURE.CORRECTIF`). Chaque version publiée correspond à un tag git
`vX.Y.Z` ; les messages de commit suivent la convention
[Conventional Commits](https://www.conventionalcommits.org/fr/) (`feat`, `fix`,
`chore`, `test`, `ci`, `refactor`), ce qui permet de générer les sections
ci-dessous.

## [Non publié]

### Ajouté

**Intelligence artificielle (OpenAI, optionnelle)**

- Module `ai/` côté API : passerelle OpenAI unique (`OPENAI_API_KEY`,
  `OPENAI_MODEL`, `gpt-5-mini` par défaut) ; sans clé, les fonctions IA sont
  masquées dans l'interface et l'API répond 503
- Import de référentiel RNCP assisté par IA : l'admin colle le texte de la
  fiche France Compétences, l'IA en extrait blocs et compétences (sorties
  structurées validées par zod), aperçu de relecture puis enregistrement
  transactionnel lié à la promotion — remplace l'écran « bientôt disponible »
- Assistant d'aide en bulle flottante (tous les espaces `/app`) : réponses en
  streaming fondées sur le manuel d'utilisation et adaptées au rôle, limite de
  30 messages/heure, passerelle « créer un ticket support » pré-rempli avec la
  conversation
- Brouillon de synthèse de bilan proposé par l'IA à partir des évaluations
  trois voix et du journal validé (relecture et édition avant enregistrement)

**Bilans**

- Visioconférence : lien Jitsi Meet généré en un clic (`visio_url` en base,
  salle non devinable), bouton « Rejoindre la visio » pour le trinôme, URL
  personnalisée acceptée (Teams/Zoom…), lien repris dans la notification et
  l'email envoyés à l'alternant
- Édition de la synthèse du bilan directement dans le panneau (tuteurs/admin),
  affichage en lecture pour l'alternant

**Portail public**

- Indicateur de défilement animé sous le héro de la page d'accueil (perle
  glissant le long d'un fil, libellé « Découvrir ») : signale le contenu sous
  la ligne de flottaison, s'estompe au premier défilement, défilement doux au
  clic ; immobile mais visible sous `prefers-reduced-motion` et via le
  commutateur d'accessibilité

## [0.3.0] — 2026-07-03

Documentation complète du projet et refonte du portail public.

### Ajouté

**Documentation (dossier jury RNCP)**

- Cahier de recettes : 39 scénarios typés (fonctionnel/structurel/sécurité/KO)
  ancrés dans les suites e2e, matrice rôles × modules, synthèse d'exécution
  ([docs/CAHIER_RECETTES.md](docs/CAHIER_RECETTES.md))
- Plan de correction des bogues : qualification, cycle de traitement, trois
  études de cas réelles ([docs/PLAN_CORRECTION_BOGUES.md](docs/PLAN_CORRECTION_BOGUES.md))
- Manuels de déploiement, d'utilisation (par rôle) et de mise à jour
  ([docs/](docs/))
- Justification du référentiel d'accessibilité RGAA 4.1 avec preuves dans le
  code et limites assumées ([docs/ACCESSIBILITE.md](docs/ACCESSIBILITE.md))
- Section « Documentation » dans le README

**Portail public**

- Page d'accueil enrichie : sections « Le trinôme » (trois voix reliées par le
  fil), carrousel des six modules (rail scroll-snap accessible au clavier),
  « Un semestre sur le fil » (parcours en quatre étapes) et bandeau final —
  révélées au défilement, neutralisées sous `prefers-reduced-motion`

### Modifié

- Page de connexion alignée sur le langage du portail : scène teintée, auras,
  filigrane 絆, fil à trois voix sur la carte
- Favicon et icônes PWA générées depuis le logo Kizuna (remplacent les icônes
  React du template), manifest nettoyé

## [0.2.0] — 2026-07-03

Qualité et maintien en condition opérationnelle : harnais de tests unitaires
avec couverture bloquante, supervision complète de la stack de production.

### Ajouté

**Tests unitaires (couverture bloquante en CI)**

- Harnais de 275 tests unitaires : 16 fichiers de specs API (services access,
  admin, alternants, competences, bilans, superadmin, support, journal,
  messagerie, notifications, documents, échéancier + rappels, mail, guards) et
  7 fichiers web (nav, levels, roles, utils, super, cœur fetch et contrats des
  endpoints de `api.ts`)
- Helper partagé de mock des chaînes Drizzle (`apps/api/src/testing/db-mock.ts`)
- Rapports de couverture V8 (`@vitest/coverage-v8`) avec seuils bloquants :
  API ≥ 65 % statements/branches, web ≥ 80 %

**Supervision (C4.1.2)**

- Healthchecks Docker sur les conteneurs `api` et `web` (sonde `fetch` toutes
  les 30 s, 3 échecs → unhealthy) ; `web` attend que `api` soit sain
- Uptime Kuma dans la stack de production (sondes continues + alertes email
  Brevo), interface accessible par tunnel SSH uniquement
- Logs structurés JSON en production via nestjs-pino (requêtes HTTP tracées
  avec statut, durée et identifiant ; secrets caviardés ; sondes /health
  exclues) — pretty print en développement
- Documentation du système de supervision (périmètre, sondes, seuils,
  signalement) dans docs/MAINTENANCE.md

### Modifié

- Mises à jour de dépendances : groupe minor/patch Dependabot + majeures en lot
  (dotenv 17, vitest 4, sonner 2, tailwind-merge 3, jsdom 29,
  @types/supertest 7, eslint-config-prettier 10) et actions GitHub (checkout 7,
  setup-node 6, pnpm/action-setup 6, buildx 4, build-push 7)
- @types/node 26 et TypeScript 6 écartés (règles `ignore` Dependabot
  documentées)

## [0.1.0] — 2026-07-03

Première version complète de la plateforme : socle technique, modules métier,
espaces par rôle, CI/CD et outillage de maintenance.

### Ajouté

**Socle technique**

- Monorepo pnpm + Turborepo, stack Docker (PostgreSQL 17, Adminer) (`3857094`)
- Schéma Drizzle initial, migrations versionnées et seed du référentiel (`69c7070`)
- API NestJS : configuration validée (Zod), base de données, endpoint `/health` (`bf643f9`)
- Authentification Better Auth : sessions, 2FA TOTP, organisations, RBAC (`b3386c2`)
- Front TanStack Start (SSR), design system Kizuna, écrans d'authentification (`c94280b`)

**Modules métier (API + web)**

- Tri-évaluation des compétences — alternant, tuteur pédagogique, tuteur
  entreprise (`c8abddb`, `212d059`)
- Journal d'activités avec validation par le tuteur (`668f83c`, `ef74c9e`)
- Liste des alternants côté tuteur (`c9c9923`, `c43d1d1`)
- Bilans tripartites : planification, statuts, génération PDF (`1865dcf`, `640a051`)
- Échéancier de promotion avec rappels automatiques (`172db22`, `a1f69c4`)
- Messagerie de trinôme (`7b67140`, `885a27f`)
- Dépôt, téléchargement et suppression de documents (`28b7316`, `2342d8f`)
- Tickets de support : création, fil de discussion, triage (`2bb7321`, `6496c7f`)
- Notifications événementielles + cloche de notifications (`2e3cd5e`, `5b82d96`)
- Espace admin d'établissement : dashboard, membres, entreprises, promotions
  (`355962a`, `8c7ebf5`)
- Espace super admin plateforme (`e94783e`, `46e5540`)
- Emails transactionnels, onboarding, finitions de production (`cd56033`, `9867035`)
- Mode démo : page dédiée, changement de rôle, coachmarks de guidage
  (`6eaefae`, `f97ef88`, `98aabea`)
- Base de démo réaliste : écoles, alternants, données métier (`05410d9`)

**CI/CD**

- Pipeline GitHub Actions : lint, typecheck, tests unitaires, e2e API,
  e2e navigateur Playwright (`4247d34`, `22c91cc`)
- Images Docker de production multi-stage + Docker Compose prod (`cd9bee9`)
- Déploiement continu SSH après CI verte, avec health check post-déploiement (`66f500f`)

### Modifié

- Refonte UI globale : système clair, sidebars teintées par rôle, logo
  (`a899736`, `6b93fc9`, `84c96ee`)
- Refonte des espaces super admin, admin établissement et support
  (`928fef5`, `518fc5e`, `1896039`, `4be24c1`, `91c6706`)
- Refonte des dashboards alternant et tuteur (`3c213e0`)
- Refonte de l'UI des compétences — le « fil » à trois voix (`8178e7d`)
- Refonte UX/UI finale : motion, signature « fil », radar à trois voix (`539874f`)

### Corrigé

- Transmission de la config SMTP et `WEB_PUBLIC_URL` au conteneur API en
  production (`7d62bca`)
- Pastilles de rôle du mode démo toujours cliquables (`299bcfe`)
- Navigation et affichage dans les espaces (`92f8420`)
- Lisibilité du sélecteur d'école (`eca7337`)
- Ordre de build de `@kizuna/shared` dans les images Docker prod (`22c91cc`)
- Typage du seed (`ddcef76`)

### Sécurité

- En-têtes de sécurité HTTP sur l'API via `helmet` (CSP, HSTS,
  `X-Content-Type-Options`, frameguard…)
- Mise à niveau de `multer` vers 2.2.0 (GHSA-72gw-mp4g-v24j,
  GHSA-3p4h-7m6x-2hcm) avec override pnpm pour la copie embarquée par
  `@nestjs/platform-express`
- Audit de sécurité `pnpm audit` bloquant en CI (niveau `high`, dépendances de
  production) — politique documentée dans [docs/MAINTENANCE.md](docs/MAINTENANCE.md)
- Mise à jour automatisée des dépendances via Dependabot (npm hebdomadaire,
  Actions GitHub mensuelle)

[Non publié]: https://github.com/Batiste1998/kizuna/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Batiste1998/kizuna/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Batiste1998/kizuna/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Batiste1998/kizuna/releases/tag/v0.1.0
