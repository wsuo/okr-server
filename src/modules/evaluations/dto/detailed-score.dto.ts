import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class DetailedItemScoreDto {
  @ApiProperty({ description: "评分项目ID" })
  @IsString()
  itemId: string;

  @ApiProperty({ description: "项目评分", example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ description: "项目评价", required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class DetailedCategoryScoreDto {
  @ApiProperty({ description: "评分类别ID" })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: "类别总分", example: 88 })
  @IsNumber()
  @Min(0)
  @Max(100)
  categoryScore: number;

  @ApiProperty({ description: "分项评分", type: [DetailedItemScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedItemScoreDto)
  items: DetailedItemScoreDto[];

  @ApiProperty({ description: "类别评价", required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class CreateDetailedSelfEvaluationDto {
  @ApiProperty({ description: "考核ID" })
  @IsNumber()
  assessment_id: number;

  @ApiProperty({ description: "自评内容", required: false })
  @IsString()
  @IsOptional()
  self_review?: string;

  @ApiProperty({ description: "详细评分", type: [DetailedCategoryScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedCategoryScoreDto)
  detailed_scores: DetailedCategoryScoreDto[];

  @ApiProperty({ description: "整体反馈", required: false })
  @IsString()
  @IsOptional()
  overall_feedback?: string;

  @ApiProperty({ description: "优势总结", required: false })
  @IsString()
  @IsOptional()
  strengths?: string;

  @ApiProperty({ description: "改进建议", required: false })
  @IsString()
  @IsOptional()
  improvements?: string;
}

export class CreateDetailedLeaderEvaluationDto {
  @ApiProperty({ description: "考核ID" })
  @IsNumber()
  assessment_id: number;

  @ApiProperty({ description: "被评估人ID" })
  @IsNumber()
  evaluatee_id: number;

  @ApiProperty({ description: "领导评价内容", required: false })
  @IsString()
  @IsOptional()
  leader_review?: string;

  @ApiProperty({ description: "详细评分", type: [DetailedCategoryScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedCategoryScoreDto)
  detailed_scores: DetailedCategoryScoreDto[];

  @ApiProperty({ description: "整体反馈", required: false })
  @IsString()
  @IsOptional()
  overall_feedback?: string;

  @ApiProperty({ description: "优势总结", required: false })
  @IsString()
  @IsOptional()
  strengths?: string;

  @ApiProperty({ description: "改进建议", required: false })
  @IsString()
  @IsOptional()
  improvements?: string;
}

export class CreateDetailedBossEvaluationDto {
  @ApiProperty({ description: "考核ID" })
  @IsNumber()
  assessment_id: number;

  @ApiProperty({ description: "被评估人ID" })
  @IsNumber()
  evaluatee_id: number;

  @ApiProperty({ description: "上级评价内容", required: false })
  @IsString()
  @IsOptional()
  boss_review?: string;

  @ApiProperty({ description: "详细评分", type: [DetailedCategoryScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedCategoryScoreDto)
  detailed_scores: DetailedCategoryScoreDto[];

  @ApiProperty({ description: "整体反馈", required: false })
  @IsString()
  @IsOptional()
  overall_feedback?: string;

  @ApiProperty({ description: "优势总结", required: false })
  @IsString()
  @IsOptional()
  strengths?: string;

  @ApiProperty({ description: "改进建议", required: false })
  @IsString()
  @IsOptional()
  improvements?: string;
}

export class SaveEvaluationDraftDto {
  @ApiProperty({ description: "考核ID" })
  @IsNumber()
  assessment_id: number;

  @ApiProperty({ description: "被评估人ID（领导评分时需要）", required: false })
  @IsNumber()
  @IsOptional()
  evaluatee_id?: number;

  @ApiProperty({ description: "评估类型", enum: ["self", "leader"] })
  @IsString()
  type: "self" | "leader";

  @ApiProperty({ description: "自评内容", required: false })
  @IsString()
  @IsOptional()
  self_review?: string;

  @ApiProperty({ description: "领导评价内容", required: false })
  @IsString()
  @IsOptional()
  leader_review?: string;

  @ApiProperty({
    description: "详细评分（可以为空，用于草稿）",
    type: [DetailedCategoryScoreDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedCategoryScoreDto)
  @IsOptional()
  detailed_scores?: DetailedCategoryScoreDto[];

  @ApiProperty({ description: "整体反馈", required: false })
  @IsString()
  @IsOptional()
  overall_feedback?: string;

  @ApiProperty({ description: "优势总结", required: false })
  @IsString()
  @IsOptional()
  strengths?: string;

  @ApiProperty({ description: "改进建议", required: false })
  @IsString()
  @IsOptional()
  improvements?: string;
}

export class UpdateEvaluationDraftDto {
  @ApiProperty({ description: "自评内容", required: false })
  @IsString()
  @IsOptional()
  self_review?: string;

  @ApiProperty({ description: "领导评价内容", required: false })
  @IsString()
  @IsOptional()
  leader_review?: string;

  @ApiProperty({
    description: "详细评分（可以为空，用于草稿）",
    type: [DetailedCategoryScoreDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedCategoryScoreDto)
  @IsOptional()
  detailed_scores?: DetailedCategoryScoreDto[];

  @ApiProperty({ description: "整体反馈", required: false })
  @IsString()
  @IsOptional()
  overall_feedback?: string;

  @ApiProperty({ description: "优势总结", required: false })
  @IsString()
  @IsOptional()
  strengths?: string;

  @ApiProperty({ description: "改进建议", required: false })
  @IsString()
  @IsOptional()
  improvements?: string;
}
