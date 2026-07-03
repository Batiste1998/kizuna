# Manuel de déploiement

Ce manuel décrit le déploiement de **Kizuna** en production : architecture,
prérequis, variables d'environnement, déploiement automatique et manuel,
vérifications et retour arrière (RNCP39583 — C2.4.1).

**Lecteurs visés** : mainteneur de la plateforme, administrateur système.
**Documents liés** : [MANUEL_MISE_A_JOUR.md](MANUEL_MISE_A_JOUR.md) (mises à
jour et migrations), [MAINTENANCE.md](MAINTENANCE.md) (supervision, dépendances).

## 1. Architecture de déploiement

La production tourne sur un serveur unique (AWS) dans `/srv/kizuna`, orchestrée
par Docker Compose (`docker-compose.prod.yml`). Le déploiement est **continu** :
chaque merge sur `main` avec une CI verte déclenche un déploiement SSH.

```
                 GitHub (dépôt Batiste1998/kizuna)
                              │
              push / merge sur la branche main
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │  GitHub Actions                             │
        │                                             │
        │  ci.yml ─── lint · typecheck · audit ·      │
        │             tests unitaires · e2e API ·     │
        │             e2e Playwright                  │
        │                 │ (workflow_run : success)  │
        │                 ▼                           │
        │  deploy.yml ── ssh deploy@serveur           │
        │                'bash -s' < scripts/deploy.sh│
        └────────────────────┬────────────────────────┘
                             │ SSH (clé dédiée)
                             ▼
        ┌─────────────────────────────────────────────┐
        │  Serveur de production — /srv/kizuna        │
        │                                             │
        │  scripts/deploy.sh :                        │
        │    git reset --hard origin/main             │
        │    docker compose -f docker-compose.prod.yml│
        │                   up -d --build             │
        │    health check GET /health                 │
        │                                             │
        │  ┌───────────┐   ┌──────────┐  ┌─────────┐  │
        │  │ postgres  │◄──│   api    │◄─│   web   │  │
        │  │ 17-alpine │   │ NestJS   │  │ Nitro   │  │
        │  │ (volume   │   │ :3001    │  │ :3000   │  │
        │  │  pgdata)  │   │ (volume  │  │         │  │
        │  └───────────┘   │ uploads) │  └─────────┘  │
        │                  └──────────┘               │
        │  ┌─────────────────────────────┐            │
        │  │ uptime-kuma  127.0.0.1:3002 │ supervision│
        │  │ (volume kizuna-uptime-kuma) │ + alertes  │
        │  └─────────────────────────────┘            │
        └─────────────────────────────────────────────┘
```

Choix opérés :

| Choix                                                | Justification                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Docker Compose (plutôt que Kubernetes)               | Un seul serveur, stack de 4 services : compose suffit, reste lisible et reproductible.                   |
| Images multi-stage `node:22-slim`                    | Build isolé du runtime ; l'image web ne contient que la sortie Nitro (`.output`).                        |
| Migrations au démarrage du conteneur API             | Le schéma suit toujours le code déployé, sans étape manuelle (voir `apps/api/Dockerfile`).               |
| Déploiement par `git reset` + rebuild sur le serveur | Pas de registre d'images à opérer ; le serveur reconstruit depuis les sources du commit exact de `main`. |
| Uptime Kuma lié à `127.0.0.1`                        | La supervision n'est jamais exposée publiquement (accès par tunnel SSH uniquement).                      |

## 2. Prérequis serveur

| Prérequis                  | Détail                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Serveur Linux              | Testé sur AWS ; accès SSH (alias `kizuna` recommandé dans `~/.ssh/config`)          |
| Docker + plugin Compose    | `docker compose version` doit fonctionner                                           |
| Git                        | Le dépôt est cloné dans `/srv/kizuna`                                               |
| Utilisateur de déploiement | Membre du groupe `docker`, propriétaire de `/srv/kizuna`                            |
| Clé SSH de déploiement     | Paire dédiée ; la clé **publique** dans `~/.ssh/authorized_keys` du serveur         |
| Ports                      | 3000 (web) et 3001 (API) joignables selon l'exposition choisie ; 3002 réservé local |

### 2.1 Secrets GitHub Actions

Le workflow `.github/workflows/deploy.yml` a besoin de trois secrets de dépôt
(_Settings → Secrets and variables → Actions_) :

| Secret           | Contenu                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `DEPLOY_HOST`    | Adresse (IP ou DNS) du serveur de production                      |
| `DEPLOY_USER`    | Utilisateur SSH de déploiement                                    |
| `DEPLOY_SSH_KEY` | Clé **privée** SSH dédiée au déploiement (format OpenSSH complet) |

## 3. Variables d'environnement de production

Les variables sont lues par `docker-compose.prod.yml` depuis l'environnement du
shell ou depuis un fichier `.env` placé dans `/srv/kizuna` (recommandé :
`cp .env.example .env` puis adapter). Référence : [`.env.example`](../.env.example).

