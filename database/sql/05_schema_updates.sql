-- OKR绩效考核系统 - 数据库结构更新脚本
-- 此脚本包含对现有数据库的结构更新，用于修复软删除支持

USE okr_system;

-- 1. 修复assessments表的唯一约束，支持软删除
-- 删除旧的period唯一约束
ALTER TABLE `assessments` DROP INDEX `uk_period`;

-- 添加支持软删除的复合唯一约束
ALTER TABLE `assessments` ADD UNIQUE INDEX `uk_period_not_deleted` (`period`, `deleted_at`);

-- 2. 为assessment_participants表添加deleted_at字段（如果不存在）
ALTER TABLE `assessment_participants` ADD COLUMN `deleted_at` datetime(6) NULL DEFAULT NULL COMMENT '删除时间';

-- 3. 为templates表添加deleted_at字段（如果不存在）
-- 注意：这个字段可能已经通过迁移添加了，如果报错可以忽略
-- ALTER TABLE `templates` ADD COLUMN `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间';

-- 验证更新结果
SELECT 
    'assessments' as table_name,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'okr_system' 
  AND TABLE_NAME = 'assessments' 
  AND INDEX_NAME LIKE '%period%';

-- 验证assessment_participants表结构
DESCRIBE assessment_participants;