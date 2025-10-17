import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAssessment22TemplateConfigAndEmployee15EvaluationData1753241399000 implements MigrationInterface {
    name = 'FixAssessment22TemplateConfigAndEmployee15EvaluationData1753241399000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 修复考核22和员工15的数据问题...');

        // 1. 修复员工15(李蕾)在考核22中的领导评分数据结构
        console.log('📝 修复考核22员工15的领导评分数据结构...');
        try {
            // 移除异常的leader_evaluation分类，保留标准的work_performance和daily_management
            const correctedDetailedScores = [
                {
                    "items": [
                        { "score": 92, "itemId": "work_saturation", "comment": "" },
                        { "score": 90, "itemId": "work_execution", "comment": "" },
                        { "score": 90, "itemId": "work_completion", "comment": "" },
                        { "score": 88, "itemId": "work_efficiency", "comment": "工作效率可以再提升一下" },
                        { "score": 90, "itemId": "work_quality", "comment": "" }
                    ],
                    "categoryId": "work_performance",
                    "categoryScore": 90
                },
                {
                    "items": [
                        { "score": 92, "itemId": "work_attitude", "comment": "" },
                        { "score": 92, "itemId": "approval_process", "comment": "" },
                        { "score": 86, "itemId": "attendance", "comment": "在有人员入职的时候早点到公司" },
                        { "score": 88, "itemId": "work_report", "comment": "交代的工作及时反馈进度" },
                        { "score": 96, "itemId": "team_activity", "comment": "" },
                        { "score": 95, "itemId": "office_environment", "comment": "" },
                        { "score": 98, "itemId": "rule_compliance", "comment": "" }
                    ],
                    "categoryId": "daily_management",
                    "categoryScore": 92.1
                }
            ];

            await queryRunner.query(`
                UPDATE evaluations
                SET detailed_scores = ?
                WHERE assessment_id = 22
                  AND evaluatee_id = 15
                  AND type = 'leader'
            `, [JSON.stringify(correctedDetailedScores)]);

            console.log('✅ 已修复员工15的领导评分数据结构');
        } catch (error) {
            console.warn('⚠️ 修复员工15的领导评分数据时出错:', error.message);
        }

        // 2. 修复考核22的模板配置快照缺失
        console.log('📸 修复考核22的模板配置快照...');
        try {
            // 从模板8获取完整配置
            const [template] = await queryRunner.query(`
                SELECT config FROM templates WHERE id = 8 LIMIT 1
            `);

            if (template && template.config) {
                // 更新考核22的template_config
                await queryRunner.query(`
                    UPDATE assessments
                    SET template_config = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = 22
                `, [template.config]);

                console.log('✅ 已修复考核22的模板配置快照');

                // 验证修复结果
                const [result] = await queryRunner.query(`
                    SELECT id, JSON_EXTRACT(template_config, '$.scoring_rules.scoring_mode') as scoring_mode
                    FROM assessments WHERE id = 22
                `);

                if (result) {
                    console.log(`✅ 验证成功：考核22的scoring_mode=${result.scoring_mode}`);
                }
            } else {
                console.warn('⚠️ 无法找到模板8的配置');
            }
        } catch (error) {
            console.warn('⚠️ 修复考核22模板配置时出错:', error.message);
        }

        // 3. 数据一致性验证
        console.log('🔍 进行数据一致性验证...');
        try {
            // 验证所有参与者的评分分类数量一致
            const [stats] = await queryRunner.query(`
                SELECT
                    COUNT(DISTINCT evaluatee_id) as total_participants,
                    SUM(CASE WHEN JSON_LENGTH(detailed_scores) = 2 THEN 1 ELSE 0 END) as correct_count
                FROM evaluations
                WHERE assessment_id = 22 AND type = 'leader'
            `);

            console.log(`📊 考核22的leader评分验证: ${stats.correct_count}/${stats.total_participants} 名员工的评分结构正确`);
        } catch (error) {
            console.warn('⚠️ 验证数据一致性时出错:', error.message);
        }

        console.log('✅ 数据修复完成！');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 回滚数据修复...');

        // 1. 如果需要回滚，将template_config设为NULL
        await queryRunner.query(`
            UPDATE assessments
            SET template_config = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = 22
        `);

        console.log('✅ 数据回滚完成！');
    }
}
