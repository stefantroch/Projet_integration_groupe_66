# Dataset iNaturalist

Depuis ce dossier, avec `.venv` activé (`requests` et `Pillow` sont déjà installés) :

```bash
python download_dataset.py --help
python download_dataset.py --dry-run --count 2 --per-page 5 --max-pages 2
python download_dataset.py --species "Panthera leo" --count 1
python download_dataset.py
```

La dernière commande vise **200 images par espèce**, pour les cinq espèces prévues.
La cible inclut les images déjà présentes et vérifiées dans le manifeste. Une nouvelle
exécution reprend la recherche depuis le début et ignore les observations déjà enregistrées.
Les limites `--max-pages` et `--max-requests` peuvent arrêter la collecte avant la cible.

Pour un essai isolé, utiliser `--output /tmp/inat-essai`. `--dry-run` interroge seulement
les métadonnées : aucune image téléchargée et aucun fichier créé. Il compte des candidats,
sans pouvoir valider leur contenu ni dédupliquer leurs octets.

## Sélection et provenance

- Résolution du nom scientifique exact en taxon actif de rang espèce ; les sous-espèces
  et autres descendants sont acceptés. Le nom réellement observé reste dans le CSV.
- Observations sauvages (`captive=false`), de qualité `research` par défaut.
  `--quality-grade needs_id` permet un jeu distinct, moins fiable.
- Une seule image acceptée par observation ; exclusion des photos signalées ou masquées.
- Licences photo autorisées par défaut : `cc0`, `cc-by`, `cc-by-sa`. Le filtre API
  signifie « au moins une photo autorisée » : chaque photo est donc revérifiée localement.
  `--licenses` accepte aussi explicitement `cc-by-nc` et `cc-by-nc-sa`.
  Les licences ND, inconnues et les photos sans licence sont exclues.
- `manifest.csv` contient sources observation/photo, URL téléchargée, attribution exacte
  fournie par iNaturalist, licence photo, lien vers sa famille de licence, observateur,
  licence de l'observation (distincte), taxon, qualité, date, chemin, dimensions et SHA-256.
  L'API ne précise pas ici la version des licences BY : les liens BY du CSV ne la supposent pas.
- Les conditions BY, SA et éventuellement NC restent à respecter lors d'une réutilisation.
  La qualité `research` ne garantit ni la visibilité de l'animal ni l'absence d'erreur :
  inspecter les images avant l'entraînement.

## Fiabilité et limites

