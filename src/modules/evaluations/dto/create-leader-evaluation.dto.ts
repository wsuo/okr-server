import { IsNumber, IsString, IsOptional, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateLeaderEvaluationDto {
  @ApiProperty({ description: "考核ID" })
  @IsNumber()
  assessment_id: number;

  @ApiProperty({ description: "被评估人ID" })
  @IsNumber()
  evaluatee_id: number;

  @ApiProperty({ description: "评分", example: 88.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

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
