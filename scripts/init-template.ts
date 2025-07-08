import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedModule } from '../src/database/seeds/seed.module';
import { SeedService } from '../src/database/seeds/seed.service';

async function bootstrap() {
  console.log('🚀 开始初始化默认考核模板...');
  
  const app = await NestFactory.create(AppModule);
  const seedService = app.select(SeedModule).get(SeedService);
  
  try {
    await seedService.runDefaultTemplate();
    console.log('✅ 模板初始化完成!');
  } catch (error) {
    console.error('❌ 模板初始化失败:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();