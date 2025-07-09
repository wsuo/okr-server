import { ApiProperty } from '@nestjs/swagger';

export class ParticipantStatusDto {
  @ApiProperty({ description: '用户ID' })
  userId: number;

  @ApiProperty({ description: '用户名' })
  userName: string;

  @ApiProperty({ description: '自评是否完成' })
  selfCompleted: boolean;

  @ApiProperty({ description: '领导评分是否完成' })
  leaderCompleted: boolean;

  @ApiProperty({ description: '缺失的评估项目', type: [String] })
  missingEvaluations: string[];
}

export class TemplateConfigDto {
  @ApiProperty({ description: '权重配置' })
  weightConfig: any;

  @ApiProperty({ description: '必需的评估类型', type: [String] })
  requiredEvaluations: string[];
}

export class EndValidationResponseDto {
  @ApiProperty({ description: '是否可以结束考核' })
  canEnd: boolean;

  @ApiProperty({ description: '警告信息', type: [String] })
  warnings: string[];

  @ApiProperty({ description: '错误信息', type: [String] })
  errors: string[];

  @ApiProperty({ description: '参与者状态', type: [ParticipantStatusDto] })
  participantStatus: ParticipantStatusDto[];

  @ApiProperty({ description: '模板配置', type: TemplateConfigDto })
  templateConfig: TemplateConfigDto;
}

export class RelatedDataDto {
  @ApiProperty({ description: '评估记录数量' })
  evaluationsCount: number;

  @ApiProperty({ description: 'OKR数量' })
  okrsCount: number;

  @ApiProperty({ description: '是否有已完成的评估' })
  hasCompletedEvaluations: boolean;
}

export class PermissionsDto {
  @ApiProperty({ description: '是否可以删除' })
  canDelete: boolean;

  @ApiProperty({ description: '不能删除的原因', required: false })
  reason?: string;
}

export class DeleteValidationResponseDto {
  @ApiProperty({ description: '是否可以删除考核' })
  canDelete: boolean;

  @ApiProperty({ description: '警告信息', type: [String] })
  warnings: string[];

  @ApiProperty({ description: '错误信息', type: [String] })
  errors: string[];

  @ApiProperty({ description: '相关数据', type: RelatedDataDto })
  relatedData: RelatedDataDto;

  @ApiProperty({ description: '权限信息', type: PermissionsDto })
  permissions: PermissionsDto;
}

export class ScoreBreakdownDto {
  @ApiProperty({ description: '类别ID' })
  category: string;

  @ApiProperty({ description: '类别名称' })
  categoryName: string;

  @ApiProperty({ description: '类别权重' })
  categoryWeight: number;

  @ApiProperty({ description: '自评权重' })
  selfWeight: number;

  @ApiProperty({ description: '领导评分权重' })
  leaderWeight: number;

  @ApiProperty({ description: '自评得分' })
  selfScore: number;

  @ApiProperty({ description: '领导得分' })
  leaderScore: number;

  @ApiProperty({ description: '类别得分' })
  categoryScore: number;
}

export class ParticipantScorePreviewDto {
  @ApiProperty({ description: '用户ID' })
  userId: number;

  @ApiProperty({ description: '用户名' })
  userName: string;

  @ApiProperty({ description: '自评得分' })
  selfScore: number;

  @ApiProperty({ description: '领导得分' })
  leaderScore: number;

  @ApiProperty({ description: '计算后的最终得分' })
  calculatedFinalScore: number;

  @ApiProperty({ description: '得分详情', type: [ScoreBreakdownDto] })
  scoreBreakdown: ScoreBreakdownDto[];
}

export class EvaluatorWeightsDto {
  @ApiProperty({ description: '自评权重' })
  self: number;

  @ApiProperty({ description: '领导评分权重' })
  leader: number;
}

export class TemplateScoreConfigDto {
  @ApiProperty({ description: '评估者权重', type: EvaluatorWeightsDto })
  evaluatorWeights: EvaluatorWeightsDto;

  @ApiProperty({ description: '类别权重配置' })
  categoryWeights: any[];
}

export class ScorePreviewResponseDto {
  @ApiProperty({ description: '参与者得分预览', type: [ParticipantScorePreviewDto] })
  participants: ParticipantScorePreviewDto[];

  @ApiProperty({ description: '模板配置', type: TemplateScoreConfigDto })
  templateConfig: TemplateScoreConfigDto;
}