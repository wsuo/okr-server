/*
 Navicat Premium Dump SQL

 Source Server         : 100.72.60.117
 Source Server Type    : MySQL
 Source Server Version : 80042 (8.0.42)
 Source Host           : 100.72.60.117:3306
 Source Schema         : okr_system

 Target Server Type    : MySQL
 Target Server Version : 80042 (8.0.42)
 File Encoding         : 65001

 Date: 17/07/2025 09:46:07
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for assessment_participants
-- ----------------------------
DROP TABLE IF EXISTS `assessment_participants`;
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
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_assessment_user` (`assessment_id`,`user_id`),
  KEY `idx_assessment_id` (`assessment_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_participants_assessment_status` (`assessment_id`,`self_completed`,`leader_completed`),
  CONSTRAINT `fk_participants_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考核参与者表';

-- ----------------------------
-- Records of assessment_participants
-- ----------------------------
BEGIN;
INSERT INTO `assessment_participants` (`id`, `assessment_id`, `user_id`, `self_completed`, `leader_completed`, `self_score`, `leader_score`, `final_score`, `self_submitted_at`, `leader_submitted_at`, `created_at`, `updated_at`, `deleted_at`) VALUES (29, 15, 9, 1, 1, 88.46, 65.43, 74.64, '2025-07-16 07:00:06', '2025-07-16 07:16:55', '2025-07-16 14:57:59', '2025-07-16 15:16:53', NULL);
INSERT INTO `assessment_participants` (`id`, `assessment_id`, `user_id`, `self_completed`, `leader_completed`, `self_score`, `leader_score`, `final_score`, `self_submitted_at`, `leader_submitted_at`, `created_at`, `updated_at`, `deleted_at`) VALUES (30, 15, 7, 1, 0, 65.52, NULL, NULL, '2025-07-16 07:01:10', NULL, '2025-07-16 14:57:59', '2025-07-16 15:01:09', NULL);
COMMIT;

-- ----------------------------
-- Table structure for assessments
-- ----------------------------
DROP TABLE IF EXISTS `assessments`;
CREATE TABLE `assessments` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '考核ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '考核标题',
  `period` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '考核周期（YYYY-MM）',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '考核说明',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  `deadline` date NOT NULL COMMENT '截止日期',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '状态：draft-草稿，active-进行中，completed-已完成，ended-已结束',
  `template_id` bigint DEFAULT NULL COMMENT '模板ID',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  `template_config` json DEFAULT NULL COMMENT '模板配置快照，考核发布时复制模板配置到此字段',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_not_deleted` (`period`,`deleted_at`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_template_id` (`template_id`),
  CONSTRAINT `fk_assessments_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_assessments_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考核周期表';

-- ----------------------------
-- Records of assessments
-- ----------------------------
BEGIN;
INSERT INTO `assessments` (`id`, `title`, `period`, `description`, `start_date`, `end_date`, `deadline`, `status`, `template_id`, `created_by`, `created_at`, `updated_at`, `deleted_at`, `template_config`) VALUES (15, '2025年07月绩效考核', '2025-07', '', '2025-07-01', '2025-07-30', '2025-07-31', 'active', 3, 1, '2025-07-16 14:57:59', '2025-07-16 14:58:02', NULL, '{\"version\": \"1.0\", \"categories\": [{\"id\": \"work_performance\", \"name\": \"工作绩效\", \"items\": [{\"id\": \"work_saturation\", \"name\": \"工作饱和度\", \"weight\": 20, \"max_score\": 100, \"description\": \"工作量的充实程度和时间利用效率\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"工作量适中，基本达到要求\"}, \"poor\": {\"min\": 0, \"description\": \"工作量明显不足\"}, \"average\": {\"min\": 70, \"description\": \"工作量偏少或时间利用不充分\"}, \"excellent\": {\"min\": 90, \"description\": \"工作安排合理，时间利用率高\"}}}, {\"id\": \"work_execution\", \"name\": \"工作执行度\", \"weight\": 20, \"max_score\": 100, \"description\": \"对工作任务的执行能力和执行效果\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"执行到位，按时完成任务\"}, \"poor\": {\"min\": 0, \"description\": \"执行不力，经常延误\"}, \"average\": {\"min\": 70, \"description\": \"基本执行，偶有延误\"}, \"excellent\": {\"min\": 90, \"description\": \"执行力强，能够超额完成任务\"}}}, {\"id\": \"work_completion\", \"name\": \"工作完成度\", \"weight\": 20, \"max_score\": 100, \"description\": \"工作任务的完成质量和完成率\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"完成质量良好，完成率90%以上\"}, \"poor\": {\"min\": 0, \"description\": \"完成率低于80%\"}, \"average\": {\"min\": 70, \"description\": \"基本完成，完成率80%以上\"}, \"excellent\": {\"min\": 90, \"description\": \"完成质量优秀，完成率100%\"}}}, {\"id\": \"work_efficiency\", \"name\": \"工作效率\", \"weight\": 20, \"max_score\": 100, \"description\": \"单位时间内的工作产出和质量\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"效率良好，产出符合要求\"}, \"poor\": {\"min\": 0, \"description\": \"效率低下\"}, \"average\": {\"min\": 70, \"description\": \"效率一般，需要改进\"}, \"excellent\": {\"min\": 90, \"description\": \"效率极高，产出质量优秀\"}}}, {\"id\": \"work_quality\", \"name\": \"工作质量\", \"weight\": 20, \"max_score\": 100, \"description\": \"工作成果的质量水平和标准符合度\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"质量良好，符合标准\"}, \"poor\": {\"min\": 0, \"description\": \"质量不达标\"}, \"average\": {\"min\": 70, \"description\": \"质量一般，基本达标\"}, \"excellent\": {\"min\": 90, \"description\": \"质量优秀，超出预期\"}}}], \"weight\": 60, \"description\": \"衡量员工工作成果和执行能力\", \"evaluator_types\": [\"self\", \"leader\"]}, {\"id\": \"daily_management\", \"name\": \"日常管理\", \"items\": [{\"id\": \"work_attitude\", \"name\": \"工作态度\", \"weight\": 20, \"max_score\": 100, \"description\": \"对工作的积极性和责任心\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"态度良好，认真负责\"}, \"poor\": {\"min\": 0, \"description\": \"态度消极，缺乏责任心\"}, \"average\": {\"min\": 70, \"description\": \"态度一般，需要督促\"}, \"excellent\": {\"min\": 90, \"description\": \"积极主动，责任心强\"}}}, {\"id\": \"approval_process\", \"name\": \"审批流程\", \"weight\": 15, \"max_score\": 100, \"description\": \"审批流程的遵守和执行情况\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"基本遵守流程\"}, \"poor\": {\"min\": 0, \"description\": \"经常违反流程\"}, \"average\": {\"min\": 70, \"description\": \"偶有流程不当\"}, \"excellent\": {\"min\": 90, \"description\": \"严格遵守流程，审批及时\"}}}, {\"id\": \"attendance\", \"name\": \"日常出勤\", \"weight\": 15, \"max_score\": 100, \"description\": \"出勤率和时间管理\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"出勤率95%以上\"}, \"poor\": {\"min\": 0, \"description\": \"出勤率低于90%\"}, \"average\": {\"min\": 70, \"description\": \"出勤率90%以上\"}, \"excellent\": {\"min\": 90, \"description\": \"出勤率100%，时间管理良好\"}}}, {\"id\": \"work_report\", \"name\": \"工作汇报\", \"weight\": 15, \"max_score\": 100, \"description\": \"工作汇报的及时性和质量\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"汇报基本及时\"}, \"poor\": {\"min\": 0, \"description\": \"汇报不及时或质量差\"}, \"average\": {\"min\": 70, \"description\": \"汇报偶有延误\"}, \"excellent\": {\"min\": 90, \"description\": \"汇报及时、详细、准确\"}}}, {\"id\": \"team_activity\", \"name\": \"团队活动\", \"weight\": 10, \"max_score\": 100, \"description\": \"参与团队活动的积极性\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"正常参与团队活动\"}, \"poor\": {\"min\": 0, \"description\": \"很少参与团队活动\"}, \"average\": {\"min\": 70, \"description\": \"参与度一般\"}, \"excellent\": {\"min\": 90, \"description\": \"积极参与，贡献突出\"}}}, {\"id\": \"office_environment\", \"name\": \"办公室环境维护\", \"weight\": 10, \"max_score\": 100, \"description\": \"办公环境的维护和整洁程度\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"环境基本整洁\"}, \"poor\": {\"min\": 0, \"description\": \"环境维护不佳\"}, \"average\": {\"min\": 70, \"description\": \"环境维护一般\"}, \"excellent\": {\"min\": 90, \"description\": \"环境整洁，维护良好\"}}}, {\"id\": \"rule_compliance\", \"name\": \"规章制度遵守\", \"weight\": 15, \"max_score\": 100, \"description\": \"公司规章制度的遵守情况\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"基本遵守制度\"}, \"poor\": {\"min\": 0, \"description\": \"经常违反规章制度\"}, \"average\": {\"min\": 70, \"description\": \"偶有违规情况\"}, \"excellent\": {\"min\": 90, \"description\": \"严格遵守各项制度\"}}}], \"weight\": 30, \"description\": \"日常工作行为和规范遵守情况\", \"evaluator_types\": [\"self\", \"leader\"]}, {\"id\": \"leader_evaluation\", \"name\": \"领导评价\", \"items\": [{\"id\": \"special_task_completion\", \"name\": \"交代的专项按时完成并及时反馈\", \"weight\": 100, \"max_score\": 100, \"description\": \"对领导交代的特殊任务的完成情况和反馈及时性\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"专项任务按时完成，反馈及时\"}, \"poor\": {\"min\": 0, \"description\": \"专项任务完成不佳或反馈不及时\"}, \"average\": {\"min\": 70, \"description\": \"专项任务基本完成，反馈一般\"}, \"excellent\": {\"min\": 90, \"description\": \"专项任务完成出色，反馈及时详细\"}}}], \"weight\": 10, \"description\": \"领导对员工的专项工作评价\", \"evaluator_types\": [\"leader\"], \"special_attributes\": {\"leader_only\": true, \"required_role\": \"leader\"}}], \"description\": \"系统内置的标准考核模板，包含工作绩效、日常管理和领导评价三大维度\", \"total_score\": 100, \"scoring_rules\": {\"self_evaluation\": {\"enabled\": true, \"description\": \"员工自我评估\", \"weight_in_final\": 0.4}, \"leader_evaluation\": {\"enabled\": true, \"description\": \"直属领导评估\", \"weight_in_final\": 0.6}, \"calculation_method\": \"weighted_average\"}, \"scoring_method\": \"weighted\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"完成目标，表现符合预期\"}, \"poor\": {\"min\": 0, \"description\": \"未完成目标，表现不佳\"}, \"average\": {\"min\": 70, \"description\": \"基本完成目标，表现一般\"}, \"excellent\": {\"min\": 90, \"description\": \"超额完成目标，表现突出\"}}, \"usage_instructions\": {\"for_leaders\": [\"1. 基于实际观察和工作成果进行评分\", \"2. 提供具体的反馈和改进建议\", \"3. 确保评分的公平性和客观性\", \"4. 对\\\"领导评价\\\"部分进行专项评估\"], \"for_employees\": [\"1. 根据各项评分标准进行客观自评\", \"2. 提供具体的工作实例和数据支持\", \"3. 诚实反映自己的工作表现\", \"4. 注意：无法对\\\"领导评价\\\"部分进行自评\"]}}');
COMMIT;

-- ----------------------------
-- Table structure for departments
-- ----------------------------
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '部门ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '部门名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '部门描述',
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- ----------------------------
-- Records of departments
-- ----------------------------
BEGIN;
INSERT INTO `departments` (`id`, `name`, `description`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES (1, '技术部', '负责产品研发和技术支持', NULL, 0, 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33', NULL);
INSERT INTO `departments` (`id`, `name`, `description`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES (2, '市场部', '负责市场推广和销售', NULL, 0, 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33', NULL);
INSERT INTO `departments` (`id`, `name`, `description`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES (3, '人事部', '负责人力资源管理', NULL, 0, 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33', NULL);
INSERT INTO `departments` (`id`, `name`, `description`, `parent_id`, `sort_order`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES (4, '财务部', '负责财务管理和会计', NULL, 0, 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33', NULL);
COMMIT;

-- ----------------------------
-- Table structure for evaluations
-- ----------------------------
DROP TABLE IF EXISTS `evaluations`;
CREATE TABLE `evaluations` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '评估ID',
  `assessment_id` bigint NOT NULL COMMENT '考核ID',
  `evaluator_id` bigint NOT NULL COMMENT '评估人ID',
  `evaluatee_id` bigint NOT NULL COMMENT '被评估人ID',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评估类型：self-自评，leader-领导评分，peer-同事评分',
  `score` decimal(5,2) NOT NULL COMMENT '评分',
  `feedback` text COLLATE utf8mb4_unicode_ci COMMENT '反馈意见',
  `strengths` text COLLATE utf8mb4_unicode_ci COMMENT '优势',
  `improvements` text COLLATE utf8mb4_unicode_ci COMMENT '改进建议',
  `detailed_scores` json DEFAULT NULL COMMENT '详细评分数据，包含分类别、分项目的评分信息',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'draft' COMMENT '状态：draft-草稿，submitted-已提交',
  `submitted_at` timestamp NULL DEFAULT NULL COMMENT '提交时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_assessment_evaluator_evaluatee_type` (`assessment_id`,`evaluator_id`,`evaluatee_id`,`type`),
  KEY `idx_assessment_id` (`assessment_id`),
  KEY `idx_evaluator_id` (`evaluator_id`),
  KEY `idx_evaluatee_id` (`evaluatee_id`),
  KEY `idx_type` (`type`),
  KEY `idx_evaluations_evaluatee_type` (`evaluatee_id`,`type`),
  KEY `idx_evaluations_assessment_type` (`assessment_id`,`type`),
  CONSTRAINT `fk_evaluations_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluations_evaluatee` FOREIGN KEY (`evaluatee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_evaluations_evaluator` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评估记录表';

-- ----------------------------
-- Records of evaluations
-- ----------------------------
BEGIN;
INSERT INTO `evaluations` (`id`, `assessment_id`, `evaluator_id`, `evaluatee_id`, `type`, `score`, `feedback`, `strengths`, `improvements`, `detailed_scores`, `status`, `submitted_at`, `created_at`, `updated_at`) VALUES (9, 15, 9, 9, 'self', 88.46, '自我评价良好', '很厉害', '很膨胀', '[{\"items\": [{\"score\": 99, \"itemId\": \"work_saturation\", \"comment\": \"\"}, {\"score\": 97, \"itemId\": \"work_execution\", \"comment\": \"\"}, {\"score\": 98, \"itemId\": \"work_completion\", \"comment\": \"\"}, {\"score\": 97, \"itemId\": \"work_efficiency\", \"comment\": \"\"}, {\"score\": 97, \"itemId\": \"work_quality\", \"comment\": \"\"}], \"categoryId\": \"work_performance\", \"categoryScore\": 97.6}, {\"items\": [{\"score\": 99, \"itemId\": \"work_attitude\", \"comment\": \"\"}, {\"score\": 99, \"itemId\": \"approval_process\", \"comment\": \"\"}, {\"score\": 100, \"itemId\": \"attendance\", \"comment\": \"\"}, {\"score\": 100, \"itemId\": \"work_report\", \"comment\": \"\"}, {\"score\": 100, \"itemId\": \"team_activity\", \"comment\": \"\"}, {\"score\": 100, \"itemId\": \"office_environment\", \"comment\": \"\"}, {\"score\": 100, \"itemId\": \"rule_compliance\", \"comment\": \"666\"}], \"categoryId\": \"daily_management\", \"categoryScore\": 99.65}]', 'submitted', '2025-07-16 07:00:06', '2025-07-16 14:59:26', '2025-07-16 15:00:05');
INSERT INTO `evaluations` (`id`, `assessment_id`, `evaluator_id`, `evaluatee_id`, `type`, `score`, `feedback`, `strengths`, `improvements`, `detailed_scores`, `status`, `submitted_at`, `created_at`, `updated_at`) VALUES (10, 15, 7, 7, 'self', 65.52, '表现一般', '发挥不佳', '状态不好', '[{\"items\": [{\"score\": 73, \"itemId\": \"work_saturation\", \"comment\": \"\"}, {\"score\": 72, \"itemId\": \"work_execution\", \"comment\": \"\"}, {\"score\": 72, \"itemId\": \"work_completion\", \"comment\": \"\"}, {\"score\": 71, \"itemId\": \"work_efficiency\", \"comment\": \"\"}, {\"score\": 71, \"itemId\": \"work_quality\", \"comment\": \"\"}], \"categoryId\": \"work_performance\", \"categoryScore\": 71.8}, {\"items\": [{\"score\": 75, \"itemId\": \"work_attitude\", \"comment\": \"\"}, {\"score\": 75, \"itemId\": \"approval_process\", \"comment\": \"\"}, {\"score\": 75, \"itemId\": \"attendance\", \"comment\": \"\"}, {\"score\": 74, \"itemId\": \"work_report\", \"comment\": \"\"}, {\"score\": 74, \"itemId\": \"team_activity\", \"comment\": \"\"}, {\"score\": 74, \"itemId\": \"office_environment\", \"comment\": \"\"}, {\"score\": 76, \"itemId\": \"rule_compliance\", \"comment\": \"\"}], \"categoryId\": \"daily_management\", \"categoryScore\": 74.8}]', 'submitted', '2025-07-16 07:01:10', '2025-07-16 15:00:40', '2025-07-16 15:01:09');
INSERT INTO `evaluations` (`id`, `assessment_id`, `evaluator_id`, `evaluatee_id`, `type`, `score`, `feedback`, `strengths`, `improvements`, `detailed_scores`, `status`, `submitted_at`, `created_at`, `updated_at`) VALUES (11, 15, 3, 7, 'leader', 0.00, NULL, NULL, NULL, NULL, 'draft', NULL, '2025-07-16 15:03:09', '2025-07-16 15:03:09');
INSERT INTO `evaluations` (`id`, `assessment_id`, `evaluator_id`, `evaluatee_id`, `type`, `score`, `feedback`, `strengths`, `improvements`, `detailed_scores`, `status`, `submitted_at`, `created_at`, `updated_at`) VALUES (12, 15, 4, 9, 'leader', 65.43, '测试文字-测试文字-测试文字', '-测试文字-测试文字测试文字', '测试文字-测试文字-测试文字', '[{\"items\": [{\"score\": 100, \"itemId\": \"work_saturation\", \"comment\": \"\"}, {\"score\": 99, \"itemId\": \"work_execution\", \"comment\": \"\"}, {\"score\": 49, \"itemId\": \"work_completion\", \"comment\": \"\"}, {\"score\": 48, \"itemId\": \"work_efficiency\", \"comment\": \"\"}, {\"score\": 47, \"itemId\": \"work_quality\", \"comment\": \"\"}], \"categoryId\": \"work_performance\", \"categoryScore\": 68.6}, {\"items\": [{\"score\": 48, \"itemId\": \"work_attitude\", \"comment\": \"\"}, {\"score\": 48, \"itemId\": \"approval_process\", \"comment\": \"\"}, {\"score\": 48, \"itemId\": \"attendance\", \"comment\": \"\"}, {\"score\": 48, \"itemId\": \"work_report\", \"comment\": \"\"}, {\"score\": 48, \"itemId\": \"team_activity\", \"comment\": \"\"}, {\"score\": 47, \"itemId\": \"office_environment\", \"comment\": \"\"}, {\"score\": 48, \"itemId\": \"rule_compliance\", \"comment\": \"\"}], \"categoryId\": \"daily_management\", \"categoryScore\": 47.900000000000006}, {\"items\": [{\"score\": 99, \"itemId\": \"special_task_completion\", \"comment\": \"\"}], \"categoryId\": \"leader_evaluation\", \"categoryScore\": 99}]', 'submitted', '2025-07-16 07:16:55', '2025-07-16 15:15:50', '2025-07-16 15:16:53');
COMMIT;

-- ----------------------------
-- Table structure for key_results
-- ----------------------------
DROP TABLE IF EXISTS `key_results`;
CREATE TABLE `key_results` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '关键结果ID',
  `okr_id` bigint NOT NULL COMMENT 'OKR ID',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '关键结果标题',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '详细描述',
  `target_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标值',
  `current_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前值',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '单位',
  `progress` decimal(5,2) DEFAULT '0.00' COMMENT '完成进度（百分比）',
  `weight` decimal(5,2) DEFAULT '100.00' COMMENT '权重（百分比）',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态：active-进行中，completed-已完成，cancelled-已取消',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_okr_id` (`okr_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_key_results_okr` FOREIGN KEY (`okr_id`) REFERENCES `okrs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='关键结果表';

-- ----------------------------
-- Records of key_results
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for migrations
-- ----------------------------
DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;

-- ----------------------------
-- Records of migrations
-- ----------------------------
BEGIN;
INSERT INTO `migrations` (`id`, `timestamp`, `name`) VALUES (1, 1731361200000, 'FixAssessmentPeriodUniqueConstraint1731361200000');
INSERT INTO `migrations` (`id`, `timestamp`, `name`) VALUES (2, 1731454800000, 'AddTemplateConfigToAssessments1731454800000');
INSERT INTO `migrations` (`id`, `timestamp`, `name`) VALUES (3, 1731454900000, 'AddDetailedScoresToEvaluations1731454900000');
COMMIT;

-- ----------------------------
-- Table structure for okrs
-- ----------------------------
DROP TABLE IF EXISTS `okrs`;
CREATE TABLE `okrs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'OKR ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `assessment_id` bigint NOT NULL COMMENT '考核ID',
  `objective` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '目标描述',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '目标详细说明',
  `weight` decimal(5,2) DEFAULT '100.00' COMMENT '权重（百分比）',
  `progress` decimal(5,2) DEFAULT '0.00' COMMENT '完成进度（百分比）',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态：active-进行中，completed-已完成，cancelled-已取消',
  `self_rating` tinyint DEFAULT NULL COMMENT '自评等级（1-5）',
  `leader_rating` tinyint DEFAULT NULL COMMENT '领导评分等级（1-5）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_assessment_id` (`assessment_id`),
  KEY `idx_status` (`status`),
  KEY `idx_okrs_user_assessment` (`user_id`,`assessment_id`),
  KEY `idx_okrs_assessment_status` (`assessment_id`,`status`),
  CONSTRAINT `fk_okrs_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_okrs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OKR目标表';

-- ----------------------------
-- Records of okrs
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for roles
-- ----------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色编码',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '角色描述',
  `permissions` json DEFAULT NULL COMMENT '权限列表',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1-正常，0-禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ----------------------------
-- Records of roles
-- ----------------------------
BEGIN;
INSERT INTO `roles` (`id`, `code`, `name`, `description`, `permissions`, `status`, `created_at`, `updated_at`) VALUES (1, 'admin', '系统管理员', '拥有系统最高权限', '[\"*\"]', 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `roles` (`id`, `code`, `name`, `description`, `permissions`, `status`, `created_at`, `updated_at`) VALUES (2, 'boss', '公司老板', '可查看全公司数据', '[\"view:all\", \"report:all\"]', 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `roles` (`id`, `code`, `name`, `description`, `permissions`, `status`, `created_at`, `updated_at`) VALUES (3, 'leader', '部门领导', '管理团队成员和绩效评估', '[\"manage:team\", \"evaluate:members\"]', 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `roles` (`id`, `code`, `name`, `description`, `permissions`, `status`, `created_at`, `updated_at`) VALUES (4, 'employee', '员工', '查看个人绩效和历史记录', '[\"view:self\", \"edit:self\"]', 1, '2025-07-07 23:21:33', '2025-07-07 23:21:33');
COMMIT;

-- ----------------------------
-- Table structure for system_configs
-- ----------------------------
DROP TABLE IF EXISTS `system_configs`;
CREATE TABLE `system_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` text COLLATE utf8mb4_unicode_ci COMMENT '配置值',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置描述',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'string' COMMENT '值类型：string-字符串，number-数字，boolean-布尔，json-JSON',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ----------------------------
-- Records of system_configs
-- ----------------------------
BEGIN;
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `description`, `type`, `created_at`, `updated_at`) VALUES (1, 'system.name', 'OKR绩效考核系统', '系统名称', 'string', '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `description`, `type`, `created_at`, `updated_at`) VALUES (2, 'assessment.auto_reminder', 'true', '自动提醒功能开关', 'boolean', '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `description`, `type`, `created_at`, `updated_at`) VALUES (3, 'assessment.reminder_days', '3', '考核截止前提醒天数', 'number', '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `description`, `type`, `created_at`, `updated_at`) VALUES (4, 'score.max_value', '100', '评分最大值', 'number', '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `description`, `type`, `created_at`, `updated_at`) VALUES (5, 'score.min_value', '0', '评分最小值', 'number', '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `description`, `type`, `created_at`, `updated_at`) VALUES (6, 'okr.max_objectives', '5', '每个考核周期最大OKR目标数', 'number', '2025-07-07 23:21:33', '2025-07-07 23:21:33');
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `description`, `type`, `created_at`, `updated_at`) VALUES (7, 'okr.max_key_results', '5', '每个目标最大关键结果数', 'number', '2025-07-07 23:21:33', '2025-07-07 23:21:33');
COMMIT;

-- ----------------------------
-- Table structure for templates
-- ----------------------------
DROP TABLE IF EXISTS `templates`;
CREATE TABLE `templates` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '模板描述',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板类型：assessment-考核模板，okr-OKR模板',
  `config` json NOT NULL COMMENT '模板配置（JSON格式）',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认模板：1-是，0-否',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1-启用，0-禁用',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_templates_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评估模板表';

-- ----------------------------
-- Records of templates
-- ----------------------------
BEGIN;
INSERT INTO `templates` (`id`, `name`, `description`, `type`, `config`, `is_default`, `status`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES (3, '系统默认考核模板', '系统内置的标准化绩效考核模板', 'assessment', '{\"version\": \"1.0\", \"categories\": [{\"id\": \"work_performance\", \"name\": \"工作绩效\", \"items\": [{\"id\": \"work_saturation\", \"name\": \"工作饱和度\", \"weight\": 20, \"max_score\": 100, \"description\": \"工作量的充实程度和时间利用效率\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"工作量适中，基本达到要求\"}, \"poor\": {\"min\": 0, \"description\": \"工作量明显不足\"}, \"average\": {\"min\": 70, \"description\": \"工作量偏少或时间利用不充分\"}, \"excellent\": {\"min\": 90, \"description\": \"工作安排合理，时间利用率高\"}}}, {\"id\": \"work_execution\", \"name\": \"工作执行度\", \"weight\": 20, \"max_score\": 100, \"description\": \"对工作任务的执行能力和执行效果\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"执行到位，按时完成任务\"}, \"poor\": {\"min\": 0, \"description\": \"执行不力，经常延误\"}, \"average\": {\"min\": 70, \"description\": \"基本执行，偶有延误\"}, \"excellent\": {\"min\": 90, \"description\": \"执行力强，能够超额完成任务\"}}}, {\"id\": \"work_completion\", \"name\": \"工作完成度\", \"weight\": 20, \"max_score\": 100, \"description\": \"工作任务的完成质量和完成率\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"完成质量良好，完成率90%以上\"}, \"poor\": {\"min\": 0, \"description\": \"完成率低于80%\"}, \"average\": {\"min\": 70, \"description\": \"基本完成，完成率80%以上\"}, \"excellent\": {\"min\": 90, \"description\": \"完成质量优秀，完成率100%\"}}}, {\"id\": \"work_efficiency\", \"name\": \"工作效率\", \"weight\": 20, \"max_score\": 100, \"description\": \"单位时间内的工作产出和质量\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"效率良好，产出符合要求\"}, \"poor\": {\"min\": 0, \"description\": \"效率低下\"}, \"average\": {\"min\": 70, \"description\": \"效率一般，需要改进\"}, \"excellent\": {\"min\": 90, \"description\": \"效率极高，产出质量优秀\"}}}, {\"id\": \"work_quality\", \"name\": \"工作质量\", \"weight\": 20, \"max_score\": 100, \"description\": \"工作成果的质量水平和标准符合度\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"质量良好，符合标准\"}, \"poor\": {\"min\": 0, \"description\": \"质量不达标\"}, \"average\": {\"min\": 70, \"description\": \"质量一般，基本达标\"}, \"excellent\": {\"min\": 90, \"description\": \"质量优秀，超出预期\"}}}], \"weight\": 60, \"description\": \"衡量员工工作成果和执行能力\", \"evaluator_types\": [\"self\", \"leader\"]}, {\"id\": \"daily_management\", \"name\": \"日常管理\", \"items\": [{\"id\": \"work_attitude\", \"name\": \"工作态度\", \"weight\": 20, \"max_score\": 100, \"description\": \"对工作的积极性和责任心\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"态度良好，认真负责\"}, \"poor\": {\"min\": 0, \"description\": \"态度消极，缺乏责任心\"}, \"average\": {\"min\": 70, \"description\": \"态度一般，需要督促\"}, \"excellent\": {\"min\": 90, \"description\": \"积极主动，责任心强\"}}}, {\"id\": \"approval_process\", \"name\": \"审批流程\", \"weight\": 15, \"max_score\": 100, \"description\": \"审批流程的遵守和执行情况\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"基本遵守流程\"}, \"poor\": {\"min\": 0, \"description\": \"经常违反流程\"}, \"average\": {\"min\": 70, \"description\": \"偶有流程不当\"}, \"excellent\": {\"min\": 90, \"description\": \"严格遵守流程，审批及时\"}}}, {\"id\": \"attendance\", \"name\": \"日常出勤\", \"weight\": 15, \"max_score\": 100, \"description\": \"出勤率和时间管理\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"出勤率95%以上\"}, \"poor\": {\"min\": 0, \"description\": \"出勤率低于90%\"}, \"average\": {\"min\": 70, \"description\": \"出勤率90%以上\"}, \"excellent\": {\"min\": 90, \"description\": \"出勤率100%，时间管理良好\"}}}, {\"id\": \"work_report\", \"name\": \"工作汇报\", \"weight\": 15, \"max_score\": 100, \"description\": \"工作汇报的及时性和质量\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"汇报基本及时\"}, \"poor\": {\"min\": 0, \"description\": \"汇报不及时或质量差\"}, \"average\": {\"min\": 70, \"description\": \"汇报偶有延误\"}, \"excellent\": {\"min\": 90, \"description\": \"汇报及时、详细、准确\"}}}, {\"id\": \"team_activity\", \"name\": \"团队活动\", \"weight\": 10, \"max_score\": 100, \"description\": \"参与团队活动的积极性\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"正常参与团队活动\"}, \"poor\": {\"min\": 0, \"description\": \"很少参与团队活动\"}, \"average\": {\"min\": 70, \"description\": \"参与度一般\"}, \"excellent\": {\"min\": 90, \"description\": \"积极参与，贡献突出\"}}}, {\"id\": \"office_environment\", \"name\": \"办公室环境维护\", \"weight\": 10, \"max_score\": 100, \"description\": \"办公环境的维护和整洁程度\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"环境基本整洁\"}, \"poor\": {\"min\": 0, \"description\": \"环境维护不佳\"}, \"average\": {\"min\": 70, \"description\": \"环境维护一般\"}, \"excellent\": {\"min\": 90, \"description\": \"环境整洁，维护良好\"}}}, {\"id\": \"rule_compliance\", \"name\": \"规章制度遵守\", \"weight\": 15, \"max_score\": 100, \"description\": \"公司规章制度的遵守情况\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"基本遵守制度\"}, \"poor\": {\"min\": 0, \"description\": \"经常违反规章制度\"}, \"average\": {\"min\": 70, \"description\": \"偶有违规情况\"}, \"excellent\": {\"min\": 90, \"description\": \"严格遵守各项制度\"}}}], \"weight\": 30, \"description\": \"日常工作行为和规范遵守情况\", \"evaluator_types\": [\"self\", \"leader\"]}, {\"id\": \"leader_evaluation\", \"name\": \"领导评价\", \"items\": [{\"id\": \"special_task_completion\", \"name\": \"交代的专项按时完成并及时反馈\", \"weight\": 100, \"max_score\": 100, \"description\": \"对领导交代的特殊任务的完成情况和反馈及时性\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"专项任务按时完成，反馈及时\"}, \"poor\": {\"min\": 0, \"description\": \"专项任务完成不佳或反馈不及时\"}, \"average\": {\"min\": 70, \"description\": \"专项任务基本完成，反馈一般\"}, \"excellent\": {\"min\": 90, \"description\": \"专项任务完成出色，反馈及时详细\"}}}], \"weight\": 10, \"description\": \"领导对员工的专项工作评价\", \"evaluator_types\": [\"leader\"], \"special_attributes\": {\"leader_only\": true, \"required_role\": \"leader\"}}], \"description\": \"系统内置的标准考核模板，包含工作绩效、日常管理和领导评价三大维度\", \"total_score\": 100, \"scoring_rules\": {\"self_evaluation\": {\"enabled\": true, \"description\": \"员工自我评估\", \"weight_in_final\": 0.4}, \"leader_evaluation\": {\"enabled\": true, \"description\": \"直属领导评估\", \"weight_in_final\": 0.6}, \"calculation_method\": \"weighted_average\"}, \"scoring_method\": \"weighted\", \"scoring_criteria\": {\"good\": {\"min\": 80, \"description\": \"完成目标，表现符合预期\"}, \"poor\": {\"min\": 0, \"description\": \"未完成目标，表现不佳\"}, \"average\": {\"min\": 70, \"description\": \"基本完成目标，表现一般\"}, \"excellent\": {\"min\": 90, \"description\": \"超额完成目标，表现突出\"}}, \"usage_instructions\": {\"for_leaders\": [\"1. 基于实际观察和工作成果进行评分\", \"2. 提供具体的反馈和改进建议\", \"3. 确保评分的公平性和客观性\", \"4. 对\\\"领导评价\\\"部分进行专项评估\"], \"for_employees\": [\"1. 根据各项评分标准进行客观自评\", \"2. 提供具体的工作实例和数据支持\", \"3. 诚实反映自己的工作表现\", \"4. 注意：无法对\\\"领导评价\\\"部分进行自评\"]}}', 1, 1, 1, '2025-07-08 10:33:40', '2025-07-09 14:29:31', NULL);
COMMIT;

-- ----------------------------
-- Table structure for user_roles
-- ----------------------------
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- ----------------------------
-- Records of user_roles
-- ----------------------------
BEGIN;
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (1, 1, 1, '2025-07-07 23:21:33');
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (2, 2, 2, '2025-07-07 23:21:33');
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (3, 3, 3, '2025-07-07 23:21:33');
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (4, 4, 3, '2025-07-07 23:21:33');
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (5, 5, 4, '2025-07-07 23:21:33');
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (6, 6, 4, '2025-07-07 23:21:33');
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (7, 7, 4, '2025-07-08 09:43:10');
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES (9, 9, 4, '2025-07-16 14:57:20');
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码hash',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '真实姓名',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '电话',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1-正常，0-禁用',
  `join_date` date DEFAULT NULL COMMENT '入职日期',
  `department_id` bigint DEFAULT NULL COMMENT '部门ID',
  `leader_id` bigint DEFAULT NULL COMMENT '直属领导ID',
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '职位',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_department_id` (`department_id`),
  KEY `idx_leader_id` (`leader_id`),
  KEY `idx_status` (`status`),
  KEY `idx_users_dept_status` (`department_id`,`status`),
  KEY `idx_users_leader_status` (`leader_id`,`status`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `fk_users_leader` FOREIGN KEY (`leader_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (1, 'admin', '$2b$10$YfQAOclk1CIMFrP4.vDUluGJAC00hoBPKnT5fd9pTRMrjF3KEBlgu', '系统管理员', NULL, NULL, NULL, 1, '2023-01-01', NULL, NULL, '系统管理员', '2025-07-07 23:21:33', '2025-07-16 14:53:15', NULL);
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (2, 'boss', '$2b$10$YfQAOclk1CIMFrP4.vDUluGJAC00hoBPKnT5fd9pTRMrjF3KEBlgu', '公司老板', NULL, NULL, NULL, 1, '2022-01-01', NULL, NULL, '首席执行官', '2025-07-07 23:21:33', '2025-07-07 23:33:23', NULL);
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (3, 'lisi', '$2b$10$YfQAOclk1CIMFrP4.vDUluGJAC00hoBPKnT5fd9pTRMrjF3KEBlgu', '李四', 'ws28213@yeah.net', '13800138000', NULL, 1, '2022-08-10', 1, NULL, '技术经理', '2025-07-07 23:21:33', '2025-07-09 11:42:07', NULL);
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (4, 'zhaoliu', '$2b$10$YfQAOclk1CIMFrP4.vDUluGJAC00hoBPKnT5fd9pTRMrjF3KEBlgu', '赵六', NULL, NULL, NULL, 1, '2022-12-05', 2, NULL, '市场经理', '2025-07-07 23:21:33', '2025-07-07 23:33:26', NULL);
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (5, 'zhangsan', '$2b$10$YfQAOclk1CIMFrP4.vDUluGJAC00hoBPKnT5fd9pTRMrjF3KEBlgu', '张三', 'wangsuoo@qq.com', '17858918830', NULL, 1, '2023-03-15', 1, 3, '前端工程师', '2025-07-07 23:21:33', '2025-07-07 23:33:27', NULL);
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (6, 'wangwu', '$2b$10$YfQAOclk1CIMFrP4.vDUluGJAC00hoBPKnT5fd9pTRMrjF3KEBlgu', '王五', NULL, NULL, NULL, 1, '2023-05-20', 1, NULL, '后端工程师', '2025-07-07 23:21:33', '2025-07-07 23:33:28', NULL);
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (7, 'wyx', '$2b$10$YfQAOclk1CIMFrP4.vDUluGJAC00hoBPKnT5fd9pTRMrjF3KEBlgu', 'wyx', 'wangsuoo@example.com', '13800138000', NULL, 1, '2023-03-15', 1, 3, '全栈工程师', '2025-07-08 09:43:10', '2025-07-16 14:53:18', NULL);
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `avatar`, `status`, `join_date`, `department_id`, `leader_id`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES (9, 'yhh', '$2b$10$46EvD7VUjcysCdHbwZxoi.U76OYGMl781uLvCOqkQwjbJLlEIQTza', '杨行行', 'allan@agrochainhub.com', '17858987762', NULL, 1, '2025-06-16', 2, 4, '市场部老大', '2025-07-16 14:57:20', '2025-07-16 14:57:20', NULL);
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