Pagination par `id_above` en ordre d'ID croissant, 30 résultats par requête par défaut
(`--per-page` configurable jusqu'à 200), sans dépasser la cible `--count`.
Si la réponse JSON dépasse 30 Mio, le lot est divisé par deux et la même page est
redemandée sans avancer le curseur. La taille réduite reste utilisée pour la suite.
Ces tentatives comptent dans le budget de requêtes, mais pas comme pages traitées.
Une observation qui dépasse seule 30 Mio provoque une erreur explicite.
Appels séquentiels espacés d'au moins 1,1 seconde par défaut, y compris les retries et
photos. Le transfert média ajoute un délai correspondant à 500 000 octets/seconde.
Erreurs réseau, HTTP 429 et 5xx : retries exponentiels avec jitter et respect de
`Retry-After` (secondes ou date HTTP). Les autres erreurs HTTP ne sont pas retentées.
Budget par exécution : 2 000 requêtes, configurable jusqu'à 10 000 ; ce compteur
n'est pas partagé entre exécutions. Tenir compte des autres usages de la même connexion
et éviter de lancer plusieurs collectes dans des dossiers différents en parallèle.

Chaque image est limitée à 10 Mio par défaut, décodée et vérifiée avec Pillow,
avec un côté minimum de 256 pixels. Déduplication globale par ID de photo,
ID d'observation et SHA-256 des octets téléchargés. Ce n'est pas une comparaison
perceptuelle : deux recadrages ou encodages différents peuvent subsister.

Écriture de l'image via un fichier `.part`, puis remplacement atomique et ajout au CSV
avec synchronisation disque. Un verrou empêche deux écritures concurrentes dans le
même dossier (macOS/Linux). Les fichiers du manifeste sont vérifiés au redémarrage ;
une image absente ou altérée provoque une erreur explicite. Après une interruption
entre image et CSV, une image orpheline peut rester ; la même destination sera réécrite
lors de la reprise. Conserver le CSV avec les photos.

Pour modifier les licences, la qualité ou la taille d'un jeu déjà créé, préférer un
nouveau `--output` : les fichiers existants ne sont pas supprimés ou convertis.
Les doublons exacts sont évités, mais les photos proches d'une même sortie peuvent
subsister : grouper les données par observation/observateur lors du futur découpage
train/validation/test pour réduire les fuites.

Codes de sortie : `0` objectif atteint ; `2` cible partiellement atteinte (épuisement
des résultats ou limite de pages) ; `1` erreur ou budget épuisé ; `130` interruption.
Les données déjà inscrites au manifeste sont conservées en cas d'erreur.

## Étape 2 : train / validation / test

Depuis `ai-recognition`, avec le Python de `.venv` (Pillow déjà installé) :

```bash
.venv/bin/python split_dataset.py --help
.venv/bin/python split_dataset.py --dry-run
.venv/bin/python split_dataset.py --seed 42
```

Les chemins par défaut sont relatifs au script, même depuis un autre répertoire.
Les images de `data/raw/<espèce>/` sont **copiées**, sans redimensionnement, dans
`data/splits/train|val|test/<espèce>/`. Les sous-dossiers éventuels sont conservés.
Les originaux et le CSV d'origine restent inchangés. Aucun accès réseau nécessaire.
Une destination contenant des fichiers est refusée ; les dossiers vides préexistants
sont acceptés. Pour comparer une autre seed, choisir un autre dossier :

```bash
.venv/bin/python split_dataset.py --seed 123 --output data/splits_seed123
.venv/bin/python split_dataset.py --source data/raw --manifest data/raw/manifest.csv --ratios 0.70 0.15 0.15 --dry-run
```

Le manifeste `source/manifest.csv` est détecté automatiquement. Un manifeste fourni
doit comporter `path` (relatif à la source) et `observation_id` ; le format du
téléchargeur est directement compatible. Les empreintes `sha256`, si présentes,
sont comparées aux fichiers. Les chemins absents, répétés ou extérieurs à la source
provoquent une erreur. Sans manifeste, ou pour les images sans identifiant,
un avertissement indique que le regroupement par observation ne peut pas être garanti.

Chaque image est vérifiée avec Pillow et son SHA-256 est recalculé. Les photos d'une
même observation et les fichiers aux octets identiques sont regroupés **transitivement**,
puis affectés ensemble. Les doublons sont conservés et comptés ; si un groupe porte
plusieurs étiquettes d'espèce, le script s'arrête pour faire corriger ces étiquettes.
Cette détection n'identifie pas les recadrages, réencodages ou photos visuellement
proches. Des observations différentes d'un même animal ou d'un même observateur
peuvent encore se retrouver dans des ensembles différents.

Le tirage est stratifié par dossier d'espèce : groupes mélangés avec la seed,
puis affectation des plus grands groupes en premier pour approcher 70/15/15 en
nombre d'images. Les groupes restent entiers : les proportions sont donc approchées
et peuvent s'écarter sensiblement pour de gros groupes. Il faut au moins trois
groupes indépendants par espèce ; chaque ensemble reçoit au moins un groupe.
À fichiers, chemins, manifeste, ratios et seed identiques, l'affectation est reproductible.

Le tableau affiché donne les effectifs par espèce. Deux rapports accompagnent les copies :

- `data/splits/summary.json` : seed, ratios visés, effectifs et pourcentages obtenus,
  groupes par espèce, doublons exacts et avertissements.
- `data/splits/split_manifest.csv` : un enregistrement par image, chemin d'origine,
  chemin de copie relatif à `data/splits`, ensemble, groupe, observation et SHA-256.
  Les colonnes `original_*` conservent les métadonnées de provenance et de licence
  du manifeste d'origine ; `original_path` reste relatif à `data/raw`.

Avant publication de la destination, le script vérifie la couverture des images,
les comptes, l'absence d'observation/doublon partagé entre ensembles, le SHA-256
de chaque copie et la stabilité des sources. Les copies sont préparées dans un
dossier temporaire voisin, nettoyé en cas d'erreur normale. Prévoir l'espace disque
pour une copie du dataset. Ne pas lancer le téléchargeur pendant la séparation.
`--dry-run` effectue les contrôles des sources et des affectations sans créer de fichiers.
Codes de sortie : `0` succès, `1` erreur de données ou d'écriture, `2` arguments CLI invalides.
Les images générées et l'environnement `.venv` ne doivent pas être ajoutés à Git.

## Références vérifiées le 16 octobre 2026

- [API v1 et schéma officiel](https://github.com/inaturalist/iNaturalistAPI/blob/main/lib/views/swagger_v1.yml.ejs)
- [Bonnes pratiques API](https://www.inaturalist.org/pages/api+recommended+practices)
- [Développeurs et limites](https://www.inaturalist.org/pages/developers)

Pour des volumes importants, iNaturalist recommande ses exports ou les jeux GBIF.
