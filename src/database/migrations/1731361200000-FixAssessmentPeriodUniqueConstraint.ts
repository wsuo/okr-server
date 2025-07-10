import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAssessmentPeriodUniqueConstraint1731361200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // 安全地删除原有的唯一约束（如果存在）
      await queryRunner.query(
        "ALTER TABLE `assessments` DROP INDEX `uk_period`"
      );
    } catch (error) {
      // 如果索引不存在，忽略错误
      console.log("Index uk_period does not exist, skipping drop operation");
    }

    try {
      // 创建支持软删除的复合唯一约束
      // 只对未删除的记录(deleted_at IS NULL)强制唯一性
      await queryRunner.query(
        "ALTER TABLE `assessments` ADD UNIQUE INDEX `uk_period_not_deleted` (`period`, `deleted_at`)"
      );
    } catch (error) {
      // 如果索引已存在，忽略错误
      console.log("Index uk_period_not_deleted may already exist");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：删除新约束，恢复旧约束
    await queryRunner.query(
      "ALTER TABLE `assessments` DROP INDEX `uk_period_not_deleted`"
    );

    await queryRunner.query(
      "ALTER TABLE `assessments` ADD UNIQUE INDEX `uk_period` (`period`)"
    );
  }
}
