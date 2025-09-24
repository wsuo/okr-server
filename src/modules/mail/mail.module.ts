import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailService } from './mail.service';
import mailConfig from './mail.config';

@Module({
  imports: [
    ConfigModule.forFeature(mailConfig),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: configService.get('mail.transport'),
        defaults: configService.get('mail.defaults'),
        template: {
          dir: configService.get('mail.template.dir'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}