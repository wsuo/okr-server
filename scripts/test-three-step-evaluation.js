#!/usr/bin/env node

/**
 * 三步式评估流程测试脚本
 * 
 * 测试流程：员工自评 -> 领导评分 -> 老板评分
 * 验证：
 * 1. 领导评分完成后，自动创建老板评分任务
 * 2. 老板能查看到自己的待评分任务
 * 3. 只有老板评分完成后，评估才算完成
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3010/api/v1';

class ThreeStepEvaluationTester {
  constructor() {
    this.authTokens = {};
  }

  async login(username = 'admin', password = '123456') {
    try {
      console.log(`🔐 登录用户: ${username}...`);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      
      this.authTokens[username] = response.data.access_token;
      console.log(`✅ ${username} 登录成功`);
      return response.data.access_token;
    } catch (error) {
      console.error(`❌ ${username} 登录失败:`, error.response?.data || error.message);
      throw error;
    }
  }

  getAuthHeaders(username) {
    return {
      Authorization: `Bearer ${this.authTokens[username]}`,
      'Content-Type': 'application/json'
    };
  }

  async testThreeStepFlow() {
    console.log('🚀 开始测试三步式评估流程\n');

    // 1. 多用户登录
    console.log('=== 第一步：多用户登录 ===');
    await this.login('admin'); // 管理员
    await this.login('lisi');  // 假设lisi是员工
    await this.login('zhangsan'); // 假设zhangsan是领导
    await this.login('wangwu'); // 假设wangwu是老板
    console.log('');

    // 2. 创建测试考核
    console.log('=== 第二步：创建测试考核 ===');
    const assessment = await this.createTestAssessment();
    console.log(`✅ 测试考核创建成功，ID: ${assessment.id}\n`);

    // 3. 员工自评
    console.log('=== 第三步：员工自评 ===');
    await this.submitSelfEvaluation(assessment.id, 'lisi');
    console.log('✅ 员工自评提交成功\n');

    // 4. 领导评分
    console.log('=== 第四步：领导评分 ===');
    await this.submitLeaderEvaluation(assessment.id, 'zhangsan');
    console.log('✅ 领导评分提交成功\n');

    // 5. 检查老板是否收到待评分任务
    console.log('=== 第五步：检查老板待评分任务 ===');
    await this.checkBossTasks('wangwu');
    console.log('');

    // 6. 老板评分
    console.log('=== 第六步：老板评分 ===');
    await this.submitBossEvaluation(assessment.id, 'wangwu');
    console.log('✅ 老板评分提交成功\n');

    // 7. 验证最终完成状态
    console.log('=== 第七步：验证最终完成状态 ===');
    await this.checkFinalCompletionStatus(assessment.id);
    console.log('');

    console.log('🎉 三步式评估流程测试完成！');
  }

  async createTestAssessment() {
    try {
      // 简化版，假设使用默认模板创建考核
      const response = await axios.post(
        `${API_BASE_URL}/assessments`,
        {
          title: '三步式评估流程测试',
          description: '测试员工自评->领导评分->老板评分的完整流程',
          period: '2025-01',
          start_time: new Date().toISOString(),
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          template_id: 1, // 假设使用ID为1的默认模板
          participant_ids: [2] // 假设用户ID 2是被评估人
        },
        { headers: this.getAuthHeaders('admin') }
      );
      return response.data;
    } catch (error) {
      console.error('❌ 创建测试考核失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async submitSelfEvaluation(assessmentId, username) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/evaluations/self`,
        {
          assessment_id: assessmentId,
          score: 88.5,
          feedback: '自评反馈：本期工作表现良好',
          strengths: '工作态度积极，执行力强',
          improvements: '需要加强跨部门协作'
        },
        { headers: this.getAuthHeaders(username) }
      );
      return response.data;
    } catch (error) {
      console.error('❌ 提交自评失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async submitLeaderEvaluation(assessmentId, username) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/evaluations/leader`,
        {
          assessment_id: assessmentId,
          evaluatee_id: 2, // 假设评估用户ID 2
          score: 85.0,
          feedback: '领导评价：整体表现符合预期',
          strengths: '专业能力强，工作质量高',
          improvements: '建议提升沟通技巧'
        },
        { headers: this.getAuthHeaders(username) }
      );
      return response.data;
    } catch (error) {
      console.error('❌ 提交领导评分失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkBossTasks(username) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/evaluations/my/tasks`,
        { headers: this.getAuthHeaders(username) }
      );
      
      const bossTasks = response.data.filter(task => task.type === 'boss');
      console.log(`📋 老板待评分任务数量: ${bossTasks.length}`);
      
      if (bossTasks.length > 0) {
        console.log('📝 待评分任务详情:');
        bossTasks.forEach((task, index) => {
          console.log(`  ${index + 1}. 考核: ${task.assessment_title}`);
          console.log(`     被评估人: ${task.evaluatee_name}`);
          console.log(`     状态: ${task.status}`);
          console.log(`     截止时间: ${task.deadline}`);
        });
      } else {
        console.log('⚠️ 老板没有待评分任务，可能自动创建任务功能有问题');
      }
      
      return bossTasks;
    } catch (error) {
      console.error('❌ 检查老板任务失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async submitBossEvaluation(assessmentId, username) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/evaluations/boss`,
        {
          assessment_id: assessmentId,
          evaluatee_id: 2, // 假设评估用户ID 2
          score: 90.0,
          feedback: '老板评价：从战略角度看，表现优秀',
          strengths: '具有战略思维，执行力强',
          improvements: '建议加强创新能力'
        },
        { headers: this.getAuthHeaders(username) }
      );
      return response.data;
    } catch (error) {
      console.error('❌ 提交老板评分失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkFinalCompletionStatus(assessmentId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/assessments/${assessmentId}`,
        { headers: this.getAuthHeaders('admin') }
      );
      
      const assessment = response.data;
      console.log(`📊 考核状态: ${assessment.status}`);
      
      if (assessment.participants && assessment.participants.length > 0) {
        const participant = assessment.participants[0];
        console.log(`🎯 参与者完成状态:`);
        console.log(`   - 自评完成: ${participant.self_completed ? '✅' : '❌'}`);
        console.log(`   - 领导评分完成: ${participant.leader_completed ? '✅' : '❌'}`);
        console.log(`   - 老板评分完成: ${participant.boss_completed ? '✅' : '❌'}`);
        console.log(`   - 最终分数: ${participant.final_score || '未计算'}`);
        
        if (participant.self_completed && participant.leader_completed && participant.boss_completed) {
          console.log('🎉 三维度评估全部完成！');
        } else {
          console.log('⚠️ 评估尚未全部完成');
        }
      }
      
      return assessment;
    } catch (error) {
      console.error('❌ 检查完成状态失败:', error.response?.data || error.message);
      throw error;
    }
  }
}

// 主函数
async function main() {
  const tester = new ThreeStepEvaluationTester();
  
  // 等待服务器启动
  console.log('⏳ 等待服务器启动...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await tester.testThreeStepFlow();
  } catch (error) {
    console.error('❌ 三步式评估流程测试失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}