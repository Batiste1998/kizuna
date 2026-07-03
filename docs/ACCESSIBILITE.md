# Accessibilité — Kizuna

> **Compétence RNCP C2.2.3** — « Le référentiel d'accessibilité choisi est présenté et justifié ;
> le prototype permet de répondre aux exigences du référentiel préalablement établi. »

Ce document présente le référentiel d'accessibilité retenu pour Kizuna, la méthode d'évaluation
appliquée, les mesures effectivement implémentées dans le code (avec preuves), ainsi que les
limites connues et le plan d'amélioration.

---

## 1. Choix du référentiel : RGAA 4.1

Le référentiel principal retenu est le **RGAA 4.1** (Référentiel Général d'Amélioration de
l'Accessibilité), publié par la DINUM.

### Justification

| Argument                     | Détail                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public cible**             | Kizuna s'adresse à des **établissements de formation français** (CFA, écoles) et à leurs alternants et tuteurs. Le RGAA est le référentiel officiel français : c'est celui que ces établissements connaissent et, pour beaucoup, celui auquel ils sont soumis.                                                   |
| **Obligation légale**        | L'article 47 de la loi n° 2005-102 impose l'accessibilité numérique aux services publics et aux organismes délégataires d'une mission de service public — ce qui couvre une large partie des établissements de formation susceptibles de déployer Kizuna. Choisir le RGAA anticipe cette exigence contractuelle. |
| **Alignement international** | Le RGAA 4.1 est la **déclinaison opérationnelle française des WCAG 2.1 niveau AA** : s'y conformer, c'est viser le standard international de fait, avec une méthode de test précise (106 critères, tests unitaires documentés) là où les WCAG restent des principes.                                             |
| **Méthode d'audit outillée** | Le RGAA fournit une grille d'audit critère par critère, exploitable pour un audit formel ultérieur (cf. § 6).                                                                                                                                                                                                    |

### OPQUAST en complément

La check-list **OPQUAST** (240 règles de qualité web) est utilisée comme référentiel
**complémentaire qualité** : elle couvre des aspects plus larges que l'accessibilité stricte
(lisibilité des liens, formulaires explicites, prévisibilité de la navigation) et a guidé des
choix transverses de Kizuna — libellés de boutons explicites, formulaires à étiquettes visibles,
états de chargement annoncés. Elle ne se substitue pas au RGAA : elle l'encadre d'une exigence de
qualité générale.

---

## 2. Périmètre et méthode

**Périmètre évalué** : l'application web (`apps/web`) — parcours d'authentification, espaces
Alternant / Tuteurs / Admin / Super Admin, panneau d'accessibilité global.

**Méthode appliquée à ce stade** :

- **Revue de code systématique** : sémantique HTML, attributs ARIA, gestion du focus,
  étiquetage des formulaires, comportement des animations (relevés au § 3).
- **Tests manuels** : parcours complet au **clavier seul** (tabulation, activation,
  flèches sur les groupes radio), **zoom navigateur jusqu'à 200 %** et agrandissement du texte
  via le panneau d'accessibilité, vérification du respect de `prefers-reduced-motion` au niveau
  du système d'exploitation.

**Ce qui n'est pas encore fait** : audit automatisé (axe-core) en intégration continue et audit
RGAA formel des 106 critères — identifiés comme axes d'amélioration au § 5. La présente
évaluation est donc une **auto-évaluation par revue de code**, pas un audit de conformité opposable.

---

## 3. Mesures implémentées, mappées sur les thématiques RGAA

Les correspondances ci-dessous renvoient aux 13 thématiques du RGAA 4.1. Chaque ligne cite le
fichier (et les lignes) où l'implémentation est vérifiable.

### 3.1 Couleurs et contrastes (thématique 3)

| Critère RGAA                                         | Implémentation Kizuna                                                                                                                                                                                                   | Preuve                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 3.2 — contraste texte/fond suffisant                 | Système de tokens de couleurs centralisé (`--foreground: #14161b` sur fond `#f5f6f8`, ratio ≈ 15:1 pour le texte principal)                                                                                             | `apps/web/src/styles.css` (l. 12-56)                                     |
| 3.2 — renforcement à la demande                      | Mode **« Contraste renforcé »** : bascule qui redéfinit les tokens (`--foreground: #000000`, `--muted-foreground: #3a3d44`, bordures assombries) pour remonter le contraste des textes secondaires et des délimitations | `apps/web/src/styles.css` (l. 491-498) ; activation via le panneau (§ 4) |
| 3.1 — l'information ne repose pas que sur la couleur | Sur le fil de compétences, les trois évaluations (alternant / tuteur pédagogique / tuteur entreprise) sont doublées d'un **résumé textuel `sr-only`** (« Auto-évaluation : Acquis. Tuteur pédagogique : non évalué… »)  | `apps/web/src/components/competences-panel.tsx` (l. 336-345)             |

### 3.2 Présentation de l'information (thématique 10)

| Critère RGAA                                    | Implémentation Kizuna                                                                                                                                                                                          | Preuve                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 10.4 — texte agrandissable                      | Trois tailles de texte (Normal / Grand / Très grand) appliquées sur la **taille racine** (`:root { font-size: 18px / 20px }`), donc toute l'interface en `rem` suit ; testé également au zoom navigateur 200 % | `apps/web/src/styles.css` (l. 472-477) |
| 10.12 — espacement des caractères et des lignes | Mode **« Espacement aéré »** : `letter-spacing: 0.03em`, `word-spacing: 0.12em`, `line-height: 1.85`                                                                                                           | `apps/web/src/styles.css` (l. 482-486) |
| Lisibilité (dyslexie)                           | Mode **« Police adaptée »** : pile de polices à haute lisibilité (`Atkinson Hyperlegible`, repli sur `Verdana`/`Tahoma`, polices reconnues pour la distinction des glyphes)                                    | `apps/web/src/styles.css` (l. 478-481) |
| 10.14 / OPQUAST — liens repérables              | Mode **« Liens soulignés »** : soulignement systématique de tous les liens (`text-decoration: underline`) pour ne pas dépendre de la seule couleur                                                             | `apps/web/src/styles.css` (l. 487-490) |

### 3.3 Animations et mouvement (thématique 13)

| Critère RGAA                                   | Implémentation Kizuna                                                                                                                                                                                                                            | Preuve                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 13.8 — mouvement contrôlable par l'utilisateur | Toutes les familles d'animations (auras, fil « thread-draw », entrées `animate-rise`/`stagger`, pulsations, shimmer des squelettes, transitions de page) sont **désactivées via `@media (prefers-reduced-motion: reduce)`**                      | `apps/web/src/styles.css` (l. 261-266, 279-284, 426-439, 454-459) |
| 13.8 — alternative applicative                 | Mode **« Réduire les animations »** du panneau : neutralise animations et transitions sur tout le DOM (`animation-duration: 0.001ms !important`…) et coupe les View Transitions, pour les utilisateurs qui ne connaissent pas le réglage système | `apps/web/src/styles.css` (l. 460-463, 499-506)                   |

### 3.4 Structure et sémantique (thématiques 8, 9, 12)

| Critère RGAA                | Implémentation Kizuna                                                                                                                        | Preuve                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 8.3/8.4 — langue de la page | `<html lang="fr">` défini à la racine de l'application                                                                                       | `apps/web/src/routes/__root.tsx` (l. 20)                                                                                                  |
| 9.2 — structure du document | Balises de repère : `<main>` (pages publiques et coquille de chargement), `<header>` et `<nav>` dans la coquille applicative                 | `apps/web/src/components/shell.tsx` (l. 5), `apps/web/src/components/app-shell.tsx` (l. 95, 198), `apps/web/src/routes/login.tsx` (l. 35) |
| 10.8 / éléments décoratifs  | Les éléments purement décoratifs (fil SVG, auras, séparateurs, grilles de fond) portent `aria-hidden` pour être ignorés des lecteurs d'écran | `apps/web/src/components/stage-auras.tsx` (l. 8), `bilans-panel.tsx` (l. 34-36), `ui/thread-timeline.tsx` (l. 14, 44)                     |
| États de chargement         | Les squelettes de chargement sont annoncés (`role="status"` + `aria-label="Chargement"`) au lieu d'un silence                                | `apps/web/src/components/ui/skeleton.tsx` (l. 14), `shell.tsx` (l. 13)                                                                    |

### 3.5 Composants riches et ARIA (thématique 7 — scripts)

Relevés réels du code :

| Composant                         | Implémentation                                                                                                                                                                                                                                           | Preuve                                                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bouton du panneau d'accessibilité | `aria-label="Options d'accessibilité"` + **`aria-expanded`** reflétant l'état ouvert/fermé                                                                                                                                                               | `apps/web/src/components/accessibility-fab.tsx` (l. 180-189)                                                                                                        |
| Interrupteurs du panneau          | `role="switch"` + **`aria-checked`** + `aria-label` reprenant l'intitulé de l'option                                                                                                                                                                     | `apps/web/src/components/accessibility-fab.tsx` (l. 211-216)                                                                                                        |
| Auto-évaluation des compétences   | `role="radiogroup"` (`aria-label="Définir votre niveau"`) contenant de **vrais `<input type="radio">`** masqués en `sr-only` : un seul point de tabulation, navigation aux **flèches** native, anneau de focus visible via `has-[:focus-visible]:ring-2` | `apps/web/src/components/competences-panel.tsx` (l. 394-412)                                                                                                        |
| Boutons-icônes                    | Tous étiquetés : « Ouvrir le menu », « Fermer le menu », « Se déconnecter », « Aide et support », « Notifications », « Envoyer », « Supprimer {intitulé} »…                                                                                              | `apps/web/src/components/app-shell.tsx` (l. 99, 110, 188, 241), `notifications-bell.tsx` (l. 82), `messagerie-panel.tsx` (l. 179), `routes/app.ecoles.tsx` (l. 287) |
| Élément de navigation actif       | `aria-current` sur la persona active du sélecteur de démonstration                                                                                                                                                                                       | `apps/web/src/components/demo-switcher.tsx` (l. 159)                                                                                                                |

### 3.6 Formulaires (thématique 11)

| Critère RGAA                         | Implémentation Kizuna                                                                                                                                                                                                                                                           | Preuve                                                                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.1 — chaque champ a une étiquette  | Composant `Label` associé par `htmlFor` sur l'ensemble des formulaires : connexion (`email`, `password`), journal (`title`, `content`), bilans (`label`, `date`), échéancier (`title`, `due`), support (`subject`, `priority`, `description`), réinitialisation de mot de passe | `apps/web/src/routes/login.tsx` (l. 52, 64), `components/journal-panel.tsx` (l. 104, 116), `bilans-panel.tsx` (l. 152, 163), `echeancier-panel.tsx` (l. 75, 86), `routes/app.support.index.tsx` (l. 314-358), `routes/reset-password.tsx` (l. 52) |
| 11.1 — champs sans étiquette visible | Étiquetage ARIA explicite : zone de message (`aria-label="Votre message"`), sélecteur de fichier (`aria-label="Choisir un fichier"`)                                                                                                                                            | `apps/web/src/components/messagerie-panel.tsx` (l. 172), `documents-panel.tsx` (l. 163-164)                                                                                                                                                       |

### 3.7 Navigation clavier (thématique 12)

| Critère RGAA                         | Implémentation Kizuna                                                                                                                                                            | Preuve                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 12.13 — ordre de tabulation cohérent | Usage systématique d'éléments **nativement focusables** (`<button>`, `<a>`, `<input>`, `<label>` + radio) plutôt que de `div` cliquables ; aucun `tabindex` positif dans le code | revue de code globale (`apps/web/src/components`, `apps/web/src/routes`)                                           |
| 10.7 — focus visible                 | Anneau de focus `focus-visible:ring` défini au niveau des primitives partagées (`Button`, `Input`, zones de texte), donc hérité partout                                          | `apps/web/src/components/ui/button.tsx` (l. 6), `ui/input.tsx` (l. 11), `components/messagerie-panel.tsx` (l. 173) |
| Confort de saisie                    | Envoi de message au clavier (`onKeyDown`), focus automatique sur le premier champ des formulaires ouverts (`autoFocus`)                                                          | `apps/web/src/components/messagerie-panel.tsx` (l. 168), `journal-panel.tsx` (l. 108)                              |

---

## 4. Le panneau d'accessibilité

Un bouton flottant (FAB) « Options d'accessibilité », présent sur **toutes les pages de
l'espace `/app`** (monté dans la coquille applicative : `apps/web/src/components/app-shell.tsx`,
l. 124), ouvre un panneau de **6 réglages** :

