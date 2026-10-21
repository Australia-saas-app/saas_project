import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import {
  ThrottlerModule,
  ThrottlerGuard,
  ThrottlerModuleOptions,
} from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { ScheduleModule } from "@nestjs/schedule";
import { randomUUID } from "crypto";
import { GalleryModule } from "./gallery/gallery.module";
import { NoticeModule } from "./notice/notice.module";
import { BlogModule } from "./blog/blog.module";
import { ContactUsModule } from "./contact-us/contact-us.module";
import { TeamModule } from "./team/team.module";
import { BranchModule } from "./branch/branch.module";
import { AdminModule } from "./admin/admin.module";
import { HealthModule } from "./health/health.module";
import { CommonModule } from "./common/common.module";
import { CompanyModule } from "./company/company.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../config/env.example"].filter(Boolean),
    }),
    HttpModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get("HTTP_TIMEOUT", 30000),
        maxRedirects: 5,
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv =
          configService.get("NODE_ENV") || process.env.NODE_ENV || "production";
        const isProduction = nodeEnv === "production";

        const pinoHttpConfig: any = {
          level: isProduction ? "info" : "debug",
          genReqId: (req) =>
            (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
        };

        if (!isProduction) {
          try {
            require.resolve("pino-pretty");
            pinoHttpConfig.transport = {
              target: "pino-pretty",
              options: { singleLine: true },
            };
          } catch {
            // fall back to JSON logs
          }
        }

        return { pinoHttp: pinoHttpConfig };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: Number(configService.get("RATE_LIMIT_TTL") ?? 60),
            limit: Number(configService.get("RATE_LIMIT_MAX") ?? 100),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DB_HOST", "localhost"),
        port: Number(configService.get("DB_PORT", 5432)),
        username: configService.get("DB_USERNAME", "postgres"),
        password: configService.get("DB_PASSWORD", "password"),
        database: configService.get("DB_NAME", "platform_db"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: true,
        logging: configService.get("NODE_ENV") !== "production",
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    GalleryModule,
    NoticeModule,
    BlogModule,
    ContactUsModule,
    TeamModule,
    BranchModule,
    AdminModule,
    HealthModule,
    CommonModule,
    CompanyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
