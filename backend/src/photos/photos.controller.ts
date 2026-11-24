import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PhotosService } from './photos.service.js';
import { CreatePhotoDto } from './dto/create-photo.dto.js';
import { UpdatePhotoDto } from './dto/update-photo.dto.js';
import {BadRequestException,UploadedFile,UseInterceptors} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';



@Controller('api/photos')
export class PhotosController {
  constructor(private readonly PhotosService: PhotosService) {}
  @Post()
  @UseInterceptors(
    FileInterceptor('image',{
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  recevoirPhotos(@UploadedFile() image: Express.Multer.File | undefined){
    //vérifie qu'une photo est bien envoyée
    if (!image) {
      throw new BadRequestException('Une photo est obligatoire')
    }
    return this.PhotosService.analyser(image);
  }
}

