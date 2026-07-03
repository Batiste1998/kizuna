# Cahier de recettes

Plateforme **Kizuna** — suivi tripartite d'alternance (alternant / tuteur pédagogique /
tuteur d'entreprise).

Document rédigé au titre de la compétence **C2.3.1** du référentiel RNCP39583 :
élaborer le cahier de recettes couvrant l'ensemble des fonctionnalités attendues, et
exécuter les tests fonctionnels, structurels et de sécurité conformément à ce plan.

| Champ                | Valeur                          |
| -------------------- | ------------------------------- |
| Version du document  | 1.0                             |
| Date de la recette   | 2026-07-03                      |
| Référence logicielle | branche `main`, version `0.2.0` |
| Rédaction            | Équipe de développement Kizuna  |

---

## 1. Objet

Ce cahier de recettes définit les scénarios de vérification de conformité de la
plateforme Kizuna avant mise en production. Il couvre :

- les **tests fonctionnels** : chaque module métier, pour chaque rôle concerné, y
  compris les cas d'erreur (scénarios « KO » de validation des entrées) ;
- les **tests structurels** : santé de l'application, connexion à la base de données,
  intégrité de la chaîne de build et de déploiement ;
- les **tests de sécurité** : contrôle d'accès entre rôles (401/403), cloisonnement des
  données entre trinômes, limitation de débit, en-têtes de sécurité HTTP, double
  authentification (2FA TOTP).

La majorité des scénarios est **automatisée** : 13 suites e2e API (Jest + Supertest,
`apps/api/test/*.e2e-spec.ts`) et une suite navigateur (Playwright,
`apps/web/e2e/kizuna.e2e.ts`), toutes exécutées à chaque push et pull request par la CI
(`.github/workflows/ci.yml`). Les scénarios non automatisables de façon pertinente
(2FA avec application d'authentification, réglages d'accessibilité, sondes réseau) sont
exécutés manuellement selon le protocole décrit ci-dessous.

## 2. Environnement de recette

### 2.1 Stack

La recette s'exécute sur la stack locale décrite dans le [README](../README.md) :

| Composant       | Détail                                                       |
| --------------- | ------------------------------------------------------------ |
| Base de données | PostgreSQL via Docker Compose (`pnpm docker:up`)             |
| API             | NestJS sur http://localhost:3001                             |
| Web             | TanStack Start (SSR) sur http://localhost:3000               |
| Emails          | `SMTP_HOST` vide : les emails sont simulés dans les logs API |

