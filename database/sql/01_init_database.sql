-- OKR绩效考核系统 - 数据库初始化脚本
-- 执行前请确保已创建数据库：CREATE DATABASE okr_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE okr_system;

-- 创建部门表
CREATE TABLE `departments` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '部门ID',
  `name` varchar(100) NOT NULL COMMENT '部门名称',
  `description` text COMMENT '部门描述',
  `parent_id` bigint DEFAULT NULL COMMENT '上级部门ID',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1-正常，0-禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- 创建角色表
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `code` varchar(50) NOT NULL COMMENT '角色编码',
  `name` varchar(100) NOT NULL COMMENT '角色名称',
  `description` text COMMENT '角色描述',
  `permissions` json COMMENT '权限列表',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1-正常，0-禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 创建用户表
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码hash',
  `name` varchar(100) NOT NULL COMMENT '真实姓名',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '电话',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1-正常，0-禁用',
  `join_date` date DEFAULT NULL COMMENT '入职日期',
  `department_id` bigint DEFAULT NULL COMMENT '部门ID',
  `leader_id` bigint DEFAULT NULL COMMENT '直属领导ID',
  `position` varchar(100) DEFAULT NULL COMMENT '职位',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_department_id` (`department_id`),
  KEY `idx_leader_id` (`leader_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建用户角色关联表
CREATE TABLE `user_roles` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 创建评估模板表
CREATE TABLE `templates` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `name` varchar(100) NOT NULL COMMENT '模板名称',
  `description` text COMMENT '模板描述',
  `type` varchar(20) NOT NULL COMMENT '模板类型：assessment-考核模板，okr-OKR模板',
  `config` json NOT NULL COMMENT '模板配置（JSON格式）',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认模板：1-是，0-否',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1-启用，0-禁用',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评估模板表';

-- 创建考核周期表
CREATE TABLE `assessments` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '考核ID',
  `title` varchar(200) NOT NULL COMMENT '考核标题',
  `period` varchar(20) NOT NULL COMMENT '考核周期（YYYY-MM）',
  `description` text COMMENT '考核说明',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  `deadline` date NOT NULL COMMENT '截止日期',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT '状态：draft-草稿，active-进行中，completed-已完成，ended-已结束',
  `template_id` bigint DEFAULT NULL COMMENT '模板ID',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period` (`period`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_template_id` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考核周期表';

-- 创建考核参与者表
CREATE TABLE `assessment_participants` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `assessment_id` bigint NOT NULL COMMENT '考核ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `self_completed` tinyint NOT NULL DEFAULT '0' COMMENT '自评是否完成：1-是，0-否',
  `leader_completed` tinyint NOT NULL DEFAULT '0' COMMENT '领导评分是否完成：1-是，0-否',
  `self_score` decimal(5,2) DEFAULT NULL COMMENT '自评得分',
  `leader_score` decimal(5,2) DEFAULT NULL COMMENT '领导得分',
  `final_score` decimal(5,2) DEFAULT NULL COMMENT '最终得分',
  `self_submitted_at` timestamp NULL DEFAULT NULL COMMENT '自评提交时间',
  `leader_submitted_at` timestamp NULL DEFAULT NULL COMMENT '领导评分提交时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_assessment_user` (`assessment_id`, `user_id`),
  KEY `idx_assessment_id` (`assessment_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考核参与者表';

-- 创建OKR目标表
CREATE TABLE `okrs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'OKR ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `assessment_id` bigint NOT NULL COMMENT '考核ID',
  `objective` text NOT NULL COMMENT '目标描述',
  `description` text COMMENT '目标详细说明',
  `weight` decimal(5,2) DEFAULT '100.00' COMMENT '权重（百分比）',
  `progress` decimal(5,2) DEFAULT '0.00' COMMENT '完成进度（百分比）',
  `status` varchar(20) DEFAULT 'active' COMMENT '状态：active-进行中，completed-已完成，cancelled-已取消',
  `self_rating` tinyint DEFAULT NULL COMMENT '自评等级（1-5）',
  `leader_rating` tinyint DEFAULT NULL COMMENT '领导评分等级（1-5）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_assessment_id` (`assessment_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OKR目标表';

-- 创建关键结果表
CREATE TABLE `key_results` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '关键结果ID',
  `okr_id` bigint NOT NULL COMMENT 'OKR ID',
  `title` varchar(255) NOT NULL COMMENT '关键结果标题',
  `description` text COMMENT '详细描述',
  `target_value` varchar(100) COMMENT '目标值',
  `current_value` varchar(100) COMMENT '当前值',
  `unit` varchar(20) COMMENT '单位',
  `progress` decimal(5,2) DEFAULT '0.00' COMMENT '完成进度（百分比）',
  `weight` decimal(5,2) DEFAULT '100.00' COMMENT '权重（百分比）',
  `status` varchar(20) DEFAULT 'active' COMMENT '状态：active-进行中，completed-已完成，cancelled-已取消',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_okr_id` (`okr_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='关键结果表';

-- 创建评估记录表
CREATE TABLE `evaluations` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '评估ID',
  `assessment_id` bigint NOT NULL COMMENT '考核ID',
  `evaluator_id` bigint NOT NULL COMMENT '评估人ID',
  `evaluatee_id` bigint NOT NULL COMMENT '被评估人ID',
  `type` varchar(20) NOT NULL COMMENT '评估类型：self-自评，leader-领导评分，peer-同事评分',
  `score` decimal(5,2) NOT NULL COMMENT '评分',
  `feedback` text COMMENT '反馈意见',
  `strengths` text COMMENT '优势',
  `improvements` text COMMENT '改进建议',
  `status` varchar(20) DEFAULT 'draft' COMMENT '状态：draft-草稿，submitted-已提交',
  `submitted_at` timestamp NULL DEFAULT NULL COMMENT '提交时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_assessment_evaluator_evaluatee_type` (`assessment_id`, `evaluator_id`, `evaluatee_id`, `type`),
  KEY `idx_assessment_id` (`assessment_id`),
  KEY `idx_evaluator_id` (`evaluator_id`),
  KEY `idx_evaluatee_id` (`evaluatee_id`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评估记录表';

-- 创建系统配置表
CREATE TABLE `system_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `description` varchar(255) COMMENT '配置描述',
  `type` varchar(20) DEFAULT 'string' COMMENT '值类型：string-字符串，number-数字，boolean-布尔，json-JSON',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';