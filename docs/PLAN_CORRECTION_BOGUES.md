# Plan de correction des bogues

Plateforme **Kizuna** — suivi tripartite d'alternance.

Document rédigé au titre de la compétence **C2.3.2** du référentiel RNCP39583 :
élaborer un plan de correction des bogues à partir des tests réalisés, qualifier et
traiter les anomalies détectées, analyser les points d'amélioration pour chaque test en
échec et vérifier la conformité des corrections.

| Champ                | Valeur                          |
| -------------------- | ------------------------------- |
| Version du document  | 1.0                             |
| Date                 | 2026-07-03                      |
| Référence logicielle | branche `main`, version `0.2.0` |

Ce plan s'articule avec le [cahier de recettes](CAHIER_RECETTES.md) (détection en
recette) et avec [MAINTENANCE.md](MAINTENANCE.md) § « Consignation des anomalies »
(processus de collecte en exploitation), qu'il complète sans les dupliquer.

---

## 1. Qualification des anomalies

### 1.1 Grille de gravité

La gravité est renseignée à la consignation, via le champ obligatoire du template
d'issue [« Fiche d'anomalie »](../.github/ISSUE_TEMPLATE/bug_report.yml) :

| Gravité        | Définition                                        | Exemples Kizuna                                                            |
| -------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| **Critique**   | Blocage total ou perte de données                 | API indisponible, échec des migrations, fuite de données entre trinômes    |
| **Majeure**    | Fonctionnalité inutilisable, pas de contournement | Emails transactionnels jamais envoyés en production (cas `7d62bca`)        |
| **Mineure**    | Gêne avec contournement possible                  | Test e2e sensible à la configuration SMTP locale (contournement documenté) |
| **Cosmétique** | Défaut visuel ou de libellé                       | Alignement d'un badge, libellé tronqué                                     |

La fiche d'anomalie impose également : environnement (production / local / navigateur),
rôle utilisateur concerné, étapes de reproduction numérotées, comportement attendu et
observé, logs ou captures. Une anomalie non reproductible est renvoyée au déclarant
avec le label `à préciser` avant toute qualification.

### 1.2 Priorisation

La priorité de traitement découle de la gravité et de l'exposition :

| Gravité    | Délai de prise en charge        | Règle de traitement                                                              |
| ---------- | ------------------------------- | -------------------------------------------------------------------------------- |
| Critique   | Immédiat                        | Correctif prioritaire sur tout développement en cours ; déploiement dès CI verte |
| Majeure    | Sous 48 h                       | Correctif planifié en tête de file ; contournement communiqué si possible        |
| Mineure    | Prochain cycle de développement | Regroupée avec les travaux du module concerné                                    |
| Cosmétique | Au fil de l'eau                 | Traitée opportunément, jamais au détriment d'une gravité supérieure              |

Deux facteurs peuvent remonter la priorité d'un cran : l'anomalie touche la
**production** (et non un environnement local), ou elle concerne la **sécurité** ou
l'intégrité des données (traitée alors comme critique quelle que soit sa gravité
fonctionnelle apparente).

## 2. Cycle de traitement d'une anomalie

Chaque anomalie suit le même cycle, outillé de bout en bout :

1. **Détection** — quatre canaux :
   - la **recette** (scénarios du [cahier de recettes](CAHIER_RECETTES.md)) ;
   - les **tests automatisés** en CI (`.github/workflows/ci.yml` : lint, typecheck,
     275 tests unitaires avec couverture bloquante, 13 suites e2e API, e2e Playwright) —
     tout test en échec bloque la fusion et constitue une détection d'anomalie ;
   - la **production** : sondes décrites dans [MAINTENANCE.md](MAINTENANCE.md)
     (healthchecks Docker, validation post-déploiement, Uptime Kuma avec alertes
     email) et logs structurés JSON (nestjs-pino) ;
   - le **support utilisateur** : module Tickets intégré à la plateforme, trié par
     l'équipe support.
2. **Consignation** — ouverture d'une issue GitHub avec le template « Fiche
   d'anomalie » (labels `bug`, `à trier`), qui garantit la reproductibilité.
3. **Qualification** — attribution de la gravité (§ 1.1) et de la priorité (§ 1.2).
4. **Analyse de cause racine** — reproduction locale à partir de la fiche, lecture des
   logs, bissection git si nécessaire ; l'analyse est consignée dans l'issue (champ
   « Analyse et pistes de correction ») puis dans le message du commit correctif. Pour
   chaque **test en échec**, l'analyse précise le point d'amélioration : défaut du code,
   défaut du test, ou défaut de l'environnement.