Mise en place :

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:migrate
pnpm db:seed                          # référentiel RNCP, écoles, données métier
pnpm --filter @kizuna/api build
pnpm --filter @kizuna/api seed:users  # comptes de démo (un par rôle)
pnpm dev
```

L'environnement de CI reproduit exactement cette séquence (service PostgreSQL,
migrations, seed, puis lint, typecheck, tests unitaires, e2e API et e2e Playwright) :
la recette automatisée est donc rejouée à l'identique à chaque modification du code.

### 2.2 Comptes de test

Comptes de démo créés par `seed:users`, mot de passe commun `Password123!` :

| Email                   | Rôle                | Usage en recette                             |
| ----------------------- | ------------------- | -------------------------------------------- |
| `alternant@kizuna.dev`  | Alternant           | Trinôme de référence (sujet des évaluations) |
| `peda@kizuna.dev`       | Tuteur pédagogique  | Trinôme de référence                         |
| `entreprise@kizuna.dev` | Tuteur d'entreprise | Trinôme de référence                         |
| `admin@kizuna.dev`      | Administrateur      | Gestion de l'établissement (CFA de démo)     |
| `support@kizuna.dev`    | Support             | Triage des tickets                           |
| `superadmin@kizuna.dev` | Super Admin         | Gestion de la plateforme                     |

Les scénarios de sécurité créent en outre des comptes jetables (« étranger au
trinôme ») via l'inscription publique, afin de vérifier le cloisonnement des données.

### 2.3 Données de test

- **Référentiel de compétences** RNCP (blocs `BC01`…, niveaux `NA` / `EC` / `A` / `M`)
  inséré par `pnpm db:seed`.
- **Trinôme de démonstration** complet (alternant + deux tuteurs associés) créé par
  `seed:users`, utilisé par tous les scénarios métier.
- Les entrées de journal, bilans, échéances, messages, documents et tickets sont créés
  par les scénarios eux-mêmes (données autoporteuses, identifiants uniques par
  exécution).

## 3. Matrice de couverture rôles × modules

| Module                  | Visiteur / étranger | Alternant        | Tuteur péda | Tuteur entreprise  | Admin       | Support | Super Admin |
| ----------------------- | ------------------- | ---------------- | ----------- | ------------------ | ----------- | ------- | ----------- |
| Authentification / 2FA  | R-01, R-03          | R-02, R-04, R-05 | R-02        | R-02               | R-05        | —       | —           |
| Socle (santé, sécurité) | R-06, R-07, R-08    | —                | —           | —                  | —           | —       | —           |
| Compétences             | R-11 (403)          | R-09, R-12       | R-10        | lecture (R-10)     | —           | —       | —           |
| Journal                 | —                   | R-13             | R-14 (403)  | R-13 (validation)  | —           | —       | —           |
| Bilans                  | —                   | R-15, R-16       | R-15, R-17  | idem péda          | —           | —       | —           |
| Échéancier              | —                   | R-18, R-19       | R-18        | idem péda          | —           | —       | —           |
| Messagerie              | R-21 (403)          | R-20             | R-20        | R-20               | —           | —       | —           |
| Documents               | R-23 (403)          | R-22             | R-23 (KO)   | idem péda          | —           | —       | —           |
| Notifications           | —                   | R-24, R-25       | R-24        | R-24 (déclencheur) | —           | —       | —           |
| Support / tickets       | —                   | R-26             | R-27        | R-27 (403)         | —           | R-26    | —           |
| Espace tuteur           | —                   | —                | R-28        | R-28               | —           | —       | —           |
| Espace admin            | R-33 (403)          | R-33 (403)       | —           | —                  | R-29 à R-34 | —       | —           |
| Espace super admin      | —                   | —                | —           | —                  | R-37 (403)  | —       | R-35, R-36  |
| Portail / accessibilité | R-38                | R-39             | R-39        | R-39               | R-39        | R-39    | R-39        |

Chaque module est couvert au minimum par : un scénario nominal, un scénario de sécurité
(accès refusé) et un scénario KO (entrée invalide rejetée).

## 4. Scénarios de recette

Conventions :

- **Type** : F = fonctionnel, S = structurel, SEC = sécurité, KO = cas d'erreur
  (validation des entrées).
- **Automatisation** : référence du fichier de test e2e qui exécute le scénario en CI,
  ou « manuel » avec le protocole d'exécution.
- Sauf mention contraire, la précondition commune est : environnement de recette
  démarré, base migrée et alimentée (§ 2).

### 4.1 Authentification et contrôle d'accès

#### R-01 — Inscription par email et mot de passe

- **Type** : F — **Automatisation** : `apps/api/test/auth.e2e-spec.ts`
- **Préconditions** : adresse email inédite.
- **Étapes** :
  1. Envoyer `POST /api/auth/sign-up/email` avec nom, email et mot de passe conforme.
- **Résultat attendu** : réponse 200 ; le compte est créé avec le rôle par défaut
  `user` ; l'email retourné correspond à celui fourni.

#### R-02 — Connexion et lecture de la session

- **Type** : F — **Automatisation** : `apps/api/test/auth.e2e-spec.ts`
- **Préconditions** : compte existant (R-01 ou compte de démo).
- **Étapes** :
  1. Envoyer `POST /api/auth/sign-in/email` avec email et mot de passe valides.
  2. Appeler `GET /me` avec le cookie de session obtenu.
- **Résultat attendu** : connexion 200 ; `/me` retourne l'email et le rôle de
  l'utilisateur connecté.

#### R-03 — Accès sans session et franchissement de rôle refusés

- **Type** : SEC — **Automatisation** : `apps/api/test/auth.e2e-spec.ts`
- **Préconditions** : compte de rôle `user` existant.
- **Étapes** :
  1. Appeler `GET /me` sans aucun cookie de session.
  2. Se connecter avec un compte `user` ordinaire puis appeler `GET /admin/overview`.
- **Résultat attendu** : étape 1 → **401 Unauthorized** ; étape 2 → **403 Forbidden**
  (un rôle non administrateur ne peut pas atteindre une route d'administration).

#### R-04 — Activation de la double authentification (2FA TOTP)

- **Type** : F + SEC — **Automatisation** : manuel
- **Préconditions** : connecté en `alternant@kizuna.dev` ; application
  d'authentification (TOTP) disponible.
- **Étapes** :
  1. Ouvrir « Mon compte » (`/app/compte`), section sécurité.
  2. Activer la 2FA en saisissant le mot de passe du compte.
  3. Scanner le QR code affiché avec l'application d'authentification.
  4. Saisir le code à 6 chiffres généré pour valider l'activation.
  5. Se déconnecter, se reconnecter : saisir le code TOTP demandé.
  6. Désactiver la 2FA (mot de passe requis).
- **Résultat attendu** : QR code affiché à l'étape 3 ; activation confirmée à
  l'étape 4 ; à l'étape 5 la connexion exige un code TOTP valide ; la désactivation
  exige le mot de passe.

#### R-05 — Connexion par le formulaire web

- **Type** : F — **Automatisation** : `apps/web/e2e/kizuna.e2e.ts`
- **Préconditions** : application web servie.
- **Étapes** :
  1. Ouvrir `/login`.
  2. Renseigner email (`alternant@kizuna.dev`) et mot de passe, soumettre.
- **Résultat attendu** : redirection vers l'espace `/app` ; le message d'accueil
  personnalisé (« Bonjour … ») est visible.

### 4.2 Socle applicatif (structurel et sécurité)

#### R-06 — Santé de l'API et connexion base de données

- **Type** : S — **Automatisation** : `apps/api/test/app.e2e-spec.ts`
- **Étapes** :
  1. Appeler `GET /health`.
- **Résultat attendu** : 200 avec `status: "ok"`, `db: "up"` (un `select 1` est réellement
  exécuté sur PostgreSQL) et un horodatage. Cette même sonde est utilisée par les
  healthchecks Docker, le script de déploiement et Uptime Kuma
  (voir [MAINTENANCE.md](MAINTENANCE.md)).

#### R-07 — En-têtes de sécurité HTTP

- **Type** : SEC — **Automatisation** : manuel
- **Étapes** :
  1. Exécuter `curl -sI http://localhost:3001/health`.
  2. Inspecter les en-têtes de réponse.