| Option                                            | Effet technique                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| **Taille du texte** (Normal / Grand / Très grand) | `font-size` racine 16 → 18 → 20 px, toute l'UI en `rem` suit         |
| **Police adaptée** (dyslexie)                     | Bascule sur une pile de polices à haute lisibilité                   |
| **Espacement aéré**                               | Interligne, espacement des lettres et des mots augmentés             |
| **Liens soulignés**                               | Soulignement systématique de tous les liens                          |
| **Contraste renforcé**                            | Redéfinition des tokens de couleur vers des valeurs plus contrastées |
| **Réduire les animations**                        | Neutralisation de toutes les animations et transitions               |

Fonctionnement (`apps/web/src/components/accessibility-fab.tsx`) :

- les préférences sont appliquées sous forme de **classes sur `<html>`** (`a11y-text-grand`,
  `a11y-dyslexia`, `a11y-spacing`, `a11y-underline`, `a11y-contrast`, `a11y-reduce-motion`),
  interprétées par `apps/web/src/styles.css` (l. 469-506) — l'effet est donc **global et immédiat** ;
- elles sont **persistées dans `localStorage`** (clé `kizuna-a11y`, l. 25 et 64-75) et
  réappliquées au chargement (l. 57-62) : le réglage survit à la navigation et aux sessions ;
