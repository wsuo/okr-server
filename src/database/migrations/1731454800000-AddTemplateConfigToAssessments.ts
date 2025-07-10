import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTemplateConfigToAssessments1731454800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加template_config字段到assessments表
    await queryRunner.addColumn(
      "assessments",
      new TableColumn({
        name: "template_config",
        type: "json",
        isNullable: true,
        comment: "模板配置快照，考核发布时复制模板配置到此字段",
      })
    );

    // 为已发布的考核补充配置数据
    await queryRunner.query(`
      UPDATE assessments a 
      JOIN templates t ON a.template_id = t.id 
      SET a.template_config = t.config 
      WHERE a.status IN ('active', 'completed', 'ended') AND a.template_config IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("assessments", "template_config");
  }
}
