import { Module } from '@nestjs/common';
import { AnimauxModule } from '../animaux/animaux.module.js';
import { BadgesModule } from '../badges/badges.module.js';

@Module({
  imports: [AnimauxModule,BadgesModule],
})
export class ApiModule {}



