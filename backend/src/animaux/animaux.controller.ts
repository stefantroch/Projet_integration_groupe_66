import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { AnimauxService } from './animaux.service.js';


@Controller('api/animaux')
export class AnimauxController {
  constructor(private readonly animauxService: AnimauxService) {}


  // Get all pour le pokédex (avec debloque: true/false pour le joueur connecté)
  @Get()
  findAll(@Session() session: UserSession) {
    return this.animauxService.findAll(Number(session.user.id));
  }
  //Retrouver l'animal via son ID 
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.animauxService.findOne(id);
  }
}
  /*
  ParseIntPipe est la vérif de next js l'année passée pas oublier son import
  router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'id invalide' });

  ParseIntPipe, c'est exactement ces deux lignes de vérification, mais en déclaratif. Tu l'écris une fois dans le paramètre et tu ne t'en occupes plus. Bonus : le type devient id: number, donc TypeScript sait que c'est un nombre dans toute la suite du code.

Nest fournit d'autres pipes du même genre : ParseBoolPipe, ParseUUIDPipe, ParseEnumPipe… et ValidationPipe, qui valide un @Body() complet avec les DTO.
  // ...
*/



