import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDetailedScoresToEvaluations1731454900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查字段是否已存在
    const table = await queryRunner.getTable('evaluations');
    const detailedScoresColumn = table?.findColumnByName('detailed_scores');
    
    if (!detailedScoresColumn) {
      await queryRunner.query(`
        ALTER TABLE \`evaluations\` 
        ADD COLUMN \`detailed_scores\` JSON NULL 
        COMMENT '详细评分数据，包含分类别、分项目的评分信息' 
        AFTER \`improvements\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`evaluations\` 
      DROP COLUMN \`detailed_scores\`
    `);
  }
}