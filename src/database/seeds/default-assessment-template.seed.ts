import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Template } from "../../entities/template.entity";
import { User } from "../../entities/user.entity";

@Injectable()
export class DefaultAssessmentTemplateSeed {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const templateRepository = this.dataSource.getRepository(Template);
    const userRepository = this.dataSource.getRepository(User);

    // 检查是否已存在默认模板
    const existingTemplate = await templateRepository.findOne({
      where: {
        name: "系统默认考核模板",
        type: "assessment",
      },
    });

    if (existingTemplate) {
      console.log("默认考核模板已存在，跳过创建");
      return;
    }

    // 获取系统管理员用户作为创建者
    const adminUser = await userRepository.findOne({
      where: { username: "admin" },
    });

    if (!adminUser) {
      throw new Error("未找到系统管理员用户，请先创建admin用户");
    }

    // 创建复杂的分层评估模板配置
    const templateConfig = {
      version: "1.0",
      description:
        "系统内置的标准考核模板，包含工作绩效、日常管理和领导评价三大维度",
      scoring_method: "weighted", // 加权评分
      total_score: 100,

      // 考核大项配置
      categories: [
        {
          id: "work_performance",
          name: "工作绩效",
          description: "衡量员工工作成果和执行能力",
          weight: 60, // 权重60%
          evaluator_types: ["self", "leader"], // 自评和领导评价
          items: [
            {
              id: "work_saturation",
              name: "工作饱和度",
              description: "工作量的充实程度和时间利用效率",
              weight: 20, // 在工作绩效中占20%
              max_score: 100,
              scoring_criteria: {
                excellent: {
                  min: 90,
                  description: "工作安排合理，时间利用率高",
                },
                good: { min: 80, description: "工作量适中，基本达到要求" },
                average: { min: 70, description: "工作量偏少或时间利用不充分" },
                poor: { min: 0, description: "工作量明显不足" },
              },
            },
            {
              id: "work_execution",
              name: "工作执行度",
              description: "对工作任务的执行能力和执行效果",
              weight: 20,
              max_score: 100,
              scoring_criteria: {
                excellent: {
                  min: 90,
                  description: "执行力强，能够超额完成任务",
                },
                good: { min: 80, description: "执行到位，按时完成任务" },
                average: { min: 70, description: "基本执行，偶有延误" },
                poor: { min: 0, description: "执行不力，经常延误" },
              },
            },
            {
              id: "work_completion",
              name: "工作完成度",
              description: "工作任务的完成质量和完成率",
              weight: 20,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "完成质量优秀，完成率100%" },
                good: { min: 80, description: "完成质量良好，完成率90%以上" },
                average: { min: 70, description: "基本完成，完成率80%以上" },
                poor: { min: 0, description: "完成率低于80%" },
              },
            },
            {
              id: "work_efficiency",
              name: "工作效率",
              description: "单位时间内的工作产出和质量",
              weight: 20,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "效率极高，产出质量优秀" },
                good: { min: 80, description: "效率良好，产出符合要求" },
                average: { min: 70, description: "效率一般，需要改进" },
                poor: { min: 0, description: "效率低下" },
              },
            },
            {
              id: "work_quality",
              name: "工作质量",
              description: "工作成果的质量水平和标准符合度",
              weight: 20,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "质量优秀，超出预期" },
                good: { min: 80, description: "质量良好，符合标准" },
                average: { min: 70, description: "质量一般，基本达标" },
                poor: { min: 0, description: "质量不达标" },
              },
            },
          ],
        },
        {
          id: "daily_management",
          name: "日常管理",
          description: "日常工作行为和规范遵守情况",
          weight: 30, // 权重30%
          evaluator_types: ["self", "leader"], // 自评和领导评价
          items: [
            {
              id: "work_attitude",
              name: "工作态度",
              description: "对工作的积极性和责任心",
              weight: 20,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "积极主动，责任心强" },
                good: { min: 80, description: "态度良好，认真负责" },
                average: { min: 70, description: "态度一般，需要督促" },
                poor: { min: 0, description: "态度消极，缺乏责任心" },
              },
            },
            {
              id: "approval_process",
              name: "审批流程",
              description: "审批流程的遵守和执行情况",
              weight: 15,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "严格遵守流程，审批及时" },
                good: { min: 80, description: "基本遵守流程" },
                average: { min: 70, description: "偶有流程不当" },
                poor: { min: 0, description: "经常违反流程" },
              },
            },
            {
              id: "attendance",
              name: "日常出勤",
              description: "出勤率和时间管理",
              weight: 15,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "出勤率100%，时间管理良好" },
                good: { min: 80, description: "出勤率95%以上" },
                average: { min: 70, description: "出勤率90%以上" },
                poor: { min: 0, description: "出勤率低于90%" },
              },
            },
            {
              id: "work_report",
              name: "工作汇报",
              description: "工作汇报的及时性和质量",
              weight: 15,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "汇报及时、详细、准确" },
                good: { min: 80, description: "汇报基本及时" },
                average: { min: 70, description: "汇报偶有延误" },
                poor: { min: 0, description: "汇报不及时或质量差" },
              },
            },
            {
              id: "team_activity",
              name: "团队活动",
              description: "参与团队活动的积极性",
              weight: 10,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "积极参与，贡献突出" },
                good: { min: 80, description: "正常参与团队活动" },
                average: { min: 70, description: "参与度一般" },
                poor: { min: 0, description: "很少参与团队活动" },
              },
            },
            {
              id: "office_environment",
              name: "办公室环境维护",
              description: "办公环境的维护和整洁程度",
              weight: 10,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "环境整洁，维护良好" },
                good: { min: 80, description: "环境基本整洁" },
                average: { min: 70, description: "环境维护一般" },
                poor: { min: 0, description: "环境维护不佳" },
              },
            },
            {
              id: "rule_compliance",
              name: "规章制度遵守",
              description: "公司规章制度的遵守情况",
              weight: 15,
              max_score: 100,
              scoring_criteria: {
                excellent: { min: 90, description: "严格遵守各项制度" },
                good: { min: 80, description: "基本遵守制度" },
                average: { min: 70, description: "偶有违规情况" },
                poor: { min: 0, description: "经常违反规章制度" },
              },
            },
          ],
        },
        {
          id: "leader_evaluation",
          name: "领导评价",
          description: "领导对员工的专项工作评价",
          weight: 10, // 权重10%
          evaluator_types: ["leader"], // 仅限领导评价
          special_attributes: {
            leader_only: true, // 特殊属性：仅限领导评分
            required_role: "leader",
          },
          items: [
            {
              id: "special_task_completion",
              name: "交代的专项按时完成并及时反馈",
              description: "对领导交代的特殊任务的完成情况和反馈及时性",
              weight: 100, // 这个大项下只有一个子项
              max_score: 100,
              scoring_criteria: {
                excellent: {
                  min: 90,
                  description: "专项任务完成出色，反馈及时详细",
                },
                good: { min: 80, description: "专项任务按时完成，反馈及时" },
                average: { min: 70, description: "专项任务基本完成，反馈一般" },
                poor: { min: 0, description: "专项任务完成不佳或反馈不及时" },
              },
            },
          ],
        },
      ],

      // 评分规则
      scoring_rules: {
        self_evaluation: {
          enabled: true,
          description: "员工自我评估",
          weight_in_final: 0.36, // 自评在最终分数中占36% (原40% × 90%)
        },
        leader_evaluation: {
          enabled: true,
          description: "直属领导评估",
          weight_in_final: 0.54, // 领导评价在最终分数中占54% (原60% × 90%)
        },
        boss_evaluation: {
          enabled: true,
          description: "上级(Boss)评估",
          weight_in_final: 0.10, // 上级评价在最终分数中占10%
          is_optional: true, // 上级评分为可选项，不阻塞整体流程
        },
        calculation_method: "weighted_average", // 加权平均
      },

      // 使用说明
      usage_instructions: {
        for_employees: [
          "1. 根据各项评分标准进行客观自评",
          "2. 提供具体的工作实例和数据支持",
          "3. 诚实反映自己的工作表现",
          '4. 注意：无法对"领导评价"部分进行自评',
        ],
        for_leaders: [
          "1. 基于实际观察和工作成果进行评分",
          "2. 提供具体的反馈和改进建议",
          "3. 确保评分的公平性和客观性",
          '4. 对"领导评价"部分进行专项评估',
        ],
        for_bosses: [
          "1. 基于整体工作表现和战略贡献进行评分",
          "2. 关注跨部门协作和创新能力",
          "3. 提供高层视角的发展建议",
          "4. 上级评分为可选项，可根据实际情况决定是否参与",
        ],
      },
    };

    // 创建模板
    const template = templateRepository.create({
      name: "系统默认考核模板",
      description:
        "系统内置的标准化绩效考核模板，包含工作绩效(60%)、日常管理(30%)、领导评价(10%)三个维度的全面评估",
      type: "assessment",
      config: templateConfig,
      is_default: 1, // 设为默认模板
      status: 1,
      creator: adminUser,
    });

    await templateRepository.save(template);

    console.log("✅ 默认考核模板创建成功");
    console.log(`模板ID: ${template.id}`);
    console.log("模板配置包含:");
    console.log("- 工作绩效 (60%): 工作饱和度、执行度、完成度、效率、质量");
    console.log(
      "- 日常管理 (30%): 工作态度、审批流程、出勤、汇报、团队活动、环境维护、制度遵守"
    );
    console.log("- 领导评价 (10%): 专项任务完成及反馈 (仅限领导评分)");
    console.log("评分权重配置:");
    console.log("- 员工自评: 36% (40% × 90%)");
    console.log("- 领导评分: 54% (60% × 90%)");
    console.log("- 上级评分: 10% (可选项)");
  }
}