- **Résultat attendu** : en-têtes issus de helmet présents
  (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options:
nosniff`, `X-Frame-Options`…) ; `Cross-Origin-Resource-Policy: cross-origin` est
  assoupli volontairement pour servir uploads et PDF au front (autre origine) —
  configuration dans `apps/api/src/app.setup.ts`.

#### R-08 — Limitation de débit (rate limiting)

- **Type** : SEC — **Automatisation** : manuel
- **Préconditions** : API lancée hors mode test (limite : 300 requêtes / 60 s par
  client, `ThrottlerGuard` global dans `apps/api/src/app.module.ts`).
- **Étapes** :
  1. Émettre plus de 300 requêtes en moins d'une minute sur un même endpoint, par
     exemple : `for i in $(seq 1 310); do curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/health; done | sort | uniq -c`.
- **Résultat attendu** : les premières requêtes répondent 200 ; au-delà du seuil, l'API
  répond **429 Too Many Requests** jusqu'à la fin de la fenêtre.

### 4.3 Compétences (tri-évaluation)

#### R-09 — Auto-évaluation par l'alternant

- **Type** : F — **Automatisation** : `apps/api/test/competences.e2e-spec.ts`
- **Préconditions** : connecté en `alternant@kizuna.dev` ; référentiel seedé.
- **Étapes** :
  1. Récupérer son profil (`GET /me/alternant`).
  2. Charger le référentiel (`GET /alternants/{profilId}/competences`) : vérifier
     `editableAs: "auto"` et la présence de blocs.
  3. Enregistrer un niveau (`PUT …/competences/{competenceId}/evaluation`, `level: "A"`).
  4. Relire le référentiel.
- **Résultat attendu** : l'évaluation est enregistrée avec `evaluator: "auto"` ; à la
  relecture, la compétence porte `evaluations.auto = "A"`.

#### R-10 — Évaluation croisée par le tuteur pédagogique

- **Type** : F — **Automatisation** : `apps/api/test/competences.e2e-spec.ts`
- **Préconditions** : trinôme de démo associé.
- **Étapes** :
  1. Connecté en `peda@kizuna.dev`, charger les compétences de l'alternant suivi :
     vérifier `editableAs: "peda"`.
  2. Enregistrer un niveau `M` sur la même compétence que R-09.
- **Résultat attendu** : l'évaluation est enregistrée avec `evaluator: "peda"` ; les
  trois voix (auto / péda / entreprise) coexistent sans s'écraser.

#### R-11 — Contrôles d'accès et validation des évaluations

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/competences.e2e-spec.ts`
- **Étapes** :
  1. En tant qu'alternant, envoyer un niveau hors référentiel (`level: "WRONG"`).
  2. Créer un compte étranger au trinôme, puis tenter de lire
     `GET /alternants/{profilId}/competences` de l'alternant de démo.
- **Résultat attendu** : étape 1 → **400 Bad Request** (validation whitelist) ;
  étape 2 → **403 Forbidden** (cloisonnement du trinôme).

#### R-12 — Auto-évaluation depuis le navigateur (fil à trois voix)

- **Type** : F — **Automatisation** : `apps/web/e2e/kizuna.e2e.ts`
- **Étapes** :
  1. Se connecter en alternant (R-05) et ouvrir `/app/competences`.
  2. Vérifier l'affichage du référentiel (bloc `BC01`).
  3. Cliquer un niveau (« Acquis » puis « Maîtrisé ») sur la première compétence.
- **Résultat attendu** : le toast « Évaluation enregistrée » confirme la persistance ;
  le niveau sélectionné est reflété dans le fil.

### 4.4 Journal d'activités

#### R-13 — Création d'une entrée puis validation par le tuteur d'entreprise

- **Type** : F — **Automatisation** : `apps/api/test/journal.e2e-spec.ts`
- **Étapes** :
  1. En alternant, créer une entrée (`POST /alternants/{profilId}/journal`, titre +
     contenu).
  2. En tuteur d'entreprise, charger le journal (vérifier `editableAs: "entreprise"`).
  3. Valider l'entrée (`PUT /journal/{entryId}/review`, `status: "validated"`,
     commentaire).
  4. En alternant, relire le journal.
