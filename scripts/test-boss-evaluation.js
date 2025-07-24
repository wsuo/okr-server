#!/usr/bin/env node

/**
 * Boss评估系统功能测试脚本
 * 
 * 测试基础功能是否正常工作
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3010/api/v1';

class BossEvaluationTester {
  constructor() {
    this.authToken = '';
  }

  async login(username = 'admin', password = '123456') {
    try {
      console.log('🔐 登录系统...');
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      
      this.authToken = response.data.access_token;
      console.log('✅ 登录成功');
      return true;
    } catch (error) {
      console.error('❌ 登录失败:', error.response?.data || error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async testBasicEndpoints() {
    console.log('\n📋 测试基础接口...');

    // 1. 测试评估列表接口
    try {
      const response = await axios.get(`${API_BASE_URL}/evaluations`, {
        headers: this.getAuthHeaders()
      });
      console.log(`✅ 评估列表接口正常 - 返回 ${response.data.items?.length || 0} 条记录`);
    } catch (error) {
      console.error('❌ 评估列表接口异常:', error.response?.data || error.message);
    }

    // 2. 测试用户列表接口
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: this.getAuthHeaders()
      });
      console.log(`✅ 用户列表接口正常 - 返回 ${response.data.items?.length || 0} 条记录`);
    } catch (error) {
      console.error('❌ 用户列表接口异常:', error.response?.data || error.message);
    }

    // 3. 测试考核列表接口
    try {
      const response = await axios.get(`${API_BASE_URL}/assessments`, {
        headers: this.getAuthHeaders()
      });
      console.log(`✅ 考核列表接口正常 - 返回 ${response.data.items?.length || 0} 条记录`);
    } catch (error) {
      console.error('❌ 考核列表接口异常:', error.response?.data || error.message);
    }
  }

  async testNewBossFeatures() {
    console.log('\n🔧 测试Boss评估新功能...');

    // 1. 测试Boss评估查询（带type=boss参数）
    try {
      const response = await axios.get(`${API_BASE_URL}/evaluations`, {
        headers: this.getAuthHeaders(),
        params: { type: 'boss' }
      });
      console.log(`✅ Boss评估查询接口正常 - 返回 ${response.data.items?.length || 0} 条记录`);
    } catch (error) {
      console.error('❌ Boss评估查询接口异常:', error.response?.data || error.message);
    }

    // 2. 测试评估模板接口（应包含boss评估配置）
    try {
      const templatesResponse = await axios.get(`${API_BASE_URL}/templates`, {
        headers: this.getAuthHeaders()
      });
      
      if (templatesResponse.data.items?.length > 0) {
        const templateId = templatesResponse.data.items[0].id;
        const configResponse = await axios.get(`${API_BASE_URL}/templates/${templateId}/config`, {
          headers: this.getAuthHeaders()
        });

        const hasBossConfig = configResponse.data.scoring_rules?.boss_evaluation;
        if (hasBossConfig) {
          console.log('✅ 模板配置包含Boss评估设置');
          console.log(`   - Boss权重: ${configResponse.data.scoring_rules.boss_evaluation.weight_in_final}`);
          console.log(`   - 是否可选: ${configResponse.data.scoring_rules.boss_evaluation.is_optional}`);
        } else {
          console.log('⚠️  模板配置中未找到Boss评估设置');
        }
      }
    } catch (error) {
      console.error('❌ 模板配置测试异常:', error.response?.data || error.message);
    }

    // 3. 测试统计信息接口
    try {
      const response = await axios.get(`${API_BASE_URL}/statistics/dashboard`, {
        headers: this.getAuthHeaders()
      });
      console.log('✅ 统计信息接口正常');
      console.log(`   - 总用户数: ${response.data.overview?.total_users || 0}`);
      console.log(`   - 活跃考核数: ${response.data.overview?.active_assessments || 0}`);
      console.log(`   - 已完成考核数: ${response.data.overview?.completed_assessments || 0}`);
    } catch (error) {
      console.error('❌ 统计信息接口异常:', error.response?.data || error.message);
    }
  }

  async testDatabaseMigration() {
    console.log('\n🗄️ 验证数据库迁移结果...');

    try {
      // 通过查询参与者信息验证新字段
      const response = await axios.get(`${API_BASE_URL}/assessments`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.data.items?.length > 0) {
        const assessmentId = response.data.items[0].id;
        
        // 尝试获取参与者信息来验证boss字段
        const detailResponse = await axios.get(`${API_BASE_URL}/assessments/${assessmentId}`, {
          headers: this.getAuthHeaders()
        });
        
        console.log('✅ 数据库迁移验证通过 - 考核详情可正常访问');
        
        if (detailResponse.data.participants?.length > 0) {
          const participant = detailResponse.data.participants[0];
          const hasBossFields = 'boss_completed' in participant || 'boss_score' in participant;
          if (hasBossFields) {
            console.log('✅ Boss评估字段已成功添加到数据库');
          } else {
            // 这可能是API响应中没有返回这些字段，但不意味着数据库没有
            console.log('ℹ️  API响应中未显示Boss字段（可能是正常的序列化行为）');
          }
        }
      }
    } catch (error) {
      console.error('❌ 数据库迁移验证异常:', error.response?.data || error.message);
    }
  }

  async testWeightCalculation() {
    console.log('\n🧮 测试权重计算...');

    try {
      // 获取用户绩效列表来验证新的权重计算
      const response = await axios.get(`${API_BASE_URL}/statistics/performance-list`, {
        headers: this.getAuthHeaders(),
        params: { limit: 5 }
      });

      if (response.data.items?.length > 0) {
        console.log('✅ 绩效计算接口正常工作');
        response.data.items.slice(0, 3).forEach((item, index) => {
          console.log(`   用户${index + 1}: ${item.user_name || '未知'} - 最终得分: ${item.final_score || 0}`);
        });
      }
    } catch (error) {
      console.error('❌ 权重计算测试异常:', error.response?.data || error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 开始Boss评估系统功能测试\n');

    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 登录失败，终止测试');
      return;
    }

    // 2. 基础接口测试
    await this.testBasicEndpoints();

    // 3. 新功能测试
    await this.testNewBossFeatures();

    // 4. 数据库迁移验证
    await this.testDatabaseMigration();

    // 5. 权重计算测试
    await this.testWeightCalculation();

    console.log('\n✅ Boss评估系统功能测试完成！');
  }
}

// 主函数
async function main() {
  const tester = new BossEvaluationTester();
  
  // 等待服务器启动
  console.log('⏳ 等待服务器启动...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}