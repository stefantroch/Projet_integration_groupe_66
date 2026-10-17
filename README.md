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


# Lancement de l'app en local
docker compose -f compose.dev.yml up -d --build
