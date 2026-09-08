import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable global validation pipe for request DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  // Strips away extra fields not defined in the DTO
      transform: true,  // Automatically transforms payloads into DTO instance
    }),
  );

  // Enable CORS for Next.js / ReactJS frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Serve Web Frontend from public/ folder
  app.useStaticAssets(join(process.cwd(), 'public'));

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Scratch & Win Application running at http://localhost:${port}`);
  console.log(`📱 Mobile Wi-Fi Access: http://192.168.0.166:${port}`);
}
bootstrap();
