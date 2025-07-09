import { DataSource } from 'typeorm';
import { Assessment } from '../src/entities/assessment.entity';
import { Template } from '../src/entities/template.entity';

/**
 * 数据迁移脚本：为已发布的考核补充模板配置快照
 * 
 * 该脚本用于修复已发布考核的模板配置快照问题
 * 将会把已发布考核的模板配置复制到考核的template_config字段中
 */
export async function migrateAssessmentTemplateConfig(dataSource: DataSource) {
  console.log('开始迁移考核模板配置...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
    // 查询所有需要迁移的考核（已发布但没有配置快照的）
    const assessments = await queryRunner.manager
      .createQueryBuilder(Assessment, 'assessment')
      .leftJoinAndSelect('assessment.template', 'template')
      .where('assessment.status IN (:...statuses)', { 
        statuses: ['active', 'completed', 'ended'] 
      })
      .andWhere('assessment.template_config IS NULL')
      .andWhere('assessment.template_id IS NOT NULL')
      .getMany();
    
    console.log(`找到 ${assessments.length} 个需要迁移的考核`);
    
    let migratedCount = 0;
    
    for (const assessment of assessments) {
      if (assessment.template && assessment.template.config) {
        await queryRunner.manager.update(
          Assessment,
          { id: assessment.id },
          { template_config: assessment.template.config }
        );
        migratedCount++;
        console.log(`迁移考核 ${assessment.id}: ${assessment.title}`);
      } else {
        console.warn(`考核 ${assessment.id} 的模板配置不存在，跳过迁移`);
      }
    }
    
    await queryRunner.commitTransaction();
    console.log(`迁移完成，共迁移 ${migratedCount} 个考核`);
    
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 这里需要根据实际的数据库配置来创建DataSource
  console.log('请通过应用程序调用此迁移脚本');
}