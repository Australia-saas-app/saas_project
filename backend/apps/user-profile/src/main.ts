import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.set('trust proxy', 1);
  
  const { json, urlencoded } = require('express');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Global prefix
  app.setGlobalPrefix('user-profile-service');

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
    .setTitle('User Profile Service API')
    .setDescription(
      'API documentation for User Profile Service - User profile management, preferences, verification, and activity tracking',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token from SSO service',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('profile', 'User Profile Management')
    .addTag('preferences', 'User Preferences and Settings')
    .addTag('activity', 'User Activity Tracking')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('user-profile-service/docs', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 User Profile Service running on http://0.0.0.0:${port}`);
  console.log(
    `📍 Health check: http://localhost:${port}/user-profile-service/health`,
  );
  console.log(
    `📍 API Documentation: http://localhost:${port}/user-profile-service/docs`,
  );
}

bootstrap();
