import { getApi } from "@/lib/api";

// Une fiche animal telle que renvoyée par GET /api/animaux
// (debloque = true/false pour le joueur connecté)
export type Animal = {
  idAnimal: number;
  nom: string;
  famille: string;
  habitat: string;
  alimentation: string;
  description: string;
  imageFiche: string;
  debloque: boolean;
};

// Un habitat n'a pas de route dédiée : on le reconstruit à partir du champ `habitat` des animaux
export type Habitat = {
  nom: string;            // valeur du champ `habitat` (sert aussi de clé dans l'URL)
  animaux: Animal[];
  debloques: number;      // nombre d'animaux débloqués par le joueur
  total: number;          // nombre total d'animaux dans cet habitat
  imageUrl: string | null; // photo de l'habitat : null tant qu'elle n'est pas en base
};

// Charge tous les animaux puis les regroupe par habitat
export async function chargerHabitats(): Promise<Habitat[]> {
  const animaux = await getApi<Animal[]>("/animaux");

  // Regroupement : une clé = un habitat, une valeur = la liste de ses animaux
  const parHabitat = new Map<string, Animal[]>();
  for (const animal of animaux) {
    const liste = parHabitat.get(animal.habitat) ?? [];
    liste.push(animal);
    parHabitat.set(animal.habitat, liste);
  }

  return [...parHabitat.entries()].map(([nom, liste]) => ({
    nom,
    animaux: liste,
    debloques: liste.filter((a) => a.debloque).length,
    total: liste.length,
    imageUrl: null, // à remplacer par l'URL venant de la base de données
  }));
}
