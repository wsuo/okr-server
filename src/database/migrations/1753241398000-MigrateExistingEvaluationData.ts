import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateExistingEvaluationData1753241398000 implements MigrationInterface {
    name = 'MigrateExistingEvaluationData1753241398000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 开始迁移现有评估数据以支持Boss评估系统...');

        // 1. 更新现有评估记录的类型字段，确保使用正确的枚举值
        console.log('📝 更新评估记录类型字段...');
        await queryRunner.query(`
            UPDATE evaluations 
            SET type = CASE 
                WHEN type = 'self' THEN 'self'
                WHEN type = 'leader' THEN 'leader' 
                WHEN type = 'peer' THEN 'leader'  -- 将旧的peer类型转换为leader
                ELSE type 
            END
            WHERE type IN ('self', 'leader', 'peer')
        `);

        // 2. 更新现有评估记录的状态字段
        console.log('📝 更新评估记录状态字段...');
        await queryRunner.query(`
            UPDATE evaluations 
            SET status = CASE 
                WHEN status = 'draft' THEN 'draft'
                WHEN status = 'submitted' THEN 'submitted'
                WHEN status = 'completed' THEN 'submitted'  -- 将completed状态转换为submitted
                ELSE 'draft' 
            END
        `);

        // 3. 重新计算现有参与者的final_score（基于新的40%/60%权重）
        console.log('🧮 重新计算现有参与者的final_score（基于新权重40%/60%）...');
        await queryRunner.query(`
            UPDATE assessment_participants 
            SET final_score = ROUND(
                COALESCE(self_score, 0) * 0.4 + COALESCE(leader_score, 0) * 0.6, 
                2
            )
            WHERE self_completed = 1 
              AND leader_completed = 1 
              AND self_score IS NOT NULL 
              AND leader_score IS NOT NULL
        `);

        // 4. 为现有模板添加boss_evaluation配置（如果缺失）
        console.log('🔧 更新现有模板配置以支持Boss评估...');
        
        // 获取所有现有模板
        const templates = await queryRunner.query(`
            SELECT id, config FROM templates WHERE type = 'assessment' AND deleted_at IS NULL
        `);

        for (const template of templates) {
            try {
                let config = typeof template.config === 'string' 
                    ? JSON.parse(template.config) 
                    : template.config;

                // 如果配置中没有boss_evaluation，则添加
                if (config.scoring_rules && !config.scoring_rules.boss_evaluation) {
                    // 调整现有权重以适配新的三维度系统
                    if (config.scoring_rules.self_evaluation) {
                        // 将原有权重按90%缩放，为boss evaluation留出10%空间
                        const originalSelfWeight = config.scoring_rules.self_evaluation.weight_in_final || 0.4;
                        const originalLeaderWeight = config.scoring_rules.leader_evaluation?.weight_in_final || 0.6;
                        
                        config.scoring_rules.self_evaluation.weight_in_final = originalSelfWeight * 0.9;
                        if (config.scoring_rules.leader_evaluation) {
                            config.scoring_rules.leader_evaluation.weight_in_final = originalLeaderWeight * 0.9;
                        }
                    }

                    // 添加boss_evaluation配置
                    config.scoring_rules.boss_evaluation = {
                        enabled: true,
                        description: "上级(Boss)评估",
                        weight_in_final: 0.10,
                        is_optional: true
                    };

                    // 更新使用说明
                    if (!config.usage_instructions) {
                        config.usage_instructions = {};
                    }
                    
                    if (!config.usage_instructions.for_bosses) {
                        config.usage_instructions.for_bosses = [
                            "1. 基于整体工作表现和战略贡献进行评分",
                            "2. 关注跨部门协作和创新能力", 
                            "3. 提供高层视角的发展建议",
                            "4. 上级评分为可选项，可根据实际情况决定是否参与"
                        ];
                    }

                    // 更新模板配置
                    await queryRunner.query(`
                        UPDATE templates 
                        SET config = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    `, [JSON.stringify(config), template.id]);

                    console.log(`✅ 已更新模板 ID ${template.id} 的配置以支持Boss评估`);
                }
            } catch (error) {
                console.warn(`⚠️ 更新模板 ID ${template.id} 配置时出错:`, error.message);
            }
        }

        // 5. 更新现有考核的template_config快照（如果存在）
        console.log('📸 更新现有考核的模板配置快照...');
        const assessments = await queryRunner.query(`
            SELECT id, template_config FROM assessments 
            WHERE template_config IS NOT NULL AND deleted_at IS NULL
        `);

        for (const assessment of assessments) {
            try {
                let config = typeof assessment.template_config === 'string' 
                    ? JSON.parse(assessment.template_config) 
                    : assessment.template_config;

                if (config.scoring_rules && !config.scoring_rules.boss_evaluation) {
                    // 调整权重以适配三维度系统
                    if (config.scoring_rules.self_evaluation) {
                        const originalSelfWeight = config.scoring_rules.self_evaluation.weight_in_final || 0.4;
                        const originalLeaderWeight = config.scoring_rules.leader_evaluation?.weight_in_final || 0.6;
                        
                        config.scoring_rules.self_evaluation.weight_in_final = originalSelfWeight * 0.9;
                        if (config.scoring_rules.leader_evaluation) {
                            config.scoring_rules.leader_evaluation.weight_in_final = originalLeaderWeight * 0.9;
                        }
                    }

                    config.scoring_rules.boss_evaluation = {
                        enabled: true,
                        description: "上级(Boss)评估",
                        weight_in_final: 0.10,
                        is_optional: true
                    };

                    await queryRunner.query(`
                        UPDATE assessments 
                        SET template_config = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    `, [JSON.stringify(config), assessment.id]);

                    console.log(`✅ 已更新考核 ID ${assessment.id} 的模板配置快照`);
                }
            } catch (error) {
                console.warn(`⚠️ 更新考核 ID ${assessment.id} 配置快照时出错:`, error.message);
            }
        }

        // 6. 数据统计报告
        const stats = await this.generateMigrationStats(queryRunner);
        console.log('\n📊 数据迁移统计报告:');
        console.log(`- 更新的评估记录数: ${stats.evaluations_updated}`);
        console.log(`- 重新计算final_score的参与者数: ${stats.participants_recalculated}`);
        console.log(`- 更新的模板数: ${stats.templates_updated}`);
        console.log(`- 更新的考核配置快照数: ${stats.assessments_updated}`);

        console.log('✅ 现有评估数据迁移完成！');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 回滚现有评估数据迁移...');

        // 1. 恢复final_score计算（使用旧的30%/70%权重）
        console.log('🧮 恢复final_score计算（使用旧权重30%/70%）...');
        await queryRunner.query(`
            UPDATE assessment_participants 
            SET final_score = ROUND(
                COALESCE(self_score, 0) * 0.3 + COALESCE(leader_score, 0) * 0.7, 
                2
            )
            WHERE self_completed = 1 
              AND leader_completed = 1 
              AND self_score IS NOT NULL 
              AND leader_score IS NOT NULL
        `);

        // 2. 从模板配置中移除boss_evaluation配置
        console.log('🔧 从模板配置中移除Boss评估配置...');
        const templates = await queryRunner.query(`
            SELECT id, config FROM templates WHERE type = 'assessment' AND deleted_at IS NULL
        `);

        for (const template of templates) {
            try {
                let config = typeof template.config === 'string' 
                    ? JSON.parse(template.config) 
                    : template.config;

                if (config.scoring_rules && config.scoring_rules.boss_evaluation) {
                    // 恢复原始权重
                    if (config.scoring_rules.self_evaluation) {
                        config.scoring_rules.self_evaluation.weight_in_final = 
                            (config.scoring_rules.self_evaluation.weight_in_final || 0.36) / 0.9;
                    }
                    if (config.scoring_rules.leader_evaluation) {
                        config.scoring_rules.leader_evaluation.weight_in_final = 
                            (config.scoring_rules.leader_evaluation.weight_in_final || 0.54) / 0.9;
                    }

                    // 移除boss_evaluation配置
                    delete config.scoring_rules.boss_evaluation;

                    // 移除boss相关使用说明
                    if (config.usage_instructions && config.usage_instructions.for_bosses) {
                        delete config.usage_instructions.for_bosses;
                    }

                    await queryRunner.query(`
                        UPDATE templates 
                        SET config = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    `, [JSON.stringify(config), template.id]);
                }
            } catch (error) {
                console.warn(`⚠️ 回滚模板 ID ${template.id} 配置时出错:`, error.message);
            }
        }

        console.log('✅ 评估数据迁移回滚完成！');
    }

    private async generateMigrationStats(queryRunner: QueryRunner): Promise<{
        evaluations_updated: number;
        participants_recalculated: number;
        templates_updated: number;
        assessments_updated: number;
    }> {
        const [evaluationsCount] = await queryRunner.query(`
            SELECT COUNT(*) as count FROM evaluations 
            WHERE type IN ('self', 'leader') AND status IN ('draft', 'submitted')
        `);

        const [participantsCount] = await queryRunner.query(`
            SELECT COUNT(*) as count FROM assessment_participants 
            WHERE self_completed = 1 AND leader_completed = 1 
              AND self_score IS NOT NULL AND leader_score IS NOT NULL
        `);

        const [templatesCount] = await queryRunner.query(`
            SELECT COUNT(*) as count FROM templates 
            WHERE type = 'assessment' AND deleted_at IS NULL
        `);

        const [assessmentsCount] = await queryRunner.query(`
            SELECT COUNT(*) as count FROM assessments 
            WHERE template_config IS NOT NULL AND deleted_at IS NULL
        `);

        return {
            evaluations_updated: evaluationsCount.count || 0,
            participants_recalculated: participantsCount.count || 0,
            templates_updated: templatesCount.count || 0,
            assessments_updated: assessmentsCount.count || 0
        };
    }
}