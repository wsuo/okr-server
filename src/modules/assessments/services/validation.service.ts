import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from '../../../entities/assessment.entity';
import { AssessmentParticipant } from '../../../entities/assessment-participant.entity';
import { Evaluation } from '../../../entities/evaluation.entity';
import { Okr } from '../../../entities/okr.entity';
import { Template } from '../../../entities/template.entity';
import { User } from '../../../entities/user.entity';
import { ScoreCalculationService } from './score-calculation.service';
import {
  EndValidationResponseDto,
  DeleteValidationResponseDto,
  ScorePreviewResponseDto,
  ParticipantStatusDto,
  RelatedDataDto,
  PermissionsDto,
  ParticipantScorePreviewDto,
} from '../dto/validation-response.dto';

@Injectable()
export class ValidationService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private participantsRepository: Repository<AssessmentParticipant>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Okr)
    private okrsRepository: Repository<Okr>,
    @InjectRepository(Template)
    private templatesRepository: Repository<Template>,
    private scoreCalculationService: ScoreCalculationService,
  ) {}

  /**
   * 考核结束前的校验
   */
  async validateEndAssessment(
    assessmentId: number,
    currentUserId: number,
  ): Promise<EndValidationResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ['creator', 'template', 'participants', 'participants.user'],
    });

    if (!assessment) {
      return {
        canEnd: false,
        errors: ['考核不存在'],
        warnings: [],
        participantStatus: [],
        templateConfig: { weightConfig: {}, requiredEvaluations: [] },
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查考核状态
    if (assessment.status !== 'active') {
      errors.push('只能结束进行中的考核');
    }

    // 检查权限
    const hasPermission = await this.checkEndPermission(assessment, currentUserId);
    if (!hasPermission) {
      errors.push('您没有权限结束此考核');
    }

    // 检查是否超过截止时间
    const now = new Date();
    const deadline = new Date(assessment.deadline);
    if (now > deadline) {
      warnings.push('考核已超过截止时间');
    }

    // 检查参与者完成状态
    const participantStatus = await this.checkParticipantStatus(assessmentId);
    
    // 检查是否有未完成的评估
    const incompleteParticipants = participantStatus.filter(
      p => !p.selfCompleted || !p.leaderCompleted,
    );
    
    if (incompleteParticipants.length > 0) {
      warnings.push(`有 ${incompleteParticipants.length} 个参与者未完成评估`);
    }

    // 获取模板配置
    const templateConfig = assessment.template
      ? {
          weightConfig: assessment.template.config,
          requiredEvaluations: this.getRequiredEvaluations(assessment.template.config),
        }
      : { weightConfig: {}, requiredEvaluations: [] };

    return {
      canEnd: errors.length === 0,
      errors,
      warnings,
      participantStatus,
      templateConfig,
    };
  }

  /**
   * 考核删除前的校验
   */
  async validateDeleteAssessment(
    assessmentId: number,
    currentUserId: number,
  ): Promise<DeleteValidationResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ['creator'],
    });

    if (!assessment) {
      return {
        canDelete: false,
        errors: ['考核不存在'],
        warnings: [],
        relatedData: {
          evaluationsCount: 0,
          okrsCount: 0,
          hasCompletedEvaluations: false,
        },
        permissions: { canDelete: false, reason: '考核不存在' },
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查考核状态
    if (assessment.status === 'active') {
      errors.push('无法删除进行中的考核');
    }

    // 检查权限
    const permissions = await this.checkDeletePermission(assessment, currentUserId);
    if (!permissions.canDelete) {
      errors.push(permissions.reason || '您没有权限删除此考核');
    }

    // 检查相关数据
    const relatedData = await this.checkRelatedData(assessmentId);
    
    if (relatedData.evaluationsCount > 0) {
      warnings.push(`该考核有 ${relatedData.evaluationsCount} 条评估记录`);
    }
    
    if (relatedData.okrsCount > 0) {
      warnings.push(`该考核有 ${relatedData.okrsCount} 个OKR记录`);
    }
    
    if (relatedData.hasCompletedEvaluations) {
      warnings.push('该考核包含已完成的评估，删除将影响历史记录');
    }

    return {
      canDelete: errors.length === 0,
      errors,
      warnings,
      relatedData,
      permissions,
    };
  }

  /**
   * 获取得分计算预览
   */
  async getScorePreview(assessmentId: number): Promise<ScorePreviewResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ['template'],
    });

    if (!assessment) {
      return {
        participants: [],
        templateConfig: {
          evaluatorWeights: { self: 0.3, leader: 0.7 },
          categoryWeights: [],
        },
      };
    }

    // 获取参与者信息
    const participants = await this.participantsRepository.find({
      where: { assessment: { id: assessmentId }, deleted_at: null },
      relations: ['user'],
    });

    // 使用模板配置快照进行得分计算
    const currentTemplateConfig = assessment.template_config || assessment.template?.config;
    const scoreResults = await this.scoreCalculationService.calculateParticipantScores(
      assessmentId,
      participants,
      currentTemplateConfig,
    );

    // 转换为预览格式
    const participantPreviews: ParticipantScorePreviewDto[] = scoreResults.map(result => ({
      userId: result.userId,
      userName: participants.find(p => p.user.id === result.userId)?.user.name || '',
      selfScore: result.selfScore,
      leaderScore: result.leaderScore,
      calculatedFinalScore: result.finalScore,
      scoreBreakdown: result.scoreBreakdown.map(breakdown => ({
        category: breakdown.category,
        categoryName: breakdown.categoryName,
        categoryWeight: breakdown.categoryWeight,
        selfWeight: 0.3, // 这里可以从模板配置中获取
        leaderWeight: 0.7,
        selfScore: breakdown.categorySelfScore,
        leaderScore: breakdown.categoryLeaderScore,
        categoryScore: breakdown.categoryFinalScore,
      })),
    }));

    // 获取模板配置信息用于响应
    const templateConfig = assessment.template || currentTemplateConfig
      ? {
          evaluatorWeights: { self: 0.3, leader: 0.7 }, // 从配置中获取或使用默认值
          categoryWeights: currentTemplateConfig?.categories || [],
        }
      : {
          evaluatorWeights: { self: 0.3, leader: 0.7 },
          categoryWeights: [],
        };

    return {
      participants: participantPreviews,
      templateConfig,
    };
  }

  /**
   * 检查结束考核的权限
   */
  private async checkEndPermission(assessment: Assessment, currentUserId: number): Promise<boolean> {
    // 管理员权限检查（这里简化，实际应该检查用户角色）
    if (assessment.creator.id === currentUserId) {
      return true;
    }

    // 可以添加更多权限检查逻辑
    return false;
  }

  /**
   * 检查删除考核的权限
   */
  private async checkDeletePermission(
    assessment: Assessment,
    currentUserId: number,
  ): Promise<PermissionsDto> {
    // 只有创建者可以删除
    if (assessment.creator.id === currentUserId) {
      return { canDelete: true };
    }

    // 管理员权限检查（这里简化，实际应该检查用户角色）
    return {
      canDelete: false,
      reason: '只有考核创建者可以删除考核',
    };
  }

  /**
   * 检查参与者完成状态
   */
  private async checkParticipantStatus(assessmentId: number): Promise<ParticipantStatusDto[]> {
    const participants = await this.participantsRepository.find({
      where: { assessment: { id: assessmentId }, deleted_at: null },
      relations: ['user'],
    });

    const statusList: ParticipantStatusDto[] = [];

    for (const participant of participants) {
      const evaluations = await this.evaluationsRepository.find({
        where: {
          assessment: { id: assessmentId },
          evaluatee: { id: participant.user.id },
        },
      });

      const selfEvaluation = evaluations.find(e => e.type === 'self');
      const leaderEvaluation = evaluations.find(e => e.type === 'leader');

      const missingEvaluations: string[] = [];
      if (!selfEvaluation || selfEvaluation.status !== 'submitted') {
        missingEvaluations.push('自评');
      }
      if (!leaderEvaluation || leaderEvaluation.status !== 'submitted') {
        missingEvaluations.push('领导评分');
      }

      statusList.push({
        userId: participant.user.id,
        userName: participant.user.name,
        selfCompleted: participant.self_completed === 1,
        leaderCompleted: participant.leader_completed === 1,
        missingEvaluations,
      });
    }

    return statusList;
  }

  /**
   * 检查相关数据
   */
  private async checkRelatedData(assessmentId: number): Promise<RelatedDataDto> {
    const [evaluationsCount, okrsCount, completedEvaluations] = await Promise.all([
      this.evaluationsRepository.count({
        where: { assessment: { id: assessmentId } },
      }),
      this.okrsRepository.count({
        where: { assessment: { id: assessmentId } },
      }),
      this.evaluationsRepository.count({
        where: {
          assessment: { id: assessmentId },
          status: 'submitted',
        },
      }),
    ]);

    return {
      evaluationsCount,
      okrsCount,
      hasCompletedEvaluations: completedEvaluations > 0,
    };
  }

  /**
   * 从模板配置中获取必需的评估类型
   */
  private getRequiredEvaluations(config: any): string[] {
    if (!config.scoring_rules) return [];

    const required: string[] = [];
    if (config.scoring_rules.self_evaluation?.enabled) {
      required.push('self');
    }
    if (config.scoring_rules.leader_evaluation?.enabled) {
      required.push('leader');
    }

    return required;
  }
}