import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =========================
  // Swagger Configuration
  // =========================
  const config = new DocumentBuilder()
    .setTitle('Tools Heri')
    .setDescription('Berikan Kemudahan Dalam Administrasi')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // =========================
  // Enable CORS
  // =========================
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // =========================
  // Railway Dynamic Port
  // =========================
  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
  console.log(`📄 Swagger available at /api`);
}

bootstrap();
