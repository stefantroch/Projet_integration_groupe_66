import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { BadgesService } from './badges.service.js';

@ApiTags('badges')
@Controller('api/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  // Tous les trophées (avec obtenu: true/false pour le joueur connecté)
  @Get()
  findAll(@Session() session: UserSession) {
    return this.badgesService.findAll(Number(session.user.id));
  }

  // Détail d'un trophée via son ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.badgesService.findOne(id);
  }
}
