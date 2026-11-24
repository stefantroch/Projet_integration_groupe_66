import { Module } from '@nestjs/common';
import { AnimauxModule } from '../animaux/animaux.module.js';
import { BadgesModule } from '../badges/badges.module.js';
import { PhotosModule } from '../photos/photos.module.js'

@Module({
  imports: [AnimauxModule,BadgesModule,PhotosModule],
})
export class ApiModule {}



