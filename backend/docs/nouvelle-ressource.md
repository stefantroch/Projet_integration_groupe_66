# Créer une nouvelle ressource (module NestJS)

Guide à suivre chaque fois qu'on ajoute un groupe de routes au backend (`animaux`, `trophees`, …).

> **Contexte MVP** : il n'y a pas de côté admin. Les données (animaux, trophées) sont insérées par le **seed**, pas par l'API.
> L'API est donc en **lecture seule** pour ces ressources : uniquement des `GET`.
> Les seules écritures côté utilisateur sont celles liées à son compte (ex. débloquer un animal, obtenir un trophée).

---

## 1. Lancer la commande

Depuis le dossier `backend/` :

```bash
npx @nestjs/cli g resource <nom>
```

Exemple : `npx @nestjs/cli g resource trophees`

Le CLI pose deux questions :

| Question | Réponse |
|---|---|
| *What transport layer do you use?* | **REST API** |
| *Would you like to generate CRUD entry points?* | **No** si la ressource est en lecture seule (cas du MVP), **Yes** seulement si on a besoin de `POST`/`PATCH`/`DELETE` |

Répondre **No** évite de générer les DTO, le dossier `entities/` et les 5 méthodes CRUD qu'il faudrait ensuite supprimer à la main.

---

## 2. Ce que la commande génère

Avec **No** (lecture seule) :

```
src/<nom>/
├── <nom>.module.ts           ← regroupe le controller et le service
├── <nom>.controller.ts       ← les routes HTTP (vide)
├── <nom>.service.ts          ← la logique + les requêtes Prisma (vide)
├── <nom>.controller.spec.ts  ← test : "le controller se construit"
└── <nom>.service.spec.ts     ← test : "le service se construit"
```

Avec **Yes** (CRUD), en plus :

```
├── dto/
│   ├── create-<nom>.dto.ts   ← forme du body attendu pour un POST
│   └── update-<nom>.dto.ts   ← idem pour un PATCH (tous les champs optionnels)
└── entities/
    └── <nom>.entity.ts       ← classe vide (inutile avec Prisma, voir étape 3)
```

et le controller contient 5 routes : `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.

---

## 3. Nettoyer (seulement si on a répondu Yes)

### 3.1 Supprimer `entities/`

Toujours. Ce dossier sert aux projets TypeORM. Chez nous, le type d'un modèle vient du contract Prisma (`src/prisma/contract.prisma`).

### 3.2 Supprimer les routes inutiles

Pour une ressource en lecture seule, dans le **controller** :
- garder `findAll` (`GET /`) et `findOne` (`GET /:id`) ;
- **supprimer** `create`, `update`, `remove` (`POST`, `PATCH`, `DELETE`) ;
- retirer les imports devenus inutiles : `Post`, `Patch`, `Delete`, `Body`, et les DTO.

Dans le **service** :
- supprimer `create`, `update`, `remove` ;
- retirer les imports des DTO.

Puis **supprimer le dossier `dto/`**.

> ⚠️ **Supprimer, ne pas commenter.** Un `/* ... */` mal fermé avale la fin du fichier et casse la compilation (`error TS1010: '*/' expected`). Git garde l'historique si on en a besoin un jour.
>
> ⚠️ Pourquoi pas de `DELETE` / `PATCH` « au cas où » : toutes les routes sont accessibles à **n'importe quel utilisateur connecté**. Une route `DELETE /api/animaux/:id` permettrait à un joueur de vider le pokédex de tout le monde.

---

## 4. Adapter le controller à nos conventions

### 4.1 Préfixer la route par `api/`

```ts
@Controller('api/<nom>')   // et non @Controller('<nom>')
```

Toutes nos routes sont sous `/api`, comme celles de Better Auth (`/api/auth/...`).

### 4.2 Utiliser `ParseIntPipe` pour les ids

Le CLI génère :

```ts
@Get(':id')
findOne(@Param('id') id: string) {
  return this.service.findOne(+id);
}
```

À remplacer par :

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.service.findOne(id);
}
```

Les paramètres d'URL arrivent toujours en texte. `+id` convertit `"abc"` en `NaN` sans erreur ; `ParseIntPipe` répond directement **400 Bad Request** si l'id n'est pas un entier, et la méthode n'est même pas appelée.
Penser à l'importer depuis `@nestjs/common`.

### Exemple de controller final (lecture seule)

