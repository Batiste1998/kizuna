# Maintenance en condition opérationnelle

Ce document décrit les processus de maintenance de Kizuna : mise à jour des
dépendances, audit de sécurité, supervision et consignation des anomalies
(RNCP39583 — compétences C4.1.1, C4.1.2 et C4.2.1).

## Supervision et alertes (C4.1.2)

### Périmètre supervisé

| Composant       | Sonde         | Ce qu'elle vérifie                                        |
| --------------- | ------------- | --------------------------------------------------------- |
| API NestJS      | `GET /health` | Processus vivant **et** connexion PostgreSQL (`select 1`) |
| Web (Nitro SSR) | `GET /`       | Rendu de la page d'accueil                                |
| PostgreSQL      | `pg_isready`  | Acceptation des connexions                                |

### Trois niveaux de surveillance

1. **Healthchecks Docker** (auto-réparation) — chaque conteneur de
   [`docker-compose.prod.yml`](../docker-compose.prod.yml) porte un healthcheck
   (intervalle 30 s, timeout 5 s, 3 échecs → conteneur `unhealthy` ;
   `restart: unless-stopped` relance les processus morts). Le démarrage de
   `web` attend que `api` soit sain (`condition: service_healthy`).
2. **Validation post-déploiement** — [`scripts/deploy.sh`](../scripts/deploy.sh)
   sonde `/health` (30 tentatives, 2 s d'intervalle) et fait échouer le
   déploiement si l'API ne répond pas 200.
3. **Supervision continue avec alertes — Uptime Kuma** — conteneur
   `uptime-kuma` de la stack prod, données persistées dans le volume
   `kizuna-uptime-kuma`. L'interface n'est joignable qu'en local sur le
   serveur : `ssh -L 3002:127.0.0.1:3002 kizuna` puis http://localhost:3002.

### Sondes et seuils configurés dans Uptime Kuma

| Moniteur    | Cible (réseau Docker interne)                | Fréquence | Seuil d'alerte       |
| ----------- | -------------------------------------------- | --------- | -------------------- |
| API /health | `http://api:3001/health` (mot-clé `ok`)      | 60 s      | 2 échecs consécutifs |
| Web /       | `http://web:3000/`                           | 60 s      | 2 échecs consécutifs |
| Site public | URL publique (HTTPS + expiration certificat) | 60 s      | 2 échecs consécutifs |

### Modalité de signalement

Les alertes (panne détectée et rétablissement) sont envoyées par **email via le
SMTP Brevo** déjà utilisé par l'application (notification type « SMTP » dans
Uptime Kuma, mêmes identifiants que l'API). Chaque incident est ensuite
consigné comme anomalie (voir C4.2.1 ci-dessous) s'il révèle un défaut du
logiciel.

### Journalisation

L'API émet des **logs structurés JSON** en production (nestjs-pino) : chaque
requête HTTP est tracée avec méthode, URL, statut, durée et identifiant de
requête, ce qui permet le diagnostic a posteriori des incidents signalés par
les sondes (`docker compose -f docker-compose.prod.yml logs api`). En
développement, les logs restent lisibles (pretty print).

## Mise à jour des dépendances (C4.1.1)

### Périmètre

- **Dépendances npm** de tout le monorepo (`apps/api`, `apps/web`,
  `packages/db`, `packages/shared`), verrouillées par `pnpm-lock.yaml`.
- **Actions GitHub** utilisées par les workflows CI/CD.

### Fréquence et type de mise à jour

| Type               | Mécanisme                                | Fréquence               | Validation                                        |
| ------------------ | ---------------------------------------- | ----------------------- | ------------------------------------------------- |
| Patch / mineure    | Dependabot (PR groupée `minor-et-patch`) | Hebdomadaire (lundi 8h) | Automatique si CI verte, merge manuel             |
| Majeure            | Dependabot (PR individuelle)             | Hebdomadaire            | Revue manuelle : changelog upstream, tests locaux |
| Faille de sécurité | `pnpm audit` en CI + alertes Dependabot  | À chaque push/PR        | Correctif prioritaire (voir ci-dessous)           |
| Actions GitHub     | Dependabot                               | Mensuelle               | Revue manuelle                                    |

La configuration est dans [`.github/dependabot.yml`](../.github/dependabot.yml).

Chaque PR de mise à jour passe le pipeline CI complet (lint, typecheck, tests
unitaires, e2e API, e2e navigateur) avant d'être fusionnée : c'est la garantie
de non-régression demandée avant intégration.

### Audit de sécurité

Le job CI exécute `pnpm audit --prod --audit-level high` à chaque push et PR :
une vulnérabilité **high** ou **critical** dans les dépendances de production
casse le pipeline et bloque le déploiement.

Certaines advisories sont explicitement ignorées via `pnpm.auditConfig.ignoreGhsas`
dans le `package.json` racine. Justification :

| GHSA                | Paquet               | Raison de l'exclusion                                                                                             |
| ------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| GHSA-5xrq-8626-4rwp | vitest               | Tiré par la chaîne de dépendances de `better-auth`. Concerne le serveur UI de Vitest, jamais lancé en production. |
| GHSA-fx2h-pf6j-xcff | vite                 | Idem — serveur de dev Vite, spécifique Windows, non exécuté en production (build statique).                       |
| GHSA-4w7w-66w2-5vf9 | vite                 | Idem — path traversal du serveur de dev uniquement.                                                               |
| GHSA-v6wh-96g9-6wx3 | vite (launch-editor) | Idem — outil de dev, spécifique Windows.                                                                          |
| GHSA-67mh-4wv8-2f99 | esbuild              | Idem — serveur de dev esbuild uniquement.                                                                         |

Toute nouvelle exclusion doit être justifiée dans ce tableau. Les exclusions
sont réévaluées à chaque montée de version de `better-auth` (qui doit à terme
assainir sa chaîne de dépendances).

Exemple de correctif appliqué : `multer` (GHSA-72gw-mp4g-v24j, DoS) — mise à
niveau directe vers `^2.2.0` et override pnpm `multer@<2.2.0 → >=2.2.0` pour
forcer la copie embarquée par `@nestjs/platform-express`.

## Consignation des anomalies (C4.2.1)

### Processus de collecte

1. **Détection** : bogue constaté en production, en recette, ou signalé par un
   utilisateur (module Support intégré à la plateforme, tickets triés par
   l'équipe support).
2. **Consignation** : ouverture d'une issue GitHub avec le template
   [« Fiche d'anomalie »](../.github/ISSUE_TEMPLATE/bug_report.yml), qui impose
   les informations nécessaires à la reproduction : environnement, rôle
   concerné, gravité, étapes de reproduction, comportement attendu/observé,
   logs.
3. **Qualification** : label de gravité, priorisation (critique > majeure >
   mineure > cosmétique).
4. **Correction** : branche ou commit `fix(scope): …` (Conventional Commits),
   PR avec référence de l'issue (`Fixes #N`).
5. **Déploiement** : le merge sur `main` déclenche la CI puis le déploiement
   continu ([`deploy.yml`](../.github/workflows/deploy.yml)) ; le correctif est
   vérifié par le health check post-déploiement.
6. **Traçabilité** : le correctif apparaît dans le [CHANGELOG](../CHANGELOG.md)
   à la version suivante.

### Exemples de correctifs tracés dans l'historique

- `7d62bca` — fix(prod) : config SMTP et WEB_PUBLIC_URL non transmises au
  conteneur API (anomalie détectée en production, corrigée et déployée via CD).
- `299bcfe` — fix(demo) : pastilles de rôle inaccessibles (FAB).
- `db96389` — fix(docker) : ordre de build des paquets dans les images prod.
