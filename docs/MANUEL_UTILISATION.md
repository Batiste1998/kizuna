# Manuel d'utilisation

Ce manuel décrit l'utilisation de **Kizuna**, plateforme de suivi tripartite
d'alternance, rôle par rôle (RNCP39583 — C2.4.1).

**Lecteurs visés** : utilisateurs finaux (alternants, tuteurs, administrateurs,
support) et jury. Pour l'installation et l'exploitation, voir
[MANUEL_DEPLOIEMENT.md](MANUEL_DEPLOIEMENT.md).

## 1. Présentation générale

Kizuna (絆, « le lien ») organise le suivi d'un alternant autour de son
**trinôme** : l'alternant, son **tuteur pédagogique** (école) et son **tuteur
d'entreprise**. Le cœur de la plateforme est le **« fil » de tri-évaluation** :
chaque compétence du référentiel est un fil de progression sur lequel sont
enfilées **trois perles** — l'auto-évaluation de l'alternant, l'évaluation du
tuteur école et celle du tuteur entreprise. Voir converger ou diverger ces
trois voix est l'objet même du suivi.

Les niveaux d'évaluation sont communs à toute la plateforme :

| Niveau | Libellé    | Signification                            |
| :----: | ---------- | ---------------------------------------- |
|  `NA`  | Non acquis | La compétence n'est pas encore mobilisée |
|  `EC`  | En cours   | En cours d'acquisition                   |
|  `A`   | Acquis     | Mobilisée de façon autonome              |
|  `M`   | Maîtrisé   | Maîtrisée, transmissible                 |

