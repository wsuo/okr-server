import { Injectable } from '@nestjs/common';
import { DefaultAssessmentTemplateSeed } from './default-assessment-template.seed';

@Injectable()
export class SeedService {
  constructor(
    private defaultAssessmentTemplateSeed: DefaultAssessmentTemplateSeed,
  ) {}

  async runAllSeeds(): Promise<void> {
    console.log('🌱 开始执行数据库种子数据初始化...');
    
    try {
      // 执行默认考核模板种子
      await this.defaultAssessmentTemplateSeed.run();
      
      console.log('✅ 所有种子数据初始化完成!');
    } catch (error) {
      console.error('❌ 种子数据初始化失败:', error.message);
      throw error;
    }
  }

  async runDefaultTemplate(): Promise<void> {
    console.log('🌱 初始化默认考核模板...');
    await this.defaultAssessmentTemplateSeed.run();
  }
}