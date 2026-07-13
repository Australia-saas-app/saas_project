import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './user.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'adminpassword',
      database: process.env.DB_NAME || 'saas_db',
      entities: [User],
      synchronize: true, // Automatically creates tables based on entities for development
    }),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      global: true,
      secret: 'SAAS_SUPER_SECRET_KEY',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