Autour du fil s'articulent les modules : **journal d'activités** (validé par le
tuteur d'entreprise), **bilans tripartites** (avec export PDF), **échéancier de
promotion** (avec rappels automatiques), **messagerie de trinôme**,
**documents**, **notifications** et **support**.

## 2. Connexion et compte

### 2.1 Se connecter

1. Ouvrir l'URL de la plateforme : la page `/login` s'affiche.
2. Saisir email et mot de passe, puis **Se connecter**.
3. Si la **double authentification (2FA)** est activée sur le compte, saisir
   le code à 6 chiffres de l'application d'authentification (TOTP).
4. L'application redirige vers l'espace du rôle (`/app`).

**Mot de passe oublié** : lien « Mot de passe oublié » sur la page de
connexion → saisir son email → un lien de réinitialisation est envoyé par
email et ouvre la page `/reset-password`.

### 2.2 Mon compte (`/app/compte`)

Chaque utilisateur peut y :

- modifier son mot de passe ;
- **activer la 2FA** : saisir son mot de passe → scanner le **QR code** avec
  une application d'authentification (Google Authenticator, Authy…) → valider
  avec un code à 6 chiffres. La désactivation demande à nouveau le mot de passe.

### 2.3 Accessibilité — le bouton flottant (FAB)

Un bouton rond « Accessibilité » est **toujours visible en bas à droite** de
tous les écrans de l'application (`/app`). Il ouvre un panneau de **6
réglages**, mémorisés sur le poste (localStorage) et appliqués immédiatement :

| Option                 | Effet                                       |
| ---------------------- | ------------------------------------------- |
| Taille du texte        | Trois tailles : Normal / Grand / Très grand |
| Police adaptée         | Police plus lisible (dyslexie)              |
| Espacement aéré        | Interligne et espacement augmentés          |
| Liens soulignés        | Souligne tous les liens                     |
| Contraste renforcé     | Augmente le contraste visuel                |
| Réduire les animations | Limite les mouvements à l'écran             |

Un bouton **Réinitialiser** rétablit les valeurs par défaut.

## 3. Espace Alternant

Navigation latérale : _Tableau de bord, Mes compétences, Mon journal, Mes
bilans, Échéancier, Messagerie, Mes documents, Support, Mon compte_.

### 3.1 Tableau de bord (`/app`)

Vue de synthèse du suivi : progression des compétences, dernières entrées de
journal, prochains bilans et échéances, accès rapides aux modules.

### 3.2 Mes compétences (`/app/competences`) — auto-évaluation

1. Chaque compétence du référentiel s'affiche comme un **fil** allant de
   _Non acquis_ à _Maîtrisé_, avec les trois perles du trinôme (légende
   « Les trois voix » : alternant / tuteur école / tuteur entreprise).
2. Cliquer sur le niveau visé (`NA`, `EC`, `A`, `M`) pour positionner **sa
   propre voix** : l'auto-évaluation est enregistrée immédiatement.
3. Les évaluations des deux tuteurs sont en lecture seule : le fil permet de
   repérer d'un coup d'œil les écarts de perception à discuter en bilan.

### 3.3 Mon journal (`/app/journal`)

1. **Nouvelle entrée** : saisir un titre et le contenu (activités, missions,
   apprentissages), puis enregistrer.
2. L'entrée passe au statut **En attente de validation**.
3. Le **tuteur d'entreprise** la passe ensuite à **Validé** ou à
   **Modifications demandées** ; dans ce dernier cas, corriger l'entrée pour la
   soumettre à nouveau.

### 3.4 Mes bilans (`/app/bilans`)

Les bilans tripartites sont **planifiés par les tuteurs ou l'école** ; l'alternant
les consulte : date, libellé, compte rendu et statut (**Planifié → Réalisé →
Signé**). Chaque bilan peut être **téléchargé en PDF** (document A4 reprenant la
synthèse et les trois voix).

### 3.5 Échéancier (`/app/echeancier`)

Jalons de la promotion (remises de rapport, soutenances…) ajoutés par l'école.
Un **rappel automatique** est émis 3 jours avant chaque échéance (notification

- email, envoyé une seule fois, tous les matins à 7 h heure de Paris).

### 3.6 Messagerie (`/app/messagerie`)

Fil de discussion **privé au trinôme** (alternant + les deux tuteurs). Les
messages génèrent une notification dans la cloche des destinataires.

### 3.7 Mes documents (`/app/documents`)

Déposer, télécharger et supprimer des documents (conventions, rapports…).
La taille maximale par fichier est configurée côté serveur (10 Mo par défaut).

## 4. Espaces Tuteur pédagogique et Tuteur d'entreprise

Navigation : _Tableau de bord, Mes alternants, Support, Mon compte_. Les deux
tuteurs partagent les mêmes écrans ; seuls leurs droits diffèrent (voir 4.3).

### 4.1 Mes alternants (`/app/alternants`)

Liste des alternants suivis. Cliquer sur un alternant ouvre son **dossier**
(`/app/alternants/{id}`) avec des onglets : _Synthèse, Compétences, Journal,
Bilans, Documents, Échéancier, Messagerie_.

### 4.2 Évaluer les compétences

Dans l'onglet **Compétences** du dossier, le tuteur positionne **sa voix**
(perle « Tuteur péda. » ou « Tuteur entr. ») sur chaque fil, aux mêmes niveaux
`NA / EC / A / M`. L'auto-évaluation de l'alternant et la voix de l'autre
tuteur restent visibles pour comparaison.

### 4.3 Spécificités par tuteur

| Action                                                  | Tuteur pédagogique | Tuteur d'entreprise |
| ------------------------------------------------------- | :----------------: | :-----------------: |
| Évaluer les compétences (sa voix)                       |         ✔          |          ✔          |
| **Valider le journal** / demander des modifications     |         ✘          |    ✔ (exclusif)     |
| Planifier un bilan, changer son statut (Réalisé, Signé) |         ✔          |          ✔          |
| Ajouter une échéance de promotion                       |         ✔          |          ✔          |
| Messagerie de trinôme, documents                        |         ✔          |          ✔          |

La validation du journal est réservée au tuteur d'entreprise (message API :
« Seul le tuteur d'entreprise peut valider le journal »).

### 4.4 Bilans tripartites

Dans l'onglet **Bilans** : bouton **Planifier** (libellé, date), puis mise à
jour du statut au fil du processus (_Planifié → Réalisé → Signé_), rédaction du
compte rendu et **export PDF**.

## 5. Espace Administrateur d'établissement (« Espace école »)

Navigation : _Tableau de bord, Alternants, Associations, Membres, Entreprises,
Promotions, Support, Mon compte_.

- **Tableau de bord** (`/app/admin`) : indicateurs agrégés de l'établissement
  (alternants, trinômes, activité de suivi).
- **Alternants** (`/app/admin/alternants`) : création et gestion des profils
  d'alternants de l'école.
- **Associations** (`/app/admin/associations`) : **constitution des trinômes** —
  bouton _Nouvelle association_ pour lier un alternant, un tuteur pédagogique
  et un tuteur d'entreprise. C'est cette association qui ouvre l'accès des
  tuteurs au dossier de l'alternant.
- **Membres** (`/app/admin/membres`) : comptes de l'établissement (tuteurs,
  autres admins) — invitation, rôles.
- **Entreprises** (`/app/admin/entreprises`) : référentiel des entreprises
  d'accueil.
- **Promotions** (`/app/admin/promotions`) : cohortes ; l'échéancier est porté
  par la promotion.
- **Multi-écoles** : si l'administrateur gère plusieurs établissements, un
  **sélecteur d'école** apparaît en tête de la barre latérale ; tout l'espace
  s'affiche alors dans le contexte de l'école active.

