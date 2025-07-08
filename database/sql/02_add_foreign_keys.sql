-- OKR绩效考核系统 - 外键约束脚本

USE okr_system;

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