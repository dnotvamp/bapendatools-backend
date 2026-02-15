import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Tools Heri')
    .setDescription('Berikan Kemudahan Dalam Administrasi')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
  });

  await app.listen(3000);
}

bootstrap();
