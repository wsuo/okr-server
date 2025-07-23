import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBossEvaluationToAssessmentParticipants1753241397000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查字段是否已存在，避免重复添加
    const table = await queryRunner.getTable("assessment_participants");
    const bossCompletedColumn = table?.findColumnByName("boss_completed");
    const bossScoreColumn = table?.findColumnByName("boss_score");
    const bossSubmittedAtColumn = table?.findColumnByName("boss_submitted_at");

    // 添加上级评分完成状态字段
    if (!bossCompletedColumn) {
      await queryRunner.query(`
        ALTER TABLE \`assessment_participants\` 
        ADD COLUMN \`boss_completed\` TINYINT(1) NOT NULL DEFAULT 0 
        COMMENT '上级评分完成状态：0-未完成，1-已完成' 
        AFTER \`leader_completed\`
      `);
    }

    // 添加上级评分字段
    if (!bossScoreColumn) {
      await queryRunner.query(`
        ALTER TABLE \`assessment_participants\` 
        ADD COLUMN \`boss_score\` DECIMAL(5,2) NULL 
        COMMENT '上级评分（0-100分）' 
        AFTER \`leader_score\`
      `);
    }

    // 添加上级评分提交时间字段
    if (!bossSubmittedAtColumn) {
      await queryRunner.query(`
        ALTER TABLE \`assessment_participants\` 
        ADD COLUMN \`boss_submitted_at\` TIMESTAMP NULL 
        COMMENT '上级评分提交时间' 
        AFTER \`leader_submitted_at\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚时删除添加的字段
    await queryRunner.query(`
      ALTER TABLE \`assessment_participants\` 
      DROP COLUMN IF EXISTS \`boss_submitted_at\`,
      DROP COLUMN IF EXISTS \`boss_score\`,
      DROP COLUMN IF EXISTS \`boss_completed\`
    `);
  }
}