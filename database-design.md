# OKR绩效考核系统 - 数据库设计文档

## 项目概述

OKR绩效考核系统是一个企业级目标与关键结果管理平台，支持多角色管理，包括系统管理员、公司老板、部门领导和员工。

**技术栈：** Node.js + NestJS + TypeScript + MySQL

## 数据库设计原则

- 遵循第三范式，避免数据冗余
- 使用统一的命名规范
- 合理设计索引提升查询性能
- 考虑数据安全和完整性约束
- 支持软删除机制

## 核心数据表设计

### 1. 用户表 (users)

```sql
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
```

### 2. 部门表 (departments)

```sql
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
```

### 3. 角色表 (roles)

```sql
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
```

### 4. 用户角色关联表 (user_roles)

```sql
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
```

### 5. 考核周期表 (assessments)

```sql
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
```

### 6. 考核参与者表 (assessment_participants)

```sql
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
```

### 7. OKR目标表 (okrs)

```sql
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
```

### 8. 关键结果表 (key_results)

```sql
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
```

### 9. 评估记录表 (evaluations)

```sql
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
```

### 10. 评估模板表 (templates)

```sql
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
```

### 11. 系统配置表 (system_configs)

```sql
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
```

## 外键约束

```sql
-- 用户表外键
ALTER TABLE `users` ADD CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`);
ALTER TABLE `users` ADD CONSTRAINT `fk_users_leader` FOREIGN KEY (`leader_id`) REFERENCES `users` (`id`);

-- 用户角色关联表外键
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

-- 考核表外键
ALTER TABLE `assessments` ADD CONSTRAINT `fk_assessments_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
ALTER TABLE `assessments` ADD CONSTRAINT `fk_assessments_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`);

-- 考核参与者表外键
ALTER TABLE `assessment_participants` ADD CONSTRAINT `fk_participants_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE;
ALTER TABLE `assessment_participants` ADD CONSTRAINT `fk_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- OKR表外键
ALTER TABLE `okrs` ADD CONSTRAINT `fk_okrs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `okrs` ADD CONSTRAINT `fk_okrs_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE;

-- 关键结果表外键
ALTER TABLE `key_results` ADD CONSTRAINT `fk_key_results_okr` FOREIGN KEY (`okr_id`) REFERENCES `okrs` (`id`) ON DELETE CASCADE;

-- 评估记录表外键
ALTER TABLE `evaluations` ADD CONSTRAINT `fk_evaluations_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE;
ALTER TABLE `evaluations` ADD CONSTRAINT `fk_evaluations_evaluator` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`id`);
ALTER TABLE `evaluations` ADD CONSTRAINT `fk_evaluations_evaluatee` FOREIGN KEY (`evaluatee_id`) REFERENCES `users` (`id`);

-- 模板表外键
ALTER TABLE `templates` ADD CONSTRAINT `fk_templates_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
```

## 索引优化建议

### 复合索引

```sql
-- 用户表复合索引
CREATE INDEX `idx_users_dept_status` ON `users` (`department_id`, `status`);
CREATE INDEX `idx_users_leader_status` ON `users` (`leader_id`, `status`);

-- 考核参与者表复合索引
CREATE INDEX `idx_participants_assessment_status` ON `assessment_participants` (`assessment_id`, `self_completed`, `leader_completed`);

-- OKR表复合索引
CREATE INDEX `idx_okrs_user_assessment` ON `okrs` (`user_id`, `assessment_id`);
CREATE INDEX `idx_okrs_assessment_status` ON `okrs` (`assessment_id`, `status`);

-- 评估记录表复合索引
CREATE INDEX `idx_evaluations_evaluatee_type` ON `evaluations` (`evaluatee_id`, `type`);
CREATE INDEX `idx_evaluations_assessment_type` ON `evaluations` (`assessment_id`, `type`);
```

## 初始化数据

### 1. 默认角色数据

```sql
INSERT INTO `roles` (`code`, `name`, `description`, `permissions`) VALUES
('admin', '系统管理员', '拥有系统最高权限', '["*"]'),
('boss', '公司老板', '可查看全公司数据', '["view:all", "report:all"]'),
('leader', '部门领导', '管理团队成员和绩效评估', '["manage:team", "evaluate:members"]'),
('employee', '员工', '查看个人绩效和历史记录', '["view:self", "edit:self"]');
```

### 2. 默认部门数据

```sql
INSERT INTO `departments` (`name`, `description`) VALUES
('技术部', '负责产品研发和技术支持'),
('市场部', '负责市场推广和销售'),
('人事部', '负责人力资源管理'),
('财务部', '负责财务管理和会计');
```

### 3. 默认用户数据

```sql
-- 密码为 123456 的 bcrypt hash
INSERT INTO `users` (`username`, `password`, `name`, `join_date`, `department_id`, `position`) VALUES
('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMye..hash..', '系统管理员', '2023-01-01', NULL, '系统管理员'),
('boss', '$2b$10$N9qo8uLOickgx2ZMRZoMye..hash..', '公司老板', '2022-01-01', NULL, '首席执行官'),
('lisi', '$2b$10$N9qo8uLOickgx2ZMRZoMye..hash..', '李四', '2022-08-10', 1, '技术经理'),
('zhaoliu', '$2b$10$N9qo8uLOickgx2ZMRZoMye..hash..', '赵六', '2022-12-05', 2, '市场经理'),
('zhangsan', '$2b$10$N9qo8uLOickgx2ZMRZoMye..hash..', '张三', '2023-03-15', 1, '前端工程师'),
('wangwu', '$2b$10$N9qo8uLOickgx2ZMRZoMye..hash..', '王五', '2023-05-20', 1, '后端工程师');
```

### 4. 用户角色关联

```sql
INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1), -- admin -> admin
(2, 2), -- boss -> boss
(3, 3), -- lisi -> leader
(4, 3), -- zhaoliu -> leader
(5, 4), -- zhangsan -> employee
(6, 4); -- wangwu -> employee
```

## 数据库性能优化

### 1. 分区策略
- 考核相关表可按年份分区
- 评估记录表可按季度分区

### 2. 读写分离
- 主库处理写操作
- 从库处理查询操作

### 3. 缓存策略
- 用户信息缓存
- 部门组织架构缓存
- 权限配置缓存

## 备份和恢复

### 1. 备份策略
- 每日全量备份
- 实时二进制日志备份
- 定期备份测试

### 2. 恢复策略
- 点对点恢复
- 灾难恢复预案

## 数据安全

### 1. 敏感数据加密
- 密码使用 bcrypt 加密
- 敏感字段考虑加密存储

### 2. 数据脱敏
- 测试环境数据脱敏
- 日志脱敏处理

### 3. 访问控制
- 数据库用户权限最小化
- 定期审计数据库访问

## 监控和维护

### 1. 性能监控
- 慢查询监控
- 连接数监控
- 磁盘空间监控

### 2. 定期维护
- 表结构优化
- 索引优化
- 数据清理

---

**文档版本：** v1.0  
**创建日期：** 2025-01-07  
**最后更新：** 2025-01-07