- **Résultat attendu** : l'entrée naît en statut `pending` (201) ; après revue, elle
  passe `validated` et porte le commentaire du tuteur. Le rejet (`status: "rejected"`)
  suit le même canal.

#### R-14 — Périmètre des rôles et validation des entrées du journal

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/journal.e2e-spec.ts`
- **Étapes** :
  1. En tuteur pédagogique, tenter de créer une entrée de journal.
  2. En tuteur pédagogique, tenter de valider une entrée existante.
  3. En alternant, soumettre une entrée au titre vide.
- **Résultat attendu** : étapes 1 et 2 → **403** (le journal relève du binôme
  alternant / tuteur d'entreprise) ; étape 3 → **400**.

### 4.5 Bilans tripartites

#### R-15 — Planification, changement de statut, lecture par l'alternant

- **Type** : F — **Automatisation** : `apps/api/test/bilans.e2e-spec.ts`
- **Étapes** :
  1. En tuteur pédagogique, planifier un bilan (`POST /alternants/{profilId}/bilans`,
     libellé + date).
  2. Mettre à jour le bilan (`PATCH /bilans/{bilanId}`, `status: "signed"`, synthèse).
  3. En alternant, lister les bilans.
- **Résultat attendu** : création en statut `planned` (201) ; passage à `signed` (200) ;
  l'alternant voit le bilan mais `canManage: false` (lecture seule).

#### R-16 — Export PDF d'un bilan

- **Type** : F — **Automatisation** : `apps/api/test/bilans.e2e-spec.ts`
- **Étapes** :
  1. En alternant (membre du trinôme), télécharger `GET /bilans/{bilanId}/pdf`.
- **Résultat attendu** : 200, `Content-Type: application/pdf`,
  `Content-Disposition: attachment`, corps non vide (> 500 octets).

#### R-17 — Contrôles d'accès et validation des bilans

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/bilans.e2e-spec.ts`
- **Étapes** :
  1. En alternant, tenter de planifier un bilan.
  2. En tuteur, soumettre une date invalide (`scheduledAt: "not-a-date"`).
- **Résultat attendu** : étape 1 → **403** (seuls les tuteurs planifient) ;
  étape 2 → **400**.

