import { Module } from '@nestjs/common';
import { PhotosService } from './photos.service.js';
import { PhotosController } from './photos.controller.js';

@Module({
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
