# Kizuna

Plateforme de **suivi d'alternance** : tri-évaluation des compétences (alternant / tuteur
pédagogique / tuteur entreprise), journal d'activités, bilans tripartites, échéancier, messagerie
de trinôme, documents, support. Construite comme projet de validation du **RNCP niveau 7 — Expert en
développement Full Stack** (notamment Bloc 2 « concevoir et modéliser » et Bloc 4 « développer le
back-end »).

## Stack

| Couche            | Techno                                                             |
| ----------------- | ------------------------------------------------------------------ |
| Monorepo          | pnpm workspaces + Turborepo                                        |
| Base de données   | PostgreSQL (Docker Compose)                                        |
| ORM / persistance | Drizzle ORM (migrations versionnées)                               |
| API               | NestJS (TypeScript) — REST sécurisée                               |
| Authentification  | Better Auth (emailPassword + 2FA TOTP, plugins organization/admin) |
| Frontend          | TanStack Start (React SSR) + TailwindCSS v4 + shadcn/ui (thémé)    |
| Tests             | Vitest / Jest + Supertest + Playwright                             |
| CI                | GitHub Actions                                                     |

## Organisation du dépôt

```
apps/
  api/        # NestJS — API métier, Better Auth, accès BDD
  web/        # TanStack Start — front SSR
packages/
  db/         # schéma Drizzle + migrations + seed
  shared/     # types & schémas Zod partagés (contrats API)
maquettes/    # maquettes d'origine (.dc.html) — référence visuelle, hors build
```

## Prérequis

- Node.js ≥ 22 (voir `.nvmrc`)
- pnpm 10 (`corepack enable`)
- Docker + Docker Compose

## Démarrage

```bash
# 1. Variables d'environnement
cp .env.example .env

# 2. Dépendances
pnpm install

# 3. Base de données (PostgreSQL + Adminer sur http://localhost:8081)
pnpm docker:up

# 4. Migrations + données de démo
pnpm db:migrate
pnpm db:seed

# 5. Lancer API + Web
pnpm dev
```

- API : http://localhost:3001
- Web : http://localhost:3000
- Adminer : http://localhost:8081

## Scripts utiles

| Commande           | Description                                   |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Lance toutes les apps en développement        |
| `pnpm build`       | Build de production                           |
| `pnpm lint`        | Lint (ESLint)                                 |
| `pnpm typecheck`   | Vérification des types                        |
| `pnpm test`        | Tests (unitaires + e2e)                       |
| `pnpm db:generate` | Génère une migration depuis le schéma Drizzle |
| `pnpm db:migrate`  | Applique les migrations                       |
| `pnpm db:seed`     | Insère les données de démo                    |
| `pnpm db:studio`   | Drizzle Studio                                |

## Roadmap (jalons commités)

1. **Fondations** — monorepo, schéma de données, auth + RBAC, squelette front, CI ← _en cours_
2. Compétences / référentiel + tri-évaluation
3. Journal d'activités → Bilans → Échéancier
4. Messagerie → Documents → Support / tickets → Notifications
5. Espaces Admin / Super Admin
6. Déploiement (Docker / CD — Bloc 5)
