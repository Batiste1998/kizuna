# Manuel de mise à jour

Ce manuel décrit la mise à jour de **Kizuna** : nouvelle version applicative,
dépendances, migrations de base de données et infrastructure (RNCP39583 —
C2.4.1).

**Lecteurs visés** : mainteneur de la plateforme.
**Documents liés** : [MANUEL_DEPLOIEMENT.md](MANUEL_DEPLOIEMENT.md)
(pipeline CD, rollback), [MAINTENANCE.md](MAINTENANCE.md) (dépendances, audit,
supervision), [CHANGELOG.md](../CHANGELOG.md).

## 1. Mise à jour applicative (nouvelle version)

### 1.1 Processus nominal

Le déploiement est **continu** : livrer une nouvelle version consiste à faire
atterrir le code sur `main`.

1. Développer sur une branche, en **Conventional Commits**
   (`feat`, `fix`, `chore`, `test`, `ci`, `refactor`).
2. Ouvrir une PR vers `main` : la CI (`ci.yml`) exécute audit de sécurité,
   build, lint, typecheck, tests unitaires (couverture bloquante), e2e API et
   e2e Playwright ; `docker.yml` valide la construction des images.
3. **Merger sur `main`** : la CI rejoue sur `main`, puis `deploy.yml`
   déclenche `scripts/deploy.sh` sur le serveur (rebuild + health check).
   Aucune action manuelle.

### 1.2 Publier une version (tag + CHANGELOG)

Le projet suit le **versionnage sémantique** (`MAJEURE.MINEURE.CORRECTIF`) et
le format **Keep a Changelog** :

1. Déplacer les entrées de la section `[Non publié]` du
   [CHANGELOG.md](../CHANGELOG.md) vers une nouvelle section
   `## [X.Y.Z] — AAAA-MM-JJ` (rubriques _Ajouté / Modifié / Corrigé /
   Sécurité_), et mettre à jour les liens de comparaison en bas de fichier.
2. Commiter puis poser le tag :

   ```bash
   git commit -am "chore(release): vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```

3. Le merge/push sur `main` déclenche le déploiement de la version ; le tag
   sert de point de retour arrière fiable (voir § 5.2).

## 2. Mise à jour des dépendances

Le processus complet (périmètre, fréquences, audit, exclusions justifiées) est
documenté dans **[docs/MAINTENANCE.md](MAINTENANCE.md)**. En résumé :

- **Dependabot** ouvre chaque lundi une PR groupée pour les mises à jour
  mineures/patch npm, des PR individuelles pour les majeures, et des PR
  mensuelles pour les actions GitHub (`.github/dependabot.yml`).
- Chaque PR passe le **pipeline CI complet** avant merge : c'est la garantie de
  non-régression exigée avant intégration.
- Les majeures font l'objet d'une **revue manuelle** (changelog upstream,
  tests locaux).
- `pnpm audit --prod --audit-level high` tourne **à chaque push/PR** : une
  vulnérabilité high/critical de production casse la CI et bloque le
  déploiement.
- Toute exclusion d'advisory (`pnpm.auditConfig.ignoreGhsas`) doit être
  justifiée dans le tableau de MAINTENANCE.md et réévaluée régulièrement.

## 3. Migrations de base de données (Drizzle)

### 3.1 Cycle d'une migration

Le schéma vit dans `packages/db/src/schema/` ; les migrations SQL versionnées
dans `packages/db/drizzle/` (`0000_….sql`, `0001_….sql`, …).

```bash
# 1. Modifier le schéma TypeScript (packages/db/src/schema/*.ts)

# 2. Générer la migration SQL correspondante
pnpm db:generate        # → nouveau fichier packages/db/drizzle/NNNN_*.sql

# 3. L'appliquer et la tester en local
pnpm db:migrate

# 4. Commiter le schéma ET la migration (fichier SQL + meta/) ensemble
```

En **production**, aucune commande à lancer : le conteneur API applique les
migrations en attente **à chaque démarrage**, avant de servir l'application
(`apps/api/Dockerfile` : `pnpm --filter @kizuna/db migrate && node
apps/api/dist/main.js`). La CI les applique aussi sur une base vierge, ce qui
valide chaque nouvelle migration avant merge.

### 3.2 Bonnes pratiques

