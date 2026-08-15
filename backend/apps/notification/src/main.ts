import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Removed global prefix so Kong strip_path works uniformly
  // app.setGlobalPrefix('notification-service');

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
  app.use(cookieParser());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription(
      'API documentation for Notification Service - Comprehensive notification management including channels, templates, scheduling, and delivery',
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
    .addTag('notifications', 'Notification Management')
    .addTag('channels', 'Notification Channels')
    .addTag('templates', 'Template Management')
    .addTag('preferences', 'User Preferences')
    .addTag('schedules', 'Notification Scheduling')
    .addTag('delivery', 'Notification Delivery')
    .addTag('logs', 'Notification Logs & History')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('notification-service/docs', app, document);

  const port = process.env.PORT || 3014;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Notification Service running on http://0.0.0.0:${port}`);
  console.log(
    `📍 Health check: http://localhost:${port}/notification-service/health`,
  );
  console.log(
    `📍 API Documentation: http://localhost:${port}/notification-service/docs`,
  );
}

bootstrap();