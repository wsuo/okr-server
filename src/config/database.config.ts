import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// 确保在CLI运行时加载.env文件
config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'okr_system',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: false,
  charset: 'utf8mb4',
  extra: {
    connectionLimit: 10,
    connectTimeout: 60000,
  },
  ssl: false,
};

// TypeORM CLI 使用的配置
const dataSourceOptions: DataSourceOptions = {
  ...databaseConfig,
} as DataSourceOptions;

export const AppDataSource = new DataSource(dataSourceOptions);