| Variable                  |            Obligatoire             | Défaut                                 | Rôle                                                                                                               |
| ------------------------- | :--------------------------------: | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`      |              **Oui**               | — (le compose refuse de démarrer sans) | Secret de signature des sessions Better Auth. 32+ caractères : `openssl rand -base64 32`                           |
| `API_PUBLIC_URL`          | **Oui** (dès qu'un domaine existe) | `http://localhost:3001`                | URL **publique** de l'API. Devient `BETTER_AUTH_URL` et est inlinée dans le bundle web (`VITE_API_URL`, build-arg) |
| `WEB_PUBLIC_URL`          | **Oui** (dès qu'un domaine existe) | `http://localhost:3000`                | URL **publique** du front. Sert aux origines CORS et aux liens des emails                                          |
| `POSTGRES_USER`           |                Non                 | `kizuna`                               | Utilisateur PostgreSQL                                                                                             |
| `POSTGRES_PASSWORD`       |       **Oui** en production        | `kizuna`                               | Mot de passe PostgreSQL (à changer impérativement)                                                                 |
| `POSTGRES_DB`             |                Non                 | `kizuna`                               | Nom de la base                                                                                                     |
| `API_PORT`                |                Non                 | `3001`                                 | Port hôte publié pour l'API                                                                                        |
| `WEB_PORT`                |                Non                 | `3000`                                 | Port hôte publié pour le web                                                                                       |
| `SMTP_HOST`               |                Non*                | vide                                   | Hôte SMTP (Brevo en production). _Sans lui, les emails sont **simulés dans les logs**_                             |
| `SMTP_PORT`               |                Non                 | `587`                                  | Port SMTP                                                                                                          |
| `SMTP_SECURE`             |                Non                 | `false`                                | TLS implicite (`true` pour le port 465)                                                                            |
| `SMTP_USER` / `SMTP_PASS` |                Non*                | vide                                   | Identifiants SMTP (_obligatoires si `SMTP_HOST` est défini_)                                                       |
| `MAIL_FROM`               |                Non                 | `Kizuna <no-reply@kizuna.dev>`         | Expéditeur des emails transactionnels                                                                              |

Variables fixées **dans** le compose (non surchargeables par `.env`) :
`NODE_ENV=production`, `DATABASE_URL` (construit vers le service `postgres`),
`UPLOAD_DIR=/data/uploads` (volume `kizuna-uploads`), `CORS_ORIGINS=$WEB_PUBLIC_URL`.
`MAX_UPLOAD_MB` n'est pas transmis en production : la valeur par défaut de l'API
s'applique (**10 Mo**, voir `apps/api/src/config/env.validation.ts`).

> **Important — `VITE_API_URL`** : l'URL de l'API est inlinée dans le bundle
> JavaScript du front **au moment du build** de l'image web (build-arg alimenté
> par `API_PUBLIC_URL`). Tout changement de domaine impose donc un rebuild de
> l'image web (`docker compose -f docker-compose.prod.yml up -d --build web`).

## 4. Déploiement automatique (CD)

Aucune action manuelle n'est nécessaire en régime normal. Le pipeline complet :

1. **Merge sur `main`** (PR validée).
2. **`ci.yml`** s'exécute : `pnpm audit --prod --audit-level high`, build,
   migrations, seed, lint, typecheck, tests unitaires (couverture bloquante),
   e2e API (Supertest), e2e navigateur (Playwright). En parallèle, `docker.yml`
   valide la construction des deux images Docker.
3. **`deploy.yml`** est déclenché par `workflow_run` **uniquement si la CI a
   réussi sur `main`** (`concurrency: deploy-prod` sérialise les déploiements).
4. Le runner se connecte en SSH et exécute le script versionné :
   `ssh deploy@serveur 'bash -s' < scripts/deploy.sh`.
5. **`scripts/deploy.sh`** sur le serveur :
   - `git fetch --depth 1 origin main && git reset --hard origin/main`
   - `docker compose -f docker-compose.prod.yml up -d --build`
     (le conteneur API applique les migrations Drizzle à son démarrage)
   - `docker image prune -f`
   - **health check** : jusqu'à 30 sondes de `http://127.0.0.1:3001/health`
     toutes les 2 s ; le job échoue (et apparaît rouge dans GitHub Actions) si
     l'API ne répond pas `200`.

## 5. Déploiement manuel

En cas de besoin (première mise en service, reprise après incident, CD
indisponible) :

```bash
# 1. Connexion au serveur
ssh kizuna

# 2. Se placer dans le dépôt
cd /srv/kizuna

# 3. Récupérer la version à déployer
git fetch origin main
git reset --hard origin/main

# 4. Vérifier les variables d'environnement (fichier .env du dossier)
grep -E 'BETTER_AUTH_SECRET|API_PUBLIC_URL|WEB_PUBLIC_URL|POSTGRES_PASSWORD' .env

# 5. Reconstruire et redémarrer la stack
docker compose -f docker-compose.prod.yml up -d --build

# 6. Nettoyer les images intermédiaires
docker image prune -f

# 7. Vérifier la santé de l'API
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/health   # attendu : 200
```

