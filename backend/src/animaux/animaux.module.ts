import { Module } from '@nestjs/common';
import { AnimauxService } from './animaux.service.js';
import { AnimauxController } from './animaux.controller.js';

@Module({
  controllers: [AnimauxController],
  providers: [AnimauxService],
})
export class AnimauxModule {}
