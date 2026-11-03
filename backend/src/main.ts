import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module.js';
import { frontendOrigins } from './auth/auth.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });
  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });

  // Doc Swagger sur /api/docs (pas en production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Projet 66')
      .setDescription('Routes du backend. Les routes /api/auth/* (Better Auth) ne sont pas listées ici.')
      .addCookieAuth('better-auth.session_token')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
