# Projet_integration_groupe_66

Projet d'integration 3T EPHEC Gregory, Gaspard, Benjamin, Gildas, Lucas D, Stefan T


# Frontend

**React Native + Expo**

Pour initialiser le développement avec expo sur sa machine locale : https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=physical

Lancer le server expo : 

* web : npm run web
* iOS : npm run ios
* android : npm run android

# Backend

**NestJS + Prisma ORM 8**

lancer le server backend : 

* npm run start:dev



# db : PostgreSql



# WorkFlow en développement 

## Déploiement de l'app sur le serveur de développement 

A chaque push d'un développeur, le front, le back et la db sont déployés dans un container distinct sur le serveur de développement.

- Un dockerfile permet de conteneuriser le frontend
- Un dockerfile permet de conteneuriser le backend
- Un docker compose lance les 2 dockerfile + un conteneur postgresql, il crée également un volume permettant de garder les données du conteneur postgresql.


# Lancement de l'app en local avec Expo Go sur un téléphone
# Remplacer l'adresse par l'IP Wi-Fi/LAN de cet ordinateur (sur macOS : ipconfig getifaddr en0).
EXPO_HOST_IP=192.168.1.42 docker compose -f compose.dev.yml up -d --build

Expo démarre dans le conteneur et affiche un QR code dans ses logs :
`docker compose -f compose.dev.yml logs -f frontend`. Le téléphone doit être sur
le même réseau Wi-Fi ; scanner ce QR code avec Expo Go. Le backend reste publié
sur le port 3000 de l'ordinateur. Dans le code de l'application, utiliser
`http://192.168.1.42:3000` (la même IP que `EXPO_HOST_IP`) pour les appels API,
car `localhost` sur le téléphone désigne le téléphone lui-même.
