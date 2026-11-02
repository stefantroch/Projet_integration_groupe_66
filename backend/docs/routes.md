# Routes du backend

Vue d'ensemble des routes : ce qui est fait, ce qui reste à faire, ce qui doit encore être décidé en équipe.
**À tenir à jour** à chaque route ajoutée ou modifiée.

Pour tester les routes existantes : Swagger sur `http://localhost:3000/api/docs` (en dev), ou un fichier `.http` (voir `auth.http`).

Légende : ✅ fait · 🔧 en cours · ⬜ à faire · ❓ à décider en équipe

---

## Routes de l'API (NestJS)

| Méthode | Route | Table(s) | Session ? | Statut | Remarque |
|---|---|---|---|---|---|
| GET | `/api/animaux` | `Animal` + `AnimalDebloque` | oui | ✅ | Pokédex avec `debloque: true/false` |
| GET | `/api/animaux/:id` | `Animal` | oui (guard global) | ✅ | Fiche d'un animal |
| GET | `/api/badges` | `Trophee` + `TropheeUtilisateur` | oui | ✅ | Tous les trophées avec `obtenu` et `dateObtention` |
| GET | `/api/badges/:id` | `Trophee` | oui (guard global) | ✅ | Détail d'un trophée |
| POST | `/api/animaux/debloquer` (?) | `AnimalDebloque` | oui | ❓ | Voir décision 1 |
| — | attribution d'un trophée | `TropheeUtilisateur` | — | ❓ | Voir décision 2 |
| GET | `/api/profil` | `AnimalDebloque`, `TropheeUtilisateur` | oui | ⬜ optionnel | Stats (X/Y animaux, Z trophées). Le front peut aussi les calculer |

> Toutes les routes exigent d'être connecté (guard global de Better Auth), sauf celles marquées `@AllowAnonymous()`.

---

## Routes fournies par Better Auth (rien à coder)

Elles ne sont **pas** dans Swagger : Better Auth les gère lui-même, pas via un controller Nest.

| Méthode | Route | Usage |
|---|---|---|
| POST | `/api/auth/sign-up/email` | Inscription (`name` = pseudo) |
| POST | `/api/auth/sign-in/email` | Connexion |
| POST | `/api/auth/sign-out` | Déconnexion |
| GET | `/api/auth/get-session` | Utilisateur connecté (pseudo, email, image) |
| POST | `/api/auth/update-user` | Modifier pseudo (`name`) ou avatar (`image`, URL) |
| POST | `/api/auth/change-password` | Changer de mot de passe |
| POST | `/api/auth/delete-user` | ⬜ Supprimer son compte : à activer, voir tâche « Suppression de compte » |

---

## Décisions à prendre en équipe ❓

### 1. Comment débloquer un animal ?

Une route `POST /api/animaux/:id/debloquer` qui prend juste l'id permet de tricher : n'importe quel joueur peut appeler les ids 1 à 50 et tout débloquer.

Si le déblocage se fait en scannant un QR code au zoo : ajouter un code secret par animal (ex. colonne `codeQr` dans `Animal`) et la route reçoit ce code (`POST /api/animaux/debloquer` avec `{ "code": "..." }`) au lieu de l'id.

### 2. Comment attribuer les trophées ?

Proposition : **pas de route**, mais de la logique interne appelée juste après un déblocage d'animal (le service vérifie les conditions et insère dans `TropheeUtilisateur`).

Problème : `Trophee.conditionObtention` est un texte libre, le code ne peut pas le lire. Il faut une condition structurée, par exemple :
- `typeCondition` : `"nbAnimaux"`, `"famille"`, …
- `seuil` : `10`

### 3. Un ou plusieurs zoos ?

`Animal.idZoo` existe mais il n'y a pas de modèle `Zoo` : la colonne ne pointe vers rien.
- Plusieurs zoos → ajouter un modèle `Zoo` et la relation.
- Un seul zoo → supprimer la colonne.

---

## Autres tâches backend ⬜

- [ ] **Seed** : aucun fichier de seed pour l'instant. Sans animaux ni trophées en base, les `GET` renvoient des tableaux vides. À faire en premier.
- [ ] **Suppression de compte** (RGPD) : activer `user.deleteUser.enabled: true` dans `auth.config.ts`, **et** ajouter `onDelete: Cascade` sur les relations `utilisateur` de `AnimalDebloque` et `TropheeUtilisateur` (sinon la clé étrangère bloque la suppression).
- [ ] **Pseudo déjà pris** : `pseudo` est `@unique`. Vérifier ce que renvoie une inscription avec un pseudo existant (risque d'erreur 500 au lieu d'un message clair).
- [ ] **Connexion depuis Swagger** : Better Auth n'accepte que les origines de `FRONTEND_ORIGINS` (par défaut `http://localhost:8081`). Pour se connecter depuis Swagger (`localhost:3000`), ajouter `http://localhost:3000` à `FRONTEND_ORIGINS` en dev, ou se connecter via `auth.http`.
- [ ] *(optionnel)* **Upload d'avatar** : `multer` est installé mais pas utilisé. `update-user` accepte seulement une URL d'image.
