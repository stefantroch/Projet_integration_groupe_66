# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


## Authentification avec le backend

Le backend utilise Better Auth. En développement web, l'URL de base des routes
d'authentification est `http://localhost:3000/api/auth`.

### Routes utilisables avec la configuration actuelle

Les chemins ci-dessous sont à ajouter à l'URL de base.

| Méthode | Route | Utilité | Corps JSON |
| --- | --- | --- | --- |
| `POST` | `/sign-up/email` | Créer un compte | `{ "name": "greg", "email": "greg@example.com", "password": "MonMotDePasse123!" }` |
| `POST` | `/sign-in/email` | Se connecter | `{ "email": "greg@example.com", "password": "MonMotDePasse123!" }` |
| `GET` | `/get-session` | Récupérer l'utilisateur connecté et sa session | Aucun |
| `POST` | `/sign-out` | Se déconnecter | `{}` |
| `POST` | `/update-user` | Modifier le pseudo ou l'image du profil | `{ "name": "nouveauPseudo" }` ou `{ "image": "https://..." }` |
| `POST` | `/change-password` | Modifier son mot de passe | `{ "currentPassword": "...", "newPassword": "...", "revokeOtherSessions": true }` |
| `GET` | `/list-sessions` | Lister ses sessions actives | Aucun |
| `POST` | `/revoke-session` | Fermer une session précise | `{ "token": "token-de-la-session" }` |
| `POST` | `/revoke-sessions` | Fermer toutes ses sessions | `{}` |
| `POST` | `/revoke-other-sessions` | Fermer les autres sessions | `{}` |
| `GET` | `/list-accounts` | Lister les comptes liés à l'utilisateur | Aucun |

Les routes de profil, de mot de passe, de gestion des sessions et de liste des
comptes nécessitent une connexion. Certaines opérations sensibles peuvent
nécessiter une session récente et donc une nouvelle connexion.
`/get-session` renvoie `{ user, session }`, ou `null` sans session valide.

Le champ du pseudo est **`name` dans les requêtes et les réponses**, même s'il
est enregistré dans la colonne `pseudo` en base de données.

### Fonctionnalités nécessitant une configuration supplémentaire

Ces routes sont fournies par Better Auth, mais le parcours correspondant n'est
pas encore configuré dans le backend du projet.

| Méthode | Route | Configuration ou condition nécessaire |
| --- | --- | --- |
| `POST` | `/request-password-reset` | Configurer `emailAndPassword.sendResetPassword` pour envoyer l'email ; corps : `{ "email": "greg@example.com", "redirectTo": "http://localhost:8081/reset-password" }` |
| `POST` | `/reset-password` | Disposer d'un token valide issu du parcours de réinitialisation ; corps : `{ "token": "...", "newPassword": "..." }` |
| `POST` | `/send-verification-email` | Configurer `emailVerification.sendVerificationEmail` ; corps : `{ "email": "greg@example.com", "callbackURL": "http://localhost:8081" }` |
| `GET` | `/verify-email?token=...` | Disposer d'un token de vérification valide |
| `POST` | `/change-email` | Activer `user.changeEmail` et configurer le parcours de changement d'email |
| `POST` | `/delete-user` | Activer `user.deleteUser` |
| `POST` | `/sign-in/social` | Configurer un fournisseur social, comme Google |
| `POST` | `/link-social` | Configurer un fournisseur social pour lier un compte à l'utilisateur connecté |

Les URL frontend de retour (`redirectTo` et `callbackURL`) sont des exemples :
les écrans correspondants doivent être créés dans l'application.

### Appels depuis le frontend web

Utiliser `credentials: 'include'` sur les appels pour recevoir et transmettre le
cookie de session. Le navigateur ajoute automatiquement l'en-tête `Origin`.

```ts
const AUTH_URL = 'http://localhost:3000/api/auth';

// Inscription : name correspond au pseudo.
const signUpResponse = await fetch(`${AUTH_URL}/sign-up/email`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'greg',
    email: 'greg@example.com',
    password: 'MonMotDePasse123!',
  }),
});
const signUpData = await signUpResponse.json();
if (!signUpResponse.ok) throw new Error(signUpData.message);

// Connexion avec un compte existant.
const signInResponse = await fetch(`${AUTH_URL}/sign-in/email`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'greg@example.com',
    password: 'MonMotDePasse123!',
  }),
});
const signInData = await signInResponse.json();
if (!signInResponse.ok) throw new Error(signInData.message);

// Utilisateur connecté : null si aucune session n'est valide.
const sessionResponse = await fetch(`${AUTH_URL}/get-session`, {
  credentials: 'include',
});
const sessionData = await sessionResponse.json();
if (!sessionResponse.ok) throw new Error(sessionData?.message);
// sessionData?.user.name contient le pseudo.

// Déconnexion.
const signOutResponse = await fetch(`${AUTH_URL}/sign-out`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
if (!signOutResponse.ok) {
  const error = await signOutResponse.json();
  throw new Error(error.message);
}
```

L'origine frontend autorisée par défaut est `http://localhost:8081`. Pour en
autoriser d'autres, modifier `FRONTEND_ORIGINS` dans `backend/.env`, puis
redémarrer le backend :

```env
FRONTEND_ORIGINS="http://localhost:8081,https://mon-frontend.example.com"
```

Ces exemples concernent le navigateur web. Sur un téléphone physique,
`localhost` désigne le téléphone : adapter l'adresse du backend et prévoir la
gestion des cookies de session pour le client natif.

La configuration serveur est dans
[`backend/src/auth/auth.config.ts`](../../backend/src/auth/auth.config.ts).
Voir aussi le [README du backend](../../backend/README.md).
