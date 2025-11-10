#!/usr/bin/env node
/*
 * 一次性数据库脚本：将 assessments(id=23).template_config 同步为模板8的当前配置
 * 用于替代迁移，直接在目标环境执行。
 *
 * 运行方式（在服务器后端目录）：
 *   - 使用已有环境变量：
 *       node scripts/update-assessment-23-template-config.js
 *   - 指定环境文件（若有 .env.prod）：
 *       ENV_FILE=.env.prod node scripts/update-assessment-23-template-config.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

// 加载环境变量：ENV_FILE > .env.prod > .env.local > .env
(() => {
  const candidates = [
    process.env.ENV_FILE,
    path.resolve(process.cwd(), '.env.prod'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        console.log(`[env] 已加载环境文件: ${p}`);
        return;
      }
    } catch (_) {}
  }
  console.log('[env] 未找到环境文件，将使用进程环境变量');
})();

async function main() {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  for (const key of required) {
    if (typeof process.env[key] === 'undefined') {
      console.error(`环境变量缺失: ${key}`);
      process.exit(1);
    }
  }

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 4,
    namedPlaceholders: true,
    timezone: 'Z',
  });

  const conn = await pool.getConnection();
  try {
    console.log('🔎 读取模板8配置...');
    const [tplRows] = await conn.query(
      'SELECT config FROM templates WHERE id = ? LIMIT 1',
      [8]
    );

    if (!tplRows || !tplRows[0] || !tplRows[0].config) {
      throw new Error('未找到模板8的config');
    }

    const templateConfig = tplRows[0].config;

    console.log('📝 更新 assessments(id=23).template_config ...');
    await conn.query(
      'UPDATE assessments SET template_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1',
      [templateConfig, 23]
    );

    console.log('✅ 更新完成，开始验证权重...');
    const [verifyRows] = await conn.query(
      `SELECT 
         id,
         JSON_EXTRACT(template_config, '$.scoring_rules.two_tier_config.self_weight_in_employee_leader') AS self_weight,
         JSON_EXTRACT(template_config, '$.scoring_rules.two_tier_config.leader_weight_in_employee_leader') AS leader_weight
       FROM assessments WHERE id = ? LIMIT 1`,
      [23]
    );

    if (verifyRows && verifyRows[0]) {
      console.log(
        `🔎 验证结果: assessment 23 自评=${verifyRows[0].self_weight} 领导评分=${verifyRows[0].leader_weight}`
      );
    } else {
      console.warn('⚠️ 验证失败：未读取到 assessment 23');
    }

    console.log('🎉 脚本执行完成');
  } catch (err) {
    console.error('❌ 执行失败:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();

