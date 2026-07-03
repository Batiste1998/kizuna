# Maintenance en condition opérationnelle

Ce document décrit les processus de maintenance de Kizuna : mise à jour des
dépendances, audit de sécurité et consignation des anomalies
(RNCP39583 — compétences C4.1.1 et C4.2.1).

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
