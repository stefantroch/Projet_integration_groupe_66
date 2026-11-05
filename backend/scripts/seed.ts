// Remplit la table Animal avec les 5 espèces du MVP.
// Peut être relancé sans risque : un animal déjà présent n'est pas recréé.
import { db } from '../src/prisma/db.ts';

const animaux = [
  {
    numero: 1,
    cleModele: 'panthera_leo',
    nom: 'Lion',
    nomScientifique: 'Panthera leo',
    famille: 'Félidés',
    habitat: "Savanes et prairies d'Afrique subsaharienne ; une petite population vit en Inde.",
    alimentation: 'Carnivore : zèbres, gnous, buffles. Ce sont surtout les lionnes qui chassent, en groupe.',
    description: "Seul félin à vivre en groupe, appelé une troupe. Son rugissement s'entend jusqu'à 8 km.",
    imageFiche: 'lion.jpg',
  },
  {
    numero: 2,
    cleModele: 'panthera_tigris',
    nom: 'Tigre',
    nomScientifique: 'Panthera tigris',
    famille: 'Félidés',
    habitat: "Forêts tropicales, mangroves et taïga d'Asie.",
    alimentation: "Carnivore : cerfs et sangliers. Il chasse seul, à l'affût.",
    description: 'Le plus grand des félins. Ses rayures sont uniques, comme une empreinte digitale, et il nage très bien.',
    imageFiche: 'tigre.jpg',
  },
  {
    numero: 3,
    cleModele: 'giraffa_camelopardalis',
    nom: 'Girafe',
    nomScientifique: 'Giraffa camelopardalis',
    famille: 'Giraffidés',
    habitat: "Savanes arborées d'Afrique.",
    alimentation: "Herbivore : surtout des feuilles d'acacia, qu'elle attrape avec une langue d'environ 50 cm.",
    description: "L'animal le plus grand du monde, jusqu'à 5,5 m. Son cou a seulement 7 vertèbres, comme le nôtre.",
    imageFiche: 'girafe.jpg',
  },
  {
    numero: 4,
    cleModele: 'equus_quagga',
    nom: 'Zèbre des plaines',
    nomScientifique: 'Equus quagga',
    famille: 'Équidés',
    habitat: "Savanes et prairies d'Afrique de l'Est et d'Afrique australe.",
    alimentation: 'Herbivore : il broute surtout des herbes.',
    description: 'Chaque zèbre a des rayures uniques. Il vit en petits groupes familiaux et migre avec les gnous.',
    imageFiche: 'zebre.jpg',
  },
  {
    numero: 5,
    cleModele: 'loxodonta_africana',
    nom: "Éléphant d'Afrique",
    nomScientifique: 'Loxodonta africana',
    famille: 'Éléphantidés',
    habitat: "Savanes, forêts claires et zones semi-désertiques d'Afrique.",
    alimentation: "Herbivore : herbes, feuilles, écorce et fruits, jusqu'à 150 kg par jour.",
    description: "Le plus grand animal terrestre. Sa trompe compte environ 40 000 muscles. Le troupeau est mené par la femelle la plus âgée, la matriarche.",
    imageFiche: 'elephant.jpg',
  },
];

for (const animal of animaux) {
  const existe = await db.orm.public.Animal.where({ cleModele: animal.cleModele }).first();
  if (existe) {
    console.log(`= ${animal.nom} déjà présent`);
  } else {
    await db.orm.public.Animal.create(animal);
    console.log(`+ ${animal.nom} ajouté`);
  }
}

await db.close(); // ferme la connexion, sinon le script ne s'arrête jamais
