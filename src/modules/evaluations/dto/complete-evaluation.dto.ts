import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsBoolean } from "class-validator";

export class CompleteEvaluationQueryDto {
  @ApiProperty({ 
    description: "是否包含详细评分项", 
    example: true, 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  include_details?: boolean = true;

  @ApiProperty({ 
    description: "是否包含评论内容", 
    example: true, 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  include_comments?: boolean = true;

  @ApiProperty({ 
    description: "是否包含对比分析", 
    example: true, 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  include_comparison?: boolean = true;
}

export class AssessmentInfoDto {
  @ApiProperty({ description: "考核ID", example: 10 })
  assessment_id: number;

  @ApiProperty({ description: "考核标题", example: "2024年第4季度绩效考核" })
  assessment_title: string;

  @ApiProperty({ description: "考核周期", example: "2024年第4季度" })
  period: string;

  @ApiProperty({ description: "模板名称", example: "标准绩效考核模板" })
  template_name: string;

  @ApiProperty({ description: "开始时间", example: "2024-10-01T00:00:00Z" })
  start_date: Date;

  @ApiProperty({ description: "结束时间", example: "2024-12-31T23:59:59Z" })
  end_date: Date;

  @ApiProperty({ description: "截止时间", example: "2025-01-15T23:59:59Z" })
  deadline: Date;

  @ApiProperty({ description: "考核状态", example: "completed" })
  status: string;
}

export class EvaluateeInfoDto {
  @ApiProperty({ description: "用户ID", example: 3 })
  user_id: number;

  @ApiProperty({ description: "用户姓名", example: "张三" })
  user_name: string;

  @ApiProperty({ description: "部门", example: "技术部" })
  department: string;

  @ApiProperty({ description: "职位", example: "高级工程师" })
  position: string;

  @ApiProperty({ description: "邮箱", example: "zhangsan@company.com" })
  email: string;
}

export class DetailedScoreItemDto {
  @ApiProperty({ description: "评分项ID", example: "task_completion" })
  item_id: string;

  @ApiProperty({ description: "评分项名称", example: "任务完成度" })
  item_name: string;

  @ApiProperty({ description: "评分项权重", example: 40 })
  item_weight: number;

  @ApiProperty({ description: "得分", example: 90 })
  score: number;

  @ApiProperty({ description: "最高分", example: 100 })
  max_score: number;

  @ApiProperty({ description: "评论", example: "按时完成了所有分配的任务，质量较高" })
  comment: string;

  @ApiProperty({ description: "等级", example: "优秀" })
  level: string;
}

export class DetailedScoreCategoryDto {
  @ApiProperty({ description: "分类ID", example: "work_performance" })
  category_id: string;

  @ApiProperty({ description: "分类名称", example: "工作绩效" })
  category_name: string;

  @ApiProperty({ description: "分类权重", example: 60 })
  category_weight: number;

  @ApiProperty({ description: "分类得分", example: 88.5 })
  category_score: number;

  @ApiProperty({ description: "评分项详情", type: [DetailedScoreItemDto] })
  items: DetailedScoreItemDto[];
}

export class DetailedEvaluationDto {
  @ApiProperty({ description: "评估ID", example: 15 })
  evaluation_id: number;

  @ApiProperty({ description: "是否完成", example: true })
  completed: boolean;

  @ApiProperty({ description: "提交时间", example: "2024-12-20T14:30:00Z" })
  submitted_at: Date;

  @ApiProperty({ description: "总体得分", example: 87.0 })
  overall_score: number;

  @ApiProperty({ description: "总体评价", example: "本季度工作完成情况良好..." })
  review: string;

  @ApiProperty({ description: "优势", example: "技术能力强，学习能力快..." })
  strengths: string;

  @ApiProperty({ description: "改进建议", example: "需要加强与其他部门的协作沟通..." })
  improvements: string;

  @ApiProperty({ description: "详细评分", type: [DetailedScoreCategoryDto] })
  detailed_scores: DetailedScoreCategoryDto[];
}

export class LeaderEvaluationDto extends DetailedEvaluationDto {
  @ApiProperty({ description: "领导ID", example: 2 })
  leader_id: number;

  @ApiProperty({ description: "领导姓名", example: "李四" })
  leader_name: string;
}

export class BossEvaluationDto extends DetailedEvaluationDto {
  @ApiProperty({ description: "BossID", example: 3 })
  boss_id: number;

  @ApiProperty({ description: "Boss姓名", example: "王五" })
  boss_name: string;
}

export class WeightConfigInfoDto {
  @ApiProperty({ description: "评分模式", example: "two_tier_weighted" })
  scoring_mode?: string;

  @ApiProperty({ description: "自评权重", example: 30 })
  self_weight: number;

  @ApiProperty({ description: "领导评分权重", example: 70 })
  leader_weight: number;

  @ApiProperty({ description: "Boss评分权重", example: 10 })
  boss_weight?: number;

  @ApiProperty({ description: "是否启用Boss评分", example: true })
  boss_enabled?: boolean;
}

export class CalculationDetailsDto {
  @ApiProperty({ description: "自评加权得分", example: 26.1 })
  self_weighted_score: number;

  @ApiProperty({ description: "领导评分加权得分", example: 64.05 })
  leader_weighted_score: number;

  @ApiProperty({ description: "总得分", example: 90.15 })
  total_score: number;

  @ApiProperty({ description: "四舍五入后得分", example: 89.2 })
  rounded_score: number;
}

export class FinalResultDto {
  @ApiProperty({ description: "最终得分", example: 89.2 })
  final_score: number;

  @ApiProperty({ description: "最终等级", example: "优秀" })
  final_level: string;

  @ApiProperty({ description: "计算方法", example: "weighted_average" })
  calculation_method: string;

  @ApiProperty({ description: "权重配置", type: WeightConfigInfoDto })
  weight_config: WeightConfigInfoDto;

  @ApiProperty({ description: "计算详情", type: CalculationDetailsDto })
  calculation_details: CalculationDetailsDto;

  @ApiProperty({ description: "完成时间", example: "2024-12-25T09:15:00Z" })
  completed_at: Date;
}

export class ItemComparisonDto {
  @ApiProperty({ description: "评分项ID", example: "task_completion" })
  item_id: string;

  @ApiProperty({ description: "评分项名称", example: "任务完成度" })
  item_name: string;

  @ApiProperty({ description: "自评得分", example: 90 })
  self_score: number;

  @ApiProperty({ description: "领导评分", example: 95 })
  leader_score: number;

  @ApiProperty({ description: "分差", example: 5 })
  difference: number;

  @ApiProperty({ description: "一致性", example: "high" })
  agreement: string;
}

export class CategoryComparisonDto {
  @ApiProperty({ description: "分类ID", example: "work_performance" })
  category_id: string;

  @ApiProperty({ description: "分类名称", example: "工作绩效" })
  category_name: string;

  @ApiProperty({ description: "自评得分", example: 88.5 })
  self_score: number;

  @ApiProperty({ description: "领导评分", example: 92.0 })
  leader_score: number;

  @ApiProperty({ description: "分差", example: 3.5 })
  difference: number;

  @ApiProperty({ description: "一致性", example: "high" })
  agreement: string;

  @ApiProperty({ description: "评分项对比", type: [ItemComparisonDto] })
  item_comparisons: ItemComparisonDto[];
}

export class ComparisonAnalysisDto {
  @ApiProperty({ description: "总体分差", example: 4.5 })
  overall_difference: number;

  @ApiProperty({ description: "一致性水平", example: "high" })
  agreement_level: string;

  @ApiProperty({ description: "分类对比", type: [CategoryComparisonDto] })
  category_comparisons: CategoryComparisonDto[];
}

export class TimelineEventDto {
  @ApiProperty({ description: "事件类型", example: "self_evaluation_submitted" })
  event: string;

  @ApiProperty({ description: "事件描述", example: "员工提交自评" })
  description: string;

  @ApiProperty({ description: "时间戳", example: "2024-12-20T14:30:00Z" })
  timestamp: Date;

  @ApiProperty({ description: "操作人", example: "张三" })
  actor: string;
}

export class CompleteEvaluationResponseDto {
  @ApiProperty({ description: "考核信息", type: AssessmentInfoDto })
  assessment_info: AssessmentInfoDto;

  @ApiProperty({ description: "被评估人信息", type: EvaluateeInfoDto })
  evaluatee_info: EvaluateeInfoDto;

  @ApiProperty({ description: "自评详情", type: DetailedEvaluationDto })
  self_evaluation: DetailedEvaluationDto;

  @ApiProperty({ description: "领导评分详情", type: LeaderEvaluationDto })
  leader_evaluation: LeaderEvaluationDto;

  @ApiProperty({ description: "Boss评分详情", type: BossEvaluationDto, required: false })
  boss_evaluation?: BossEvaluationDto;

  @ApiProperty({ description: "最终结果", type: FinalResultDto })
  final_result: FinalResultDto;

  @ApiProperty({ description: "对比分析", type: ComparisonAnalysisDto, required: false })
  comparison_analysis?: ComparisonAnalysisDto;

  @ApiProperty({ description: "时间线", type: [TimelineEventDto] })
  timeline: TimelineEventDto[];
}