### 4.6 Échéancier

#### R-18 — Création d'une échéance par un tuteur, visible par l'alternant

- **Type** : F — **Automatisation** : `apps/api/test/echeancier.e2e-spec.ts`
- **Étapes** :
  1. En tuteur pédagogique, créer une échéance (`POST /alternants/{profilId}/echeances`,
     titre + date limite).
  2. En alternant, lister les échéances.
- **Résultat attendu** : création 201 ; l'alternant voit l'échéance,
  `canManage: false`.

#### R-19 — Contrôles d'accès et validation de l'échéancier

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/echeancier.e2e-spec.ts`
- **Étapes** :
  1. En alternant, tenter de créer une échéance.
  2. En tuteur, soumettre une échéance sans titre.
- **Résultat attendu** : étape 1 → **403** ; étape 2 → **400**.

### 4.7 Messagerie de trinôme

#### R-20 — Échange de messages au sein du trinôme

- **Type** : F — **Automatisation** : `apps/api/test/messagerie.e2e-spec.ts`
- **Étapes** :
  1. En alternant, poster un message (`POST /alternants/{profilId}/messages`).
  2. En tuteur d'entreprise, répondre sur le même fil.
  3. En alternant, relire le fil.
- **Résultat attendu** : chaque message est attribué à son rôle
  (`authorRelation: "alternant"` / `"entreprise"`) ; `canPost: true` pour les membres ;
  le fil contient les deux voix.

#### R-21 — Cloisonnement et validation de la messagerie

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/messagerie.e2e-spec.ts`
- **Étapes** :
  1. Avec un compte étranger au trinôme, tenter de lire puis de poster sur le fil.
  2. En alternant, poster un message vide.
- **Résultat attendu** : étape 1 → **403** en lecture comme en écriture ;
  étape 2 → **400**.

### 4.8 Documents

#### R-22 — Cycle de vie complet d'un document

- **Type** : F — **Automatisation** : `apps/api/test/documents.e2e-spec.ts`
- **Étapes** :
  1. En alternant, déposer un fichier (`POST /alternants/{profilId}/documents`,
     multipart, catégorie `compte_rendu`).
  2. Lister les documents du profil.
  3. Télécharger le fichier (`GET /documents/{docId}/download`).
  4. Supprimer le document (`DELETE /documents/{docId}`), puis relister.
- **Résultat attendu** : dépôt 201 avec nom d'origine et catégorie conservés ; le
  document apparaît dans la liste (`canUpload: true`) ; le téléchargement restitue le
  contenu exact ; après suppression, il disparaît de la liste.

#### R-23 — Cloisonnement et validation des documents

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/documents.e2e-spec.ts`
- **Étapes** :
  1. Avec un compte étranger, tenter de lister les documents du profil de démo.
  2. En tuteur, envoyer une requête de dépôt sans fichier joint.
- **Résultat attendu** : étape 1 → **403** ; étape 2 → **400**.

### 4.9 Notifications

#### R-24 — Notifications événementielles (journal validé, message posté)

- **Type** : F — **Automatisation** : `apps/api/test/notifications.e2e-spec.ts`
- **Étapes** :
  1. En alternant, créer une entrée de journal ; en tuteur d'entreprise, la valider.
  2. En alternant, consulter `GET /notifications`.
  3. En alternant, poster un message de trinôme ; en tuteur pédagogique, consulter ses
     notifications.
- **Résultat attendu** : l'alternant reçoit une notification non lue de type `journal`
  (`unreadCount > 0`) ; le tuteur pédagogique reçoit une notification de type `message`.

#### R-25 — Marquage des notifications comme lues

- **Type** : F — **Automatisation** : `apps/api/test/notifications.e2e-spec.ts`
- **Préconditions** : notifications non lues existantes (R-24).
- **Étapes** :
  1. Marquer une notification précise (`POST /notifications/{id}/read`).
  2. Tout marquer (`POST /notifications/read-all`), puis relire la liste.
- **Résultat attendu** : après « tout lire », `unreadCount = 0`.

### 4.10 Support / tickets

#### R-26 — Cycle de vie complet d'un ticket

- **Type** : F — **Automatisation** : `apps/api/test/support.e2e-spec.ts`
- **Étapes** :
  1. En alternant, ouvrir un ticket (`POST /tickets` : sujet, type `bug`, priorité,
     description).
  2. Vérifier le détail côté demandeur (premier message présent, `canTriage: false`).
  3. En support, lister les tickets (`canTriage: true`), répondre sur le fil.
  4. En support, clôturer (`PATCH /tickets/{id}`, `status: "resolved"`).
- **Résultat attendu** : référence générée au format `KZ-NNNN`, statut initial `open` ;
  la réponse du support passe le ticket `in_progress` et l'auto-assigne ; la clôture
  aboutit au statut `resolved`.

#### R-27 — Confidentialité et validation des tickets

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/support.e2e-spec.ts`
- **Étapes** :
  1. En tuteur d'entreprise, tenter de lire le ticket d'un autre utilisateur.
  2. En alternant, créer un ticket de type inexistant (`type: "invalid"`).
