import { ApiProperty } from "@nestjs/swagger";
import { EvaluationType } from "../../../common/enums/evaluation.enum";

export class EvaluationItemTemplateDto {
  @ApiProperty({ description: "项目ID" })
  id: string;

  @ApiProperty({ description: "项目名称" })
  name: string;

  @ApiProperty({ description: "项目描述" })
  description: string;

  @ApiProperty({ description: "项目权重（百分比）" })
  weight: number;

  @ApiProperty({ description: "最高分" })
  max_score: number;

  @ApiProperty({ description: "评分标准" })
  scoring_criteria: {
    excellent: { min: number; description: string };
    good: { min: number; description: string };
    average: { min: number; description: string };
    poor: { min: number; description: string };
  };
}

export class EvaluationCategoryTemplateDto {
  @ApiProperty({ description: "类别ID" })
  id: string;

  @ApiProperty({ description: "类别名称" })
  name: string;

  @ApiProperty({ description: "类别描述" })
  description: string;

  @ApiProperty({ description: "类别权重（百分比）" })
  weight: number;

  @ApiProperty({ description: "评估者类型", type: [String] })
  evaluator_types: string[];

  @ApiProperty({ description: "是否仅限领导评分", required: false })
  leader_only?: boolean;

  @ApiProperty({ description: "特殊属性", required: false })
  special_attributes?: {
    leader_only?: boolean;
    required_role?: string;
  };

  @ApiProperty({ description: "评分项目", type: [EvaluationItemTemplateDto] })
  items: EvaluationItemTemplateDto[];
}

export class EvaluationTemplateResponseDto {
  @ApiProperty({ description: "考核ID" })
  assessment_id: number;

  @ApiProperty({ description: "考核标题" })
  assessment_title: string;

  @ApiProperty({ description: "模板版本" })
  version: string;

  @ApiProperty({ description: "评分方法" })
  scoring_method: string;

  @ApiProperty({ description: "总分" })
  total_score: number;

  @ApiProperty({ description: "评分规则" })
  scoring_rules: {
    self_evaluation: {
      enabled: boolean;
      weight_in_final: number;
    };
    leader_evaluation: {
      enabled: boolean;
      weight_in_final: number;
    };
    boss_evaluation: {
      enabled: boolean;
      weight_in_final: number;
    };
    calculation_method: string;
  };

  @ApiProperty({
    description: "评分类别",
    type: [EvaluationCategoryTemplateDto],
  })
  categories: EvaluationCategoryTemplateDto[];

  @ApiProperty({ description: "使用说明", required: false })
  usage_instructions?: string;
}

export class UserEvaluationTemplateDto extends EvaluationTemplateResponseDto {
  @ApiProperty({ description: "当前用户ID" })
  current_user_id: number;

  @ApiProperty({ description: "用户类型", enum: ["self", "leader", "boss"] })
  evaluation_type: EvaluationType;

  @ApiProperty({ description: "被评估人ID（领导评分时有值）", required: false })
  evaluatee_id?: number;

  @ApiProperty({
    description: "被评估人姓名（领导评分时有值）",
    required: false,
  })
  evaluatee_name?: string;

  @ApiProperty({ description: "已存在的评估ID（如果有草稿）", required: false })
  existing_evaluation_id?: number;

  @ApiProperty({
    description: "当前评估状态",
    enum: ["not_started", "draft", "submitted"],
    required: false,
  })
  current_status?: "not_started" | "draft" | "submitted";

  @ApiProperty({ 
    description: "是否为老板简化评分模式", 
    required: false 
  })
  is_boss_simplified?: boolean;

  @ApiProperty({ 
    description: "老板评分说明", 
    required: false 
  })
  boss_evaluation_note?: string;
}
