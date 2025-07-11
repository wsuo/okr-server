import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean } from "class-validator";

export class EvaluationStatsQueryDto {
  @ApiProperty({ 
    description: "统计周期", 
    example: "all", 
    enum: ["all", "recent_6", "year_2024"],
    required: false 
  })
  @IsOptional()
  @IsString()
  period?: string = "all";

  @ApiProperty({ 
    description: "是否包含趋势数据", 
    example: true, 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  include_trend?: boolean = true;
}

export class ScoreHistoryDto {
  @ApiProperty({ description: "考核ID", example: 10 })
  assessment_id: number;

  @ApiProperty({ description: "考核标题", example: "2024年第4季度绩效考核" })
  assessment_title: string;

  @ApiProperty({ description: "最终得分", example: 89.2 })
  final_score: number;

  @ApiProperty({ description: "自评得分", example: 87.0 })
  self_score: number;

  @ApiProperty({ description: "领导评分", example: 91.5 })
  leader_score: number;

  @ApiProperty({ description: "完成时间", example: "2024-01-15T10:30:00Z" })
  completed_at: Date;

  @ApiProperty({ description: "考核周期", example: "2024Q4" })
  period: string;
}

export class TrendAnalysisDto {
  @ApiProperty({ description: "最近6个月趋势" })
  recent_6_months: {
    trend: string; // up/down/stable
    improvement: number;
    consistency: string; // stable/volatile
  };

  @ApiProperty({ description: "得分分布" })
  score_distribution: {
    excellent: number; // 优秀数量
    good: number; // 良好数量
    average: number; // 一般数量
    poor: number; // 较差数量
  };
}

export class EvaluationStatisticsDto {
  @ApiProperty({ description: "平均自评得分", example: 84.2 })
  avg_self_score: number;

  @ApiProperty({ description: "平均领导评分", example: 88.8 })
  avg_leader_score: number;

  @ApiProperty({ description: "自评与领导评分平均差异", example: -4.6 })
  self_leader_difference: number;

  @ApiProperty({ description: "最后更新时间", example: "2024-01-15T10:30:00Z" })
  last_updated: Date;
}

export class EvaluationStatsResponseDto {
  @ApiProperty({ description: "用户ID", example: 3 })
  user_id: number;

  @ApiProperty({ description: "用户姓名", example: "张三" })
  user_name: string;

  @ApiProperty({ description: "部门", example: "技术部" })
  department: string;

  @ApiProperty({ description: "职位", example: "高级工程师" })
  position: string;

  @ApiProperty({ description: "总考核次数", example: 12 })
  total_assessments: number;

  @ApiProperty({ description: "已完成考核次数", example: 10 })
  completed_assessments: number;

  @ApiProperty({ description: "完成率", example: 83.33 })
  completion_rate: number;

  @ApiProperty({ description: "平均得分", example: 87.5 })
  average_score: number;

  @ApiProperty({ description: "最新得分", example: 89.2 })
  latest_score?: number;

  @ApiProperty({ description: "最高得分", example: 95.5 })
  highest_score?: number;

  @ApiProperty({ description: "最低得分", example: 78.3 })
  lowest_score?: number;

  @ApiProperty({ description: "得分趋势", example: "up", enum: ["up", "down", "stable"] })
  score_trend?: string;

  @ApiProperty({ description: "得分变化", example: 8.7 })
  score_improvement?: number;

  @ApiProperty({ description: "部门内排名", example: 3 })
  rank_in_department?: number;

  @ApiProperty({ description: "部门总人数", example: 15 })
  rank_total?: number;

  @ApiProperty({ description: "得分历史", type: [ScoreHistoryDto] })
  score_history: ScoreHistoryDto[];

  @ApiProperty({ description: "趋势分析", type: TrendAnalysisDto, required: false })
  trend_analysis?: TrendAnalysisDto;

  @ApiProperty({ description: "统计数据", type: EvaluationStatisticsDto })
  statistics: EvaluationStatisticsDto;
}