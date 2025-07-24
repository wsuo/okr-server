#!/usr/bin/env node

/**
 * Boss评估系统数据迁移管理工具
 * 
 * 用法:
 * npm run migration:boss -- --action=<action> [options]
 * 
 * Actions:
 * - validate: 验证现有数据状态
 * - migrate: 执行数据迁移
 * - rollback: 回滚数据迁移
 * - stats: 显示迁移统计信息
 * 
 * Options:
 * --dry-run: 模拟运行，不实际修改数据
 * --force: 强制执行（跳过确认）
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as readline from 'readline';

// 加载环境变量
config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class BossEvaluationMigrationTool {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'okr',
      synchronize: false,
      logging: false,
    });
  }

  async initialize(): Promise<void> {
    await this.dataSource.initialize();
    console.log('✅ 数据库连接已建立');
  }

  async destroy(): Promise<void> {
    await this.dataSource.destroy();
    console.log('✅ 数据库连接已关闭');
  }

  /**
   * 验证现有数据状态
   */
  async validateData(options: { dryRun: boolean }): Promise<void> {
    console.log('🔍 验证现有数据状态...\n');

    // 1. 检查评估记录状态
    const evaluationStats = await this.dataSource.query(`
      SELECT 
        type,
        status,
        COUNT(*) as count
      FROM evaluations 
      GROUP BY type, status
      ORDER BY type, status
    `);

    console.log('📊 评估记录统计:');
    console.table(evaluationStats);

    // 2. 检查参与者完成状态
    const participantStats = await this.dataSource.query(`
      SELECT 
        self_completed,
        leader_completed,
        boss_completed,
        COUNT(*) as count,
        COUNT(CASE WHEN final_score IS NOT NULL THEN 1 END) as with_final_score
      FROM assessment_participants 
      WHERE deleted_at IS NULL
      GROUP BY self_completed, leader_completed, boss_completed
      ORDER BY self_completed, leader_completed, boss_completed
    `);

    console.log('\n📊 参与者完成状态统计:');
    console.table(participantStats);

    // 3. 检查模板配置
    const templateStats = await this.dataSource.query(`
      SELECT 
        id,
        name,
        CASE 
          WHEN config LIKE '%boss_evaluation%' THEN 'Has Boss Config'
          ELSE 'No Boss Config'
        END as boss_config_status
      FROM templates 
      WHERE type = 'assessment' AND deleted_at IS NULL
    `);

    console.log('\n📊 模板配置状态:');
    console.table(templateStats);

    // 4. 检查权重不一致的数据
    const inconsistentScores = await this.dataSource.query(`
      SELECT 
        COUNT(*) as count
      FROM assessment_participants 
      WHERE self_completed = 1 
        AND leader_completed = 1 
        AND self_score IS NOT NULL 
        AND leader_score IS NOT NULL
        AND ABS(final_score - (self_score * 0.4 + leader_score * 0.6)) > 0.01
    `);

    console.log(`\n⚠️  权重不一致的记录数: ${inconsistentScores[0].count}`);

    // 5. 数据完整性检查
    const integrityIssues = await this.dataSource.query(`
      SELECT 
        'Missing self evaluation' as issue,
        COUNT(*) as count
      FROM assessment_participants ap
      WHERE ap.self_completed = 1 
        AND NOT EXISTS (
          SELECT 1 FROM evaluations e 
          WHERE e.evaluatee_id = ap.user_id 
            AND e.assessment_id = ap.assessment_id 
            AND e.type = 'self'
        )
      UNION ALL
      SELECT 
        'Missing leader evaluation' as issue,
        COUNT(*) as count
      FROM assessment_participants ap
      WHERE ap.leader_completed = 1 
        AND NOT EXISTS (
          SELECT 1 FROM evaluations e 
          WHERE e.evaluatee_id = ap.user_id 
            AND e.assessment_id = ap.assessment_id 
            AND e.type = 'leader'
        )
    `);

    console.log('\n🔍 数据完整性检查:');
    console.table(integrityIssues);
  }

  /**
   * 执行数据迁移
   */
  async migrateData(options: { dryRun: boolean; force: boolean }): Promise<void> {
    if (!options.force) {
      const confirmed = await this.askConfirmation(
        '⚠️  这将修改现有数据。是否继续？(y/N)'
      );
      if (!confirmed) {
        console.log('❌ 操作已取消');
        return;
      }
    }

    console.log('🔄 开始执行数据迁移...');

    if (options.dryRun) {
      console.log('🔍 模拟运行模式 - 不会实际修改数据\n');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      if (!options.dryRun) {
        await queryRunner.startTransaction();
      }

      // 1. 更新评估记录类型
      console.log('📝 更新评估记录类型...');
      const typeUpdateQuery = `
        UPDATE evaluations 
        SET type = CASE 
          WHEN type = 'peer' THEN 'leader'
          ELSE type 
        END
        WHERE type = 'peer'
      `;
      
      if (options.dryRun) {
        const peersCount = await queryRunner.query(`
          SELECT COUNT(*) as count FROM evaluations WHERE type = 'peer'
        `);
        console.log(`  - 将更新 ${peersCount[0].count} 条 peer 类型记录为 leader`);
      } else {
        await queryRunner.query(typeUpdateQuery);
        console.log('  ✅ 评估记录类型更新完成');
      }

      // 2. 重新计算final_score
      console.log('🧮 重新计算final_score...');
      const scoreUpdateQuery = `
        UPDATE assessment_participants 
        SET final_score = ROUND(
          COALESCE(self_score, 0) * 0.4 + COALESCE(leader_score, 0) * 0.6, 
          2
        )
        WHERE self_completed = 1 
          AND leader_completed = 1 
          AND self_score IS NOT NULL 
          AND leader_score IS NOT NULL
      `;

      if (options.dryRun) {
        const participantsCount = await queryRunner.query(`
          SELECT COUNT(*) as count FROM assessment_participants 
          WHERE self_completed = 1 AND leader_completed = 1 
            AND self_score IS NOT NULL AND leader_score IS NOT NULL
        `);
        console.log(`  - 将重新计算 ${participantsCount[0].count} 个参与者的final_score`);
      } else {
        const result = await queryRunner.query(scoreUpdateQuery);
        console.log(`  ✅ 已重新计算 ${result.affectedRows} 个参与者的final_score`);
      }

      // 3. 更新模板配置
      console.log('🔧 更新模板配置...');
      const templates = await queryRunner.query(`
        SELECT id, name, config FROM templates 
        WHERE type = 'assessment' AND deleted_at IS NULL
      `);

      let updatedTemplates = 0;
      for (const template of templates) {
        try {
          let config = typeof template.config === 'string' 
            ? JSON.parse(template.config) 
            : template.config;

          if (config.scoring_rules && !config.scoring_rules.boss_evaluation) {
            if (!options.dryRun) {
              // 调整权重
              if (config.scoring_rules.self_evaluation) {
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

              await queryRunner.query(`
                UPDATE templates 
                SET config = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
              `, [JSON.stringify(config), template.id]);
            }
            updatedTemplates++;
          }
        } catch (error) {
          console.warn(`  ⚠️  模板 ${template.name} (ID: ${template.id}) 更新失败:`, error.message);
        }
      }

      console.log(`  ✅ 已更新 ${updatedTemplates} 个模板配置`);

      if (!options.dryRun) {
        await queryRunner.commitTransaction();
        console.log('\n✅ 数据迁移完成！');
      } else {
        console.log('\n✅ 模拟运行完成，无数据修改');
      }

    } catch (error) {
      if (!options.dryRun) {
        await queryRunner.rollbackTransaction();
      }
      console.error('❌ 迁移失败:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 显示统计信息
   */
  async showStats(): Promise<void> {
    console.log('📊 Boss评估系统统计信息\n');

    // Boss评估记录统计
    const bossEvaluations = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM evaluations WHERE type = 'boss'
    `);

    // Boss完成状态统计
    const bossCompletions = await this.dataSource.query(`
      SELECT 
        boss_completed,
        COUNT(*) as count,
        AVG(boss_score) as avg_score
      FROM assessment_participants 
      WHERE deleted_at IS NULL
      GROUP BY boss_completed
    `);

    // 三维度完成统计
    const threeDimensionStats = await this.dataSource.query(`
      SELECT 
        self_completed,
        leader_completed,
        boss_completed,
        COUNT(*) as count
      FROM assessment_participants 
      WHERE deleted_at IS NULL
      GROUP BY self_completed, leader_completed, boss_completed
      ORDER BY self_completed DESC, leader_completed DESC, boss_completed DESC
    `);

    console.log(`Boss评估记录总数: ${bossEvaluations[0].count}`);
    console.log('\nBoss完成状态统计:');
    console.table(bossCompletions);
    console.log('\n三维度评估完成统计:');
    console.table(threeDimensionStats);
  }

  private askConfirmation(question: string): Promise<boolean> {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (!action) {
    console.log(`
使用方法:
  npm run migration:boss -- --action=<action> [options]

Actions:
  validate  验证现有数据状态
  migrate   执行数据迁移  
  rollback  回滚数据迁移
  stats     显示迁移统计信息

Options:
  --dry-run  模拟运行，不实际修改数据
  --force    强制执行（跳过确认）

示例:
  npm run migration:boss -- --action=validate
  npm run migration:boss -- --action=migrate --dry-run
  npm run migration:boss -- --action=migrate --force
    `);
    process.exit(1);
  }

  const tool = new BossEvaluationMigrationTool();

  try {
    await tool.initialize();

    switch (action) {
      case 'validate':
        await tool.validateData({ dryRun });
        break;
      case 'migrate':
        await tool.migrateData({ dryRun, force });
        break;
      case 'stats':
        await tool.showStats();
        break;
      default:
        console.error(`❌ 未知操作: ${action}`);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await tool.destroy();
    rl.close();
  }
}

if (require.main === module) {
  main();
}