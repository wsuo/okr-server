import { ApiProperty } from "@nestjs/swagger";

export class AssessmentInfoDto {
  @ApiProperty({ description: "考核ID", example: 1 })
  assessment_id: number;

  @ApiProperty({ description: "考核标题", example: "2024年度绩效考核" })
  assessment_title: string;

  @ApiProperty({ description: "考核状态", example: "active" })
  status: string;

  @ApiProperty({ description: "考核开始时间", example: "2024-01-01T00:00:00Z" })
  start_date: Date;

  @ApiProperty({ description: "考核结束时间", example: "2024-12-31T23:59:59Z" })
  end_date: Date;

  @ApiProperty({ description: "考核周期", example: "2024年度" })
  period: string;
}

export class EvaluationStatusDto {
  @ApiProperty({ description: "自评是否完成", example: true })
  self_completed: boolean;

  @ApiProperty({ description: "领导评分是否完成", example: false })
  leader_completed: boolean;

  @ApiProperty({ description: "自评完成时间", example: "2024-01-15T10:30:00Z", required: false })
  self_completed_at?: Date;

  @ApiProperty({ description: "领导评分完成时间", example: "2024-01-20T14:20:00Z", required: false })
  leader_completed_at?: Date;

  @ApiProperty({ description: "最终得分", example: 88.5, required: false })
  final_score?: number;

  @ApiProperty({ description: "自评得分", example: 85, required: false })
  self_score?: number;

  @ApiProperty({ description: "领导评分", example: 90, required: false })
  leader_score?: number;
}

export class TeamMemberDto {
  @ApiProperty({ description: "用户ID", example: 3 })
  user_id: number;

  @ApiProperty({ description: "用户姓名", example: "张三" })
  user_name: string;

  @ApiProperty({ description: "用户邮箱", example: "zhangsan@company.com" })
  email: string;

  @ApiProperty({ description: "部门名称", example: "技术部" })
  department: string;

  @ApiProperty({ description: "职位", example: "高级工程师", required: false })
  position?: string;

  @ApiProperty({ description: "当前考核信息", type: AssessmentInfoDto, required: false })
  current_assessment?: AssessmentInfoDto;

  @ApiProperty({ description: "评估状态", type: EvaluationStatusDto, required: false })
  evaluation_status?: EvaluationStatusDto;

  @ApiProperty({ description: "最后更新时间", example: "2024-01-20T14:20:00Z", required: false })
  last_updated?: Date;

  @ApiProperty({ description: "是否有进行中的考核", example: true })
  has_active_assessment: boolean;

  @ApiProperty({ description: "是否显示历史考核", example: false })
  is_historical: boolean;
}

export class TeamMembersResponseDto {
  @ApiProperty({ description: "团队成员列表", type: [TeamMemberDto] })
  members: TeamMemberDto[];

  @ApiProperty({ description: "团队成员总数", example: 5 })
  total_members: number;

  @ApiProperty({ description: "有进行中考核的成员数", example: 3 })
  active_assessments_count: number;

  @ApiProperty({ description: "完成自评的成员数", example: 2 })
  self_completed_count: number;

  @ApiProperty({ description: "完成领导评分的成员数", example: 1 })
  leader_completed_count: number;
}