- **Résultat attendu** : étape 1 → **403** (un demandeur ne voit que ses tickets) ;
  étape 2 → **400**.

### 4.11 Espace tuteur

#### R-28 — Liste « Mes alternants » selon le rôle du tuteur

- **Type** : F — **Automatisation** : `apps/api/test/alternants.e2e-spec.ts`
- **Étapes** :
  1. En tuteur pédagogique, appeler `GET /me/alternants`.
  2. En tuteur d'entreprise, appeler le même endpoint.
  3. Avec un compte ne supervisant personne, appeler le même endpoint.
- **Résultat attendu** : chaque tuteur voit ses alternants avec son rôle dans le trinôme
  (`myRole: "peda"` / `"entreprise"`) et l'avancement (`progress.total`) ; un compte
  sans supervision obtient une liste vide (pas d'erreur, pas de fuite de données).

### 4.12 Espace administrateur (établissement)

#### R-29 — Tableau de bord de l'établissement

- **Type** : F — **Automatisation** : `apps/api/test/admin.e2e-spec.ts`
- **Étapes** :
  1. En admin, appeler `GET /admin/overview` puis `GET /admin/alternants`.
- **Résultat attendu** : nom de l'organisation et compteurs (> 0 alternants, membres) ;
  la liste des alternants inclut le détail du trinôme (`tuteurPedaName`…).

#### R-30 — Gestion des entreprises partenaires (CRUD)

- **Type** : F — **Automatisation** : `apps/api/test/admin.e2e-spec.ts`
- **Étapes** :
  1. Créer une entreprise (`POST /admin/entreprises` : nom, secteur, ville).
  2. La modifier (`PATCH` : renommage, changement de ville, secteur vidé).
  3. La supprimer (`DELETE`), puis relister.
- **Résultat attendu** : création 201, modification 200 (un champ vidé devient `null`),
  suppression effective (absente de la liste).

#### R-31 — Gestion des membres et protection des associations

- **Type** : F + SEC — **Automatisation** : `apps/api/test/admin.e2e-spec.ts`
- **Étapes** :
  1. Créer un membre tuteur (`POST /admin/members`). Sans SMTP configuré, vérifier
     `invitationSent: false` et la remise d'un mot de passe temporaire à l'admin.
  2. Modifier le membre (nom, changement de rôle).
  3. L'associer au trinôme d'un alternant, puis tenter de le supprimer.
  4. Le dissocier, puis le supprimer.
- **Résultat attendu** : étape 3 → **409 Conflict** (suppression bloquée tant que le
  tuteur est associé) ; après dissociation, la suppression aboutit et le membre
  disparaît de la liste.

#### R-32 — Promotions et constitution d'un trinôme complet

- **Type** : F — **Automatisation** : `apps/api/test/admin.e2e-spec.ts`
- **Étapes** :
  1. Créer une promotion (`POST /admin/promotions`, nom + niveau RNCP).
  2. Créer un alternant, un tuteur pédagogique et un tuteur d'entreprise.
  3. Associer les deux tuteurs à l'alternant
     (`PUT /admin/alternants/{profilId}/association`).
  4. Relister les alternants.
- **Résultat attendu** : la création d'un alternant génère son profil
  (`alternantProfilId`) ; après association, la liste reflète le trinôme complet
  (noms des tuteurs).

#### R-33 — Contrôles d'accès et validation de l'espace admin

- **Type** : SEC + KO — **Automatisation** : `apps/api/test/admin.e2e-spec.ts`
- **Étapes** :
  1. En admin, créer un membre avec un rôle inexistant (`role: "wizard"`).
  2. En alternant, appeler `GET /admin/overview` puis tenter `POST /admin/members`.
- **Résultat attendu** : étape 1 → **400** ; étape 2 → **403** en lecture comme en
  écriture.

#### R-34 — Tableau de bord admin dans le navigateur

- **Type** : F — **Automatisation** : `apps/web/e2e/kizuna.e2e.ts`
- **Étapes** :
  1. Se connecter en `admin@kizuna.dev` (redirection automatique vers `/app/admin`).
  2. Vérifier l'affichage du tableau de bord.
- **Résultat attendu** : en-tête personnalisé (« Bonjour … ») et indicateurs propres au
  dashboard (« Associations complètes », « Suivi à traiter ») visibles.

### 4.13 Espace super admin (plateforme)

#### R-35 — Vue d'ensemble et gestion des organisations

- **Type** : F — **Automatisation** : `apps/api/test/superadmin.e2e-spec.ts`
- **Étapes** :
  1. En super admin, appeler `GET /superadmin/overview`.
  2. Lister puis créer une organisation (`POST /superadmin/organizations` : nom, type,
     ville), relister.
- **Résultat attendu** : compteurs plateforme (> 0 organisations et utilisateurs) ; la
  nouvelle organisation apparaît dans la liste.

#### R-36 — Gestion des utilisateurs et bannissement

- **Type** : F + SEC — **Automatisation** : `apps/api/test/superadmin.e2e-spec.ts`
- **Étapes** :
  1. Créer un compte jetable via l'inscription publique.
  2. En super admin, le retrouver dans `GET /superadmin/users`.
  3. Le bannir (`PATCH /superadmin/users/{id}`, `banned: true`).
- **Résultat attendu** : l'utilisateur est listé puis marqué `banned: true`.

#### R-37 — Cloisonnement de l'espace super admin

- **Type** : SEC — **Automatisation** : `apps/api/test/superadmin.e2e-spec.ts`
- **Étapes** :
  1. En admin d'établissement, appeler `GET /superadmin/overview`.
- **Résultat attendu** : **403 Forbidden** — un admin d'établissement n'accède pas à la
  gestion de la plateforme.

### 4.14 Portail et accessibilité

#### R-38 — Portail public

- **Type** : F — **Automatisation** : `apps/web/e2e/kizuna.e2e.ts`
- **Étapes** :
  1. Ouvrir `/` sans être connecté.
- **Résultat attendu** : titre « Kizuna », promesse produit (« le lien du trinôme »),
  liens « Se connecter » et « Essayer la démo » visibles.

#### R-39 — Réglages d'accessibilité (FAB)

- **Type** : F — **Automatisation** : manuel
- **Préconditions** : connecté avec n'importe quel rôle.
- **Étapes** :
  1. Ouvrir le bouton flottant « Accessibilité » (bas de page).
  2. Activer successivement : police adaptée (dyslexie), espacement aéré, contraste
     renforcé, taille de texte.
  3. Naviguer entre plusieurs pages, puis recharger le navigateur.
  4. Vérifier la cohabitation avec la barre de démonstration (bas d'écran) : toutes les
     pastilles de rôle restent cliquables (non-régression du correctif `299bcfe`).
- **Résultat attendu** : chaque réglage s'applique immédiatement à toute l'interface,
  persiste après rechargement ; le panneau est fermable au clavier (`aria-label`
  « Fermer ») ; aucun élément fixe n'en masque un autre.

## 5. Synthèse d'exécution

Recette exécutée le **2026-07-03** sur `main` (v0.2.0). Les scénarios « auto (CI) »
sont exécutés à chaque push par `.github/workflows/ci.yml` (dernier pipeline vert sur
`main`) ; les scénarios manuels ont été déroulés sur la stack locale de recette.

| Scénario | Intitulé                                              | Type     | Moyen     | Statut      |
| -------- | ----------------------------------------------------- | -------- | --------- | ----------- |
| R-01     | Inscription email / mot de passe                      | F        | auto (CI) | ✅ conforme |
| R-02     | Connexion et session `/me`                            | F        | auto (CI) | ✅ conforme |
| R-03     | Accès refusés 401 / 403                               | SEC      | auto (CI) | ✅ conforme |
| R-04     | Activation et usage de la 2FA TOTP                    | F + SEC  | manuel    | ✅ conforme |
| R-05     | Connexion par le formulaire web                       | F        | auto (CI) | ✅ conforme |
| R-06     | Santé API + base de données                           | S        | auto (CI) | ✅ conforme |
| R-07     | En-têtes de sécurité HTTP (helmet)                    | SEC      | manuel    | ✅ conforme |
| R-08     | Limitation de débit (429)                             | SEC      | manuel    | ✅ conforme |
| R-09     | Auto-évaluation d'une compétence                      | F        | auto (CI) | ✅ conforme |
| R-10     | Évaluation croisée du tuteur pédagogique              | F        | auto (CI) | ✅ conforme |
| R-11     | Compétences : 400 niveau invalide, 403 étranger       | SEC + KO | auto (CI) | ✅ conforme |
| R-12     | Auto-évaluation dans le navigateur                    | F        | auto (CI) | ✅ conforme |
| R-13     | Journal : création puis validation                    | F        | auto (CI) | ✅ conforme |
| R-14     | Journal : 403 tuteur péda, 400 entrée vide            | SEC + KO | auto (CI) | ✅ conforme |
| R-15     | Bilan : planification, statuts, lecture               | F        | auto (CI) | ✅ conforme |
| R-16     | Bilan : export PDF                                    | F        | auto (CI) | ✅ conforme |
| R-17     | Bilan : 403 alternant, 400 date invalide              | SEC + KO | auto (CI) | ✅ conforme |
| R-18     | Échéance créée par un tuteur, visible alternant       | F        | auto (CI) | ✅ conforme |
| R-19     | Échéancier : 403 alternant, 400 titre manquant        | SEC + KO | auto (CI) | ✅ conforme |
| R-20     | Messagerie : échange au sein du trinôme               | F        | auto (CI) | ✅ conforme |
| R-21     | Messagerie : 403 étranger, 400 message vide           | SEC + KO | auto (CI) | ✅ conforme |
| R-22     | Documents : dépôt, liste, téléchargement, suppression | F        | auto (CI) | ✅ conforme |
| R-23     | Documents : 403 étranger, 400 sans fichier            | SEC + KO | auto (CI) | ✅ conforme |
| R-24     | Notifications événementielles                         | F        | auto (CI) | ✅ conforme |
| R-25     | Marquage des notifications comme lues                 | F        | auto (CI) | ✅ conforme |
| R-26     | Ticket : ouverture, triage, réponse, résolution       | F        | auto (CI) | ✅ conforme |
| R-27     | Tickets : 403 ticket d'autrui, 400 type invalide      | SEC + KO | auto (CI) | ✅ conforme |
| R-28     | « Mes alternants » selon le rôle du tuteur            | F        | auto (CI) | ✅ conforme |
| R-29     | Tableau de bord établissement                         | F        | auto (CI) | ✅ conforme |
| R-30     | CRUD entreprises partenaires                          | F        | auto (CI) | ✅ conforme |
| R-31     | Membres : cycle de vie + blocage 409 si associé       | F + SEC  | auto (CI) | ✅ conforme |
| R-32     | Promotion + constitution d'un trinôme                 | F        | auto (CI) | ✅ conforme |
| R-33     | Admin : 400 rôle invalide, 403 non-admin              | SEC + KO | auto (CI) | ✅ conforme |
| R-34     | Tableau de bord admin dans le navigateur              | F        | auto (CI) | ✅ conforme |
| R-35     | Super admin : vue plateforme + organisations          | F        | auto (CI) | ✅ conforme |
| R-36     | Super admin : utilisateurs + bannissement             | F + SEC  | auto (CI) | ✅ conforme |
| R-37     | Super admin : 403 pour un admin d'établissement       | SEC      | auto (CI) | ✅ conforme |
| R-38     | Portail public                                        | F        | auto (CI) | ✅ conforme |
| R-39     | Réglages d'accessibilité (FAB)                        | F        | manuel    | ✅ conforme |

**Bilan** : 39 scénarios exécutés, 39 conformes (35 automatisés en CI, 4 manuels).
Aucune anomalie bloquante. Les anomalies détectées lors des recettes précédentes et
leur traitement sont documentés dans le
[plan de correction des bogues](PLAN_CORRECTION_BOGUES.md).
