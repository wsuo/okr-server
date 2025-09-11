import { IsNumber, IsString, IsOptional, Min, Max, IsObject, ValidateNested } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateBossEvaluationDto {
  @ApiProperty({ description: "考核ID" })
  @IsNumber()
  assessment_id: number;

  @ApiProperty({ description: "被评估人ID" })
  @IsNumber()
  evaluatee_id: number;

  @ApiProperty({ 
    description: "星级分类评分", 
    example: {
      "boss_cat_work_performance": 4,
      "boss_cat_professional_skill": 5,
      "boss_cat_team_cooperation": 3,
      "boss_cat_initiative": 4,
      "boss_cat_development_potential": 4
    },
    required: false
  })
  @IsObject()
  @IsOptional()
  star_ratings?: { [category_id: string]: number };

  @ApiProperty({ description: "传统评分(向后兼容)", example: 88.0, required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiProperty({ description: "反馈意见", required: false })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiProperty({ description: "优势", required: false })
  @IsString()
  @IsOptional()
  strengths?: string;

  @ApiProperty({ description: "改进建议", required: false })
  @IsString()
  @IsOptional()
  improvements?: string;
}