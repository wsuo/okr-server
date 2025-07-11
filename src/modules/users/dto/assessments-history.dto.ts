import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";
import { Transform } from "class-transformer";

export class AssessmentsHistoryQueryDto {
  @ApiProperty({ description: "页码", example: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: "每页数量", example: 20, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 20;

  @ApiProperty({ 
    description: "过滤状态", 
    example: "all", 
    enum: ["all", "completed", "in_progress", "pending"],
    required: false 
  })
  @IsOptional()
  @IsString()
  status?: string = "all";

  @ApiProperty({ description: "过滤年份", example: "2024", required: false })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiProperty({ 
    description: "排序方式", 
    example: "start_date_desc", 
    enum: ["start_date_desc", "start_date_asc", "score_desc"],
    required: false 
  })
  @IsOptional()
  @IsString()
  sort?: string = "start_date_desc";
}

export class EvaluationInfoDto {
  @ApiProperty({ description: "是否完成", example: true })
  completed: boolean;

  @ApiProperty({ description: "得分", example: 87.0, required: false })
  score?: number;

  @ApiProperty({ description: "领导ID", example: 2, required: false })
  leader_id?: number;

  @ApiProperty({ description: "领导姓名", example: "李四", required: false })
  leader_name?: string;

  @ApiProperty({ description: "提交时间", example: "2024-12-20T14:30:00Z", required: false })
  submitted_at?: Date;

  @ApiProperty({ description: "最后更新时间", example: "2024-12-20T14:30:00Z", required: false })
  last_updated?: Date;
}

export class WeightConfigDto {
  @ApiProperty({ description: "自评权重", example: 30 })
  self_weight: number;

  @ApiProperty({ description: "领导评分权重", example: 70 })
  leader_weight: number;
}

export class AssessmentHistoryItemDto {
  @ApiProperty({ description: "考核ID", example: 10 })
  assessment_id: number;

  @ApiProperty({ description: "考核标题", example: "2024年第4季度绩效考核" })
  assessment_title: string;

  @ApiProperty({ description: "考核周期", example: "2024年第4季度" })
  period: string;

  @ApiProperty({ description: "考核状态", example: "completed", enum: ["completed", "in_progress", "pending"] })
  status: string;

  @ApiProperty({ description: "开始时间", example: "2024-10-01T00:00:00Z" })
  start_date: Date;

  @ApiProperty({ description: "结束时间", example: "2024-12-31T23:59:59Z" })
  end_date: Date;

  @ApiProperty({ description: "截止时间", example: "2025-01-15T23:59:59Z" })
  deadline: Date;

  @ApiProperty({ description: "创建时间", example: "2024-09-15T10:00:00Z" })
  created_at: Date;

  @ApiProperty({ description: "自评信息", type: EvaluationInfoDto })
  self_evaluation: EvaluationInfoDto;

  @ApiProperty({ description: "领导评分信息", type: EvaluationInfoDto })
  leader_evaluation: EvaluationInfoDto;

  @ApiProperty({ description: "最终得分", example: 89.2, required: false })
  final_score?: number;

  @ApiProperty({ description: "最终等级", example: "优秀", required: false })
  final_level?: string;

  @ApiProperty({ description: "权重配置", type: WeightConfigDto })
  weight_config: WeightConfigDto;

  @ApiProperty({ description: "是否逾期", example: false })
  is_overdue: boolean;

  @ApiProperty({ description: "距离截止日期天数", example: 0 })
  days_to_deadline: number;

  @ApiProperty({ description: "模板ID", example: 1 })
  template_id: number;

  @ApiProperty({ description: "模板名称", example: "标准绩效考核模板" })
  template_name: string;
}

export class AssessmentHistorySummaryDto {
  @ApiProperty({ description: "总考核数", example: 12 })
  total_assessments: number;

  @ApiProperty({ description: "已完成数量", example: 10 })
  completed_count: number;

  @ApiProperty({ description: "进行中数量", example: 1 })
  in_progress_count: number;

  @ApiProperty({ description: "待开始数量", example: 1 })
  pending_count: number;

  @ApiProperty({ description: "平均最终得分", example: 87.5 })
  average_final_score: number;

  @ApiProperty({ description: "完成率", example: 83.33 })
  completion_rate: number;
}

export class PaginationDto {
  @ApiProperty({ description: "总记录数", example: 12 })
  total: number;

  @ApiProperty({ description: "当前页码", example: 1 })
  page: number;

  @ApiProperty({ description: "每页数量", example: 20 })
  limit: number;

  @ApiProperty({ description: "总页数", example: 1 })
  total_pages: number;

  @ApiProperty({ description: "是否有下一页", example: false })
  has_next: boolean;

  @ApiProperty({ description: "是否有上一页", example: false })
  has_prev: boolean;
}

export class AssessmentsHistoryResponseDto {
  @ApiProperty({ description: "考核历史列表", type: [AssessmentHistoryItemDto] })
  items: AssessmentHistoryItemDto[];

  @ApiProperty({ description: "分页信息", type: PaginationDto })
  pagination: PaginationDto;

  @ApiProperty({ description: "统计摘要", type: AssessmentHistorySummaryDto })
  summary: AssessmentHistorySummaryDto;
}