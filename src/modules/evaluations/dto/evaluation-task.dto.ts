import { ApiProperty } from "@nestjs/swagger";

export class EvaluationTaskDto {
  @ApiProperty({ description: "任务ID" })
  id: string;

  @ApiProperty({ description: "考核ID" })
  assessment_id: number;

  @ApiProperty({ description: "考核标题" })
  assessment_title: string;

  @ApiProperty({ description: "考核周期" })
  assessment_period: string;

  @ApiProperty({ description: "任务类型", enum: ["self", "leader"] })
  type: "self" | "leader";

  @ApiProperty({ description: "被评估人ID" })
  evaluatee_id: number;

  @ApiProperty({ description: "被评估人姓名" })
  evaluatee_name: string;

  @ApiProperty({ description: "被评估人部门" })
  evaluatee_department: string;

  @ApiProperty({
    description: "任务状态",
    enum: ["pending", "in_progress", "completed"],
  })
  status: "pending" | "in_progress" | "completed";

  @ApiProperty({ description: "截止时间" })
  deadline: Date;

  @ApiProperty({ description: "是否逾期" })
  is_overdue: boolean;

  @ApiProperty({ description: "已存在的评估ID（如果有）", required: false })
  evaluation_id?: number;

  @ApiProperty({ description: "最后更新时间", required: false })
  last_updated?: Date;
}

export class EvaluationProgressDto {
  @ApiProperty({ description: "考核ID" })
  assessment_id: number;

  @ApiProperty({ description: "考核标题" })
  assessment_title: string;

  @ApiProperty({ description: "总参与人数" })
  total_participants: number;

  @ApiProperty({ description: "已完成自评人数" })
  self_completed_count: number;

  @ApiProperty({ description: "已完成领导评分人数" })
  leader_completed_count: number;

  @ApiProperty({ description: "完全完成人数（自评+领导评分都完成）" })
  fully_completed_count: number;

  @ApiProperty({ description: "自评完成率" })
  self_completion_rate: number;

  @ApiProperty({ description: "领导评分完成率" })
  leader_completion_rate: number;

  @ApiProperty({ description: "整体完成率" })
  overall_completion_rate: number;

  @ApiProperty({ description: "详细参与者状态", type: [Object] })
  participants: {
    user_id: number;
    user_name: string;
    department: string;
    self_status: "not_started" | "in_progress" | "completed";
    leader_status: "not_started" | "in_progress" | "completed";
    self_completed_at?: Date;
    leader_completed_at?: Date;
  }[];

  @ApiProperty({ description: "考核截止时间" })
  deadline: Date;

  @ApiProperty({ description: "剩余天数" })
  days_remaining: number;

  @ApiProperty({ description: "是否逾期" })
  is_overdue: boolean;
}

export class SubordinateEvaluationTaskDto {
  @ApiProperty({ description: "下属用户ID" })
  subordinate_id: number;

  @ApiProperty({ description: "下属姓名" })
  subordinate_name: string;

  @ApiProperty({ description: "下属部门" })
  subordinate_department: string;

  @ApiProperty({
    description: "评估状态",
    enum: ["not_started", "in_progress", "completed"],
  })
  status: "not_started" | "in_progress" | "completed";

  @ApiProperty({ description: "自评完成状态" })
  self_evaluation_completed: boolean;

  @ApiProperty({ description: "自评完成时间", required: false })
  self_evaluation_completed_at?: Date;

  @ApiProperty({ description: "领导评分ID（如果已开始）", required: false })
  leader_evaluation_id?: number;

  @ApiProperty({ description: "领导评分完成时间", required: false })
  leader_evaluation_completed_at?: Date;

  @ApiProperty({ description: "最后更新时间", required: false })
  last_updated?: Date;
}