- un bouton **« Réinitialiser »** restaure les valeurs par défaut (l. 77-85) ;
- le panneau lui-même est accessible : déclencheur avec `aria-label`/`aria-expanded`,
  interrupteurs `role="switch"`/`aria-checked`, bouton de fermeture étiqueté « Fermer ».

Ce panneau complète — sans les remplacer — les préférences système : `prefers-reduced-motion`
est respecté nativement même si l'option applicative n'est pas activée.

---

## 5. Limites connues et plan d'amélioration

Points identifiés lors de la revue, assumés comme dette d'accessibilité :

1. **Pas d'audit automatisé en CI** — intégrer **axe-core** (via `@axe-core/playwright`, les
   tests Playwright existent déjà) pour détecter les régressions à chaque push. _Priorité 1._
2. **Pas d'audit RGAA formel** — dérouler la grille officielle des **106 critères** sur un
   échantillon représentatif de pages (connexion, tableau de bord, compétences, formulaire
   support) et publier la grille. _Priorité 1._
3. **Pas de tests en situation réelle avec lecteur d'écran** (NVDA, VoiceOver) — la sémantique
   ARIA est posée mais non validée à l'usage ; à tester notamment sur le fil de compétences.
4. **Police « Atkinson Hyperlegible » non embarquée** : la pile CSS y fait référence mais la
   police n'est pas chargée par l'application (repli effectif sur Verdana/Tahoma). L'embarquer
   en auto-hébergé pour garantir l'effet du mode dyslexie.