5. **Correctif** — commit `fix(scope): …` (Conventional Commits) sur une branche, PR
   référençant l'issue (`Fixes #N`). Le correctif embarque un **test de
   non-régression** chaque fois que le défaut est testable automatiquement (test
   unitaire ou e2e reproduisant le symptôme) ; à défaut (défaut d'infrastructure), la
   vérification est intégrée au pipeline (build CI, healthcheck post-déploiement).
6. **Vérification pré-fusion** — la PR ne peut être fusionnée que si le pipeline CI
   complet est vert : c'est la preuve que la correction est conforme à l'attendu et
   qu'elle ne régresse rien.
7. **Déploiement** — la fusion sur `main` déclenche le déploiement continu
   (`.github/workflows/deploy.yml`) ; `scripts/deploy.sh` sonde `/health` après
   déploiement et fait échouer l'opération si l'API ne répond pas.
8. **Vérification post-déploiement** — rejeu du scénario de la fiche d'anomalie sur
   l'environnement concerné ; l'issue est fermée avec le lien vers le commit.
9. **Traçabilité** — le correctif est consigné dans le [CHANGELOG](../CHANGELOG.md)
   (section « Corrigé » de la version suivante, Keep a Changelog).

## 3. Études de cas — anomalies réelles traitées

Les trois anomalies suivantes sont extraites de l'historique git du projet. Elles
illustrent le cycle complet sur les trois canaux de détection : production, chaîne de
build, et recette manuelle.

### 3.1 Anomalie A-01 — Emails jamais envoyés en production (`7d62bca`)

| Champ     | Valeur                                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| Détection | Production (recette applicative post-déploiement)                                      |
| Gravité   | **Majeure** — emails transactionnels inopérants, pas de contournement utilisateur      |
| Commit    | `7d62bca` — `fix(prod): transmettre la config SMTP et WEB_PUBLIC_URL au conteneur API` |
| Fichier   | `docker-compose.prod.yml`                                                              |

**Symptôme.** En production, aucun email transactionnel (invitations de membres,
notifications) n'était réellement envoyé : les emails restaient en « mode simulé »
(simple trace dans les logs API), et les liens contenus dans les emails générés
pointaient vers `http://localhost:3000` au lieu du domaine public.

**Analyse de la cause racine.** L'API adopte un comportement dégradé volontaire :
sans `SMTP_HOST`, les emails sont journalisés au lieu d'être envoyés (comportement
documenté dans `.env.example`, adapté au développement). Or la stack de production
(`docker-compose.prod.yml`) ne transmettait **aucune** des variables d'environnement
email (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) ni
`WEB_PUBLIC_URL` au conteneur `api`. Les variables étaient bien définies sur le serveur,
mais jamais propagées au conteneur : l'API retombait silencieusement sur ses valeurs
par défaut de développement. Point d'amélioration identifié : un comportement de repli
silencieux en production masque une erreur de configuration.

**Correctif appliqué.** Ajout du bloc `environment` manquant dans le service `api` de
`docker-compose.prod.yml` (9 lignes) : transmission de `WEB_PUBLIC_URL`, `MAIL_FROM`
et des cinq variables `SMTP_*`, avec valeurs par défaut sûres et commentaire explicitant
le comportement simulé en l'absence de `SMTP_HOST`.

**Test de non-régression.** Le défaut relève de la configuration d'infrastructure, non
testable par les e2e applicatifs. Vérifications mises en place : rejeu du scénario en
production après déploiement CD (réception effective d'un email d'invitation avec lien
correct) ; la configuration attendue est documentée dans le README (section
déploiement) et `.env.example` fait foi pour la liste des variables à transmettre.

**Statut : corrigé, déployé via CD, vérifié en production. Clos.**

### 3.2 Anomalie A-02 — Échec du build des images Docker de production (`db96389`)

| Champ     | Valeur                                                                              |
| --------- | ----------------------------------------------------------------------------------- |
| Détection | CI (workflow `docker.yml` : validation de la construction des images à chaque push) |
| Gravité   | **Majeure** — impossibilité de produire les artefacts de déploiement                |
| Commit    | `db96389` — `fix(docker): build @kizuna/shared avant les apps dans les images prod` |
| Fichiers  | `apps/api/Dockerfile`, `apps/web/Dockerfile`                                        |

**Symptôme.** Après l'introduction du paquet partagé `@kizuna/shared` (contrats d'API
front/back), la construction des deux images de production échouait : `nest build`
(API) et `vite build` (web) s'interrompaient sur `Cannot find module '@kizuna/shared'`.

