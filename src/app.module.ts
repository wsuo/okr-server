import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import { ThrottlerModule } from "@nestjs/throttler";
import { WinstonModule } from "nest-winston";
import { RequestLoggerMiddleware } from "./common/middleware";

import { databaseConfig } from "./config/database.config";
import { cacheConfig } from "./config/cache.config";
import { loggerConfig } from "./config/logger.config";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { RolesModule } from "./modules/roles/roles.module";
import { AssessmentsModule } from "./modules/assessments/assessments.module";
import { OkrsModule } from "./modules/okrs/okrs.module";
import { EvaluationsModule } from "./modules/evaluations/evaluations.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { StatisticsModule } from "./modules/statistics/statistics.module";
import { SeedModule } from "./database/seeds/seed.module";

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.get("DB_HOST"),
        port: configService.get("DB_PORT"),
        username: configService.get("DB_USERNAME"),
        password: configService.get("DB_PASSWORD"),
        database: configService.get("DB_DATABASE"),
        entities: [__dirname + "/entities/*.entity{.ts,.js}"],
        migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
        synchronize: false,
        logging: false,
        charset: "utf8mb4",
        extra: {
          connectionLimit: 10,
          connectTimeout: 60000,
        },
        ssl: false,
      }),
      inject: [ConfigService],
    }),

    // 缓存模块
    CacheModule.registerAsync(cacheConfig),

    // 限流模块
    ThrottlerModule.forRoot({
      ttl: 60000,
      limit: 100,
    }),

    // 日志模块
    WinstonModule.forRoot(loggerConfig),

    // 业务模块
    AuthModule,
    UsersModule,
    DepartmentsModule,
    RolesModule,
    AssessmentsModule,
    OkrsModule,
    EvaluationsModule,
    TemplatesModule,
    StatisticsModule,
    SeedModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
