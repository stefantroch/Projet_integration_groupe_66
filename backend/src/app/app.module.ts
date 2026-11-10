import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApiModule } from '../api/api.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    ApiModule,AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
