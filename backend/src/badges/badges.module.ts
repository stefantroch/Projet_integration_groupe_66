import { Module } from '@nestjs/common';
import { BadgesService } from './badges.service.js';
import { BadgesController } from './badges.controller.js';

@Module({
  controllers: [BadgesController],
  providers: [BadgesService],
})
export class BadgesModule {}
