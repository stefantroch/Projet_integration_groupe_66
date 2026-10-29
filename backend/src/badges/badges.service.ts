import { Injectable, NotFoundException } from '@nestjs/common';
import {db} from '../prisma/db.js'

@Injectable()
export class BadgesService {
  

  findAll(idUtilisateur: Number) {
    return `This action returns all badges`;
  }

  async findOne(id: number) {
    const badge = await db.orm.public.badges.where({idUtilisateur : id });
    if (!badge) throw new NotFoundException('Badge introuvable');
    return badge 
  }

}
