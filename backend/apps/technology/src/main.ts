import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Removed global prefix so Kong strip_path works correctly

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
  });

  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Technology Service API')
    .setDescription(
      'API documentation for Technology Service - Managing technical services and categories',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('services', 'Technical Services Management')
    .addTag('categories', 'Technical Categories Management')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/technical/docs', app, document);

  const port = process.env.PORT || 3011;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Technology Service running on http://0.0.0.0:${port}`);
  console.log(`📍 Health check: http://localhost:${port}/api/technical/health`);
  console.log(`📍 API Documentation: http://localhost:${port}/api/technical/docs`);
}

bootstrap();