- **Rétrocompatibilité** : pendant `docker compose up --build`, l'ancien code
  peut encore tourner quelques instants sur le nouveau schéma. Préférer des
  migrations additives (ajouter une colonne nullable, une table) ; pour un
  renommage ou une suppression, procéder en deux versions (1 : ajouter et
  double-écrire, 2 : supprimer l'ancien champ).
- **Jamais de modification d'une migration déjà mergée** : en créer une
  nouvelle qui corrige.
- **Sauvegarde avant toute migration majeure** (voir § 3.3).

### 3.3 Sauvegarde avant migration majeure

```bash
ssh kizuna
cd /srv/kizuna
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U kizuna -d kizuna --format=custom \
  > /srv/backups/kizuna-$(date +%Y%m%d-%H%M).dump
```

(Adapter `-U` / `-d` si `POSTGRES_USER` / `POSTGRES_DB` ont été personnalisés.)

### 3.4 Procédure de restauration

```bash
ssh kizuna
cd /srv/kizuna

# 1. Arrêter les consommateurs de la base
docker compose -f docker-compose.prod.yml stop api web

# 2. Restaurer le dump (--clean : recrée les objets existants)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U kizuna -d kizuna --clean --if-exists \
  < /srv/backups/kizuna-YYYYMMDD-HHMM.dump

# 3. Redémarrer sur le code correspondant à l'état restauré
git reset --hard <tag-ou-commit-compatible>
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. Mise à jour de l'infrastructure

### 4.1 Images Docker de base

| Image                    | Où                                                             | Politique                                                                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node:22-slim`           | `apps/api/Dockerfile`, `apps/web/Dockerfile` (build + runtime) | Suit la LTS Node du projet (`.nvmrc`). Monter de LTS = modifier le tag dans les deux Dockerfiles **et** `.nvmrc`/CI, puis valider par la CI (docker.yml + tests).                                                                            |
| `postgres:17-alpine`     | `docker-compose.yml`, `docker-compose.prod.yml`                | Les patchs (17.x) sont récupérés par `docker compose pull`. **Changement de version majeure = dump/restore obligatoire** (le format de données n'est pas compatible) : sauvegarde § 3.3 → changer le tag → volume neuf → restauration § 3.4. |
| `louislam/uptime-kuma:1` | `docker-compose.prod.yml`                                      | Suit la branche 1.x ; données persistées dans le volume `kizuna-uptime-kuma`.                                                                                                                                                                |
| `adminer:5`              | `docker-compose.yml` (dev uniquement)                          | Sans enjeu de production.                                                                                                                                                                                                                    |

### 4.2 Rafraîchir les images en production

```bash
ssh kizuna
cd /srv/kizuna
docker compose -f docker-compose.prod.yml pull        # postgres, uptime-kuma
docker compose -f docker-compose.prod.yml up -d --build   # reconstruit api + web
docker image prune -f
```

Les images `api` et `web` étant construites sur le serveur, un simple
redéploiement (§ 1.1) suffit à intégrer une mise à jour de `node:22-slim` après
un `docker pull node:22-slim` (ou `--pull` au build).

## 5. Vérifications après mise à jour et retour arrière

### 5.1 Vérifications

Identiques aux vérifications post-déploiement
([MANUEL_DEPLOIEMENT.md](MANUEL_DEPLOIEMENT.md), § 6) :

```bash
docker compose -f docker-compose.prod.yml ps                    # tout healthy
curl http://127.0.0.1:3001/health                               # 200 + "ok"
docker compose -f docker-compose.prod.yml logs --tail 100 api   # migrations OK, pas d'erreur
```

Compléter par : moniteurs Uptime Kuma verts, connexion applicative réelle
(login + un parcours métier), et — après une migration — contrôle ciblé des
données touchées.

### 5.2 Retour arrière

1. **Code** : repositionner le serveur sur le dernier tag sain et reconstruire
   (procédure détaillée dans [MANUEL_DEPLOIEMENT.md](MANUEL_DEPLOIEMENT.md), § 7) :

   ```bash
   ssh kizuna
   cd /srv/kizuna
   git fetch --tags origin && git reset --hard vX.Y.Z
   docker compose -f docker-compose.prod.yml up -d --build
   ```

2. **Base de données** : si la version annulée avait appliqué une migration
   incompatible avec l'ancien code, restaurer la sauvegarde prise avant la mise
   à jour (§ 3.4). Les migrations additives (cas nominal) ne nécessitent
   généralement aucune restauration.
3. **Geler le CD** le temps de l'analyse : désactiver le workflow **Deploy**
   dans l'onglet Actions de GitHub (sinon le prochain merge sur `main`
   redéploiera la version la plus récente), puis consigner l'anomalie selon le
   processus de [MAINTENANCE.md](MAINTENANCE.md) (fiche d'anomalie, correctif
   `fix(scope): …`, entrée CHANGELOG).