5. **Panneau d'accessibilité** : la fermeture à la touche **Échap** et le piégeage du focus dans
   le panneau ouvert ne sont pas implémentés (fermeture actuellement au clic et via le bouton
   « Fermer »).
6. **Pas de lien d'évitement** (« Aller au contenu ») en tête de page — à ajouter (critère
   RGAA 12.7).
7. **Contrastes non mesurés exhaustivement** : les textes atténués (`--muted-foreground`) hors
   mode renforcé doivent être vérifiés au contrastemètre sur toutes les surfaces.

---

## 6. Déclaration de conformité visée

En l'état, Kizuna revendique une **conformité partielle au RGAA 4.1**, établie par
auto-évaluation (revue de code + tests manuels clavier/zoom), et **non un audit de conformité**
au sens de la méthode RGAA.

L'objectif est une progression mesurable : mise en place de l'audit automatisé en CI, réalisation
de l'audit formel des 106 critères, correction des points du § 5, puis publication d'une
déclaration d'accessibilité chiffrée (taux de conformité) accompagnée du schéma pluriannuel si la
plateforme est déployée auprès d'établissements soumis à l'obligation légale.

---

_Document rédigé dans le cadre de la compétence C2.2.3 du titre RNCP 39583 — Expert en
développement Full Stack. Dernière mise à jour : juillet 2026._
