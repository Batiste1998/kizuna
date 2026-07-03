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

[Non publié]: https://github.com/Batiste1998/kizuna/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Batiste1998/kizuna/releases/tag/v0.1.0
