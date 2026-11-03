import { Injectable, NotFoundException } from '@nestjs/common';
import {db} from '../prisma/db.js'

@Injectable()
export class AnimauxService {
  

  async findAll(idUtilisateur : number) {
   const animaux = await db.orm.public.Animal.all();
   const unlock = await db.orm.public.AnimalDebloque.where({idUtilisateur}).all();
   const idAnimauxDebloques : number [] =[];
   for (const id of  unlock){
    idAnimauxDebloques.push(id.idAnimal);
   }
   const resultat =[];
   for (const animal of animaux){
    let estDebloque = false;
    if (idAnimauxDebloques.includes(animal.idAnimal)) {
      estDebloque = true;
    }

    const fiche = {
      idAnimal: animal.idAnimal,
      nom: animal.nom,
      famille: animal.famille,
      habitat: animal.habitat,
      alimentation: animal.alimentation,
      description: animal.description,
      imageFiche: animal.imageFiche,
      debloque: estDebloque,
    };

    resultat.push(fiche);
   }

   return resultat;
  }

  async findOne(id: number) {
    const animal = await db.orm.public.Animal.where({idAnimal: id}).first();
    if(!animal) throw new NotFoundException('Animal introuvable');
    return animal;
  }


  
}
