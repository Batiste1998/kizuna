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
  shared/     # contrats d'API partagés (enums & types front/back)
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

# 4. Migrations + données de référence
pnpm db:migrate
pnpm db:seed

# 5. Comptes de démo (1 par rôle) — nécessite l'API construite (pnpm --filter @kizuna/api build)
pnpm --filter @kizuna/api seed:users

# 6. Lancer API + Web
pnpm dev
```

- API : http://localhost:3001
- Web : http://localhost:3000
- Adminer : http://localhost:8081

### Comptes de démo

Tous avec le mot de passe `Password123!` :

| Email                   | Rôle                |
| ----------------------- | ------------------- |
| `superadmin@kizuna.dev` | Super Admin         |
| `support@kizuna.dev`    | Support             |
| `admin@kizuna.dev`      | Administrateur      |
| `peda@kizuna.dev`       | Tuteur pédagogique  |
| `entreprise@kizuna.dev` | Tuteur d'entreprise |
| `alternant@kizuna.dev`  | Alternant           |

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

## Déploiement (production)

Images Docker multi-stage (`apps/api/Dockerfile`, `apps/web/Dockerfile`) + stack
`docker-compose.prod.yml` (PostgreSQL + API + Web). L'API **applique les migrations au
démarrage** puis sert l'application ; les documents uploadés sont persistés dans un volume.

```bash
# Secret obligatoire (32+ caractères)
export BETTER_AUTH_SECRET=$(openssl rand -base64 32)
# URLs publiques (à adapter au domaine)
export API_PUBLIC_URL=http://localhost:3001
export WEB_PUBLIC_URL=http://localhost:3000

docker compose -f docker-compose.prod.yml up -d --build
# (optionnel) données de démo :
docker compose -f docker-compose.prod.yml exec api pnpm db:seed
docker compose -f docker-compose.prod.yml exec api pnpm --filter @kizuna/api seed:users
```

> `VITE_API_URL` est inliné dans le bundle web au build (build-arg) ; il doit pointer vers
> l'URL **publique** de l'API. La CI `.github/workflows/docker.yml` valide la construction des
> deux images à chaque push.

## Modules

Auth/RBAC (Better Auth, 2FA, organisations) · Compétences (tri-évaluation) · Journal · Bilans ·
Échéancier · Messagerie de trinôme · Documents · Support/Tickets · Notifications événementielles ·
Espaces Alternant / Tuteur / Admin établissement / Super Admin.
