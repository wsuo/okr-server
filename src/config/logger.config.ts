import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export const loggerConfig: WinstonModuleOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp} [${context}] ${level}: ${message}`;
        }),
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/error/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/combined/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/http/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      level: 'http',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};