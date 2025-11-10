import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAssessment23TemplateConfig1753241401000 implements MigrationInterface {
  name = "UpdateAssessment23TemplateConfig1753241401000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log("📸 同步考核23的模板配置快照为当前模板8配置...");

    try {
      const [template] = await queryRunner.query(
        `SELECT config FROM templates WHERE id = 8 LIMIT 1`
      );

      if (template && template.config) {
        await queryRunner.query(
          `UPDATE assessments SET template_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 23`,
          [template.config]
        );

        console.log("✅ 已更新考核23的 template_config，来源模板8");

        const [result] = await queryRunner.query(
          `SELECT id,
                  JSON_EXTRACT(template_config, '$.scoring_rules.two_tier_config.self_weight_in_employee_leader') AS self_weight,
                  JSON_EXTRACT(template_config, '$.scoring_rules.two_tier_config.leader_weight_in_employee_leader') AS leader_weight
           FROM assessments WHERE id = 23`
        );

        if (result) {
          console.log(
            `🔎 验证：assessment 23 自评=${result.self_weight} 领导评分=${result.leader_weight}`
          );
        }
      } else {
        console.warn("⚠️ 未找到模板8的配置，跳过更新 assessment 23");
      }
    } catch (error: any) {
      console.warn("⚠️ 更新 assessment 23 的 template_config 时出错:", error?.message || error);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log("↩️ 回滚：将考核23的 template_config 置为 NULL（如需自定义可手动恢复）...");
    await queryRunner.query(
      `UPDATE assessments SET template_config = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 23`
    );
  }
}

