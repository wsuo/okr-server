import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  transport: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  },
  defaults: {
    from: `"OKR系统" <${process.env.MAIL_USERNAME}>`,
  },
  template: {
    dir: process.cwd() + '/src/templates/email',
    adapter: 'handlebars',
    options: {
      strict: true,
    },
  },
}));