## 6. Espace Support

Navigation : _Tickets, Mon compte_. Le support traite les tickets ouverts par
les utilisateurs (bouton _Support_ de chaque espace).

- **File des tickets** (`/app/support`) : liste triable, tickets de type
  `bug` ou `demande`, priorité `basse / moyenne / haute`.
- **Détail d'un ticket** (`/app/support/{id}`) : fil de discussion avec le
  demandeur, bouton **M'assigner**, changement de **statut**
  (_Ouvert → En cours → Résolu_). Le demandeur est notifié des réponses
  (cloche + email).

## 7. Espace Super admin

Navigation « Pilotage » : _Tableau de bord, Utilisateurs, Écoles, Support,
Paramètres_.

- **Tableau de bord** (`/app/superadmin`) : vue d'ensemble de la plateforme
  (organisations, comptes, activité).
- **Utilisateurs** (`/app/users`) : liste filtrable par rôle de tous les
  comptes ; création de comptes à privilèges (administrateur d'école — rattaché
  à une organisation —, support…) et suppression.
- **Écoles** (`/app/ecoles`) : gestion des **organisations** (établissements) :
  création, modification (nom, ville), suppression, et gestion des **types
  d'établissement** (référentiel libre : créer un type à la volée, le
  supprimer).

## 8. Notifications

- **Cloche** (barre supérieure de l'application) : toutes les notifications
  in-app — types `journal`, `message`, `bilan`, `echeance`, `ticket`,
  `system` — avec lien direct vers l'écran concerné.
- **Emails** : seuls les événements importants sont doublés par email
  (**bilan, échéance, ticket, système**) ; les événements conversationnels à
  haute fréquence (journal, messagerie) restent in-app pour ne pas saturer les
  boîtes. Les emails contiennent un bouton « Ouvrir Kizuna » vers la page
  concernée.

## 9. Mode démo

- La page **`/demo`** présente les **6 profils de démonstration** (le trinôme :
  alternant Léa Marin, tuteur pédagogique, tuteur entreprise ; et l'équipe
  plateforme : admin, support, super admin). Un clic connecte directement le
  profil, sans inscription.
- Comptes seedés : `alternant@kizuna.dev`, `peda@kizuna.dev`,
  `entreprise@kizuna.dev`, `admin@kizuna.dev`, `support@kizuna.dev`,
  `superadmin@kizuna.dev` — mot de passe commun `Password123!`.
- Une fois connecté avec un compte de démo, une **barre flottante de
  changement de rôle** apparaît : elle permet de « changer de casquette » en un
  clic ; un tuteur fraîchement incarné atterrit directement sur le dossier de
  l'alternante de démo. Des **coachmarks** guident la découverte des écrans
  clés.

## 10. FAQ — problèmes courants

| Problème                                                | Cause probable                                     | Solution                                                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mot de passe oublié                                     | —                                                  | Lien « Mot de passe oublié » sur `/login` : un email de réinitialisation est envoyé (nécessite un SMTP configuré côté serveur ; en développement, le lien est affiché dans les logs de l'API). |
| Accès 2FA perdu (téléphone changé)                      | Le code TOTP n'est plus générable                  | Contacter l'administrateur : la désactivation en libre-service exige le mot de passe **et** l'accès au compte ; à défaut, intervention côté plateforme.                                        |
| « Fichier trop volumineux » au dépôt d'un document      | Fichier au-delà de la limite serveur               | La limite est `MAX_UPLOAD_MB` (10 Mo par défaut). Compresser le fichier ou demander à l'exploitant d'augmenter la limite.                                                                      |
| Un tuteur ne voit pas son alternant                     | Trinôme non constitué                              | L'administrateur de l'école doit créer l'**association** (Espace école → Associations).                                                                                                        |
| Emails non reçus                                        | SMTP non configuré, ou événement in-app uniquement | Vérifier la configuration SMTP (voir manuel de déploiement) ; rappel : journal et messagerie ne génèrent **pas** d'email, seulement une notification in-app.                                   |
| Entrée de journal refusée                               | Statut « Modifications demandées »                 | Corriger l'entrée selon la demande du tuteur d'entreprise et la soumettre à nouveau.                                                                                                           |
| Impossible de planifier un bilan / ajouter une échéance | Rôle insuffisant                                   | Ces actions sont réservées aux tuteurs et à l'administration (l'alternant est en consultation).                                                                                                |
| Animations gênantes, texte trop petit                   | Préférences d'affichage                            | Utiliser le **FAB Accessibilité** (bas droite) : taille du texte, contraste, réduction des animations…                                                                                         |
