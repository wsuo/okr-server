-- OKR绩效考核系统 - 索引优化脚本

USE okr_system;

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