import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Template } from "../../../entities/template.entity";
import { AssessmentParticipant } from "../../../entities/assessment-participant.entity";
import { Evaluation } from "../../../entities/evaluation.entity";
import { EvaluationType, EvaluationStatus } from "../../../common/enums/evaluation.enum";

export interface ScoreBreakdown {
  category: string;
  categoryName: string;
  categoryWeight: number;
  items: {
    itemId: string;
    itemName: string;
    itemWeight: number;
    selfScore: number;
    leaderScore: number;
    itemFinalScore: number;
  }[];
  categorySelfScore: number;
  categoryLeaderScore: number;
  categoryFinalScore: number;
}

export interface ParticipantScoreResult {
  userId: number;
  selfScore: number;
  leaderScore: number;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown[];
}

@Injectable()
export class ScoreCalculationService {
  constructor(
    @InjectRepository(Template)
    private templatesRepository: Repository<Template>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>
  ) {}

  /**
   * 根据模板配置计算参与者的最终得分
   */
  async calculateParticipantScores(
    assessmentId: number,
    participants: AssessmentParticipant[],
    templateConfig?: any
  ): Promise<ParticipantScoreResult[]> {
    // 优先使用传入的模板配置（考核的配置快照）
    let template = null;

    if (templateConfig) {
      // 使用传入的配置快照创建临时模板对象
      template = { config: templateConfig };
    } else {
      // 如果没有传入配置，则获取考核的模板配置（向后兼容）
      template = await this.getAssessmentTemplate(assessmentId);
      if (!template) {
        throw new BadRequestException("考核没有关联的模板，无法计算得分");
      }
    }

    const results: ParticipantScoreResult[] = [];

    for (const participant of participants) {
      const evaluations = await this.getParticipantEvaluations(
        assessmentId,
        participant.user.id
      );

      const scoreResult = await this.calculateSingleParticipantScore(
        template,
        participant,
        evaluations
      );

      results.push(scoreResult);
    }

    return results;
  }

