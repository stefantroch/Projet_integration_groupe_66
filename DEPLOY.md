# Déploiement en production (VPS + Docker Compose)

Architecture : un seul domaine, un reverse proxy Caddy devant tout.

```
Internet ──► Caddy (80/443, HTTPS auto)
               ├── /api/*  ──► backend  (NestJS + Better Auth, port 3000 interne)
               └── le reste ─► frontend (nginx, export web statique Expo)
             postgres (réseau interne uniquement, volume persistant)
```

## 1. Prérequis

- Un VPS Linux (Ubuntu 22.04/24.04), **2 Go de RAM recommandés** (le build Expo + Nest est gourmand ; avec 1 Go, ajouter du swap).
- Ports **80 et 443** ouverts (pare-feu du VPS / de l'hébergeur).
- Un **nom de domaine** avec un enregistrement DNS `A` vers l'IP du VPS (ex. `app.mondomaine.be`).
  HTTPS est fortement conseillé : en production, Better Auth peut marquer les cookies de session `Secure`, donc sans HTTPS la connexion risque de ne pas fonctionner.
- Docker + plugin Compose : <https://docs.docker.com/engine/install/ubuntu/>

## 2. Premier déploiement

```bash
git clone https://github.com/stefantroch/Projet_integration_groupe_66.git
cd Projet_integration_groupe_66

cp .env.prod.example .env.prod
nano .env.prod          # remplir SITE_ADDRESS, PUBLIC_URL, POSTGRES_PASSWORD, BETTER_AUTH_SECRET
                        # openssl rand -hex 24   -> POSTGRES_PASSWORD
                        # openssl rand -base64 32 -> BETTER_AUTH_SECRET

docker compose -f compose.prod.yml --env-file .env.prod up -d --build
```

Ordre de démarrage automatique : postgres → `migrate` (applique les migrations Prisma, puis s'arrête) → backend → frontend → Caddy.

Vérifications :

```bash
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs migrate     # doit finir sans erreur
docker compose -f compose.prod.yml logs -f backend
```

Puis ouvrir `https://app.mondomaine.be`. Le certificat HTTPS est obtenu automatiquement par Caddy au premier accès (quelques secondes).

Test rapide de l'auth côté API : `curl -i https://app.mondomaine.be/api/auth/ok`

## 3. Mettre à jour (après un push)

```bash
cd Projet_integration_groupe_66
git pull
docker compose -f compose.prod.yml --env-file .env.prod up -d --build
```

Les nouvelles migrations sont appliquées automatiquement par le service `migrate`.

## 4. Sauvegarde / restauration de la base

```bash
# sauvegarde
docker compose -f compose.prod.yml exec -T postgres \
  pg_dump -U projet66 projet66 > backup_$(date +%F).sql

# restauration (sur une base vide)
docker compose -f compose.prod.yml exec -T postgres \
  psql -U projet66 projet66 < backup_2026-11-03.sql
```

(adapter `projet66` si `POSTGRES_USER` / `POSTGRES_DB` ont été changés)

## 5. Dépannage

| Symptôme | Piste |
|---|---|
| `migrate` en erreur | `docker compose -f compose.prod.yml logs migrate` ; le backend ne démarre pas tant que la migration échoue (voulu). |
| Certificat HTTPS non obtenu | Le DNS pointe-t-il bien vers le VPS ? Ports 80/443 ouverts ? `docker compose -f compose.prod.yml logs caddy` |
| Login qui échoue / erreur d'origine | `PUBLIC_URL` doit être exactement l'URL du navigateur (https, sans slash final). Après modification : `docker compose ... up -d`. |
| Changement de `EXPO_PUBLIC_API_URL` sans effet | Cette variable est intégrée au bundle : relancer avec `--build`. |
| Tout réinitialiser (⚠ efface la base) | `docker compose -f compose.prod.yml down -v` |

## 6. À savoir

- Seul le **web** est déployé. Une app native (Expo Go / build iOS-Android) devra viser l'API avec une URL absolue (`EXPO_PUBLIC_API_URL=https://app.mondomaine.be/api`) et son origine devra être ajoutée à `FRONTEND_ORIGINS`.
- Les nouveaux contrôleurs du backend doivent vivre sous `/api/...` pour être routés par Caddy (sinon ajouter un `handle` dans `deploy/Caddyfile`).
- `src/app/app.module.ts` contient `appKey: 'YOUR_APP_KEY'` / `appSecret: 'YOUR_APP_SECRET'` pour `@nestjs/observe` : valeurs d'exemple à remplacer ou à retirer.
- Ne jamais committer `.env.prod` (ajouté au `.gitignore`).
