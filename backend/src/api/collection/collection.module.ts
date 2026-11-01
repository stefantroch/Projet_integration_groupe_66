import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller.js';

@Module({
  controllers: [CollectionController],
})
export class CollectionModule {}