Le script versionné peut aussi être rejoué tel quel depuis le serveur :
`bash /srv/kizuna/scripts/deploy.sh`.

## 6. Vérifications post-déploiement

```bash
# États des conteneurs — tous doivent être "Up … (healthy)"
docker compose -f docker-compose.prod.yml ps

# Sonde de santé de l'API (vérifie aussi la connexion PostgreSQL : select 1)
curl http://127.0.0.1:3001/health

# Page d'accueil du front
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/

# Logs structurés JSON de l'API (nestjs-pino : méthode, URL, statut, durée, id)
docker compose -f docker-compose.prod.yml logs --tail 100 api

# Supervision continue (Uptime Kuma) — depuis le poste local :
ssh -L 3002:127.0.0.1:3002 kizuna    # puis http://localhost:3002
```

Points de contrôle :

- [ ] `postgres`, `api`, `web`, `uptime-kuma` en état `healthy` / `Up` ;
- [ ] `GET /health` répond `200` avec le mot-clé `ok` ;
- [ ] aucun log d'erreur au démarrage de l'API (migrations appliquées) ;
- [ ] les moniteurs Uptime Kuma sont verts (API /health, Web /, site public) ;
- [ ] connexion applicative possible (page `/login` du domaine public).

## 7. Rollback

Le déploiement étant « sources + rebuild », revenir en arrière consiste à
repositionner le dépôt du serveur sur un commit ou un tag antérieur, puis à
reconstruire :

```bash
ssh kizuna
cd /srv/kizuna

# Cible : un tag de version (recommandé)…
git fetch --tags origin
git reset --hard v0.1.0

# …ou un commit précis
# git reset --hard 7d62bca

docker compose -f docker-compose.prod.yml up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/health
```

> **Attention aux migrations** : les migrations Drizzle ne sont pas
> automatiquement inversées. Si la version fautive a introduit une migration
> incompatible avec l'ancien code, restaurer la base depuis la sauvegarde
> `pg_dump` prise avant la mise à jour (procédure au § 3.4 du
> [MANUEL_MISE_A_JOUR.md](MANUEL_MISE_A_JOUR.md)).

Le prochain merge sur `main` redéploiera automatiquement la dernière version :
pour figer le rollback, désactiver temporairement le workflow **Deploy** dans
l'onglet Actions de GitHub ou reverter le commit fautif sur `main`.

## 8. Premier déploiement d'un nouveau serveur (checklist)

1. [ ] **Serveur** : Linux à jour, Docker + plugin Compose installés,
       utilisateur de déploiement dans le groupe `docker`.
2. [ ] **Clé SSH** : générer une paire dédiée
       (`ssh-keygen -t ed25519 -f id_deploy -C kizuna-deploy`), publier la clé
       publique dans `~/.ssh/authorized_keys` du serveur.
3. [ ] **Dépôt** : `git clone https://github.com/Batiste1998/kizuna.git /srv/kizuna`.
4. [ ] **Variables** : créer `/srv/kizuna/.env` — au minimum
       `BETTER_AUTH_SECRET=$(openssl rand -base64 32)`,
       `POSTGRES_PASSWORD` fort, `API_PUBLIC_URL` et `WEB_PUBLIC_URL` sur le
       domaine public, la configuration SMTP (Brevo : penser à l'allowlist IP
       du serveur côté Brevo).
5. [ ] **Première mise en service** :
       `docker compose -f docker-compose.prod.yml up -d --build`
       (les migrations s'appliquent au boot de l'API).
6. [ ] **Données initiales** (facultatif — démo/recette) :
       `docker compose -f docker-compose.prod.yml exec api pnpm db:seed`
       puis `docker compose -f docker-compose.prod.yml exec api pnpm --filter @kizuna/api seed:users`.
7. [ ] **Vérifications** du § 6 (états healthy, `/health`, connexion).
8. [ ] **Supervision** : ouvrir Uptime Kuma par tunnel SSH, créer les trois
       moniteurs (`http://api:3001/health` mot-clé `ok`, `http://web:3000/`,
       URL publique HTTPS) et la notification email SMTP
       (voir [MAINTENANCE.md](MAINTENANCE.md)).
9. [ ] **CD** : renseigner les secrets GitHub `DEPLOY_HOST`, `DEPLOY_USER`,
       `DEPLOY_SSH_KEY`, puis valider par un merge de test sur `main`
       (le run « Deploy » doit être vert).
10. [ ] **Sauvegardes** : planifier un `pg_dump` régulier
        (voir [MANUEL_MISE_A_JOUR.md](MANUEL_MISE_A_JOUR.md), § 3.3).