**Analyse de la cause racine.** Les Dockerfiles multi-stage construisaient explicitement
chaque paquet du monorepo dans l'ordre des dépendances (`@kizuna/db` puis l'application).
Le nouveau paquet `@kizuna/shared`, ajouté au graphe de dépendances des deux
applications, n'avait pas été inscrit dans cette chaîne de build : ses sources étaient
copiées dans l'image mais jamais compilées, donc introuvables à l'édition de liens.
Point d'amélioration identifié : toute évolution du graphe de paquets du monorepo doit
être répercutée dans les Dockerfiles, qui ne passent pas par Turborepo ; la CI
`docker.yml` (build des deux images à chaque push) est précisément le filet de sécurité
qui a détecté le défaut avant tout déploiement.

**Correctif appliqué.** Insertion de `pnpm --filter @kizuna/shared build` entre le build
de `@kizuna/db` et celui de chaque application, dans les deux Dockerfiles (diff : +7/−3).

**Test de non-régression.** Structurel et permanent : le workflow `docker.yml`
reconstruit les deux images à chaque push et à chaque PR ; toute réapparition du défaut
casse la CI avant fusion.

**Statut : corrigé, validé par la CI docker. Clos.**

### 3.3 Anomalie A-03 — Pastilles de rôle inaccessibles dans la barre de démo (`299bcfe`)

| Champ     | Valeur                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| Détection | Recette manuelle du mode démonstration (écran étroit / zoomé)                               |
| Gravité   | **Mineure** — gêne réelle en démonstration, contournement possible (élargir la fenêtre)     |
| Commit    | `299bcfe` — `fix(demo): pastilles de rôle toujours cliquables (FAB) + barre auto-réparante` |
| Fichier   | `apps/web/src/components/demo-switcher.tsx`                                                 |

**Symptôme.** Dans la barre de démonstration (bascule rapide entre les six rôles),
les pastilles de droite (admin « Nadia », support « Sami », bouton de fermeture)
ne réagissaient plus au clic sur écran étroit ou zoomé, alors que les trois rôles de
gauche fonctionnaient. Symptôme secondaire : après un échec de bascule, toute la barre
restait figée.

**Analyse de la cause racine.** Trois causes distinctes ont été identifiées :

1. **Empilement z-index** : la barre de démo (`z-30`) et le bouton flottant
   d'accessibilité (FAB, `z-40`) sont tous deux fixés en bas de l'écran ; sur viewport
   étroit, le FAB recouvrait les pastilles de droite et **interceptait leurs clics** —
   défaut invisible (aucune erreur, aucun log), typique des bogues de superposition.
2. **Verrou non libéré** : en cas d'échec de `signInThenGo`, le verrou `pending` de la
   fonction `switchTo` n'était pas relâché, figeant définitivement la barre.
3. **Absence de délai limite** : la récupération des alternants (`landingFor`) pouvait
   staller indéfiniment une bascule de tuteur si la requête traînait.

**Correctif appliqué** (diff : +21/−4) :

- barre passée en `z-50` (au-dessus du FAB), conteneur en `pointer-events-none` avec
  enfants `pointer-events-auto` pour ne bloquer ni le bas de page ni le FAB ;
- `switchTo` durci : `try/catch` avec libération systématique du verrou `pending` et
  toast d'erreur explicite (« Bascule impossible. Réessayez. ») ;
- `landingFor` borné par un timeout de 4 s (`Promise.race`) avec repli sur la page
  d'accueil du rôle.

**Test de non-régression.** Le scénario manuel R-39 du
[cahier de recettes](CAHIER_RECETTES.md) vérifie explicitement la cohabitation
FAB / barre de démo (toutes les pastilles cliquables) ; les bascules de rôle nominales
restent couvertes par les parcours Playwright (`apps/web/e2e/kizuna.e2e.ts`) qui
échoueraient si la connexion par rôle régressait.

**Statut : corrigé, vérifié en recette manuelle sur écran étroit. Clos.**

## 4. Suivi des anomalies ouvertes

État du registre au 2026-07-03 :

| Réf. | Anomalie                                                                                                                                                                                                                                          | Gravité | Détection      | État                   | Contournement / plan                                                                                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-04 | Le test e2e admin (`apps/api/test/admin.e2e-spec.ts`, création de membre) suppose l'absence de SMTP : il vérifie `invitationSent: false` et la remise d'un mot de passe temporaire. Si un SMTP local est configuré (ex. MailHog), le test échoue. | Mineure | Recette locale | **Ouverte — acceptée** | Lancer les e2e avec `SMTP_HOST=` (vide), comportement par défaut documenté dans `.env.example` ; la CI n'est pas affectée (aucun SMTP configuré). Amélioration envisagée : rendre l'assertion conditionnelle à la présence de SMTP. |

Aucune anomalie critique ou majeure ouverte. Le registre vivant est tenu dans les
issues GitHub (label `bug`) ; ce tableau en est la photographie à la date du document.
