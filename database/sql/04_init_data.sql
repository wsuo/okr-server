-- OKR绩效考核系统 - 初始化数据脚本

USE okr_system;

-- 1. 默认角色数据
INSERT INTO `roles` (`code`, `name`, `description`, `permissions`) VALUES
('admin', '系统管理员', '拥有系统最高权限', '["*"]'),
('boss', '公司老板', '可查看全公司数据', '["view:all", "report:all"]'),
('leader', '部门领导', '管理团队成员和绩效评估', '["manage:team", "evaluate:members"]'),
('employee', '员工', '查看个人绩效和历史记录', '["view:self", "edit:self"]');

-- 2. 默认部门数据
INSERT INTO `departments` (`name`, `description`) VALUES
('技术部', '负责产品研发和技术支持'),
('市场部', '负责市场推广和销售'),
('人事部', '负责人力资源管理'),
('财务部', '负责财务管理和会计');

-- 3. 默认用户数据（密码为 123456 的 bcrypt hash）
INSERT INTO `users` (`username`, `password`, `name`, `join_date`, `department_id`, `position`) VALUES
('admin', '$2b$10$EixYMJbkxr0sY8sBdRcnJO6l1PZv4UZhyPAYzK8QXOvjLKh3t6XKa', '系统管理员', '2023-01-01', NULL, '系统管理员'),
('boss', '$2b$10$EixYMJbkxr0sY8sBdRcnJO6l1PZv4UZhyPAYzK8QXOvjLKh3t6XKa', '公司老板', '2022-01-01', NULL, '首席执行官'),
('lisi', '$2b$10$EixYMJbkxr0sY8sBdRcnJO6l1PZv4UZhyPAYzK8QXOvjLKh3t6XKa', '李四', '2022-08-10', 1, '技术经理'),
('zhaoliu', '$2b$10$EixYMJbkxr0sY8sBdRcnJO6l1PZv4UZhyPAYzK8QXOvjLKh3t6XKa', '赵六', '2022-12-05', 2, '市场经理'),
('zhangsan', '$2b$10$EixYMJbkxr0sY8sBdRcnJO6l1PZv4UZhyPAYzK8QXOvjLKh3t6XKa', '张三', '2023-03-15', 1, '前端工程师'),
('wangwu', '$2b$10$EixYMJbkxr0sY8sBdRcnJO6l1PZv4UZhyPAYzK8QXOvjLKh3t6XKa', '王五', '2023-05-20', 1, '后端工程师');

-- 4. 用户角色关联
INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1), -- admin -> admin
(2, 2), -- boss -> boss
(3, 3), -- lisi -> leader
(4, 3), -- zhaoliu -> leader
(5, 4), -- zhangsan -> employee
(6, 4); -- wangwu -> employee

-- 5. 默认评估模板
INSERT INTO `templates` (`name`, `description`, `type`, `config`, `is_default`, `created_by`) VALUES
(
  '标准OKR模板', 
  '适用于大部分岗位的标准OKR考核模板', 
  'okr',
  JSON_OBJECT(
    'sections', JSON_ARRAY(
      JSON_OBJECT('name', '工作完成度', 'weight', 40, 'criteria', JSON_ARRAY('任务完成质量', '交付及时性')),
      JSON_OBJECT('name', '目标达成度', 'weight', 30, 'criteria', JSON_ARRAY('关键结果完成情况', '目标完成度')),
      JSON_OBJECT('name', '团队协作', 'weight', 20, 'criteria', JSON_ARRAY('沟通能力', '协作效果')),
      JSON_OBJECT('name', '个人成长', 'weight', 10, 'criteria', JSON_ARRAY('学习能力', '创新思维'))
    )
  ),
  1,
  1
),
(
  '技术岗位OKR模板', 
  '适用于技术部门的专业OKR考核模板', 
  'okr',
  JSON_OBJECT(
    'sections', JSON_ARRAY(
      JSON_OBJECT('name', '技术实现', 'weight', 35, 'criteria', JSON_ARRAY('代码质量', '技术方案')),
      JSON_OBJECT('name', '项目交付', 'weight', 30, 'criteria', JSON_ARRAY('按时交付', '质量标准')),
      JSON_OBJECT('name', '技术创新', 'weight', 20, 'criteria', JSON_ARRAY('技术改进', '工具优化')),
      JSON_OBJECT('name', '知识分享', 'weight', 15, 'criteria', JSON_ARRAY('文档编写', '技术分享'))
    )
  ),
  0,
  1
);

-- 6. 系统配置
INSERT INTO `system_configs` (`config_key`, `config_value`, `description`, `type`) VALUES
('system.name', 'OKR绩效考核系统', '系统名称', 'string'),
('assessment.auto_reminder', 'true', '自动提醒功能开关', 'boolean'),
('assessment.reminder_days', '3', '考核截止前提醒天数', 'number'),
('score.max_value', '100', '评分最大值', 'number'),
('score.min_value', '0', '评分最小值', 'number'),
('okr.max_objectives', '5', '每个考核周期最大OKR目标数', 'number'),
('okr.max_key_results', '5', '每个目标最大关键结果数', 'number');