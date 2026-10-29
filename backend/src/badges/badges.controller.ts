
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { BadgesService } from './badges.service.js';


@Controller('api/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}



  @Get()
  findAll() {
    return this.badgesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id',ParseIntPipe) id: number) {
    return this.badgesService.findOne(id);
  }

}