  /**
   * 计算单个参与者的得分
   */
  private async calculateSingleParticipantScore(
    template: Template,
    participant: AssessmentParticipant,
    evaluations: Evaluation[]
  ): Promise<ParticipantScoreResult> {
    const templateConfig = template.config;
    const scoringRules = templateConfig.scoring_rules;

    // 验证模板配置
    this.validateTemplateConfig(templateConfig);

    const scoreBreakdown: ScoreBreakdown[] = [];
    let totalSelfScore = 0;
    let totalLeaderScore = 0;

    // 按类别计算得分
    for (const category of templateConfig.categories) {
      const categoryResult = this.calculateCategoryScore(
        category,
        evaluations,
        participant.user.id
      );

      scoreBreakdown.push(categoryResult);

      // 累加到总分（考虑类别权重）
      totalSelfScore +=
        categoryResult.categorySelfScore * (category.weight / 100);
      totalLeaderScore +=
        categoryResult.categoryLeaderScore * (category.weight / 100);
    }

    // 根据评估者权重计算最终得分
    const weightConfig = this.parseTemplateWeights(scoringRules);
    
    let finalScore = 0;
    if (weightConfig.scoring_mode === 'two_tier_weighted') {
      // 两层加权模式：boss权重 + (self权重 + leader权重) * employee_leader权重
      const bossScore = 0; // TODO: 需要获取boss评分
      const employeeLeaderScore = totalSelfScore * weightConfig.self_weight_in_employee_leader + totalLeaderScore * weightConfig.leader_weight_in_employee_leader;
      finalScore = bossScore * weightConfig.boss_weight + employeeLeaderScore * weightConfig.employee_leader_weight;
    } else {
      // 传统模式：直接权重计算
      const selfWeight = weightConfig.self_weight || scoringRules.self_evaluation?.weight_in_final || 0.3;
      const leaderWeight = weightConfig.leader_weight || scoringRules.leader_evaluation?.weight_in_final || 0.7;
      finalScore = totalSelfScore * selfWeight + totalLeaderScore * leaderWeight;
    }

    return {
      userId: participant.user.id,
      selfScore: Math.round(totalSelfScore * 100) / 100,
      leaderScore: Math.round(totalLeaderScore * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
      scoreBreakdown,
    };
  }

  /**
   * 计算单个类别的得分
   */
  private calculateCategoryScore(
    category: any,
    evaluations: Evaluation[],
    userId: number
  ): ScoreBreakdown {
    const items = [];
    let categorySelfScore = 0;
    let categoryLeaderScore = 0;

    for (const item of category.items) {
      // 获取该项目的自评和领导评分
      const selfEvaluation = evaluations.find(
        (e) => e.evaluatee.id === userId && e.type === "self"
      );
      const leaderEvaluation = evaluations.find(
        (e) => e.evaluatee.id === userId && e.type === "leader"
      );

      // 从评估记录中提取具体项目的得分
      // 这里假设评估记录包含详细的项目得分信息
      const selfScore = this.extractItemScore(selfEvaluation, item.id) || 0;
      const leaderScore = this.extractItemScore(leaderEvaluation, item.id) || 0;

      // 计算项目最终得分（这里使用简单平均，可以根据需要调整）
      const itemFinalScore = (selfScore + leaderScore) / 2;

      items.push({
        itemId: item.id,
        itemName: item.name,
        itemWeight: item.weight,
        selfScore,
        leaderScore,
        itemFinalScore,
      });

      // 累加到类别得分（考虑项目权重）
      categorySelfScore += selfScore * (item.weight / 100);
      categoryLeaderScore += leaderScore * (item.weight / 100);
    }

    return {
      category: category.id,
      categoryName: category.name,
      categoryWeight: category.weight,
      items,
      categorySelfScore: Math.round(categorySelfScore * 100) / 100,
      categoryLeaderScore: Math.round(categoryLeaderScore * 100) / 100,
      categoryFinalScore:
        Math.round(((categorySelfScore + categoryLeaderScore) / 2) * 100) / 100,
    };
  }

  /**
   * 从评估记录中提取特定项目的得分
   * 注意：这里需要根据实际的评估数据结构进行调整
   */
  private extractItemScore(evaluation: Evaluation, itemId: string): number {
    if (!evaluation) return 0;

    // 这里假设评估记录的feedback字段包含详细的项目得分
    // 实际实现需要根据具体的数据结构调整
    try {
      const feedbackData = JSON.parse(evaluation.feedback || "{}");
      return feedbackData[itemId] || evaluation.score || 0;
    } catch {
      return evaluation.score || 0;
    }
  }

  /**
   * 获取考核的模板
   */
  private async getAssessmentTemplate(
    assessmentId: number
  ): Promise<Template | null> {
    const template = await this.templatesRepository
      .createQueryBuilder("template")
      .innerJoin("template.assessments", "assessment")
      .where("assessment.id = :assessmentId", { assessmentId })
      .andWhere("template.deleted_at IS NULL")
      .getOne();

    return template;
  }

  /**
   * 获取参与者的评估记录
   */
  private async getParticipantEvaluations(
    assessmentId: number,
    userId: number
  ): Promise<Evaluation[]> {
    return this.evaluationsRepository.find({
      where: {
        assessment: { id: assessmentId },
        evaluatee: { id: userId },
        status: EvaluationStatus.SUBMITTED,
      },
      relations: ["evaluator", "evaluatee"],
    });
  }

  /**
   * 验证模板配置的完整性
   */
  private validateTemplateConfig(config: any): void {
    if (!config.scoring_rules) {
      throw new BadRequestException("模板配置缺少评分规则");
    }

    if (!config.categories || !Array.isArray(config.categories)) {
      throw new BadRequestException("模板配置缺少评估类别");
    }

    // 验证评估者权重总和为1
    const selfWeight =
      config.scoring_rules.self_evaluation?.weight_in_final || 0;
    const leaderWeight =
      config.scoring_rules.leader_evaluation?.weight_in_final || 0;

    if (Math.abs(selfWeight + leaderWeight - 1) > 0.01) {
      throw new BadRequestException("评估者权重总和必须为1");
    }

    // 验证类别权重总和为100
    const totalCategoryWeight = config.categories.reduce(
      (sum, cat) => sum + (cat.weight || 0),
      0
    );

    if (Math.abs(totalCategoryWeight - 100) > 0.01) {
      throw new BadRequestException("类别权重总和必须为100");
    }
  }

  /**
   * 解析模板权重配置，支持新旧两种格式
   */
  private parseTemplateWeights(scoringRules: any): any {
    // 新的两层加权模式
    if (scoringRules.scoring_mode === 'two_tier_weighted' && scoringRules.two_tier_config) {
      const config = scoringRules.two_tier_config;
      return {
        scoring_mode: 'two_tier_weighted',
        boss_weight: config.boss_weight / 100,
        employee_leader_weight: config.employee_leader_weight / 100,
        self_weight_in_employee_leader: config.self_weight_in_employee_leader / 100,
        leader_weight_in_employee_leader: config.leader_weight_in_employee_leader / 100,
      };
    }
    
    // 传统模式
    return {
      scoring_mode: 'traditional',
      self_weight: scoringRules.self_evaluation?.weight_in_final || 0.3,
      leader_weight: scoringRules.leader_evaluation?.weight_in_final || 0.7,
      boss_weight: scoringRules.boss_evaluation?.weight_in_final || 0,
    };
  }

  /**
   * 获取模板的评估者权重配置
   */
  getEvaluatorWeights(template: Template): { self: number; leader: number } {
    const config = template.config;
    const weightConfig = this.parseTemplateWeights(config.scoring_rules);
    
    if (weightConfig.scoring_mode === 'two_tier_weighted') {
      // 两层加权模式下返回在employee_leader层级的权重
      return {
        self: weightConfig.self_weight_in_employee_leader,
        leader: weightConfig.leader_weight_in_employee_leader,
      };
    }
    
    // 传统模式
    return {
      self: weightConfig.self_weight,
      leader: weightConfig.leader_weight,
    };
  }
}
