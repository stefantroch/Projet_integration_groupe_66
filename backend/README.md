# Backend

Backend NestJS du projet.

## Installation

```bash
npm install
```

## Lancement

```bash
npm run start:dev
```

## Tests

```bash
npm run test
npm run test:e2e
```
## Authentification et base de données

Better Auth et Prisma utilisent la même table `Utilisateur`. Better Auth y
enregistre le compte utilisateur ; Prisma y accède avec
`db.orm.public.Utilisateur` et conserve les relations avec les animaux et trophées.

La configuration commune est dans `src/auth/auth.config.ts` :

- `name` côté Better Auth correspond à `pseudo` dans la base.
- `createdAt` et `updatedAt` correspondent à `dateCreation` et `dateModification`.
- `idUtilisateur` côté Prisma correspond à la colonne SQL `id`.
- Better Auth renvoie les identifiants sous forme de chaînes ; utiliser
  `Number(session.user.id)` pour les requêtes Prisma sur `idUtilisateur`.
- Le mot de passe haché est dans `account.password`. `Utilisateur` ne contient
  plus de champ `mdpHash`.
- `Session`, `Account` et `Verification` sont également décrits dans Prisma,
  avec les tables SQL `session`, `account` et `verification`.

Better Auth conserve son adaptateur PostgreSQL/Kysely, compatible avec le runtime
Prisma ORM 8 utilisé ici. Le schéma et les migrations sont gérés par Prisma.
La CLI Prisma est en version 8 ; `.npmrc` permet l'installation malgré la
contrainte de version de l'adaptateur Prisma classique facultatif de Better Auth,
qui n'est pas utilisé dans ce projet.

### Migrations

Depuis le dossier `backend` :

```bash
npm run contract:emit
npx prisma migration plan --name nom_du_changement
npm run db:migrate
```

La migration `20261014T1953_better_auth_utilisateur` remplace les anciennes
tables d'authentification uniquement si `Utilisateur`, `user`, `account`,
`session` et `verification` sont vides. Elle s'arrête sans supprimer de données
si l'une d'elles contient des lignes. Une base contenant déjà des comptes
nécessite une migration de ces comptes avant d'appliquer ce changement.

Ne pas exécuter l'ancien SQL dans `better-auth_migrations` sur le nouveau schéma :
il représente l'ancienne configuration et recréerait la table `user` séparée.

### Vérification de l'authentification

```bash
npm run test:auth
```

Ce test utilise `DATABASE_URL` pour créer une base temporaire, puis la supprime.
Le rôle PostgreSQL doit pouvoir créer des bases. Il vérifie le refus de migration
sur des comptes existants, l'inscription, la connexion, les cookies de session,
la déconnexion et les relations Prisma avec les animaux et les trophées.

Pour une inscription, appeler `POST /api/auth/sign-up/email` avec :

```json
{
  "name": "mon_pseudo",
  "email": "utilisateur@example.com",
  "password": "un-mot-de-passe-solide"
}
```

Pour une connexion, appeler `POST /api/auth/sign-in/email` avec `email` et
`password`. Les requêtes suivantes doivent transmettre le cookie de session.

### Appels depuis le frontend web

`http://localhost:8081` est autorisé par défaut. La même liste sert à
`trustedOrigins` de Better Auth et à CORS dans NestJS, avec `credentials: true`.
Pour changer cette liste, définir dans `backend/.env`, puis redémarrer le backend :

```env
FRONTEND_ORIGINS="http://localhost:8081,https://mon-frontend.example.com"
```

Dans le frontend, utiliser `credentials: 'include'` pour envoyer et recevoir
les cookies de session. Le navigateur ajoute automatiquement l'en-tête `Origin` :

```ts
const response = await fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

Utiliser également `credentials: 'include'` pour `get-session` et `sign-out`.
Dans `auth.http`, la variable `origin` simule l'adresse du frontend pour le test.
