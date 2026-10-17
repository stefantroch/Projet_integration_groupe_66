import { NestFactory } from '@nestjs/core';
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
  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