```ts
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AnimauxService } from './animaux.service.js';

@Controller('api/animaux')
export class AnimauxController {
  constructor(private readonly animauxService: AnimauxService) {}

  // Liste pour le pokédex
  @Get()
  findAll() {
    return this.animauxService.findAll();
  }

  // Fiche d'un animal
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.animauxService.findOne(id);
  }
}
```

---

## 5. Enregistrer le module dans `api.module.ts`

**Le CLI ne le fait pas chez nous** : il cherche un fichier `*.module.ts` directement dans `src/`, or notre `app.module.ts` est dans `src/app/`. Sans cette étape, les routes n'existent pas au démarrage du serveur.

`src/api/api.module.ts` :

```ts
import { Module } from '@nestjs/common';
import { AnimauxModule } from '../animaux/animaux.module.js';
import { TropheesModule } from '../trophees/trophees.module.js';

@Module({
  imports: [AnimauxModule, TropheesModule],
})
export class ApiModule {}
```

> Les imports se terminent par **`.js`** même si le fichier est en `.ts` : le projet est en ESM.

---

## 6. Écrire le service avec Prisma 8

Le service généré renvoie des textes bidon (`"This action returns all ..."`). On les remplace par des requêtes Prisma via l'objet `db` :

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class AnimauxService {
  async findAll() {
    return db.orm.public.Animal.all();
  }

  async findOne(idAnimal: number) {
    const animal = await db.orm.public.Animal.where({ idAnimal }).first();
    if (!animal) throw new NotFoundException('Animal introuvable');
    return animal;
  }
}
```

À retenir :
- Prisma 8 n'utilise **pas** `prisma.animal.findMany()`. La syntaxe est `db.orm.public.<Modèle>` suivi de `.where({...})`, `.first()`, `.all()`, `.include('relation')`…
- Les noms de modèles et de champs sont ceux de `src/prisma/contract.prisma` (`Animal`, `idAnimal`, `AnimalDebloque`…).
- Pour une erreur HTTP, on **lance une exception** (`NotFoundException` → 404, `BadRequestException` → 400…) au lieu de faire `res.status(...)`.
- Doc complète : `.claude/skills/prisma-8/references/queries-postgres.md`.

---

## 7. Authentification

La lib `@thallesp/nestjs-better-auth` active un **guard global** : **toutes les routes exigent d'être connecté** par défaut (sinon 401). Rien à ajouter pour protéger une route.

### Récupérer l'utilisateur connecté

Utile dès que la réponse dépend du joueur (ses animaux débloqués, ses trophées…) :

```ts
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

@Get()
findAll(@Session() session: UserSession) {
  return this.animauxService.findAllForUser(Number(session.user.id));
}
```

`session.user.id` est converti avec `Number(...)` car nos ids en base sont des entiers.

### Rendre une route publique

```ts
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@AllowAnonymous()
@Get()
findAll() { ... }
```

---

## 8. La dépendance `@nestjs/mapped-types`

À chaque `g resource`, le CLI ajoute `"@nestjs/mapped-types": "*"` dans `package.json` s'il n'y est pas déjà. Elle ne sert qu'aux DTO de mise à jour (`PartialType`).

On la garde (elle servira quand il y aura un côté admin), mais avec une vraie version au lieu de `"*"` :

```json
"@nestjs/mapped-types": "^12.0.0",
```

Une fois présente, le CLI ne la touche plus.

---

## 9. Vérifier avant de commit

Depuis `backend/` :

```bash
npx tsc --noEmit     # le projet compile ? (aucune sortie = OK)
npm test             # les tests .spec.ts passent ?
npm run lint         # pas d'imports inutilisés ?
```

Puis tester la route avec un fichier `.http` (voir `auth.http`) : d'abord se connecter (`sign-in`), ensuite appeler la route. Le cookie de session est réutilisé automatiquement.

---

## Checklist rapide

- [ ] `npx @nestjs/cli g resource <nom>` → **REST API**, CRUD **No** (lecture seule)
- [ ] Si CRUD **Yes** : supprimer `entities/`, les routes/méthodes en trop, `dto/` et les imports orphelins
- [ ] `@Controller('api/<nom>')`
- [ ] `ParseIntPipe` sur les `:id`
- [ ] Module ajouté dans `src/api/api.module.ts` (import en `.js`)
- [ ] Service : requêtes `db.orm.public.<Modèle>` à la place des textes bidon
- [ ] `@Session()` si la réponse dépend du joueur
- [ ] `@nestjs/mapped-types` avec une vraie version dans `package.json`
- [ ] `npx tsc --noEmit`, `npm test`, `npm run lint` OK
