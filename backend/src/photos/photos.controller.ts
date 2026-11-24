import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { PhotosService } from './photos.service.js';

@Controller('api/photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  recevoirPhotos(
    @UploadedFile() image: Express.Multer.File | undefined,
    @Session() session: UserSession,
  ) {
    if (!image) throw new BadRequestException('Une photo est obligatoire');
    return this.photosService.analyser(image, Number(session?.user?.id));
  }
}
