import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class BadgesService {

  // Tous les trophées, avec obtenu: true/false pour le joueur connecté
  async findAll(idUtilisateur: number) {
    const trophees = await db.orm.public.Trophee.all();
    const obtenus = await db.orm.public.TropheeUtilisateur.where({ idUtilisateur }).all();

    const resultat = [];
    for (const trophee of trophees) {
      const obtenu = obtenus.find((o) => o.idTrophee === trophee.idTrophee);

      const fiche = {
        idTrophee: trophee.idTrophee,
        nom: trophee.nom,
        description: trophee.description,
        conditionObtention: trophee.conditionObtention,
        icone: trophee.icone,
        obtenu: obtenu !== undefined,
        dateObtention: obtenu ? obtenu.dateObtention : null,
      };

      resultat.push(fiche);
    }

    return resultat;
  }

  // Nombre d'animaux débloqués par le joueur
  async progression(idUtilisateur: number) {
    const debloques = await db.orm.public.AnimalDebloque.where({ idUtilisateur }).all();
    return { captureCount: debloques.length };
  }

  async findOne(id: number) {
    const badge = await db.orm.public.Trophee.where({ idTrophee: id }).first();
    if (!badge) throw new NotFoundException('Badge introuvable');
    return badge;
  }
}