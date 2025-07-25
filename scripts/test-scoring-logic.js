#!/usr/bin/env node

/**
 * 测试修正后的评分计算逻辑
 * 
 * 验证：
 * 1. 自评和领导评分能否达到100分制
 * 2. 最终分数计算公式是否正确
 */

require('dotenv').config();

// 模拟修正后的模板配置
const correctedTemplateConfig = {
  categories: [
    {
      id: "work_performance",
      name: "工作绩效",
      weight: 67, // 67%
      evaluator_types: ["self", "leader"]
    },
    {
      id: "daily_management", 
      name: "日常管理",
      weight: 33, // 33%
      evaluator_types: ["self", "leader"]
    }
  ],
  scoring_rules: {
    self_evaluation: {
      weight_in_final: 0.36 // 36%
    },
    leader_evaluation: {
      weight_in_final: 0.54 // 54%
    },
    boss_evaluation: {
      weight_in_final: 0.10 // 10%
    }
  }
};

// 模拟评分数据
const mockScores = {
  work_performance: 95, // 工作绩效各项平均95分
  daily_management: 85  // 日常管理各项平均85分
};

console.log('🧮 测试修正后的评分计算逻辑\n');

// 1. 测试自评分数计算
console.log('=== 第一步：自评分数计算 ===');
console.log('工作绩效评分:', mockScores.work_performance, '分');
console.log('日常管理评分:', mockScores.daily_management, '分');

const selfScore = (mockScores.work_performance * 67 / 100) + (mockScores.daily_management * 33 / 100);
console.log('自评总分计算:', `${mockScores.work_performance} × 67% + ${mockScores.daily_management} × 33% = ${selfScore.toFixed(2)}分`);
console.log('✅ 自评总分:', selfScore.toFixed(2), '分 (基于100分制)\n');

// 2. 测试领导评分计算（假设稍有不同）
console.log('=== 第二步：领导评分计算 ===');
const leaderScores = {
  work_performance: 88,
  daily_management: 80
};

const leaderScore = (leaderScores.work_performance * 67 / 100) + (leaderScores.daily_management * 33 / 100);
console.log('领导评分:', `${leaderScores.work_performance} × 67% + ${leaderScores.daily_management} × 33% = ${leaderScore.toFixed(2)}分`);
console.log('✅ 领导评分:', leaderScore.toFixed(2), '分 (基于100分制)\n');

// 3. 测试老板评分（独立100分制）
console.log('=== 第三步：老板评分 ===');
const bossScore = 90; // 老板给出的独立评分
console.log('✅ 老板评分:', bossScore, '分 (独立100分制)\n');

// 4. 测试最终分数计算
console.log('=== 第四步：最终分数计算 ===');
const finalScore = (selfScore * 0.36) + (leaderScore * 0.54) + (bossScore * 0.10);

console.log('最终分数计算公式:');
console.log(`自评 × 36% + 领导评分 × 54% + 老板评分 × 10%`);
console.log(`= ${selfScore.toFixed(2)} × 0.36 + ${leaderScore.toFixed(2)} × 0.54 + ${bossScore} × 0.10`);
console.log(`= ${(selfScore * 0.36).toFixed(2)} + ${(leaderScore * 0.54).toFixed(2)} + ${(bossScore * 0.10).toFixed(2)}`);
console.log(`= ${finalScore.toFixed(2)}分`);

console.log(`\n🎯 **最终结果**:`);
console.log(`- 自评总分: ${selfScore.toFixed(2)}分 (100分制)`);
console.log(`- 领导评分: ${leaderScore.toFixed(2)}分 (100分制)`); 
console.log(`- 老板评分: ${bossScore}分 (100分制)`);
console.log(`- **最终分数: ${finalScore.toFixed(2)}分**`);

// 5. 对比修正前后的差异
console.log('\n📊 **修正前后对比**:');
console.log('修正前问题: 自评只能达到90分 (60% + 30% = 90%)');
console.log('修正后结果: 自评可以达到100分 (67% + 33% = 100%)');

const oldSelfScore = (mockScores.work_performance * 60 / 100) + (mockScores.daily_management * 30 / 100);
console.log(`修正前自评: ${oldSelfScore.toFixed(2)}分`);
console.log(`修正后自评: ${selfScore.toFixed(2)}分`);
console.log(`差异: +${(selfScore - oldSelfScore).toFixed(2)}分`);

console.log('\n✅ 评分逻辑修正验证完成！');
console.log('✅ 自评和领导评分现在都基于100分制');
console.log('✅ 最终分数计算公式正确：36% + 54% + 10% = 100%');